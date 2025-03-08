const admin = require("firebase-admin");

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();
const collection = db.collection("fire_hydrants");

exports.handler = async function (event) {
  console.log("🔹[DEBUG] save_hydrants.js 実行開始");

  if (event.httpMethod !== "POST") {
    console.log("❌ [ERROR] メソッドがPOSTではない");
    return { statusCode: 405, body: JSON.stringify({ error: "Method Not Allowed" }) };
  }

  try {
    const newData = JSON.parse(event.body);
    console.log("📊 [DEBUG] 受け取ったデータ:", JSON.stringify(newData));

    // **Firestore にデータを保存**
    await collection.doc("hydrants_data").set({ data: newData });

    // **Firestore に正しくデータが書き込まれたか確認**
    const writtenDoc = await collection.doc("hydrants_data").get();
    if (!writtenDoc.exists) {
      console.log("❌ [ERROR] 書き込みに失敗（Firestore にデータがない）");
      return { statusCode: 500, body: JSON.stringify({ error: "データの書き込みに失敗しました" }) };
    }

    console.log("✅ [SUCCESS] Firestore にデータを保存しました", JSON.stringify(writtenDoc.data()));

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
