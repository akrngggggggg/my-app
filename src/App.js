// src/App.js
import React from "react";
import MapView from "./MapView";  // MapView.js をインポート

function App() {
  return (
    <div>
      <h1>Fire Hydrant Map</h1>
      <MapView /> {/* 地図を表示するコンポーネント */}
    </div>
  );
}

export default App;
