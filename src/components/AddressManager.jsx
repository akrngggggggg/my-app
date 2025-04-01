import React, { useState, forwardRef, useImperativeHandle, useEffect } from "react";
import { addDoc, collection } from "firebase/firestore";
import { db } from "../firebase";

const AddressManager = forwardRef(({ selectedLocation, setSelectedLocation, 
    setShowSelection, hydrants, setHydrants, isManualAddressMode, setIsManualAddressMode }, ref) => {

  const [manualAddress, setManualAddress] = useState(""); 
  
  const confirmAddMarker = async (type) => {
    if (!selectedLocation) return;

    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${selectedLocation.lat},${selectedLocation.lng}&key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}`
      );
      const data = await response.json();
      let address = data.results[0]?.formatted_address || "不明な住所";

      console.log("📌 取得した住所:", address);

      if (address === "不明な住所") {
        setIsManualAddressMode(true);
        return;
      }

      await saveMarkerToFirestore(type, address);
    } catch (error) {
      console.error("🚨 住所取得エラー:", error);
      setIsManualAddressMode(true);
    }
  };

  const saveMarkerToFirestore = async (type, address) => {
    try {
      const markerIcon = type === "消火栓" 
        ? "http://maps.google.com/mapfiles/ms/icons/red-dot.png"
        : "http://maps.google.com/mapfiles/ms/icons/blue-dot.png";

      const newMarker = {
        lat: selectedLocation.lat,
        lon: selectedLocation.lng,
        type, 
        address,
        checked: false,
        icon: markerIcon,
      };

      const docRef = await addDoc(collection(db, "fire_hydrants"), newMarker);
      setHydrants([...hydrants, { firestoreId: docRef.id, ...newMarker }]);

      console.log(`✅ 追加完了: ${type} @ ${address}`);
    } catch (error) {
      console.error("🚨 Firestore 追加エラー:", error);
    }

    setShowSelection(false);
    setSelectedLocation(null);
    setIsManualAddressMode(false);
  };

  useEffect(() => {
    console.log("🔥 isManualAddressMode:", isManualAddressMode);
  }, [isManualAddressMode]);

  // 🔥 `MapView.jsx` から `confirmAddMarker` を操作可能にする！
  useImperativeHandle(ref, () => ({
    confirmAddMarker,
    setIsManualAddressMode
  }));

  return (
    <>
      {isManualAddressMode && (
        <div style={{
          position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
          backgroundColor: "white", padding: "15px", borderRadius: "8px",
          boxShadow: "0px 4px 6px rgba(0, 0, 0, 0.2)", textAlign: "center"
        }}>
          <h3>住所または目標物を入力</h3>
          <input
            type="text"
            placeholder="例: 伊勢原駅前" 
            value={manualAddress}
            onChange={(e) => setManualAddress(e.target.value)}
            style={{
              width: "250px", padding: "10px", marginBottom: "10px",
              borderRadius: "5px", border: "1px solid #ccc"
            }}
          />
          <br />
          <button onClick={() => saveMarkerToFirestore("消火栓", manualAddress)} style={{
            margin: "5px", padding: "10px", backgroundColor: "red", color: "white",
            border: "none", borderRadius: "5px", cursor: "pointer"
          }}>
            消火栓を追加
          </button>
          <button onClick={() => saveMarkerToFirestore("防火水槽", manualAddress)} style={{
            margin: "5px", padding: "10px", backgroundColor: "blue", color: "white",
            border: "none", borderRadius: "5px", cursor: "pointer"
          }}>
            防火水槽を追加
          </button>
          <button onClick={() => setIsManualAddressMode(false)} style={{
            marginTop: "10px", padding: "8px", backgroundColor: "gray", color: "white",
            border: "none", borderRadius: "5px", cursor: "pointer"
          }}>
            キャンセル
          </button>
        </div>
      )}
    </>
  );
});

export default AddressManager;
