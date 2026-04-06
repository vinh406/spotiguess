import type { SongChoice, PlayerScore } from "../../../shared/types";
import { Button } from "../ui";

interface RoundEndViewProps {
  round: number;
  totalRounds: number;
  correctAnswer: SongChoice;
  scores: PlayerScore[];
  myUserId: string;
  onNextRound: () => void;
}

export function RoundEndView({
  round,
  totalRounds,
  correctAnswer,
  scores,
  myUserId,
  onNextRound,
}: RoundEndViewProps) {
  const sortedScores = [...scores].sort((a, b) => b.score - a.score);
  const myRank = sortedScores.findIndex((s) => s.userId === myUserId) + 1;
  const myScore = scores.find((s) => s.userId === myUserId);

  return (
    <div className="h-full flex flex-col">
      {/* Compact Header */}
      <div className="shrink-0 px-3 sm:px-4 py-3 border-b border-gray-700/50 text-center">
        <div className="flex items-center justify-center gap-2 mb-1">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center">
            <span className="text-sm font-bold text-white">{round}</span>
          </div>
          <h2 className="text-base sm:text-lg font-bold text-white">Round Complete!</h2>
        </div>
        <p className="text-xs text-gray-400">
          Round {round} of {totalRounds}
        </p>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {/* Correct Answer */}
        <div className="px-3 sm:px-4 py-3 border-b border-gray-700/50">
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-2 text-center">
            Correct Answer
          </p>
          <div className="flex items-center justify-center gap-3">
            {correctAnswer.albumImageUrl && (
              <img
                src={correctAnswer.albumImageUrl}
                alt={correctAnswer.title}
                className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg object-cover"
              />
            )}
            <div className="min-w-0">
              <p className="text-sm sm:text-base font-semibold text-white">
                {correctAnswer.title}
              </p>
              <p className="text-xs sm:text-sm text-gray-400">{correctAnswer.artist}</p>
            </div>
          </div>
        </div>

        {/* My Score Summary */}
        {myScore && (
          <div className="px-3 sm:px-4 py-2.5 border-b border-gray-700/50">
            <div className="flex items-center justify-around">
              <div className="text-center">
                <p className="text-xs text-gray-400">Rank</p>
                <p className="text-lg sm:text-xl font-bold text-white">#{myRank}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-400">Score</p>
                <p className="text-lg sm:text-xl font-bold text-green-400">{myScore.score}</p>
              </div>
              {myScore.streak > 1 && (
                <div className="text-center">
                  <p className="text-xs text-gray-400">Streak</p>
                  <p className="text-lg sm:text-xl font-bold text-yellow-400">🔥 {myScore.streak}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Leaderboard */}
        <div className="px-3 sm:px-4 py-3">
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">
            Leaderboard
          </p>
          <div className="space-y-1.5">
            {sortedScores.map((score, index) => {
              const isMe = score.userId === myUserId;
              const rank = index + 1;
              return (
                <div
                  key={score.userId}
                  className={`flex items-center gap-2 p-2 sm:p-2.5 rounded-lg ${
                    isMe ? "bg-green-500/20 border border-green-500/30" : "bg-gray-700/30"
                  }`}
                >
                  <div
                    className={`shrink-0 w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                      rank === 1
                        ? "bg-yellow-500 text-white"
                        : rank === 2
                        ? "bg-gray-400 text-white"
                        : rank === 3
                        ? "bg-amber-600 text-white"
                        : "bg-gray-600 text-gray-300"
                    }`}
                  >
                    {rank}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-semibold text-white truncate">
                      {score.username}
                      {isMe && (
                        <span className="ml-1.5 text-xs text-green-400">(You)</span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {score.streak > 1 && (
                      <span className="text-xs text-yellow-400">🔥 {score.streak}</span>
                    )}
                    <span className="text-xs sm:text-sm font-bold text-green-400">
                      {score.score}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Next Round Button */}
      <div className="shrink-0 px-3 sm:px-4 py-3 border-t border-gray-700/50">
        <Button
          onClick={onNextRound}
          className="w-full py-2.5 text-sm"
          size="md"
        >
          {round < totalRounds ? "Next Round" : "See Final Results"}
        </Button>
      </div>
    </div>
  );
}
