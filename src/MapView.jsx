import React, { useState, useEffect, useMemo, useRef } from "react"; // ✅ useRef を1行に統合
import {
  GoogleMap,
  MarkerF,
  useJsApiLoader,
} from "@react-google-maps/api";
import { collection, getDocs, doc, updateDoc, getDoc, addDoc, deleteDoc } from "firebase/firestore";
import { db } from "./firebase";
import haversine from "haversine-distance"; // 距離計算用
import { debounce, isEqual } from "lodash"; 

import CustomDialog from "./components/CustomDialog"; 
import MarkerManager from "./components/MarkerManager";
import { fetchHydrants, updateVisibleHydrants } from "./data/HydrantData";
import ModeSwitcher from "./components/ModeSwitcher";
import CheckListManager from "./components/CheckListManager";
import AddressManager from "./components/AddressManager";


const mapContainerStyle = {
  width: "100vw",
  height: `calc(100vh - env(safe-area-inset-bottom, 50px))`, // 🔥 ノッチとタブを考慮
};

const MapView = () => {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
  });
    // 🔥 参照 & ステート管理
    const mapRef = useRef(null); // マップの参照
    const [mapBounds, setMapBounds] = useState(null); // 地図の表示範囲
  
    // 🔥 ユーザー情報関連
    const [userLocation, setUserLocation] = useState(null);
    const [userLocationIcon, setUserLocationIcon] = useState(null); // 現在地アイコン
    const [center, setCenter] = useState({ lat: 35.6895, lng: 139.6917 });
    const [zoom, setZoom] = useState(18);
    const [heading, setHeading] = useState(null);
  
    // 🔥 データ管理
    const [hydrants, setHydrants] = useState([]); // 消火栓リスト
    const [visibleHydrants, setVisibleHydrants] = useState([]); // 画面内の消火栓
    const [checkedList, setCheckedList] = useState([]); // チェックリスト
  
    // 🔥 UI関連
    const [mode, setMode] = useState("点検"); // ✅ モード管理
    const [isDialogOpen, setIsDialogOpen] = useState(false); // ダイアログの開閉
    const [dialogMessage, setDialogMessage] = useState(""); // 表示するメッセージ
    const [dialogAction, setDialogAction] = useState(null); // 確定時の処理
    const [isListOpen, setIsListOpen] = useState(false); // リストの開閉状態
    const [selectedLocation, setSelectedLocation] = useState(null); // クリック位置を一時保存
    const [showSelection, setShowSelection] = useState(false); // 選択UIの表示フラグ
    const [mapCenter, setMapCenter] = useState(null);
    const [loading, setLoading] = useState(true);
    const addressManagerRef = useRef(null);
    const [isManualAddressMode, setIsManualAddressMode] = useState(false);

    // 🔥 `MarkerManager` を使う
    const { handleMarkerDragEnd, handleMarkerDelete } = MarkerManager({
    hydrants,
    setCheckedList,
    setHydrants,
    setIsDialogOpen,
    setDialogMessage,
    setDialogAction
    });

    // 🔥 `CheckListManager` から関数を取得
    const { handleCheckHydrant, handleResetCheckedList } = CheckListManager({
      checkedList, 
      setCheckedList, 
      hydrants, 
      setHydrants, 
      mode, 
      setIsDialogOpen, 
      setDialogMessage, 
      setDialogAction
    });

    const handleConfirmAddMarker = (type) => {
      if (addressManagerRef.current) {
        addressManagerRef.current.confirmAddMarker(type);
      }
    };
    
// 🔥 現在地を取得しながら `heading` も更新
const updateUserLocation = () => {
  if (navigator.geolocation) {
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, heading } = position.coords;
        const newLocation = { lat: latitude, lng: longitude };

        setUserLocation(newLocation); // 現在地を更新
        setHeading(heading); // 🔥 ユーザーの向きを更新
      },
      (error) => console.error("🚨 Geolocation error:", error),
      { enableHighAccuracy: true }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }
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
  fetchHydrants(setHydrants); // 🔥 Firestore データ取得
}, []);

useEffect(() => {
  updateVisibleHydrants(mapCenter, hydrants, setVisibleHydrants);
}, [mapCenter, hydrants]);

const memoizedVisibleHydrants = useMemo(() => {
  return visibleHydrants.map((hydrant) => ({
    key: hydrant.firestoreId,
    position: { lat: hydrant.lat, lng: hydrant.lon },
  }));
}, [visibleHydrants]); // 🔥 `visibleHydrants` が変わったときのみ更新！

// ✅ マップの中心が変わったら `mapCenter` を更新
const handleMapCenterChanged = debounce(() => {
  if (!mapRef.current) return;
  const newCenter = mapRef.current.getCenter();
  console.log("🔥 マップの中心が変更された:", newCenter.lat(), newCenter.lng());

  // 🔥 無駄なレンダリングを防ぐ
  setMapCenter(prev => 
    prev.lat === newCenter.lat() && prev.lng === newCenter.lng() 
      ? prev 
      : { lat: newCenter.lat(), lng: newCenter.lng() }
  );
}, 500); // 500ms 遅延
 
const handleMapClick = (event) => {
  if (mode !== "追加削除") return;

  const newLat = event.latLng.lat();
  const newLng = event.latLng.lng();
  const newLocation = { lat: newLat, lng: newLng };

  console.log("📌 クリック位置取得:", newLocation); // クリックした場所の座標を表示

  setSelectedLocation(newLocation);
  setShowSelection(true);

  if (addressManagerRef.current) {
    console.log("📍 AddressManager が存在しています！");
    addressManagerRef.current.confirmAddMarker("消火栓");
  } else {
    console.error("🚨 AddressManager が見つかりません！");
  }
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


if (!isLoaded) return <div>Loading...</div>;
  
  const onMapLoad = (map) => {
    mapRef.current = map; // 🔥 Google Map のインスタンスを保存！
  };
  
  return (
        <div>
        {/* 🔥 ここにタイトル + 現在地ボタン + モード選択を追加 */}
        <div style={{
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
       onCenterChanged={handleMapCenterChanged}
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
       onCancel={() => setIsDialogOpen(false)} 
      />     
// 🔥 現在地を表示するマーカーを追加
{userLocation && (
  <>
    {/* 青丸アイコン */}
    <MarkerF 
      position={userLocation}
      icon={{
        path: google.maps.SymbolPath.CIRCLE,
        scale: 10,
        fillColor: "#4285F4",
        fillOpacity: 0.6,
        strokeWeight: 2,
      }}
    />

    {/* 向きを示す矢印アイコン */}
    {heading !== null && (
      <MarkerF 
        position={userLocation}
        icon={{
          path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
          scale: 5,
          rotation: heading,
          fillColor: "red",
          fillOpacity: 0.8,
          strokeWeight: 1,
        }}
        />
      )}
    </>
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

{visibleHydrants.map((hydrant) => (
  <MarkerF
    key={hydrant.firestoreId}
    position={{ lat: hydrant.lat, lng: hydrant.lon }}
    draggable={mode === "移動"}
    onDragEnd={(e) => 
      handleMarkerDragEnd(
        hydrant.firestoreId, 
        e.latLng.lat(), 
        e.latLng.lng(), 
        hydrant.lat, 
        hydrant.lon
      )
    }
    onClick={() => {
      if (mode === "点検") {
        console.log("✅ 点検モードでクリック。ID:", hydrant.firestoreId);
        handleCheckHydrant(hydrant.firestoreId);
      } else if (mode === "追加削除") {
        handleMarkerDelete(hydrant.firestoreId, hydrant.type);
      }
    }}

    icon={{
      url: hydrant.checked
        ? "http://maps.google.com/mapfiles/ms/icons/green-dot.png"  // ✅ チェック済みなら緑
        : hydrant.type.includes("消火栓")  // ✅ ここを "公設消火栓" ではなく "消火栓" にすると汎用的
        ? "http://maps.google.com/mapfiles/ms/icons/red-dot.png"  // 🔴 消火栓は赤
        : "http://maps.google.com/mapfiles/ms/icons/blue-dot.png", // 🔵 防火水槽は青
      scaledSize: isLoaded ? new window.google.maps.Size(40, 40) : undefined,  // ✅ isLoaded で安全チェック
    }}
  />
))}

</GoogleMap>


    {/* 🔘 リストのトグルボタン */}
    <button 
      onClick={() => setIsListOpen(!isListOpen)} 
      style={{
        position: "absolute", left: isListOpen ? "280px" : "10px", top: "85%", 
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
      maxHeight: "250px", overflowY: "auto",
      transition: "left 0.3s ease-in-out"
    }}>
      <h3 style={{ fontSize: "16px", textAlign: "center" }}>✔ 点検済みリスト</h3>
      
      {checkedList.map((hydrant, index) => (
        <div key={index} style={{ padding: "5px", borderBottom: "1px solid #ccc", fontSize: "14px" }}>
          {hydrant.address}
        </div>
    ))}

 <button onClick={handleResetCheckedList} 
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