import React, { useState, useEffect } from "react";
import {
  GoogleMap,
  MarkerF,
  useJsApiLoader,
} from "@react-google-maps/api";
import { collection, getDocs, doc, updateDoc, getDoc, addDoc, deleteDoc } from "firebase/firestore";
import { db } from "./firebase";

const mapContainerStyle = {
  width: "100%",
  height: "100vh",
};

const checkedIcon = {
  url: "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" fill="green"/>
      <path d="M6 12l4 4 8-8" stroke="white" stroke-width="2" fill="none"/>
    </svg>
  `),
  scaledSize: { width: 40, height: 40 },
};

const userLocationIcon = {
  url: "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" fill="deepskyblue"/>
      <circle cx="12" cy="12" r="5" fill="white"/>
    </svg>
  `),
  scaledSize: { width: 40, height: 40 },
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
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
  });

  const [center, setCenter] = useState({ lat: 35.6895, lng: 139.6917 });
  const [zoom, setZoom] = useState(14);
  const [userLocation, setUserLocation] = useState(null);
  const [hydrants, setHydrants] = useState([]);
  const [checkedList, setCheckedList] = useState([]);
  const [mode, setMode] = useState("点検"); // ✅ モード追加
  const [isModeMenuOpen, setIsModeMenuOpen] = useState(false); // ✅ モードメニュー開閉
  const [isDialogOpen, setIsDialogOpen] = useState(false); // ダイアログの開閉
  const [dialogMessage, setDialogMessage] = useState(""); // 表示するメッセージ
  const [dialogAction, setDialogAction] = useState(null); // 確定時の処理
  
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
 
const [selectedLocation, setSelectedLocation] = useState(null); // クリック位置を一時保存
const [showSelection, setShowSelection] = useState(false); // 選択UIの表示フラグ

const handleMapClick = (event) => {
  if (mode !== "追加削除") return;

  const newLat = event.latLng.lat();
  const newLng = event.latLng.lng();

  setDialogMessage("ここに消火栓または防火水槽を追加しますか？");
  setDialogAction(() => () => confirmAddMarker(newLat, newLng));
  setIsDialogOpen(true);
};

const confirmAddMarker = async (lat, lng) => {
  try {
    const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}`);
    const data = await response.json();
    const address = data.results[0]?.formatted_address || "不明な住所";

    const newMarker = {
      lat, lon: lng,
      type: "消火栓", // 🚀 デフォルトは消火栓（後で選択できるようにするなら拡張可）
      address,
      checked: false,
    };

    const docRef = await addDoc(collection(db, "fire_hydrants"), newMarker);
    setHydrants([...hydrants, { firestoreId: docRef.id, ...newMarker }]);

    console.log(`✅ 追加完了: 消火栓 (${lat}, ${lng}) @ ${address}`);
  } catch (error) {
    console.error("🚨 追加エラー:", error);
  }

  setIsDialogOpen(false);
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

      const currentChecked = hydrantDoc.data().checked || false;
      await updateDoc(hydrantRef, { checked: !currentChecked });

      setHydrants((prevHydrants) =>
        prevHydrants.map((hydrant) =>
          hydrant.firestoreId === firestoreId ? { ...hydrant, checked: !currentChecked } : hydrant
        )
      );

      setCheckedList((prevList) => {
        if (currentChecked) {
          return prevList.filter((item) => item.firestoreId !== firestoreId);
        } else {
          return [...prevList, hydrantDoc.data()];
        }
      });

      console.log(`✅ Firestore 更新完了: ${firestoreId} を ${!currentChecked} に変更`);
    } catch (error) {
      console.error("🚨 Firestore 更新エラー:", error);
    }
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
        return { backgroundColor: "#4CAF50", color: "white" };
      case "移動":
        return { backgroundColor: "#2196F3", color: "white" };
      case "追加削除":
        return { backgroundColor: "#FF5722", color: "white" };
      default:
        return { backgroundColor: "white", color: "black" };
    }
  };

  if (!isLoaded) return <div>Loading...</div>;

  return (
    <div style={{ position: "relative" }}>
      <GoogleMap mapContainerStyle={mapContainerStyle} 
                                    center={center} 
                                    zoom={zoom}
                                    onClick={(e) => handleMapClick(e)}
                                    >
      <CustomDialog 
       isOpen={isDialogOpen} 
       message={dialogMessage} 
       onConfirm={dialogAction} 
       onCancel={() => setIsDialogOpen(false)} 
      />                                
{userLocation && (<MarkerF position={userLocation} icon={userLocationIcon} />)}

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

        {hydrants.map((hydrant) => (
          <MarkerF
          key={hydrant.firestoreId}
          position={{ lat: hydrant.lat, lng: hydrant.lon }}
          draggable={mode === "移動"}  // 🔥「移動モード」のときのみドラッグ可能
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
           
            if (mode === "追加削除") {
              handleMarkerDelete(hydrant.firestoreId, hydrant.type);
            } else {
              handleCheckHydrant(hydrant.firestoreId);
            }
          }}
          icon={hydrant.checked
            ? checkedIcon
            : {
                path: window.google?.maps?.SymbolPath.CIRCLE || 0,
                scale: 14,
                fillColor: hydrant.type === "公設消火栓" ? "red" : "blue",
                fillOpacity: 1,
                strokeWeight: 1,
                strokeColor: "white",
              }
          }
        />
        ))}
      </GoogleMap>

      {/* 🔘 モード切替UI */}
      <div 
        style={{
          position: "absolute",
          top: "10px",
          right: "10px",
          padding: "10px",
          borderRadius: "8px",
          boxShadow: "0px 4px 6px rgba(0, 0, 0, 0.2)",
          ...getModeStyle(),
          cursor: "pointer",
        }}
        onClick={() => setIsModeMenuOpen(!isModeMenuOpen)}
      >
        <h3 style={{ margin: 0 }}>現在のモード: {mode} ▼</h3>
        {isModeMenuOpen && (
          <div>
            <button onClick={() => setMode("点検")}>点検モード</button>
            <button onClick={() => setMode("移動")}>マーカー移動モード</button>
            <button onClick={() => setMode("追加削除")}>追加削除モード</button>
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

      {/* 🔘 点検リスト */}
      <div style={{
        position: "absolute", bottom: "10px", left: "10px", width: "280px",
        backgroundColor: "rgba(255, 255, 255, 0.9)", padding: "10px",
        borderRadius: "8px", boxShadow: "0px 4px 6px rgba(0, 0, 0, 0.2)",
        maxHeight: "250px", overflowY: "auto"
      }}>
        <h3 style={{ fontSize: "16px", textAlign: "center" }}>✔ 点検済みリスト</h3>
        {checkedList.slice(0, 5).map((hydrant, index) => (
          <div key={index} style={{ padding: "5px", borderBottom: "1px solid #ccc", fontSize: "14px" }}>
            {hydrant.address}
          </div>
        ))}
        <button onClick={handleResetCheckedList} style={{
          marginTop: "10px", width: "100%", padding: "8px",
          backgroundColor: "red", color: "white", border: "none",
          borderRadius: "5px", cursor: "pointer"
        }}>全てリセット</button>
      </div>
    </div>
  );
};

export default MapView;
