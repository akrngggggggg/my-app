import React, { useState } from "react";

const ModeSwitcher = ({ mode, setMode }) => {
  const [isModeMenuOpen, setIsModeMenuOpen] = useState(false);

  // 🔥 モードごとの色を定義
  const getModeColor = (currentMode) => {
    switch (currentMode) {
      case "点検":
        return "#4CAF50";  // 緑
      case "移動":
        return "#2196F3";  // 青
      case "追加削除":
        return "#FF5722";  // 赤
      default:
        return "#4CAF50";  // デフォルトは緑
    }
  };

  return (
    <div style={{ position: "relative" }}>
      <button 
        onClick={() => setIsModeMenuOpen(prev => !prev)}
        style={{
          padding: "10px 15px",
          fontSize: "16px",
          borderRadius: "8px",
          border: "none",
          backgroundColor: getModeColor(mode),  // 🔥 ここを修正
          color: "white",
          cursor: "pointer",
          textAlign: "center"
        }}
      >
        現在のモード: {mode} ▼
      </button>

      {/* 🔥 モード選択メニュー */}
      {isModeMenuOpen && (
        <div style={{
          position: "absolute", top: "45px", right: "0px", background: "white",
          borderRadius: "5px", boxShadow: "0px 4px 6px rgba(0, 0, 0, 0.2)",
          zIndex: 1000, padding: "5px", display: "flex", flexDirection: "column", gap: "5px"
        }}>
          {["点検", "移動", "追加削除"].map((item) => (
            <button 
              key={item}
              onClick={() => { setMode(item); setIsModeMenuOpen(false); }}
              style={{
                padding: "10px", minWidth: "150px",
                backgroundColor: getModeColor(item),  // 🔥 ここも修正
                color: "white", border: "none", cursor: "pointer", textAlign: "center"
              }}
            >
              {item}モード
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default ModeSwitcher;
