import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getDatabase } from "firebase/database";
import { getAuth, signInAnonymously } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL // ✅ 追加：Realtime Database の URL
};

// Firebase の初期化
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const database = getDatabase(app);
const auth = getAuth(app);

// 匿名認証でサインイン
signInAnonymously(auth)
  .then(() => {
    console.log("✅ 認証成功：匿名ユーザーとしてサインインしました");
  })
  .catch((error) => {
    console.error("❌ 認証エラー：", error);
  });

export { db, database, auth };
