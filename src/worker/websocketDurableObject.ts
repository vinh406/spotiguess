import { DurableObject } from "cloudflare:workers";
import type {
  UserSession,
  IncomingMessage,
  JoinMessage,
  ChatMessage,
  UpdateSettingsMessage,
  UpdatePlaylistMessage,
} from "../shared/types";
import { MessageBuilders, broadcastToRoom, sendToSocket } from "./lib/websocket";
import { MAX_USERNAME_LENGTH, MAX_CHAT_MESSAGE_LENGTH, ROOM_CODE_REGEX } from "../shared/constants";
import { RoomManager } from "./lib/websocket/roomManager";

// Durable Object that manages WebSocket connections and room state for a single game instance
export class WebSocketHibernationServer extends DurableObject {
  private roomManager: RoomManager;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);

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

  async fetch(_request: Request): Promise<Response> {
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

  async webSocketMessage(
    ws: WebSocket,
    message: string | ArrayBuffer
  ): Promise<void> {
    const messageString =
      typeof message === "string"
        ? message
        : new TextDecoder().decode(message);

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

  async webSocketClose(
    ws: WebSocket,
    code: number,
    _reason: string,
    _wasClean: boolean
  ): Promise<void> {
    const session = this.roomManager.getUserSession(ws);
    if (session) {
      await this.handleLeaveRoom(ws, session);
    }
    ws.close(code, "Durable Object is closing WebSocket");
  }

  // ============================================================================
  // Message Router
  // ============================================================================

  private async handleMessage(
    ws: WebSocket,
    message: IncomingMessage
  ): Promise<void> {
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
        await this.handleReady(ws, message);
        break;
      case "update_settings":
        await this.handleUpdateSettings(ws, message as UpdateSettingsMessage);
        break;
      case "update_playlist":
        await this.handleUpdatePlaylist(ws, message as UpdatePlaylistMessage);
        break;
      case "start_game":
        await this.handleStartGame(ws, message);
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

  private async handleJoinRoom(
    ws: WebSocket,
    data: JoinMessage
  ): Promise<void> {
    const { username, room, userId, userImage } = data;

    // Validate required fields
    if (!username || !room || !userId) {
      sendToSocket(
        ws,
        MessageBuilders.error("Missing required fields: username, room, or userId")
      );
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
      sendToSocket(ws, MessageBuilders.error(`Username must be ${MAX_USERNAME_LENGTH} characters or less`));
      return;
    }

    // Check if user is already in this room
    const existingWs = this.roomManager.findSessionByUserId(userId, room);
    if (existingWs) {
      sendToSocket(ws, MessageBuilders.error("You are already in this room"));
      return;
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
      roomUsers
    );
    broadcastToRoom(this.roomManager.getSessions(), room, joinMessage);

    // Send room state to joining player
    const roomStateMessage = MessageBuilders.roomState(
      room,
      this.roomManager.getRoomSettings(),
      this.roomManager.getRoomPlaylist()
    );
    sendToSocket(ws, roomStateMessage);
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
    const remainingUserEntries = Array.from(sessions.entries())
      .filter(([s, sess]) => s !== ws && sess.room === room);

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
        { newHostId: newHostSession.userId, newHostName: newHostSession.username }
      );
      broadcastToRoom(this.roomManager.getSessions(), room, hostChangedMessage);
    }

    // Get remaining users in the room (after host transfer)
    const roomUsers = this.roomManager.getUsersInRoom(room);

    // Notify remaining users with updated user list
    const leaveMessage = MessageBuilders.userLeft(username, userId, room, roomUsers);
    broadcastToRoom(this.roomManager.getSessions(), room, leaveMessage);
  }

  private async handleChatMessage(
    ws: WebSocket,
    data: ChatMessage
  ): Promise<void> {
    const session = this.validateSession(ws);
    if (!session) return;

    const trimmedContent = data.content?.trim() || "";
    if (!trimmedContent) return; // Ignore empty messages
    if (trimmedContent.length > MAX_CHAT_MESSAGE_LENGTH) {
      sendToSocket(ws, MessageBuilders.error(`Message must be ${MAX_CHAT_MESSAGE_LENGTH} characters or less`));
      return;
    }

    const message = MessageBuilders.chatMessage(
      trimmedContent,
      session.username,
      session.userId,
      session.room
    );

    broadcastToRoom(this.roomManager.getSessions(), session.room, message);
  }

  private async handleReady(
    ws: WebSocket,
    _data: IncomingMessage
  ): Promise<void> {
    const session = this.validateSession(ws);
    if (!session) return;

    // Toggle ready state
    session.isReady = !session.isReady;
    this.roomManager.setUserSession(ws, session);
    ws.serializeAttachment(session);

    // Broadcast updated user list (includes ready state)
    const usersMessage = MessageBuilders.usersUpdated(
      this.roomManager.getUsersInRoom(session.room)
    );
    broadcastToRoom(this.roomManager.getSessions(), session.room, usersMessage);
  }

  private async handleUpdateSettings(
    ws: WebSocket,
    data: UpdateSettingsMessage
  ): Promise<void> {
    const session = this.validateSession(ws);
    if (!session) return;

    if (!this.validateHost(ws, session)) return;

    const { rounds, timePerRound } = data.payload || {};
    const updatedSettings = this.roomManager.updateSettings(
      rounds,
      timePerRound
    );

    // Broadcast settings update
    const settingsMessage = MessageBuilders.settingsUpdated(updatedSettings);
    broadcastToRoom(this.roomManager.getSessions(), session.room, settingsMessage);
  }

  private async handleUpdatePlaylist(
    ws: WebSocket,
    data: UpdatePlaylistMessage
  ): Promise<void> {
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

  private async handleStartGame(
    ws: WebSocket,
    _data: IncomingMessage
  ): Promise<void> {
    const session = this.validateSession(ws);
    if (!session) return;

    if (!this.validateHost(ws, session)) return;

    const roomUsers = this.roomManager.getUsersInRoom(session.room);

    // Check minimum players
    if (roomUsers.length < 2) {
      sendToSocket(ws, MessageBuilders.error("Need at least 2 players to start"));
      return;
    }

    const settings = this.roomManager.getRoomSettings();
    const gameEventMessage = MessageBuilders.gameEvent(
      "game_started",
      "play",
      `${session.username} started the game! ${settings.rounds} rounds ahead.`,
      { settings, playerCount: roomUsers.length }
    );
    broadcastToRoom(this.roomManager.getSessions(), session.room, gameEventMessage);
  }
}
