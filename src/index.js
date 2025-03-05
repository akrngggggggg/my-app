
import React from "react";
import ReactDOM from "react-dom/client"; // React 18では `react-dom/client` を使う
import App from "./App";
import "leaflet/dist/leaflet.css";  // Leaflet のスタイルをインポート
import "./index.css";  // カスタムスタイルのインポート

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />  {/* Appコンポーネントをレンダリング */}
  </React.StrictMode>
);