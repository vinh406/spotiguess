import type {
  UserSession,
  RoomSettings,
  Playlist,
  ErrorMessage,
  UserJoinedMessage,
  UserLeftMessage,
  UsersUpdatedMessage,
  RoomStateMessage,
  SettingsUpdatedMessage,
  PlaylistUpdatedMessage,
  GameEventMessage,
  ChatMessage,
  GameStartedMessage,
  RoundStartedMessage,
  RoundEndedMessage,
  GameEndedMessage,
  AnswerResultMessage,
  LeaderboardUpdateMessage,
  SongChoice,
  PlayerScore,
  GamePhase,
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

  gameStarted(totalRounds: number, timePerRound: number, audioTime: number): GameStartedMessage {
    return {
      type: "game_started",
      totalRounds,
      timePerRound,
      audioTime,
      timestamp: Date.now(),
    };
  },

  roundStarted(
    round: number,
    totalRounds: number,
    song: { previewUrl?: string; albumImageUrl?: string },
    choices: SongChoice[],
    startTime: number
  ): RoundStartedMessage {
    return {
      type: "round_started",
      round,
      totalRounds,
      song: {
        id: '',
        title: '',
        artist: '',
        album: '',
        previewUrl: song.previewUrl,
        albumImageUrl: song.albumImageUrl,
        duration: 0,
      },
      choices,
      startTime,
      timestamp: Date.now(),
    };
  },

  roundEnded(
    round: number,
    correctAnswer: SongChoice,
    scores: PlayerScore[]
  ): RoundEndedMessage {
    return {
      type: "round_ended",
      round,
      correctAnswer,
      scores,
      timestamp: Date.now(),
    };
  },

  gameEnded(finalScores: PlayerScore[]): GameEndedMessage {
    return {
      type: "game_ended",
      finalScores,
      timestamp: Date.now(),
    };
  },

  answerResult(isCorrect: boolean, points: number, streak: number): AnswerResultMessage {
    return {
      type: "answer_result",
      isCorrect,
      points,
      streak,
      timestamp: Date.now(),
    };
  },

  leaderboardUpdate(leaderboard: PlayerScore[]): LeaderboardUpdateMessage {
    return {
      type: "leaderboard_update",
      leaderboard,
      timestamp: Date.now(),
    };
  },

  gameState(
    gamePhase: GamePhase,
    currentRound: number,
    totalRounds: number,
    currentSong: { previewUrl?: string; albumImageUrl?: string },
    choices: SongChoice[],
    roundStartTime: number,
    scores: PlayerScore[],
    myScore: number,
    myStreak: number,
    hasAnswered: boolean,
    selectedChoice: number | null
  ): any {
    return {
      type: "game_state",
      gamePhase,
      currentRound,
      totalRounds,
      currentSong,
      choices,
      roundStartTime,
      scores,
      myScore,
      myStreak,
      hasAnswered,
      selectedChoice,
      timestamp: Date.now(),
    };
  },
};

export type { ErrorMessage };