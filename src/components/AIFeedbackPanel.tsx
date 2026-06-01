import { useState, useEffect, useRef } from "react";
import { Bot, User, Send, Sparkles, RefreshCw, Home } from "lucide-react";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface WordResult {
  word: string;
  typed: string;
  correct: boolean;
}

interface RaceStats {
  wpm: number;
  accuracy: number;
  score: number;
  duration: number;
  wordsCorrect: number;
  wordsTotal: number;
  totalKeystrokes: number;
  correctKeystrokes: number;
  wordResults: WordResult[];
}

interface AIFeedbackPanelProps {
  stats: RaceStats;
  onBackHome: () => void;
}

export default function AIFeedbackPanel({ stats, onBackHome }: AIFeedbackPanelProps) {
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [sending, setSending] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchAnalysis();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory, analysis]);

  async function fetchAnalysis() {
    setLoading(true);
    try {
      const res = await fetch("/api/ai-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "analyze", stats }),
      });
      const data = await res.json();
      setAnalysis(data.message);
    } catch {
      setAnalysis("Sorry, I couldn't analyze your performance right now. Check your connection and try again.");
    }
    setLoading(false);
  }

  async function sendChatMessage() {
    const msg = chatInput.trim();
    if (!msg || sending) return;
    setChatInput("");
    setChatHistory((prev) => [...prev, { role: "user", content: msg }]);
    setSending(true);
    try {
      const res = await fetch("/api/ai-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "chat",
          message: msg,
          history: chatHistory,
          stats,
        }),
      });
      const data = await res.json();
      setChatHistory((prev) => [...prev, { role: "assistant", content: data.message }]);
    } catch {
      setChatHistory((prev) => [...prev, { role: "assistant", content: "Sorry, I couldn't respond right now." }]);
    }
    setSending(false);
  }

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6">
      <div className="bg-[#2c2e31] border border-[#2c2e31]/60 rounded-xl p-8 shadow-2xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-[#e2b714]/10 p-2.5 rounded-lg">
            <Bot className="w-6 h-6 text-[#e2b714]" />
          </div>
          <div>
            <h2 className="font-sans font-extrabold text-lg text-[#d1d0c5]">AI Coach Analysis</h2>
            <p className="font-mono text-xs text-[#646669]">Personalized feedback on your typing performance</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <StatBox label="WPM" value={Math.round(stats.wpm).toString()} />
          <StatBox label="Accuracy" value={`${Math.round(stats.accuracy)}%`} />
          <StatBox label="Score" value={Math.round(stats.score).toString()} />
          <StatBox label="Duration" value={`${stats.duration}s`} />
          <StatBox label="Words" value={`${stats.wordsCorrect}/${stats.wordsTotal}`} />
          <StatBox label="Keystrokes" value={`${stats.correctKeystrokes}/${stats.totalKeystrokes}`} />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center gap-3">
              <RefreshCw className="w-6 h-6 text-[#e2b714] animate-spin" />
              <span className="font-mono text-sm text-[#646669]">Analyzing your typing patterns...</span>
            </div>
          </div>
        ) : (
          <div className="bg-[#323437] border border-[#3c3e41]/60 rounded-lg p-5 mb-6">
            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-[#e2b714] mt-0.5 flex-shrink-0" />
              <p className="font-mono text-sm text-[#d1d0c5] leading-relaxed whitespace-pre-line">{analysis}</p>
            </div>
          </div>
        )}

        <div className="bg-[#323437] border border-[#3c3e41]/60 rounded-lg p-4 max-h-[300px] overflow-y-auto mb-4">
          {chatHistory.length === 0 ? (
            <p className="font-mono text-xs text-[#646669] text-center py-4">
              Ask a follow-up question about your performance below
            </p>
          ) : (
            chatHistory.map((msg, i) => (
              <div key={i} className={`flex items-start gap-2.5 mb-3 ${msg.role === "user" ? "justify-end" : ""}`}>
                {msg.role === "assistant" && (
                  <div className="bg-[#e2b714]/10 p-1.5 rounded-lg flex-shrink-0">
                    <Bot className="w-4 h-4 text-[#e2b714]" />
                  </div>
                )}
                <div
                  className={`font-mono text-sm max-w-[80%] px-3 py-2 rounded-lg ${
                    msg.role === "user"
                      ? "bg-[#e2b714]/10 text-[#d1d0c5]"
                      : "bg-[#2c2e31] text-[#d1d0c5]"
                  }`}
                >
                  {msg.content}
                </div>
                {msg.role === "user" && (
                  <div className="bg-[#3c3e41]/60 p-1.5 rounded-lg flex-shrink-0">
                    <User className="w-4 h-4 text-[#d1d0c5]" />
                  </div>
                )}
              </div>
            ))
          )}
          <div ref={chatEndRef} />
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendChatMessage()}
            placeholder="Ask for tips, drills, or clarification..."
            className="flex-1 bg-[#323437] border border-[#3c3e41]/60 text-sm text-[#d1d0c5] placeholder-[#646669] px-4 py-2.5 rounded-lg focus:outline-none focus:border-[#e2b714] font-mono transition-all"
          />
          <button
            onClick={sendChatMessage}
            disabled={!chatInput.trim() || sending}
            className="bg-[#e2b714] text-[#323437] p-2.5 rounded-lg hover:bg-[#f5c61a] transition-all disabled:opacity-50 cursor-pointer"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>

      <button
        onClick={onBackHome}
        className="mx-auto flex items-center gap-2 bg-[#3c3e41] hover:bg-[#4c4e51] text-[#d1d0c5] font-mono text-sm px-5 py-2.5 rounded-xl transition-all cursor-pointer"
      >
        <Home className="w-4 h-4" /> Back to Home
      </button>
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[#323437] border border-[#3c3e41]/60 rounded-lg p-3 text-center">
      <span className="font-mono text-[10px] text-[#646669] uppercase block">{label}</span>
      <span className="font-mono text-lg font-bold text-[#d1d0c5]">{value}</span>
    </div>
  );
}
