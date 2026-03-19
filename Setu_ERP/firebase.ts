// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";
import { getFirestore, collection, onSnapshot, doc, addDoc, updateDoc, deleteDoc, getDocs, query, where } from "firebase/firestore";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAqmdjImKroKZDZITHZt8VXs_Ac7mJ8vwE",
  authDomain: "setu-erp-c18a5.firebaseapp.com",
  projectId: "setu-erp-c18a5",
  storageBucket: "setu-erp-c18a5.firebasestorage.app",
  messagingSenderId: "883837400479",
  appId: "1:883837400479:web:68ce6c42b0fd42a8fe79aa",
  measurementId: "G-EMGSM2KY95"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Initialize Firestore
export const db = getFirestore(app);

// Initialize Auth for anonymous access
export const auth = getAuth(app);

// Sign in anonymously to enable Firestore access
signInAnonymously(auth)
  .then((result) => {
    console.log("✓ Anonymous auth successful. User ID:", result.user.uid);
  })
  .catch((err) => {
    console.error("✗ Anonymous auth failed:", err.code, err.message);
  });

// Export Firestore functions
export {
  collection,
  onSnapshot,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  signInAnonymously,
  onAuthStateChanged
};

export default app;
