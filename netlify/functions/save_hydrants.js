const fs = require("fs");
const path = require("path");

exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const filePath = path.join(__dirname, "../../public/data/fire_hydrants.json");

  try {
    const newData = JSON.parse(event.body);
    fs.writeFileSync(filePath, JSON.stringify(newData, null, 2));

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "データが保存されました。" }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "データの保存に失敗しました。" }),
    };
  }
};
