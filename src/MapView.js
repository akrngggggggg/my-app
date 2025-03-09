import React, { useState, useEffect, useCallback } from "react";
import { GoogleMap, useLoadScript, AdvancedMarkerElement } from "@react-google-maps/api";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import { initializeApp } from "firebase/app";

// 🔥 Firestore の設定（環境変数から読み込む）
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

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
    // 📍 位置情報の取得
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCenter({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      () => console.error("位置情報を取得できませんでした")
    );

    // 🔥 Firestore から `/fire_hydrants/hydrants_data` を取得
    const fetchHydrants = async () => {
      try {
        const docRef = doc(db, "fire_hydrants", "hydrants_data");
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data && Array.isArray(data.data)) {
            setMarkers(data.data);
          } else {
            console.error("Firestore のデータ形式が不正です:", data);
          }
        } else {
          console.error("Firestore に `hydrants_data` が見つかりません！");
        }
      } catch (error) {
        console.error("Firestore からのデータ取得エラー:", error);
      }
    };

    fetchHydrants();
  }, []);

  // 🔴 消火栓（赤丸アイコン）
  const getHydrantIcon = useCallback(() => {
    if (!isLoaded || !window.google) return null;
    return {
      path: window.google.maps.SymbolPath.CIRCLE,
      fillColor: "red",
      fillOpacity: 1,
      scale: 8,
      strokeColor: "white",
      strokeWeight: 2,
    };
  }, [isLoaded]);

  // 🔵 防火水槽（青丸アイコン）
  const getWaterTankIcon = useCallback(() => {
    if (!isLoaded || !window.google) return null;
    return {
      path: window.google.maps.SymbolPath.CIRCLE,
      fillColor: "blue",
      fillOpacity: 1,
      scale: 8,
      strokeColor: "white",
      strokeWeight: 2,
    };
  }, [isLoaded]);

  // 📍 現在地マーカー
  const getUserLocationIcon = useCallback(() => {
    if (!isLoaded || !window.google) return null;
    return {
      path: window.google.maps.SymbolPath.CIRCLE,
      scale: 10,
      fillColor: "green",
      fillOpacity: 1,
      strokeColor: "white",
      strokeWeight: 2,
    };
  }, [isLoaded]);

  if (loadError) return <div>マップを読み込めませんでした</div>;
  if (!isLoaded) return <div>読み込み中...</div>;

  return (
    <GoogleMap mapContainerStyle={mapContainerStyle} zoom={16} center={center} options={options}>
      {/* 🔹 Firestore のデータを元にマーカーを追加 */}
      {markers.map((marker) => (
        <AdvancedMarkerElement
          key={marker.id}
          position={{ lat: marker.lat, lng: marker.lon }}
          icon={marker.type === "公設消火栓" ? getHydrantIcon() : getWaterTankIcon()}
          title={marker.address}
        />
      ))}

      {/* 📍 現在地マーカー */}
      <AdvancedMarkerElement position={center} icon={getUserLocationIcon()} />

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
