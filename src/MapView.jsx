import React, { useState, useEffect } from "react";
import {
  GoogleMap,
  MarkerF,
  useJsApiLoader,
} from "@react-google-maps/api";
import { collection, getDocs, doc, updateDoc, getDoc, addDoc, deleteDoc } from "firebase/firestore";
import { db } from "./firebase";
import haversine from "haversine-distance"; // 距離計算用
import { useRef } from "react"; // 🔥 useRef をインポート！
import { MarkerClustererF } from "@react-google-maps/api";

console.log("🔍 Google Maps API Key:", import.meta.env.VITE_GOOGLE_MAPS_API_KEY);

const mapContainerStyle = {
  width: "100%",
  height: "100vh",
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
  const [userLocation, setUserLocation] = useState(null);
  const [userLocationIcon, setUserLocationIcon] = useState(null);
  const mapRef = useRef(null);

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
  });

  
const onMapLoad = (map) => {
  if (!isLoaded || !window.google || !window.google.maps) {
    console.error("🚨 Google Maps API がまだロードされていない！");
    return;
  }
  mapRef.current = map;
  console.log("✅ Google Maps ロード完了！", map);
};


  const [visibleHydrants, setVisibleHydrants] = useState([]);
  const [center, setCenter] = useState({ lat: 35.6895, lng: 139.6917 });
  const [zoom, setZoom] = useState(14);
  const [hydrants, setHydrants] = useState([]);
  const [checkedList, setCheckedList] = useState([]);
  const [mode, setMode] = useState("点検"); // ✅ モード追加
  const [isModeMenuOpen, setIsModeMenuOpen] = useState(false); // ✅ モードメニュー開閉
  const [isDialogOpen, setIsDialogOpen] = useState(false); // ダイアログの開閉
  const [dialogMessage, setDialogMessage] = useState(""); // 表示するメッセージ
  const [dialogAction, setDialogAction] = useState(null); // 確定時の処理
  const [isListOpen, setIsListOpen] = useState(false); // リストの開閉状態
  const [selectedLocation, setSelectedLocation] = useState(null); // クリック位置を一時保存
  const [showSelection, setShowSelection] = useState(false); // 選択UIの表示フラグ
  const [mapBounds, setMapBounds] = useState(null); // 地図の表示範囲

  
  const updateUserLocation = () => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const newLocation = { lat: latitude, lng: longitude };
        setUserLocation(newLocation);
        setCenter(newLocation);
        setZoom(16);
      },
      (error) => console.error("現在地の取得に失敗しました:", error),
      { enableHighAccuracy: true }
    );
  };



  useEffect(() => {
    updateUserLocation();
  }, []);

  useEffect(() => {
    const fetchHydrants = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "fire_hydrants"));
        const data = querySnapshot.docs.map((doc) => {
          const docData = doc.data(); // Firestore のデータを取得
    
          return {
            ...docData,  // 🔥 まず Firestore のデータを展開
            firestoreId: doc.id,  // 🔥 Firestore のドキュメントIDを `firestoreId` に設定
            checked: docData.checked || false,  // 🔥 checked が undefined の場合は false にする
          };
        });

        console.log("📌 Firestore から取得したデータ:", data); // 🔥 データ確認用

        setHydrants(data);

        const checkedItems = data.filter(h => h.checked);
        setCheckedList(checkedItems);
      } catch (error) {
        console.error("🚨 データ取得エラー:", error);
      }
    };
    fetchHydrants();
  }, []);

  const handleMarkerDragEnd = (firestoreId, newLat, newLng, oldLat, oldLng) => {
    setDialogMessage("ここに移動しますか？");
    setDialogAction(() => () => confirmMoveMarker(firestoreId, newLat, newLng));
    setIsDialogOpen(true);
  };
  
  useEffect(() => {
    if (!userLocation || hydrants.length === 0) return;
  
    // 1km 以内のマーカーだけフィルタリング
    const filteredHydrants = hydrants.filter(hydrant => {
      const distance = haversine(userLocation, { lat: hydrant.lat, lng: hydrant.lon });
      return distance <= 1000; // 1000m (1km)
    });
  
    setVisibleHydrants(filteredHydrants);
  }, [userLocation, hydrants]);

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
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${selectedLocation.lat},${selectedLocation.lng}&key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}`
    );
    const data = await response.json();
    const address = data.results[0]?.formatted_address || "不明な住所";

    const newMarker = {
      lat: selectedLocation.lat,
      lon: selectedLocation.lng,
      type, // 🔥 ここで「消火栓」or「防火水槽」を反映！
      address,
      checked: false,
    };

    const docRef = await addDoc(collection(db, "fire_hydrants"), newMarker);
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
    setHydrants((prev) => prev.filter((h) => h.firestoreId !== firestoreId));
    console.log(`🗑️ 削除完了: ID=${firestoreId}`);
  } catch (error) {
    console.error("🚨 削除エラー:", error);
  }

  setIsDialogOpen(false);
};

const handleCheckHydrant = async (firestoreId) => {
  try {
    const hydrantRef = doc(db, "fire_hydrants", firestoreId);
    const hydrantDoc = await getDoc(hydrantRef);

    if (!hydrantDoc.exists()) {
      console.error(`🚨 Firestore 更新エラー: 該当の消火栓が見つからない ID=${firestoreId}`);
      return;
    }

    const hydrantData = hydrantDoc.data();
    const currentChecked = hydrantData.checked || false;

    // 🔥 同じ座標のマーカーをすべて取得
    const sameLocationHydrants = hydrants.filter(h => 
      h.lat === hydrantData.lat && h.lon === hydrantData.lon
    );

    // 🔥 Firestore のデータを更新（すべてのマーカー）
    for (const hydrant of sameLocationHydrants) {
      const ref = doc(db, "fire_hydrants", hydrant.firestoreId);
      await updateDoc(ref, { checked: !currentChecked });
    }

    // 🔥 フロント側のデータも更新
    setHydrants(prevHydrants =>
      prevHydrants.map(h =>
        h.lat === hydrantData.lat && h.lon === hydrantData.lon
          ? { ...h, checked: !currentChecked }
          : h
      )
    );

    console.log(`✅ チェック完了: (${hydrantData.lat}, ${hydrantData.lon}) のマーカーを更新`);
  } catch (error) {
    console.error("🚨 Firestore 更新エラー:", error);
  }
};


const handleBoundsChanged = () => {
  if (!mapRef.current) {
    console.log("🚨 mapRef がまだロードされていない！");
    return;
  }
  
  const bounds = mapRef.current.getBounds();
  if (!bounds) {
    console.log("🚨 getBounds() が undefined！ズームアウトしすぎかも？");
    return;
  }

  setMapBounds(bounds);
};
useEffect(() => {
  if (!mapBounds || hydrants.length === 0) return;

  const visibleHydrants = hydrants.filter(hydrant => {
    const latLng = new window.google.maps.LatLng(hydrant.lat, hydrant.lon);
    return mapBounds.contains(latLng);
  });

  setVisibleHydrants(visibleHydrants);
}, [mapBounds, hydrants]);


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

  return (
    <div style={{ position: "relative" }}>
     <GoogleMap
      mapContainerStyle={mapContainerStyle}
      center={center}
      zoom={zoom}
      onClick={(e) => handleMapClick(e)}
      onLoad={onMapLoad}
      onBoundsChanged={handleBoundsChanged}
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

<MarkerClustererF>
  {(clusterer) =>
    visibleHydrants.map((hydrant) => (
      <MarkerF
        key={hydrant.firestoreId}
        position={{ lat: hydrant.lat, lng: hydrant.lon }}
        clusterer={clusterer} // 🔥 クラスターに追加！
        draggable={mode === "移動"} // 移動モードのときはドラッグ可能
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
            handleCheckHydrant(hydrant.firestoreId); // 🔥 点検モードなら色を変える
          } else if (mode === "追加削除") {
            handleMarkerDelete(hydrant.firestoreId, hydrant.type);
          }
        }}
        icon={
          hydrant.checked
            ? {
                url: "http://maps.google.com/mapfiles/ms/icons/green-dot.png", // 🔥 チェック済みなら緑のピン！
                scaledSize: new window.google.maps.Size(40, 40),
              }
            : {
                url:
                  hydrant.type === "公設消火栓"
                    ? "http://maps.google.com/mapfiles/ms/icons/red-dot.png"
                    : "http://maps.google.com/mapfiles/ms/icons/blue-dot.png",
                scaledSize: new window.google.maps.Size(40, 40),
              }
        }
      />
    ))
  }
</MarkerClustererF>
      </GoogleMap>

     {/* 🔘 モード切替UI */}
<div 
  style={{
    position: "absolute",
    top: "10px",
    right: "10px",
    padding: "15px",  // ⬆ クリック範囲を広げる
    borderRadius: "10px",
    boxShadow: "0px 4px 6px rgba(0, 0, 0, 0.2)",
    ...getModeStyle(),
    cursor: "pointer",
    fontSize: "18px", // ⬆ 文字を大きくする
    minWidth: "150px", // ⬆ 最小幅を設定（幅が狭くならないように）
    textAlign: "center" // ⬆ 中央揃え
  }}
  onClick={() => setIsModeMenuOpen(!isModeMenuOpen)}
>
  <h3 style={{ margin: 0, fontSize: "18px" }}>現在のモード: {mode} ▼</h3>
  {isModeMenuOpen && (
    <div style={{
      display: "flex", flexDirection: "column", gap: "10px", // ⬆ ボタンの間隔を広げる
      padding: "10px"
    }}>
      <button 
        onClick={() => setMode("点検")} 
        style={{
          padding: "12px", fontSize: "16px", borderRadius: "8px", border: "none",
          backgroundColor: "#4CAF50", color: "white", cursor: "pointer"
        }}
      >点検モード</button>
      <button 
        onClick={() => setMode("移動")} 
        style={{
          padding: "12px", fontSize: "16px", borderRadius: "8px", border: "none",
          backgroundColor: "#2196F3", color: "white", cursor: "pointer"
        }}
      >マーカー移動モード</button>
      <button 
        onClick={() => setMode("追加削除")} 
        style={{
          padding: "12px", fontSize: "16px", borderRadius: "8px", border: "none",
          backgroundColor: "#FF5722", color: "white", cursor: "pointer"
        }}
      >追加削除モード</button>
    </div>
  )}
</div>


        {/* 🔘 現在地に戻るボタン */}
        <button onClick={updateUserLocation} style={{
        position: "absolute", bottom: "20px", right: "20px",
        padding: "10px 15px", backgroundColor: "#4285F4",
        color: "white", fontSize: "14px", fontWeight: "bold",
        border: "none", borderRadius: "5px", cursor: "pointer",
        boxShadow: "0px 4px 6px rgba(0, 0, 0, 0.2)"
      }}>現在地に戻る</button>

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
