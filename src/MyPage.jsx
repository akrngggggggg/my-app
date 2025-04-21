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

const MyPage = ({ user }) => {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [division, setDivision] = useState("");
  const [section, setSection] = useState("");
  const [newPassword, setNewPassword] = useState("");

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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-100 via-white to-gray-200 px-4">
      <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-xl border border-gray-200">
        <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">👤 マイページ</h2>

        <div className="mb-4">
          <label className="block text-gray-600 font-semibold mb-1">名前</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className="w-full border px-4 py-2 rounded-xl" />
        </div>

        <div className="mb-4">
          <label className="block text-gray-600 font-semibold mb-1">分団</label>
          <select value={division} onChange={(e) => setDivision(e.target.value)} className="w-full border px-4 py-2 rounded-xl">
            <option value="">選択してください</option>
            <option value="1分団">1分団</option>
            <option value="2分団">2分団</option>
            <option value="3分団">3分団</option>
            <option value="4分団">4分団</option>
            <option value="5分団">5分団</option>
            <option value="6分団">6分団</option>
          </select>
        </div>

        <div className="mb-6">
          <label className="block text-gray-600 font-semibold mb-1">部</label>
          <select value={section} onChange={(e) => setSection(e.target.value)} className="w-full border px-4 py-2 rounded-xl">
            <option value="">選択してください</option>
            <option value="1部">1部</option>
            <option value="2部">2部</option>
            <option value="3部">3部</option>
            <option value="4部">4部</option>
            <option value="5部">5部</option>
            <option value="6部">6部</option>
          </select>
        </div>

        <div className="space-y-3 mb-6">
          <button onClick={() => exportCheckedListCSV({ division, section })} className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-xl font-bold shadow">
            📄 CSVで保存
          </button>
          <button onClick={async () => {
            await exportCheckedListCSV({ division, section });
            setTimeout(() => {
              window.open(`https://line.me/R/msg/text/?【${division}${section}】点検リストCSVを共有します。ファイルを添付して送信してください。`, "_blank");
            }, 500);
          }} className="w-full bg-green-500 hover:bg-green-600 text-white py-2 rounded-xl font-bold shadow">
            📤 LINEで共有
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
          />
          <button
            onClick={handlePasswordUpdate}
            className="w-full bg-yellow-500 hover:bg-yellow-600 text-white py-2 rounded-xl font-bold shadow"
          >
            パスワードを変更する
          </button>
        </div>

        <div className="flex justify-between mb-6">
          <button onClick={handleSave} className="w-[48%] bg-indigo-500 hover:bg-indigo-600 text-white py-2 rounded-xl font-bold shadow">
            アカウント編集保存
          </button>
          <button onClick={handleDeleteAccount} className="w-[48%] bg-red-500 hover:bg-red-600 text-white py-2 rounded-xl font-bold shadow">
            アカウント削除
          </button>
        </div>

        <button onClick={() => navigate("/home")} className="w-full text-center text-blue-600 hover:underline">
          ← 地図に戻る
        </button>
      </div>
    </div>
  );
};

export default MyPage;