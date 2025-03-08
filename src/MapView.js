import "leaflet/dist/leaflet.css";
import "leaflet-gesture-handling";
import "leaflet-gesture-handling/dist/leaflet-gesture-handling.css";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";

const MapView = () => {
  const defaultPosition = [35.3933, 139.3072]; // 伊勢原市の中心座標
  const defaultZoom = 16;
  const mapRef = useRef(null); 

  const [hydrants, setHydrants] = useState([]);
  const [userLocation, setUserLocation] = useState(null);
  const [mapCenter, setMapCenter] = useState(defaultPosition);
  const [mapZoom, setMapZoom] = useState(defaultZoom);
  const [mode, setMode] = useState("inspection"); // 🔥 点検/編集モード
  const [showModeMenu, setShowModeMenu] = useState(false); // 🔥 モード切り替えメニューの表示

  /** 🔥 データ取得処理（useEffectの前に定義） */
  const fetchData = useCallback(() => {
    console.log("📡 [DEBUG] fetchData() 実行開始");
    fetch("/.netlify/functions/get_hydrants")
      .then((response) => response.json())
      .then((data) => {
        console.log("📥 [DEBUG] 取得データ:", data);
        if (data.length > 0) {
          setHydrants(data);
          localStorage.setItem("fire_hydrants", JSON.stringify(data));
        } else {
          console.warn("⚠ [WARN] 取得データが空 or 読み込めていない！");
        }
      })
      .catch((error) => console.error("❌ [ERROR] API呼び出しエラー:", error));
  }, [setHydrants]);

  /** 🔥 初回マウント時の処理 */
  useEffect(() => {
    console.log("🔄 [DEBUG] useEffect() 実行: fetchData() を呼び出します！");
    
    // ローカルストレージにデータがあれば取得
    const savedData = localStorage.getItem("fire_hydrants");
    if (savedData) {
      setHydrants(JSON.parse(savedData));
    } else {
      fetchData();
    }

    // ユーザーの現在地を取得
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
  }, [fetchData]);

  /** 🔥 現在地に戻る */
  const moveToCurrentLocation = () => {
    if (userLocation) {
      setMapCenter(userLocation);
      setMapZoom(16);
    } else {
      alert("現在地が取得できませんでした");
    }
  };

  /** 🔥 モード切り替え */
  const toggleModeMenu = () => {
    setShowModeMenu(!showModeMenu);
  };

  const changeMode = (newMode) => {
    setMode(newMode);
    setShowModeMenu(false);
  };

  return (
    <div style={{ position: "relative" }}>
      <MapContainer 
       center={mapCenter} zoom={mapZoom} style={{ height: "100vh", width: "100%" }} 
       whenCreated={(map) => { mapRef.current = map; }}
>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

        {/* 🔵 ユーザーの現在地をマーカーで表示 */}
        {userLocation && (
          <Marker position={userLocation} icon={new L.Icon({
            iconUrl: "https://maps.google.com/mapfiles/ms/icons/blue-dot.png",
            iconSize: [32, 32]
          })}>
            <Popup>現在地</Popup>
          </Marker>
        )}

        {/* 🔥 消火栓データの表示 */}
        {hydrants.map((hydrant) => (
          <Marker key={hydrant.id} position={[hydrant.lat, hydrant.lon]} icon={new L.Icon({
            iconUrl: "https://maps.google.com/mapfiles/ms/icons/red-dot.png",
            iconSize: [32, 32]
          })}>
            <Popup>
              <b>種類:</b> {hydrant.type} <br />
              <b>ID:</b> {hydrant.id}
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* 🔘 現在地に戻るボタン */}
      <button
        onClick={moveToCurrentLocation}
        style={{
          position: "absolute",
          bottom: "20px",
          right: "20px",
          backgroundColor: "#007bff",
          color: "#fff",
          padding: "10px 15px",
          border: "none",
          borderRadius: "5px",
          cursor: "pointer",
        }}
      >
        現在地へ戻る
      </button>

      {/* 🔘 モード切り替えボタン */}
      <button
        onClick={toggleModeMenu}
        style={{
          position: "absolute",
          bottom: "70px",
          right: "20px",
          backgroundColor: "#28a745",
          color: "#fff",
          padding: "10px 15px",
          border: "none",
          borderRadius: "5px",
          cursor: "pointer",
        }}
      >
        モード切替
      </button>

      {/* 🔽 モード選択メニュー */}
      {showModeMenu && (
        <div
          style={{
            position: "absolute",
            bottom: "120px",
            right: "20px",
            backgroundColor: "#fff",
            padding: "10px",
            borderRadius: "5px",
            boxShadow: "0px 2px 10px rgba(0,0,0,0.2)",
          }}
        >
          <p>現在のモード: <b>{mode === "inspection" ? "点検" : "編集"}</b></p>
          <button onClick={() => changeMode("inspection")}>点検モード</button>
          <button onClick={() => changeMode("edit")}>編集モード</button>
        </div>
      )}
    </div>
  );
};

export default MapView;
