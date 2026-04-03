import { useCallback } from "react";
import type { SongChoice } from "../../../shared/types";
import { CountdownTimer } from "./CountdownTimer";

interface GameViewProps {
  round: number;
  totalRounds: number;
  song: { previewUrl?: string; albumImageUrl?: string };
  choices: SongChoice[];
  startTime: number;
  timePerRound: number;
  hasAnswered: boolean;
  selectedChoice: number | null;
  myScore: number;
  myStreak: number;
  onAnswer: (choiceIndex: number) => void;
}

export function GameView({
  round,
  totalRounds,
  song,
  choices,
  startTime,
  timePerRound,
  hasAnswered,
  selectedChoice,
  myScore,
  myStreak,
  onAnswer,
}: GameViewProps) {
  const endTime = startTime + timePerRound;

  const handleChoice = useCallback(
    (index: number) => {
      if (!hasAnswered) {
        onAnswer(index);
      }
    },
    [hasAnswered, onAnswer]
  );

  return (
    <div className="h-full flex flex-col">
      {/* Compact Header with Timer */}
      <div className="shrink-0 border-b border-gray-700/50">
        <div className="flex items-center justify-between px-3 sm:px-4 py-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-xs">
                {round}/{totalRounds}
              </span>
            </div>
            <div className="hidden sm:block">
              <h3 className="text-sm font-semibold text-white">Round {round}</h3>
              <p className="text-xs text-gray-400">of {totalRounds} rounds</p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            {myStreak > 1 && (
              <div className="px-2 py-0.5 bg-yellow-500/20 rounded-full">
                <span className="text-xs font-semibold text-yellow-400">
                  🔥 {myStreak}
                </span>
              </div>
            )}
            <div className="px-2 py-0.5 bg-green-500/20 rounded-full">
              <span className="text-xs font-semibold text-green-400">
                {myScore} pts
              </span>
            </div>
          </div>
        </div>
        <div className="px-3 sm:px-4 pb-2">
          <CountdownTimer endTime={endTime} timePerRound={timePerRound} onTimeUp={() => {}} />
        </div>
      </div>

      {/* Main Content - Centered and Responsive */}
      <div className="flex-1 min-h-0 flex flex-col items-center justify-center px-3 sm:px-4 py-3 sm:py-4 gap-3 sm:gap-4">
        {/* Album Art */}
        <div className="relative shrink-0">
          {song.albumImageUrl ? (
            <img
              src={song.albumImageUrl}
              alt="Album cover"
              className="w-20 h-20 sm:w-28 sm:h-28 md:w-32 md:h-32 lg:w-36 lg:h-36 object-cover rounded-xl shadow-2xl"
            />
          ) : (
            <div className="w-20 h-20 sm:w-28 sm:h-28 md:w-32 md:h-32 lg:w-36 lg:h-36 bg-gradient-to-br from-gray-700 to-gray-800 rounded-xl flex items-center justify-center">
              <svg className="w-8 h-8 sm:w-12 sm:h-12 text-gray-500" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
              </svg>
            </div>
          )}
          {song.previewUrl && (
            <audio src={song.previewUrl} autoPlay className="hidden" />
          )}
        </div>

        {/* Status Text */}
        <p className="text-gray-400 text-xs sm:text-sm text-center">
          {hasAnswered ? "Waiting for other players..." : "Guess the song!"}
        </p>

        {/* Answer Choices - 2 columns on wider screens */}
        <div className="w-full max-w-lg grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
          {choices.map((choice) => {
            const isSelected = selectedChoice === choice.index;
            return (
              <button
                key={choice.index}
                onClick={() => handleChoice(choice.index)}
                disabled={hasAnswered}
                className={`w-full px-3 py-2.5 sm:py-3 rounded-xl text-left transition-all ${
                  hasAnswered
                    ? isSelected
                      ? "bg-green-500/30 border-2 border-green-500"
                      : "bg-gray-700/30 border-2 border-gray-600 opacity-50"
                    : isSelected
                    ? "bg-green-500/40 border-2 border-green-400"
                    : "bg-gray-700/50 border-2 border-gray-600 hover:border-green-500/50 hover:bg-gray-700/70"
                }`}
              >
                <div className="flex items-center gap-2 sm:gap-3">
                  <div
                    className={`shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                      isSelected
                        ? "bg-green-500 text-white"
                        : "bg-gray-600 text-gray-300"
                    }`}
                  >
                    {choice.index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-semibold text-white truncate">
                      {choice.title}
                    </p>
                    <p className="text-xs text-gray-400 truncate">
                      {choice.artist}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
