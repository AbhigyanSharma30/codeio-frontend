import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyASaCoHNfm7Z_PWnhkSvQrCUvuRLdr2Ee0",
  authDomain: "mern-code-editor.firebaseapp.com",
  projectId: "mern-code-editor",
  storageBucket: "mern-code-editor.firebasestorage.app",
  messagingSenderId: "698820022521",
  appId: "1:698820022521:web:536bb448767d06db435228"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const firestore = getFirestore(app);
