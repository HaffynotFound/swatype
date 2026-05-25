import { initializeApp, FirebaseApp } from "firebase/app";
import {
  getFirestore,
  collection,
  addDoc,
  query,
  orderBy,
  limit,
  getDocs,
  Firestore,
} from "firebase/firestore";

// ─── Leaderboard Entry Type ────────────────────────────────────────────────
export interface LeaderboardEntry {
  username: string;
  wpm: number;
  accuracy: number;
  score: number;
  timestamp: number;
}

// ─── Firebase Configuration (read from Vite env vars) ──────────────────────
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Determine if real Firebase credentials are available
const isFirebaseConfigured =
  !!firebaseConfig.apiKey &&
  !!firebaseConfig.projectId &&
  firebaseConfig.apiKey !== "undefined" &&
  firebaseConfig.projectId !== "undefined";

let app: FirebaseApp | null = null;
let db: Firestore | null = null;

if (isFirebaseConfigured) {
  try {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    console.log("[swatype] Firebase Firestore connected successfully.");
  } catch (err) {
    console.warn("[swatype] Firebase initialization failed, falling back to localStorage.", err);
  }
}

export { isFirebaseConfigured };

// ─── Collection name ───────────────────────────────────────────────────────
const COLLECTION_NAME = "leaderboard";
const LOCAL_STORAGE_KEY = "swatype_leaderboard";

// ─── LocalStorage Fallback Helpers ─────────────────────────────────────────
function getLocalScores(): LeaderboardEntry[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalScore(entry: LeaderboardEntry): void {
  const scores = getLocalScores();
  scores.push(entry);
  // Keep only top 50 to avoid bloating localStorage
  scores.sort((a, b) => b.wpm - a.wpm);
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(scores.slice(0, 50)));
}

// ─── Public API ────────────────────────────────────────────────────────────

/**
 * Save a score to the leaderboard (Firebase or localStorage fallback).
 */
export async function saveLeaderboardScore(
  username: string,
  wpm: number,
  accuracy: number,
  score: number
): Promise<void> {
  const entry: LeaderboardEntry = {
    username,
    wpm: Math.round(wpm),
    accuracy: Math.round(accuracy),
    score: Math.round(score),
    timestamp: Date.now(),
  };

  if (db) {
    try {
      await addDoc(collection(db, COLLECTION_NAME), entry);
    } catch (err) {
      console.warn("[swatype] Firestore write failed, saving locally.", err);
      saveLocalScore(entry);
    }
  } else {
    saveLocalScore(entry);
  }
}

/**
 * Retrieve the top N scores from the leaderboard (Firebase or localStorage fallback).
 */
export async function getTopScores(count: number = 5): Promise<LeaderboardEntry[]> {
  if (db) {
    try {
      const q = query(
        collection(db, COLLECTION_NAME),
        orderBy("wpm", "desc"),
        limit(count)
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => doc.data() as LeaderboardEntry);
    } catch (err) {
      console.warn("[swatype] Firestore read failed, reading locally.", err);
    }
  }

  // Fallback to localStorage
  const localScores = getLocalScores();
  localScores.sort((a, b) => b.wpm - a.wpm);
  return localScores.slice(0, count);
}
