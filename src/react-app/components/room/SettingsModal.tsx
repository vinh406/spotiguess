import { useState } from "react";
import { Modal } from "../common/Modal";
import { ROUND_OPTIONS, TIME_PER_ROUND_OPTIONS } from "../../../shared/constants";

export interface SettingsModalProps {
  rounds: number;
  timePerRound: number;
  isHost: boolean;
  onSave: (settings: { rounds: number; timePerRound: number }) => void;
  onClose: () => void;
}

export function SettingsModal({
  rounds,
  timePerRound,
  isHost,
  onSave,
  onClose,
}: SettingsModalProps) {
  const [localRounds, setLocalRounds] = useState(rounds);
  const [localTimePerRound, setLocalTimePerRound] = useState(timePerRound);

  return (
    <Modal
      title="Game Settings"
      onClose={onClose}
      footer={
        <button
          onClick={() => onSave({ rounds: localRounds, timePerRound: localTimePerRound })}
          className="w-full py-3 bg-gradient-to-r from-green-400 to-green-600 text-white rounded-xl hover:from-green-500 hover:to-green-700 transition-all font-semibold"
        >
          Save
        </button>
      }
    >
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-3">
            Number of Rounds
          </label>
          <div className="grid grid-cols-4 gap-3">
            {ROUND_OPTIONS.map((r) => (
              <button
                key={r}
                onClick={() => isHost && setLocalRounds(r)}
                disabled={!isHost}
                className={`py-3 rounded-xl font-medium transition-all ${
                  localRounds === r
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
                onClick={() => isHost && setLocalTimePerRound(time)}
                disabled={!isHost}
                className={`py-3 rounded-xl font-medium transition-all ${
                  localTimePerRound === time
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
    </Modal>
  );
}
