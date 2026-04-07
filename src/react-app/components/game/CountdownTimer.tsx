import { useState, useEffect, useRef } from "react";

interface CountdownTimerProps {
  endTime: number;
  timePerRound: number;
  isPaused?: boolean;
  onTimeUp: () => void;
}

export function CountdownTimer({
  endTime,
  timePerRound,
  isPaused = false,
  onTimeUp,
}: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState(-1);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setTimeLeft(Math.max(0, endTime - Date.now()));
  }, [endTime]);

  useEffect(() => {
    if (timeLeft < 0) {
      setTimeLeft(Math.max(0, endTime - Date.now()));
    }
  }, [endTime, timeLeft]);

  useEffect(() => {
    if (timeLeft <= 0 || isPaused) {
      return;
    }

    intervalRef.current = setInterval(() => {
      const remaining = Math.max(0, endTime - Date.now());
      setTimeLeft(remaining);
      if (remaining <= 0) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        onTimeUp();
      }
    }, 100);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [endTime, timeLeft, onTimeUp, isPaused]);

  const seconds = Math.ceil(timeLeft / 1000);
  const percentage = (timeLeft / timePerRound) * 100;
  const isUrgent = seconds <= 5;

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-1">
        <span
          className={`text-xs font-mono font-bold ${isUrgent ? "text-red-400" : "text-green-400"}`}
        >
          {seconds}s
        </span>
        <span className="text-xs text-gray-500">{Math.round(percentage)}%</span>
      </div>
      <div className="w-full h-1.5 bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-100 ease-linear rounded-full ${
            isUrgent
              ? "bg-gradient-to-r from-red-500 to-red-400"
              : percentage > 50
                ? "bg-gradient-to-r from-green-500 to-green-400"
                : "bg-gradient-to-r from-yellow-500 to-yellow-400"
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
