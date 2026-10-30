import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBb9BKnHOE1fBarWsMaAsjlLp725dRcgxE",
  authDomain: "ngawadul-virtual-room.firebaseapp.com",
  projectId: "ngawadul-virtual-room",
  storageBucket: "ngawadul-virtual-room.firebasestorage.app",
  messagingSenderId: "906418060946",
  appId: "1:906418060946:web:93e001fa0c7b27aa4a704b"
};

export const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const db = getFirestore(app);