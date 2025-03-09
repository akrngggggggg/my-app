import React, { useEffect, useState } from "react";
import { GoogleMap, LoadScript, Marker } from "@react-google-maps/api";

const MapView = () => {
  const [center, setCenter] = useState({ lat: 35.6895, lng: 139.6917 }); // デフォルトは東京
  const [userLocation, setUserLocation] = useState(null);
  const [map, setMap] = useState(null);

  useEffect(() => {
    // 現在地を取得して初期位置に設定
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const newLocation = { lat: latitude, lng: longitude };
          setCenter(newLocation);
          setUserLocation(newLocation);
        },
        () => console.error("位置情報が取得できませんでした")
      );
    }
  }, []);

  // 現在地に戻る処理（ズームレベル16）
  const moveToCurrentLocation = () => {
    if (map && userLocation) {
      map.setCenter(userLocation);
      map.setZoom(16);
    }
  };

  return (
    <LoadScript googleMapsApiKey={process.env.REACT_APP_GOOGLE_MAPS_API_KEY}>
      <GoogleMap
        mapContainerStyle={{ width: "100%", height: "100vh" }}
        center={center}
        zoom={15}
        onLoad={(mapInstance) => setMap(mapInstance)}
      >
        {/* 現在地マーカー */}
        {userLocation && <Marker position={userLocation} title="現在地" />}
      </GoogleMap>

      {/* 現在地に戻るボタン */}
      <button
        onClick={moveToCurrentLocation}
        style={{
          position: "absolute",
          bottom: "10px",
          right: "10px",
          zIndex: 1000,
          padding: "10px",
          backgroundColor: "blue",
          color: "white",
          border: "none",
          borderRadius: "5px",
          cursor: "pointer",
        }}
      >
        現在地に戻る
      </button>
    </LoadScript>
  );
};

export default MapView;
