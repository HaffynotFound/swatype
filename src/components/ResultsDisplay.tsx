import { Player } from "../types";
import { Award, RotateCcw, Home, PlusCircle, CheckCircle2 } from "lucide-react";

interface ResultsDisplayProps {
  players: Record<string, Player>;
  hostId: string;
  playerId: string;
  onRematch: () => void;
  onLeaveRoom: () => void;
}

export default function ResultsDisplay({
  players,
  hostId,
  playerId,
  onRematch,
  onLeaveRoom,
}: ResultsDisplayProps) {
  const isHost = hostId === playerId;
  const playerList = Object.values(players);

  // Determine rankings
  const rankedPlayers = [...playerList].sort((a, b) => {
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

  const winner = rankedPlayers[0];
  const myStat = players[playerId] || { wpm: 0, accuracy: 100, score: 0 };

  return (
    <div className="w-full max-w-3xl mx-auto bg-[#2c2e31] border border-[#2c2e31]/60 rounded-xl p-8 shadow-2xl">
      {/* Winner Display Header */}
      {winner && (
        <div className="relative text-center border-b border-[#3c3e41]/60 pb-8 mb-8 overflow-hidden rounded-lg bg-[#e2b714]/5 p-6 border-dashed border-[#e2b714]/30">
          <div className="absolute top-0 inset-x-0 h-1 bg-[#e2b714]" />
          <Award className="w-12 h-12 text-[#e2b714] mx-auto mb-2 animate-bounce" />
          <span className="font-mono text-xs uppercase tracking-wider text-[#646669]">
            Race Winner
          </span>
          <h2 className="font-sans font-black text-3xl text-[#e2b714] mt-1">
            {winner.username}
          </h2>
          <p className="font-mono text-xs text-[#a1a1a6] mt-1">
            Finished with a magnificent score of <strong className="text-[#e2b714]">{Math.round(winner.score)}</strong> ({Math.round(winner.wpm)} WPM @ {Math.round(winner.accuracy)}% accuracy)
          </p>
        </div>
      )}

      {/* Personal Stats Section */}
      <div className="mb-8">
        <h3 className="font-mono text-xs uppercase text-[#646669] mb-4 tracking-widest">
          Your Performance
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-[#323437] border border-[#3c3e41]/60 rounded-xl p-6 text-center">
            <span className="font-mono text-[#646669] text-xs uppercase block">TYPING WPM</span>
            <span className="font-sans font-extrabold text-4xl text-[#d1d0c5] mt-2 block">
              {Math.round(myStat.wpm)}
            </span>
          </div>

          <div className="bg-[#323437] border border-[#3c3e41]/60 rounded-xl p-6 text-center">
            <span className="font-mono text-[#646669] text-xs uppercase block">ACCURACY</span>
            <span className="font-sans font-extrabold text-4xl text-[#d1d0c5] mt-2 block">
              {Math.round(myStat.accuracy)}%
            </span>
          </div>

          <div className="bg-[#323437] border border-[#3c3e41]/60 p-6 rounded-xl text-center border-[#e2b714]/30 shadow-md shadow-[#e2b714]/5">
            <span className="font-mono text-[#e2b714] text-xs uppercase block">FINAL SCORE</span>
            <span className="font-sans font-black text-4xl text-[#e2b714] mt-2 block">
              {Math.round(myStat.score)}
            </span>
          </div>
        </div>
      </div>

      {/* Complete Rankings Standings Grid */}
      <div className="mb-8">
        <h3 className="font-mono text-xs uppercase text-[#646669] mb-4 tracking-widest">
          Race Rankings Table
        </h3>
        <div className="border border-[#3c3e41]/60 rounded-xl overflow-hidden bg-[#323437]">
          <table className="w-full text-left font-sans text-sm">
            <thead className="bg-[#2c2e31] text-[#646669] font-mono text-xs uppercase border-b border-[#3c3e41]/60">
              <tr>
                <th className="px-5 py-3">Rank</th>
                <th className="px-5 py-3">Racer</th>
                <th className="px-5 py-3 text-right">WPM</th>
                <th className="px-5 py-3 text-right">Accuracy</th>
                <th className="px-5 py-3 text-right">Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#3c3e41]/60">
              {rankedPlayers.map((player, idx) => {
                const isMe = player.id === playerId;
                return (
                  <tr
                    key={player.id}
                    className={`hover:bg-[#2c2e31]/60 transition-all ${
                      isMe ? "bg-[#e2b714]/10" : ""
                    }`}
                  >
                    <td className="px-5 py-4 font-mono font-bold text-xs text-[#646669]">
                      <span className={`inline-block px-1.5 py-0.5 rounded ${
                        idx === 0 
                          ? "bg-[#e2b714] text-[#323437] font-extrabold" 
                          : "bg-[#3c3e41] text-[#d1d0c5]"
                      }`}>
                        #{idx + 1}
                      </span>
                    </td>
                    <td className="px-5 py-4 font-semibold text-[#d1d0c5]">
                      <span className="flex items-center gap-1.5">
                        {player.username}
                        {isMe && (
                          <span className="text-[9px] bg-[#e2b714]/15 text-[#e2b714] border border-[#e2b714]/20 px-1 py-0.1 rounded font-mono">
                            YOU
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="px-5 py-4 font-mono text-right text-[#d1d0c5]">
                      {Math.round(player.wpm)}
                    </td>
                    <td className="px-5 py-4 font-mono text-right text-[#d1d0c5]">
                      {Math.round(player.accuracy)}%
                    </td>
                    <td className="px-5 py-4 font-mono text-right font-bold text-[#e2b714]">
                      {Math.round(player.score)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Host Action and Shared Actions */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-[#323437] border border-[#3c3e41]/60 p-5 rounded-xl">
        <div className="text-center sm:text-left">
          <span className="font-mono text-xs text-[#646669] uppercase block">
            ROOM LOBBY STATUS
          </span>
          <p className="text-xs text-[#d1d0c5] mt-1 font-sans">
            {isHost
              ? "Start a new rematch when all players are ready."
              : "Waiting for host to trigger the rematch..."}
          </p>
        </div>

        <div className="flex gap-3 w-full sm:w-auto">
          {isHost && (
            <button
              onClick={onRematch}
              id="host-rematch-btn"
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-[#e2b714] hover:bg-[#f5c61a] active:scale-95 text-[#323437] font-sans font-bold py-2.5 px-5 rounded-lg shadow-lg shadow-[#e2b714]/5 transition-all text-sm cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Rematch</span>
            </button>
          )}

          <button
            onClick={onLeaveRoom}
            id="leave-room-btn"
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-transparent hover:bg-[#323437] text-[#a1a1a6] hover:text-[#d1d0c5] active:scale-95 py-2.5 px-4 rounded-lg font-sans border border-[#3c3e41]/60 hover:border-[#e2b714]/40 transition-all text-sm cursor-pointer"
          >
            <Home className="w-4 h-4" />
            <span>Leave Room</span>
          </button>
        </div>
      </div>
    </div>
  );
}
