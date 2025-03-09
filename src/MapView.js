import React, { useState, useEffect } from "react";
import { GoogleMap, Marker, useLoadScript } from "@react-google-maps/api";

const mapContainerStyle = {
  width: "100vw",
  height: "100vh",
};

const options = {
  disableDefaultUI: true,
  zoomControl: true,
};

const MapView = () => {
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY,
  });

  const [markers, setMarkers] = useState([]);
  const [center, setCenter] = useState({ lat: 35.3980915, lng: 139.3078134 });

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCenter({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      () => console.error("位置情報を取得できませんでした")
    );

    fetch("/fire_hydrants.json")
      .then((response) => response.json())
      .then((data) => {
        if (data && Array.isArray(data.data)) {
          setMarkers(data.data);
        } else {
          console.error("不正なデータ形式:", data);
        }
      })
      .catch((error) => console.error("データ取得エラー:", error));
  }, []);

  // 🔴 消火栓（赤丸アイコン）
  const hydrantIcon = {
    path: window.google.maps.SymbolPath.CIRCLE,
    fillColor: "red",
    fillOpacity: 1,
    scale: 8,
    strokeColor: "white",
    strokeWeight: 2,
  };

  // 🔵 防火水槽（青丸アイコン）
  const waterTankIcon = {
    path: window.google.maps.SymbolPath.CIRCLE,
    fillColor: "blue",
    fillOpacity: 1,
    scale: 8,
    strokeColor: "white",
    strokeWeight: 2,
  };

  if (loadError) return <div>マップを読み込めませんでした</div>;
  if (!isLoaded) return <div>読み込み中...</div>;

  return (
    <GoogleMap mapContainerStyle={mapContainerStyle} zoom={16} center={center} options={options}>
      {/* 🔹 マーカーを Firestore のデータに基づいて追加 */}
      {markers.map((marker) => (
        <Marker
          key={marker.id}
          position={{ lat: marker.lat, lng: marker.lon }}
          icon={marker.type === "公設消火栓" ? hydrantIcon : waterTankIcon}
          title={marker.address}
        />
      ))}

      {/* 📍 現在地マーカー */}
      <Marker position={center} icon={{ path: window.google.maps.SymbolPath.CIRCLE, scale: 10, fillColor: "green", fillOpacity: 1, strokeColor: "white", strokeWeight: 2 }} />

      {/* 🔘 現在地に戻るボタン */}
      <button
        style={{
          position: "absolute",
          bottom: "20px",
          right: "20px",
          padding: "10px",
          background: "white",
          border: "1px solid black",
          borderRadius: "5px",
          cursor: "pointer",
        }}
        onClick={() => setCenter(center)}
      >
        現在地に戻る
      </button>
    </GoogleMap>
  );
};

export default MapView;
