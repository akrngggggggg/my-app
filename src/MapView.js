import React, { useEffect, useState } from "react";

const MapView = () => {
  const [map, setMap] = useState(null);
  const [userLocation, setUserLocation] = useState(null);

  useEffect(() => {
    // Google Maps をロード
    const loadGoogleMaps = () => {
      if (!window.google) {
        console.error("Google Maps API が読み込まれていません！");
        return;
      }

      const mapInstance = new window.google.maps.Map(document.getElementById("map"), {
        center: { lat: 35.3846487, lng: 139.322011 }, // 伊勢原市の中心
        zoom: 15,
      });

      setMap(mapInstance);
    };

    if (window.google) {
      loadGoogleMaps();
    } else {
      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.REACT_APP_GOOGLE_MAPS_API_KEY}`;
      script.async = true;
      script.defer = true;
      script.onload = loadGoogleMaps;
      document.head.appendChild(script);
    }
  }, []);

  useEffect(() => {
    if (map) {
      // 現在地を取得
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            const userLatLng = { lat: latitude, lng: longitude };
            setUserLocation(userLatLng);

            // マーカーを追加
            new window.google.maps.Marker({
              position: userLatLng,
              map: map,
              title: "現在地",
              icon: {
                url: "https://maps.google.com/mapfiles/kml/paddle/blu-circle.png", // 青い丸アイコン
                scaledSize: new window.google.maps.Size(40, 40),
              },
            });

            // マップを現在地に移動
            map.setCenter(userLatLng);
          },
          () => {
            console.error("現在地を取得できませんでした。");
          }
        );
      }
    }
  }, [map]);

  // 現在地に戻るボタンの処理
  const handleGoToCurrentLocation = () => {
    if (userLocation && map) {
      map.setCenter(userLocation);
      map.setZoom(16);
    }
  };

  return (
    <div>
      {/* マップコンテナ */}
      <div id="map" style={{ width: "100%", height: "100vh" }}></div>

      {/* 現在地に戻るボタン */}
      <button
        onClick={handleGoToCurrentLocation}
        style={{
          position: "absolute",
          bottom: "10px",
          right: "10px",
          padding: "10px 15px",
          background: "#007bff",
          color: "#fff",
          border: "none",
          borderRadius: "5px",
          cursor: "pointer",
          zIndex: 1000,
        }}
      >
        現在地に戻る
      </button>
    </div>
  );
};

export default MapView;
