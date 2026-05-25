import { useState, useEffect } from "react";
import { Trophy, Flame, Cloud, HardDrive, RefreshCw } from "lucide-react";
import { getTopScores, isSupabaseConfigured, LeaderboardEntry } from "../supabase";

export default function GlobalLeaderboard() {
  const [scores, setScores] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchScores = async () => {
    setLoading(true);
    try {
      const topScores = await getTopScores(5);
      setScores(topScores);
    } catch (err) {
      console.error("[swatype] Failed to fetch leaderboard scores.", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScores();

    // Poll every 30 seconds for fresh scores
    const interval = setInterval(fetchScores, 30000);
    return () => clearInterval(interval);
  }, []);

  // Rank badge styling
  const getRankStyle = (index: number) => {
    if (index === 0) return { bg: "bg-[#e2b714]", text: "text-[#323437]" }; // Gold
    if (index === 1) return { bg: "bg-[#a0a0a5]", text: "text-[#323437]" }; // Silver
    if (index === 2) return { bg: "bg-[#b08d57]", text: "text-[#323437]" }; // Bronze
    return { bg: "bg-[#3c3e41]", text: "text-[#d1d0c5]" };
  };

  return (
    <div className="w-full bg-[#2c2e31] border border-[#2c2e31]/60 rounded-xl p-5 shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#3c3e41]/60 pb-3 mb-4">
        <h3 className="font-mono text-sm uppercase tracking-wider text-[#646669] flex items-center gap-2">
          <Trophy className="w-4 h-4 text-[#e2b714]" /> Global Top 5
        </h3>
        <button
          onClick={fetchScores}
          title="Refresh leaderboard"
          className="text-[#646669] hover:text-[#e2b714] transition-all p-1 rounded-md hover:bg-[#3c3e41]/40"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* DB Connection Badge */}
      <div className="flex items-center gap-1.5 mb-4">
        {isSupabaseConfigured ? (
          <span className="flex items-center gap-1 text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full">
            <Cloud className="w-2.5 h-2.5" /> Supabase Cloud
          </span>
        ) : (
          <span className="flex items-center gap-1 text-[10px] font-mono bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full">
            <HardDrive className="w-2.5 h-2.5" /> Local Fallback DB
          </span>
        )}
      </div>

      {/* Scores List */}
      {loading && scores.length === 0 ? (
        <div className="text-center py-8">
          <RefreshCw className="w-5 h-5 text-[#646669] mx-auto animate-spin mb-2" />
          <span className="font-mono text-xs text-[#646669]">Loading scores...</span>
        </div>
      ) : scores.length === 0 ? (
        <div className="text-center py-8">
          <Flame className="w-6 h-6 text-[#646669] mx-auto mb-2 opacity-50" />
          <p className="font-mono text-xs text-[#646669]">
            No scores yet.
          </p>
          <p className="font-mono text-[10px] text-[#55575a] mt-1">
            Complete a race to claim the #1 spot!
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {scores.map((entry, idx) => {
            const rankStyle = getRankStyle(idx);
            return (
              <div
                key={`${entry.username}-${entry.timestamp}-${idx}`}
                className="flex items-center justify-between bg-[#323437] border border-[#3c3e41]/40 rounded-lg px-3.5 py-3 hover:border-[#3c3e41] transition-all"
              >
                <div className="flex items-center gap-2.5">
                  {/* Rank Badge */}
                  <span
                    className={`w-5 h-5 flex items-center justify-center rounded font-mono text-xs font-bold ${rankStyle.bg} ${rankStyle.text}`}
                  >
                    {idx + 1}
                  </span>

                  {/* Username */}
                  <span className="font-sans font-semibold text-sm text-[#d1d0c5] truncate max-w-[100px]">
                    {entry.username}
                  </span>
                </div>

                {/* WPM */}
                <div className="text-right">
                  <span className="font-mono text-sm font-bold text-[#e2b714]">
                    {entry.wpm}
                  </span>
                  <span className="font-mono text-[10px] text-[#646669] ml-1">
                    WPM
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer hint */}
      <div className="mt-4 pt-3 border-t border-[#3c3e41]/40 text-center">
        <p className="font-mono text-[10px] text-[#55575a]">
          Scores are saved after each completed race
        </p>
      </div>
    </div>
  );
}
