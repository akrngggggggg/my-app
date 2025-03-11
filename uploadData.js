import { db } from "./src/firebase.js"; // ✅ 修正: `firebase.js` のパスを明示的に指定
import { collection, addDoc } from "firebase/firestore";
import fs from "fs/promises"; // ✅ `fs` を使って JSON を読み込む

const loadJsonData = async (filePath) => {
  try {
    const jsonData = await fs.readFile(filePath, "utf-8");
    return JSON.parse(jsonData);
  } catch (error) {
    console.error("🚨 JSON 読み込みエラー:", error);
    return null;
  }
};

const uploadData = async () => {
  try {
    const hydrantsCollection = collection(db, "fire_hydrants");

    const fireHydrants = await loadJsonData("./fire_hydrants.json"); // ✅ JSON を手動で読み込む
    if (!fireHydrants) {
      console.error("🚨 データが取得できませんでした！");
      return;
    }

    for (const hydrant of fireHydrants) {
      await addDoc(hydrantsCollection, hydrant);
      console.log(`✅ 追加成功: ${hydrant.id}`);
    }

    console.log("🔥 Firestore にデータを追加完了！");
  } catch (error) {
    console.error("🚨 データ追加エラー:", error);
  }
};

uploadData();
