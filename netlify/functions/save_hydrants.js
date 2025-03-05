const fs = require("fs");
const path = require("path");

exports.handler = async function (event) {
  console.log("🔹[DEBUG] save_hydrants.js 実行開始");

  if (event.httpMethod !== "POST") {
    console.log("❌ [ERROR] メソッドがPOSTではない");
    return { statusCode: 405, body: JSON.stringify({ error: "Method Not Allowed" }) };
  }

  try {
    // 🔥 NetlifyのFunctionsでは /tmp/ を使う
    const filePath = path.join("/tmp", "fire_hydrants.json");

    console.log("📁 [DEBUG] 保存先ファイル:", filePath);

    const newData = JSON.parse(event.body);
    console.log("📊 [DEBUG] 受け取ったデータ:", newData);

    // JSONファイルにデータを保存
    fs.writeFileSync(filePath, JSON.stringify(newData, null, 2));

    console.log("✅ [SUCCESS] データを保存しました");

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "データが保存されました", path: filePath }),
    };
  } catch (error) {
    console.error("❌ [ERROR] 保存エラー:", error);

    return {
      statusCode: 500,
      body: JSON.stringify({ error: "データの保存に失敗しました", details: error.message }),
    };
  }
};
