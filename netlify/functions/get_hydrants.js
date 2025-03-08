const admin = require("firebase-admin");

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();
const collection = db.collection("fire_hydrants");

exports.handler = async function () {
  console.log("🔹[DEBUG] get_hydrants.js 実行開始");

  try {
    const doc = await collection.doc("hydrants_data").get();

    if (!doc.exists) {
      console.log("⚠ [WARN] Firestore に `hydrants_data` が存在しない");
      return { statusCode: 404, body: JSON.stringify({ error: "データが見つかりません" }) };
    }

    const fetchedData = doc.data().data;
    console.log("✅ [SUCCESS] Firestore からデータを取得:", JSON.stringify(fetchedData));

    return {
      statusCode: 200,
      body: JSON.stringify(fetchedData),
    };
  } catch (error) {
    console.error("❌ [ERROR] Firestore 取得エラー:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "データの取得に失敗しました", details: error.message }),
    };
  }
};
