import { createClient, SupabaseClient } from "@supabase/supabase-js";

// ─── Leaderboard Entry Type ────────────────────────────────────────────────
export interface LeaderboardEntry {
  username: string;
  wpm: number;
  accuracy: number;
  score: number;
  timestamp: number;
}

// ─── Supabase Configuration (read from Vite env vars) ──────────────────────
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Determine if Supabase credentials are available
const isSupabaseConfigured =
  !!supabaseUrl &&
  !!supabaseAnonKey &&
  supabaseUrl !== "undefined" &&
  supabaseAnonKey !== "undefined";

let supabase: SupabaseClient | null = null;

if (isSupabaseConfigured) {
  try {
    supabase = createClient(supabaseUrl, supabaseAnonKey);
    console.log("[swatype] Supabase connected successfully.");
  } catch (err) {
    console.warn("[swatype] Supabase initialization failed, falling back to localStorage.", err);
  }
}

export { isSupabaseConfigured };

// ─── Collection name ───────────────────────────────────────────────────────
const TABLE_NAME = "leaderboard";
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
 * Save a score to the leaderboard (Supabase or localStorage fallback).
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

  if (supabase) {
    try {
      const { error } = await supabase.from(TABLE_NAME).insert([entry]);
      if (error) {
        console.warn("[swatype] Supabase write failed:", error.message);
        saveLocalScore(entry);
      }
    } catch (err) {
      console.warn("[swatype] Supabase write failed, saving locally.", err);
      saveLocalScore(entry);
    }
  } else {
    saveLocalScore(entry);
  }
}

/**
 * Retrieve the top N scores from the leaderboard (Supabase or localStorage fallback).
 */
export async function getTopScores(count: number = 5): Promise<LeaderboardEntry[]> {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from(TABLE_NAME)
        .select("*")
        .order("wpm", { ascending: false })
        .limit(count);

      if (error) {
        console.warn("[swatype] Supabase read failed:", error.message);
      } else if (data) {
        return data as LeaderboardEntry[];
      }
    } catch (err) {
      console.warn("[swatype] Supabase read failed, reading locally.", err);
    }
  }

  // Fallback to localStorage
  const localScores = getLocalScores();
  localScores.sort((a, b) => b.wpm - a.wpm);
  return localScores.slice(0, count);
}
