import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// 🔥 Firestore への保存関数
const saveToFirestore = async (hydrants) => {
  try {
    await fetch("/.netlify/functions/save_hydrants", {
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

// 🔥 消火栓（赤）・防火水槽（青）のマーカー
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

// 👤 現在地マーカー（人型）
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

  // ✅ Firestore からのデータ取得
  useEffect(() => {
    fetch("/.netlify/functions/get_hydrants")
      .then((response) => response.json())
      .then((data) => {
        if (data && Array.isArray(data.data)) {
          setHydrants(data.data);
        }
      })
      .catch((error) => console.error("❌ データ取得失敗:", error));
  }, []);

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

  // ✅ マーカークリック処理（エラー解消）
  const handleMarkerClick = (id) => {
    if (mode === "inspection") {
      setHydrants((prev) =>
        prev.map((marker) =>
          marker.id === id ? { ...marker, checked: !marker.checked } : marker
        )
      );
    } else if (mode === "edit") {
      const confirmDelete = window.confirm("⚠️ このマーカーを削除しますか？");
      if (confirmDelete) {
        setHydrants((prev) => prev.filter((marker) => marker.id !== id));
      }
    }
  };

  return (
    <div style={{ position: "relative" }}>
      <MapContainer center={defaultPosition} zoom={defaultZoom} style={{ height: "100vh", width: "100%" }}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

        {/* 🔥 初期マーカー表示 */}
        <AddMarkerOnClick mode={mode} setHydrants={setHydrants} />
        {hydrants.map((item) => {
          const markerIcon = item.type.includes("防火") ? tankIcon : hydrantIcon;
          return (
            <Marker
              key={item.id}
              position={[item.lat, item.lon]}
              icon={markerIcon}
              draggable={mode === "move"}
              eventHandlers={{
                dragend: (e) => {
                  if (mode === "move") {
                    const confirmMove = window.confirm("📌 マーカーの位置を変更しますか？");
                    if (confirmMove) {
                      setHydrants((prev) =>
                        prev.map((marker) =>
                          marker.id === item.id
                            ? { ...marker, lat: e.target.getLatLng().lat, lon: e.target.getLatLng().lng }
                            : marker
                        )
                      );
                    }
                  }
                },
                click: () => handleMarkerClick(item.id),
              }}
            >
              <Popup>
                <b>住所:</b> {item.address} <br />
                <b>種類:</b> {item.type} <br />
                <b>点検:</b> {item.checked ? "✅ 済み" : "❌ 未点検"}
              </Popup>
            </Marker>
          );
        })}

        {/* 👤 現在地マーカー */}
        {userLocation && <Marker position={userLocation} icon={userIcon}><Popup>現在地</Popup></Marker>}

        {/* 🔘 現在地に戻るボタン（修正済み）*/}
        <CurrentLocationButton userLocation={userLocation} />
      </MapContainer>
    </div>
  );
};

// ✅ 現在地に戻るボタン（修正済み）
const CurrentLocationButton = ({ userLocation }) => {
  const map = useMap();

  const handleClick = () => {
    if (userLocation) {
      map.setView(userLocation, 16);
    } else {
      alert("❌ 現在地情報が取得できていません");
    }
  };

  return (
    <button
      onClick={handleClick}
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

// ✅ クリックで新しいマーカーを追加（追加削除モード）
const AddMarkerOnClick = ({ mode, setHydrants }) => {
  useMapEvents({
    click(e) {
      if (mode === "edit") {
        const newId = `new-${Date.now()}`;
        setHydrants((prev) => [...prev, { id: newId, lat: e.latlng.lat, lon: e.latlng.lng, type: "消火栓", address: "不明", checked: false }]);
      }
    },
  });
  return null;
};

export default MapView;
