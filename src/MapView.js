import "leaflet/dist/leaflet.css";
import "leaflet-gesture-handling";
import "leaflet-gesture-handling/dist/leaflet-gesture-handling.css";
import React, { useState, useEffect, useCallback } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";

const MapClickHandler = ({ mode, setNewMarkerPosition, newMarkerPosition, deleteTarget }) => {
  useMapEvents({
    click(e) {
      if (mode === "add" && !newMarkerPosition && !deleteTarget) {
        setNewMarkerPosition(e.latlng);
      }
    },
  });
  return null;
};

const MapUpdater = ({ mapCenter, mapZoom, returnFlag, setReturnFlag }) => {
  const map = useMap();
  useEffect(() => {
    if (returnFlag && map) {
      map.setView(mapCenter, mapZoom);
      setReturnFlag(false);
    }
  }, [map, mapCenter, mapZoom, returnFlag, setReturnFlag]);
  return null;
};

const MapView = () => {
  const defaultPosition = [35.3933, 139.3072]; // 伊勢原市
  const defaultZoom = 16;
  const [hydrants, setHydrants] = useState([]);
  const [userLocation, setUserLocation] = useState(null);
  const [mapCenter, setMapCenter] = useState(defaultPosition);
  const [mapZoom, setMapZoom] = useState(defaultZoom);
  const [returnFlag, setReturnFlag] = useState(false);
  const [mode, setMode] = useState("inspection");
  const [showModeMenu, setShowModeMenu] = useState(false);
  const [newMarkerPosition, setNewMarkerPosition] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [moveTarget, setMoveTarget] = useState(null);
  const [movePosition, setMovePosition] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState(false);

  const fetchData = useCallback(() => {
    fetch("/.netlify/functions/get_hydrants")
      .then((res) => res.json())
      .then((data) => setHydrants(data))
      .catch((error) => console.error("APIエラー:", error));
  }, []);

  useEffect(() => {
    fetchData();
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => setUserLocation([position.coords.latitude, position.coords.longitude]),
        (error) => console.error("位置情報の取得失敗:", error)
      );
    }
  }, [fetchData]);

  const saveHydrants = () => {
    fetch("/.netlify/functions/save_hydrants", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(hydrants),
    })
      .then((res) => res.json())
      .then(() => {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      })
      .catch(() => {
        setSaveError(true);
        setTimeout(() => setSaveError(false), 3000);
      });
  };

  const goToCurrentLocation = () => {
    if (userLocation) {
      setMapCenter(userLocation);
      setMapZoom(defaultZoom);
      setReturnFlag(true);
    }
  };

  return (
    <div>
      <MapContainer center={mapCenter} zoom={mapZoom} style={{ height: "100vh", width: "100%" }}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <MapClickHandler mode={mode} setNewMarkerPosition={setNewMarkerPosition} newMarkerPosition={newMarkerPosition} deleteTarget={deleteTarget} />
        <MapUpdater mapCenter={mapCenter} mapZoom={mapZoom} returnFlag={returnFlag} setReturnFlag={setReturnFlag} />

        {hydrants.map((item) => (
          <Marker
            key={item.id}
            position={[item.lat, item.lon]}
            icon={new L.divIcon({
              className: "custom-icon",
              html: `<div style="width: 30px; height: 30px; background-color: ${item.type.includes("消火栓") ? "red" : "blue"}; border-radius: 50%; color: white; text-align: center;">${item.checked ? "✔" : "●"}</div>`,
              iconSize: [30, 30],
            })}
            eventHandlers={{
              click: () => {
                if (mode === "inspection") {
                  setHydrants((prev) => prev.map((marker) => marker.id === item.id ? { ...marker, checked: !marker.checked } : marker));
                } else if (mode === "add") {
                  setDeleteTarget(item);
                }
              },
            }}
          />
        ))}
      </MapContainer>

      <button onClick={goToCurrentLocation}>現在地に戻る</button>
      <button onClick={saveHydrants}>保存</button>
      {saveSuccess && <p>保存成功！</p>}
      {saveError && <p>保存失敗</p>}
    </div>
  );
};


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
  


export default MapView;

