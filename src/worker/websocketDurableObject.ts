import { DurableObject } from "cloudflare:workers";
import type {
  UserSession,
  RoomSettings,
  Playlist,
  IncomingMessage,
  ErrorMessage,
  JoinMessage,
  ChatMessage,
  UpdateSettingsMessage,
  UpdatePlaylistMessage,
} from "../shared/types";
import { DEFAULT_ROOM_SETTINGS, SETTINGS_LIMITS } from "../shared/constants";

// Durable Object
export class WebSocketHibernationServer extends DurableObject {
  private sessions = new Map<WebSocket, UserSession>();
  private roomSettings: RoomSettings = { ...DEFAULT_ROOM_SETTINGS };
  private roomPlaylist: Playlist | null = null;  // Playlist selected by host

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);

    this.ctx.getWebSockets().forEach((webSocket) => {
      let meta = webSocket.deserializeAttachment() as UserSession;

      this.sessions.set(webSocket, {
        ...meta,
      });
    });
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private sendError(ws: WebSocket, message: string): void {
    const errorMessage: ErrorMessage = {
      type: "error",
      message,
      timestamp: Date.now(),
    };
    ws.send(JSON.stringify(errorMessage));
  }

  private validateSession(ws: WebSocket): UserSession | null {
    const session = this.sessions.get(ws);
    if (!session) {
      this.sendError(ws, "You must join a room first");
      return null;
    }
    return session;
  }

  private validateHost(ws: WebSocket, session: UserSession): boolean {
    if (!session.isHost) {
      this.sendError(ws, "Only the host can perform this action");
      return false;
    }
    return true;
  }

  async fetch(_request: Request): Promise<Response> {
    // Creates two ends of a WebSocket connection.
    const webSocketPair = new WebSocketPair();
    const [client, server] = Object.values(webSocketPair);

    // Calling `acceptWebSocket()` informs the runtime that this WebSocket is to begin terminating
    // request within the Durable Object. It has the effect of "accepting" the connection,
    // and allowing the WebSocket to send and receive messages.
    // Unlike `ws.accept()`, `state.acceptWebSocket(ws)` informs the Workers Runtime that the WebSocket
    // is "hibernatable", so the runtime does not need to pin this Durable Object to memory while
    // the connection is open. During periods of inactivity, the Durable Object can be evicted
    // from memory, but the WebSocket connection will remain open. If at some later point the
    // WebSocket receives a message, the runtime will recreate the Durable Object
    // (run the `constructor`) and deliver the message to the appropriate handler.
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
    // Convert ArrayBuffer to string if necessary
    const messageString =
      typeof message === "string" ? message : new TextDecoder().decode(message);

    // Parse the incoming message
    let messageData;
    try {
      messageData = JSON.parse(messageString);
    } catch (e) {
      // If it's not valid JSON, treat it as a simple text message
      messageData = {
        type: "message",
        content: messageString,
        timestamp: Date.now(),
      };
    }

    // Handle different message types
    switch (messageData.type) {
      case "join":
        await this.handleJoinRoom(ws, messageData);
        break;
      case "leave": {
        const session = this.sessions.get(ws);
        if (session) {
          await this.handleLeaveRoom(ws, session);
        }
        break;
      }
      case "message":
      case "chat_message":
        await this.handleChatMessage(ws, messageData);
        break;
      case "ready":
        await this.handleReady(ws, messageData);
        break;
      case "update_settings":
        await this.handleUpdateSettings(ws, messageData);
        break;
      case "update_playlist":
        await this.handleUpdatePlaylist(ws, messageData);
        break;
      case "start_game":
        await this.handleStartGame(ws, messageData);
        break;
      default:
        // Unknown message type, treat as regular message
        await this.handleChatMessage(ws, messageData);
    }
  }

  private async handleJoinRoom(ws: WebSocket, data: JoinMessage): Promise<void> {
    const { username, room, userId, userImage } = data;

    // Validate required fields
    if (!username || !room || !userId) {
      this.sendError(ws, "Missing required fields: username, room, or userId");
      return;
    }

    // Check if user is already in this room
    const existingSession = Array.from(this.sessions.entries()).find(
      ([_ws, session]) => session.userId === userId && session.room === room
    );

    if (existingSession) {
      this.sendError(ws, "You are already in this room");
      return;
    }

    // Check if this is the first player (becomes host)
    const existingPlayers = this.getUsersInRoom(room);
    const isFirstPlayer = existingPlayers.length === 0;

    // Store user session
    this.sessions.set(ws, {
      username,
      room,
      userId,
      userImage: userImage || null,
      isHost: isFirstPlayer,
      isReady: false,
      joinedAt: Date.now(),
    });

    ws.serializeAttachment({
      username,
      room,
      userId,
      userImage: userImage || null,
      isHost: isFirstPlayer,
      isReady: false,
      joinedAt: Date.now(),
    });

    // Get users in the same room
    const roomUsers = this.getUsersInRoom(room);

    // Notify all users in the room that someone joined
    const joinMessage = {
      type: "user_joined",
      username,
      userId,
      room,
      timestamp: Date.now(),
      users: roomUsers,
      isHost: isFirstPlayer,
    };

    this.broadcastToRoom(room, joinMessage);

    // If this is the first player, also broadcast room settings and playlist
    if (isFirstPlayer) {
      this.broadcastToRoom(room, {
        type: "room_created",
        room,
        settings: this.roomSettings,
        playlist: this.roomPlaylist,
        timestamp: Date.now(),
      });
    } else {
      // Send current room state to the new player only
      ws.send(
        JSON.stringify({
          type: "room_state",
          room,
          settings: this.roomSettings,
          playlist: this.roomPlaylist,
          timestamp: Date.now(),
        })
      );
    }
  }

  private async handleLeaveRoom(ws: WebSocket, session: UserSession): Promise<void> {
    const { username, room, userId, isHost } = session;

    // Store remaining users before deletion
    const remainingUsers = Array.from(this.sessions.entries())
      .filter(([s, _]) => s !== ws && _.room === room)
      .map(([_, s]) => s);

    // Remove user session
    this.sessions.delete(ws);

    // Handle host transfer if the leaving user was host
    if (isHost && remainingUsers.length > 0) {
      // Transfer host to first remaining player
      const newHost = remainingUsers[0];
      newHost.isHost = true;

      // Find the WebSocket for the new host and update attachment
      for (const [_socket, sess] of this.sessions.entries()) {
        if (sess.userId === newHost.userId) {
          _socket.serializeAttachment(sess);
          break;
        }
      }

      // Broadcast host change
      this.broadcastGameEvent(
        room,
        "host_changed",
        "crown",
        `${newHost.username} is now the host`,
        { newHostId: newHost.userId, newHostName: newHost.username }
      );
    }

    // Get remaining users in the room
    const roomUsers = this.getUsersInRoom(room);

    // Notify remaining users in the room
    const leaveMessage = {
      type: "user_left",
      username,
      userId,
      room,
      timestamp: Date.now(),
      users: roomUsers,
    };

    this.broadcastToRoom(room, leaveMessage);
  }

  private async handleChatMessage(ws: WebSocket, data: ChatMessage): Promise<void> {
    const session = this.validateSession(ws);
    if (!session) return;

    // Add session info to message
    const messageWithSession = {
      ...data,
      username: session.username,
      userId: session.userId,
      room: session.room,
      timestamp: data.timestamp || Date.now(),
    };

    // Broadcast to room
    this.broadcastToRoom(session.room, messageWithSession);
  }

  private async handleReady(ws: WebSocket, _data: IncomingMessage): Promise<void> {
    const session = this.validateSession(ws);
    if (!session) return;

    // Toggle ready state
    const newReadyState = !session.isReady;
    session.isReady = newReadyState;

    // Update serialization
    ws.serializeAttachment(session);

    // Broadcast game event
    this.broadcastGameEvent(
      session.room,
      newReadyState ? "player_ready" : "player_not_ready",
      newReadyState ? "check-circle" : "x-circle",
      newReadyState ? `${session.username} is ready` : `${session.username} is no longer ready`,
      { userId: session.userId, isReady: newReadyState }
    );

    // Also broadcast updated user list
    const roomUsers = this.getUsersInRoom(session.room);
    this.broadcastToRoom(session.room, {
      type: "users_updated",
      users: roomUsers,
      timestamp: Date.now(),
    });
  }

  private async handleUpdateSettings(ws: WebSocket, data: UpdateSettingsMessage): Promise<void> {
    const session = this.validateSession(ws);
    if (!session) return;

    // Only host can update settings
    if (!this.validateHost(ws, session)) return;

    // Validate and update settings
    const { maxPlayers, rounds, timePerRound } = data.payload || {};

    if (maxPlayers !== undefined) {
      this.roomSettings.maxPlayers = Math.max(
        SETTINGS_LIMITS.maxPlayers.min,
        Math.min(SETTINGS_LIMITS.maxPlayers.max, maxPlayers)
      );
    }
    if (rounds !== undefined) {
      this.roomSettings.rounds = Math.max(
        SETTINGS_LIMITS.rounds.min,
        Math.min(SETTINGS_LIMITS.rounds.max, rounds)
      );
    }
    if (timePerRound !== undefined) {
      this.roomSettings.timePerRound = Math.max(
        SETTINGS_LIMITS.timePerRound.min,
        Math.min(SETTINGS_LIMITS.timePerRound.max, timePerRound)
      );
    }

    // Broadcast settings update
    this.broadcastToRoom(session.room, {
      type: "settings_updated",
      settings: this.roomSettings,
      timestamp: Date.now(),
    });

    // Also broadcast as game event
    this.broadcastGameEvent(
      session.room,
      "settings_changed",
      "settings",
      `Game settings updated: ${this.roomSettings.rounds} rounds, ${this.roomSettings.timePerRound / 1000}s per round`,
      { settings: this.roomSettings }
    );
  }

  private async handleUpdatePlaylist(ws: WebSocket, data: UpdatePlaylistMessage): Promise<void> {
    const session = this.validateSession(ws);
    if (!session) return;

    // Only host can update playlist
    if (!this.validateHost(ws, session)) return;

    // Update playlist
    const { playlist } = data.payload || {};
    if (playlist) {
      this.roomPlaylist = playlist;

      // Broadcast playlist update
      this.broadcastToRoom(session.room, {
        type: "playlist_updated",
        playlist: this.roomPlaylist,
        timestamp: Date.now(),
      });

      // Also broadcast as game event
      this.broadcastGameEvent(
        session.room,
        "playlist_changed",
        "music",
        `Playlist changed to: ${playlist.name}`,
        { playlist: this.roomPlaylist }
      );
    }
  }

  private async handleStartGame(ws: WebSocket, _data: IncomingMessage): Promise<void> {
    const session = this.validateSession(ws);
    if (!session) return;

    // Only host can start game
    if (!this.validateHost(ws, session)) return;

    // Get all players
    const roomUsers = this.getUsersInRoom(session.room);

    // Check if there are enough players
    if (roomUsers.length < 1) {
      this.sendError(ws, "Need at least 1 player to start");
      return;
    }


    this.broadcastGameEvent(
      session.room,
      "game_started",
      "play",
      `${session.username} started the game! ${this.roomSettings.rounds} rounds ahead.`,
      { settings: this.roomSettings, playerCount: roomUsers.length }
    );
  }

  private broadcastGameEvent(
    room: string,
    eventType: string,
    icon: string,
    content: string,
    data: Record<string, unknown> = {}
  ): void {
    const message = {
      type: "game_event",
      payload: {
        eventType,
        category: eventType.includes("ready") || eventType.includes("settings") || eventType.includes("host")
          ? "system" : "game",
        icon,
        content,
        data,
        timestamp: Date.now(),
      },
    };
    this.broadcastToRoom(room, message);
  }

  private getUsersInRoom(
    room: string
  ): Array<{
    username: string;
    userId: string;
    userImage: string | null;
    isHost: boolean;
    isReady: boolean;
    joinedAt: number;
  }> {
    const users: Array<{
      username: string;
      userId: string;
      userImage: string | null;
      isHost: boolean;
      isReady: boolean;
      joinedAt: number;
    }> = [];

    this.sessions.forEach((session, _ws) => {
      if (session.room === room) {
        users.push({
          username: session.username,
          userId: session.userId,
          userImage: session.userImage,
          isHost: session.isHost,
          isReady: session.isReady,
          joinedAt: session.joinedAt,
        });
      }
    });

    return users;
  }

  private broadcastToRoom(room: string, message: any): void {
    const roomUsers = Array.from(this.sessions.entries()).filter(
      ([_ws, session]) => session.room === room
    );

    const messageWithStats = {
      ...message,
      connections: roomUsers.length,
      totalConnections: this.sessions.size,
    };

    const messageString = JSON.stringify(messageWithStats);

    roomUsers.forEach(([socket, _session]) => {
      try {
        socket.send(messageString);
      } catch (e) {
        console.error("Failed to send message to socket:", e);
        // Clean up dead connection
        this.sessions.delete(socket);
      }
    });
  }

  async webSocketClose(
    ws: WebSocket,
    code: number,
    _reason: string,
    _wasClean: boolean
  ): Promise<void> {
    // Handle user leaving when connection closes
    const session = this.sessions.get(ws);
    if (session) {
      await this.handleLeaveRoom(ws, session);
    }

    // If the client closes the connection, the runtime will invoke the webSocketClose() handler.
    ws.close(code, "Durable Object is closing WebSocket");
  }
}
