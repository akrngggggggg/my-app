import React, { useState } from "react";
import { auth, db, googleProvider } from "../firebase";
import {
  signInWithEmailAndPassword,
  signInWithPopup
} from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";

const Login = ({ setUser }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  // ✅ メールログイン
  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      const user = result.user;

      const docSnap = await getDoc(doc(db, "users", user.uid));
      if (docSnap.exists()) {
        const data = docSnap.data();
        setUser({
          uid: user.uid,
          email: user.email,
          name: data.name,
          division: data.division,
          section: data.section,
          role: data.role || "団員" // 🔥 役職もセット、未設定なら「団員」
        });
        navigate("/home");
      } else {
        alert("ログイン成功しましたが、ユーザーデータが見つかりませんでした。");
      }
    } catch (error) {
      console.error("Login Error: ", error.message);
    }
  };

  // ✅ Googleログイン
  const handleGoogleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      const docSnap = await getDoc(doc(db, "users", user.uid));
      if (docSnap.exists()) {
        const data = docSnap.data();
        setUser({
          uid: user.uid,
          email: user.email,
          name: data.name,
          division: data.division,
          section: data.section,
          role: data.role || "団員"
        });
        navigate("/home");
      } else {
        alert("Googleログイン成功しましたが、ユーザーデータが見つかりませんでした。");
      }
    } catch (error) {
      console.error("Google Login Error: ", error.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="w-full max-w-md bg-white p-6 rounded-lg shadow-lg">
        <h1 className="text-2xl font-bold mb-6 text-center">ログイン</h1>
        <form onSubmit={handleLogin} className="space-y-4">
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
            placeholder="パスワード"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button
            type="submit"
            className="w-full bg-green-500 text-white py-3 rounded-lg"
          >
            ログイン
          </button>
        </form>

        <div className="my-6 text-center text-gray-500">または</div>

        <button
          onClick={handleGoogleLogin}
          className="w-full bg-blue-500 text-white py-3 rounded-lg"
        >
          Googleでログイン
        </button>

        <p className="mt-6 text-center text-sm text-gray-600">
          アカウントをお持ちでないですか？{" "}
          <a href="/signup" className="text-blue-500 underline">
            新規登録はこちら
          </a>
        </p>
      </div>
    </div>
  );
};

export default Login;
