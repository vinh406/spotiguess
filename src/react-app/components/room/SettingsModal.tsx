export interface SettingsModalProps {
  rounds: number;
  timePerRound: number;
  isHost: boolean;
  onRoundsChange: (rounds: number) => void;
  onTimePerRoundChange: (time: number) => void;
  onClose: () => void;
}

const ROUND_OPTIONS = [5, 10, 15, 20];
const TIME_PER_ROUND_OPTIONS = [15, 30, 45, 60, 90];

export function SettingsModal({
  rounds,
  timePerRound,
  isHost,
  onRoundsChange,
  onTimePerRoundChange,
  onClose,
}: SettingsModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-2xl w-full max-w-md border border-gray-700/50 shadow-xl">
        <div className="flex items-center justify-between p-6 border-b border-gray-700/50">
          <h2 className="text-xl font-bold text-white">Game Settings</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">
              Number of Rounds
            </label>
            <div className="grid grid-cols-4 gap-3">
              {ROUND_OPTIONS.map((r) => (
                <button
                  key={r}
                  onClick={() => isHost && onRoundsChange(r)}
                  disabled={!isHost}
                  className={`py-3 rounded-xl font-medium transition-all ${
                    rounds === r
                      ? "bg-green-500 text-white"
                      : "bg-gray-700/50 text-gray-300 hover:bg-gray-600/50 border border-gray-600"
                  } ${!isHost ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">
              Time per Round (seconds)
            </label>
            <div className="grid grid-cols-5 gap-3">
              {TIME_PER_ROUND_OPTIONS.map((time) => (
                <button
                  key={time}
                  onClick={() => isHost && onTimePerRoundChange(time)}
                  disabled={!isHost}
                  className={`py-3 rounded-xl font-medium transition-all ${
                    timePerRound === time
                      ? "bg-green-500 text-white"
                      : "bg-gray-700/50 text-gray-300 hover:bg-gray-600/50 border border-gray-600"
                  } ${!isHost ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  {time}s
                </button>
              ))}
            </div>
          </div>

          {!isHost && (
            <p className="text-center text-gray-400 text-sm">
              Only the host can change game settings
            </p>
          )}
        </div>

        <div className="p-6 border-t border-gray-700/50">
          <button
            onClick={onClose}
            className="w-full py-3 bg-gradient-to-r from-green-400 to-green-600 text-white rounded-xl hover:from-green-500 hover:to-green-700 transition-all font-semibold"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
