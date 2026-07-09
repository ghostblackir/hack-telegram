// استفاده از لینک مستقیم CDN برای اینکه مرورگر ارور نده
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, onAuthStateChanged, RecaptchaVerifier } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, increment } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// کانفیگ اختصاصی خودت
const firebaseConfig = {
  apiKey: "AIzaSyCKGR-kZpIowWukh8fnbr-hepGuXyZG3Vg",
  authDomain: "ghost-3151c.firebaseapp.com",
  projectId: "ghost-3151c",
  storageBucket: "ghost-3151c.firebasestorage.app",
  messagingSenderId: "538505756050",
  appId: "1:538505756050:web:1448b00baff4018cc4954b"
};

// استارت زدن سرویس‌ها
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// اکسپورت کردن ابزارها برای استفاده در بقیه فایل‌ها
export { 
  auth, 
  db, 
  createUserWithEmailAndPassword, 
  onAuthStateChanged, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc,
  RecaptchaVerifier, 
  increment 
};