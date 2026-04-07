// Shared type definitions for WebSocket messages and game state

// ============================================================================
// Player & User Types
// ============================================================================

export interface Player {
  userId: string;
  username: string;
  userImage: string | null;
  isReady: boolean;
  isHost: boolean;
}

export interface UserSession {
  username: string;
  room: string;
  userId: string;
  userImage: string | null;
  isHost: boolean;
  isReady: boolean;
  joinedAt: number;
}

// ============================================================================
// Room & Game Types
// ============================================================================

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

// ============================================================================
// Game Types
// ============================================================================

export interface Song {
  id: string;
  title: string;
  artist: string;
  album: string;
  albumImageUrl?: string;
  previewUrl?: string; // Spotify preview URL
  duration: number; // in milliseconds
}

export interface SongChoice {
  index: number;
  title: string;
  artist: string;
  albumImageUrl?: string;
  isCorrect: boolean;
}

export interface PlayerScore {
  userId: string;
  username: string;
  userImage?: string;
  score: number;
  streak: number; // consecutive correct answers
}

// Game phase types
export type GamePhase = "lobby" | "starting" | "playing" | "roundEnd" | "gameEnd";

export interface GameStateSnapshot {
  phase: GamePhase;
  currentRound: number;
  totalRounds: number;
  songs: Song[];
  currentSongIndex: number;
  choices: SongChoice[];
  scores: Record<string, PlayerScore>;
  answers: Record<string, { choiceIndex: number; answeredAt: number }>;
  roundStartTime: number;
  roundEndTime: number;
  roundDuration: number;
  // Voting for next game
  votes: Record<string, boolean>; // userId -> vote
  voteEndsAt: number | null;
}

export interface UnifiedRoomState {
  room: string;
  settings: RoomSettings;
  playlist: Playlist | null;
  users: UserSession[];
  game: GameStateSnapshot;
}

// ============================================================================
// WebSocket Message Types
// ============================================================================

export interface BaseMessage {
  type: string;
  timestamp: number;
}

export interface JoinMessage extends BaseMessage {
  type: "join";
  username: string;
  room: string;
  userId: string;
  userImage?: string;
}

export interface LeaveMessage extends BaseMessage {
  type: "leave";
  username: string;
  room: string;
  userId: string;
}

export interface ChatMessage extends BaseMessage {
  type: "message" | "chat_message";
  content: string;
  username?: string;
  userId?: string;
  room?: string;
}

export interface ReadyMessage extends BaseMessage {
  type: "ready";
}

export interface UpdateSettingsMessage extends BaseMessage {
  type: "update_settings";
  payload: {
    rounds?: number;
    timePerRound?: number;
    audioTime?: number;
  };
}

export interface UpdatePlaylistMessage extends BaseMessage {
  type: "update_playlist";
  payload: {
    playlist: Playlist;
  };
}

export interface StartGameMessage extends BaseMessage {
  type: "start_game";
}

export interface AnswerMessage extends BaseMessage {
  type: "answer";
  choiceIndex: number;
}

export interface VotePlayAgainMessage extends BaseMessage {
  type: "vote_play_again";
  vote: boolean;
}

export type IncomingMessage =
  | JoinMessage
  | LeaveMessage
  | ChatMessage
  | ReadyMessage
  | UpdateSettingsMessage
  | UpdatePlaylistMessage
  | StartGameMessage
  | AnswerMessage
  | VotePlayAgainMessage
  | BaseMessage;

// ============================================================================
// Server Response Types
// ============================================================================

export interface ErrorMessage extends BaseMessage {
  type: "error";
  content: string;
}

export interface UserJoinedMessage extends BaseMessage {
  type: "user_joined";
  username: string;
  userId: string;
  room: string;
  users: UserSession[];
  isHost: boolean;
}

export interface UserLeftMessage extends BaseMessage {
  type: "user_left";
  username: string;
  userId: string;
  room: string;
  users: UserSession[];
}

export interface UsersUpdatedMessage extends BaseMessage {
  type: "users_updated";
  users: UserSession[];
}

export interface UnifiedRoomStateMessage extends BaseMessage {
  type: "unified_room_state";
  state: UnifiedRoomState;
}

export interface SettingsUpdatedMessage extends BaseMessage {
  type: "settings_updated";
  settings: RoomSettings;
}

export interface PlaylistUpdatedMessage extends BaseMessage {
  type: "playlist_updated";
  playlist: Playlist;
}

export interface GameEventMessage extends BaseMessage {
  type: "game_event";
  payload: {
    eventType: string;
    category: "system" | "game";
    icon: string;
    content: string;
    data: Record<string, unknown>;
  };
}

// ============================================================================
// Game WebSocket Message Types
// ============================================================================

export interface GameStartedMessage extends BaseMessage {
  type: "game_started";
  totalRounds: number;
  timePerRound: number;
  audioTime: number;
}

export interface RoundStartedMessage extends BaseMessage {
  type: "round_started";
  round: number;
  totalRounds: number;
  song: Song;
  choices: SongChoice[];
  startTime: number;
  endTime: number;
  duration: number;
}

export interface RoundEndedMessage extends BaseMessage {
  type: "round_ended";
  round: number;
  correctAnswer: SongChoice;
  scores: PlayerScore[];
}

export interface GameEndedMessage extends BaseMessage {
  type: "game_ended";
  finalScores: PlayerScore[];
  voteEndsAt: number;
}

export interface AnswerResultMessage extends BaseMessage {
  type: "answer_result";
  isCorrect: boolean;
  points: number;
  streak: number;
}

export interface LeaderboardUpdateMessage extends BaseMessage {
  type: "leaderboard_update";
  leaderboard: PlayerScore[];
}

export interface VoteUpdateMessage extends BaseMessage {
  type: "vote_update";
  votes: Record<string, boolean>;
  voteEndsAt: number;
}

export type OutgoingMessage =
  | ErrorMessage
  | UserJoinedMessage
  | UserLeftMessage
  | UsersUpdatedMessage
  | UnifiedRoomStateMessage
  | SettingsUpdatedMessage
  | PlaylistUpdatedMessage
  | GameEventMessage
  | ChatMessage
  | GameStartedMessage
  | RoundStartedMessage
  | RoundEndedMessage
  | GameEndedMessage
  | AnswerResultMessage
  | LeaderboardUpdateMessage
  | VoteUpdateMessage;


/**
 * OutgoingMessage with room connection stats added by broadcastToRoom.
 */
export type BroadcastMessage = OutgoingMessage & {
  connections: number;
  totalConnections: number;
};
