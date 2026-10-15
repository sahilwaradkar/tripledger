"use client";

import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import {
  connectAuthEmulator,
  getAuth,
  type Auth,
} from "firebase/auth";
import {
  CACHE_SIZE_UNLIMITED,
  connectFirestoreEmulator,
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "demo-api-key",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "demo.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "demo-tripleger",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "demo.appspot.com",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "123456789",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "1:123456789:web:abc",
};

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let authEmulatorConnected = false;
let firestoreEmulatorConnected = false;

function shouldUseEmulators() {
  return (
    process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === "true" &&
    typeof window !== "undefined"
  );
}

function connectAuthEmulatorIfNeeded() {
  if (!shouldUseEmulators() || authEmulatorConnected || !auth) return;
  try {
    connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  } catch {
    // Already connected (e.g. after Fast Refresh).
  }
  authEmulatorConnected = true;
}

function connectFirestoreEmulatorIfNeeded() {
  if (!shouldUseEmulators() || firestoreEmulatorConnected || !db) return;
  try {
    connectFirestoreEmulator(db, "127.0.0.1", 8080);
  } catch {
    // Already connected (e.g. after Fast Refresh).
  }
  firestoreEmulatorConnected = true;
}

export function getFirebaseApp() {
  if (!app) {
    app = getApps().length ? getApps()[0]! : initializeApp(firebaseConfig);
  }
  return app;
}

export function getFirebaseAuth() {
  if (!auth) {
    auth = getAuth(getFirebaseApp());
    connectAuthEmulatorIfNeeded();
  }
  return auth;
}

export function getFirestoreDb() {
  if (!db) {
    const firebaseApp = getFirebaseApp();
    try {
      db = initializeFirestore(firebaseApp, {
        localCache: persistentLocalCache({
          cacheSizeBytes: CACHE_SIZE_UNLIMITED,
          tabManager: persistentMultipleTabManager(),
        }),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (!message.includes("already been called")) throw error;
      db = getFirestore(firebaseApp);
    }
    connectFirestoreEmulatorIfNeeded();
  }
  return db;
}
