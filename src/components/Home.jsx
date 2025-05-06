import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../firebase";
import MapView from "../MapView";

const Home = ({ user }) => {
  const navigate = useNavigate();

  // 🔥 user の division / section を state にして MapView に渡す
  const [selectedDivision, setSelectedDivision] = useState(user?.division);
  const [selectedSection, setSelectedSection] = useState(user?.section);

  const handleLogout = async () => {
    await auth.signOut();
    navigate("/login");
  };

  return (
    <div className="h-[100dvh] w-screen flex flex-col bg-gray-100 overflow-hidden">
      <div className="fixed top-0 left-0 right-0 z-50 bg-white shadow-md flex flex-col md:flex-row md:items-center md:justify-between px-4 py-2 gap-2">
        <div className="text-sm font-semibold text-gray-700 truncate">
          {user?.name}（{user?.division} {user?.section} / {user?.role || "役職未設定"}）でログイン中
        </div>
        <div className="flex gap-2">
          <button onClick={() => navigate("/mypage")} className="bg-blue-500 text-white px-3 py-1 rounded text-sm">
            マイページ
          </button>
          <button onClick={handleLogout} className="bg-red-500 text-white px-3 py-1 rounded text-sm">
            ログアウト
          </button>
        </div>
      </div>

      <div className="flex-1 pt-[80px]">
        <MapView
          division={selectedDivision}
          section={selectedSection}
          setDivision={setSelectedDivision}
          setSection={setSelectedSection}
          user={user}
        />
      </div>
    </div>
  );
};

export default Home;
