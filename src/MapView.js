import "leaflet/dist/leaflet.css"; // これでleafletのスタイルをインポート
import "leaflet-gesture-handling";
import "leaflet-gesture-handling/dist/leaflet-gesture-handling.css";
import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet"; // leafletのインポート



const MapClickHandler = ({ mode, setNewMarkerPosition, newMarkerPosition, deleteTarget }) => {
  useMapEvents({
    click(e) {
      if (
        mode === "add" && 
        !newMarkerPosition && 
        !deleteTarget && 
        e.originalEvent.target.tagName === "DIV"
      ) {
        setNewMarkerPosition(e.latlng);
      }
    },
  });
  return null;
};

const MapView = () => {
  const defaultPosition = [35.3933, 139.3072]; // 初期位置（伊勢原市）
  const defaultZoom = 16;  // 所定のズームレベル
  const mapRef = useRef(null); // ← ここで map の参照を作る

  const [hydrants, setHydrants] = useState([]);
  const [mode, setMode] = useState("inspection");
  const [showModeMenu, setShowModeMenu] = useState(false);

  const handleModeChange = (newMode) => {
    setMode(newMode);
    setTimeout(() => setShowModeMenu(false), 0);
  };

  const [newMarkerPosition, setNewMarkerPosition] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [moveTarget, setMoveTarget] = useState(null);
  const [movePosition, setMovePosition] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [mapCenter, setMapCenter] = useState(defaultPosition);  // 地図中心を管理するstate
  const [mapZoom, setMapZoom] = useState(defaultZoom);  // ズームレベルを管理するstate
  const [returnFlag, setReturnFlag] = useState(false);  // 現在地に戻るフラグ

  useEffect(() => {
    console.log("🔄 [DEBUG] useEffect() 実行: fetchData() を呼び出します！");

    // 1️⃣ データを localStorage から取得
    const savedData = localStorage.getItem("fire_hydrants");
    if (savedData) {
      const parsedData = JSON.parse(savedData);
      if (parsedData.length > 0) {
        console.log("📥 [DEBUG] ローカルストレージからデータをセット");
        setHydrants(parsedData);
        setHydrantsLoaded(true);
      } else {
        fetchData();
      }
    } else {
      fetchData();
    }

    // 2️⃣ Leaflet マップの初期化（mapRef が未設定なら）
    if (!mapRef.current) {
      mapRef.current = L.map("map", {
        center: [35.3846487, 139.3220111], // 伊勢原市の座標
        zoom: 15,
        gestureHandling: true, // ← 追加！
      });

      // 📌 タイルレイヤーを正しく追加！
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(mapRef.current);
    }
  }, [fetchData, setHydrants]); // 依存関係を適切に設定

  return <div id="map" style={{ width: "100%", height: "100vh" }} />;
};

    // 🔥 現在地の取得
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

  const fetchData = () => {
    console.log("📡 [DEBUG] fetchData() 実行開始");
    fetch("/.netlify/functions/get_hydrants")
      .then((response) => {
        console.log("📡 [DEBUG] APIレスポンス:", response);
        return response.json();
      })
      .then((data) => {
        console.log("📥 [DEBUG] 取得データ:", data);
        if (data.length > 0) {
          setHydrants(data);
        } else {
          console.warn("⚠ [WARN] 取得データが空 or 読み込めていない！");
        }
      })
      .catch((error) => console.error("❌ [ERROR] API呼び出しエラー:", error));
  };
  
  const saveHydrants = () => {
  fetch("/.netlify/functions/save_hydrants", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(hydrants),
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.message) {
        setSaveSuccess(true);
        setSaveError(false);
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        throw new Error("保存失敗");
      }
    })
    .catch((error) => {
      console.error("保存リクエストエラー:", error);
      setSaveError(true);
      setTimeout(() => setSaveError(false), 3000);
    });
};

  // 現在地に戻るボタンを押したときの処理
  const goToCurrentLocation = () => {
    if (userLocation) {
      setMapCenter(userLocation);  // 現在地を地図の中心に設定
      setMapZoom(defaultZoom);  // ズームレベルを所定の値に戻す
      setReturnFlag(true);  // 現在地に戻るフラグをセット
    }
  };

  // 地図の中心とズームを動的に更新するための処理
  const MapUpdater = () => {
    const map = useMap();
    useEffect(() => {
      if (returnFlag && map) {
        map.setView(mapCenter, mapZoom);  // `mapCenter`, `mapZoom`, `returnFlag` の依存は不要
        setReturnFlag(false);  // フラグをリセット
      }
    }, [map]);  // mapのみを依存関係に
    return null;
  };

  return (
    <div>
      {/* 🔥 現在地に戻るボタン（右下に配置） */}
      <div style={{ position: "absolute", bottom: "10px", right: "10px", zIndex: 1000 }}>
        <button 
          onClick={goToCurrentLocation}  
          style={{ backgroundColor: "blue", color: "white", 
            padding: "15px 35px",
            fontSize: "28px",
            borderRadius: "5px" }}
        >
          現在地に戻る
        </button>
      </div>

      {/* 🔥 モードボタン */}
<div style={{ position: "absolute", top: "10px", right: "10px", zIndex: 1000 }}>
  <button 
    onClick={() => setShowModeMenu(!showModeMenu)}
    style={{
      backgroundColor: mode === "inspection" ? "blue" : mode === "move" ? "green" : "red",
      color: "white",
      padding: "15px 35px",  // paddingを2倍にしてボタンを大きく
      fontSize: "28px",      // フォントサイズを2倍にして文字を大きく
      borderRadius: "5px"
    }}
  >
    モード：{mode === "inspection" ? "点検" : mode === "move" ? "移動" : "追加・削除"}
  </button>
  {showModeMenu && (
    <div style={{
        position: "absolute", top: "40px", right: "0px", backgroundColor: "white",
        padding: "10px", border: "1px solid black", borderRadius: "5px"
      }}>
      <button onClick={() => handleModeChange("inspection")} style={{ backgroundColor: "blue", color: "white", padding: "20px 40px", fontSize: "36px" }}>点検</button>
      <button onClick={() => handleModeChange("move")} style={{ backgroundColor: "green", color: "white", padding: "20px 40px", fontSize: "36px" }}>移動</button>
      <button onClick={() => handleModeChange("add")} style={{ backgroundColor: "red", color: "white", padding: "20px 40px", fontSize: "36px" }}>追加・削除</button>
    </div>
  )}
</div>


      {/* 🔥 保存ボタン（右下に配置） */}
      <div style={{ position: "absolute", bottom: "10px", left: "10px", zIndex: 1000 }}>
        <button onClick={saveHydrants} 
          style={{ backgroundColor: "orange", color: "white", 
            padding: "15px 30px",
            fontSize: "25px",
            borderRadius: "5px" }}>
          保存
        </button>
      </div>

      {/* 🔥 成功メッセージ */}
      {saveSuccess && (
        <div style={{ position: "absolute", bottom: "50px", left: "10px", backgroundColor: "green", color: "white", padding: "20px", borderRadius: "5px", zIndex: 1000 }}>
          保存が完了しました！
        </div>
      )}

      {/* 🔥 エラーメッセージ */}
      {saveError && (
        <div style={{ position: "absolute", bottom: "50px", left: "10px", backgroundColor: "red", color: "white", padding: "20px", borderRadius: "5px", zIndex: 1000 }}>
          保存に失敗しました。もう一度お試しください。
        </div>
      )}

      <MapContainer center={mapCenter} zoom={defaultZoom} style={{ height: "100vh", width: "100%" }}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <MapClickHandler mode={mode} setNewMarkerPosition={setNewMarkerPosition} newMarkerPosition={newMarkerPosition} deleteTarget={deleteTarget} />
        <MapUpdater /> {/* 動的に地図の中心とズームを更新 */}

        {hydrants.map((item) => (
          <Marker
            key={item.id}
            position={[item.lat, item.lon]}
            draggable={mode === "move"}
            icon={new L.divIcon({
              className: "custom-icon",
              html: `<div style="width: 30px; height: 30px; background-color: ${item.type.includes("消火栓") ? "red" : "blue"}; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 18px; color: white;">${item.checked ? "✔" : "●"}</div>`,
              iconSize: [30, 30],
            })}
            eventHandlers={{
              click: () => {
                if (mode === "inspection") {
                  setHydrants((prev) =>
                    prev.map((marker) =>
                      marker.id === item.id ? { ...marker, checked: !marker.checked } : marker
                    )
                  );
                } else if (mode === "add") {
                  setDeleteTarget(item);
                  setNewMarkerPosition(null);
                }
              },
              dragend: (event) => {
                if (mode === "move") {
                  setMoveTarget(item);
                  setMovePosition(event.target.getLatLng());
                }
              },
            }}
          />
        ))}
        
         {/* 🔥 削除・追加・移動のポップアップを完全復元 */}
         {deleteTarget && (
          <Popup position={[deleteTarget.lat, deleteTarget.lon]} onClose={() => setDeleteTarget(null)}>
            <p>このマーカーを削除しますか？</p>
            <button onClick={() => {
              setHydrants((prev) => prev.filter((marker) => marker.id !== deleteTarget.id));
              setDeleteTarget(null);
            }}>削除</button>
            <button onClick={() => setDeleteTarget(null)}>キャンセル</button>
          </Popup>
        )}

        {newMarkerPosition && (
          <Popup position={newMarkerPosition} onClose={() => setNewMarkerPosition(null)}>
            <p>新しいマーカーを追加</p>
            <button onClick={() => {
              setHydrants([...hydrants, { 
                id: `new-${Date.now()}`, 
                type: "消火栓", 
                lat: newMarkerPosition.lat, 
                lon: newMarkerPosition.lng, 
                checked: false 
              }]);
              setNewMarkerPosition(null);
            }}>消火栓を追加</button>

            <button onClick={() => {
              setHydrants([...hydrants, { 
                id: `new-${Date.now()}`, 
                type: "防火水槽", 
                lat: newMarkerPosition.lat, 
                lon: newMarkerPosition.lng, 
                checked: false 
              }]);
              setNewMarkerPosition(null);
            }}>防火水槽を追加</button>

            <button onClick={() => setNewMarkerPosition(null)}>キャンセル</button>
          </Popup>
        )}

        {/* 🔥 移動モードのポップアップ修正 */}
        {moveTarget && movePosition && (
          <Popup position={movePosition} onClose={() => { setMoveTarget(null); setMovePosition(null); }}>
            <p>この場所に移動しますか？</p>
            <button onClick={() => {
              setHydrants((prev) => prev.map((marker) => 
                marker.id === moveTarget.id
                  ? { ...marker, lat: movePosition.lat, lon: movePosition.lng }
                  : marker
              ));
              setMoveTarget(null);
              setMovePosition(null);
            }}>移動確定</button>
            <button onClick={() => setMoveTarget(null)}>キャンセル</button>
          </Popup>
        )}

        {/* 🔥 現在地マーカー */}
        {userLocation && (
          <Marker position={userLocation} icon={new L.Icon({
            iconUrl: "https://maps.google.com/mapfiles/ms/icons/blue-dot.png",
            iconSize: [32, 32]
          })}>
            <Popup>
              <p><strong>現在地</strong></p>
            </Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
};

export default MapView;

