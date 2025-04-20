// Home.jsx
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

  return (
    <div className="h-[100dvh] w-screen flex flex-col bg-gray-100 overflow-hidden">
      
      {/* 上部バー：固定配置 */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-white shadow-md flex items-center justify-between px-4 py-2">
        {/* 🔵 左側：ログイン情報 */}
        <div className="text-sm font-semibold text-gray-700 truncate">
          {user?.name}（{user?.division} {user?.section}）でログイン中
        </div>

        {/* 🔵 右側：マイページ & ログアウト */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate("/mypage")}
            className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm font-semibold shadow"
          >
            マイページ
          </button>
          <button
            onClick={handleLogout}
            className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm font-semibold shadow"
          >
            ログアウト
          </button>
        </div>
      </div>

      {/* マップ部分：ヘッダー高さ分だけ余白取る */}
      <div className="flex-1 pt-[60px]"> {/* header高さ: 60px */}
        <MapView division={user?.division} section={user?.section} />
      </div>
    </div>
  );
};

export default Home;
