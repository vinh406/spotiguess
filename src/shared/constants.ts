// Shared constants for the application

import type { Playlist, RoomSettings } from './types';

// ============================================================================
// Default Room Settings
// ============================================================================

export const DEFAULT_ROOM_SETTINGS: RoomSettings = {
  rounds: 10,
  timePerRound: 20000, // 20 seconds in milliseconds
};

// ============================================================================
// Settings Validation Limits
// ============================================================================

export const SETTINGS_LIMITS = {
  rounds: { min: 1, max: 50 },
  timePerRound: { min: 5000, max: 120000 }, // 5-120 seconds in milliseconds
} as const;

// ============================================================================
// Mock Playlists (for UI demonstration)
// ============================================================================

export const MOCK_PLAYLISTS: Playlist[] = [
  {
    id: "1",
    name: "Today's Top Hits",
    description: "The hottest tracks right now",
    trackCount: 50,
    imageUrl: "https://picsum.photos/seed/playlist1/100/100",
  },
  {
    id: "2",
    name: "RapCaviar",
    description: "New music from Drake, Travis Scott & more",
    trackCount: 50,
    imageUrl: "https://picsum.photos/seed/playlist2/100/100",
  },
  {
    id: "3",
    name: "All Out 2010s",
    description: "The biggest songs of the 2010s",
    trackCount: 100,
    imageUrl: "https://picsum.photos/seed/playlist3/100/100",
  },
  {
    id: "4",
    name: "Rock Classics",
    description: "Rock legends & iconic songs",
    trackCount: 75,
    imageUrl: "https://picsum.photos/seed/playlist4/100/100",
  },
  {
    id: "5",
    name: "Chill Vibes",
    description: "Kick back and relax",
    trackCount: 60,
    imageUrl: "https://picsum.photos/seed/playlist5/100/100",
  },
  {
    id: "6",
    name: "Workout Mix",
    description: "Get pumped with these tracks",
    trackCount: 45,
    imageUrl: "https://picsum.photos/seed/playlist6/100/100",
  },
  {
    id: "7",
    name: "Indie Favorites",
    description: "The best indie music",
    trackCount: 80,
    imageUrl: "https://picsum.photos/seed/playlist7/100/100",
  },
  {
    id: "8",
    name: "Electronic Dance",
    description: "EDM hits for the dance floor",
    trackCount: 55,
    imageUrl: "https://picsum.photos/seed/playlist8/100/100",
  },
];

// ============================================================================
// Game Settings Options
// ============================================================================

export const ROUND_OPTIONS = [5, 10, 15, 20] as const;
export const TIME_PER_ROUND_OPTIONS = [10, 15, 20, 25, 30] as const;

// ============================================================================
// Room Code Generation
// ============================================================================

export const ROOM_CODE_LENGTH = 8;
export const ROOM_CODE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

/**
 * Generates a cryptographically random room code.
 * Uses crypto.getRandomValues for uniform distribution.
 * 8 chars from 36-char alphabet = 36^8 ≈ 2.8 trillion combinations,
 * making collisions negligible in practice.
 */
export function generateRoomCode(): string {
  const bytes = new Uint8Array(ROOM_CODE_LENGTH);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => ROOM_CODE_CHARS[b % ROOM_CODE_CHARS.length]).join('');
}


// ============================================================================
// Input Validation
// ============================================================================

export const MAX_USERNAME_LENGTH = 20;
export const MAX_CHAT_MESSAGE_LENGTH = 500;
export const ROOM_CODE_REGEX = /^[A-Z0-9]+$/;

// ============================================================================
// Scoring Constants
// ============================================================================

export const SCORING = {
  BASE_POINTS: 100,
  MAX_SPEED_BONUS: 100,
  STREAK_BONUS: 10,
  ROUND_END_DELAY: 5000,
  GAME_END_DELAY: 10000,
} as const;
