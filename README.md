# ⚡ swatype

**swatype** is a minimalist, ultra-fast, real-time multiplayer keyboard typing competition application. Inspired by premium dark-theme typing engines, it allows users to establish matchmaking lobbies, invite competitors, and engage in high-speed typing battles with live standings, performance metrics, and retro sound chimes.

---

## ✨ Features

- **🎮 Real-Time Multiplayer Matches**: Open a private room, generate a unique 4-letter room code, invite rivals, and race to the finish line simultaneously.
- **⏱️ Host-Controlled Parameters**: Custom time duration presets (30s, 60s, 120s) configurable instantly by the lobby host.
- **📊 Live Standings & Telemetry**: Dynamic leaderboard sorted on-the-fly by **Final Score** (calculated as `WPM * (Accuracy / 100)`), WPM, and Accuracy with instant micro-progress bars.
- **🎹 Responsive Typing Engine**:
  - Focus-lock overlay to prevent lost keystrokes.
  - Active caret animations and clean character highlight coloring (matching character turns gray/white, wrong character highlights red with wavy underlines).
  - Keeps crimson overflow characters visible even for completed words for absolute review clarity.
- **🎵 Retro Audio Feedback**: Beautiful built-in arpeggio chimes synthesizer utilizing the browser's native **Web Audio API** when a match concludes.
- **🛡️ Server-Authoritative State & Robust Node Bundle**: Fully synchronized WebSocket communication backed by a robust, environment-safe production runner.

---

## 🛠️ Technology Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, Lucide Icons, Framer Motion.
- **Backend**: Node.js, Express, `ws` (WebSockets), `tsx` (TypeScript Execute).
- **Audio Chime**: Native Web Audio API synth.

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18+)
- [npm](https://www.npmjs.com/)

### 📦 Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/HaffynotFound/swatype.git
   cd swatype
   ```
2. Install the dependencies:
   ```bash
   npm install
   ```

### 💻 Running Locally (Development Mode)
To spin up both the Vite frontend development server and the WebSocket coordination backend concurrently:
```bash
npm run dev
```
Open your browser and navigate to: [http://localhost:3000](http://localhost:3000)

### 🏗️ Production Build & Run
To run a fully optimized production build:
```bash
# 1. Compile client assets and bundle server.ts to CommonJS
npm run build

# 2. Boot the high-performance production server
npm start
```

---

## 📂 Project Structure

```text
swatype/
├── dist/                  # Compiled production bundle assets
├── src/
│   ├── components/
│   │   ├── Leaderboard.tsx     # Live scoreboard & standings component
│   │   ├── ResultsDisplay.tsx  # Game-over scorecard & rematch options
│   │   ├── RoomLobby.tsx       # Pre-game lobby settings & configurations
│   │   └── TypingEngine.tsx    # Keystroke engine, caret styling & WPM calculations
│   │
│   ├── utils/
│   │   └── audio.ts            # Web Audio API retro synth chords arpeggio
│   │
│   ├── App.tsx            # Application entry, WebSocket setup & lobby routing
│   ├── index.css          # Tailwind configurations, custom scrollbars, and fonts
│   ├── main.tsx           # React DOM mounting
│   ├── types.ts           # Central TypeScript types & WebSocket messages
│   └── words.ts           # Random corpus dictionary generator
│
├── index.html             # Main entry point with SEO metadata
├── package.json           # Scripts and dependency lists
├── tsconfig.json          # TypeScript rulesets
├── vite.config.ts         # Vite bundler options
└── server.ts              # WebSocket server & static Express router
```

---

## 📝 License
Distributed under the MIT License. See `LICENSE` for more information.
