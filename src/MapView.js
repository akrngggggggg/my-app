import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-gesture-handling";
import "leaflet-gesture-handling/dist/leaflet-gesture-handling.css";
import React, { useState, useEffect, useCallback } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";

// 🔥 カスタムアイコン
const userIcon = new L.Icon({
  iconUrl: "https://maps.google.com/mapfiles/ms/icons/lightblue-dot.png", // 水色マーカー（現在地）
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

const redIcon = new L.Icon({
  iconUrl: "https://maps.google.com/mapfiles/ms/icons/red-dot.png", // 赤マーカー（消火栓）
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

const blueIcon = new L.Icon({
  iconUrl: "https://maps.google.com/mapfiles/ms/icons/blue-dot.png", // 青マーカー（防火水槽）
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

const MapView = () => {
  const defaultPosition = [35.3933, 139.3072]; // 伊勢原市の中心座標
  const defaultZoom = 16;

  // 🔥 必要な `useState` 変数を定義（エラー修正）
  const [hydrants, setHydrants] = useState([]);
  const [userLocation, setUserLocation] = useState(null);
  const [mapCenter, setMapCenter] = useState(defaultPosition);
  const [mapZoom, setMapZoom] = useState(defaultZoom);
  const [mode, setMode] = useState("inspection"); // 🔥 点検/編集モード
  const [showModeMenu, setShowModeMenu] = useState(false); // 🔥 モード切替メニューの表示

  /** 🔥 データ取得処理 */
  const fetchData = useCallback(() => {
    console.log("📡 [DEBUG] fetchData() 実行開始");
    fetch("/.netlify/functions/get_hydrants")
      .then((response) => response.json())
      .then((data) => {
        console.log("📥 [DEBUG] 取得データ:", data);
        if (data.length > 0) {
          setHydrants(data);
          localStorage.setItem("fire_hydrants", JSON.stringify(data));
        } else {
          console.warn("⚠ [WARN] 取得データが空 or 読み込めていない！");
        }
      })
      .catch((error) => console.error("❌ [ERROR] API呼び出しエラー:", error));
  }, [setHydrants]);

  /** 🔥 初回マウント時の処理 */
  useEffect(() => {
    console.log("🔄 [DEBUG] useEffect() 実行: fetchData() を呼び出します！");
    fetchData();

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation([position.coords.latitude, position.coords.longitude]);
        },
        (error) => {
          console.error("位置情報の取得に失敗:", error);
        }
      );
    }
  }, [fetchData])

  /** 🔥 現在地に戻る */
  const moveToCurrentLocation = () => {
    if (userLocation) {
      setMapCenter(userLocation);
      setMapZoom(16);
    } else {
      alert("現在地が取得できませんでした");
    }
  };

  /** 🔥 モード切替 */
  const toggleModeMenu = () => {
    setShowModeMenu(!showModeMenu);
  };

  const changeMode = (newMode) => {
    setMode(newMode);
    setShowModeMenu(false);
  };

  /** 🔥 保存ボタンの処理（仮のアクション） */
  const saveData = () => {
    console.log("💾 データを保存しました！（実装は後で追加）");
    alert("データを保存しました！");
  };

  /** 🔥 現在地に戻る */
  const moveToCurrentLocation = () => {
    if (userLocation) {
      setMapCenter(userLocation);
      setMapZoom(16);
    } else {
      alert("現在地が取得できませんでした");
    }
  };

  return (
    <div style={{ position: "relative" }}>
      <MapContainer center={mapCenter} zoom={mapZoom} style={{ height: "100vh", width: "100%" }}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

        {/* 🔵 ユーザーの現在地マーカー（水色） */}
        {userLocation && (
          <Marker position={userLocation} icon={userIcon}>
            <Popup>現在地</Popup>
          </Marker>
        )}

        {/* 🔥 消火栓 & 防火水槽のマーカー */}
        {hydrants.map((item) => (
          <Marker 
            key={item.id} 
            position={[item.lat, item.lon]} 
            icon={item.type === "防火水槽" ? blueIcon : redIcon} // 防火水槽なら青、それ以外（消火栓）は赤
          >
            <Popup>
              <b>種類:</b> {item.type} <br />
              <b>ID:</b> {item.id}
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* 🔘 モード切替ボタン（右上固定） */}
      <button
        onClick={toggleModeMenu}
        style={{
          position: "fixed",
          top: "20px",
          right: "20px",
          backgroundColor: "#28a745",
          color: "#fff",
          padding: "10px 15px",
          border: "none",
          borderRadius: "5px",
          cursor: "pointer",
          zIndex: 1000,
        }}
      >
        モード切替
      </button>

      {/* 🔘 現在地に戻るボタン（右下固定） */}
      <button
        onClick={moveToCurrentLocation}
        style={{
          position: "fixed",
          bottom: "20px",
          right: "20px",
          backgroundColor: "#007bff",
          color: "#fff",
          padding: "10px 15px",
          border: "none",
          borderRadius: "5px",
          cursor: "pointer",
          zIndex: 1000,
        }}
      >
        現在地へ戻る
      </button>

      {/* 💾 保存ボタン（左下固定） */}
      <button
        onClick={saveData}
        style={{
          position: "fixed",
          bottom: "20px",
          left: "20px",
          backgroundColor: "#dc3545",
          color: "#fff",
          padding: "10px 15px",
          border: "none",
          borderRadius: "5px",
          cursor: "pointer",
          zIndex: 1000,
        }}
      >
        保存
      </button>

      {/* 🔽 モード選択メニュー（モード切替ボタンの下に表示） */}
      {showModeMenu && (
        <div
          style={{
            position: "fixed",
            top: "70px",
            right: "20px",
            backgroundColor: "#fff",
            padding: "10px",
            borderRadius: "5px",
            boxShadow: "0px 2px 10px rgba(0,0,0,0.2)",
            zIndex: 1000,
          }}
        >
          <p>現在のモード: <b>{mode === "inspection" ? "点検" : "編集"}</b></p>
          <button onClick={() => changeMode("inspection")}>点検モード</button>
          <button onClick={() => changeMode("edit")}>編集モード</button>
        </div>
      )}
    </div>
  );
};

export default MapView;
