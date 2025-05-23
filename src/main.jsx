import './index.css';
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App"; // ✅ default import で App を読み込む

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
