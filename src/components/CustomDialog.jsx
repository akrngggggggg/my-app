import React from "react";

const CustomDialog = ({ isOpen, message, onConfirm, onCancel }) => {
  if (!isOpen) return null;

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
        <button onClick={onConfirm} style={{ margin: "5px", padding: "10px", backgroundColor: "blue", color: "white", border: "none", borderRadius: "5px", cursor: "pointer" }}>OK</button>
        <button onClick={onCancel} style={{ margin: "5px", padding: "10px", backgroundColor: "gray", color: "white", border: "none", borderRadius: "5px", cursor: "pointer" }}>キャンセル</button>
      </div>
    </div>
  );
};

export default CustomDialog;
