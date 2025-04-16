import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import haversine from "haversine-distance";
import { debounce, isEqual } from "lodash";

// 🔥 Firestore から消火栓データを取得
export const fetchHydrants = async (setHydrants, division, section) => {
  try {
    const hydrantSnap = await getDocs(collection(db, "fire_hydrants"));
    const checklistRef = doc(db, "checklists", `${division}-${section}`);
    const checklistSnap = await getDoc(checklistRef);
    const checklistData = checklistSnap.exists() ? checklistSnap.data() : {};

    const data = hydrantSnap.docs.map((doc) => {
      const docData = doc.data();
      const id = doc.id;
      const checklistEntry = checklistData[id];

      return {
        ...docData,
        firestoreId: id,
        checked: checklistEntry === true ? true : checklistEntry?.checked ?? false,
        issue: typeof checklistEntry === "object" ? checklistEntry?.issue ?? null : null,
        lastUpdated: typeof checklistEntry === "object" ? checklistEntry?.lastUpdated ?? null : null,
      };
    });

    console.log("📌 Firestore から取得した hydrants + 点検情報:", data);
    setHydrants(data);
  } catch (error) {
    console.error("🚨 Firestore 取得エラー:", error);
  }
};

// 🔥 1km 以内の消火栓をフィルタリング
export const updateVisibleHydrants = debounce((mapCenter, hydrants, setVisibleHydrants) => {
  if (!mapCenter || hydrants.length === 0) return;

  console.time("1km フィルタ処理");

  const filteredHydrants = hydrants.filter(hydrant => {
    if (Math.abs(hydrant.lat - mapCenter.lat) > 0.01 || 
        Math.abs(hydrant.lon - mapCenter.lng) > 0.01) return false;
    return haversine(mapCenter, { lat: hydrant.lat, lng: hydrant.lon }) <= 1000;
  });

  console.timeEnd("1km フィルタ処理");
  console.log(`✅ 1km 以内の消火栓数: ${filteredHydrants.length}`);

  setVisibleHydrants(prev => isEqual(prev, filteredHydrants) ? prev : filteredHydrants);
}, 1000); // 1秒遅延
