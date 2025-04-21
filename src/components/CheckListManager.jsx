
import React, { useEffect, useState, useMemo } from "react";
import { doc, setDoc, getDoc, getDocs, collection } from "firebase/firestore";
import { db } from "../firebase";

const CheckListManager = ({ 
  checkedList, 
  setCheckedList, 
  hydrants, 
  setHydrants, 
  mode, 
  setIsDialogOpen, 
  setDialogMessage, 
  setDialogAction,
  division,
  section,
  setDialogSelectOptions,
  setDialogSelectValue,
  dialogSelectValue
}) => {
  const checklistId = useMemo(() => {
    return division && section ? `${division}-${section}` : "undefined-undefined";
  }, [division, section]);

  const [dialogProcessing, setDialogProcessing] = useState(false);
  const [filterKeyword, setFilterKeyword] = useState("");
  const [totalEverChecked, setTotalEverChecked] = useState(0);

  useEffect(() => {
    if (!division || !section) return;

    const fetchCheckedHydrants = async () => {
      try {
        const checklistRef = doc(db, "checklists", checklistId);
        const checklistSnap = await getDoc(checklistRef);
        const data = checklistSnap.exists() ? checklistSnap.data() : {};

        const checkedIds = Object.entries(data)
          .filter(([_, value]) => value === true || (value && value.checked))
          .map(([key]) => key);

        const allTouchedIds = Object.keys(data);

        const hydrantSnapshot = await getDocs(collection(db, "fire_hydrants"));
        const allHydrants = hydrantSnapshot.docs.map(doc => {
          const firestoreId = doc.id;
          const entry = data[firestoreId]; // checklist のデータ

          return {
            ...doc.data(),
            firestoreId,
            division,
            section,
            checked: entry === true ? true : !!entry?.checked,
            issue: typeof entry === "object" ? entry?.issue : null
          };
        });

        const checkedOnly = allHydrants.filter(h => h.checked);

        setHydrants(allHydrants);
        setCheckedList(checkedOnly);
        setTotalEverChecked(allTouchedIds.length);
      } catch (error) {
        console.error("🚨 Firestore 読み取りエラー:", error);
      }
    };

    fetchCheckedHydrants();
  }, [division, section]);

  const handleResetCheckedList = () => {
    if (mode !== "点検") {
      setDialogMessage("⚠️ 点検モードでのみリセットできます。");
      setDialogAction(() => () => setIsDialogOpen(false));
      setIsDialogOpen(true);
      return;
    }

    setDialogMessage("本当に点検済みを未点検に戻しますか？");
    setDialogAction(() => confirmResetCheckedList);
    setIsDialogOpen(true);
  };

  const confirmResetCheckedList = async () => {
    if (dialogProcessing) return;
    setDialogProcessing(true);

    try {
      const checklistRef = doc(db, "checklists", checklistId);

      const resetData = {};
      checkedList.forEach(h => {
        resetData[h.firestoreId] = false;
      });

      await setDoc(checklistRef, resetData, { merge: true });

      setCheckedList([]);
      setHydrants(prev =>
        prev.map(h => checkedList.find(c => c.firestoreId === h.firestoreId)
          ? { ...h, checked: false, issue: null }
          : h
        )
      );

      console.log("🔁 点検済みのみ未点検にリセットしました");
    } catch (error) {
      console.error("🚨 リセットエラー:", error);
    }

    setDialogProcessing(false);
    setIsDialogOpen(false);
  };

  const handleCheckHydrant = (firestoreId) => {
    const hydrant = hydrants.find(h => h.firestoreId === firestoreId);
    if (!hydrant) {
      console.error(`🚨 消火栓が見つかりません ID=${firestoreId}`);
      return;
    }

    const isChecked = hydrant.checked === true;
    const confirmationMessage = isChecked ? "未点検に戻しますか？" : "点検結果を選択してください";
    
    console.log("🔥 不具合選択肢をセットします");
    setDialogSelectOptions(["未点検に戻す", "異常なし", "水没", "砂利・泥", "その他"]);
    setDialogSelectValue(isChecked ? "未点検に戻す" : "異常なし");
    

    setDialogMessage(confirmationMessage);
    setDialogAction(() => () => confirmCheckHydrant(firestoreId, isChecked));
    setIsDialogOpen(true);
  };

  const confirmCheckHydrant = async (firestoreId, isChecked) => {
    try {
      const checklistRef = doc(db, "checklists", checklistId);

      let firestoreValue;
if (dialogSelectValue === "未点検に戻す") {
  firestoreValue = false;
} else if (dialogSelectValue === "異常なし") {
  firestoreValue = true;
} else {
  firestoreValue = { checked: true, issue: dialogSelectValue };
}

      const updatedHydrants = hydrants.map(h =>
        h.firestoreId === firestoreId
          ? { ...h, checked: !isChecked, issue: isChecked ? null : (dialogSelectValue === "異常なし" ? null : dialogSelectValue) }
          : h
      );

      setHydrants(updatedHydrants);

      const updatedHydrant = updatedHydrants.find(h => h.firestoreId === firestoreId);
      setCheckedList(prev =>
        updatedHydrant.checked
          ? [...prev, updatedHydrant]
          : prev.filter(h => h.firestoreId !== firestoreId)
      );

      await setDoc(checklistRef, { [firestoreId]: firestoreValue }, { merge: true });

      console.log(`✅ 点検状態変更: ${updatedHydrant.checked ? "点検済み" : "未点検"}`);
    } catch (error) {
      console.error("🚨 Firestore 更新エラー:", error);
    }

    setIsDialogOpen(false);
  };

  function formatAddress(address, issue = null) {
    if (!address) return "";
    address = address.replace(/[Ａ-Ｚａ-ｚ０-９！-～]/g, s =>
      String.fromCharCode(s.charCodeAt(0) - 0xFEE0)
    );
    address = address.replace(/[ー－―—〜−]/g, "-");
    address = address.replace(/^日本、?/, "");
    address = address.replace(/^〒?\d{3}-\d{4}\s*/, ""); 
    address = address.replace(/^神奈川県伊勢原市|^神奈川県|^伊勢原市/, "");
    address = address.replace(/番地|番|丁目/g, "-");
    address = address.replace(/号/g, "");
    address = address.replace(/-+$/g, "");
    address = address.replace(/^-,*/, "");
    const cleanAddress = address.trim();

    if (issue && issue !== "異常なし") {
      return `⚠️ ${cleanAddress}`;
    }
    return cleanAddress;
  }

  const filteredCheckedList = filterKeyword
    ? checkedList.filter(h => (h.address || "").includes(filterKeyword))
    : checkedList;

    const abnormalList = checkedList.filter(h => h.issue && h.issue !== "異常なし");
    const normalList = checkedList.filter(h => !h.issue || h.issue === "異常なし");
    
    return {
      handleCheckHydrant,
      handleResetCheckedList,
      filterKeyword,
      setFilterKeyword,
      filteredCheckedList,
      totalEverChecked,
      formatAddress,
      abnormalList,
      normalList
    };
    
};

export default CheckListManager;
