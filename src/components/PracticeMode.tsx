import { useState, useEffect, useRef, useCallback, ChangeEvent, KeyboardEvent } from "react";
import { Play, Keyboard, RefreshCw, Lock, Clock, Target } from "lucide-react";
import { getRandomCorpus } from "../words";
import AIFeedbackPanel from "./AIFeedbackPanel";

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

type Phase = "setup" | "countdown" | "racing" | "feedback";

interface PracticeModeProps {
  onBackHome: () => void;
}

export default function PracticeMode({ onBackHome }: PracticeModeProps) {
  const [phase, setPhase] = useState<Phase>("setup");
  const [duration, setDuration] = useState(60);
  const [corpus, setCorpus] = useState<string[]>([]);
  const [countdownTime, setCountdownTime] = useState(5);
  const [timeRemaining, setTimeRemaining] = useState(60);
  const [raceStartedAt, setRaceStartedAt] = useState<number | null>(null);

  const [inputText, setInputText] = useState("");
  const [completedWords, setCompletedWords] = useState<string[]>([]);
  const [currentWordInput, setCurrentWordInput] = useState("");
  const [wordIndex, setWordIndex] = useState(0);
  const [isFocused, setIsFocused] = useState(true);
  const [localWpm, setLocalWpm] = useState(0);
  const totalKeysPressedRef = useRef(0);
  const correctKeysPressedRef = useRef(0);
  const wordResultsRef = useRef<WordResult[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  const [raceStats, setRaceStats] = useState<RaceStats | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  function startPractice() {
    const words = getRandomCorpus(150);
    setCorpus(words);
    setTimeRemaining(duration);
    setCountdownTime(5);
    setRaceStartedAt(null);
    setCompletedWords([]);
    setCurrentWordInput("");
    setWordIndex(0);
    setLocalWpm(0);
    totalKeysPressedRef.current = 0;
    correctKeysPressedRef.current = 0;
    wordResultsRef.current = [];
    setPhase("countdown");
    setCountdownTime(5);

    countdownRef.current = setInterval(() => {
      setCountdownTime((prev) => {
        if (prev <= 1) {
          if (countdownRef.current) clearInterval(countdownRef.current);
          countdownRef.current = null;
          setPhase("racing");
          setRaceStartedAt(Date.now());
          setTimeout(() => textareaRef.current?.focus(), 50);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  function finishRace(finalStats: RaceStats) {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    setPhase("feedback");
    setRaceStats(finalStats);
  }

  useEffect(() => {
    if (phase !== "racing" || !raceStartedAt) return;
    timerRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          timerRef.current = null;
          const elapsed = (Date.now() - raceStartedAt) / 1000;
          const minutes = elapsed / 60;
          const totalChars = correctKeysPressedRef.current;
          const wpm = minutes > 0 ? (totalChars / 5) / minutes : 0;
          const accuracy = totalKeysPressedRef.current > 0
            ? (correctKeysPressedRef.current / totalKeysPressedRef.current) * 100
            : 100;
          const score = wpm * (accuracy / 100);
          finishRace({
            wpm, accuracy, score,
            duration,
            wordsCorrect: wordResultsRef.current.filter((w) => w.correct).length,
            wordsTotal: wordResultsRef.current.length,
            totalKeystrokes: totalKeysPressedRef.current,
            correctKeystrokes: correctKeysPressedRef.current,
            wordResults: wordResultsRef.current,
          });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [phase === "racing" && !!raceStartedAt]);

  const calculateProgress = useCallback((completed: string[], currentInput: string, currentWordIdx: number) => {
    let correctChars = 0;
    let totalInputtedChars = 0;
    completed.forEach((wordInput, i) => {
      const targetWord = corpus[i] || "";
      totalInputtedChars += wordInput.length + 1;
      for (let j = 0; j < targetWord.length; j++) {
        if (wordInput[j] === targetWord[j]) correctChars++;
      }
      if (wordInput === targetWord) correctChars++;
    });
    const targetWord = corpus[currentWordIdx] || "";
    for (let j = 0; j < currentInput.length; j++) {
      totalInputtedChars++;
      if (currentInput[j] === targetWord[j]) correctChars++;
    }
    const elapsedSeconds = raceStartedAt ? (Date.now() - raceStartedAt) / 1000 : 0;
    const minutes = elapsedSeconds / 60;
    const wpm = minutes > 0 ? (correctChars / 5) / minutes : 0;
    const accuracy = totalInputtedChars > 0 ? (correctChars / totalInputtedChars) * 100 : 100;
    setLocalWpm(wpm);
  }, [corpus, raceStartedAt]);

  function handleInputChange(e: ChangeEvent<HTMLTextAreaElement>) {
    if (phase !== "racing") return;
    const value = e.target.value;
    const lastChar = value[value.length - 1];
    if (lastChar === " ") {
      if (currentWordInput.trim() === "") return;
      const targetWord = corpus[wordIndex] || "";
      const isCorrect = currentWordInput === targetWord;
      wordResultsRef.current.push({ word: targetWord, typed: currentWordInput, correct: isCorrect });
      const newCompleted = [...completedWords, currentWordInput];
      setCompletedWords(newCompleted);
      const nextIndex = wordIndex + 1;
      setWordIndex(nextIndex);
      setCurrentWordInput("");
      setInputText("");
      if (nextIndex >= corpus.length) {
        const elapsed = raceStartedAt ? (Date.now() - raceStartedAt) / 1000 : 0;
        const minutes = elapsed / 60;
        const totalChars = correctKeysPressedRef.current;
        const wpm = minutes > 0 ? (totalChars / 5) / minutes : 0;
        const accuracy = totalKeysPressedRef.current > 0
          ? (correctKeysPressedRef.current / totalKeysPressedRef.current) * 100
          : 100;
        const score = wpm * (accuracy / 100);
        finishRace({
          wpm, accuracy, score,
          duration,
          wordsCorrect: wordResultsRef.current.filter((w) => w.correct).length,
          wordsTotal: wordResultsRef.current.length,
          totalKeystrokes: totalKeysPressedRef.current,
          correctKeystrokes: correctKeysPressedRef.current,
          wordResults: wordResultsRef.current,
        });
        return;
      }
      calculateProgress(newCompleted, "", nextIndex);
    } else {
      setCurrentWordInput(value);
      setInputText(value);
      if (value.length > currentWordInput.length) {
        totalKeysPressedRef.current += 1;
        const indexTyped = value.length - 1;
        const targetWord = corpus[wordIndex] || "";
        if (lastChar === targetWord[indexTyped]) {
          correctKeysPressedRef.current += 1;
        }
      }
      calculateProgress(completedWords, value, wordIndex);
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (phase !== "racing") return;
    if (e.key === "Backspace") {
      if (currentWordInput.length === 0 && wordIndex > 0) {
        const prevWord = completedWords[wordIndex - 1] || "";
        const prevCompleted = completedWords.slice(0, -1);
        wordResultsRef.current = wordResultsRef.current.slice(0, -1);
        setCompletedWords(prevCompleted);
        setWordIndex(wordIndex - 1);
        setCurrentWordInput(prevWord);
        setInputText(prevWord);
        e.preventDefault();
        calculateProgress(prevCompleted, prevWord, wordIndex - 1);
      }
    }
  }

  function renderWord(wordStr: string, idx: number) {
    const isCompleted = idx < wordIndex;
    const isActive = idx === wordIndex;
    const completedInput = completedWords[idx] || "";
    const activeInput = currentWordInput;
    return (
      <span
        key={idx}
        className={`inline-block mr-3 mb-1.5 font-mono text-xl transition-all duration-150 ${
          isActive ? "bg-[#e2b714]/5 rounded-sm px-1 border-b-2 border-[#e2b714]/30" : ""
        }`}
      >
        {wordStr.split("").map((letter, charIdx) => {
          let colorClass = "text-[#646669]";
          if (isCompleted) {
            colorClass = completedInput[charIdx] === letter
              ? "text-[#d1d0c5]" : "text-[#ca4754] underline decoration-wavy";
          } else if (isActive && charIdx < activeInput.length) {
            colorClass = activeInput[charIdx] === letter
              ? "text-[#d1d0c5]" : "text-[#ca4754] underline decoration-wavy";
          }
          const showCaret = isActive && charIdx === activeInput.length;
          return (
            <span key={charIdx} className={`${colorClass} relative`}>
              {showCaret && <span className="absolute -left-[2px] top-0 bottom-0 w-[2px] bg-[#e2b714] animate-pulse" />}
              {letter}
            </span>
          );
        })}
        {isActive && activeInput.length > wordStr.length && (
          <span className="text-[#ca4754] opacity-80 underline decoration-wavy">
            {activeInput.slice(wordStr.length).split("").map((ch, oIdx) => (
              <span key={oIdx}>{ch}</span>
            ))}
          </span>
        )}
        {isCompleted && completedInput.length > wordStr.length && (
          <span className="text-[#ca4754] opacity-80 underline decoration-wavy">
            {completedInput.slice(wordStr.length).split("").map((ch, oIdx) => (
              <span key={oIdx}>{ch}</span>
            ))}
          </span>
        )}
      </span>
    );
  }

  if (phase === "feedback" && raceStats) {
    return <AIFeedbackPanel stats={raceStats} onBackHome={onBackHome} />;
  }

  return (
    <div className="w-full max-w-3xl mx-auto">
      {phase === "setup" && (
        <div className="bg-[#2c2e31] border border-[#2c2e31]/60 rounded-xl p-8 shadow-2xl text-center">
          <div className="bg-[#e2b714]/10 p-3 rounded-xl inline-block mb-4">
            <Target className="w-8 h-8 text-[#e2b714]" />
          </div>
          <h2 className="font-sans font-extrabold text-2xl text-[#d1d0c5] mb-2">AI Coach Practice</h2>
          <p className="font-mono text-sm text-[#646669] mb-8 max-w-md mx-auto">
            Type at your own pace. After the race, get personalized AI feedback on your accuracy, speed, and areas to improve.
          </p>

          <div className="flex items-center justify-center gap-3 mb-8">
            {[30, 60, 120].map((dur) => (
              <button
                key={dur}
                onClick={() => setDuration(dur)}
                className={`font-mono font-bold px-5 py-2.5 rounded-lg transition-all cursor-pointer ${
                  duration === dur
                    ? "bg-[#e2b714] text-[#323437] shadow-lg"
                    : "bg-[#323437] text-[#646669] hover:text-[#d1d0c5] border border-[#3c3e41]/60"
                }`}
              >
                {dur}s
              </button>
            ))}
          </div>

          <button
            onClick={startPractice}
            className="bg-[#e2b714] hover:bg-[#f5c61a] text-[#323437] font-sans font-bold py-3.5 px-8 rounded-xl shadow-lg transition-all text-sm flex items-center gap-2 mx-auto cursor-pointer"
          >
            <Play className="w-4 h-4" /> Start Practice
          </button>

          <button
            onClick={onBackHome}
            className="block mx-auto mt-4 font-mono text-xs text-[#646669] hover:text-[#d1d0c5] transition-all cursor-pointer"
          >
            Back to Home
          </button>
        </div>
      )}

      {phase === "countdown" && (
        <div className="bg-[#2c2e31] border border-[#2c2e31]/60 rounded-xl p-12 text-center shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 animate-pulse" />
          <span className="font-mono text-xs text-[#646669] lowercase tracking-widest block mb-4">
            generating word grid...
          </span>
          <h2 className="font-sans font-black text-6xl text-[#e2b714] animate-bounce mb-3">
            {countdownTime}
          </h2>
          <p className="font-mono text-sm text-[#d1d0c5]">Get ready to type</p>
        </div>
      )}

      {phase === "racing" && (
        <div className="bg-[#2c2e31] border border-[#2c2e31]/60 rounded-xl p-8 shadow-2xl relative">
          <div className="flex items-center justify-between border-b border-[#3c3e41]/60 pb-4 mb-6">
            <div className="flex items-center gap-2">
              <div className="bg-[#3c3e41] text-[#e2b714] font-mono font-bold text-lg px-3 py-1.5 rounded-lg border border-[#2c2e31]">
                {timeRemaining}s
              </div>
              <span className="font-mono text-xs text-[#646669]">time remaining</span>
            </div>
            <div className="flex gap-4">
              <div className="text-right">
                <span className="font-mono text-[10px] text-[#646669] block uppercase">Live WPM</span>
                <span className="font-mono text-lg font-bold text-[#d1d0c5]">{Math.round(localWpm)}</span>
              </div>
              <div className="text-right">
                <span className="font-mono text-[10px] text-[#646669] block uppercase">Progress</span>
                <span className="font-mono text-lg font-bold text-[#e2b714]">
                  {corpus.length > 0 ? Math.round((wordIndex / corpus.length) * 100) : 0}%
                </span>
              </div>
            </div>
          </div>

          <textarea
            ref={textareaRef}
            value={currentWordInput}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            className="absolute top-0 left-0 w-0 h-0 opacity-0 pointer-events-none"
            autoFocus
            tabIndex={0}
          />

          {!isFocused && (
            <div
              onClick={() => textareaRef.current?.focus()}
              className="absolute inset-0 bg-[#323437]/90 backdrop-blur-sm rounded-xl flex flex-col items-center justify-center cursor-pointer z-20 border border-[#e2b714]/20"
            >
              <Keyboard className="w-8 h-8 text-[#e2b714] animate-bounce mb-3" />
              <h3 className="font-sans font-bold text-lg text-[#e2b714]">Test Out of Focus</h3>
              <p className="font-mono text-xs text-[#a1a1a6] mt-1.5">Click this zone to capture typing keys and resume</p>
            </div>
          )}

          <div
            onClick={() => textareaRef.current?.focus()}
            className="relative min-h-[160px] max-h-[220px] overflow-y-auto leading-relaxed select-none py-2 cursor-text scrollbar-thin scrollbar-thumb-[#3c3e41] pr-2 focus-within:ring-2 focus-within:ring-[#e2b714]/20 rounded-lg"
          >
            <div className="flex flex-wrap">
              {corpus.map((word, idx) => renderWord(word, idx))}
            </div>
          </div>

          <div className="mt-6 flex justify-between items-center text-xs font-mono text-[#646669] border-t border-[#3c3e41]/60 pt-4">
            <span>Press <kbd className="bg-[#3c3e41] text-[#d1d0c5] px-1.5 py-0.5 rounded font-bold border border-[#2c2e31]">Space</kbd> to move onto next words</span>
            <span>You can backspace to modify errors</span>
          </div>
        </div>
      )}
    </div>
  );
}
