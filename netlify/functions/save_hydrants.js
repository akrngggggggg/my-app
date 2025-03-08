const admin = require("firebase-admin");

// Firebaseの認証情報を環境変数から読み込む
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

// Firebase初期化（1回だけ）
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();
const collection = db.collection("fire_hydrants");

exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method Not Allowed" }) };
  }

  try {
    const newData = JSON.parse(event.body);

    // Firestore にデータを保存
    await collection.doc("hydrants_data").set({ data: newData });

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "データが保存されました" }),
    };
  } catch (error) {
    console.error("❌ [ERROR] Firestore 保存エラー:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "データの保存に失敗しました", details: error.message }),
    };
  }
};
