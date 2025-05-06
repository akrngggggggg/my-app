
import React, { useEffect, useState, useMemo, useRef } from "react";
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
  setDivision,
  setSection,
  setDialogSelectOptions,
  setDialogSelectValue,
  dialogSelectValue,
  user
}) => {

  // 🔥 権限判定
  const canAccessAll = ["団長", "副団長"].includes(user?.role);
  const canAccessDivision = ["分団長", "副分団長"].includes(user?.role);

  const checklistId = useMemo(() => {
    return division && section ? `${division}-${section}` : "undefined-undefined";
  }, [division, section]);

  const [dialogProcessing, setDialogProcessing] = useState(false);
  const [filterKeyword, setFilterKeyword] = useState("");
  const [totalEverChecked, setTotalEverChecked] = useState(0);

  const selectedValueRef = useRef("");

  useEffect(() => {
    window.selectedValueRef = selectedValueRef;
  }, []);

    // 🔥 所属切り替えUI
    const divisionSelector = (
      canAccessAll ? (
        <select value={division} onChange={(e) => setDivision(e.target.value)} className="border rounded px-2 py-1">
          {["1分団","2分団","3分団","4分団","5分団","6分団"].map(d => <option key={d}>{d}</option>)}
        </select>
      ) : (
        <span>{division}</span>
      )
    );
  
    const sectionSelector = (
      (canAccessAll || canAccessDivision) ? (
        <select value={section} onChange={(e) => setSection(e.target.value)} className="border rounded px-2 py-1">
          {["1部","2部","3部","4部","5部","6部"].map(s => <option key={s}>{s}</option>)}
        </select>
      ) : (
        <span>{section}</span>
      )
    );

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
            const entry = data[firestoreId] || {};
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
  
    // 🔥 UI部分（所属セレクタ）
    const selectorUI = (
      <div className="mb-2 flex gap-2 items-center flex-wrap">
        <label className="font-semibold">分団:</label>
        {divisionSelector}
        <label className="font-semibold">部:</label>
        {sectionSelector}
      </div>
    );

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
  
    setDialogSelectOptions(["--- 選択してください ---", "異常なし", "水没", "砂利・泥", "その他", "未点検に戻す"]);
    setDialogSelectValue("");
    selectedValueRef.current = ""; 
  
    const confirmationMessage = isChecked
      ? "未点検に戻しますか？"
      : "点検結果を選択してください";
  
    setDialogMessage(confirmationMessage);
    setDialogAction(() => () => {
      const value = selectedValueRef.current;
      if (!value || value === "--- 選択してください ---") {
        alert("点検結果を選択してください");
        return;
      }
      confirmCheckHydrant(firestoreId, isChecked, value);
    });
    setIsDialogOpen(true);
  };
  
  
  const confirmCheckHydrant = async (firestoreId, isChecked, selectedValue) => {
    try {
      const checklistRef = doc(db, "checklists", checklistId);
      const today = new Date().toISOString().slice(0, 10);
  
      let firestoreValue;
      if (selectedValue === "未点検に戻す") {
        firestoreValue = false;
      } else if (selectedValue === "異常なし") {
        firestoreValue = {
          checked: true,
          issue: "異常なし",
          lastUpdated: today,
        };
      } else {
        firestoreValue = {
          checked: true,
          issue: selectedValue,
          lastUpdated: today,
        };
      }
  
      const updatedHydrants = hydrants.map(h =>
        h.firestoreId === firestoreId
          ? {
              ...h,
              checked: !isChecked,
              issue:
                isChecked || selectedValue === "異常なし"
                  ? null
                  : selectedValue,
            }
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
      filteredCheckedList: filterKeyword
        ? checkedList.filter(h => (h.address || "").includes(filterKeyword))
        : checkedList,
      totalEverChecked,
      formatAddress,
      abnormalList: checkedList.filter(h => h.issue && h.issue !== "異常なし"),
      normalList: checkedList.filter(h => !h.issue || h.issue === "異常なし"),
      selectorUI  // 🔥 追加：呼び出し側でこのUIを表示できる
    };
  };
  
  export default CheckListManager;
