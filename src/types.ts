export interface Player {
  id: string;
  username: string;
  wpm: number;
  accuracy: number;
  progress: number; // 0 to 100 percent
  score: number;
  ready: boolean;
  isHost: boolean;
  correctCharsTyped?: number;
  totalCharsTyped?: number;
}

export type RoomStatus = 'lobby' | 'countdown' | 'racing' | 'results';

export interface Room {
  id: string;
  hostId: string;
  status: RoomStatus;
  duration: number; // 30 | 60 | 120
  corpus: string[]; // randomized words for this race
  players: Record<string, Player>;
  countdownTime: number; // e.g. 5 down to 1
  timeRemaining: number;
  raceStartedAt: number | null;
}

export type ClientMessage =
  | { type: 'join-room'; roomId: string; username: string; playerId: string }
  | { type: 'toggle-ready'; playerId: string }
  | { type: 'change-duration'; duration: number }
  | { type: 'start-race' }
  | { type: 'update-progress'; wpm: number; accuracy: number; progress: number; score: number }
  | { type: 'kick-player'; targetPlayerId: string }
  | { type: 'rematch' };

export type ServerMessage =
  | { type: 'room-update'; room: Room }
  | { type: 'error'; message: string };
