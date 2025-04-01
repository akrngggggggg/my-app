import React, { useState, useEffect } from "react";

const CustomDialog = ({ isOpen, message, onConfirm, onCancel }) => {
  const [dialogProcessing, setDialogProcessing] = useState(false);

  useEffect(() => {
    if (isOpen) setDialogProcessing(false); // ダイアログが開いたときはリセット
  }, [isOpen]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (dialogProcessing) return; // 処理中なら何もしない
    setDialogProcessing(true); // 処理中にする
    onConfirm(); // OKボタンの処理を実行
  };

  return (
    <div style={{
      position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
      backgroundColor: "rgba(0, 0, 0, 0.5)", display: "flex",
      justifyContent: "center", alignItems: "center"
    }}>
      <div style={{
        backgroundColor: "white", padding: "20px", borderRadius: "8px",
        textAlign: "center", boxShadow: "0px 4px 6px rgba(0, 0, 0, 0.2)"
      }}>
        <h2>確認</h2>
        <p>{message}</p>
        <button 
          onClick={handleConfirm} 
          style={{ 
            margin: "10px", padding: "15px 30px", // 🔑 ボタンを大きくする
            backgroundColor: dialogProcessing ? "gray" : "blue", 
            color: "white", border: "none", borderRadius: "8px", 
            cursor: dialogProcessing ? "not-allowed" : "pointer",
            fontSize: "16px" // 🔑 フォントサイズも少し大きくする
          }}
          disabled={dialogProcessing} // 🔑 処理中はボタンを無効化
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

export default CustomDialog;
