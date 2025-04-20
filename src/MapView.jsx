import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  GoogleMap,
  MarkerF,
  useJsApiLoader,
} from "@react-google-maps/api";
import { collection, getDocs, doc, updateDoc, getDoc, addDoc, deleteDoc, setDoc, deleteField } from "firebase/firestore";
import { db } from "./firebase";
import haversine from "haversine-distance";
import { debounce, isEqual } from "lodash";
import CustomDialog, { getMarkerColor } from "./components/CustomDialog";
import MarkerManager from "./components/MarkerManager";
import { fetchHydrants } from "./data/HydrantData";
import ModeSwitcher from "./components/ModeSwitcher";
import CheckListManager from "./components/CheckListManager";
import AddressManager from "./components/AddressManager";
import { MarkerClusterer } from "@googlemaps/markerclusterer";

const mapContainerStyle = {
  width: "100vw",
  height: "100vh",
  position: "fixed",
  top: "0px",
  left: 0,
  zIndex: 0,
};

const MapView = ({ division, section }) => {
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
  });

  const mapRef = useRef(null);
  const clustererRef = useRef(null);
  const modeRef = useRef("点検");

  const [userLocation, setUserLocation] = useState(null);
  const [zoom, setZoom] = useState(18);
  const [hydrants, setHydrants] = useState([]);
  const [visibleHydrants, setVisibleHydrants] = useState([]);
  const [checkedList, setCheckedList] = useState([]);
  const [mode, setMode] = useState("点検");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogMessage, setDialogMessage] = useState("");
  const [dialogAction, setDialogAction] = useState(null);
  const [isListOpen, setIsListOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [showSelection, setShowSelection] = useState(false);
  const [mapCenter, setMapCenter] = useState(null);
  const [loading, setLoading] = useState(true);
  const addressManagerRef = useRef(null);
  const [isManualAddressMode, setIsManualAddressMode] = useState(false);
  const [dialogSelectOptions, setDialogSelectOptions] = useState([]);
  const [dialogSelectValue, setDialogSelectValue] = useState("異常なし");
  const [draggedMarkerData, setDraggedMarkerData] = useState(null);
  const [mapBounds, setMapBounds] = useState(null);

        const getRadiusByZoom = (zoom) => {
      if (zoom >= 19) return 300;
      if (zoom >= 17) return 600;
      if (zoom >= 15) return 1000;
      if (zoom >= 13) return 2000;
      return 3000;
    };
 
    const updateVisibleHydrants = (center, hydrantsList, radius) => {
      const nearby = hydrantsList.filter(h => {
        const distance = haversine(center, { lat: h.lat, lng: h.lon });
        return distance <= radius;
      });
      setVisibleHydrants(nearby);
    };
  
    const flyToLocation = (lat, lng) => {
      if (mapRef.current) {
        mapRef.current.panTo({ lat, lng });
        mapRef.current.setZoom(18);
      }
    };
    const debouncedUpdateVisibleHydrants = useMemo(
      () =>
        debounce((center, hydrantsList, radius) => {
          const nearby = hydrantsList.filter((h) => {
            const distance = haversine(center, { lat: h.lat, lng: h.lon });
            return distance <= radius;
          });
          setVisibleHydrants((prev) => (isEqual(prev, nearby) ? prev : nearby));
        }, 300),
      []
    );
    
    const onMapLoad = (map) => {
      mapRef.current = map;
      const center = map.getCenter();
      setMapCenter({ lat: center.lat(), lng: center.lng() });
      setZoom(map.getZoom());
    
    const radius = getRadiusByZoom(map.getZoom());
      updateVisibleHydrants(center.toJSON(), hydrants, radius);
    };

    useEffect(() => {
      modeRef.current = mode;
    }, [mode]);

    useEffect(() => {
      if (!mapRef.current || !visibleHydrants.length) return;
      const map = mapRef.current;
    
      if (clustererRef.current) clustererRef.current.clearMarkers();
      if (window.currentHydrantMarkers) window.currentHydrantMarkers.forEach((m) => m.setMap(null));
    
      const markers = visibleHydrants.map((hydrant) => {
        const iconUrl = hydrant.checked
          ? (hydrant.issue
            ? "/A_2D_vector_graphic_of_a_yellow_triangular_warning.png"
            : "http://maps.google.com/mapfiles/ms/icons/green-dot.png")
          : (hydrant.type.includes("消火栓")
            ? "http://maps.google.com/mapfiles/ms/icons/red-dot.png"
            : "http://maps.google.com/mapfiles/ms/icons/blue-dot.png");
    
        const marker = new window.google.maps.Marker({
          position: { lat: hydrant.lat, lng: hydrant.lon },
          icon: { url: iconUrl, scaledSize: new window.google.maps.Size(40, 40) },
          draggable: modeRef.current === "移動",
        });
    
        // 🖱️ クリックイベント
        marker.addListener("click", () => {
          const currentMode = modeRef.current;
    
          if (currentMode === "点検") {
            setDialogSelectOptions(["未点検に戻す", "異常なし", "水没", "砂利・泥", "その他"]);
            setDialogSelectValue(hydrant.issue ?? "異常なし");
            setDialogMessage("点検結果を選択してください");
    
            const currentHydrantId = hydrant.firestoreId;
            const currentHydrant = hydrant;
    
            setDialogAction(() => async (selectedValue) => {
              const checklistRef = doc(db, "checklists", `${division}-${section}`);
    
              if (selectedValue === "未点検に戻す") {
                await updateDoc(checklistRef, { [currentHydrantId]: deleteField() });
                setHydrants((prev) =>
                  prev.map((h) =>
                    h.firestoreId === currentHydrantId ? { ...h, checked: false, issue: null } : h
                  )
                );
                setCheckedList((prev) => prev.filter((h) => h.firestoreId !== currentHydrantId));
                setIsDialogOpen(false);
                return;
              }
    
              const firestoreValue =
                selectedValue === "異常なし"
                  ? true
                  : { checked: true, issue: selectedValue, lastUpdated: new Date().toISOString() };
    
              await setDoc(checklistRef, { [currentHydrantId]: firestoreValue }, { merge: true });
    
              setHydrants((prev) =>
                prev.map((h) =>
                  h.firestoreId === currentHydrantId
                    ? {
                        ...h,
                        checked: true,
                        issue: selectedValue === "異常なし" ? null : selectedValue,
                        lastUpdated: new Date().toISOString(),
                      }
                    : h
                )
              );
    
              setCheckedList((prev) => {
                const exists = prev.some((h) => h.firestoreId === currentHydrantId);
                const newItem = {
                  ...currentHydrant,
                  checked: true,
                  issue: selectedValue === "異常なし" ? null : selectedValue,
                };
                return exists
                  ? prev.map((h) => (h.firestoreId === currentHydrantId ? newItem : h))
                  : [...prev, newItem];
              });
    
              setIsDialogOpen(false);
            });
    
            setIsDialogOpen(true);
          } else if (currentMode === "追加削除") {
            handleMarkerDelete(hydrant.firestoreId, hydrant.type);
          } else if (currentMode === "移動") {
            alert("💡 マーカーをドラッグで移動できます。");
          }
        });
    
        // 🌀 ドラッグ終了時（位置移動確認ダイアログ）
        marker.addListener("dragend", (event) => {
          if (modeRef.current === "移動") {
            const newLat = event.latLng.lat();
            const newLng = event.latLng.lng();
            handleMarkerDragEnd(hydrant.firestoreId, newLat, newLng); // ← ここで呼ぶ！！
          }
        });
    
        return marker;
      });
    
      window.currentHydrantMarkers = markers;
      clustererRef.current = new MarkerClusterer({ map, markers });
    }, [visibleHydrants, hydrants, mode]);
    
    
    useEffect(() => {
      if (!mapRef.current) return;
      const map = mapRef.current;
    
      // 🔁 最新のモードを同期
      modeRef.current = mode;
    
      const handleUpdate = () => {
        const center = map.getCenter();
        const zoom = map.getZoom();
    
        setMapCenter({ lat: center.lat(), lng: center.lng() });
        setZoom(zoom);
    
        const radius = getRadiusByZoom(zoom);
        debouncedUpdateVisibleHydrants(center.toJSON(), hydrants, radius);
      };
    
      map.addListener("zoom_changed", handleUpdate);
      map.addListener("dragend", handleUpdate);
    
      handleUpdate(); // 初期実行
    
      return () => {
        window.google.maps.event.clearListeners(map, "zoom_changed");
        window.google.maps.event.clearListeners(map, "dragend");
      };
    }, [hydrants, mode]);
    

    // 🔥 `MarkerManager` を使う
    const { handleMarkerDragEnd, handleMarkerDelete } = MarkerManager({
    hydrants,
    setCheckedList,
    setHydrants,
    setIsDialogOpen,
    setDialogMessage,
    setDialogAction,
    mapRef,
    });

    // 🔥 `CheckListManager` から関数を取得
    const {
      handleCheckHydrant,
      handleResetCheckedList,
      filterKeyword,
      setFilterKeyword,
      filteredCheckedList,
      totalEverChecked,
      formatAddress,
      abnormalList,  // ← 🧩 これが必要
      normalList
    } = CheckListManager({
      checkedList,
      setCheckedList,
      hydrants,
      setHydrants,
      mode,
      setIsDialogOpen,
      setDialogMessage,
      setDialogAction,
      division,
      section,
      setDialogSelectOptions,
      setDialogSelectValue,
      dialogSelectValue,
    });

    const handleConfirmAddMarker = (type) => {
      if (addressManagerRef.current) {
        addressManagerRef.current.confirmAddMarker(type);
      }
    };
    // ✅ 点検モードのみリセット許可（それ以外は警告表示）
const handleSafeReset = () => {
  if (mode !== "点検") {
    setDialogMessage("リセットは点検モードでのみ可能です。");
    setDialogSelectOptions([]);
    setDialogAction(null);
    setIsDialogOpen(true);
    return;
  }
  handleResetCheckedList();
};

    const updateUserLocation = () => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const newLocation = { lat: latitude, lng: longitude };
          console.log("✅ 現在地取得:", newLocation);
          setUserLocation(newLocation);
        setMapCenter(newLocation);
        if (mapRef.current) {
          mapRef.current.panTo(newLocation);
          mapRef.current.setZoom(18);
         } // 🔥 マップの中心を現在地にする
        },
        (error) => {
          console.error("🚨 現在地の取得に失敗:", error);
        },
        { enableHighAccuracy: true }
      );
    };


    // 🔥 地図の範囲変更を検知
    const handleBoundsChanged = () => {
      if (!mapRef.current) return;
      const bounds = mapRef.current.getBounds();
      setMapBounds(bounds);
    };
  
  useEffect(() => {
      if (!isLoaded || !window.google || !window.google.maps) {
        console.warn("🚨 Google Maps API がまだロードされていない！");
        return;
      }
  
      const fetchLocation = () => {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            const newLocation = { lat: latitude, lng: longitude };
            console.log("✅ 現在地取得:", newLocation);
  
            setUserLocation(newLocation);
            setMapCenter(newLocation);
            setLoading(false); // 🔥 ローディング完了
          },
          (error) => {
            console.error("🚨 現在地の取得に失敗:", error);
            setMapCenter({ lat: 35.3363, lng: 139.3032 });
            setLoading(false); // 🔥 エラー時もローディング完了扱いにする
          },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
      };
  
      fetchLocation();
    }, [isLoaded]);
  

  useEffect(() => {
    updateUserLocation();
  }, []);

  useEffect(() => {
  if (division && section) {
    fetchHydrants(setHydrants, division, section);
  } else {
    console.warn("⚠️ division または section が未設定です！");
  }
}, [division, section]);


const handleMapClick = (event) => {
  if (mode !== "追加削除") return;

  const newLat = event.latLng.lat();
  const newLng = event.latLng.lng();
  const newLocation = { lat: newLat, lng: newLng };

  //console.log("📌 クリック位置取得:", newLocation); // クリックした場所の座標を表示

  setSelectedLocation(newLocation);
  setShowSelection(true);

 };

const fetchAddress = async (location) => {
  if (!window.google || !window.google.maps) {
    console.error("🚨 Google Maps API がロードされていません！");
    return;
  }

  const geocoder = new window.google.maps.Geocoder();

  geocoder.geocode({ location }, (results, status) => {
    if (status === "OK" && results[0]) {
      const address = results[0].formatted_address;
      console.log("✅ 取得した住所:", address);
    } else {
      console.error("🚨 住所の取得に失敗しました。Status:", status);
    }
  });
};

const confirmAddMarker = async (type) => {
  if (!selectedLocation) {
    console.error("🚨 選択された場所が存在しません！");
    return;
  }

  const { lat, lng } = selectedLocation;

  // 住所を取得してから保存する
  await fetchAddress({ lat, lng });

  const newHydrant = {
    type,
    lat,
    lng,
    checked: false,
    address: "取得中...", // 住所を取得できた後に更新する
  };

  setHydrants([...hydrants, newHydrant]);
  setShowSelection(false);

  console.log("✅ 新しい消火栓を追加しました！", newHydrant);
};

if (loading || !isLoaded) { // 🔥 読み込み中の表示条件
  return (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      width: "100vw",
      height: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#ffffff",
      zIndex: 9999
    }}>
      <div style={{ textAlign: "center" }}>
        <div className="loader" style={{
          border: "6px solid #f3f3f3",
          borderRadius: "50%",
          borderTop: "6px solid #3498db",
          width: "50px",
          height: "50px",
          animation: "spin 1s linear infinite",
          marginBottom: "10px"
        }}></div>
        <p style={{ fontSize: "18px", color: "#333" }}>読み込み中...</p>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  );
}


 return (
        <div>
        {/* 🔥 ここにタイトル + 現在地ボタン + モード選択を追加 */}
        <div style={{
          top: 0,               
          left: 0,
          right: 0,
          zIndex: 1000,         
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "10px 15px",
          backgroundColor: "#2c3e50",
          color: "white",
          fontSize: "24px",
          fontWeight: "bold"
        }}>
          <span>消火栓マップ</span>
    
          {/* 🔥 ボタンエリア（現在地 & モード選択） */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {/* 🔘 現在地へ戻るボタン */}
            <button onClick={updateUserLocation} style={{
              padding: "10px 15px",
              backgroundColor: "#FFC107",
              color: "#000",
              fontSize: "14px",
              fontWeight: "bold",
              border: "none",
              borderRadius: "5px",
              cursor: "pointer",
              boxShadow: "0px 4px 6px rgba(0, 0, 0, 0.2)"
            }}>
              現在地へ戻る
            </button>
            
   <ModeSwitcher mode={mode} setMode={setMode} />
</div>
</div>

<AddressManager
  ref={addressManagerRef}
  selectedLocation={selectedLocation}
  setSelectedLocation={setSelectedLocation}
  setShowSelection={setShowSelection}
  hydrants={hydrants}
  setHydrants={setHydrants}
  isManualAddressMode={isManualAddressMode}
  setIsManualAddressMode={setIsManualAddressMode}
/>

 <GoogleMap
       mapContainerStyle={mapContainerStyle}
       center={mapCenter || { lat: 35.3363, lng: 139.3032 }}
       zoom={18}
       onClick={(e) => handleMapClick(e)}
       onLoad={onMapLoad}
       onBoundsChanged={handleBoundsChanged}
       options={{
       disableDefaultUI: true,       // 🔥 すべてのUIを非表示
       zoomControl: false,           // 🔥 ズームボタン（+,-）を消す
       streetViewControl: false,     // 🔥 ストリートビューを消す
       mapTypeControl: false,        // 🔥 「Map / Satellite」ボタンを消す
       fullscreenControl: false,      // 🔥 フルスクリーンボタンを消す
       gestureHandling: "greedy",     // 🔥 タッチ操作を優先（ピンチズームやドラッグ移動を有効化）
       minZoom: 14,                   // 🔥 ズームアウトしすぎないよう制限
       maxZoom: 20,                   // 🔥 ズームインしすぎないよう制限
      }}
>
<CustomDialog 
  isOpen={isDialogOpen} 
  message={dialogMessage} 
  onConfirm={dialogAction} 
  onCancel={() => {
    if (window.cancelMarkerMove) {
      window.cancelMarkerMove();
      delete window.cancelMarkerMove;
    }
    setIsDialogOpen(false);
    setDialogSelectOptions([]); 
  }}
  dialogSelectOptions={dialogSelectOptions} 
  dialogSelectValue={dialogSelectValue} 
  setDialogSelectValue={setDialogSelectValue}
/>  
 {userLocation && (
        <MarkerF 
          position={userLocation}
          icon={{
            url: "https://maps.google.com/mapfiles/kml/shapes/man.png",
            scaledSize: new window.google.maps.Size(40, 40)
          }}
        />
      )}                           

{showSelection && (
  <div style={{
    position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
    backgroundColor: "white", padding: "15px", borderRadius: "8px",
    boxShadow: "0px 4px 6px rgba(0, 0, 0, 0.2)", textAlign: "center"
  }}>
    <h3>追加する種類を選択</h3>
    
    {/* 🔥 `confirmAddMarker` に必要な引数を正しく渡す！ */}
    <button 
  onClick={() => addressManagerRef.current?.confirmAddMarker("消火栓")} 
  style={{ margin: "5px", padding: "10px", backgroundColor: "red", color: "white", border: "none", borderRadius: "5px", cursor: "pointer" }}>
  消火栓を追加
</button>

<button 
  onClick={() => addressManagerRef.current?.confirmAddMarker("防火水槽")} 
  style={{ margin: "5px", padding: "10px", backgroundColor: "blue", color: "white", border: "none", borderRadius: "5px", cursor: "pointer" }}>
  防火水槽を追加
</button>

    <button onClick={() => setShowSelection(false)} 
      style={{ marginTop: "10px", padding: "8px", backgroundColor: "gray", color: "white", border: "none", borderRadius: "5px", cursor: "pointer" }}>
      キャンセル
    </button>
  </div>
)}

</GoogleMap>


    {/* 🔘 リストのトグルボタン */}
    <button 
      onClick={() => setIsListOpen(!isListOpen)} 
      style={{
        position: "absolute", left: isListOpen ? "260px" : "10px", top: "85%", 
        transform: "translateY(-50%)",
        width: "40px",  // ボタンを横に広げる
        height: "100px", // 縦長にする
        padding: "12px", // クリックしやすくする
        fontSize: "25px", // 文字も大きくする
        border: "none",
        borderRadius: "10px", // 角を少し丸く
        cursor: "pointer",
        backgroundColor: "gray",
        color: "white",
        transition: "left 0.3s ease-in-out"
      }}
    >
      {isListOpen ? "◀" : "▶"}
    </button>

     {/* 🔘 点検リスト */}
     <div style={{
  position: "absolute", left: isListOpen ? "0px" : "-300px", bottom: "10px",
  width: "260px", backgroundColor: "rgba(255, 255, 255, 0.9)", padding: "10px",
  borderRadius: "8px", boxShadow: "0px 4px 6px rgba(0, 0, 0, 0.2)",
  maxHeight: "300px", overflowY: "auto",
  transition: "left 0.3s ease-in-out"
}}>
  <h3 style={{ fontSize: "16px", textAlign: "center" }}>
    ✔ 点検済みリスト {filteredCheckedList.length}/{totalEverChecked}
  </h3>

  {/* 🔍 フィルター入力欄 */}
  <input
    type="text"
    placeholder="住所で絞り込み"
    value={filterKeyword}
    onChange={(e) => setFilterKeyword(e.target.value)}
    style={{
      width: "100%",
      padding: "6px",
      marginBottom: "8px",
      border: "1px solid #ccc",
      borderRadius: "5px"
    }}
  />

  {/* ⚠️ 異常ありリスト */}
  {abnormalList.length > 0 && (
    <div style={{ marginBottom: "8px", padding: "5px", backgroundColor: "#ffeaea", borderRadius: "5px" }}>
      <h4 style={{ color: "red", margin: "4px 0" }}>⚠️ 異常あり（{abnormalList.length}件）</h4>
      {abnormalList.map((hydrant, index) => (
  <div
    key={`abnormal-${index}`}
    style={{ fontSize: "13px", padding: "2px 0", color: "#c00", fontWeight: "bold", cursor: "pointer" }}
    onClick={() => flyToLocation(hydrant.lat, hydrant.lon)}
  >
    {formatAddress(hydrant.address)} - {hydrant.issue}
  </div>
))}
    </div>
  )}

  {/* ✅ 正常点検リスト */}
  {normalList.map((hydrant, index) => (
  <div
    key={`normal-${index}`}
    style={{ padding: "5px", borderBottom: "1px solid #ccc", fontSize: "14px", cursor: "pointer" }}
    onClick={() => flyToLocation(hydrant.lat, hydrant.lon)}
  >
    {formatAddress(hydrant.address)}
  </div>
))}

  {/* 🔘 全てリセットボタン */}
  <button onClick={handleSafeReset}
    style={{
      marginTop: "10px", width: "100%", padding: "8px",
      backgroundColor: "red", color: "white", border: "none",
      borderRadius: "5px", cursor: "pointer"
    }}
  >
    全てリセット
  </button>
</div>

    </div>
  );
};

export default MapView;