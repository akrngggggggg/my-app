import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// 🔥 Firestore（保存用）
const saveToFirestore = async (hydrants) => {
  try {
    const response = await fetch("/.netlify/functions/save_hydrants", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: hydrants }),
    });
    alert("✅ 保存完了！");
  } catch (error) {
    alert("❌ 保存に失敗しました");
    console.error("❌ Firestore 保存エラー:", error);
  }
};

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

// 👤 現在地マーカーを「人型」に変更！
const userIcon = L.icon({
  iconUrl: "https://maps.google.com/mapfiles/kml/shapes/man.png",
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

const MapView = () => {
  const defaultPosition = [35.3933, 139.3072]; // 初期位置（伊勢原市）
  const defaultZoom = 16;

  const [hydrants, setHydrants] = useState([]);
  const [userLocation, setUserLocation] = useState(null);
  const [mode, setMode] = useState("inspection"); // "inspection" | "move" | "edit"

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

  // ✅ マーカーをドラッグして移動する（移動モード）
  const updateMarkerPosition = (id, newLat, newLon) => {
    setHydrants((prev) =>
      prev.map((marker) => (marker.id === id ? { ...marker, lat: newLat, lon: newLon } : marker))
    );
  };

  return (
    <div style={{ position: "relative" }}>
      <MapContainer center={defaultPosition} zoom={defaultZoom} style={{ height: "100vh", width: "100%" }}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

        {/* 🔥 消火栓 & 防火水槽マーカー */}
        <AddMarkerOnClick mode={mode} setHydrants={setHydrants} />
        {hydrants.map((item) => {
          const markerIcon = item.type.includes("防火") ? tankIcon : hydrantIcon;

          return (
            <Marker
              key={item.id}
              position={[item.lat, item.lon]}
              icon={markerIcon}
              draggable={mode === "move"} // 移動モードならドラッグ可能
              eventHandlers={{
                dragend: (e) => {
                  if (mode === "move") {
                    updateMarkerPosition(item.id, e.target.getLatLng().lat, e.target.getLatLng().lng);
                  }
                },
                click: () => {
                  if (mode === "edit") {
                    setHydrants((prev) => prev.filter((marker) => marker.id !== item.id));
                  }
                },
              }}
            >
              <Popup>
                <b>住所:</b> {item.address} <br />
                <b>種類:</b> {item.type}
                {mode === "edit" && <button onClick={() => setHydrants((prev) => prev.filter((m) => m.id !== item.id))}>削除</button>}
              </Popup>
            </Marker>
          );
        })}

        {/* 👤 現在地マーカー（人型） */}
        {userLocation && <Marker position={userLocation} icon={userIcon}><Popup>現在地</Popup></Marker>}

        {/* 🔘 現在地に戻るボタン */}
        <CurrentLocationButton userLocation={userLocation} />
      </MapContainer>

      {/* 🛠 モード切替ボタン（右上） */}
      <button
        onClick={() => setMode((prev) => (prev === "inspection" ? "move" : prev === "move" ? "edit" : "inspection"))}
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
        {mode === "inspection" ? "🔄 移動モード" : mode === "move" ? "➕ 追加削除モード" : "✅ 点検モード"}
      </button>

      {/* 💾 保存ボタン（左下） */}
      <button
        onClick={() => saveToFirestore(hydrants)}
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

// ✅ クリックで新しいマーカーを追加（追加削除モード）
const AddMarkerOnClick = ({ mode, setHydrants }) => {
  useMapEvents({
    click(e) {
      if (mode === "edit") {
        const newId = `new-${Date.now()}`;
        setHydrants((prev) => [
          ...prev,
          { id: newId, lat: e.latlng.lat, lon: e.latlng.lng, type: "消火栓", address: "不明" },
        ]);
      }
    },
  });
  return null;
};

const CurrentLocationButton = ({ userLocation }) => {
  const map = useMap();
  return (
    <button
      onClick={() => userLocation && map.setView(userLocation, 16)}
      style={{
        position: "fixed",
        bottom: "20px",
        right: "20px",
        backgroundColor: "#007bff",
        color: "#fff",
        padding: "10px 15px",
        borderRadius: "5px",
        zIndex: 1000,
      }}
    >
      現在地へ戻る
    </button>
  );
};

export default MapView;
