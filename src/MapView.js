import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// 🔥 カスタムアイコン
const userIcon = new L.Icon({
  iconUrl: "https://maps.google.com/mapfiles/ms/icons/lightblue-dot.png", // 水色（現在地）
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

const hydrantIcon = new L.Icon({
  iconUrl: "https://maps.google.com/mapfiles/ms/icons/red-dot.png", // 赤（消火栓）
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

const tankIcon = new L.Icon({
  iconUrl: "https://maps.google.com/mapfiles/ms/icons/blue-dot.png", // 青（防火水槽）
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

const MapView = () => {
  const defaultPosition = [35.3933, 139.3072]; // 初期位置（伊勢原市）
  const defaultZoom = 16;

  const [hydrants, setHydrants] = useState([]);
  const [mode, setMode] = useState("inspection"); // "inspection" | "move" | "add"
  const [showModeMenu, setShowModeMenu] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [mapCenter, setMapCenter] = useState(defaultPosition);
  const [mapZoom, setMapZoom] = useState(defaultZoom);

  // ✅ 現在地の取得
  useEffect(() => {
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
  }, []);

  // ✅ 消火栓・防火水槽のデータ取得
  useEffect(() => {
    fetch("/.netlify/functions/get_hydrants")
      .then((response) => response.json())
      .then((data) => {
        if (data.length > 0) {
          setHydrants(data);
        }
      })
      .catch((error) => console.error("データ取得失敗:", error));
  }, []);

  // ✅ 現在地に戻る
  const moveToCurrentLocation = () => {
    if (userLocation) {
      setMapCenter(userLocation);
      setMapZoom(16);
    } else {
      alert("現在地が取得できませんでした");
    }
  };

  // ✅ モード変更
  const changeMode = (newMode) => {
    setMode(newMode);
    setShowModeMenu(false);
  };

  return (
    <div style={{ position: "relative" }}>
      <MapContainer center={mapCenter} zoom={mapZoom} style={{ height: "100vh", width: "100%" }}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

        {/* 🔵 現在地マーカー */}
        {userLocation && (
          <Marker position={userLocation} icon={userIcon}>
            <Popup>現在地</Popup>
          </Marker>
        )}

        {/* 🔥 消火栓 & 防火水槽マーカー */}
        {hydrants.map((item) => (
          <Marker 
            key={item.id} 
            position={[item.lat, item.lon]} 
            icon={item.type === "防火水槽" ? tankIcon : hydrantIcon} 
          >
            <Popup>
              <b>住所:</b> {item.address} <br />
              <b>種類:</b> {item.type} 
            </Popup>
          </Marker>
        ))}
      </MapContainer>

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
        onClick={() => alert("データ保存！")}
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

      {/* 🔘 モード切替ボタン（右上固定） */}
      <button
        onClick={() => setShowModeMenu(!showModeMenu)}
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

      {/* 🔽 モード選択メニュー */}
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
