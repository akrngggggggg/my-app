const fs = require("fs");
const path = require("path");

exports.handler = async function () {
  const filePath = path.join(__dirname, "../../public/data/fire_hydrants.json");

  try {
    const data = fs.readFileSync(filePath, "utf-8");
    return {
      statusCode: 200,
      body: data,
      headers: { "Content-Type": "application/json" },
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "データの取得に失敗しました。" }),
    };
  }
};
