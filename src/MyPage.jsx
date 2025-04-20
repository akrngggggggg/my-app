import React, { useEffect, useState } from "react";
import { getAuth, deleteUser } from "firebase/auth";
import { db } from "./firebase";
import { doc, getDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

const MyPage = ({ user }) => {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [division, setDivision] = useState("");
  const [section, setSection] = useState("");

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
      }
    };
    fetchUserInfo();
  }, [user]);

  const handleSave = async () => {
    if (!name.trim() || !division || !section) {
      alert("名前・分団・部をすべて入力してください");
      return;
    }

    await updateDoc(doc(db, "users", user.uid), {
      name,
      division,
      section,
    });

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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="w-full max-w-md bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-bold mb-6 text-center">マイページ</h2>

        {/* 🔤 名前入力欄 */}
        <div className="mb-4">
          <label className="block text-gray-700 font-semibold mb-1">名前</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border border-gray-300 px-3 py-2 rounded-lg"
            placeholder="名前を入力"
          />
        </div>

        {/* 🏢 分団 */}
        <div className="mb-4">
          <label className="block text-gray-700 font-semibold mb-1">分団</label>
          <select
            value={division}
            onChange={(e) => setDivision(e.target.value)}
            className="w-full border border-gray-300 px-3 py-2 rounded-lg"
          >
            <option value="">選択してください</option>
            <option value="1分団">1分団</option>
            <option value="2分団">2分団</option>
            <option value="3分団">3分団</option>
            <option value="4分団">4分団</option>
            <option value="5分団">5分団</option>
            <option value="6分団">6分団</option>
          </select>
        </div>

        {/* 📌 部 */}
        <div className="mb-6">
          <label className="block text-gray-700 font-semibold mb-1">部</label>
          <select
            value={section}
            onChange={(e) => setSection(e.target.value)}
            className="w-full border border-gray-300 px-3 py-2 rounded-lg"
          >
            <option value="">選択してください</option>
            <option value="1部">1部</option>
            <option value="2部">2部</option>
            <option value="3部">3部</option>
            <option value="4部">4部</option>
            <option value="5部">5部</option>
            <option value="6部">6部</option>
          </select>
        </div>

        {/* ✅ 更新・削除ボタン */}
        <div className="flex justify-between mb-6">
          <button
            onClick={handleSave}
            className="w-[48%] bg-green-500 hover:bg-green-600 text-white py-2 rounded-lg font-semibold shadow"
          >
            保存
          </button>
          <button
            onClick={handleDeleteAccount}
            className="w-[48%] bg-red-500 hover:bg-red-600 text-white py-2 rounded-lg font-semibold shadow"
          >
            アカウント削除
          </button>
        </div>

        {/* 戻る */}
        <button
          onClick={() => navigate("/home")}
          className="w-full text-center text-blue-500 underline"
        >
          ← 地図に戻る
        </button>
      </div>
    </div>
  );
};

export default MyPage;
