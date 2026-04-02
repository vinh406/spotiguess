import type { UserSession, RoomSettings, Playlist } from "../../../shared/types";
import { DEFAULT_ROOM_SETTINGS, SETTINGS_LIMITS } from "../../../shared/constants";

/**
 * Manages room state including sessions, settings, and playlist
 */
export class RoomManager {
  private sessions: Map<WebSocket, UserSession>;
  private roomSettings: RoomSettings;
  private roomPlaylist: Playlist | null;

  constructor() {
    this.sessions = new Map();
    this.roomSettings = { ...DEFAULT_ROOM_SETTINGS };
    this.roomPlaylist = null;
  }

  // --------------------------------------------------------------------------
  // Session Management
  // --------------------------------------------------------------------------

  setSessions(sessions: Map<WebSocket, UserSession>): void {
    this.sessions = sessions;
  }

  getSessions(): Map<WebSocket, UserSession> {
    return this.sessions;
  }

  getUserSession(ws: WebSocket): UserSession | undefined {
    return this.sessions.get(ws);
  }

  setUserSession(ws: WebSocket, session: UserSession): void {
    this.sessions.set(ws, session);
  }

  removeUserSession(ws: WebSocket): void {
    this.sessions.delete(ws);
  }

  findSessionByUserId(userId: string, room: string): WebSocket | undefined {
    for (const [ws, session] of this.sessions.entries()) {
      if (session.userId === userId && session.room === room) {
        return ws;
      }
    }
    return undefined;
  }

  findSessionByUserIdOnly(userId: string): WebSocket | undefined {
    for (const [ws, session] of this.sessions.entries()) {
      if (session.userId === userId) {
        return ws;
      }
    }
    return undefined;
  }

  // --------------------------------------------------------------------------
  // User Room Queries
  // --------------------------------------------------------------------------

  getUsersInRoom(room: string): UserSession[] {
    const users: UserSession[] = [];
    this.sessions.forEach((session) => {
      if (session.room === room) {
        users.push({ ...session });
      }
    });
    return users;
  }

  getConnectionCount(room: string): number {
    let count = 0;
    this.sessions.forEach((session) => {
      if (session.room === room) {
        count++;
      }
    });
    return count;
  }

  // --------------------------------------------------------------------------
  // Settings Management
  // --------------------------------------------------------------------------

  getRoomSettings(): RoomSettings {
    return this.roomSettings;
  }

  setRoomSettings(settings: RoomSettings): void {
    this.roomSettings = settings;
  }

  updateSettings(
    rounds?: number,
    timePerRound?: number
  ): RoomSettings {
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
    return this.roomSettings;
  }

  // --------------------------------------------------------------------------
  // Playlist Management
  // --------------------------------------------------------------------------

  getRoomPlaylist(): Playlist | null {
    return this.roomPlaylist;
  }

  setRoomPlaylist(playlist: Playlist | null): void {
    this.roomPlaylist = playlist;
  }
}
