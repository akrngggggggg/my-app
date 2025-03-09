import React, { useEffect, useState } from "react";
import { GoogleMap, LoadScript, AdvancedMarkerElement } from "@react-google-maps/api";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import { initializeApp } from "firebase/app";

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "your-messaging-id",
  appId: "your-app-id"
};

// Firebase 初期化
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const containerStyle = {
  width: "100%",
  height: "100vh",
};

const defaultCenter = { lat: 35.387, lng: 139.322 }; // デフォルト位置（伊勢原市）

const MapView = () => {
  const [map, setMap] = useState(null);
  const [markers, setMarkers] = useState([]);
  const [userLocation, setUserLocation] = useState(defaultCenter);

  useEffect(() => {
    // Firestore からデータを取得
    const fetchHydrants = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "fire_hydrants"));
        const hydrantsData = querySnapshot.docs.map(doc => doc.data());

        console.log("📥 Firestore データ取得:", hydrantsData);

        // 取得したデータをマーカー用にセット
        setMarkers(hydrantsData);
      } catch (error) {
        console.error("🔥 Firestore データ取得エラー:", error);
      }
    };

    fetchHydrants();
  }, []);

  useEffect(() => {
    // ユーザーの現在地を取得
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        position => {
          const newLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setUserLocation(newLocation);
          console.log("📍 現在地取得:", newLocation);
        },
        error => console.error("📍 現在地取得エラー:", error)
      );
    }
  }, []);

  // 現在地に戻る処理
  const moveToCurrentLocation = () => {
    if (map) {
      map.panTo(userLocation);
      map.setZoom(16);
    }
  };

  return (
    <LoadScript googleMapsApiKey={process.env.REACT_APP_GOOGLE_MAPS_API_KEY}>
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={userLocation} // 初期位置を現在地に
        zoom={16}
        onLoad={mapInstance => setMap(mapInstance)}
      >
        {/* 消火栓（赤丸）と防火水槽（青丸）のマーカー */}
        {markers.map((marker, index) => (
          <AdvancedMarkerElement
            key={index}
            position={{ lat: marker.lat, lng: marker.lon }}
            title={marker.address}
            content={
              marker.type === "公設消火栓" ? (
                <div style={{ width: "12px", height: "12px", backgroundColor: "red", borderRadius: "50%" }}></div>
              ) : (
                <div style={{ width: "12px", height: "12px", backgroundColor: "blue", borderRadius: "50%" }}></div>
              )
            }
          />
        ))}

        {/* 現在地マーカー */}
        <AdvancedMarkerElement
          position={userLocation}
          title="現在地"
          content={<div style={{ width: "14px", height: "14px", backgroundColor: "green", borderRadius: "50%" }}></div>}
        />
      </GoogleMap>

      {/* 現在地に戻るボタン */}
      <button
        onClick={moveToCurrentLocation}
        style={{
          position: "absolute",
          bottom: "20px",
          right: "20px",
          zIndex: "1000",
          padding: "10px",
          backgroundColor: "#007bff",
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
