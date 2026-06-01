import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import express from "express";
import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import { getRandomCorpus } from "./src/words";
import { Room, Player, ClientMessage, ServerMessage, RoomStatus } from "./src/types";

async function startServer() {
  const app = express();
  const server = createServer(app);
  const wss = new WebSocketServer({ noServer: true });

  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  // In-memory state
  const rooms = new Map<string, Room>();
  const socketsMap = new Map<WebSocket, { playerId: string; roomId: string }>();
  const roomIntervals = new Map<string, NodeJS.Timeout>();

  // Utility to broadcast updates to a room
  function broadcastToRoom(roomId: string, message: ServerMessage) {
    const json = JSON.stringify(message);
    let count = 0;
    for (const [ws, info] of socketsMap.entries()) {
      if (info.roomId === roomId && ws.readyState === WebSocket.OPEN) {
        ws.send(json);
        count++;
      }
    }
  }

  // Handle HTTP API health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", roomsCount: rooms.size });
  });

  // AI Feedback endpoint (solo practice mode)
  const genAiApiKey = process.env.GEMINI_API_KEY || "";
  let aiClient: GoogleGenAI | null = null;
  if (genAiApiKey) {
    try {
      aiClient = new GoogleGenAI({ apiKey: genAiApiKey });
    } catch (err) {
      console.warn("[swatype] Failed to initialize GoogleGenAI client:", err);
    }
  }

  const COACH_SYSTEM_PROMPT = `You are an expert typing coach. You analyze typing performance data and provide concise, supportive, actionable feedback.

When given stats, respond with:
1. A brief encouraging summary of their performance (1-2 sentences)
2. 2-3 specific areas to work on based on their error patterns, speed, and accuracy
3. 1-2 practical drills or techniques they can try

Keep your response under 250 words. Be encouraging and specific. Use plain text without markdown formatting.`;

  app.post("/api/ai-feedback", express.json(), async (req, res) => {
    try {
      if (!aiClient) {
        return res.json({ message: "AI Coach is not available right now. Set GEMINI_API_KEY to enable it." });
      }

      const { action, stats, message, history } = req.body;

      if (action === "analyze" && stats) {
        const statsBlock = `
Player Stats:
- WPM: ${Math.round(stats.wpm)}
- Accuracy: ${Math.round(stats.accuracy)}%
- Score: ${Math.round(stats.score)}
- Duration: ${stats.duration}s
- Words: ${stats.wordsCorrect} correct out of ${stats.wordsTotal} total
- Keystrokes: ${stats.correctKeystrokes} correct out of ${stats.totalKeystrokes} total
- Word-by-word errors: ${stats.wordResults ? stats.wordResults.filter((w: any) => !w.correct).length : "N/A"} mistyped words
`;

        const response = await aiClient.models.generateContent({
          model: "gemini-2.0-flash",
          contents: [{ role: "user", parts: [{ text: `${COACH_SYSTEM_PROMPT}\n\nHere is the typing data:\n${statsBlock}` }] }],
        });
        return res.json({ message: response.text || "Analysis complete." });
      }

      if (action === "chat") {
        const contents: any[] = [
          { role: "user", parts: [{ text: COACH_SYSTEM_PROMPT }] },
          { role: "model", parts: [{ text: "Understood. I am an expert typing coach. I will analyze stats and respond with concise, actionable feedback." }] },
        ];

        if (stats) {
          const statsBlock = `The player's stats for context:\n- WPM: ${Math.round(stats.wpm)}\n- Accuracy: ${Math.round(stats.accuracy)}%\n- Score: ${Math.round(stats.score)}\n- Duration: ${stats.duration}s\n- Words: ${stats.wordsCorrect}/${stats.wordsTotal}\n- Keystrokes: ${stats.correctKeystrokes}/${stats.totalKeystrokes}\n- Mistyped words: ${stats.wordResults ? stats.wordResults.filter((w: any) => !w.correct).length : "N/A"}`;
          contents.push({ role: "user", parts: [{ text: statsBlock }] });
          contents.push({ role: "model", parts: [{ text: "Got it. I have the player's stats for context." }] });
        }

        if (history && Array.isArray(history)) {
          for (const msg of history) {
            contents.push({ role: msg.role === "assistant" ? "model" : "user", parts: [{ text: msg.content }] });
          }
        }

        contents.push({ role: "user", parts: [{ text: message || "Give me some typing tips." }] });

        const response = await aiClient.models.generateContent({
          model: "gemini-2.0-flash",
          contents,
        });
        return res.json({ message: response.text || "I'm here to help!" });
      }

      return res.json({ message: "Send typing stats for analysis or a chat message for coaching advice." });
    } catch (err: any) {
      console.error("[swatype] AI feedback error:", err);
      return res.status(500).json({ message: "Sorry, I encountered an error processing your request. Please try again." });
    }
  });

  // Attach WebSocket upgrade handling to same port
  server.on("upgrade", (request, socket, head) => {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit("connection", ws, request);
    });
  });

  // WebSocket Server Handling
  wss.on("connection", (ws: WebSocket) => {
    ws.on("message", (rawMsg: string) => {
      try {
        const msg = JSON.parse(rawMsg) as ClientMessage;

        switch (msg.type) {
          case "join-room": {
            const { roomId: rawRoomId, username, playerId } = msg;
            const roomId = rawRoomId.trim().toUpperCase();

            if (!roomId) {
              ws.send(JSON.stringify({ type: "error", message: "Invalid room code" } as ServerMessage));
              return;
            }

            let room = rooms.get(roomId);

            if (!room) {
              // Create room if it doesn't exist
              room = {
                id: roomId,
                hostId: playerId,
                status: "lobby",
                duration: 60,
                corpus: getRandomCorpus(150),
                players: {},
                countdownTime: 5,
                timeRemaining: 60,
                raceStartedAt: null,
              };
              rooms.set(roomId, room);
            }

            // Reject if race has already started (allow back in if they disconnected and were already on the player list)
            if (room.status !== "lobby" && !room.players[playerId]) {
              ws.send(JSON.stringify({ type: "error", message: "This race has already started! Join later." } as ServerMessage));
              return;
            }

            // Add or update player to room
            const existingPlayer = room.players[playerId];
            room.players[playerId] = {
              id: playerId,
              username: username || existingPlayer?.username || `Racer ${Object.keys(room.players).length + 1}`,
              wpm: existingPlayer?.wpm || 0,
              accuracy: existingPlayer?.accuracy || 100,
              progress: existingPlayer?.progress || 0,
              score: existingPlayer?.score || 0,
              ready: existingPlayer?.ready || false,
              isHost: room.hostId === playerId,
            };

            // Link connection
            socketsMap.set(ws, { playerId, roomId });

            // Broadcast room update
            broadcastToRoom(roomId, { type: "room-update", room });
            break;
          }

          case "toggle-ready": {
            const info = socketsMap.get(ws);
            if (!info) return;

            const room = rooms.get(info.roomId);
            if (!room || room.status !== "lobby") return;

            const player = room.players[info.playerId];
            if (player) {
              player.ready = !player.ready;
              broadcastToRoom(room.id, { type: "room-update", room });
            }
            break;
          }

          case "change-duration": {
            const info = socketsMap.get(ws);
            if (!info) return;

            const room = rooms.get(info.roomId);
            if (!room || room.status !== "lobby") return;

            // Host only
            if (room.hostId !== info.playerId) return;

            const newDuration = msg.duration;
            if ([30, 60, 120].includes(newDuration)) {
              room.duration = newDuration;
              room.timeRemaining = newDuration;
              broadcastToRoom(room.id, { type: "room-update", room });
            }
            break;
          }

          case "kick-player": {
            const info = socketsMap.get(ws);
            if (!info) return;

            const room = rooms.get(info.roomId);
            if (!room || room.status !== "lobby") return;

            // Host only
            if (room.hostId !== info.playerId) return;

            const targetId = msg.targetPlayerId;
            if (room.players[targetId]) {
              delete room.players[targetId];

              // Disconnect target ws if alive
              for (const [tWs, tInfo] of socketsMap.entries()) {
                if (tInfo.playerId === targetId && tInfo.roomId === room.id) {
                  tWs.send(JSON.stringify({ type: "error", message: "You were kicked from the lobby by the host." } as ServerMessage));
                  socketsMap.delete(tWs);
                  tWs.close();
                }
              }

              broadcastToRoom(room.id, { type: "room-update", room });
            }
            break;
          }

          case "start-race": {
            const info = socketsMap.get(ws);
            if (!info) return;

            const room = rooms.get(info.roomId);
            if (!room || room.status !== "lobby") return;

            // Host only
            if (room.hostId !== info.playerId) return;

            // Switch status to countdown
            room.status = "countdown";
            room.countdownTime = 5;
            room.corpus = getRandomCorpus(150); // Get fresh random words

            // Reset scores & progress for all players
            for (const pId in room.players) {
              room.players[pId].wpm = 0;
              room.players[pId].accuracy = 100;
              room.players[pId].progress = 0;
              room.players[pId].score = 0;
            }

            broadcastToRoom(room.id, { type: "room-update", room });

            // Start countdown interval
            if (roomIntervals.has(room.id)) {
              clearInterval(roomIntervals.get(room.id)!);
            }

            const countdownInterval = setInterval(() => {
              const currentRoom = rooms.get(room.id);
              if (!currentRoom || currentRoom.status !== "countdown") {
                clearInterval(countdownInterval);
                return;
              }

              if (currentRoom.countdownTime > 1) {
                currentRoom.countdownTime -= 1;
                broadcastToRoom(room.id, { type: "room-update", room: currentRoom });
              } else {
                clearInterval(countdownInterval);
                currentRoom.status = "racing";
                currentRoom.countdownTime = 0;
                currentRoom.timeRemaining = currentRoom.duration;
                currentRoom.raceStartedAt = Date.now();
                broadcastToRoom(room.id, { type: "room-update", room: currentRoom });

                // Transition to racing timer
                startRacingTimer(room.id);
              }
            }, 1000);

            roomIntervals.set(room.id, countdownInterval);
            break;
          }

          case "update-progress": {
            const info = socketsMap.get(ws);
            if (!info) return;

            const room = rooms.get(info.roomId);
            if (!room || room.status !== "racing") return;

            const player = room.players[info.playerId];
            if (player) {
              player.wpm = msg.wpm;
              player.accuracy = msg.accuracy;
              player.progress = Math.min(100, Math.max(0, msg.progress));
              player.score = msg.score;

              // Check if all players completed the test early
              const allFinished = Object.values(room.players).every(p => p.progress >= 100);

              if (allFinished) {
                // Clear timer and end the race
                if (roomIntervals.has(room.id)) {
                  clearInterval(roomIntervals.get(room.id)!);
                }
                room.status = "results";
                room.timeRemaining = 0;
                for (const pId in room.players) {
                  room.players[pId].ready = false;
                }
                broadcastToRoom(room.id, { type: "room-update", room });
              } else {
                broadcastToRoom(room.id, { type: "room-update", room });
              }
            }
            break;
          }

          case "rematch": {
            const info = socketsMap.get(ws);
            if (!info) return;

            const room = rooms.get(info.roomId);
            if (!room || room.status !== "results") return;

            // Host only
            if (room.hostId !== info.playerId) return;

            if (roomIntervals.has(room.id)) {
              clearInterval(roomIntervals.get(room.id)!);
            }

            room.status = "lobby";
            room.countdownTime = 5;
            room.timeRemaining = room.duration;
            room.raceStartedAt = null;

            // Reset player race stats for the lobby
            for (const pId in room.players) {
              room.players[pId].wpm = 0;
              room.players[pId].accuracy = 100;
              room.players[pId].progress = 0;
              room.players[pId].score = 0;
              room.players[pId].ready = false;
            }

            broadcastToRoom(room.id, { type: "room-update", room });
            break;
          }
        }
      } catch (err) {
        console.error("Error parsing message", err);
      }
    });

    ws.on("close", () => {
      const info = socketsMap.get(ws);
      if (!info) return;

      const { playerId, roomId } = info;
      socketsMap.delete(ws);

      const room = rooms.get(roomId);
      if (room) {
        delete room.players[playerId];

        const remainingIds = Object.keys(room.players);
        if (remainingIds.length === 0) {
          // Room is empty, perform full cleanup
          if (roomIntervals.has(roomId)) {
            clearInterval(roomIntervals.get(roomId)!);
            roomIntervals.delete(roomId);
          }
          rooms.delete(roomId);
        } else {
          // If the host left, assign a new host from remaining players
          if (room.hostId === playerId) {
            const newHostId = remainingIds[0];
            room.hostId = newHostId;
            // Mark new host
            for (const id of remainingIds) {
              room.players[id].isHost = (id === newHostId);
            }
          }

          // If currently racing, check if the remaining players have all finished now
          if (room.status === "racing") {
            const allFinished = Object.values(room.players).every(p => p.progress >= 100);
            if (allFinished) {
              if (roomIntervals.has(roomId)) {
                clearInterval(roomIntervals.get(roomId)!);
              }
              room.status = "results";
              room.timeRemaining = 0;
              for (const pId in room.players) {
                room.players[pId].ready = false;
              }
            }
          }

          broadcastToRoom(roomId, { type: "room-update", room });
        }
      }
    });
  });

  function startRacingTimer(roomId: string) {
    if (roomIntervals.has(roomId)) {
      clearInterval(roomIntervals.get(roomId)!);
    }

    const racingInterval = setInterval(() => {
      const room = rooms.get(roomId);
      if (!room || room.status !== "racing") {
        clearInterval(racingInterval);
        return;
      }

      if (room.timeRemaining > 1) {
        room.timeRemaining -= 1;
        broadcastToRoom(roomId, { type: "room-update", room });
      } else {
        clearInterval(racingInterval);
        room.status = "results";
        room.timeRemaining = 0;
        // Reset ready state for next game
        for (const pId in room.players) {
          room.players[pId].ready = false;
        }
        broadcastToRoom(roomId, { type: "room-update", room });
      }
    }, 1000);

    roomIntervals.set(roomId, racingInterval);
  }

  // Vite Integration
  const isProduction =
    process.env.NODE_ENV === "production" ||
    (() => {
      try {
        return !import.meta.url.includes("server.ts");
      } catch {
        return true; // Fallback to production if import.meta is undefined (e.g., CommonJS bundle)
      }
    })();

  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");

    // Serve static assets with long cache lifetime (hashed filenames).
    // Use a short maxAge for index.html by explicitly setting no-cache below.
    app.use(express.static(distPath, { maxAge: '1y', etag: true }));

    app.get("*", (req, res) => {
      const accept = (req.headers.accept || "").toString();
      if (accept.includes("text/html")) {
        // Always ask the browser to revalidate index.html to avoid serving
        // an index that references assets the client doesn't have cached.
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.sendFile(path.join(distPath, "index.html"));
      } else {
        // For asset requests or API calls, return 404 rather than serving index.html
        res.status(404).end();
      }
    });
  }

  // Listen on specified host & port
  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
}

startServer().catch(console.error);
