import React from "react";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { db } from "../firebase";

const CheckListManager = ({ checkedList, setCheckedList, hydrants, setHydrants, mode, setIsDialogOpen, setDialogMessage, setDialogAction }) => {

  // 🔥 消火栓の点検状態を切り替える
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

    setIsDialogOpen(false);
  };

  // 🔥 チェックリストをリセットする
  const handleResetCheckedList = () => {
    if (mode !== "点検") {
      setDialogMessage("⚠️ 点検モードでのみリセットできます。");
      setDialogAction(() => () => setIsDialogOpen(false));
      setIsDialogOpen(true);
      return;
    }

    if (!checkedList || checkedList.length === 0) {
      setDialogMessage("⚠️ リセットするチェック済みの消火栓がありません。");
      setDialogAction(() => () => setIsDialogOpen(false));
      setIsDialogOpen(true);
      return;
    }

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

      setHydrants(prevHydrants =>
        prevHydrants.map(hydrant => ({ ...hydrant, checked: false }))
      );

      setCheckedList([]);
      console.log("🔄 全てのチェックをリセットしました");
    } catch (error) {
      console.error("🚨 Firestore 更新エラー:", error);
    }

    setIsDialogOpen(false);
  };

  return { handleCheckHydrant, handleResetCheckedList };
};

export default CheckListManager;
