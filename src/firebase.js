import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyB-NpIJFsVexnJNDYts85KFK_gxaOXjpb8',
  authDomain: 'edivy-crm-core.firebaseapp.com',
  projectId: 'edivy-crm-core',
  storageBucket: 'edivy-crm-core.firebasestorage.app',
  messagingSenderId: '572362948939',
  appId: '1:572362948939:web:4fc60b446a882cbd2be8ce',
};

// This line prevents the "Duplicate App" crash
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const db = getFirestore(app);
