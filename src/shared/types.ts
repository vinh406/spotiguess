// Shared type definitions for WebSocket messages and game state

// ============================================================================
// Player & User Types
// ============================================================================

export interface Player {
  userId: string;
  username: string;
  userImage?: string;
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
  maxPlayers: number;
  rounds: number;
  timePerRound: number;
}

export interface Playlist {
  id: string;
  name: string;
  description?: string;
  trackCount: number;
  imageUrl?: string;
}

// ============================================================================
// WebSocket Message Types
// ============================================================================

export interface BaseMessage {
  type: string;
  timestamp: number;
}

export interface JoinMessage extends BaseMessage {
  type: 'join';
  username: string;
  room: string;
  userId: string;
  userImage?: string;
}

export interface LeaveMessage extends BaseMessage {
  type: 'leave';
  username: string;
  room: string;
  userId: string;
}

export interface ChatMessage extends BaseMessage {
  type: 'message' | 'chat_message';
  content: string;
  username?: string;
  userId?: string;
  room?: string;
}

export interface ReadyMessage extends BaseMessage {
  type: 'ready';
}

export interface UpdateSettingsMessage extends BaseMessage {
  type: 'update_settings';
  payload: {
    maxPlayers?: number;
    rounds?: number;
    timePerRound?: number;
  };
}

export interface UpdatePlaylistMessage extends BaseMessage {
  type: 'update_playlist';
  payload: {
    playlist: Playlist;
  };
}

export interface StartGameMessage extends BaseMessage {
  type: 'start_game';
}

export type IncomingMessage =
  | JoinMessage
  | LeaveMessage
  | ChatMessage
  | ReadyMessage
  | UpdateSettingsMessage
  | UpdatePlaylistMessage
  | StartGameMessage
  | BaseMessage;

// ============================================================================
// Server Response Types
// ============================================================================

export interface ErrorMessage extends BaseMessage {
  type: 'error';
  message: string;
}

export interface UserJoinedMessage extends BaseMessage {
  type: 'user_joined';
  username: string;
  userId: string;
  room: string;
  users: UserSession[];
  isHost: boolean;
}

export interface UserLeftMessage extends BaseMessage {
  type: 'user_left';
  username: string;
  userId: string;
  room: string;
  users: UserSession[];
}

export interface UsersUpdatedMessage extends BaseMessage {
  type: 'users_updated';
  users: UserSession[];
}

export interface RoomCreatedMessage extends BaseMessage {
  type: 'room_created';
  room: string;
  settings: RoomSettings;
  playlist: Playlist | null;
}

export interface RoomStateMessage extends BaseMessage {
  type: 'room_state';
  room: string;
  settings: RoomSettings;
  playlist: Playlist | null;
}

export interface SettingsUpdatedMessage extends BaseMessage {
  type: 'settings_updated';
  settings: RoomSettings;
}

export interface PlaylistUpdatedMessage extends BaseMessage {
  type: 'playlist_updated';
  playlist: Playlist;
}

export interface GameEventMessage extends BaseMessage {
  type: 'game_event';
  payload: {
    eventType: string;
    category: 'system' | 'game';
    icon: string;
    content: string;
    data: Record<string, unknown>;
  };
}

export type OutgoingMessage =
  | ErrorMessage
  | UserJoinedMessage
  | UserLeftMessage
  | UsersUpdatedMessage
  | RoomCreatedMessage
  | RoomStateMessage
  | SettingsUpdatedMessage
  | PlaylistUpdatedMessage
  | GameEventMessage
  | ChatMessage;

export type WebSocketMessage = IncomingMessage | OutgoingMessage;
