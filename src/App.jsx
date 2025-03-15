import React from "react";
import MapView from "./MapView"; // ✅ MapView コンポーネントをインポート

const App = () => {
  return (
    <div>
      <h1>消火栓マップ</h1>
      <MapView /> {/* 🔥 地図を表示するコンポーネント */}
    </div>
  );
};

export default App; // ✅ App コンポーネントの定義後に export
