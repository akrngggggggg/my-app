// Home.jsx（MapView中心＋上部にユーザー情報＆ログアウト）
import React from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../firebase";
import MapView from "../MapView";

const Home = ({ user }) => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await auth.signOut();
    navigate("/login");
  };
  console.log("🔥 ユーザー情報:", user);
  return (
    <div className="h-screen w-screen flex flex-col">
      {/* 上部バー */}
      <div className="flex items-center justify-between px-4 py-2 bg-white shadow-md z-10">
        <div className="text-sm text-gray-700">
          {user?.name}（{user?.division} {user?.section}）でログイン中
        </div>
        <button
          onClick={handleLogout}
          className="bg-red-500 hover:bg-red-600 text-white px-4 py-1 rounded text-sm font-semibold shadow"
        >
          ログアウト
        </button>
      </div>

      {/* メイン：マップ表示 */}
      <div className="flex-1">
      <MapView division={user?.division} section={user?.section} />
      </div>
    </div>
  );
};

export default Home;
