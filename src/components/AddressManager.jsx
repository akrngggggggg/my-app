import React, { useState, forwardRef, useImperativeHandle, useEffect } from "react";
import { addDoc, collection } from "firebase/firestore";
import { db } from "../firebase";

const AddressManager = forwardRef(({ selectedLocation, setSelectedLocation, 
    setShowSelection, hydrants, setHydrants, isManualAddressMode, setIsManualAddressMode }, ref) => {

  const [manualAddress, setManualAddress] = useState(""); 
  const [isAdding, setIsAdding] = useState(false); // 🔥 処理中かどうかを管理する

  const confirmAddMarker = async (type) => {
    if (!selectedLocation || isAdding) return; // 🔥 追加中なら何もしない

    setIsAdding(true); // 🔥 処理中状態にする
    console.log(`📌 Adding marker of type: ${type}`);

    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${selectedLocation.lat},${selectedLocation.lng}&key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}`
      );

      const data = await response.json();
      let address = data.results[0]?.formatted_address || "不明な住所";

      if (address === "不明な住所") {
        setIsManualAddressMode(true);
        setIsAdding(false); // 🔥 エラー時も処理を解除
        return;
      }

      await saveMarkerToFirestore(type, address);
    } catch (error) {
      console.error("🚨 住所取得エラー:", error);
      setIsAdding(false); // 🔥 エラー時も処理を解除
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

      console.log(`✅ Firestore 保存完了: ${type} @ ${address}`);
    } catch (error) {
      console.error("🚨 Firestore 追加エラー:", error);
    }

    setIsAdding(false); // 🔥 正常に保存できた時に処理を解除
    setShowSelection(false);
    setSelectedLocation(null);
    setIsManualAddressMode(false);
  };

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
          boxShadow: "0px 4px 6px rgba(0, 0, 0, 0.2)", textAlign: "center",
          zIndex: 9999
        }}>
          <button 
            onClick={() => confirmAddMarker("消火栓")}
            onTouchEnd={() => confirmAddMarker("消火栓")}
            disabled={isAdding} // 🔥 処理中ならボタンを無効化
            style={{
              margin: "5px", padding: "10px", backgroundColor: isAdding ? "grey" : "red", 
              color: "white", border: "none", borderRadius: "5px", cursor: isAdding ? "not-allowed" : "pointer"
            }}>
            消火栓を追加
          </button>
          <button 
            onClick={() => confirmAddMarker("防火水槽")}
            onTouchEnd={() => confirmAddMarker("防火水槽")}
            disabled={isAdding} // 🔥 処理中ならボタンを無効化
            style={{
              margin: "5px", padding: "10px", backgroundColor: isAdding ? "grey" : "blue", 
              color: "white", border: "none", borderRadius: "5px", cursor: isAdding ? "not-allowed" : "pointer"
            }}>
            防火水槽を追加
          </button>
          <button 
            onClick={() => setIsManualAddressMode(false)}
            onTouchEnd={() => setIsManualAddressMode(false)}
            style={{
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
