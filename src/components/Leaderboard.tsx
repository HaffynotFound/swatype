import { Player } from "../types";
import { Award, Zap, CheckCircle2 } from "lucide-react";

interface LeaderboardProps {
  players: Record<string, Player>;
  currentRoomStatus: string;
}

export default function Leaderboard({ players, currentRoomStatus }: LeaderboardProps) {
  const playerList = Object.values(players);

  // Sorting logic based on PRD:
  // 1. Highest final score
  // 2. Higher WPM if tied
  // 3. Higher accuracy if still tied
  const sortedPlayers = [...playerList].sort((a, b) => {
    const scoreA = a.score || 0;
    const scoreB = b.score || 0;
    if (scoreB !== scoreA) {
      return scoreB - scoreA;
    }

    const wpmA = a.wpm || 0;
    const wpmB = b.wpm || 0;
    if (wpmB !== wpmA) {
      return wpmB - wpmA;
    }

    const accA = a.accuracy || 0;
    const accB = b.accuracy || 0;
    return accB - accA;
  });

  return (
    <div className="w-full bg-[#2c2e31] rounded-lg border border-[#2c2e31]/60 p-5 shadow-xl transition-all duration-300">
      <div className="flex items-center justify-between border-b border-[#3c3e41]/60 pb-3 mb-4">
        <h3 className="font-mono text-sm uppercase tracking-wider text-[#646669] flex items-center gap-2">
          <Award className="w-4 h-4 text-[#e2b714]" /> Standings
        </h3>
        <span className="font-mono text-xs bg-[#3c3e41] text-[#e2b714] px-2 py-0.5 rounded">
          {playerList.length} {playerList.length === 1 ? "Racer" : "Racers"}
        </span>
      </div>

      <div className="space-y-4">
        {sortedPlayers.map((player, rankIndex) => {
          const isFinished = player.progress >= 100;
          const finalScore = Math.round(player.score);

          // Different colored awards for top 3
          let rankColor = "text-[#646669]";
          let rankBg = "bg-[#3c3e41]";
          if (rankIndex === 0) {
            rankColor = "text-[#323437]";
            rankBg = "bg-[#e2b714]"; // Gold
          } else if (rankIndex === 1) {
            rankColor = "text-[#323437]";
            rankBg = "bg-[#a0a0a5]"; // Silver
          } else if (rankIndex === 2) {
            rankColor = "text-[#323437]";
            rankBg = "bg-[#b08d57]"; // Bronze
          }

          return (
            <div
              key={player.id}
              className={`relative rounded-md border p-3.5 transition-all duration-300 ${
                isFinished 
                  ? "bg-[#3c3e41]/50 border-emerald-500/30" 
                  : "bg-[#323437] border-[#3c3e41]/40"
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  {/* Rank Badge */}
                  <span className={`w-5 h-5 flex items-center justify-center rounded font-mono text-xs font-bold ${rankBg} ${rankColor}`}>
                    {rankIndex + 1}
                  </span>
                  
                  {/* Name */}
                  <span className="font-sans font-semibold text-sm text-[#d1d0c5] flex items-center gap-1.5 truncate max-w-[120px]">
                    {player.username}
                    {player.isHost && (
                      <span className="text-[10px] bg-[#e2b714]/10 text-[#e2b714] border border-[#e2b714]/30 px-1 py-0.2 rounded font-mono">
                        Host
                      </span>
                    )}
                  </span>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-3 font-mono text-xs">
                  <span className="text-[#646669]" title="Words Per Minute">
                    <strong className="text-[#d1d0c5] font-medium">{Math.round(player.wpm)}</strong> WPM
                  </span>
                  <span className="text-[#646669]" title="Accuracy %">
                    <strong className="text-[#d1d0c5] font-medium">{Math.round(player.accuracy)}</strong>%
                  </span>
                  <span className="text-[#646669]" title="Score = WPM * Accuracy">
                    Score: <strong className="text-[#e2b714] font-bold">{finalScore}</strong>
                  </span>
                </div>
              </div>

              {/* Progress Line */}
              <div className="relative mt-2">
                <div className="w-full bg-[#3c3e41]/40 rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      isFinished ? "bg-emerald-500" : "bg-[#e2b714]"
                    }`}
                    style={{ width: `${player.progress}%` }}
                  />
                </div>

                {/* Micro Indicator overlay */}
                <div className="flex justify-between items-center mt-1">
                  <span className="font-mono text-[10px] text-[#55575a]">
                    Progress
                  </span>
                  <span className="font-mono text-[10px] text-[#d1d0c5] flex items-center gap-1">
                    {Math.round(player.progress)}%
                    {isFinished && <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
