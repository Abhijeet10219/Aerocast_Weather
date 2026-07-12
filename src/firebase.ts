/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp, getApps, getApp } from "firebase/app";
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  GoogleAuthProvider, 
  signInWithPopup,
  User as FirebaseUser
} from "firebase/auth";
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  query, 
  where,
  Firestore
} from "firebase/firestore";
import firebaseConfig from "../firebase-applet-config.json";

// Initialize Firebase
let app;
let auth: any = null;
let db: any = null;
let googleProvider: any = null;
let isMockFirebase = false;

try {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  auth = getAuth(app);
  db = getFirestore(app);
  googleProvider = new GoogleAuthProvider();
  console.log("Firebase initialized successfully with project ID:", firebaseConfig.projectId);
} catch (error) {
  console.error("Firebase failed to initialize. Falling back to local state storage:", error);
  isMockFirebase = true;
}

// Mock database storage if Firebase falls back
const localDatabase: { [collection: string]: { [id: string]: any } } = JSON.parse(
  localStorage.getItem("weather_mock_db") || "{}"
);

const saveLocalDb = () => {
  localStorage.setItem("weather_mock_db", JSON.stringify(localDatabase));
};

export { auth, db, googleProvider, isMockFirebase };

// Collection Helpers with robust Fallback
export async function getDocument(col: string, id: string): Promise<any | null> {
  if (isMockFirebase || !db) {
    if (!localDatabase[col]) localDatabase[col] = {};
    return localDatabase[col][id] || null;
  }
  try {
    const docRef = doc(db, col, id);
    const snap = await getDoc(docRef);
    return snap.exists() ? snap.data() : null;
  } catch (err: any) {
    if (err && err.message && err.message.includes('offline')) {
      console.warn(`Firestore is offline. Reading offline local database fallback for ${col}/${id}`);
    } else {
      console.error(`Error fetching document from ${col}/${id}:`, err);
    }
    if (!localDatabase[col]) localDatabase[col] = {};
    return localDatabase[col][id] || null;
  }
}

export async function setDocument(col: string, id: string, data: any): Promise<void> {
  if (isMockFirebase || !db) {
    if (!localDatabase[col]) localDatabase[col] = {};
    localDatabase[col][id] = data;
    saveLocalDb();
    return;
  }
  try {
    const docRef = doc(db, col, id);
    await setDoc(docRef, data, { merge: true });
  } catch (err: any) {
    if (err && err.message && err.message.includes('offline')) {
      console.warn(`Firestore is offline. Storing ${col}/${id} in local database fallback.`);
    } else {
      console.error(`Error setting document in ${col}/${id}:`, err);
    }
    if (!localDatabase[col]) localDatabase[col] = {};
    localDatabase[col][id] = data;
    saveLocalDb();
  }
}

export async function deleteDocument(col: string, id: string): Promise<void> {
  if (isMockFirebase || !db) {
    if (localDatabase[col]) {
      delete localDatabase[col][id];
      saveLocalDb();
    }
    return;
  }
  try {
    const docRef = doc(db, col, id);
    await deleteDoc(docRef);
  } catch (err: any) {
    if (err && err.message && err.message.includes('offline')) {
      console.warn(`Firestore is offline. Deleting ${col}/${id} from local database fallback.`);
    } else {
      console.error(`Error deleting document from ${col}/${id}:`, err);
    }
    if (localDatabase[col]) {
      delete localDatabase[col][id];
      saveLocalDb();
    }
  }
}

export async function queryCollection(col: string, field: string, operator: '==' | 'array-contains', value: any): Promise<any[]> {
  if (isMockFirebase || !db) {
    if (!localDatabase[col]) return [];
    const items = Object.values(localDatabase[col]);
    return items.filter((item: any) => {
      if (operator === '==') {
        return item[field] === value;
      } else if (operator === 'array-contains') {
        return Array.isArray(item[field]) && item[field].includes(value);
      }
      return false;
    });
  }
  try {
    const colRef = collection(db, col);
    const q = query(colRef, where(field, operator, value));
    const snap = await getDocs(q);
    const list: any[] = [];
    snap.forEach(d => list.push({ ...d.data(), id: d.id }));
    return list;
  } catch (err: any) {
    if (err && err.message && err.message.includes('offline')) {
      console.warn(`Firestore is offline. Querying local database fallback for ${col}`);
    } else {
      console.error(`Error querying collection ${col}:`, err);
    }
    if (!localDatabase[col]) return [];
    return Object.values(localDatabase[col]).filter((item: any) => item[field] === value);
  }
}

export async function getAllDocuments(col: string): Promise<any[]> {
  if (isMockFirebase || !db) {
    if (!localDatabase[col]) return [];
    return Object.values(localDatabase[col]);
  }
  try {
    const colRef = collection(db, col);
    const snap = await getDocs(colRef);
    const list: any[] = [];
    snap.forEach(d => list.push({ ...d.data(), id: d.id }));
    return list;
  } catch (err) {
    console.error(`Error getting all documents from ${col}:`, err);
    if (!localDatabase[col]) return [];
    return Object.values(localDatabase[col]);
  }
}
