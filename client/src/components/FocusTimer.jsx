import { useState, useEffect } from "react";
import { Play, Pause, RotateCcw, Volume2, VolumeX, Flame, Coffee } from "lucide-react";
import { audioEngine } from "../utils/audio";

export default function FocusTimer({ activeTask }) {
  const WORK_TIME = 25 * 60;
  const BREAK_TIME = 5 * 60;

  const [timeLeft, setTimeLeft] = useState(WORK_TIME);
  const [isRunning, setIsRunning] = useState(false);
  const [mode, setMode] = useState("work"); // 'work' or 'break'
  const [ambientSound, setAmbientSound] = useState("off"); // 'off', 'rain', 'waves', 'white'

  useEffect(() => {
    if (!isRunning) return undefined;

    if (timeLeft === 0) {
      const timeout = setTimeout(() => {
        audioEngine.playLevelUpSound();
        setMode((currentMode) => currentMode === "work" ? "break" : "work");
        setTimeLeft(mode === "work" ? BREAK_TIME : WORK_TIME);
        setIsRunning(false);
      }, 0);
      return () => clearTimeout(timeout);
    }

    const timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    return () => clearInterval(timer);
  }, [isRunning, timeLeft, mode, BREAK_TIME, WORK_TIME]);

  const toggleTimer = () => {
    setIsRunning(!isRunning);
  };

  const resetTimer = () => {
    setIsRunning(false);
    setTimeLeft(mode === "work" ? WORK_TIME : BREAK_TIME);
  };

  const switchMode = (newMode) => {
    setIsRunning(false);
    setMode(newMode);
    setTimeLeft(newMode === "work" ? WORK_TIME : BREAK_TIME);
  };

  const handleAmbientChange = (e) => {
    const selected = e.target.value;
    setAmbientSound(selected);
    if (selected === "off") {
      audioEngine.stopAmbient();
    } else {
      audioEngine.startAmbient(selected);
    }
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const progressPercent =
    mode === "work"
      ? ((WORK_TIME - timeLeft) / WORK_TIME) * 100
      : ((BREAK_TIME - timeLeft) / BREAK_TIME) * 100;

  return (
    <div className="focus-timer-card">
      <div className="timer-header">
        <div className="timer-badge">
          {mode === "work" ? <Flame size={18} className="text-orange" /> : <Coffee size={18} className="text-blue" />}
          <span>{mode === "work" ? "Deep Focus Session" : "Rest & Recharge"}</span>
        </div>

        {activeTask && (
          <div className="active-task-pill">
            🎯 <strong>Working on:</strong> {activeTask.title}
          </div>
        )}
      </div>

      <div className="timer-display-container">
        <div className="timer-circle-progress" style={{ "--progress": `${progressPercent}%` }}>
          <div className="timer-inner">
            <span className="timer-number">{formatTime(timeLeft)}</span>
            <span className="timer-subtitle">{mode.toUpperCase()} MODE</span>
          </div>
        </div>
      </div>

      <div className="timer-controls">
        <button
          className={`mode-btn ${mode === "work" ? "active" : ""}`}
          onClick={() => switchMode("work")}
        >
          Work (25m)
        </button>
        <button
          className={`mode-btn ${mode === "break" ? "active" : ""}`}
          onClick={() => switchMode("break")}
        >
          Break (5m)
        </button>
      </div>

      <div className="action-row">
        <button className="timer-main-btn" onClick={toggleTimer}>
          {isRunning ? <Pause size={20} /> : <Play size={20} />}
          {isRunning ? "Pause" : "Start Focus"}
        </button>
        <button className="timer-icon-btn" onClick={resetTimer} title="Reset Timer">
          <RotateCcw size={18} />
        </button>
      </div>

      {/* Ambient Sound Selector */}
      <div className="ambient-selector">
        <div className="ambient-label">
          {ambientSound !== "off" ? <Volume2 size={16} /> : <VolumeX size={16} />}
          <span>Ambient Audio:</span>
        </div>
        <select value={ambientSound} onChange={handleAmbientChange} className="ambient-select">
          <option value="off">Mute Audio</option>
          <option value="rain">🌧️ Gentle Rain</option>
          <option value="waves">🌊 Deep Ocean Waves</option>
          <option value="white">📻 White Noise</option>
        </select>
      </div>
    </div>
  );
}
