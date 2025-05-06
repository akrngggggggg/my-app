// 🔥MyPage.jsx（最新版・所属と役職編集可能版）

import React, { useEffect, useState } from "react";
import { getAuth, deleteUser, updatePassword } from "firebase/auth";
import {
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  collection,
  getDocs,
} from "firebase/firestore";
import { db } from "./firebase";
import { useNavigate } from "react-router-dom";
import { saveAs } from "file-saver";

const MyPage = ({ user, setUser }) => {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [division, setDivision] = useState("");
  const [section, setSection] = useState("");
  const [role, setRole] = useState("");  
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [providerId, setProviderId] = useState(null);

  const [exportDivision, setExportDivision] = useState("");
  const [exportSection, setExportSection] = useState("");

  useEffect(() => {
    if (!user) return;
    const fetchUserInfo = async () => {
      const docRef = doc(db, "users", user.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setName(data.name || "");
        setDivision(data.division || "");
        setSection(data.section || "");
        setRole(data.role || "団員");
        setExportDivision(data.division || "");
        setExportSection(data.section || "");
      }
    };
    if (user.providerData && user.providerData[0]) {
      setProviderId(user.providerData[0].providerId);
    }
    fetchUserInfo();
  }, [user]);

  const handleSave = async () => {
    if (!name.trim() || !division || !section || !role) {
      alert("名前・分団・部・役職をすべて入力してください");
      return;
    }

    const confirmed = window.confirm(
      `⚠️ 名前と変更履歴は保存されます。このまま保存してもよろしいですか？`
    );
    if (!confirmed) return;

    await updateDoc(doc(db, "users", user.uid), {
      name,
      division,
      section,
      role,
    });
    // 🔥 App.jsxのuser情報も更新
    if (setUser) {
      setUser({
        uid: user.uid,
        email: user.email,
        name,
        division,
        section,
        role
      });
    }
    alert("プロフィールを更新しました！");
};

  const handleDeleteAccount = async () => {
    const confirmed = window.confirm("本当にアカウントを削除しますか？この操作は元に戻せません。");
    if (!confirmed) return;
    try {
      await deleteDoc(doc(db, "users", user.uid));
      await deleteUser(getAuth().currentUser);
      alert("アカウントを削除しました。");
      navigate("/");
    } catch (error) {
      console.error("削除エラー:", error);
      alert("削除に失敗しました。再ログインが必要かもしれません。");
    }
  };

  const handlePasswordUpdate = async () => {
    if (!newPassword || newPassword.length < 6) {
      alert("6文字以上の新しいパスワードを入力してください");
      return;
    }
    const currentUser = getAuth().currentUser;
    if (currentUser.providerData[0]?.providerId === "google.com") {
      alert("Googleログインのユーザーはパスワードを変更できません");
      return;
    }
    try {
      await updatePassword(currentUser, newPassword);
      alert("パスワードを変更しました！");
      setNewPassword("");
    } catch (error) {
      console.error("パスワード変更エラー:", error);
      alert("パスワード変更に失敗しました。再ログインが必要かもしれません。");
    }
  };

  const canAccessAll = ["団長", "副団長"].includes(role);
  const canAccessDivision = ["分団長", "副分団長"].includes(role);

  const divisionSelector = (
    <select value={exportDivision} onChange={(e) => setExportDivision(e.target.value)}
      className="w-full border px-2 py-2 rounded-xl mb-2">
      {["1分団","2分団","3分団","4分団","5分団","6分団"].map(d => (
        <option key={d}>{d}</option>
      ))}
    </select>
  );

  const sectionSelector = (
    <select value={exportSection} onChange={(e) => setExportSection(e.target.value)}
      className="w-full border px-2 py-2 rounded-xl mb-2">
      {["1部","2部","3部","4部","5部","6部"].map(s => (
        <option key={s}>{s}</option>
      ))}
    </select>
  );

  const formatAddress = (address, issue = null) => {
    if (!address) return "";
    address = address.replace(/[Ａ-Ｚａ-ｚ０-９！-～]/g, s =>
      String.fromCharCode(s.charCodeAt(0) - 0xFEE0)
    );
    address = address.replace(/[ー－―—〜−]/g, "-");
    address = address.replace(/^日本、?/, "")
      .replace(/^〒?\d{3}-\d{4}\s*/, "")
      .replace(/^神奈川県伊勢原市|^神奈川県|^伊勢原市/, "")
      .replace(/番地|番|丁目/g, "-")
      .replace(/号/g, "")
      .replace(/-+$/g, "")
      .replace(/^-,*/, "")
      .trim();
    if (issue && issue !== "異常なし") {
      return `⚠️ ${address}`;
    }
    return address;
  };

  const exportCheckedListCSV = async ({ division, section }) => {
    if (!division || !section) {
      alert("分団と部を選択してください");
      return;
    }
    setLoading(true);
    try {
      const checklistRef = doc(db, "checklists", `${division}-${section}`);
      const snapshot = await getDoc(checklistRef);
      const data = snapshot.exists() ? snapshot.data() : {};

      const hydrantsSnap = await getDocs(collection(db, "fire_hydrants"));
      const addressMap = {};
      hydrantsSnap.forEach((doc) => {
        addressMap[doc.id] = doc.data().address || "住所不明";
      });

      const csv = ["住所,点検日,異常"].concat(
        Object.entries(data)
          .filter(([_, value]) => value && (value.checked || value === true))
          .map(([id, value]) => {
            const issue = typeof value === "object"
              ? value.issue || "異常なし"
              : "異常なし";
            const lastUpdated = typeof value === "object"
              ? value.lastUpdated || ""
              : "";
            const cleanedAddress = formatAddress(addressMap[id], issue);
            return `${cleanedAddress},${lastUpdated},${issue}`;
          })
      ).join("\n");

      const BOM = "\uFEFF";
      const blob = new Blob([BOM + csv], { type: "text/csv;charset=utf-8;" });
      saveAs(blob, `${division}_${section}_点検リスト.csv`);
      alert("CSVファイルを保存しました！");
    } catch (e) {
      console.error("CSVエクスポート失敗:", e);
      alert("CSVの保存に失敗しました。");
    }
    setLoading(false);
  };

  return (
    <div style={{ maxHeight: "100vh" }} className="h-screen overflow-y-auto bg-gradient-to-br from-gray-100 to-gray-200 px-4 py-6">
      <div className="max-w-md mx-auto bg-white p-8 rounded-2xl shadow-xl border">
        <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">👤 マイページ</h2>

        <div className="mb-4">
          <label className="block text-gray-600 font-semibold mb-1">名前</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className="w-full border px-4 py-2 rounded-xl" />
        </div>

        <div className="mb-4">
          <label className="block text-gray-600 font-semibold mb-1">分団</label>
          <select value={division} onChange={(e) => setDivision(e.target.value)}
            className="w-full border px-4 py-2 rounded-xl mb-2">
            {["1分団","2分団","3分団","4分団","5分団","6分団"].map(d => (
              <option key={d}>{d}</option>
            ))}
          </select>
        </div>

        <div className="mb-4">
          <label className="block text-gray-600 font-semibold mb-1">部</label>
          <select value={section} onChange={(e) => setSection(e.target.value)}
            className="w-full border px-4 py-2 rounded-xl mb-2">
            {["1部","2部","3部","4部","5部","6部"].map(s => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>

        <div className="mb-6">
          <label className="block text-gray-600 font-semibold mb-1">役職</label>
          <select value={role} onChange={(e) => setRole(e.target.value)}
            className="w-full border px-4 py-2 rounded-xl mb-4">
            {["団員", "班長", "部長", "副分団長", "分団長", "副団長", "団長"].map(r => (
              <option key={r}>{r}</option>
            ))}
          </select>
        </div>

        <div className="mb-4">
          <label className="block text-gray-600 font-semibold mb-1">CSV出力用の所属</label>
          {divisionSelector}
          {sectionSelector}
        </div>

        <div className="space-y-3 mb-6">
          <button
            onClick={() => exportCheckedListCSV({ division: exportDivision, section: exportSection })}
            disabled={loading}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-xl font-bold shadow disabled:opacity-50"
          >
            {loading ? "📄 保存中..." : "📄 点検リストをCSVで保存"}
          </button>
        </div>

        <div className="mb-6">
          <p className="text-sm text-gray-700 mb-1">🔐 パスワード変更（Googleアカウント変更不可）</p>
          <input
            type="password"
            placeholder="新しいパスワード（6文字以上）"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full border px-4 py-2 rounded-xl mb-2"
            disabled={providerId === "google.com"}
          />
          <button
            onClick={handlePasswordUpdate}
            className="w-full bg-yellow-500 hover:bg-yellow-600 text-white py-2 rounded-xl font-bold shadow"
            disabled={providerId === "google.com"}
          >
            パスワードを変更する
          </button>
        </div>

        <div className="flex justify-between mb-6">
          <button
            onClick={handleSave}
            className="w-[48%] bg-indigo-500 hover:bg-indigo-600 text-white py-2 rounded-xl font-bold shadow"
          >
            アカウント編集保存
          </button>
          <button
            onClick={handleDeleteAccount}
            className="w-[48%] bg-red-500 hover:bg-red-600 text-white py-2 rounded-xl font-bold shadow"
          >
            アカウント削除
          </button>
        </div>

        <button
          onClick={() => navigate("/home")}
          className="w-full text-center text-blue-600 hover:underline mt-4 mb-4 sm:mb-12"
        >
          ← 地図に戻る
        </button>
      </div>
    </div>
  );
};

export default MyPage;
