import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Signup from "./components/Signup";
import Login from "./components/Login";
import Home from "./components/Home";
import MyPage from "./MyPage";
import { auth, db } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        const docRef = doc(db, "users", currentUser.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setUser({
            uid: currentUser.uid,
            email: currentUser.email,
            name: data.name,
            division: data.division,
            section: data.section,
          });
        } else {
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) return <div className="text-center mt-10">読み込み中...</div>;

  return (
    <Router>
      <Routes>
       <Route path="/" element={user ? <Navigate to="/home" /> : <Navigate to="/signup" />} />
       <Route path="/signup" element={user ? <Navigate to="/home" /> : <Signup setUser={setUser} />} />
       <Route path="/login" element={user ? <Navigate to="/home" /> : <Login setUser={setUser} />} />
       <Route path="/home" element={user ? <Home user={user} /> : <Navigate to="/login" />} />
       <Route path="/mypage" element={user ? <MyPage user={user} /> : <Navigate to="/login" />} />
      </Routes>
    </Router>
  );
}

export default App;
