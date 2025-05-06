import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db, googleProvider } from "../firebase";
import {
  createUserWithEmailAndPassword,
  signInWithPopup,
} from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";

const Signup = ({ setUser }) => {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [division, setDivision] = useState("1分団");
  const [section, setSection] = useState("1部");
  const [role, setRole] = useState("団員");  // ★ 役職
  const [isGoogleUser, setIsGoogleUser] = useState(false);
  const [googleUid, setGoogleUid] = useState(null);
  const [nameError, setNameError] = useState("");

  // ✅ Googleログイン処理
  const handleGoogleSignup = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      setGoogleUid(user.uid);
      setEmail(user.email);
      setIsGoogleUser(true);
    } catch (error) {
      console.error("Google Sign-up Error:", error.message);
    }
  };

  // ✅ Google登録後の追加情報送信
  const handleGoogleInfoSubmit = async (e) => {
    e.preventDefault();
    if (name.trim() === "") {
      setNameError("名前を入力してください");
      return;
    }

    const userData = {
      uid: googleUid,
      name,
      email,
      division,
      section,
      role,
    };

    try {
      await setDoc(doc(db, "users", googleUid), userData);
      setUser(userData);
      navigate("/home");
    } catch (error) {
      console.error("Firestore Save Error:", error.message);
    }
  };

  // ✅ 通常のメールアドレス登録
  const handleEmailSignup = async (e) => {
    e.preventDefault();
    if (name.trim() === "") {
      setNameError("名前を入力してください");
      return;
    }

    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    const userData = {
      uid: user.uid,
      name,
      email,
      division,
      section,
      role,
    };

    try {
      await setDoc(doc(db, "users", user.uid), userData);
      setUser(userData);
      navigate("/home");
    } catch (error) {
      console.error("Signup Error:", error.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="w-full max-w-md bg-white p-6 rounded-lg shadow-lg">
        <h1 className="text-2xl font-bold mb-6 text-center">
          {isGoogleUser ? "追加情報を入力してください" : "新規登録"}
        </h1>

        {/* Googleユーザー用フォーム */}
        {isGoogleUser ? (
          <form onSubmit={handleGoogleInfoSubmit} className="space-y-4">
            <input
              type="text"
              className="w-full px-4 py-3 border rounded-lg"
              placeholder="名前"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            {nameError && <p className="text-red-500">{nameError}</p>}

            <div className="flex space-x-4">
              <select value={division} onChange={(e) => setDivision(e.target.value)} className="w-1/2 border rounded-lg">
                <option value="1分団">1分団</option>
                <option value="2分団">2分団</option>
                <option value="3分団">3分団</option>
                <option value="4分団">4分団</option>
                <option value="5分団">5分団</option>
                <option value="6分団">6分団</option>
              </select>
              <select value={section} onChange={(e) => setSection(e.target.value)} className="w-1/2 border rounded-lg">
                <option value="1部">1部</option>
                <option value="2部">2部</option>
                <option value="3部">3部</option>
                <option value="4部">4部</option>
                <option value="5部">5部</option>
                <option value="6部">6部</option>
              </select>
            </div>

            {/* 🔥 役職選択 */}
            <select value={role} onChange={(e) => setRole(e.target.value)} className="w-full border rounded-lg">
              <option value="団員">団員</option>
              <option value="班長">班長</option>
              <option value="部長">部長</option>
              <option value="副分団長">副分団長</option>
              <option value="分団長">分団長</option>
              <option value="副団長">副団長</option>
              <option value="団長">団長</option>
            </select>

            <button type="submit" className="w-full bg-green-500 text-white py-3 rounded-lg">登録を完了する</button>
          </form>
        ) : (
          <>
            <form onSubmit={handleEmailSignup} className="space-y-4">
              <input
                type="text"
                className="w-full px-4 py-3 border rounded-lg"
                placeholder="名前"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
              {nameError && <p className="text-red-500">{nameError}</p>}

              <input
                type="email"
                className="w-full px-4 py-3 border rounded-lg"
                placeholder="メールアドレス"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <input
                type="password"
                className="w-full px-4 py-3 border rounded-lg"
                placeholder="パスワード（6文字以上）"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />

              <div className="flex space-x-4">
                <select value={division} onChange={(e) => setDivision(e.target.value)} className="w-1/2 border rounded-lg">
                  <option value="1分団">1分団</option>
                  <option value="2分団">2分団</option>
                  <option value="3分団">3分団</option>
                  <option value="4分団">4分団</option>
                  <option value="5分団">5分団</option>
                  <option value="6分団">6分団</option>
                </select>
                <select value={section} onChange={(e) => setSection(e.target.value)} className="w-1/2 border rounded-lg">
                  <option value="1部">1部</option>
                  <option value="2部">2部</option>
                  <option value="3部">3部</option>
                  <option value="4部">4部</option>
                  <option value="5部">5部</option>
                  <option value="6部">6部</option>
                </select>
              </div>

              {/* 🔥 役職選択 */}
              <select value={role} onChange={(e) => setRole(e.target.value)} className="w-full border rounded-lg">
                <option value="団員">団員</option>
                <option value="班長">班長</option>
                <option value="部長">部長</option>
                <option value="副分団長">副分団長</option>
                <option value="分団長">分団長</option>
                <option value="副団長">副団長</option>
                <option value="団長">団長</option>
              </select>

              <button type="submit" className="w-full bg-green-500 text-white py-3 rounded-lg">登録する</button>
            </form>

            <div className="my-6 text-center text-gray-500">または</div>
            <button onClick={handleGoogleSignup} className="w-full bg-blue-500 text-white py-3 rounded-lg">Googleで登録</button>
          </>
        )}

        <p className="mt-6 text-center text-sm text-gray-600">
          アカウントをお持ちですか？{" "}
          <a href="/login" className="text-blue-500 underline">ログインはこちら</a>
        </p>
      </div>
    </div>
  );
};

export default Signup;
