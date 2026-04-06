import { useState } from "react";
import { Modal } from "../common/Modal";
import { Button } from "../ui";
import { ROUND_OPTIONS, TIME_PER_ROUND_OPTIONS, AUDIO_TIME_OPTIONS } from "../../../shared/constants";

interface SettingsModalProps {
  rounds: number;
  timePerRound: number; // in seconds
  audioTime: number; // in seconds
  isHost: boolean;
  onSave: (settings: { rounds: number; timePerRound: number; audioTime: number }) => void;
  onClose: () => void;
}

export function SettingsModal({
  rounds,
  timePerRound,
  audioTime,
  isHost,
  onSave,
  onClose,
}: SettingsModalProps) {
  const [localRounds, setLocalRounds] = useState(rounds);
  const [localTimePerRound, setLocalTimePerRound] = useState(timePerRound);
  const [localAudioTime, setLocalAudioTime] = useState(audioTime);

  // Validate audioTime <= timePerRound
  const effectiveAudioTime = Math.min(localAudioTime, localTimePerRound);

  return (
    <Modal
      title="Game Settings"
      onClose={onClose}
      footer={
        <Button
          onClick={() => onSave({ rounds: localRounds, timePerRound: localTimePerRound, audioTime: effectiveAudioTime })}
          className="w-full py-3"
          size="lg"
        >
          Save
        </Button>
      }
    >
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-3">
            Number of Rounds
          </label>
          <div className="grid grid-cols-4 gap-3">
            {ROUND_OPTIONS.map((r) => (
              <Button
                key={r}
                variant={localRounds === r ? "primary" : "secondary"}
                onClick={() => isHost && setLocalRounds(r)}
                disabled={!isHost}
                className={`py-3 ${!isHost ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                {r}
              </Button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-3">
            Time per Round (seconds)
          </label>
          <div className="grid grid-cols-5 gap-3">
            {TIME_PER_ROUND_OPTIONS.map((time) => (
              <Button
                key={time}
                variant={localTimePerRound === time ? "primary" : "secondary"}
                onClick={() => {
                    if (isHost) {
                        setLocalTimePerRound(time);
                        if (localAudioTime > time) {
                            setLocalAudioTime(time);
                        }
                    }
                }}
                disabled={!isHost}
                className={`py-3 ${!isHost ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                {time}s
              </Button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-3">
            Audio Duration (seconds)
          </label>
          <div className="grid grid-cols-5 gap-3">
            {AUDIO_TIME_OPTIONS.map((time) => (
              <Button
                key={time}
                variant={localAudioTime === time ? "primary" : "secondary"}
                onClick={() => isHost && setLocalAudioTime(time)}
                disabled={!isHost || time > localTimePerRound}
                className={`py-3 ${!isHost || time > localTimePerRound ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                {time}s
              </Button>
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
