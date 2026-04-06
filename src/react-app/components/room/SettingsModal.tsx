import { useState } from "react";
import { Modal } from "../common/Modal";
import { Button } from "../ui";
import { SettingsToggleGroup } from "./SettingsToggleGroup";
import {
  ROUND_OPTIONS,
  TIME_PER_ROUND_OPTIONS,
  AUDIO_TIME_OPTIONS,
} from "../../../shared/constants";

interface SettingsModalProps {
  rounds: number;
  timePerRound: number;
  audioTime: number;
  isHost: boolean;
  onSave: (settings: {
    rounds: number;
    timePerRound: number;
    audioTime: number;
  }) => void;
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

  const effectiveAudioTime = Math.min(localAudioTime, localTimePerRound);

  return (
    <Modal
      title="Game Settings"
      onClose={onClose}
      footer={
        <Button
          onClick={() =>
            onSave({
              rounds: localRounds,
              timePerRound: localTimePerRound,
              audioTime: effectiveAudioTime,
            })
          }
          className="w-full py-3"
          size="lg"
        >
          Save
        </Button>
      }
    >
      <div className="space-y-6">
        <SettingsToggleGroup
          label="Number of Rounds"
          options={ROUND_OPTIONS}
          value={localRounds}
          onChange={(value) => setLocalRounds(value)}
          disabled={!isHost}
          suffix=""
          cols={4}
        />

        <SettingsToggleGroup
          label="Time per Round (seconds)"
          options={TIME_PER_ROUND_OPTIONS}
          value={localTimePerRound}
          onChange={(time) => {
            setLocalTimePerRound(time);
            if (localAudioTime > time) {
              setLocalAudioTime(time);
            }
          }}
          disabled={!isHost}
        />

        <SettingsToggleGroup
          label="Audio Duration (seconds)"
          options={AUDIO_TIME_OPTIONS}
          value={localAudioTime}
          onChange={(time) => setLocalAudioTime(time)}
          disabled={!isHost}
          isDisabled={(time) => time > localTimePerRound}
        />

        {!isHost && (
          <p className="text-center text-gray-400 text-sm">
            Only the host can change game settings
          </p>
        )}
      </div>
    </Modal>
  );
}
