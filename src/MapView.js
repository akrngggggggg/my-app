import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-gesture-handling";
import "leaflet-gesture-handling/dist/leaflet-gesture-handling.css";
import React, { useState, useEffect, useCallback } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";

// 🔥 Leaflet マーカーアイコンの設定（デフォルトマーカーを無効にする）
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: null,
  iconUrl: null,
  shadowUrl: null,
});

// 🔥 カスタムアイコンの設定
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
  const defaultPosition = [35.3933, 139.3072]; // 伊勢原市の中心座標
  const defaultZoom = 16;

  const [hydrants, setHydrants] = useState([]);
  const [userLocation, setUserLocation] = useState(null);
  const [mapCenter, setMapCenter] = useState(defaultPosition);
  const [mapZoom, setMapZoom] = useState(defaultZoom);
  const [mode, setMode] = useState("inspection"); 
  const [showModeMenu, setShowModeMenu] = useState(false);

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
  }, []);

  /** 🔥 初回マウント時の処理 */
  useEffect(() => {
    fetchData();

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lon = position.coords.longitude;
          setUserLocation([lat, lon]);
          setMapCenter([lat, lon]); // 初回位置を現在地に設定
        },
        (error) => {
          console.error("位置情報の取得に失敗:", error);
        }
      );
    }
  }, [fetchData]);

  /** 🔥 現在地に戻る */
  const moveToCurrentLocation = () => {
    if (userLocation) {
      setMapCenter(userLocation);
      setMapZoom(16);
    } else {
      alert("現在地が取得できませんでした");
    }
  };

  /** 🔥 データを保存（仮の処理） */
  const saveData = () => {
    console.log("💾 データを保存しました！（実装は後で追加）");
    alert("データを保存しました！");
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
    </div>
  );
};

export default MapView;
