import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// 🔹 アイコン設定
const redIcon = new L.Icon({
  iconUrl: "path/to/red-icon.png",
  iconSize: [25, 25],
});
const blueIcon = new L.Icon({
  iconUrl: "path/to/blue-icon.png",
  iconSize: [25, 25],
});
const userIcon = new L.Icon({
  iconUrl: "path/to/user-icon.png",
  iconSize: [30, 30],
});

const MapView = () => {
  const [mode, setMode] = useState("inspection"); // 🔹 初期モードは「点検」
  const [hydrants, setHydrants] = useState([]);
  const [userLocation, setUserLocation] = useState(null);

  // 🔹 Firestore からデータ取得
  useEffect(() => {
    fetch("/.netlify/functions/get_hydrants")
      .then((res) => res.json())
      .then((data) => setHydrants(data.data || []))
      .catch((err) => console.error("データ取得エラー", err));
  }, []);

  // 🔹 現在地の取得
  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserLocation([pos.coords.latitude, pos.coords.longitude]),
      (err) => console.error("現在地取得エラー", err)
    );
  }, []);

  // 🔹 地図イベントを処理するカスタムコンポーネント
  function MapEvents() {
    useMapEvents({
      click(e) {
        if (mode === "add_delete") {
          const newHydrant = {
            id: Date.now().toString(),
            lat: e.latlng.lat,
            lon: e.latlng.lng,
            type: "公設消火栓",
          };
          setHydrants([...hydrants, newHydrant]);
        }
      },
    });
    return null;
  }

  // 🔹 現在地に移動
  function MoveToCurrentLocation() {
    const map = useMap();
    return (
      <button
        style={buttonStyle("right", "bottom")}
        onClick={() => {
          if (userLocation) {
            map.flyTo(userLocation, 16);
          }
        }}
      >
        現在地
      </button>
    );
  }

  return (
    <div>
      <MapContainer center={[35.3846, 139.3220]} zoom={15} style={{ height: "100vh" }}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <MapEvents />

        {hydrants.map((hydrant) => (
          <Marker
            key={hydrant.id}
            position={[hydrant.lat, hydrant.lon]}
            icon={hydrant.type === "公設防火水そう" ? blueIcon : redIcon}
          >
            <Popup>{hydrant.address}</Popup>
          </Marker>
        ))}

        {userLocation && <Marker position={userLocation} icon={userIcon} />}
      </MapContainer>

      {/* 🔹 モード切替ボタン */}
      <button style={buttonStyle("right", "top")} onClick={() => setMode(nextMode(mode))}>
        {mode === "inspection" ? "点検" : mode === "add_delete" ? "追加削除" : "移動"}
      </button>

      {/* 🔹 現在地に戻るボタン */}
      <MoveToCurrentLocation />

      {/* 🔹 保存ボタン */}
      <button
        style={buttonStyle("left", "bottom")}
        onClick={() => fetch("/.netlify/functions/save_hydrants", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data: hydrants }),
        })}
      >
        保存
      </button>
    </div>
  );
};

// 🔹 次のモードに切り替える
function nextMode(currentMode) {
  return currentMode === "inspection" ? "add_delete" : currentMode === "add_delete" ? "move" : "inspection";
}

// 🔹 ボタンの位置スタイルを統一
function buttonStyle(x, y) {
  return {
    position: "fixed",
    [x]: "10px",
    [y]: "10px",
    zIndex: 1000,
    padding: "10px 15px",
    fontSize: "16px",
    background: "white",
    border: "1px solid #ccc",
    borderRadius: "5px",
  };
}

export default MapView;
