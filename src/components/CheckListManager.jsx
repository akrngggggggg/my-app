import React, { useEffect, useState } from "react";
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

  const [dialogProcessing, setDialogProcessing] = useState(false);

    // 🔥 住所をクリックした時の処理
    const handleAddressClick = (lat, lon) => {
      if (moveToLocation) {
        moveToLocation(lat, lon); // 🔥 マップを指定の場所に移動
      }
    };

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

  // 🔥 全てリセットする関数
  const handleResetCheckedList = () => {
    if (mode !== "点検") { // 🔑 点検モードでなければエラーダイアログを表示
      setDialogMessage("⚠️ 点検モードでのみリセットできます。");
      setDialogAction(() => () => setIsDialogOpen(false));
      setIsDialogOpen(true);
      return;
    }

    setDialogMessage("本当にすべてのチェックをリセットしますか？");
    setDialogAction(() => confirmResetCheckedList);
    setIsDialogOpen(true);
  };

  const confirmResetCheckedList = async () => {
    if (dialogProcessing) return;

    setDialogProcessing(true);

    try {
      const hydrantCollection = collection(db, "fire_hydrants");
      const hydrantSnapshot = await getDocs(hydrantCollection);

      const allHydrants = hydrantSnapshot.docs.map(doc => ({ ...doc.data(), firestoreId: doc.id }));

      const checkedHydrants = allHydrants.filter(hydrant => hydrant.checked === true);

      // 🔥 Firestore の `checked` フィールドを全て false にする
      for (const hydrant of checkedHydrants) {
        const hydrantRef = doc(db, "fire_hydrants", hydrant.firestoreId);
        await updateDoc(hydrantRef, { checked: false });
      }

      // 🔥 React の状態を更新
      setCheckedList([]);
      setHydrants(prevHydrants => prevHydrants.map(h => ({ ...h, checked: false })));

      console.log("🔄 全ての点検済みをリセットしました");
    } catch (error) {
      console.error("🚨 全てリセットエラー:", error);
    }

    setDialogProcessing(false);
    setIsDialogOpen(false);
  };

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

  return { handleCheckHydrant, handleResetCheckedList };
};

export default CheckListManager;
