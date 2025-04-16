// firebase.js

// 必要な機能をインポート
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";


// Firebase の設定情報 (すでにあなたのものが設定されている)
const firebaseConfig = {
  apiKey: "AIzaSyAS7b2Bp3Voswu4hI93IYx-N4BEUlsqrF4",
  authDomain: "fire-hydrants-9d3f1.firebaseapp.com",
  databaseURL: "https://fire-hydrants-9d3f1-default-rtdb.firebaseio.com",
  projectId: "fire-hydrants-9d3f1",
  storageBucket: "fire-hydrants-9d3f1.appspot.com",  // 修正: `firebasestorage.app` を `appspot.com` に変更
  messagingSenderId: "658716195379",
  appId: "1:658716195379:web:82edaccd3c06583be48146",
  measurementId: "G-Q984BQ94N5"
};

// Firebase を初期化
const app = initializeApp(firebaseConfig);

// Firebase の各サービスをエクスポート
export const auth = getAuth(app);         // 認証機能
export const db = getFirestore(app);      // Firestore データベース
export const googleProvider = new GoogleAuthProvider();
