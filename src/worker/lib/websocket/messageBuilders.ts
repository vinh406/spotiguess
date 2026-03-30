import type {
  UserSession,
  RoomSettings,
  Playlist,
  ErrorMessage,
  UserJoinedMessage,
  UserLeftMessage,
  UsersUpdatedMessage,
  RoomCreatedMessage,
  RoomStateMessage,
  SettingsUpdatedMessage,
  PlaylistUpdatedMessage,
  GameEventMessage,
  ChatMessage,
} from "../../../shared/types";

export const MessageBuilders = {
  error(message: string): ErrorMessage {
    return {
      type: "error",
      message,
      timestamp: Date.now(),
    };
  },

  userJoined(
    username: string,
    userId: string,
    room: string,
    isHost: boolean,
    users: UserSession[]
  ): UserJoinedMessage {
    return {
      type: "user_joined",
      username,
      userId,
      room,
      isHost,
      users,
      timestamp: Date.now(),
    };
  },

  userLeft(
    username: string,
    userId: string,
    room: string,
    users: UserSession[]
  ): UserLeftMessage {
    return {
      type: "user_left",
      username,
      userId,
      room,
      users,
      timestamp: Date.now(),
    };
  },

  usersUpdated(users: UserSession[]): UsersUpdatedMessage {
    return {
      type: "users_updated",
      users,
      timestamp: Date.now(),
    };
  },

  roomCreated(
    room: string,
    settings: RoomSettings,
    playlist: Playlist | null
  ): RoomCreatedMessage {
    return {
      type: "room_created",
      room,
      settings,
      playlist,
      timestamp: Date.now(),
    };
  },

  roomState(
    room: string,
    settings: RoomSettings,
    playlist: Playlist | null
  ): RoomStateMessage {
    return {
      type: "room_state",
      room,
      settings,
      playlist,
      timestamp: Date.now(),
    };
  },

  settingsUpdated(settings: RoomSettings): SettingsUpdatedMessage {
    return {
      type: "settings_updated",
      settings,
      timestamp: Date.now(),
    };
  },

  playlistUpdated(playlist: Playlist): PlaylistUpdatedMessage {
    return {
      type: "playlist_updated",
      playlist,
      timestamp: Date.now(),
    };
  },

  gameEvent(
    eventType: string,
    icon: string,
    content: string,
    data: Record<string, unknown> = {}
  ): GameEventMessage {
    const systemCategories = ["ready", "settings", "host", "playlist"];
    const category = systemCategories.some((c) => eventType.includes(c))
      ? "system"
      : "game";

    return {
      type: "game_event",
      payload: {
        eventType,
        category,
        icon,
        content,
        data,
      },
      timestamp: Date.now(),
    };
  },

  chatMessage(
    content: string,
    username: string,
    userId: string,
    room: string
  ): ChatMessage {
    return {
      type: "message",
      content,
      username,
      userId,
      room,
      timestamp: Date.now(),
    };
  },
};

export type { ErrorMessage };