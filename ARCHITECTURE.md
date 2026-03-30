# Spotiguess Architecture

## Overview

Spotiguess is a multiplayer Spotify song guessing game where players create rooms, join via shared links, and compete to guess songs from a blended playlist. Points are awarded based on correctness and speed.

## Technology Stack

### Backend
- **Runtime**: Cloudflare Workers
- **Framework**: Hono (edge-optimized web framework)
- **Database**: PostgreSQL with Drizzle ORM
- **Connection**: Cloudflare Hyperdrive (connection pooling)
- **Real-time**: WebSocket with Durable Objects
- **Auth**: better-auth with Spotify OAuth 2.0

### Frontend
- **Framework**: React 18+ with TypeScript
- **Build**: Vite
- **Styling**: Tailwind CSS
- **State**: React Context + WebSocket hooks

### External Services
- **Spotify Web API**: Authentication, top tracks, song metadata
- **Spotify Preview URLs**: 30-second previews for playback

## System Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Client Layer                                           │
│  ├─ React Frontend (Vite + Tailwind)                   │
│  └─ WebSocket Client (native API)                      │
└─────────────────────────────────────────────────────────┘
                        ↓ HTTP/WS
┌─────────────────────────────────────────────────────────┐
│  Cloudflare Workers                                     │
│  ├─ Hono Backend (API routes)                          │
│  ├─ WebSocket Durable Object (real-time)               │
│  └─ better-auth (Spotify OAuth)                        │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│  Database (PostgreSQL via Hyperdrive)                   │
│  ├─ Users & Sessions (better-auth)                     │
│  ├─ Spotify Accounts (OAuth tokens)                    │
│  └─ Game Results (persisted at game end)               │
└─────────────────────────────────────────────────────────┘
```

## Core Concepts

### Ephemeral State (Durable Objects)

All room and game state is kept **in-memory** during gameplay using Durable Objects. This approach:
- Reduces database load
- Enables real-time updates via WebSocket
- Simplifies state management
- Only persists final results to database

**State Lifecycle:**
```
Room Created → Players Join → Game Starts → Rounds Play → Game Ends → Results Saved
     ↓              ↓              ↓             ↓             ↓            ↓
  In-Memory     In-Memory      In-Memory     In-Memory     In-Memory    Database
```

### Room Management

Rooms are managed entirely in the Durable Object:
- **Room Code**: 8-character shareable code (e.g., "ABC123XYZ")
- **Host**: First player to join becomes host
- **Players**: Tracked with ready status
- **Settings**: Configurable rounds and time per round
- **Playlist**: Selected by host before game starts

### Game Flow

1. **Lobby Phase** (Current Implementation)
   - Host creates room and shares code
   - Players join via WebSocket
   - Host configures settings and playlist
   - Players mark ready
   - Host starts game

2. **Game Phase** (Planned)
   - Fetch top tracks from all players' Spotify
   - Create blend from combined pool
   - Play rounds with song previews
   - Validate guesses in real-time
   - Award points based on speed and accuracy
   - Show leaderboard after each round

3. **End Phase** (Planned)
   - Calculate final scores
   - Determine winner
   - Save results to database
   - Clear in-memory state

## Current Implementation Status

### ✅ Implemented

**Backend (Durable Object)**
- WebSocket connection management with hibernation
- Player session tracking (username, userId, host status, ready status)
- Room settings management (maxPlayers, rounds, timePerRound)
- Playlist selection
- Host permission validation
- Real-time message broadcasting
- Game event system with styled notifications

**Frontend (Room Page)**
- Room lobby UI with player list
- Host controls (settings, playlist, start game)
- Player ready toggle
- Real-time updates via WebSocket
- Settings modal (rounds, time per round)
- Playlist selection modal
- Chat integration

**Shared**
- TypeScript types for WebSocket messages
- Constants for default settings and limits
- Mock playlists for UI demonstration

### 🚧 In Progress

- Room code generation (currently using URL params)
- Game state initialization
- Spotify API integration

### 📋 Planned Features

**Game Mechanics**
- Round flow with song playback
- Guess validation (fuzzy matching)
- Scoring system (base + speed bonus)
- Leaderboard updates
- Game end with results persistence

**Spotify Integration**
- Fetch user's top tracks
- Blend algorithm (combine and shuffle tracks)
- Song preview playback
- Album art display

**Database**
- Songs table (Spotify track cache)
- Game results table (final scores, winner, songs used)

**Enhanced Features**
- Team mode
- Spectator mode
- Chat history
- Player statistics
- Achievements

## WebSocket Events

### Client → Server
- `join`: Join a room with username and userId
- `leave`: Leave the current room
- `chat_message`: Send a chat message
- `ready`: Toggle ready status
- `update_settings`: Update room settings (host only)
- `update_playlist`: Update selected playlist (host only)
- `start_game`: Start the game (host only)

### Server → Client
- `user_joined`: Player joined the room
- `user_left`: Player left the room
- `users_updated`: Player list changed
- `room_created`: Room was created (first player)
- `room_state`: Current room state (new player)
- `settings_updated`: Settings were changed
- `playlist_updated`: Playlist was changed
- `game_event`: Game lifecycle events (styled notifications)
- `error`: Error message

### Game Event Categories
- `system`: Join/leave, ready status, host changes
- `game`: Game start, round start/end, game end
- `scoring`: Points awarded, correct guesses (planned)
- `error`: Error notifications

## Database Schema

### Current (Implemented)
```sql
-- Users (better-auth)
user: id, name, email, image, createdAt, updatedAt

-- Sessions (better-auth)
session: id, userId, token, expiresAt, createdAt

-- Accounts (better-auth)
account: id, userId, providerId, accessToken, refreshToken, expiresAt

-- Verification (better-auth)
verification: id, identifier, value, expiresAt
```

### Planned
```sql
-- Songs (Spotify track cache)
songs: id, spotifyTrackId, title, artist, album, albumArtUrl, previewUrl, durationMs

-- Game Results (persisted at game end)
gameResults: id, roomCode, totalRounds, playerCount, startedAt, completedAt, 
            winnerId, winnerName, finalScores (JSONB), songsUsed (JSONB)
```

## Key Design Decisions

1. **Ephemeral State**: Room and game state lives only in Durable Object memory, not in database
2. **WebSocket-First**: All room/game operations via WebSocket, HTTP only for auth and user data
3. **Host Control**: First player is host, controls settings and game start
4. **Real-time Updates**: All state changes broadcast to room members immediately
5. **Spotify Integration**: Use preview URLs for playback, fetch top tracks for blending

## Development Phases

### Phase 1: Core Infrastructure ✅
- Project setup (Vite, React, Hono)
- Cloudflare Workers configuration
- Database with Drizzle ORM
- better-auth with Spotify OAuth

### Phase 2: Room & Lobby ✅
- Durable Object for WebSocket
- Room state management
- Player tracking and ready system
- Settings and playlist configuration
- Real-time updates

### Phase 3: Game Mechanics (Current)
- Game state initialization
- Round flow with song playback
- Guess validation
- Scoring system
- Leaderboard

### Phase 4: Spotify Integration
- Fetch user's top tracks
- Blend algorithm
- Song preview playback
- Album art display

### Phase 5: Persistence & Polish
- Database tables for songs and game results
- Save game results at end
- Error handling and validation
- Loading states and UX improvements

### Phase 6: Deployment
- Deploy to Cloudflare
- Environment configuration
- Monitoring and logging

## Project Structure

```
spotiguess/
├── src/
│   ├── react-app/           # Frontend
│   │   ├── components/      # React components
│   │   ├── contexts/        # React contexts
│   │   ├── pages/           # Page components
│   │   └── App.tsx
│   ├── worker/              # Backend
│   │   ├── db/              # Database schema
│   │   ├── lib/             # Libraries (better-auth)
│   │   ├── index.ts         # Hono app entry
│   │   └── websocketDurableObject.ts
│   └── shared/              # Shared types and constants
├── drizzle/                 # Database migrations
├── wrangler.json            # Cloudflare config
└── package.json
```

## References

- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [Durable Objects](https://developers.cloudflare.com/workers/runtime-apis/durable-objects/)
- [better-auth](https://better-auth.com/docs/introduction)
- [Drizzle ORM](https://orm.drizzle.team/docs/overview)
- [Hono](https://hono.dev/docs/)
