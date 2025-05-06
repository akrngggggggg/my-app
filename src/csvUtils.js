import { collection, getDocs } from "firebase/firestore";
import { db } from "./firebase";

export const exportCheckedListCSV = async ({ division, section }) => {
  const checklistsRef = collection(db, "checklists", `${division}-${section}`);
  const querySnapshot = await getDocs(checklistsRef);

  const csvRows = [
    ["住所(ID)", "点検日", "異常有無"]
  ];

  querySnapshot.forEach((doc) => {
    const data = doc.data();
    csvRows.push([
      doc.id || "",
      data.lastUpdated || "",
      data.issue || "異常なし"
    ]);
  });

  const csvContent = csvRows.map(row => row.join(",")).join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `${division}_${section}_点検リスト.csv`;
  a.click();
  URL.revokeObjectURL(url);
};
