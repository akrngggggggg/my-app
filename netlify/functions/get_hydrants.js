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
  try {
    const doc = await collection.doc("hydrants_data").get();
    if (!doc.exists) {
      return { statusCode: 404, body: JSON.stringify({ error: "データが見つかりません" }) };
    }

    return {
      statusCode: 200,
      body: JSON.stringify(doc.data().data),
    };
  } catch (error) {
    console.error("❌ [ERROR] Firestore 取得エラー:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "データの取得に失敗しました", details: error.message }),
    };
  }
};
