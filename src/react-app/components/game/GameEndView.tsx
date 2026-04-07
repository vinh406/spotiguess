import { useState, useEffect } from "react";
import type { PlayerScore } from "../../../shared/types";
import { Button } from "../ui";

interface GameEndViewProps {
  finalScores: PlayerScore[];
  myUserId: string;
  onPlayAgain: (vote: boolean) => void;
  votes: Record<string, boolean>;
  voteEndsAt: number | null;
}

export function GameEndView({
  finalScores,
  myUserId,
  onPlayAgain,
  votes,
  voteEndsAt,
}: GameEndViewProps) {
  const sortedScores = [...finalScores].sort((a, b) => b.score - a.score);
  const winner = sortedScores[0];
  const myRank = sortedScores.findIndex((s) => s.userId === myUserId) + 1;
  const myScore = finalScores.find((s) => s.userId === myUserId);
  const isWinner = myUserId === winner?.userId;
  const myVote = votes[myUserId];
  const totalPlayers = finalScores.length;
  const votesCount = Object.keys(votes).length;

  const [timeLeft, setTimeLeft] = useState<number>(0);

  useEffect(() => {
    if (!voteEndsAt) return;
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((voteEndsAt - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining === 0) clearInterval(interval);
    }, 1000);
    return () => clearInterval(interval);
  }, [voteEndsAt]);

  return (
    <div className="h-full flex flex-col">
      <div className="shrink-0 px-3 sm:px-4 py-3 border-b border-gray-700/50 text-center">
        <div className="flex items-center justify-center gap-2 mb-1">
          <span className="text-2xl">🏆</span>
          <h2 className="text-lg sm:text-xl font-bold text-white">Game Over!</h2>
        </div>
        {isWinner ? (
          <p className="text-xs sm:text-sm text-yellow-400 font-semibold">
            You won! Congratulations!
          </p>
        ) : (
          <p className="text-xs sm:text-sm text-gray-400">
            {winner?.username} won with {winner?.score} points
          </p>
        )}
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {/* My Final Stats */}
        {myScore && (
          <div className="px-3 sm:px-4 py-3 border-b border-gray-700/50">
            <div className="flex items-center justify-around">
              <div className="text-center">
                <p className="text-xs text-gray-400">Final Rank</p>
                <p className="text-xl sm:text-2xl font-bold text-white">#{myRank}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-400">Total Score</p>
                <p className="text-xl sm:text-2xl font-bold text-green-400">{myScore.score}</p>
              </div>
              {myScore.streak > 0 && (
                <div className="text-center">
                  <p className="text-xs text-gray-400">Best Streak</p>
                  <p className="text-xl sm:text-2xl font-bold text-yellow-400">
                    🔥 {myScore.streak}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Final Leaderboard */}
        <div className="px-3 sm:px-4 py-3">
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">Final Standings</p>
          <div className="space-y-1.5">
            {sortedScores.map((score, index) => {
              const isMe = score.userId === myUserId;
              const rank = index + 1;
              return (
                <div
                  key={score.userId}
                  className={`flex items-center gap-2 p-2.5 sm:p-3 rounded-lg ${
                    rank === 1
                      ? "bg-gradient-to-r from-yellow-500/20 to-yellow-600/10 border border-yellow-500/30"
                      : isMe
                        ? "bg-green-500/20 border border-green-500/30"
                        : "bg-gray-700/30"
                  }`}
                >
                  <div
                    className={`shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-sm font-bold ${
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
                      {isMe && <span className="ml-1.5 text-xs text-green-400">(You)</span>}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {score.streak > 0 && (
                      <span className="text-xs sm:text-sm text-yellow-400">🔥 {score.streak}</span>
                    )}
                    <span className="text-sm sm:text-base font-bold text-green-400">
                      {score.score}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="shrink-0 px-3 sm:px-4 py-3 border-t border-gray-700/50 space-y-2">
        {myVote === undefined ? (
          <>
            <p className="text-center text-sm text-gray-400 mb-2">
              Continue playing? ({votesCount}/{totalPlayers} voted) - {timeLeft}s left
            </p>
            <div className="flex gap-2">
              <Button onClick={() => onPlayAgain(true)} className="flex-1 py-2.5 text-sm" size="md">
                Yes
              </Button>
              <Button
                variant="secondary"
                onClick={() => onPlayAgain(false)}
                className="flex-1 py-2.5 text-sm"
                size="md"
              >
                No
              </Button>
            </div>
          </>
        ) : (
          <p className="text-center text-sm text-gray-400 py-2">
            Waiting for others... {myVote ? "✅ Voted Yes" : "❌ Voted No"} ({votesCount}/
            {totalPlayers})
          </p>
        )}
      </div>
    </div>
  );
}
