import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import firebase from "firebase/compat/app";
import "firebase/compat/auth";

const firebaseConfig = {
  apiKey: "AIzaSyA1bTOtosdcCvnwKL_IBqpbx0cThiMqMUY",
  authDomain: "karmanisht-989e2.firebaseapp.com",
  projectId: "karmanisht-989e2",
  storageBucket: "karmanisht-989e2.firebasestorage.app",
  messagingSenderId: "913409881561",
  appId: "1:913409881561:web:01b6aa51502f618bfb15c8",
  measurementId: "G-NNY5LQPW5K"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

export { app, auth, firebaseConfig };
