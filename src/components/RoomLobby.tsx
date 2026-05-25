import { useState } from "react";
import { Player, Room } from "../types";
import { Copy, Check, Shield, UserX, Play, Settings, RefreshCw, UserCheck } from "lucide-react";

interface RoomLobbyProps {
  room: Room;
  playerId: string;
  onToggleReady: () => void;
  onChangeDuration: (dur: number) => void;
  onStartRace: () => void;
  onKickPlayer: (targetId: string) => void;
}

export default function RoomLobby({
  room,
  playerId,
  onToggleReady,
  onChangeDuration,
  onStartRace,
  onKickPlayer,
}: RoomLobbyProps) {
  const [copied, setCopied] = useState(false);
  const playersList = Object.values(room.players);
  const me = room.players[playerId];
  const isHost = room.hostId === playerId;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(room.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const readyCount = playersList.filter((p) => p.ready).length;
  const canStart = isHost && playersList.length >= 1; // Allow solo-testing or playing together

  return (
    <div className="w-full max-w-3xl mx-auto bg-[#2c2e31] border border-[#2c2e31]/60 rounded-xl p-8 shadow-2xl">
      {/* Lobby Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border-b border-[#3c3e41]/60 pb-6 mb-8">
        <div>
          <span className="font-mono text-xs uppercase tracking-widest text-[#e2b714] font-semibold">
            MULTIPLAYER LOBBY
          </span>
          <h1 className="font-sans font-bold text-3xl text-[#d1d0c5] tracking-tight mt-1">
            Room Code: <span className="font-mono text-[#e2b714] selection:bg-[#e2b714]/25">{room.id}</span>
          </h1>
          <p className="text-sm text-[#646669] mt-1.5 font-sans">
            Share this room code with friends to race in real-time.
          </p>
        </div>

        <button
          onClick={handleCopyCode}
          id="copy-room-code-btn"
          className="flex items-center gap-2 bg-[#3c3e41] hover:bg-[#3c3e41]/85 text-[#d1d0c5] active:scale-95 transition-all font-mono text-sm px-4 py-3 rounded-lg border border-[#2c2e31] hover:border-[#e2b714]/40"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 text-green-500" />
              <span>Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              <span>Copy Code</span>
            </>
          )}
        </button>
      </div>

      {/* Lobby Settings / Hosts Controls */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="md:col-span-2 bg-[#323437] border border-[#3c3e41]/60 rounded-xl p-5">
          <h3 className="font-mono text-xs uppercase text-[#646669] mb-4 flex items-center gap-2">
            <Settings className="w-3.5 h-3.5 text-[#e2b714]" /> Race Parameters
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-mono text-[#646669] mb-2">
                DURATION PRESET
              </label>
              <div className="flex gap-2">
                {[30, 60, 120].map((dur) => (
                  <button
                    key={dur}
                    disabled={!isHost}
                    onClick={() => onChangeDuration(dur)}
                    className={`flex-1 font-mono text-sm py-2 px-4 rounded-lg border transition-all ${
                      room.duration === dur
                        ? "bg-[#e2b714]/15 border-[#e2b714] text-[#e2b714] font-bold shadow-md shadow-[#e2b714]/5"
                        : "bg-[#2c2e31] border-[#3c3e41]/60 text-[#646669] hover:text-[#d1d0c5] hover:border-[#e2b714]/40 disabled:opacity-50"
                    }`}
                  >
                    {dur}s
                  </button>
                ))}
              </div>
              {!isHost && (
                <span className="text-[10px] font-mono text-[#646669] mt-1.5 block">
                  Only the host can modify race length.
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col justify-between bg-[#323437] border border-[#3c3e41]/60 rounded-xl p-5">
          <div>
            <h4 className="font-mono text-xs uppercase text-[#646669] mb-2">
              Lobby State
            </h4>
            <div className="space-y-2 mt-1">
              <div className="flex justify-between items-center text-xs font-mono text-[#d1d0c5]">
                <span className="text-[#646669]">Total Players:</span>
                <span>{playersList.length}</span>
              </div>
              <div className="flex justify-between items-center text-xs font-mono text-[#d1d0c5]">
                <span className="text-[#646669]">Ready:</span>
                <span className="text-[#e2b714]">{readyCount} / {playersList.length}</span>
              </div>
            </div>
          </div>

          <div className="mt-4">
            {isHost ? (
              <button
                onClick={onStartRace}
                disabled={!canStart}
                id="host-start-race-btn"
                className="w-full flex items-center justify-center gap-2 bg-[#e2b714] hover:bg-[#f5c61a] disabled:bg-[#2c2e31] disabled:text-[#646669] disabled:border-transparent text-[#323437] font-sans font-bold py-3 px-4 rounded-lg shadow-lg active:scale-98 transition-all disabled:pointer-events-none"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Start Practice Race</span>
              </button>
            ) : (
              <button
                onClick={onToggleReady}
                id="player-toggle-ready-btn"
                className={`w-full flex items-center justify-center gap-2 font-sans font-bold py-3 px-4 rounded-lg transform active:scale-98 transition-all ${
                  me?.ready
                    ? "bg-emerald-500/15 border border-emerald-500 text-emerald-400 hover:bg-emerald-500/20"
                    : "bg-[#2c2e31] border border-[#3c3e41]/50 text-[#d1d0c5] hover:bg-[#3c3e41] hover:border-[#e2b714]/30"
                }`}
              >
                {me?.ready ? "I am Ready!" : "Mark Ready"}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Players List Grid */}
      <div>
        <h3 className="font-mono text-xs uppercase text-[#646669] mb-4 tracking-wider flex items-center gap-2">
          <UserCheck className="w-3.5 h-3.5 text-[#e2b714]" /> Joined Players
        </h3>
        <div className="border border-[#3c3e41]/60 rounded-xl overflow-hidden bg-[#323437]">
          <div className="grid grid-cols-1 divide-y divide-[#3c3e41]/60">
            {playersList.map((p) => {
              const isMe = p.id === playerId;
              return (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-4 bg-[#2c2e31]/60 hover:bg-[#2c2e31] transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        p.ready ? "bg-emerald-500 shadow-md shadow-emerald-500/30" : "bg-amber-500 shadow-sm shadow-amber-500/30"
                      }`}
                      title={p.ready ? "Ready" : "Not Ready"}
                    />
                    <div className="flex items-center gap-2 font-sans">
                      <span className={`text-sm font-semibold ${isMe ? "text-[#e2b714]" : "text-[#d1d0c5]"}`}>
                        {p.username}
                      </span>
                      {isMe && (
                        <span className="text-[10px] bg-[#e2b714]/10 text-[#e2b714] px-1.5 py-0.5 rounded border border-[#e2b714]/20 font-mono">
                          You
                        </span>
                      )}
                      {p.isHost && (
                        <span className="text-[10px] bg-sky-500/10 text-sky-400 px-1.5 py-0.5 rounded border border-sky-500/20 font-mono flex items-center gap-0.5">
                          <Shield className="w-2.5 h-2.5" /> Host
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Ready Badge text */}
                    <span className={`font-mono text-xs px-2.5 py-1 rounded-md ${
                      p.ready 
                        ? "bg-emerald-500/10 text-emerald-500 font-bold border border-emerald-500/25" 
                        : "bg-[#3c3e41] text-[#646669]"
                    }`}>
                      {p.ready ? "READY" : "LOBBY"}
                    </span>

                    {/* Host Kick Action */}
                    {isHost && !isMe && (
                      <button
                        onClick={() => onKickPlayer(p.id)}
                        title="Kick player from room"
                        className="text-[#646669] hover:text-[#ca4754] bg-[#2c2e31]/30 hover:bg-[#ca4754]/10 p-1.5 rounded-lg border border-transparent hover:border-[#ca4754]/20 transition-all active:scale-90"
                      >
                        <UserX className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
