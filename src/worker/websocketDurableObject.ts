import { DurableObject } from "cloudflare:workers";
import type {
  UserSession,
  IncomingMessage,
  JoinMessage,
  ChatMessage,
  UpdateSettingsMessage,
  UpdatePlaylistMessage,
  AnswerMessage,
  Song,
  VotePlayAgainMessage,
} from "../shared/types";
import { MessageBuilders, broadcastToRoom, sendToSocket, RoomManager } from "./lib/websocket";
import {
  MAX_USERNAME_LENGTH,
  MAX_CHAT_MESSAGE_LENGTH,
  ROOM_CODE_REGEX,
  SCORING,
} from "../shared/constants";
import { getPlaylistTracks } from "./lib/spotify/playlists";

// Durable Object that manages WebSocket connections and room state for a single game instance
export class WebSocketHibernationServer extends DurableObject {
  private roomManager: RoomManager;
  private spotifyEnv: Env;
  private voteTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);

    this.spotifyEnv = env;
    this.roomManager = new RoomManager();

    // Restore existing sessions from hibernated WebSocket connections
    const existingSessions = new Map<WebSocket, UserSession>();
    ctx.getWebSockets().forEach((webSocket) => {
      const meta = webSocket.deserializeAttachment() as UserSession | null;
      if (meta) {
        existingSessions.set(webSocket, { ...meta });
      }
    });
    this.roomManager.setSessions(existingSessions);
  }

  // ============================================================================
  // WebSocket Connection Handling
  // ============================================================================

  async fetch(): Promise<Response> {
    const webSocketPair = new WebSocketPair();
    const client = webSocketPair[0] as WebSocket;
    const server = webSocketPair[1] as WebSocket;

    if (!client || !server) {
      return new Response("WebSocket creation failed", { status: 500 });
    }

    this.ctx.acceptWebSocket(server);

    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    const messageString = typeof message === "string" ? message : new TextDecoder().decode(message);

    let parsedMessage: IncomingMessage;
    try {
      parsedMessage = JSON.parse(messageString);
    } catch {
      // Handle non-JSON messages as chat messages
      parsedMessage = {
        type: "message",
        content: messageString,
        timestamp: Date.now(),
      };
    }

    await this.handleMessage(ws, parsedMessage);
  }

  async webSocketClose(ws: WebSocket): Promise<void> {
    const session = this.roomManager.getUserSession(ws);
    if (session) {
      await this.handleLeaveRoom(ws, session);
    }
  }

  // ============================================================================
  // Message Router
  // ============================================================================

  private async handleMessage(ws: WebSocket, message: IncomingMessage): Promise<void> {
    switch (message.type) {
      case "join":
        await this.handleJoinRoom(ws, message as JoinMessage);
        break;
      case "leave":
        await this.handleLeave(ws);
        break;
      case "message":
      case "chat_message":
        await this.handleChatMessage(ws, message as ChatMessage);
        break;
      case "ready":
        await this.handleReady(ws);
        break;
      case "update_settings":
        await this.handleUpdateSettings(ws, message as UpdateSettingsMessage);
        break;
      case "update_playlist":
        await this.handleUpdatePlaylist(ws, message as UpdatePlaylistMessage);
        break;
      case "start_game":
        await this.handleStartGame(ws);
        break;
      case "answer":
        await this.handleAnswer(ws, message as AnswerMessage);
        break;
      case "vote_play_again":
        await this.handleVote(ws, message as VotePlayAgainMessage);
        break;
      default:
        await this.handleChatMessage(ws, message as ChatMessage);
    }
  }

  // ============================================================================
  // Validation Helpers
  // ============================================================================

  private validateSession(ws: WebSocket): UserSession | null {
    const session = this.roomManager.getUserSession(ws);
    if (!session) {
      sendToSocket(ws, MessageBuilders.error("You must join a room first"));
      return null;
    }
    return session;
  }

  private validateHost(ws: WebSocket, session: UserSession): boolean {
    if (!session.isHost) {
      sendToSocket(ws, MessageBuilders.error("Only the host can perform this action"));
      return false;
    }
    return true;
  }

  // ============================================================================
  // Message Handlers
  // ============================================================================

  private async handleJoinRoom(ws: WebSocket, data: JoinMessage): Promise<void> {
    const { username, room, userId, userImage } = data;

    // Validate required fields
    if (!username || !room || !userId) {
      sendToSocket(ws, MessageBuilders.error("Missing required fields: username, room, or userId"));
      return;
    }

    // Validate room code format
    if (!ROOM_CODE_REGEX.test(room)) {
      sendToSocket(ws, MessageBuilders.error("Invalid room code format"));
      return;
    }

    // Sanitize and validate username
    const trimmedUsername = username.trim();
    if (!trimmedUsername) {
      sendToSocket(ws, MessageBuilders.error("Username cannot be empty"));
      return;
    }
    if (trimmedUsername.length > MAX_USERNAME_LENGTH) {
      sendToSocket(
        ws,
        MessageBuilders.error(`Username must be ${MAX_USERNAME_LENGTH} characters or less`),
      );
      return;
    }

    // Check if user is already in this room - allow reconnection
    const existingWs = this.roomManager.findSessionByUserId(userId, room);
    if (existingWs) {
      // Remove existing session - user is reconnecting
      this.roomManager.removeUserSession(existingWs);
      try {
        existingWs.close();
      } catch {
        // Ignore close errors
      }
    }

    // Check if this is the first player (becomes host)
    const existingPlayers = this.roomManager.getUsersInRoom(room);
    const isFirstPlayer = existingPlayers.length === 0;

    // Create user session
    const session: UserSession = {
      username: trimmedUsername,
      room,
      userId,
      userImage: userImage || null,
      isHost: isFirstPlayer,
      isReady: false,
      joinedAt: Date.now(),
    };

    // Store session
    this.roomManager.setUserSession(ws, session);
    ws.serializeAttachment(session);

    // Get all users in room (including the new one)
    const roomUsers = this.roomManager.getUsersInRoom(room);

    // Notify all users in the room about the new player
    const joinMessage = MessageBuilders.userJoined(
      trimmedUsername,
      userId,
      room,
      isFirstPlayer,
      roomUsers,
    );
    broadcastToRoom(this.roomManager.getSessions(), room, joinMessage);

    // Add player to scores if game is already in progress
    const gamePhase = this.roomManager.getCurrentGamePhase();
    if (gamePhase !== "lobby") {
      this.roomManager.addPlayerToScores(userId, trimmedUsername, userImage || undefined);
    }

    // Send unified room state to joining player
    const unifiedState = this.roomManager.getUnifiedRoomState(room);
    sendToSocket(ws, MessageBuilders.unifiedRoomState(unifiedState));
  }

  private async handleLeave(ws: WebSocket): Promise<void> {
    const session = this.roomManager.getUserSession(ws);
    if (session) {
      await this.handleLeaveRoom(ws, session);
    }
  }

  private async handleLeaveRoom(ws: WebSocket, session: UserSession): Promise<void> {
    const { username, room, userId, isHost } = session;

    // Get remaining users BEFORE deletion (need to find new host from these)
    const sessions = this.roomManager.getSessions();
    const remainingUserEntries = Array.from(sessions.entries()).filter(
      ([s, sess]) => s !== ws && sess.room === room,
    );

    // Remove user session FIRST
    this.roomManager.removeUserSession(ws);

    // Handle host transfer - find the WebSocket of the first remaining user
    if (isHost && remainingUserEntries.length > 0) {
      const [newHostWs, newHostSession] = remainingUserEntries[0]!;

      // Update the session object in the Map with new host status
      newHostSession.isHost = true;
      this.roomManager.setUserSession(newHostWs, newHostSession);

      // Update serialization for new host
      newHostWs.serializeAttachment(newHostSession);

      // Broadcast host change
      const hostChangedMessage = MessageBuilders.gameEvent(
        "host_changed",
        "crown",
        `${newHostSession.username} is now the host`,
        { newHostId: newHostSession.userId, newHostName: newHostSession.username },
      );
      broadcastToRoom(this.roomManager.getSessions(), room, hostChangedMessage);
    }

    // Get remaining users in the room (after host transfer)
    const roomUsers = this.roomManager.getUsersInRoom(room);

    // Notify remaining users with updated user list
    const leaveMessage = MessageBuilders.userLeft(username, userId, room, roomUsers);
    broadcastToRoom(this.roomManager.getSessions(), room, leaveMessage);
  }

  private async handleChatMessage(ws: WebSocket, data: ChatMessage): Promise<void> {
    const session = this.validateSession(ws);
    if (!session) return;

    const trimmedContent = data.content?.trim() || "";
    if (!trimmedContent) return; // Ignore empty messages
    if (trimmedContent.length > MAX_CHAT_MESSAGE_LENGTH) {
      sendToSocket(
        ws,
        MessageBuilders.error(`Message must be ${MAX_CHAT_MESSAGE_LENGTH} characters or less`),
      );
      return;
    }

    const message = MessageBuilders.chatMessage(
      trimmedContent,
      session.username,
      session.userId,
      session.room,
    );

    broadcastToRoom(this.roomManager.getSessions(), session.room, message);
  }

  private async handleReady(ws: WebSocket): Promise<void> {
    const session = this.validateSession(ws);
    if (!session) return;

    // Toggle ready state
    session.isReady = !session.isReady;
    this.roomManager.setUserSession(ws, session);
    ws.serializeAttachment(session);

    // Broadcast updated user list (includes ready state)
    const usersMessage = MessageBuilders.usersUpdated(
      this.roomManager.getUsersInRoom(session.room),
    );
    broadcastToRoom(this.roomManager.getSessions(), session.room, usersMessage);
  }

  private async handleUpdateSettings(ws: WebSocket, data: UpdateSettingsMessage): Promise<void> {
    const session = this.validateSession(ws);
    if (!session) return;

    if (!this.validateHost(ws, session)) return;

    const { rounds, timePerRound, audioTime } = data.payload || {};
    const updatedSettings = this.roomManager.updateSettings(rounds, timePerRound, audioTime);

    // Broadcast settings update
    const settingsMessage = MessageBuilders.settingsUpdated(updatedSettings);
    broadcastToRoom(this.roomManager.getSessions(), session.room, settingsMessage);
  }

  private async handleUpdatePlaylist(ws: WebSocket, data: UpdatePlaylistMessage): Promise<void> {
    const session = this.validateSession(ws);
    if (!session) return;

    if (!this.validateHost(ws, session)) return;

    const { playlist } = data.payload || {};
    if (!playlist) return;

    this.roomManager.setRoomPlaylist(playlist);

    // Broadcast playlist update
    const playlistMessage = MessageBuilders.playlistUpdated(playlist);
    broadcastToRoom(this.roomManager.getSessions(), session.room, playlistMessage);
  }

  private async handleStartGame(ws: WebSocket): Promise<void> {
    const session = this.validateSession(ws);
    if (!session) return;

    if (!this.validateHost(ws, session)) return;

    if (!this.roomManager.tryStartGame()) {
      sendToSocket(ws, MessageBuilders.error("Game is already starting or in progress"));
      return;
    }

    const roomUsers = this.roomManager.getUsersInRoom(session.room);

    if (roomUsers.length < 1) {
      this.roomManager.cancelStartGame();
      sendToSocket(ws, MessageBuilders.error("Need at least 1 player to start"));
      return;
    }

    const settings = this.roomManager.getRoomSettings();
    const roomPlaylist = this.roomManager.getRoomPlaylist();

    let songs: Song[] = [];
    if (roomPlaylist?.id) {
      songs = await getPlaylistTracks(roomPlaylist.id);
    }

    if (songs.length < settings.rounds) {
      this.roomManager.cancelStartGame();
      sendToSocket(
        ws,
        MessageBuilders.error("Not enough songs available. Please set a larger Spotify playlist."),
      );
      return;
    }

    this.roomManager.initGame(songs, settings.rounds, session.room);
    this.roomManager.setLastFmApiKey(this.spotifyEnv.LAST_FM_API_KEY);

    const gameStartedMessage = MessageBuilders.gameStarted(
      settings.rounds,
      settings.timePerRound,
      settings.audioTime,
    );
    broadcastToRoom(this.roomManager.getSessions(), session.room, gameStartedMessage);

    setTimeout(() => {
      this.handleStartRoundInternal(session.room);
    }, 2000);
  }

  private async handleStartRoundInternal(room: string): Promise<void> {
    const roundData = await this.roomManager.startRound(() => this.handleEndRoundInternal(room));

    const songData = {
      previewUrl: roundData.song.previewUrl,
      albumImageUrl: roundData.song.albumImageUrl,
    };

    const roundStartedMessage = MessageBuilders.roundStarted(
      roundData.round,
      roundData.totalRounds,
      songData,
      roundData.choices,
      roundData.startTime,
      roundData.endTime,
      roundData.duration,
    );
    broadcastToRoom(this.roomManager.getSessions(), room, roundStartedMessage);
  }

  private handleEndRoundInternal(room: string): void {
    const roundThatJustEnded = this.roomManager.getCurrentRound();
    const { correctAnswer, scores } = this.roomManager.endRound();

    const settings = this.roomManager.getRoomSettings();
    const totalRounds = settings.rounds;
    const currentRound = this.roomManager.getCurrentRound();

    if (currentRound <= totalRounds) {
      const nextRoundAt = Date.now() + SCORING.ROUND_END_DELAY;
      const roundEndedMessage = MessageBuilders.roundEnded(
        roundThatJustEnded,
        correctAnswer,
        scores,
        nextRoundAt,
      );
      broadcastToRoom(this.roomManager.getSessions(), room, roundEndedMessage);

      const leaderboardMessage = MessageBuilders.leaderboardUpdate(scores);
      broadcastToRoom(this.roomManager.getSessions(), room, leaderboardMessage);

      setTimeout(() => {
        this.handleStartRoundInternal(room);
      }, SCORING.ROUND_END_DELAY);
    } else {
      // For the last round, transition to game end phase first to get final state
      const { voteEndsAt } = this.roomManager.endGame(SCORING.VOTE_DURATION);

      // Send a single merged message for both round and game end
      const roundEndedMessage = MessageBuilders.roundEnded(
        roundThatJustEnded,
        correctAnswer,
        scores,
        undefined, // nextRoundAt
        true, // isFinal
        voteEndsAt,
      );
      broadcastToRoom(this.roomManager.getSessions(), room, roundEndedMessage);

      const leaderboardMessage = MessageBuilders.leaderboardUpdate(scores);
      broadcastToRoom(this.roomManager.getSessions(), room, leaderboardMessage);

      // Setup the timer to return to lobby
      if (this.voteTimer) clearTimeout(this.voteTimer);
      this.voteTimer = setTimeout(() => {
        // Only reset if we're still in the voting period and it hasn't been reset yet
        if (this.roomManager.getVoteEndsAt()) {
          this.roomManager.resetGame(room);
          const unifiedState = this.roomManager.getUnifiedRoomState(room);
          broadcastToRoom(
            this.roomManager.getSessions(),
            room,
            MessageBuilders.unifiedRoomState(unifiedState),
          );
        }
        this.voteTimer = null;
      }, SCORING.VOTE_DURATION);
    }
  }

  private async handleVote(ws: WebSocket, data: VotePlayAgainMessage): Promise<void> {
    const session = this.validateSession(ws);
    if (!session) return;

    if (!this.roomManager.getVoteEndsAt()) {
      sendToSocket(ws, MessageBuilders.error("No active vote at this time"));
      return;
    }

    this.roomManager.recordVote(session.userId, data.vote);

    const votes = this.roomManager.getVotes();
    const voteEndsAt = this.roomManager.getVoteEndsAt() || 0;
    const voteUpdateMessage = MessageBuilders.voteUpdate(votes, voteEndsAt);
    broadcastToRoom(this.roomManager.getSessions(), session.room, voteUpdateMessage);

    if (!data.vote) {
      // Someone voted NO, immediately return to lobby after a short delay
      if (this.voteTimer) clearTimeout(this.voteTimer);
      this.voteTimer = setTimeout(() => {
        this.roomManager.resetGame(session.room);
        const unifiedState = this.roomManager.getUnifiedRoomState(session.room);
        broadcastToRoom(
          this.roomManager.getSessions(),
          session.room,
          MessageBuilders.unifiedRoomState(unifiedState),
        );
        this.voteTimer = null;
      }, 3000);
      return;
    }

    if (this.roomManager.allPlayersVoted(session.room)) {
      if (this.roomManager.didAllPlayersVoteYes()) {
        if (this.voteTimer) clearTimeout(this.voteTimer);
        this.voteTimer = null;
        await this.handleContinueGame(session.room);
      } else {
        // Not everyone voted yes
        if (this.voteTimer) clearTimeout(this.voteTimer);
        this.voteTimer = setTimeout(() => {
          this.roomManager.resetGame(session.room);
          const unifiedState = this.roomManager.getUnifiedRoomState(session.room);
          broadcastToRoom(
            this.roomManager.getSessions(),
            session.room,
            MessageBuilders.unifiedRoomState(unifiedState),
          );
          this.voteTimer = null;
        }, 3000);
      }
    }
  }

  private async handleContinueGame(room: string): Promise<void> {
    const settings = this.roomManager.getRoomSettings();
    const roomPlaylist = this.roomManager.getRoomPlaylist();

    let songs: Song[] = [];
    if (roomPlaylist?.id) {
      songs = await getPlaylistTracks(roomPlaylist.id);
    }

    // We pass isContinuing=true to keep the songs list and index
    this.roomManager.initGame(songs, settings.rounds, room, true);

    const gameStartedMessage = MessageBuilders.gameStarted(
      settings.rounds,
      settings.timePerRound,
      settings.audioTime,
    );
    broadcastToRoom(this.roomManager.getSessions(), room, gameStartedMessage);

    setTimeout(() => {
      this.handleStartRoundInternal(room);
    }, 2000);
  }

  private async handleAnswer(ws: WebSocket, data: AnswerMessage): Promise<void> {
    const session = this.validateSession(ws);
    if (!session) return;

    if (this.roomManager.getCurrentGamePhase() !== "playing") {
      sendToSocket(ws, MessageBuilders.error("Game is not currently playing"));
      return;
    }

    const { isCorrect, points, streak } = this.roomManager.recordAnswer(
      session.userId,
      data.choiceIndex,
    );

    const answerResultMessage = MessageBuilders.answerResult(isCorrect, points, streak);
    sendToSocket(ws, answerResultMessage);

    const scores = this.roomManager.getScores();
    const leaderboardMessage = MessageBuilders.leaderboardUpdate(scores);
    broadcastToRoom(this.roomManager.getSessions(), session.room, leaderboardMessage);

    this.roomManager.checkAndEndRoundEarly(session.room, () =>
      this.handleEndRoundInternal(session.room),
    );
  }
}
