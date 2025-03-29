import React from "react";
import { doc, updateDoc, addDoc, deleteDoc, getDoc, collection } from "firebase/firestore";
import { db } from "../firebase"; 

const MarkerManager = ({ hydrants, setHydrants, setIsDialogOpen, setDialogMessage, setDialogAction }) => {
  
  // 🔥 マーカーを移動
  const handleMarkerDragEnd = (firestoreId, newLat, newLng) => {
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

  // 🔥 マーカーを削除
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

  return { handleMarkerDragEnd, handleMarkerDelete };
};

export default MarkerManager;
