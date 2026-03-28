# Spotiguess Architecture Plan

## Overview
Spotiguess is a multiplayer Spotify song guessing game where players create rooms, join via shared links, and compete to guess songs from a blended playlist created from all players' top tracks. Points are awarded based on correctness and speed.

## Technology Stack

### Backend
- **Runtime**: Cloudflare Workers
- **Framework**: Hono (Lightweight web framework for edge)
- **Database**: PostgreSQL with Drizzle ORM
- **Database Connection**: Cloudflare Hyperdrive (connection pooling)
- **Real-time**: WebSocket (native Cloudflare Workers support)
- **Authentication**: better-auth with Spotify OAuth 2.0

### Frontend
- **Framework**: React 18+ with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **State Management**: Zustand or React Context
- **WebSocket Client**: Native WebSocket API with custom hooks

### External Services
- **Spotify Web API**: User authentication, fetching top tracks, song metadata
- **Spotify Web Playback SDK**: (Optional) For premium users to play full tracks
- **Spotify Preview URLs**: 30-second previews for non-premium users

## System Architecture

```mermaid
graph TB
    subgraph "Client Layer"
        React[React Frontend]
        WS_Client[WebSocket Client]
    end

    subgraph "Cloudflare Workers"
        Hono[Hono Backend]
        WS_Server[WebSocket Server]
        Auth[Auth Handler]
        Game[Game Logic]
        Room[Room Manager]
    end

    subgraph "External Services"
        Spotify[Spotify API]
        Hyperdrive[Hyperdrive]
    end

    subgraph "Database"
        PostgreSQL[(PostgreSQL)]
    end

    React -->|HTTP/WS| Hono
    WS_Client -->|WebSocket| WS_Server
    Hono --> Auth
    Hono --> Game
    Hono --> Room
    Auth -->|OAuth| Spotify
    Game -->|Fetch tracks| Spotify
    Hono --> Hyperdrive
    Hyperdrive --> PostgreSQL
```

## Database Schema

### Users Table
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  spotify_id VARCHAR(255) UNIQUE NOT NULL,
  display_name VARCHAR(255),
  email VARCHAR(255),
  avatar_url TEXT,
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Rooms Table
```sql
CREATE TABLE rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(8) UNIQUE NOT NULL,
  host_id UUID REFERENCES users(id),
  status VARCHAR(20) DEFAULT 'waiting', -- waiting, playing, finished
  max_players INTEGER DEFAULT 8,
  rounds INTEGER DEFAULT 10,
  time_per_round INTEGER DEFAULT 30, -- seconds
  created_at TIMESTAMP DEFAULT NOW(),
  started_at TIMESTAMP,
  finished_at TIMESTAMP
);
```

### Room Players Table
```sql
CREATE TABLE room_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  is_ready BOOLEAN DEFAULT FALSE,
  joined_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(room_id, user_id)
);
```

### Games Table
```sql
CREATE TABLE games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES rooms(id),
  current_round INTEGER DEFAULT 0,
  total_rounds INTEGER,
  status VARCHAR(20) DEFAULT 'active', -- active, completed
  started_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);
```

### Songs Table
```sql
CREATE TABLE songs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  spotify_track_id VARCHAR(255) UNIQUE NOT NULL,
  title VARCHAR(500) NOT NULL,
  artist VARCHAR(500) NOT NULL,
  album VARCHAR(500),
  album_art_url TEXT,
  preview_url TEXT,
  duration_ms INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Game Rounds Table
```sql
CREATE TABLE game_rounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID REFERENCES games(id),
  round_number INTEGER NOT NULL,
  song_id UUID REFERENCES songs(id),
  started_at TIMESTAMP DEFAULT NOW(),
  ended_at TIMESTAMP,
  UNIQUE(game_id, round_number)
);
```

### Scores Table
```sql
CREATE TABLE scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID REFERENCES games(id),
  user_id UUID REFERENCES users(id),
  round_id UUID REFERENCES game_rounds(id),
  points INTEGER DEFAULT 0,
  guess_time_ms INTEGER, -- time taken to guess in milliseconds
  is_correct BOOLEAN DEFAULT FALSE,
  guessed_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(round_id, user_id)
);
```

## API Endpoints

### Authentication
- `GET /auth/spotify` - Initiate Spotify OAuth flow (via better-auth)
- `GET /auth/spotify/callback` - Handle OAuth callback (via better-auth)
- `POST /auth/refresh` - Refresh access token (via better-auth)
- `POST /auth/logout` - Logout user (via better-auth)
- `GET /auth/session` - Get current session (via better-auth)
- `POST /auth/sign-out` - Sign out user (via better-auth)

### Rooms
- `POST /api/rooms` - Create a new room
- `GET /api/rooms/:code` - Get room details by code
- `POST /api/rooms/:code/join` - Join a room
- `POST /api/rooms/:code/leave` - Leave a room
- `POST /api/rooms/:code/start` - Start the game (host only)
- `PUT /api/rooms/:code/settings` - Update room settings (host only)

### Game
- `GET /api/games/:id` - Get game state
- `POST /api/games/:id/guess` - Submit a guess
- `GET /api/games/:id/leaderboard` - Get current leaderboard

### User
- `GET /api/user/me` - Get current user profile
- `GET /api/user/top-tracks` - Get user's top tracks from Spotify

## WebSocket Events

### Client → Server
```typescript
// Join a room
{
  type: 'join_room',
  payload: { roomId: string, userId: string }
}

// Leave a room
{
  type: 'leave_room',
  payload: { roomId: string, userId: string }
}

// Player ready status
{
  type: 'player_ready',
  payload: { roomId: string, userId: string, isReady: boolean }
}

// Submit guess
{
  type: 'submit_guess',
  payload: { 
    gameId: string, 
    roundId: string, 
    userId: string, 
    guess: string,
    timestamp: number
  }
}

// Chat message (optional)
{
  type: 'chat_message',
  payload: { roomId: string, userId: string, message: string }
}
```

### Server → Client
```typescript
// Player joined
{
  type: 'player_joined',
  payload: { player: Player, players: Player[] }
}

// Player left
{
  type: 'player_left',
  payload: { userId: string, players: Player[] }
}

// Player ready status changed
{
  type: 'player_ready_changed',
  payload: { userId: string, isReady: boolean, players: Player[] }
}

// Game started
{
  type: 'game_started',
  payload: { gameId: string, totalRounds: number }
}

// New round started
{
  type: 'round_started',
  payload: { 
    roundId: string, 
    roundNumber: number, 
    song: { 
      previewUrl: string, 
      durationMs: number 
    },
    endsAt: number // timestamp
  }
}

// Correct guess
{
  type: 'correct_guess',
  payload: { 
    userId: string, 
    displayName: string,
    points: number,
    guessTimeMs: number
  }
}

// Round ended
{
  type: 'round_ended',
  payload: { 
    roundId: string,
    song: Song,
    scores: RoundScore[],
    leaderboard: LeaderboardEntry[]
  }
}

// Game ended
{
  type: 'game_ended',
  payload: { 
    gameId: string,
    finalScores: FinalScore[],
    winner: Player
  }
}

// Error
{
  type: 'error',
  payload: { message: string, code?: string }
}
```

## Game Flow

### 1. Room Creation & Joining
```
Host creates room → Room code generated → Host joins WebSocket room
                                              ↓
Players join via link → Enter room code → Join WebSocket room
                                              ↓
All players mark ready → Host can start game
```

### 2. Game Initialization
```
Host starts game → 
  1. Fetch top tracks from all players' Spotify accounts
  2. Create blend (random selection from combined pool)
  3. Create game record in database
  4. Create round records for each song
  5. Broadcast game_started event
```

### 3. Round Flow
```
Round starts →
  1. Server sends round_started with preview URL
  2. Timer starts (30 seconds default)
  3. Players listen and guess
  4. Server validates guesses in real-time
  5. Correct guess → Award points, broadcast to all
  6. Timer ends → Round ends
  7. Server reveals song details
  8. Show leaderboard update
  9. Wait 5 seconds → Start next round
```

### 4. Scoring System
```
Base points: 50 for correct answer
Speed bonus: Up to 50 additional points

Formula: points = 50 + (50 * (1 - (guessTimeMs / roundDurationMs)))

Example (30 second round):
- Guess in 3 seconds: 50 + (50 * (1 - 3000/30000)) = 50 + 45 = 95 points
- Guess in 15 seconds: 50 + (50 * (1 - 15000/30000)) = 50 + 25 = 75 points
- Guess in 28 seconds: 50 + (50 * (1 - 28000/30000)) = 50 + 3.33 = 53 points
```

## Blend Algorithm

```typescript
async function createBlend(playerIds: string[]): Promise<Song[]> {
  const allTracks: SpotifyTrack[] = [];
  
  // Fetch top tracks for each player
  for (const playerId of playerIds) {
    const tracks = await spotify.getUserTopTracks(playerId, { limit: 50 });
    allTracks.push(...tracks);
  }
  
  // Remove duplicates by Spotify track ID
  const uniqueTracks = Array.from(
    new Map(allTracks.map(t => [t.id, t])).values()
  );
  
  // Shuffle and select required number of songs
  const shuffled = shuffleArray(uniqueTracks);
  const selectedTracks = shuffled.slice(0, ROUNDS_PER_GAME);
  
  // Save to database and return
  return await saveSongsToDatabase(selectedTracks);
}
```

## Project Structure

```
spotiguess/
├── backend/
│   ├── src/
│   │   ├── index.ts              # Hono app entry point
│   │   ├── config/
│   │   │   ├── database.ts       # Drizzle config
│   │   │   ├── spotify.ts        # Spotify API config
│   │   │   ├── auth.ts           # better-auth config
│   │   │   └── env.ts            # Environment variables
│   │   ├── db/
│   │   │   ├── schema.ts         # Drizzle schema
│   │   │   ├── migrations/       # Database migrations
│   │   │   └── queries.ts        # Common queries
│   │   ├── routes/
│   │   │   ├── auth.ts           # Auth endpoints (better-auth integration)
│   │   │   ├── rooms.ts          # Room endpoints
│   │   │   ├── games.ts          # Game endpoints
│   │   │   └── user.ts           # User endpoints
│   │   ├── services/
│   │   │   ├── spotify.ts        # Spotify API service
│   │   │   ├── room.ts           # Room management
│   │   │   ├── game.ts           # Game logic
│   │   │   └── scoring.ts        # Scoring system
│   │   ├── websocket/
│   │   │   ├── handler.ts        # WebSocket connection handler
│   │   │   ├── events.ts         # Event definitions
│   │   │   └── rooms.ts          # WebSocket room management
│   │   ├── middleware/
│   │   │   ├── auth.ts           # Auth middleware (better-auth)
│   │   │   └── cors.ts           # CORS middleware
│   │   └── types/
│   │       ├── spotify.ts        # Spotify types
│   │       ├── game.ts           # Game types
│   │       └── websocket.ts      # WebSocket types
│   ├── wrangler.toml             # Cloudflare Workers config
│   ├── drizzle.config.ts         # Drizzle ORM config
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/
│   ├── src/
│   │   ├── main.tsx              # React entry point
│   │   ├── App.tsx               # Main app component
│   │   ├── components/
│   │   │   ├── auth/
│   │   │   │   ├── LoginButton.tsx
│   │   │   │   └── AuthCallback.tsx
│   │   │   ├── lobby/
│   │   │   │   ├── CreateRoom.tsx
│   │   │   │   ├── JoinRoom.tsx
│   │   │   │   └── RoomLobby.tsx
│   │   │   ├── game/
│   │   │   │   ├── GameRoom.tsx
│   │   │   │   ├── SongPlayer.tsx
│   │   │   │   ├── GuessInput.tsx
│   │   │   │   ├── RoundTimer.tsx
│   │   │   │   ├── ScoreBoard.tsx
│   │   │   │   └── Leaderboard.tsx
│   │   │   └── common/
│   │   │       ├── Button.tsx
│   │   │       ├── Input.tsx
│   │   │       ├── Modal.tsx
│   │   │       └── Loading.tsx
│   │   ├── hooks/
│   │   │   ├── useWebSocket.ts   # WebSocket hook
│   │   │   ├── useAuth.ts        # Auth hook
│   │   │   ├── useRoom.ts        # Room state hook
│   │   │   └── useGame.ts        # Game state hook
│   │   ├── stores/
│   │   │   ├── authStore.ts      # Auth state
│   │   │   ├── roomStore.ts      # Room state
│   │   │   └── gameStore.ts      # Game state
│   │   ├── services/
│   │   │   ├── api.ts            # API client
│   │   │   └── websocket.ts      # WebSocket service
│   │   ├── types/
│   │   │   ├── api.ts            # API types
│   │   │   ├── game.ts           # Game types
│   │   │   └── websocket.ts      # WebSocket types
│   │   └── utils/
│   │       ├── format.ts         # Formatting utilities
│   │       └── constants.ts      # App constants
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── tailwind.config.js
│
├── package.json                  # Root package.json (monorepo)
└── README.md
```

## Environment Variables

### Backend (.env)
```env
# Database
DATABASE_URL=postgresql://user:password@host:5432/spotiguess
HYPERDRIVE_ID=your-hyperdrive-id

# Spotify
SPOTIFY_CLIENT_ID=your-client-id
SPOTIFY_CLIENT_SECRET=your-client-secret
SPOTIFY_REDIRECT_URI=https://your-domain.com/auth/spotify/callback

# better-auth
BETTER_AUTH_SECRET=your-better-auth-secret
BETTER_AUTH_URL=https://your-backend-domain.com

# App
FRONTEND_URL=https://your-frontend-domain.com

# Cloudflare
CLOUDFLARE_ACCOUNT_ID=your-account-id
CLOUDFLARE_API_TOKEN=your-api-token
```

### Frontend (.env)
```env
VITE_API_URL=https://your-backend-domain.com
VITE_WS_URL=wss://your-backend-domain.com
```

## Key Implementation Details

### 1. Authentication with better-auth
- Use better-auth for secure, type-safe authentication
- Built-in support for OAuth providers (Spotify)
- Automatic session management with secure cookies
- CSRF protection out of the box
- Easy integration with Hono via better-auth's Hono plugin
- Handles token refresh automatically
- Provides session validation middleware

### 2. WebSocket Connection Management
- Use Cloudflare Workers Durable Objects for stateful WebSocket connections
- Each room is a Durable Object instance
- Maintains player connections and broadcasts events
- Authenticate WebSocket connections using better-auth session tokens

### 3. Spotify Token Management
- Store access and refresh tokens in database
- Automatically refresh tokens before expiration
- Handle token refresh in middleware
- Use better-auth's built-in OAuth token management

### 4. Game State Synchronization
- Server is source of truth for game state
- Clients receive state updates via WebSocket
- Optimistic updates for better UX, with server validation

### 5. Song Preview Playback
- Use Spotify's 30-second preview URLs
- Fallback to showing album art and song info if no preview
- Consider Spotify Web Playback SDK for premium users

### 6. Guess Validation
- Normalize strings (lowercase, remove special characters)
- Allow partial matches (e.g., "Bohemian Rhapsody" matches "bohemian rhapsody")
- Consider fuzzy matching for typos

## Security Considerations

1. **Authentication**: Use better-auth for secure session management and OAuth handling
2. **Authorization**: Ensure users can only access their own data and rooms they've joined
3. **Rate Limiting**: Implement rate limiting on API endpoints
4. **Input Validation**: Sanitize all user inputs
5. **CORS**: Configure CORS properly for frontend domain
6. **WebSocket**: Authenticate WebSocket connections using better-auth session tokens
7. **Session Security**: Leverage better-auth's built-in CSRF protection and secure cookie handling

## Performance Optimizations

1. **Database Indexing**: Index frequently queried fields (spotify_id, room_code, etc.)
2. **Connection Pooling**: Use Hyperdrive for efficient database connections
3. **Caching**: Cache Spotify API responses where appropriate
4. **CDN**: Serve static assets via Cloudflare CDN
5. **Lazy Loading**: Load components and routes on demand

## better-auth Configuration

### Installation
```bash
# Backend
bun add better-auth
bun add @better-auth/hono  # Hono plugin
```

### Basic Setup
```typescript
// src/config/auth.ts
import { betterAuth } from 'better-auth';
import { hono } from '@better-auth/hono';

export const auth = betterAuth({
  database: drizzleAdapter(db),
  socialProviders: {
    spotify: {
      clientId: env.SPOTIFY_CLIENT_ID,
      clientSecret: env.SPOTIFY_CLIENT_SECRET,
      redirectUri: env.SPOTIFY_REDIRECT_URI,
      scope: ['user-read-email', 'user-top-read'],
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
  },
});

// Hono plugin
export const authPlugin = hono(auth);
```

### Usage in Routes
```typescript
// src/routes/auth.ts
import { Hono } from 'hono';
import { authPlugin } from '../config/auth';

export const authRoutes = new Hono()
  .use(authPlugin)
  .get('/auth/session', async ({ auth }) => {
    return auth.session;
  });
```

### Middleware for Protected Routes
```typescript
// src/middleware/auth.ts
import { Hono } from 'hono';
import { authPlugin } from '../config/auth';

export const protectedRoute = new Hono()
  .use(authPlugin)
  .derive(async ({ auth }) => {
    if (!auth.session) {
      throw new Error('Unauthorized');
    }
    return { user: auth.session.user };
  });
```

## Deployment Strategy

1. **Backend**: Deploy to Cloudflare Workers using Wrangler
2. **Frontend**: Deploy to Cloudflare Pages
3. **Database**: Use Cloudflare D1 or external PostgreSQL with Hyperdrive
4. **Environment**: Use Cloudflare Secrets for sensitive data

## Testing Strategy

1. **Unit Tests**: Test individual functions and services
2. **Integration Tests**: Test API endpoints and WebSocket events
3. **E2E Tests**: Test complete game flow
4. **Load Tests**: Test concurrent multiplayer scenarios

## Future Enhancements

1. **Game Modes**: 
   - Team mode
   - Elimination mode
   - Custom round counts
   
2. **Features**:
   - Chat functionality
   - Spectator mode
   - Replay system
   - Custom playlists
   
3. **Social**:
   - Friend system
   - Achievements
   - Statistics tracking
   
4. **Monetization**:
   - Premium features
   - Custom themes
   - Ad-free experience

## Development Phases

### Phase 1: Core Infrastructure
- Set up project structure
- Configure Cloudflare Workers
- Set up database with Drizzle
- Configure better-auth with Spotify OAuth provider
- Implement authentication flow

### Phase 2: Basic Game Logic
- Room creation and management
- WebSocket implementation
- Basic game flow
- Song fetching and blend algorithm

### Phase 3: Frontend Development
- React app setup
- Authentication UI
- Lobby and room UI
- Game room UI

### Phase 4: Polish & Testing
- Scoring system refinement
- Error handling
- Performance optimization
- Testing and bug fixes

### Phase 5: Deployment
- Deploy to Cloudflare
- Environment configuration
- Monitoring and logging
- Documentation
