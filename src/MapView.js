import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useState, useEffect } from "react";

// 既存のカスタムアイコン
const redIcon = new L.Icon({
  iconUrl: "red_marker.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const blueIcon = new L.Icon({
  iconUrl: "blue_marker.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// 現在地マーカー用の人型アイコン
const userIcon = new L.Icon({
  iconUrl: "user_marker.png",
  iconSize: [30, 30],
  iconAnchor: [15, 30],
  popupAnchor: [0, -30],
});

const MapView = () => {
  const [hydrants, setHydrants] = useState([]);
  const [userLocation, setUserLocation] = useState(null);
  const [mode, setMode] = useState("点検"); // モード: 点検 → 追加削除 → 移動
  const [mapCenter, setMapCenter] = useState([35.3846487, 139.322011]);
  const [mapZoom, setMapZoom] = useState(15);

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
          >
            <Popup>{hydrant.address}</Popup>
          </Marker>
        ))}

        {/* 現在地マーカー */}
        {userLocation && <Marker position={userLocation} icon={userIcon} />}
      </MapContainer>

      {/* UI ボタン */}
      <button
        onClick={toggleMode}
        style={{ position: "fixed", top: "10px", right: "10px", zIndex: 1000 }}
      >
        {mode}モード
      </button>

      <button
        onClick={moveToCurrentLocation}
        style={{ position: "fixed", bottom: "10px", right: "10px", zIndex: 1000 }}
      >
        現在地
      </button>

      <button
        onClick={() => alert("保存処理を実装する")}
        style={{ position: "fixed", bottom: "10px", left: "10px", zIndex: 1000 }}
      >
        保存
      </button>
    </div>
  );
};

export default MapView;
