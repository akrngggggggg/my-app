import React, { useState, useEffect, useMemo } from "react";
import {
  GoogleMap,
  MarkerF,
  useJsApiLoader,
} from "@react-google-maps/api";
import { collection, getDocs, doc, updateDoc, getDoc, addDoc, deleteDoc } from "firebase/firestore";
import { db } from "./firebase";
import haversine from "haversine-distance"; // 距離計算用
import { useRef } from "react"; // useRef をインポート
//import { MarkerClustererF } from "@react-google-maps/api";
import { debounce, isEqual } from "lodash"; 

const mapContainerStyle = {
  width: "100vw",
  height: `calc(100vh - env(safe-area-inset-bottom, 50px))`, // 🔥 ノッチとタブを考慮
};

const CustomDialog = ({ isOpen, message, onConfirm, onCancel }) => {
  if (!isOpen) return null;

  return (
    <div style={{
      position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
      backgroundColor: "rgba(0, 0, 0, 0.5)", display: "flex",
      justifyContent: "center", alignItems: "center"
    }}>
      <div style={{
        backgroundColor: "white", padding: "20px", borderRadius: "8px",
        textAlign: "center", boxShadow: "0px 4px 6px rgba(0, 0, 0, 0.2)"
      }}>
        <h2>確認</h2>
        <p>{message}</p>
        <button onClick={onConfirm} style={{ margin: "5px", padding: "10px", backgroundColor: "blue", color: "white", border: "none", borderRadius: "5px", cursor: "pointer" }}>OK</button>
        <button onClick={onCancel} style={{ margin: "5px", padding: "10px", backgroundColor: "gray", color: "white", border: "none", borderRadius: "5px", cursor: "pointer" }}>キャンセル</button>
      </div>
    </div>
  );
};

const MapView = () => {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
  });
    // 🔥 参照 & ステート管理
    const mapRef = useRef(null); // マップの参照
    const [mapBounds, setMapBounds] = useState(null); // 地図の表示範囲
  
    // 🔥 ユーザー情報関連
    const [userLocation, setUserLocation] = useState(null);
    const [userLocationIcon, setUserLocationIcon] = useState(null); // 現在地アイコン
    const [center, setCenter] = useState({ lat: 35.6895, lng: 139.6917 });
    const [zoom, setZoom] = useState(18);
  
    // 🔥 データ管理
    const [hydrants, setHydrants] = useState([]); // 消火栓リスト
    const [visibleHydrants, setVisibleHydrants] = useState([]); // 画面内の消火栓
    const [checkedList, setCheckedList] = useState([]); // チェックリスト
  
    // 🔥 UI関連
    const [mode, setMode] = useState("点検"); // ✅ モード管理
    const [isModeMenuOpen, setIsModeMenuOpen] = useState(false); // ✅ モードメニュー開閉
    const [isDialogOpen, setIsDialogOpen] = useState(false); // ダイアログの開閉
    const [dialogMessage, setDialogMessage] = useState(""); // 表示するメッセージ
    const [dialogAction, setDialogAction] = useState(null); // 確定時の処理
    const [isListOpen, setIsListOpen] = useState(false); // リストの開閉状態
    const [selectedLocation, setSelectedLocation] = useState(null); // クリック位置を一時保存
    const [showSelection, setShowSelection] = useState(false); // 選択UIの表示フラグ
    const [mapCenter, setMapCenter] = useState(null);

    const updateUserLocation = () => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const newLocation = { lat: latitude, lng: longitude };
          console.log("✅ 現在地取得:", newLocation);
          
          setUserLocation(newLocation); // 現在地を保存
          setMapCenter(newLocation); // 🔥 マップの中心を現在地にする
        },
        (error) => {
          console.error("🚨 現在地の取得に失敗:", error);
        },
        { enableHighAccuracy: true }
      );
    };


    // 🔥 地図の範囲変更を検知
    const handleBoundsChanged = () => {
      if (!mapRef.current) return;
      const bounds = mapRef.current.getBounds();
      setMapBounds(bounds);
    };
  
    // 🔥 現在地を取得し、マップの中心を更新する
useEffect(() => {
  navigator.geolocation.getCurrentPosition(
    (position) => {
      const { latitude, longitude } = position.coords;
      const newLocation = { lat: latitude, lng: longitude };
      console.log("✅ 現在地取得:", newLocation);
      
      setUserLocation(newLocation); // 現在地を保存
      setMapCenter(newLocation); // 🔥 現在地をマップの中心にする
    },
    (error) => {
      console.error("🚨 現在地の取得に失敗:", error);
      setMapCenter({ lat: 35.3363, lng: 139.3032 }); // 🔥 失敗した場合は伊勢原駅にする
    },
    { enableHighAccuracy: true }
  );
}, []); // 🔥 初回のみ実行
  

  useEffect(() => {
    if (!isLoaded || !window.google || !window.google.maps) {
      console.warn("🚨 Google Maps API がまだロードされていない！");
      return;
    }
    
    setUserLocationIcon({
      url: "https://maps.google.com/mapfiles/kml/shapes/man.png", // 🔥 人型アイコン
      scaledSize: new window.google.maps.Size(50, 50), // 🔥 サイズ設定
    });

    console.log("✅ 現在地アイコンを設定しました！");
  }, [isLoaded]); // 🔥 `isLoaded` が true になったときに実行


  useEffect(() => {
    updateUserLocation();
  }, []);

 // 🔥 Firestore から消火栓データを取得
 useEffect(() => {
  const fetchHydrants = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "fire_hydrants"));
      const data = querySnapshot.docs.map((doc) => {
        const docData = doc.data();
        
        return {
          ...docData,
          firestoreId: doc.id,
          icon: docData.type === "消火栓" 
            ? "http://maps.google.com/mapfiles/ms/icons/red-dot.png"  // 🔴 消火栓は赤
            : "http://maps.google.com/mapfiles/ms/icons/blue-dot.png", // 🔵 防火水槽は青
        };
      });

      console.log("📌 Firestore から取得したデータ:", data); // 🔥 デバッグ用

      setHydrants(data);
    } catch (error) {
      console.error("🚨 Firestore 取得エラー:", error);
    }
  };

  fetchHydrants();
}, []);

// ✅ 1km 以内の消火栓をフィルタリング（無駄な処理を減らす）
const updateVisibleHydrants = debounce(() => {
  if (!mapCenter || hydrants.length === 0) return;

  console.time("1km フィルタ処理");

  const filteredHydrants = hydrants.filter(hydrant => {
    if (Math.abs(hydrant.lat - mapCenter.lat) > 0.01 || 
        Math.abs(hydrant.lon - mapCenter.lng) > 0.01) return false;
    return haversine(mapCenter, { lat: hydrant.lat, lng: hydrant.lon }) <= 1000;
  });

  console.timeEnd("1km フィルタ処理");
  console.log(`✅ 1km 以内の消火栓数: ${filteredHydrants.length}`);

  // 🔥 `isEqual` を使って無駄な更新を防ぐ
  setVisibleHydrants(prev => isEqual(prev, filteredHydrants) ? prev : filteredHydrants);

}, 1000); // 1秒遅延

// 🔥 `mapCenter` が変わったら更新
useEffect(() => {
  updateVisibleHydrants();
}, [mapCenter, hydrants]);

const memoizedVisibleHydrants = useMemo(() => {
  return visibleHydrants.map((hydrant) => ({
    key: hydrant.firestoreId,
    position: { lat: hydrant.lat, lng: hydrant.lon },
  }));
}, [visibleHydrants]); // 🔥 `visibleHydrants` が変わったときのみ更新！


// ✅ マップの中心が変わったら `mapCenter` を更新
const handleMapCenterChanged = debounce(() => {
  if (!mapRef.current) return;
  const newCenter = mapRef.current.getCenter();
  console.log("🔥 マップの中心が変更された:", newCenter.lat(), newCenter.lng());

  // 🔥 無駄なレンダリングを防ぐ
  setMapCenter(prev => 
    prev.lat === newCenter.lat() && prev.lng === newCenter.lng() 
      ? prev 
      : { lat: newCenter.lat(), lng: newCenter.lng() }
  );
}, 500); // 500ms 遅延


const handleMarkerDragEnd = (firestoreId, newLat, newLng, oldLat, oldLng) => {
  setDialogMessage("ここに移動しますか？");
  setDialogAction(() => () => confirmMoveMarker(firestoreId, newLat, newLng));
  setIsDialogOpen(true);
};

const confirmMoveMarker = async (firestoreId, newLat, newLng) => {
  try {
    const hydrantRef = doc(db, "fire_hydrants", firestoreId);
    await updateDoc(hydrantRef, { lat: newLat, lon: newLng });

    setHydrants((prevHydrants) =>
      prevHydrants.map((hydrant) =>
        hydrant.firestoreId === firestoreId
          ? { ...hydrant, lat: newLat, lon: newLng }
          : hydrant
      )
    );

    console.log(`📍 移動完了: ID=${firestoreId}, 新座標=(${newLat}, ${newLng})`);
  } catch (error) {
    console.error("🚨 移動エラー:", error);
  }

  setIsDialogOpen(false);
};

 
const handleMapClick = (event) => {
  if (mode !== "追加削除") return;

  const newLat = event.latLng.lat();
  const newLng = event.latLng.lng();

  setSelectedLocation({ lat: newLat, lng: newLng });
  setShowSelection(true);
};

const confirmAddMarker = async (type) => {
  if (!selectedLocation) return;

  try {
    // 🔥 住所情報を取得
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${selectedLocation.lat},${selectedLocation.lng}&key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}`
    );
    const data = await response.json();
    const address = data.results[0]?.formatted_address || "不明な住所";

    // 🔥 アイコンをタイプごとに設定
    const markerIcon = type === "消火栓" 
      ? "http://maps.google.com/mapfiles/ms/icons/red-dot.png"  // 🔴 赤（消火栓）
      : "http://maps.google.com/mapfiles/ms/icons/blue-dot.png"; // 🔵 青（防火水槽）

    // 🔥 Firestore に保存するマーカー情報
    const newMarker = {
      lat: selectedLocation.lat,
      lon: selectedLocation.lng,
      type, 
      address,
      checked: false,
      icon: markerIcon, // 🔥 アイコン情報を保存
    };

    // 🔥 Firestore に追加
    const docRef = await addDoc(collection(db, "fire_hydrants"), newMarker);

    // 🔥 フロント側のデータも更新
    setHydrants([...hydrants, { firestoreId: docRef.id, ...newMarker }]);

    console.log(`✅ 追加完了: ${type} (${selectedLocation.lat}, ${selectedLocation.lng}) @ ${address}`);
  } catch (error) {
    console.error("🚨 追加エラー:", error);
  }

  setShowSelection(false);
  setSelectedLocation(null);
};


const handleMarkerDelete = (firestoreId, type) => {
  setDialogMessage(`この ${type} を削除しますか？`);
  setDialogAction(() => () => confirmDeleteMarker(firestoreId));
  setIsDialogOpen(true);
};

const confirmDeleteMarker = async (firestoreId) => {
  try {
    await deleteDoc(doc(db, "fire_hydrants", firestoreId));

    // 🔥 削除後に `hydrants` の state も更新！
    setHydrants((prev) => prev.filter((h) => h.firestoreId !== firestoreId));

    console.log(`🗑️ 削除完了: ID=${firestoreId}`);
  } catch (error) {
    console.error("🚨 削除エラー:", error);
  }

  setIsDialogOpen(false);
};

const handleCheckHydrant = (firestoreId) => {
  const hydrant = hydrants.find(h => h.firestoreId === firestoreId);
  if (!hydrant) {
    console.error(`🚨 該当の消火栓が見つからない ID=${firestoreId}`);
    return;
  }

  const isChecked = hydrant.checked || false;
  const confirmationMessage = isChecked
    ? "未点検に戻しますか？"
    : "点検済みにしますか？";

  setDialogMessage(confirmationMessage);
  setDialogAction(() => () => confirmCheckHydrant(firestoreId, isChecked));
  setIsDialogOpen(true);
};

const confirmCheckHydrant = async (firestoreId, isChecked) => {
  try {
    const hydrantRef = doc(db, "fire_hydrants", firestoreId);
    const hydrantDoc = await getDoc(hydrantRef);

    if (!hydrantDoc.exists()) {
      console.error(`🚨 Firestore 更新エラー: 該当の消火栓が見つからない ID=${firestoreId}`);
      return;
    }

    const hydrantData = hydrantDoc.data();

    // 🔥 同じ座標のマーカーをすべて取得
    const sameLocationHydrants = hydrants.filter(h => 
      h.lat === hydrantData.lat && h.lon === hydrantData.lon
    );

    // 🔥 Firestore のデータを更新（すべてのマーカー）
    for (const hydrant of sameLocationHydrants) {
      const ref = doc(db, "fire_hydrants", hydrant.firestoreId);
      await updateDoc(ref, { checked: !isChecked });
    }

    // 🔥 フロント側のデータも更新
    setHydrants(prevHydrants =>
      prevHydrants.map(h =>
        h.lat === hydrantData.lat && h.lon === hydrantData.lon
          ? { ...h, checked: !isChecked }
          : h
      )
    );

    // 🔥 チェック済みリストを更新
    setCheckedList(prev =>
      prev.filter(h => h.firestoreId !== firestoreId).concat(
        !isChecked ? sameLocationHydrants.map(h => ({ ...h, checked: true })) : []
      )
    );

    console.log(`✅ 状態変更: (${hydrantData.lat}, ${hydrantData.lon}) のマーカーを ${isChecked ? "未点検に戻しました" : "点検済みにしました"}`);
  } catch (error) {
    console.error("🚨 Firestore 更新エラー:", error);
  }

  setIsDialogOpen(false); // 🔥 ダイアログを閉じる
};

const handleResetCheckedList = () => {
    if (mode !== "点検") {
      // 🔥 点検モード以外ならエラーダイアログを表示
      setDialogMessage("⚠️ 点検モードでのみリセットできます。");
      setDialogAction(() => () => setIsDialogOpen(false)); // OKボタンを押したら閉じるだけ
      setIsDialogOpen(true);
      return;
    }
  
    if (!checkedList || checkedList.length === 0) {
      // 🔥 チェック済みリストが空ならエラーダイアログを表示
      setDialogMessage("⚠️ リセットするチェック済みの消火栓・防火水槽がありません。");
      setDialogAction(() => () => setIsDialogOpen(false)); // OKボタンを押したら閉じるだけ
      setIsDialogOpen(true);
      return;
    }
  
    // 🔥 確認ダイアログを表示（リセット実行）
    setDialogMessage("本当にすべてのチェックをリセットしますか？");
    setDialogAction(() => confirmResetCheckedList);
    setIsDialogOpen(true);
  };
  
  const confirmResetCheckedList = async () => {
    try {
      for (const hydrant of checkedList) {
        if (!hydrant.firestoreId) continue;
  
        const hydrantRef = doc(db, "fire_hydrants", hydrant.firestoreId);
        await updateDoc(hydrantRef, { checked: false });
      }
  
      setHydrants((prevHydrants) =>
        prevHydrants.map((hydrant) => ({ ...hydrant, checked: false }))
      );
  
      setCheckedList([]); // 🔥 checkedList をクリア
  
      console.log("🔄 全てのチェックをリセット");
    } catch (error) {
      console.error("🚨 Firestore 更新エラー:", error);
    }
  
    setIsDialogOpen(false);
  };

  const getModeStyle = () => {
    switch (mode) {
      case "点検":
        default:
        return { backgroundColor: "#4CAF50", color: "white" };
      case "移動":
        return { backgroundColor: "#2196F3", color: "white" };
      case "追加削除":
        return { backgroundColor: "#FF5722", color: "white" };
    }
  };

  if (!isLoaded) return <div>Loading...</div>;
  
  const onMapLoad = (map) => {
    mapRef.current = map; // 🔥 Google Map のインスタンスを保存！
  };
  
  return (
        <div>
        {/* 🔥 ここにタイトル + 現在地ボタン + モード選択を追加 */}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "10px 15px",
          backgroundColor: "#2c3e50",
          color: "white",
          fontSize: "24px",
          fontWeight: "bold"
        }}>
          <span>消火栓マップ</span>
    
          {/* 🔥 ボタンエリア（現在地 & モード選択） */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {/* 🔘 現在地へ戻るボタン */}
            <button onClick={updateUserLocation} style={{
              padding: "10px 15px",
              backgroundColor: "#FFC107",
              color: "#000",
              fontSize: "14px",
              fontWeight: "bold",
              border: "none",
              borderRadius: "5px",
              cursor: "pointer",
              boxShadow: "0px 4px 6px rgba(0, 0, 0, 0.2)"
            }}>
              現在地へ戻る
            </button>
    
{/* 🔘 モード切替ボタン */}
<div 
  style={{
    position: "relative", // ✅ メニューをこのボタン基準で配置する
    display: "flex",
    alignItems: "center",
    gap: "10px"
  }}
>
  <button 
    onClick={() => setIsModeMenuOpen(!isModeMenuOpen)}
    style={{
      padding: "10px 15px",
      fontSize: "16px",
      borderRadius: "8px",
      border: "none",
      backgroundColor: mode === "点検" ? "#4CAF50" : mode === "移動" ? "#2196F3" : "#FF5722", 
      color: "white",
      cursor: "pointer",
      textAlign: "center"
    }}
  >
    現在のモード: {mode} ▼
  </button>

  {/* 🔥 モード選択メニュー（縦並び & 選択後に閉じる） */}
  {isModeMenuOpen && (
    <div style={{
      position: "absolute",
      top: "45px", // 🔥 ボタンの下に配置
      right: "0px", 
      background: "white",
      borderRadius: "5px",
      boxShadow: "0px 4px 6px rgba(0, 0, 0, 0.2)",
      zIndex: 1000,
      padding: "5px",
      display: "flex",
      flexDirection: "column", // ✅ 縦並びに変更
      gap: "5px" // ボタン間の隙間
    }}>
      <button 
        onClick={() => { setMode("点検"); setIsModeMenuOpen(false); }} // ✅ 選択後に閉じる
        style={{
          padding: "10px",
          minWidth: "150px",
          backgroundColor: mode === "点検" ? "#388E3C" : "#4CAF50",
          color: "white",
          border: "none",
          cursor: "pointer",
          textAlign: "center"
        }}
      >点検モード</button>

      <button 
        onClick={() => { setMode("移動"); setIsModeMenuOpen(false); }} // ✅ 選択後に閉じる
        style={{
          padding: "10px",
          minWidth: "150px",
          backgroundColor: mode === "移動" ? "#1976D2" : "#2196F3",
          color: "white",
          border: "none",
          cursor: "pointer",
          textAlign: "center"
        }}
      >マーカー移動モード</button>

      <button 
        onClick={() => { setMode("追加削除"); setIsModeMenuOpen(false); }} // ✅ 選択後に閉じる
        style={{
          padding: "10px",
          minWidth: "150px",
          backgroundColor: mode === "追加削除" ? "#D84315" : "#FF5722",
          color: "white",
          border: "none",
          cursor: "pointer",
          textAlign: "center"
        }}
      >追加削除モード</button>
    </div>
  )}
</div>
</div>
</div>

    <GoogleMap
       mapContainerStyle={mapContainerStyle}
       center={mapCenter || { lat: 35.3363, lng: 139.3032 }}
       zoom={18}
       onClick={(e) => handleMapClick(e)}
       onLoad={onMapLoad}
       onBoundsChanged={handleBoundsChanged}
       onCenterChanged={handleMapCenterChanged}
       options={{
       disableDefaultUI: true,       // 🔥 すべてのUIを非表示
       zoomControl: false,           // 🔥 ズームボタン（+,-）を消す
       streetViewControl: false,     // 🔥 ストリートビューを消す
       mapTypeControl: false,        // 🔥 「Map / Satellite」ボタンを消す
       fullscreenControl: false,      // 🔥 フルスクリーンボタンを消す
       gestureHandling: "greedy",     // 🔥 タッチ操作を優先（ピンチズームやドラッグ移動を有効化）
       minZoom: 14,                   // 🔥 ズームアウトしすぎないよう制限
       maxZoom: 20,                   // 🔥 ズームインしすぎないよう制限
      }}
>
      <CustomDialog 
       isOpen={isDialogOpen} 
       message={dialogMessage} 
       onConfirm={dialogAction} 
       onCancel={() => setIsDialogOpen(false)} 
      />                                
{userLocation && userLocationIcon && (
    <MarkerF position={userLocation} icon={userLocationIcon} />
  )}

{showSelection && (
  <div style={{
    position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
    backgroundColor: "white", padding: "15px", borderRadius: "8px",
    boxShadow: "0px 4px 6px rgba(0, 0, 0, 0.2)", textAlign: "center"
  }}>
    <h3>追加する種類を選択</h3>
    <button onClick={() => confirmAddMarker("消火栓")} style={{ margin: "5px", padding: "10px", backgroundColor: "red", color: "white", border: "none", borderRadius: "5px", cursor: "pointer" }}>
      消火栓を追加
    </button>
    <button onClick={() => confirmAddMarker("防火水槽")} style={{ margin: "5px", padding: "10px", backgroundColor: "blue", color: "white", border: "none", borderRadius: "5px", cursor: "pointer" }}>
      防火水槽を追加
    </button>
    <button onClick={() => setShowSelection(false)} style={{ marginTop: "10px", padding: "8px", backgroundColor: "gray", color: "white", border: "none", borderRadius: "5px", cursor: "pointer" }}>
      キャンセル
    </button>
  </div>
)}

{visibleHydrants.map((hydrant) => (
  <MarkerF
    key={hydrant.firestoreId}
    position={{ lat: hydrant.lat, lng: hydrant.lon }}
    draggable={mode === "移動"}
    onDragEnd={(e) => 
      handleMarkerDragEnd(
        hydrant.firestoreId, 
        e.latLng.lat(), 
        e.latLng.lng(), 
        hydrant.lat, 
        hydrant.lon
      )
    }
    onClick={() => {
      if (mode === "点検") {
        handleCheckHydrant(hydrant.firestoreId);
      } else if (mode === "追加削除") {
        handleMarkerDelete(hydrant.firestoreId, hydrant.type);
      }
    }}
    icon={{
      url: hydrant.checked
        ? "http://maps.google.com/mapfiles/ms/icons/green-dot.png"  // ✅ チェック済みなら緑
        : hydrant.type.includes("消火栓")  // ✅ ここを "公設消火栓" ではなく "消火栓" にすると汎用的
        ? "http://maps.google.com/mapfiles/ms/icons/red-dot.png"  // 🔴 消火栓は赤
        : "http://maps.google.com/mapfiles/ms/icons/blue-dot.png", // 🔵 防火水槽は青
      scaledSize: isLoaded ? new window.google.maps.Size(40, 40) : undefined,  // ✅ isLoaded で安全チェック
    }}
  />
))}

</GoogleMap>

    {/* 🔘 リストのトグルボタン */}
    <button 
      onClick={() => setIsListOpen(!isListOpen)} 
      style={{
        position: "absolute", left: isListOpen ? "280px" : "10px", top: "50%", 
        transform: "translateY(-50%)",
        width: "40px",  // ボタンを横に広げる
        height: "100px", // 縦長にする
        padding: "12px", // クリックしやすくする
        fontSize: "25px", // 文字も大きくする
        border: "none",
        borderRadius: "10px", // 角を少し丸く
        cursor: "pointer",
        backgroundColor: "gray",
        color: "white",
        transition: "left 0.3s ease-in-out"
      }}
    >
      {isListOpen ? "◀" : "▶"}
    </button>

     {/* 🔘 点検リスト */}
    <div style={{
      position: "absolute", left: isListOpen ? "0px" : "-300px", bottom: "10px",
      width: "260px", backgroundColor: "rgba(255, 255, 255, 0.9)", padding: "10px",
      borderRadius: "8px", boxShadow: "0px 4px 6px rgba(0, 0, 0, 0.2)",
      maxHeight: "250px", overflowY: "auto",minHeight: "600px",
      transition: "left 0.3s ease-in-out"
    }}>
      <h3 style={{ fontSize: "16px", textAlign: "center" }}>✔ 点検済みリスト</h3>
      {checkedList.slice(0, 10).map((hydrant, index) => (
        <div key={index} style={{ padding: "5px", borderBottom: "1px solid #ccc", fontSize: "14px" }}>
          {hydrant.address}
        </div>
))}
      <button onClick={mode === "点検" ? confirmResetCheckedList : () => alert("点検モードでのみリセットできます")} style={{
        marginTop: "10px", width: "100%", padding: "8px",
        backgroundColor: "red", color: "white", border: "none",
        borderRadius: "5px", cursor: "pointer"
      }}>全てリセット</button>
    </div>
    </div>
  );
};

export default MapView;
