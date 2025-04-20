import React from "react";
import { doc, updateDoc, addDoc, deleteDoc, getDoc, collection } from "firebase/firestore";
import { db } from "../firebase";

const MarkerManager = ({
  hydrants,
  setHydrants,
  setCheckedList,
  setIsDialogOpen,
  setDialogMessage,
  setDialogAction,
  mapRef,
}) => {
  // 🔥 マーカーを移動
  const handleMarkerDragEnd = (firestoreId, newLat, newLng) => {
    // 元の位置を保存
    const original = hydrants.find(h => h.firestoreId === firestoreId);
    const originalLat = original?.lat;
    const originalLng = original?.lon;
  
    setDialogMessage("ここに移動しますか？");
  
    setDialogAction(() => () => confirmMoveMarker(firestoreId, newLat, newLng));
  
    // キャンセル時にマーカーの位置を戻す
    const marker = window.currentHydrantMarkers?.find(m => {
      const pos = m.getPosition();
      return pos.lat() === newLat && pos.lng() === newLng;
    });
    const map = window?.google?.maps?.Map ? mapRef?.current : null;
  
    // ✨ キャンセルロジックを window に記録しておく（MapView で使う）
    window.cancelMarkerMove = () => {
      if (marker && originalLat != null && originalLng != null) {
        marker.setPosition({ lat: originalLat, lng: originalLng });
        if (map) {
          const center = map.getCenter();
          map.panTo({
            lat: center.lat() + 0.000001,
            lng: center.lng(), // 強制リフレッシュ
          });
        }
      }
    };
  
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
      // Firestore からマーカーを削除
      await deleteDoc(doc(db, "fire_hydrants", firestoreId));

      // ローカルのマーカー一覧から削除
      setHydrants((prev) => prev.filter((h) => h.firestoreId !== firestoreId));

      // 🔥 点検済みリストからも削除する
      setCheckedList((prevCheckedList) =>
        prevCheckedList.filter((h) => h.firestoreId !== firestoreId)
      );

      console.log(`🗑️ 削除完了: ID=${firestoreId}`);
    } catch (error) {
      console.error("🚨 削除エラー:", error);
    }

    setIsDialogOpen(false);
  };

  return { handleMarkerDragEnd, handleMarkerDelete };
};

export default MarkerManager;
