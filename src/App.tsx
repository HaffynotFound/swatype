import { useState, useEffect, useRef, useCallback } from "react";
import { Keyboard, Play, User, Users, Compass, AlertCircle, RefreshCw, LogOut, ArrowRight, Sparkles } from "lucide-react";
import { Player, Room, ClientMessage, ServerMessage, RoomStatus } from "./types";
import { playVictorySound } from "./utils/audio";
import { saveLeaderboardScore } from "./supabase";
import Leaderboard from "./components/Leaderboard";
import RoomLobby from "./components/RoomLobby";
import TypingEngine from "./components/TypingEngine";
import ResultsDisplay from "./components/ResultsDisplay";
import GlobalLeaderboard from "./components/GlobalLeaderboard";

export default function App() {
  // Player persistence identity
  const [playerId, setPlayerId] = useState("");
  const [username, setUsername] = useState("");
  const [isEditingUsername, setIsEditingUsername] = useState(false);

  // Connection and Room states
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [connectionState, setConnectionState] = useState<"idle" | "connecting" | "connected" | "disconnected" | "error">("idle");
  const [lobbyError, setLobbyError] = useState("");

  // UI Lobby Codes Inputs
  const [roomInput, setRoomInput] = useState("");

  // Sound triggers - Track previous status to trigger victory sound exactly once on transition
  const prevStatusRef = useRef<RoomStatus | null>(null);

  // Ref to trigger global leaderboard refresh after score is saved
  const [leaderboardRefreshKey, setLeaderboardRefreshKey] = useState(0);

  // Initialize unique playerId and nickname
  useEffect(() => {
    let storedId = localStorage.getItem("swatype_player_id");
    if (!storedId) {
      storedId = `racer_${Math.random().toString(36).substring(2, 11)}`;
      localStorage.setItem("swatype_player_id", storedId);
    }
    setPlayerId(storedId);

    let storedName = localStorage.getItem("swatype_username");
    if (!storedName) {
      storedName = `Racer ${Math.floor(100 + Math.random() * 900)}`;
      localStorage.setItem("swatype_username", storedName);
    }
    setUsername(storedName);
  }, []);

  // Sync username changes to localStorage
  const handleSaveUsername = (newName: string) => {
    const cleanName = newName.trim();
    if (cleanName) {
      setUsername(cleanName);
      localStorage.setItem("swatype_username", cleanName);
      setIsEditingUsername(false);

      // If already inside an active room, notify the server to synchronize name changes
      if (ws && ws.readyState === WebSocket.OPEN && room) {
        ws.send(JSON.stringify({
          type: "join-room",
          roomId: room.id,
          username: cleanName,
          playerId
        } as ClientMessage));
      }
    }
  };

  // Setup Connection URL
  const connectToRoom = (targetRoomCode: string) => {
    const code = targetRoomCode.trim().toUpperCase();
    if (!code) {
      setLobbyError("Please provide a valid Room Code");
      return;
    }

    setLobbyError("");
    setConnectionState("connecting");

    // WebSocket URL resolution compatible with AI Studio dynamic Cloud Run reverse-proxy hosting
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const socketUrl = `${protocol}//${window.location.host}`;

    const socket = new WebSocket(socketUrl);

    socket.onopen = () => {
      setConnectionState("connected");
      // Join Room Message
      const joinMsg: ClientMessage = {
        type: "join-room",
        roomId: code,
        username: username,
        playerId: playerId
      };
      socket.send(JSON.stringify(joinMsg));
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as ServerMessage;

        if (data.type === "room-update") {
          setRoom(data.room);

          // Play victory sound and save score exactly once when room status transitions to 'results'
          const newStatus = data.room.status;
          if (newStatus === "results" && prevStatusRef.current === "racing") {
            playVictorySound();

            // Save the player's score to the global leaderboard
            const myStats = data.room.players[playerId];
            if (myStats && myStats.wpm > 0) {
              saveLeaderboardScore(
                myStats.username,
                myStats.wpm,
                myStats.accuracy,
                myStats.score
              ).then(() => {
                setLeaderboardRefreshKey((k) => k + 1);
              });
            }
          }
          prevStatusRef.current = newStatus;
        } else if (data.type === "error") {
          setLobbyError(data.message);
          // If kicked or error occurs, teardown socket
          socket.close();
        }
      } catch (err) {
        console.error("Error reading server stream", err);
      }
    };

    socket.onclose = () => {
      setWs(null);
      setRoom(null);
      setConnectionState("disconnected");
    };

    socket.onerror = () => {
      setConnectionState("error");
      setLobbyError("Connection to matchmaking nodes failed.");
    };

    setWs(socket);
  };

  // Client triggers (Server-Authoritative State updates)
  const handleToggleReady = () => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "toggle-ready", playerId } as ClientMessage));
    }
  };

  const handleChangeDuration = (numSeconds: number) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "change-duration", duration: numSeconds } as ClientMessage));
    }
  };

  const handleStartRace = () => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "start-race" } as ClientMessage));
    }
  };

  const handleUpdateProgress = (wpm: number, accuracy: number, progress: number, score: number) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: "update-progress",
        wpm,
        accuracy,
        progress,
        score
      } as ClientMessage));
    }
  };

  const handleKickPlayer = (targetId: string) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "kick-player", targetPlayerId: targetId } as ClientMessage));
    }
  };

  const handleRematch = () => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "rematch" } as ClientMessage));
    }
  };

  const handleLeaveRoom = () => {
    if (ws) {
      ws.close();
    }
    setRoom(null);
    setConnectionState("idle");
    setLobbyError("");
  };

  const handleCreateRoom = () => {
    // Generate an beautiful 4-letter uppercase code
    const randomCode = Math.random().toString(36).substring(2, 6).toUpperCase();
    connectToRoom(randomCode);
  };

  return (
    <div className="min-h-screen bg-[#323437] text-[#d1d0c5] flex flex-col justify-between selection:bg-[#e2b714]/20 selection:text-[#d1d0c5]">
      {/* Header Visual Bar */}
      <header className="border-b border-[#2c2e31]/60 py-4 px-6 bg-[#2c2e31]/40 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={handleLeaveRoom}>
            <div className="bg-[#e2b714] text-[#323437] p-2 rounded-lg font-bold">
              <Keyboard className="w-5 h-5" />
            </div>
            <div>
              <span className="font-mono font-black text-xl tracking-tight text-[#d1d0c5] hover:text-[#e2b714] transition-all">
                swatype
              </span>
              <span className="text-[10px] font-mono text-[#646669] ml-1.5 align-middle bg-[#2c2e31] px-1.5 py-0.5 rounded font-bold uppercase tracking-widest">
                v1.0 MVP
              </span>
            </div>
          </div>

          {/* Profile Nickname Widget */}
          <div className="flex items-center gap-3">
            {isEditingUsername ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  defaultValue={username}
                  maxLength={16}
                  id="username-edit-input"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleSaveUsername((e.target as HTMLInputElement).value);
                    }
                  }}
                  onBlur={(e) => handleSaveUsername(e.target.value)}
                  className="bg-[#2c2e31] border border-[#e2b714] text-sm text-[#d1d0c5] px-3 py-1.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#e2b714]/15 font-mono max-w-[150px]"
                  autoFocus
                />
                <button
                  onClick={() => handleSaveUsername(username)}
                  className="font-mono text-xs text-[#e2b714] bg-[#e2b714]/10 hover:bg-[#e2b714]/20 px-2 py-1.5 rounded-lg transition-all"
                >
                  Save
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsEditingUsername(true)}
                title="Change nickname"
                className="flex items-center gap-2 border border-[#2c2e31] hover:border-[#3c3e41] bg-[#2c2e31]/60 hover:bg-[#2c2e31] px-3 py-2 rounded-xl transition-all group"
              >
                <div className="w-6 h-6 rounded-full bg-[#2c2e31] flex items-center justify-center">
                  <User className="w-3.5 h-3.5 text-[#e2b714]" />
                </div>
                <span className="font-mono text-sm group-hover:text-[#e2b714] transition-all">
                  {username}
                </span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Container Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 flex flex-col justify-center">
        {connectionState === "idle" || !room ? (
          /* LANDING PAGE DIRECT ENTRY */
          <div className="max-w-5xl w-full mx-auto lg:grid lg:grid-cols-3 lg:gap-8 animate-fade-in py-12">
          {/* Left/Center: Original landing content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Logo and Intro Section */}
            <div className="text-center space-y-3">
              <div className="inline-block bg-[#e2b714]/10 border border-[#e2b714]/20 rounded-full px-4 py-1.5 mb-2">
                <span className="font-mono text-xs text-[#e2b714] flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 animate-pulse" /> Real-Time Multiplayer Typing Competition
                </span>
              </div>
              <h1 className="font-sans font-black text-6xl text-[#e2b714] tracking-tight selection:bg-[#e2b714]/10">
                swatype
              </h1>
              <p className="font-mono text-xs text-[#646669] lowercase max-w-sm mx-auto">
                minimalist real-time multiplayer keyboard matches. generate a lobby code, invite your rival, type.
              </p>
            </div>

            {/* Error alerts */}
            {lobbyError && (
              <div className="bg-[#ca4754]/10 border border-[#ca4754]/30 rounded-xl p-4 flex items-center gap-3 max-w-md mx-auto text-[#ca4754]">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm font-semibold">{lobbyError}</span>
              </div>
            )}

            {/* Lobby Entry Options */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-lg mx-auto">
              {/* Box 1: Create room */}
              <div className="bg-[#2c2e31] border border-[#2c2e31]/60 rounded-xl p-6 flex flex-col justify-between hover:border-[#3c3e41] hover:shadow-xl transition-all duration-300">
                <div>
                  <Users className="w-8 h-8 text-[#e2b714] mb-3" />
                  <h3 className="font-sans font-extrabold text-lg text-[#d1d0c5]">
                    Initiate Room
                  </h3>
                  <p className="text-xs text-[#646669] mt-1 font-sans">
                    Launch a fresh private room instance and invite competitor typists.
                  </p>
                </div>
                <button
                  onClick={handleCreateRoom}
                  disabled={connectionState === "connecting"}
                  id="create-room-btn"
                  className="w-full mt-6 bg-[#e2b714] hover:bg-[#f5c61a] active:scale-98 text-[#323437] font-sans font-bold py-3.5 px-4 rounded-xl shadow-lg transition-all text-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
                >
                  {connectionState === "connecting" ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Connecting...</span>
                    </>
                  ) : (
                    <>
                      <span>Create Lobby</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>

              {/* Box 2: Join room */}
              <div className="bg-[#2c2e31] border border-[#2c2e31]/60 rounded-xl p-6 flex flex-col justify-between hover:border-[#3c3e41] hover:shadow-xl transition-all duration-300">
                <div>
                  <Compass className="w-8 h-8 text-[#e2b714] mb-3" />
                  <h3 className="font-sans font-extrabold text-lg text-[#d1d0c5]">
                    Join Lobby
                  </h3>
                  <p className="text-xs text-[#646669] mt-1 font-sans">
                    Type a unique lobby code to enter your friend's typing arena.
                  </p>
                </div>

                <div className="mt-6 space-y-2">
                  <input
                    type="text"
                    value={roomInput}
                    disabled={connectionState === "connecting"}
                    onChange={(e) => setRoomInput(e.target.value.toUpperCase().slice(0, 8))}
                    placeholder="ENTER CODE (e.g. AB12)"
                    id="join-code-input"
                    className="w-full bg-[#323437] border border-[#2c2e31] focus:border-[#e2b714] font-mono font-bold tracking-widest text-[#d1d0c5] placeholder-[#646669] text-center p-3 rounded-lg focus:outline-none transition-all uppercase text-sm disabled:opacity-50"
                  />
                  <button
                    onClick={() => connectToRoom(roomInput)}
                    disabled={!roomInput.trim() || connectionState === "connecting"}
                    id="join-room-btn"
                    className="w-full bg-[#3c3e41] hover:bg-[#3c3e41]/85 active:scale-x-98 disabled:opacity-50 text-[#d1d0c5] hover:text-[#e2b714] font-sans font-bold py-3 px-4 rounded-xl transition-all text-sm flex items-center justify-center gap-2 cursor-pointer disabled:pointer-events-none"
                  >
                    {connectionState === "connecting" ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Connecting...</span>
                      </>
                    ) : (
                      <>
                        <span>Connect Arena</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Global Leaderboard */}
          <div className="lg:col-span-1 mt-8 lg:mt-0">
            <GlobalLeaderboard key={leaderboardRefreshKey} />
          </div>
          </div>
        ) : (
          /* ACTIVE ARENA ZONE Screen */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start py-6">
            {/* Left/Middle Layout Column: Room lobby, Race display or Results screen */}
            <div className="lg:col-span-2 space-y-6">
              {/* Show error notification overlay in the race room if any */}
              {lobbyError && (
                <div className="bg-[#ca4754]/10 border border-[#ca4754]/30 rounded-xl p-4 flex items-center justify-between text-[#ca4754]">
                  <span className="text-sm font-semibold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" /> {lobbyError}
                  </span>
                  <button
                    onClick={() => setLobbyError("")}
                    className="text-xs font-mono border border-[#ca4754]/30 hover:bg-[#ca4754]/20 px-2.5 py-1 rounded-md"
                  >
                    Ack
                  </button>
                </div>
              )}

              {/* Step-by-Step Render state machine */}
              {room.status === "lobby" && (
                <RoomLobby
                  room={room}
                  playerId={playerId}
                  onToggleReady={handleToggleReady}
                  onChangeDuration={handleChangeDuration}
                  onStartRace={handleStartRace}
                  onKickPlayer={handleKickPlayer}
                />
              )}

              {(room.status === "countdown" || room.status === "racing") && (
                <TypingEngine
                  room={room}
                  playerId={playerId}
                  onUpdateProgress={handleUpdateProgress}
                />
              )}

              {room.status === "results" && (
                <ResultsDisplay
                  players={room.players}
                  hostId={room.hostId}
                  playerId={playerId}
                  onRematch={handleRematch}
                  onLeaveRoom={handleLeaveRoom}
                />
              )}
            </div>

            {/* Right Column Layout: Side Standings Leaderboard panel is always live! */}
            <div className="lg:col-span-1">
              <Leaderboard players={room.players} currentRoomStatus={room.status} />

              <div className="bg-[#2c2e31]/60 border border-[#2c2e31]/80 rounded-xl p-4 mt-4 font-mono text-xs text-[#646669] space-y-2">
                <div className="flex justify-between">
                  <span>Room Identity:</span>
                  <span className="text-[#d1d0c5] font-bold">{room.id}</span>
                </div>
                <div className="flex justify-between">
                  <span>Time Limits:</span>
                  <span className="text-[#e2b714] font-medium">{room.duration}s Preset</span>
                </div>
                <div className="flex justify-between">
                  <span>WS State:</span>
                  <span className="text-green-500 font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block animate-ping" /> Connection Active
                  </span>
                </div>
                <div className="pt-2 border-t border-[#2c2e31]/40 flex justify-between items-center text-[10px]">
                  <span>Ready to join other lobbies?</span>
                  <button
                    onClick={handleLeaveRoom}
                    className="text-[#ca4754] hover:underline flex items-center gap-1 font-sans cursor-pointer"
                  >
                    <LogOut className="w-3 h-3" /> Disconnect
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer Branding block */}
      <footer className="border-t border-[#2c2e31]/40 py-5 text-center font-mono text-[11px] text-[#646669] bg-[#2c2e31]/20">
        <p>
          swatype &copy; {new Date().getFullYear()} &mdash; minimalist, ultra-fast typing speed races
        </p>
      </footer>
    </div>
  );
}
