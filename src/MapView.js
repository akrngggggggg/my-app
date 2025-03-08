import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useState, useEffect } from "react";

// 🔴 消火栓のアイコン（赤丸）
const redIcon = new L.Icon({
  iconUrl: "red_marker.png",
  iconSize: [25, 25],
  iconAnchor: [12, 12],
  popupAnchor: [0, -12],
});

// 🔵 防火水槽のアイコン（青丸）
const blueIcon = new L.Icon({
  iconUrl: "blue_marker.png",
  iconSize: [25, 25],
  iconAnchor: [12, 12],
  popupAnchor: [0, -12],
});

// 🟢 現在地のアイコン（人型マーカー）
const userIcon = new L.Icon({
  iconUrl: "user_marker.png",
  iconSize: [30, 30],
  iconAnchor: [15, 30],
  popupAnchor: [0, -30],
});

const MapView = () => {
  const [hydrants, setHydrants] = useState([]); // 消火栓・防火水槽のデータ
  const [userLocation, setUserLocation] = useState(null); // 現在地
  const [mode, setMode] = useState("点検"); // 現在のモード
  const [mapCenter, setMapCenter] = useState([35.3846487, 139.322011]); // 地図の中心
  const [mapZoom, setMapZoom] = useState(15); // 地図のズームレベル

  // Firestore からデータ取得
  useEffect(() => {
    fetch("/.netlify/functions/get_hydrants")
      .then((res) => res.json())
      .then((data) => {
        console.log("📥 Firestore から取得したデータ:", data);
        if (data && data.data) {
          setHydrants(data.data);
        }
      })
      .catch((error) => console.error("🔥 Firestore 読み込みエラー:", error));
  }, []);

  // 現在地取得
  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation([pos.coords.latitude, pos.coords.longitude]);
      },
      (err) => console.warn(`⚠️ 位置情報取得エラー: ${err.message}`)
    );
  }, []);

  // モード変更関数
  const toggleMode = () => {
    const modes = ["点検", "追加削除", "移動"];
    const nextMode = modes[(modes.indexOf(mode) + 1) % modes.length];
    setMode(nextMode);
  };

  // 現在地に移動
  const moveToCurrentLocation = () => {
    if (userLocation) {
      setMapCenter(userLocation);
      setMapZoom(16);
    } else {
      alert("📍 現在地を取得できませんでした");
    }
  };

  // マーカーをクリックしたときの処理
  const handleMarkerClick = (hydrant) => {
    alert(`📍 ${hydrant.address}`);
  };

  return (
    <div>
      <MapContainer center={mapCenter} zoom={mapZoom} style={{ height: "100vh", width: "100vw" }}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />

        {/* マーカー描画 */}
        {hydrants.map((hydrant) => (
          <Marker
            key={hydrant.id}
            position={[hydrant.lat, hydrant.lon]}
            icon={hydrant.type === "公設防火水そう" ? blueIcon : redIcon}
            eventHandlers={{ click: () => handleMarkerClick(hydrant) }}
          >
            <Popup>{hydrant.address}</Popup>
          </Marker>
        ))}

        {/* 現在地マーカー */}
        {userLocation && <Marker position={userLocation} icon={userIcon} />}
      </MapContainer>

      {/* 🎛 モード切替ボタン（右上） */}
      <button
        onClick={toggleMode}
        style={{
          position: "fixed",
          top: "10px",
          right: "10px",
          zIndex: 1000,
          backgroundColor: "#fff",
          padding: "10px",
          borderRadius: "5px",
          border: "1px solid #ccc",
        }}
      >
        {mode}モード
      </button>

      {/* 📍 現在地ボタン（右下） */}
      <button
        onClick={moveToCurrentLocation}
        style={{
          position: "fixed",
          bottom: "10px",
          right: "10px",
          zIndex: 1000,
          backgroundColor: "#fff",
          padding: "10px",
          borderRadius: "5px",
          border: "1px solid #ccc",
        }}
      >
        現在地
      </button>

      {/* 💾 保存ボタン（左下） */}
      <button
        onClick={() => {
          fetch("/.netlify/functions/save_hydrants", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ data: hydrants }),
          })
            .then((res) => res.json())
            .then((result) => {
              if (result.success) {
                alert("✅ 保存完了！");
              } else {
                alert("❌ 保存に失敗しました！");
              }
            })
            .catch((error) => alert("🔥 保存エラー: " + error.message));
        }}
        style={{
          position: "fixed",
          bottom: "10px",
          left: "10px",
          zIndex: 1000,
          backgroundColor: "#fff",
          padding: "10px",
          borderRadius: "5px",
          border: "1px solid #ccc",
        }}
      >
        保存
      </button>
    </div>
  );
};

export default MapView;
