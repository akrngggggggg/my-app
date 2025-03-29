import React, { useState, useEffect, useRef, useMemo } from "react";
import { GoogleMap, MarkerF, useJsApiLoader } from "@react-google-maps/api";
import { db } from "./firebase"; // 🔥 Firebase のインスタンスを読み込み
import { fetchHydrants, updateVisibleHydrants } from "./data/HydrantData";

const mapContainerStyle = {
  width: "100vw",
  height: "100vh",
};

const MapView = () => {
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
  });

  const [userLocation, setUserLocation] = useState(null);
  const [hydrants, setHydrants] = useState([]);
  const [visibleHydrants, setVisibleHydrants] = useState([]);
  const [loading, setLoading] = useState(true);
  const mapRef = useRef(null);

  useEffect(() => {
    if (!isLoaded) {
      console.warn("🚨 Google Maps API がまだロードされていません。");
      return;
    }

    if (!db) {
      console.error("🚨 Firebase が初期化されていません。");
      return;
    }

    console.log("✅ Google Maps API と Firebase が正常に初期化されました。");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation({ lat: latitude, lng: longitude });
        setLoading(false);
      },
      (error) => {
        console.error("🚨 現在地の取得に失敗しました:", error);
        setUserLocation({ lat: 35.3363, lng: 139.3032 });
        setLoading(false);
      },
      { enableHighAccuracy: true }
    );

    const fetchData = async () => {
      try {
        console.log("🔥 Firebase データのロード中...");
        await fetchHydrants(setHydrants);
        console.log("✅ データのロードが完了しました。");
      } catch (error) {
        console.error("🚨 データのロードに失敗しました:", error);
      }
    };

    fetchData(); // 🔥 非同期で Firebase データを取得する

  }, [isLoaded]);

  useEffect(() => {
    if (userLocation && hydrants.length > 0) {
      console.log("🔥 消火栓の可視範囲を更新中...");
      updateVisibleHydrants(userLocation, hydrants, setVisibleHydrants);
      console.log("✅ 消火栓の可視範囲が更新されました。");
    }
  }, [userLocation, hydrants]);

  if (loading || !isLoaded || !userLocation || !db) {
    return <div>Loading...</div>;
  }

  return (
    <GoogleMap
      mapContainerStyle={mapContainerStyle}
      center={userLocation}
      zoom={15}
      onLoad={(map) => (mapRef.current = map)}
    >
      {visibleHydrants && visibleHydrants.length > 0 && visibleHydrants.map((hydrant) => (
        <MarkerF
          key={hydrant.firestoreId}
          position={{ lat: hydrant.lat, lng: hydrant.lon }}
        />
      ))}
    </GoogleMap>
  );
};

export default MapView;
