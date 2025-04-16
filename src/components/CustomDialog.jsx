import React, { useState, useEffect } from "react";
import L from "leaflet";

const CustomDialog = ({
  isOpen,
  message,
  onConfirm,
  onCancel,
  dialogSelectOptions = [],
  dialogSelectValue,
  setDialogSelectValue
}) => {
  const [dialogProcessing, setDialogProcessing] = useState(false);

  useEffect(() => {
    if (isOpen) setDialogProcessing(false); // ダイアログが開いたときはリセット
  }, [isOpen]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (dialogProcessing) return;
    setDialogProcessing(true);
    onConfirm(dialogSelectValue); // ← ここで最新の値を渡す！
  };

  const shouldShowSelect = dialogSelectOptions.length > 0;

  return (
    <div style={{
      position: "fixed", 
      top: 0, 
      left: 0, 
      width: "100%", 
      height: "100%",
      backgroundColor: "rgba(0, 0, 0, 0.5)", 
      display: "flex",
      justifyContent: "center", 
      alignItems: "center",
      zIndex: 9999
    }}>
      <div style={{
        backgroundColor: "white", 
        padding: "20px", 
        borderRadius: "8px",
        textAlign: "center", 
        boxShadow: "0px 4px 6px rgba(0, 0, 0, 0.2)",
        zIndex: 10000
      }}>
        <h2>確認</h2>
        <p>{message}</p>

        {shouldShowSelect && (
          <div style={{ margin: "15px 0" }}>
            <label htmlFor="issue-select" style={{ marginRight: "8px" }}>選択：</label>
            <select
              id="issue-select"
              value={dialogSelectValue}
              onChange={(e) => setDialogSelectValue(e.target.value)}
              style={{ padding: "8px", fontSize: "16px", borderRadius: "4px" }}
            >
              {dialogSelectOptions.map((option, idx) => (
                <option key={idx} value={option}>{option}</option>
              ))}
            </select>
          </div>
        )}

        <button 
          onClick={handleConfirm} 
          style={{ 
            margin: "10px", padding: "15px 30px",
            backgroundColor: dialogProcessing ? "gray" : "blue", 
            color: "white", border: "none", borderRadius: "8px", 
            cursor: dialogProcessing ? "not-allowed" : "pointer",
            fontSize: "16px"
          }}
          disabled={dialogProcessing}
        >
          OK
        </button>
        <button 
          onClick={onCancel} 
          style={{ 
            margin: "5px", padding: "10px", backgroundColor: "gray", 
            color: "white", border: "none", borderRadius: "5px", cursor: "pointer" 
          }}
        >
          キャンセル
        </button>
      </div>
    </div>
  );
};

export const getMarkerColor = (type, checked, issue) => {
  if (!checked) {
    // 未点検はタイプ別
    return type.includes("水槽") ? "blue" : "red";
  }

  // 点検済み
  if (!issue || issue === "異常なし") return "green";

  switch (issue) {
    case "水没": return "navy";
    case "砂利・泥": return "orange";
    case "その他": return "purple";
    default: return "yellow";
  }
};

export default CustomDialog;