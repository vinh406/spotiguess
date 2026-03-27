import { pgTable, uuid, varchar, text, timestamp, integer, boolean } from 'drizzle-orm/pg-core';

// Users table
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  spotifyId: varchar('spotify_id', { length: 255 }).unique().notNull(),
  displayName: varchar('display_name', { length: 255 }),
  email: varchar('email', { length: 255 }),
  avatarUrl: text('avatar_url'),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  tokenExpiresAt: timestamp('token_expires_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Rooms table
export const rooms = pgTable('rooms', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: varchar('code', { length: 8 }).unique().notNull(),
  hostId: uuid('host_id').references(() => users.id),
  status: varchar('status', { length: 20 }).default('waiting'), // waiting, playing, finished
  maxPlayers: integer('max_players').default(8),
  rounds: integer('rounds').default(10),
  timePerRound: integer('time_per_round').default(30), // seconds
  createdAt: timestamp('created_at').defaultNow(),
  startedAt: timestamp('started_at'),
  finishedAt: timestamp('finished_at'),
});

// Room players table
export const roomPlayers = pgTable('room_players', {
  id: uuid('id').primaryKey().defaultRandom(),
  roomId: uuid('room_id').references(() => rooms.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').references(() => users.id),
  isReady: boolean('is_ready').default(false),
  joinedAt: timestamp('joined_at').defaultNow(),
});

// Games table
export const games = pgTable('games', {
  id: uuid('id').primaryKey().defaultRandom(),
  roomId: uuid('room_id').references(() => rooms.id),
  currentRound: integer('current_round').default(0),
  totalRounds: integer('total_rounds'),
  status: varchar('status', { length: 20 }).default('active'), // active, completed
  startedAt: timestamp('started_at').defaultNow(),
  completedAt: timestamp('completed_at'),
});

// Songs table
export const songs = pgTable('songs', {
  id: uuid('id').primaryKey().defaultRandom(),
  spotifyTrackId: varchar('spotify_track_id', { length: 255 }).unique().notNull(),
  title: varchar('title', { length: 500 }).notNull(),
  artist: varchar('artist', { length: 500 }).notNull(),
  album: varchar('album', { length: 500 }),
  albumArtUrl: text('album_art_url'),
  previewUrl: text('preview_url'),
  durationMs: integer('duration_ms'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Game rounds table
export const gameRounds = pgTable('game_rounds', {
  id: uuid('id').primaryKey().defaultRandom(),
  gameId: uuid('game_id').references(() => games.id),
  roundNumber: integer('round_number').notNull(),
  songId: uuid('song_id').references(() => songs.id),
  startedAt: timestamp('started_at').defaultNow(),
  endedAt: timestamp('ended_at'),
});

// Scores table
export const scores = pgTable('scores', {
  id: uuid('id').primaryKey().defaultRandom(),
  gameId: uuid('game_id').references(() => games.id),
  userId: uuid('user_id').references(() => users.id),
  roundId: uuid('round_id').references(() => gameRounds.id),
  points: integer('points').default(0),
  guessTimeMs: integer('guess_time_ms'), // time taken to guess in milliseconds
  isCorrect: boolean('is_correct').default(false),
  guessedAt: timestamp('guessed_at').defaultNow(),
});

// Export types for TypeScript
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Room = typeof rooms.$inferSelect;
export type NewRoom = typeof rooms.$inferInsert;

export type RoomPlayer = typeof roomPlayers.$inferSelect;
export type NewRoomPlayer = typeof roomPlayers.$inferInsert;

export type Game = typeof games.$inferSelect;
export type NewGame = typeof games.$inferInsert;

export type Song = typeof songs.$inferSelect;
export type NewSong = typeof songs.$inferInsert;

export type GameRound = typeof gameRounds.$inferSelect;
export type NewGameRound = typeof gameRounds.$inferInsert;

export type Score = typeof scores.$inferSelect;
export type NewScore = typeof scores.$inferInsert;
