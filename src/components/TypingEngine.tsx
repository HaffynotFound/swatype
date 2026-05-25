import { useState, useEffect, useRef, ChangeEvent, KeyboardEvent } from "react";
import { Keyboard, Lock } from "lucide-react";
import { Room } from "../types";

interface TypingEngineProps {
  room: Room;
  playerId: string;
  onUpdateProgress: (wpm: number, accuracy: number, progress: number, score: number) => void;
}

export default function TypingEngine({ room, playerId, onUpdateProgress }: TypingEngineProps) {
  const { status, corpus, countdownTime, timeRemaining, raceStartedAt } = room;

  const [inputText, setInputText] = useState("");
  const [completedWords, setCompletedWords] = useState<string[]>([]);
  const [currentWordInput, setCurrentWordInput] = useState("");
  const [wordIndex, setWordIndex] = useState(0);

  // Focus tracking
  const [isFocused, setIsFocused] = useState(true);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Live WPM cached locally to match the exact net WPM logic
  const [localWpm, setLocalWpm] = useState(0);

  // Total typed keys tracker for strict accuracy calculation
  const totalKeysPressedRef = useRef(0);
  const correctKeysPressedRef = useRef(0);

  // Reset local state when a new race starts or lobby transitions
  useEffect(() => {
    if (status === "racing") {
      setInputText("");
      setCompletedWords([]);
      setCurrentWordInput("");
      setWordIndex(0);
      setLocalWpm(0);
      totalKeysPressedRef.current = 0;
      correctKeysPressedRef.current = 0;
      // Focus typing box instantly
      setTimeout(() => {
        textareaRef.current?.focus();
        setIsFocused(true);
      }, 50);
    }
  }, [status]);

  // Keep textarea focused
  useEffect(() => {
    if (status === "racing") {
      textareaRef.current?.focus();
    }
  }, [status, isFocused]);

  // Handle key inputs in hidden textarea
  const handleInputChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    if (status !== "racing") return;
    const value = e.target.value;
    const lastChar = value[value.length - 1];

    // If space bar pressed, submit word
    if (lastChar === " ") {
      // Prevent double spaces
      if (currentWordInput.trim() === "") {
        return;
      }
      
      const newCompleted = [...completedWords, currentWordInput];
      setCompletedWords(newCompleted);
      const nextIndex = wordIndex + 1;
      setWordIndex(nextIndex);
      setCurrentWordInput("");
      setInputText("");

      // Calculate state on word submission
      calculateAndEmitProgress(newCompleted, "", nextIndex);
    } else {
      setCurrentWordInput(value);
      setInputText(value);

      // Track total checks for keys pressed (not counting backspace)
      if (value.length > currentWordInput.length) {
        totalKeysPressedRef.current += 1;
        const indexTyped = value.length - 1;
        const targetWord = corpus[wordIndex] || "";
        if (lastChar === targetWord[indexTyped]) {
          correctKeysPressedRef.current += 1;
        }
      }

      // Calculate state live
      calculateAndEmitProgress(completedWords, value, wordIndex);
    }
  };

  // Support Backspacing out of active word to correct previous words if needed
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (status !== "racing") return;

    if (e.key === "Backspace") {
      if (currentWordInput.length === 0 && wordIndex > 0) {
        // Retrieve last completed word
        const prevWord = completedWords[wordIndex - 1] || "";
        const prevCompleted = completedWords.slice(0, -1);
        
        setCompletedWords(prevCompleted);
        setWordIndex(wordIndex - 1);
        setCurrentWordInput(prevWord);
        setInputText(prevWord);

        e.preventDefault();
        calculateAndEmitProgress(prevCompleted, prevWord, wordIndex - 1);
      }
    }
  };

  // Performance calculations for WPM, Accuracy & live Scores
  const calculateAndEmitProgress = (
    completed: string[],
    currentInput: string,
    currentWordIdx: number
  ) => {
    if (!raceStartedAt) return;

    // 1. Calculate correct characters typed
    let correctChars = 0;
    let totalInputtedChars = 0;

    // Process completed words
    completed.forEach((wordInput, i) => {
      const targetWord = corpus[i] || "";
      totalInputtedChars += wordInput.length + 1; // +1 space
      
      for (let j = 0; j < targetWord.length; j++) {
        if (wordInput[j] === targetWord[j]) {
          correctChars++;
        }
      }
      // Add correct space
      if (wordInput === targetWord) {
        correctChars++;
      }
    });

    // Process active word input
    for (let j = 0; j < currentInput.length; j++) {
      const targetWord = corpus[currentWordIdx] || "";
      totalInputtedChars++;
      if (currentInput[j] === targetWord[j]) {
        correctChars++;
      }
    }

    // Standard Typing WPM: 1 word = 5 characters
    const elapsedSeconds = (Date.now() - raceStartedAt) / 1000;
    const minutes = elapsedSeconds / 60;
    const wpm = minutes > 0 ? (correctChars / 5) / minutes : 0;

    // Accuracy Calculation
    let accuracy = 100;
    if (totalInputtedChars > 0) {
      accuracy = (correctChars / totalInputtedChars) * 100;
    }

    // Progress percentage
    const progress = Math.min(100, Math.round((currentWordIdx / corpus.length) * 100));

    // Scoring: WPM * (Accuracy / 100)
    const score = wpm * (accuracy / 100);

    // Sync live net WPM locally
    setLocalWpm(wpm);

    // Call upstream trigger
    onUpdateProgress(wpm, accuracy, progress, score);
  };

  // Render individual letters in each word with rich styles
  const renderWord = (wordStr: string, idx: number) => {
    const isCompleted = idx < wordIndex;
    const isActive = idx === wordIndex;
    const completedInput = completedWords[idx] || "";
    const activeInput = currentWordInput;

    return (
      <span
        key={idx}
        className={`inline-block mr-3 mr-y-1.5 font-mono text-xl transition-all duration-150 ${
          isActive ? "bg-[#e2b714]/5 rounded-sm px-1 border-b-2 border-[#e2b714]/30" : ""
        }`}
      >
        {wordStr.split("").map((letter, charIdx) => {
          let colorClass = "text-[#646669]"; // Untouched / remaining

          if (isCompleted) {
            const hasMatch = completedInput[charIdx] === letter;
            colorClass = hasMatch ? "text-[#d1d0c5]" : "text-[#ca4754] underline decoration-wavy";
          } else if (isActive) {
            if (charIdx < activeInput.length) {
              const hasMatch = activeInput[charIdx] === letter;
              colorClass = hasMatch ? "text-[#d1d0c5]" : "text-[#ca4754] underline decoration-wavy";
            }
          }

          // Blinking caret
          const showCaret = isActive && charIdx === activeInput.length;

          return (
            <span key={charIdx} className={`${colorClass} relative`}>
              {showCaret && (
                <span className="absolute -left-[2px] top-0 bottom-0 w-[2px] bg-[#e2b714] animate-pulse" />
              )}
              {letter}
            </span>
          );
        })}

        {/* Support rendering overflow letters if user typing exceeds word length */}
        {isActive && activeInput.length > wordStr.length && (
          <span className="text-[#ca4754] opacity-80 underline decoration-wavy">
            {activeInput.slice(wordStr.length).split("").map((ch, oIdx) => (
              <span key={oIdx}>{ch}</span>
            ))}
          </span>
        )}

        {/* Support rendering overflow letters for completed words too */}
        {isCompleted && completedInput.length > wordStr.length && (
          <span className="text-[#ca4754] opacity-80 underline decoration-wavy">
            {completedInput.slice(wordStr.length).split("").map((ch, oIdx) => (
              <span key={oIdx}>{ch}</span>
            ))}
          </span>
        )}
      </span>
    );
  };

  // Rendering countdown overlay
  if (status === "countdown") {
    return (
      <div className="w-full max-w-3xl mx-auto bg-[#2c2e31] border border-[#2c2e31]/60 rounded-xl p-12 text-center shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 animate-pulse" />
        <span className="font-mono text-xs text-[#646669] lowercase tracking-widest block mb-4">
          matching randomized word grids...
        </span>
        <h2 className="font-sans font-black text-6xl text-[#e2b714] animate-bounce mb-3">
          {countdownTime}
        </h2>
        <p className="font-mono text-sm text-[#d1d0c5]">
          Race starts in a snapshot
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl mx-auto bg-[#2c2e31] border border-[#2c2e31]/60 rounded-xl p-8 shadow-2xl relative">
      {/* Timer and active stats header */}
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
            <span className="font-mono text-lg font-bold text-[#d1d0c5]">
              {Math.round(localWpm)}
            </span>
          </div>
          <div className="text-right">
            <span className="font-mono text-[10px] text-[#646669] block uppercase">Progress</span>
            <span className="font-mono text-lg font-bold text-[#e2b714]">
              {Math.round((wordIndex / corpus.length) * 100)}%
            </span>
          </div>
        </div>
      </div>

      {/* Invisible Input Area */}
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

      {/* Mask if not focused */}
      {!isFocused && (
        <div
          onClick={() => textareaRef.current?.focus()}
          className="absolute inset-0 bg-[#323437]/90 backdrop-blur-sm rounded-xl flex flex-col items-center justify-center cursor-pointer z-20 border border-[#e2b714]/20"
        >
          <Keyboard className="w-8 h-8 text-[#e2b714] animate-bounce mb-3" />
          <h3 className="font-sans font-bold text-lg text-[#e2b714]">
            Test Out of Focus
          </h3>
          <p className="font-mono text-xs text-[#a1a1a6] mt-1.5">
            Click this zone to capture typing keys and resume
          </p>
        </div>
      )}

      {/* Typing words arena */}
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
  );
}
