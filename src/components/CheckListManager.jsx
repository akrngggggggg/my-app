import React, { useEffect } from "react";
import { doc, updateDoc, getDoc, getDocs, collection } from "firebase/firestore";
import { db } from "../firebase";

const CheckListManager = ({ 
  checkedList, 
  setCheckedList, 
  hydrants, 
  setHydrants, 
  mode, 
  setIsDialogOpen, 
  setDialogMessage, 
  setDialogAction 
}) => {

  // 🔥 画面ロード時にチェック済みリストを取得する
  useEffect(() => {
    const fetchCheckedHydrants = async () => {
      try {
        const hydrantCollection = collection(db, "fire_hydrants");
        const hydrantSnapshot = await getDocs(hydrantCollection);
        
        const checkedHydrants = [];
        const allHydrants = hydrantSnapshot.docs.map(doc => {
          const data = doc.data();
          const firestoreId = doc.id;
          const isChecked = data.checked || false;

          // 🔍 チェック済みのアイテムをリストに追加
          if (isChecked) {
            const filteredAddress = data.address.replace(/^.*?伊勢原市/, '伊勢原市');
            checkedHydrants.push({ ...data, firestoreId, address: filteredAddress });
          }
          
          return { ...data, firestoreId };
        });

        setHydrants(allHydrants);
        setCheckedList(checkedHydrants); // 🔥 チェック済みリストをセット
      } catch (error) {
        console.error("🚨 Firestore 読み取りエラー:", error);
      }
    };

    fetchCheckedHydrants();
  }, [setCheckedList, setHydrants]); // 初回読み込み時にだけ実行

  // 🔥 消火栓の点検状態を切り替える
  const handleCheckHydrant = (firestoreId) => {
    const hydrant = hydrants.find(h => h.firestoreId === firestoreId);
    if (!hydrant) {
      console.error(`🚨 該当の消火栓が見つからない ID=${firestoreId}`);
      return;
    }

    const isChecked = hydrant.checked || false;
    const confirmationMessage = isChecked ? "未点検に戻しますか？" : "点検済みにしますか？";

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

      await updateDoc(hydrantRef, { checked: !isChecked });

      setHydrants(prevHydrants =>
        prevHydrants.map(h =>
          h.firestoreId === firestoreId ? { ...h, checked: !isChecked } : h
        )
      );

      if (!isChecked) {
        const filteredAddress = hydrantData.address.replace(/^.*?伊勢原市/, '伊勢原市');
        setCheckedList(prev => [...prev, { ...hydrantData, firestoreId, address: filteredAddress }]);
      } else {
        setCheckedList(prev => prev.filter(h => h.firestoreId !== firestoreId));
      }

      console.log(`✅ 状態変更: ${isChecked ? "未点検に戻しました" : "点検済みにしました"}`);
    } catch (error) {
      console.error("🚨 Firestore 更新エラー:", error);
    }

    setIsDialogOpen(false);
  };

  return { handleCheckHydrant };
};

export default CheckListManager;
