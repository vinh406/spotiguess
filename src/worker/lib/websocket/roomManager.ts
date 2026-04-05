import type { UserSession, RoomSettings, Playlist, Song, SongChoice, PlayerScore, GamePhase } from "../../../shared/types";
import { DEFAULT_ROOM_SETTINGS, SETTINGS_LIMITS, SCORING } from "../../../shared/constants";
import { getSimilarTracks, getArtistTopTracks, type LastFMSimilarTrack } from "../lastfm/client";

function calculateScore(isCorrect: boolean, timeTakenMs: number, timePerRoundMs: number, streak: number): number {
  if (!isCorrect) return 0;
  const speedRatio = 1 - (timeTakenMs / timePerRoundMs);
  const speedBonus = Math.round(SCORING.MAX_SPEED_BONUS * Math.max(0, speedRatio));
  const streakBonus = streak * SCORING.STREAK_BONUS;
  return SCORING.BASE_POINTS + speedBonus + streakBonus;
}

export class RoomManager {
  private sessions: Map<WebSocket, UserSession>;
  private roomSettings: RoomSettings;
  private roomPlaylist: Playlist | null;
  private roomPlaylistUserId: string | null;

  private gamePhase: GamePhase = 'lobby';
  private currentRound: number = 0;
  private totalRounds: number = 0;
  private songs: Song[] = [];
  private currentSongIndex: number = 0;
  private choices: SongChoice[] = [];
  private scores: Map<string, PlayerScore> = new Map();
  private answers: Map<string, { choiceIndex: number; answeredAt: number }> = new Map();
  private roundStartTime: number = 0;
  private roundEndTime: number = 0;
  private roundDuration: number = 0;
  private roundTimer: ReturnType<typeof setTimeout> | null = null;
  private similarTracksCache: Map<string, LastFMSimilarTrack[]> = new Map();
  private lastFmApiKey: string | null = null;

  constructor() {
    this.sessions = new Map();
    this.roomSettings = { ...DEFAULT_ROOM_SETTINGS };
    this.roomPlaylist = null;
    this.roomPlaylistUserId = null;
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
    timePerRound?: number,
    audioTime?: number
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
    if (audioTime !== undefined) {
      this.roomSettings.audioTime = Math.max(
        SETTINGS_LIMITS.audioTime.min,
        Math.min(SETTINGS_LIMITS.audioTime.max, audioTime)
      );
    }
    // Ensure audioTime <= timePerRound
    if (this.roomSettings.audioTime > this.roomSettings.timePerRound) {
        this.roomSettings.audioTime = this.roomSettings.timePerRound;
    }
    return this.roomSettings;
  }

  // --------------------------------------------------------------------------
  // Playlist Management
  // --------------------------------------------------------------------------

  getRoomPlaylist(): Playlist | null {
    return this.roomPlaylist;
  }

  setRoomPlaylist(playlist: Playlist | null, playlistUserId: string | null = null): void {
    this.roomPlaylist = playlist;
    this.roomPlaylistUserId = playlistUserId;
  }

  getRoomPlaylistUserId(): string | null {
    return this.roomPlaylistUserId;
  }

  // --------------------------------------------------------------------------
  // Game State Management
  // --------------------------------------------------------------------------

  initGame(songs: Song[], rounds: number): void {
    this.gamePhase = 'playing';
    this.songs = this.shuffleArray(songs);
    this.totalRounds = rounds;
    this.currentRound = 1;
    this.currentSongIndex = 0;
    this.answers = new Map();
    this.similarTracksCache = new Map();

    this.scores = new Map();
    for (const [, session] of this.sessions.entries()) {
      this.scores.set(session.userId, {
        userId: session.userId,
        username: session.username,
        userImage: session.userImage ?? undefined,
        score: 0,
        streak: 0,
      });
    }
  }

  setLastFmApiKey(apiKey: string): void {
    this.lastFmApiKey = apiKey;
  }

  getCurrentGamePhase(): GamePhase {
    return this.gamePhase;
  }

  getCurrentRound(): number {
    return this.currentRound;
  }

  async startRound(endRoundCallback: () => void): Promise<{ song: Song; choices: SongChoice[]; round: number; totalRounds: number; startTime: number; endTime: number; duration: number }> {
    this.gamePhase = 'playing';
    const song = this.songs[this.currentSongIndex]!;
    
    let choices: SongChoice[];
    if (this.lastFmApiKey) {
      const cachedSimilarTracks = this.similarTracksCache.get(song.id);
      if (cachedSimilarTracks) {
        choices = this.generateChoicesWithLastFM(song, this.songs);
      } else {
        let similarTracks = await getSimilarTracks(song.artist, song.title, this.lastFmApiKey, 10);
        if (!similarTracks.length) {
          similarTracks = await getArtistTopTracks(song.artist, this.lastFmApiKey, 10);
        }
        this.similarTracksCache.set(song.id, similarTracks);
        choices = this.generateChoicesWithLastFM(song, this.songs);
      }
    } else {
      choices = this.generateChoices(song, this.songs);
    }
    
    this.choices = choices;
    this.roundDuration = this.roomSettings.timePerRound;
    this.roundStartTime = Date.now();
    this.roundEndTime = this.roundStartTime + this.roundDuration;
    this.answers = new Map();

    if (this.roundTimer) clearTimeout(this.roundTimer);
    this.roundTimer = setTimeout(endRoundCallback, this.roundDuration);

    return {
      song,
      choices,
      round: this.currentRound,
      totalRounds: this.totalRounds,
      startTime: this.roundStartTime,
      endTime: this.roundEndTime,
      duration: this.roundDuration,
    };
  }

  checkAndEndRoundEarly(room: string, endRoundCallback: () => void): boolean {
    if (this.allPlayersAnswered(room)) {
      const timeElapsed = Date.now() - this.roundStartTime;
      const remainingTime = this.roundDuration - timeElapsed;

      if (remainingTime > SCORING.EARLY_ROUND_END_DELAY) {
        if (this.roundTimer) clearTimeout(this.roundTimer);
        this.roundEndTime = Date.now() + SCORING.EARLY_ROUND_END_DELAY;
        this.roundTimer = setTimeout(endRoundCallback, SCORING.EARLY_ROUND_END_DELAY);
        return true;
      }
    }
    return false;
  }

  recordAnswer(userId: string, choiceIndex: number): { isCorrect: boolean; points: number; streak: number } {
    if (this.answers.has(userId)) {
      const existing = this.answers.get(userId)!;
      const playerScore = this.scores.get(userId);
      return {
        isCorrect: this.choices[existing.choiceIndex]?.isCorrect ?? false,
        points: playerScore?.score ?? 0,
        streak: playerScore?.streak ?? 0,
      };
    }

    const timeTaken = Date.now() - this.roundStartTime;
    const isCorrect = this.choices[choiceIndex]?.isCorrect ?? false;
    this.answers.set(userId, { choiceIndex, answeredAt: Date.now() });

    const playerScore = this.scores.get(userId);
    if (!playerScore) {
      return { isCorrect, points: 0, streak: 0 };
    }

    const newStreak = isCorrect ? playerScore.streak + 1 : 0;
    const points = calculateScore(isCorrect, timeTaken, this.roomSettings.timePerRound, newStreak);

    playerScore.score += points;
    playerScore.streak = newStreak;
    this.scores.set(userId, playerScore);

    return { isCorrect, points, streak: newStreak };
  }

  endRound(): { correctAnswer: SongChoice; scores: PlayerScore[] } {
    this.gamePhase = 'roundEnd';

    const correctAnswer = this.choices.find(c => c.isCorrect)!;
    const scores = Array.from(this.scores.values()).sort((a, b) => b.score - a.score);

    if (this.currentSongIndex < this.songs.length - 1) {
      this.currentSongIndex++;
    }
    this.currentRound++;

    return { correctAnswer, scores };
  }

  endGame(): PlayerScore[] {
    this.gamePhase = 'gameEnd';
    return Array.from(this.scores.values()).sort((a, b) => b.score - a.score);
  }

  resetGame(): void {
    this.gamePhase = 'lobby';
    this.currentRound = 0;
    this.totalRounds = 0;
    this.songs = [];
    this.currentSongIndex = 0;
    this.choices = [];
    this.scores = new Map();
    this.answers = new Map();
    this.roundStartTime = 0;
    if (this.roundTimer) {
      clearTimeout(this.roundTimer);
      this.roundTimer = null;
    }
  }

  tryStartGame(): boolean {
    if (this.gamePhase !== 'lobby') return false;
    this.gamePhase = 'starting';
    return true;
  }

  cancelStartGame(): void {
    this.gamePhase = 'lobby';
  }

  getScores(): PlayerScore[] {
    return Array.from(this.scores.values()).sort((a, b) => b.score - a.score);
  }

  getScoreForUser(userId: string): PlayerScore | undefined {
    return this.scores.get(userId);
  }

  getCurrentRoundState(): {
    round: number;
    totalRounds: number;
    song: Song;
    choices: SongChoice[];
    roundStartTime: number;
    roundEndTime: number;
    roundDuration: number;
    answers: Map<string, { choiceIndex: number; answeredAt: number }>;
  } | null {
    const song = this.songs[this.currentSongIndex];
    if (this.gamePhase !== 'playing' || !song) {
      return null;
    }

    return {
      round: this.currentRound,
      totalRounds: this.totalRounds,
      song,
      choices: this.choices,
      roundStartTime: this.roundStartTime,
      roundEndTime: this.roundEndTime,
      roundDuration: this.roundDuration,
      answers: this.answers,
    };
  }

  allPlayersAnswered(room: string): boolean {
    const usersInRoom = this.getUsersInRoom(room);
    return usersInRoom.every(user => this.answers.has(user.userId));
  }

  addPlayerToScores(userId: string, username: string, userImage?: string): void {
    if (!this.scores.has(userId)) {
      this.scores.set(userId, {
        userId,
        username,
        userImage,
        score: 0,
        streak: 0,
      });
    }
  }

  generateChoices(correctSong: Song, allSongs: Song[]): SongChoice[] {
    const wrongSongs = allSongs.filter(s => s.id !== correctSong.id);
    const shuffled = this.shuffleArray(wrongSongs);
    const decoys = shuffled.slice(0, 3);

    const choices: SongChoice[] = [
      {
        index: 0,
        title: correctSong.title,
        artist: correctSong.artist,
        albumImageUrl: correctSong.albumImageUrl,
        isCorrect: true,
      },
      ...decoys.map((song, i) => ({
        index: i + 1,
        title: song.title,
        artist: song.artist,
        albumImageUrl: song.albumImageUrl,
        isCorrect: false,
      })),
    ];

    return this.shuffleArray(choices).map((choice, i) => ({
      ...choice,
      index: i,
    }));
  }

  generateChoicesWithLastFM(
    correctSong: Song,
    allSongs: Song[]
  ): SongChoice[] {
    const similarTracks = this.similarTracksCache.get(correctSong.id) ?? [];

    let decoys: SongChoice[];

    if (similarTracks.length >= 3) {
      const shuffledSimilar = this.shuffleArray(similarTracks);
      decoys = shuffledSimilar.slice(0, 3).map((track, i) => ({
        index: i + 1,
        title: track.name,
        artist: track.artist,
        albumImageUrl: track.imageUrl ?? undefined,
        isCorrect: false,
      }));
    } else if (similarTracks.length > 0) {
      const wrongSongs = allSongs.filter(s => s.id !== correctSong.id);
      const shuffled = this.shuffleArray(wrongSongs);
      const fallbackDecoys = shuffled.slice(0, 3 - similarTracks.length);
      
      decoys = [
        ...similarTracks.map((track, i) => ({
          index: i + 1,
          title: track.name,
          artist: track.artist,
          albumImageUrl: track.imageUrl ?? undefined,
          isCorrect: false,
        })),
        ...fallbackDecoys.map((song, i) => ({
          index: similarTracks.length + i + 1,
          title: song.title,
          artist: song.artist,
          albumImageUrl: song.albumImageUrl,
          isCorrect: false,
        })),
      ];
    } else {
      const wrongSongs = allSongs.filter(s => s.id !== correctSong.id);
      const shuffled = this.shuffleArray(wrongSongs);
      decoys = shuffled.slice(0, 3).map((song, i) => ({
        index: i + 1,
        title: song.title,
        artist: song.artist,
        albumImageUrl: song.albumImageUrl,
        isCorrect: false,
      }));
    }

    const choices: SongChoice[] = [
      {
        index: 0,
        title: correctSong.title,
        artist: correctSong.artist,
        albumImageUrl: correctSong.albumImageUrl,
        isCorrect: true,
      },
      ...decoys,
    ];

    return this.shuffleArray(choices).map((choice, i) => ({
      ...choice,
      index: i,
    }));
  }

  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array] as (T | undefined)[];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i]!, shuffled[j]!] = [shuffled[j]!, shuffled[i]!];
    }
    return shuffled as T[];
  }
}
