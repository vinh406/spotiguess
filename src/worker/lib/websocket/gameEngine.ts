import type { GamePhase, Song, SongChoice, PlayerScore } from "../../../shared/types";
import { SCORING } from "../../../shared/constants";
import { getSimilarTracks, getArtistTopTracks, type LastFMSimilarTrack } from "../lastfm/client";

function calculateScore(
  isCorrect: boolean,
  timeTakenMs: number,
  timePerRoundMs: number,
  streak: number,
): number {
  if (!isCorrect) return 0;
  const speedRatio = 1 - timeTakenMs / timePerRoundMs;
  const speedBonus = Math.round(SCORING.MAX_SPEED_BONUS * Math.max(0, speedRatio));
  const streakBonus = streak * SCORING.STREAK_BONUS;
  return SCORING.BASE_POINTS + speedBonus + streakBonus;
}

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
  votes: Record<string, boolean>;
  voteEndsAt: number | null;
}

export class GameEngine {
  private phase: GamePhase = "lobby";
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

  private votes: Map<string, boolean> = new Map();
  private voteEndsAt: number | null = null;

  private similarTracksCache: Map<string, LastFMSimilarTrack[]> = new Map();
  private lastFmApiKey: string | null = null;

  constructor() {}

  setLastFmApiKey(apiKey: string): void {
    this.lastFmApiKey = apiKey;
  }

  getPhase(): GamePhase {
    return this.phase;
  }

  setPhase(phase: GamePhase): void {
    this.phase = phase;
  }

  initGame(
    songs: Song[],
    rounds: number,
    initialPlayers: { userId: string; username: string; userImage?: string }[],
    isContinuing: boolean = false,
  ): void {
    this.phase = "playing";

    if (!isContinuing) {
      this.songs = this.shuffleArray(songs);
      this.currentSongIndex = 0;
    } else {
      // If continuing, we don't reshuffle and keep currentSongIndex as is
      // But we should ensure we have enough songs left
      if (this.currentSongIndex + rounds > this.songs.length) {
        // Not enough songs left, reshuffle everything
        this.songs = this.shuffleArray(songs);
        this.currentSongIndex = 0;
      }
    }

    this.totalRounds = rounds;
    this.currentRound = 1;
    this.answers = new Map();
    this.similarTracksCache = new Map();
    this.votes = new Map();
    this.voteEndsAt = null;

    // Reset scores for everyone for the new game
    for (const userId of this.scores.keys()) {
      const p = this.scores.get(userId)!;
      p.score = 0;
      p.streak = 0;
    }

    // Add new players or ensure existing players have scores reset
    for (const player of initialPlayers) {
      if (!this.scores.has(player.userId)) {
        this.addPlayer(player.userId, player.username, player.userImage);
      } else {
        const p = this.scores.get(player.userId)!;
        p.score = 0;
        p.streak = 0;
      }
    }
  }

  addPlayer(userId: string, username: string, userImage?: string): void {
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

  async startRound(timePerRound: number): Promise<{
    song: Song;
    choices: SongChoice[];
    round: number;
    totalRounds: number;
    startTime: number;
    endTime: number;
    duration: number;
  }> {
    this.phase = "playing";
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
    this.roundDuration = timePerRound;
    this.roundStartTime = Date.now();
    this.roundEndTime = this.roundStartTime + this.roundDuration;
    this.answers = new Map();

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

  recordAnswer(
    userId: string,
    choiceIndex: number,
    timePerRound: number,
  ): { isCorrect: boolean; points: number; streak: number } {
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
    const points = calculateScore(isCorrect, timeTaken, timePerRound, newStreak);

    playerScore.score += points;
    playerScore.streak = newStreak;
    this.scores.set(userId, playerScore);

    return { isCorrect, points, streak: newStreak };
  }

  endRound(): { correctAnswer: SongChoice; scores: PlayerScore[] } {
    this.phase = "roundEnd";

    const correctAnswer = this.choices.find((c) => c.isCorrect)!;
    const scores = Array.from(this.scores.values()).sort((a, b) => b.score - a.score);

    if (this.currentSongIndex < this.songs.length - 1) {
      this.currentSongIndex++;
    }
    this.currentRound++;

    return { correctAnswer, scores };
  }

  endGame(voteDurationMs: number): { finalScores: PlayerScore[]; voteEndsAt: number } {
    this.phase = "gameEnd";
    this.votes.clear();
    this.voteEndsAt = Date.now() + voteDurationMs;
    const finalScores = Array.from(this.scores.values()).sort((a, b) => b.score - a.score);
    return { finalScores, voteEndsAt: this.voteEndsAt };
  }

  recordVote(userId: string, vote: boolean): void {
    if (this.phase !== "gameEnd") return;
    this.votes.set(userId, vote);
  }

  getVotes(): Record<string, boolean> {
    return Object.fromEntries(this.votes);
  }

  getVoteEndsAt(): number | null {
    return this.voteEndsAt;
  }

  allPlayersVoted(playersInRoom: string[]): boolean {
    return playersInRoom.every((userId) => this.votes.has(userId));
  }

  didAllPlayersVoteYes(): boolean {
    if (this.votes.size === 0) return false;
    return Array.from(this.votes.values()).every((v) => v === true);
  }

  reset(): void {
    this.phase = "lobby";
    this.currentRound = 0;
    this.totalRounds = 0;
    this.songs = [];
    this.currentSongIndex = 0;
    this.choices = [];
    this.scores = new Map();
    this.answers = new Map();
    this.roundStartTime = 0;
    this.roundEndTime = 0;
    this.roundDuration = 0;
    this.votes.clear();
    this.voteEndsAt = null;
  }

  getScores(): PlayerScore[] {
    return Array.from(this.scores.values()).sort((a, b) => b.score - a.score);
  }

  getGameState(): GameStateSnapshot {
    return {
      phase: this.phase,
      currentRound: this.currentRound,
      totalRounds: this.totalRounds,
      songs: this.songs,
      currentSongIndex: this.currentSongIndex,
      choices: this.choices,
      scores: Object.fromEntries(this.scores),
      answers: Object.fromEntries(this.answers),
      roundStartTime: this.roundStartTime,
      roundEndTime: this.roundEndTime,
      roundDuration: this.roundDuration,
      votes: Object.fromEntries(this.votes),
      voteEndsAt: this.voteEndsAt,
    };
  }

  allPlayersAnswered(playersInRoom: string[]): boolean {
    return playersInRoom.every((userId) => this.answers.has(userId));
  }

  private generateChoices(correctSong: Song, allSongs: Song[]): SongChoice[] {
    const wrongSongs = allSongs.filter((s) => s.id !== correctSong.id);
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

  private generateChoicesWithLastFM(correctSong: Song, allSongs: Song[]): SongChoice[] {
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
      const wrongSongs = allSongs.filter((s) => s.id !== correctSong.id);
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
      decoys = allSongs
        .filter((s) => s.id !== correctSong.id)
        .slice(0, 3)
        .map((song, i) => ({
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
