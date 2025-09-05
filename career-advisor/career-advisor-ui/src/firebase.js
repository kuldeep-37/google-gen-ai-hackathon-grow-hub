import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCftlmawBoR8MY_OOGohTuV9pP_zRZKp3g",
  authDomain: "career-advisor-90625.firebaseapp.com",
  projectId: "career-advisor-90625",
  storageBucket: "career-advisor-90625.appspot.com",
  messagingSenderId: "885991658411",
  appId: "1:885991658411:web:e78ed40a6701fab60f38ee"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
