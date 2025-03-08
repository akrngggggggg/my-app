import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// 🔥 シンプルな赤丸（消火栓）・青丸（防火水槽）のマーカー
const hydrantIcon = L.divIcon({
  className: "custom-marker",
  html: '<div style="width:12px; height:12px; background-color:red; border-radius:50%; border:2px solid white;"></div>',
  iconSize: [12, 12],
});

const tankIcon = L.divIcon({
  className: "custom-marker",
  html: '<div style="width:12px; height:12px; background-color:blue; border-radius:50%; border:2px solid white;"></div>',
  iconSize: [12, 12],
});

const userIcon = L.divIcon({
  className: "custom-marker",
  html: '<div style="width:14px; height:14px; background-color:lightblue; border-radius:50%; border:2px solid white;"></div>',
  iconSize: [14, 14],
});

const MapView = () => {
  const defaultPosition = [35.3933, 139.3072]; // 伊勢原市
  const defaultZoom = 16;

  const [hydrants, setHydrants] = useState([]);
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

  // ✅ データ取得
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

      {/* 🔘 現在地に戻るボタン（右下） */}
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

      {/* 💾 保存ボタン（左下） */}
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
    </div>
  );
};

export default MapView;
