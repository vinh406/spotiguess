import { GameStateSnapshot } from "./game";
import { UserSession } from "./player";

export interface RoomSettings {
  rounds: number;
  timePerRound: number;
  audioTime: number;
}

export interface Playlist {
  id: string;
  name: string;
  description?: string;
  trackCount: number;
  imageUrl?: string;
}

export interface UnifiedRoomState {
  room: string;
  settings: RoomSettings;
  playlist: Playlist | null;
  users: UserSession[];
  game: GameStateSnapshot;
}
