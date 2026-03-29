import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router";
import { Chat } from "../components/Chat";
import { useAuth } from "../contexts/AuthContext";
import Header from "../components/Header";

interface Player {
  userId: string;
  username: string;
  userImage?: string;
  isReady: boolean;
  isHost: boolean;
}

interface Playlist {
  id: string;
  name: string;
  description: string;
  trackCount: number;
  imageUrl?: string;
}

export default function RoomPage() {
  const navigate = useNavigate();
  const { roomName } = useParams<{ roomName: string }>();
  const { user, isAuthenticated, isLoading } = useAuth();

  const [currentUser, setCurrentUser] = useState<{
    username: string;
    userId: string;
  } | null>(null);

  const [showUsernamePrompt, setShowUsernamePrompt] = useState(false);
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [spotifyLink, setSpotifyLink] = useState("");
  const [gameSettings, setGameSettings] = useState({
    rounds: 10,
    timePerRound: 20,
  });

  // Mock playlists for UI demonstration
  const mockPlaylists: Playlist[] = [
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

  useEffect(() => {
    // Wait for auth to load
    if (isLoading) return;

    // If user is authenticated, use their auth info
    if (isAuthenticated && user) {
      setCurrentUser({
        username: user.name || user.email.split("@")[0],
        userId: user.id,
      });
      setShowUsernamePrompt(false);

      // Initialize players with current user as host
      setPlayers([
        {
          userId: user.id,
          username: user.name || user.email.split("@")[0],
          userImage: user.image || undefined,
          isReady: false,
          isHost: true,
        },
      ]);
    } else {
      // Check if we have a stored username for this session (fallback for unauthenticated users)
      const storedUsername = sessionStorage.getItem("chat-username");
      if (storedUsername) {
        const userId = `user-${Math.random().toString(36).substr(2, 9)}`;
        setCurrentUser({ username: storedUsername, userId });

        // Initialize players with current user as host
        setPlayers([
          {
            userId,
            username: storedUsername,
            isReady: false,
            isHost: true,
          },
        ]);
      } else {
        setShowUsernamePrompt(true);
      }
    }
  }, [isLoading, isAuthenticated, user]);

  const handleJoinRoom = (username: string, room: string) => {
    // Store username in session storage
    sessionStorage.setItem("chat-username", username);

    const userId = `user-${Math.random().toString(36).substr(2, 9)}`;
    setCurrentUser({ username, userId });
    setShowUsernamePrompt(false);

    // Initialize players with current user as host
    setPlayers([
      {
        userId,
        username,
        isReady: false,
        isHost: true,
      },
    ]);

    // If they selected a different room, navigate to it
    if (room !== roomName) {
      navigate(`/room/${encodeURIComponent(room)}`);
    }
  };

  const handleLeaveRoom = () => {
    sessionStorage.removeItem("chat-username");
    setCurrentUser(null);
    navigate("/");
  };

  const handleToggleReady = () => {
    setIsReady(!isReady);
    // Update player ready status
    setPlayers((prev) =>
      prev.map((p) =>
        p.userId === currentUser?.userId ? { ...p, isReady: !isReady } : p
      )
    );
  };

  const handleStartGame = () => {
    // TODO: Implement game start logic
    console.log("Starting game with settings:", {
      playlist: selectedPlaylist,
      rounds: gameSettings.rounds,
      timePerRound: gameSettings.timePerRound,
      players,
    });
  };

  const handleSelectPlaylist = (playlist: Playlist) => {
    setSelectedPlaylist(playlist);
    setShowPlaylistModal(false);
  };

  const handleSpotifyLinkSubmit = () => {
    // TODO: Implement Spotify link parsing
    console.log("Spotify link submitted:", spotifyLink);
    setSpotifyLink("");
    setShowPlaylistModal(false);
  };

  const handleCreateBlend = () => {
    // TODO: Implement blend creation from players' top tracks
    console.log("Creating blend from players");
    setShowPlaylistModal(false);
  };

  const isHost = players.find((p) => p.userId === currentUser?.userId)?.isHost;
  // Check if all non-host players are ready
  const nonHostPlayers = players.filter((p) => !p.isHost);
  const allNonHostPlayersReady = nonHostPlayers.length > 0 && nonHostPlayers.every((p) => p.isReady);
  const canStartGame = isHost && players.length >= 2 && selectedPlaylist && allNonHostPlayersReady;

  // Get the current warning to show (one at a time in order)
  const getCurrentWarning = () => {
    if (players.length < 2) {
      return "Need at least 2 players to start";
    }
    if (!selectedPlaylist) {
      return "Please select a playlist to start";
    }
    if (!allNonHostPlayersReady) {
      return "Waiting for all players to be ready";
    }
    return null;
  };
  const currentWarning = getCurrentWarning();

  // Show loading state while auth is loading
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto"></div>
          <p className="mt-4 text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Show username prompt if no user is set
  if (showUsernamePrompt || !currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl shadow-xl p-8 w-full max-w-md border border-gray-700/50">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-white"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">
              Join <span className="text-green-400">#{roomName}</span>
            </h1>
            <p className="text-gray-400">
              Enter your username to join this game room
            </p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const username = formData.get("username") as string;
              if (username?.trim()) {
                handleJoinRoom(username.trim(), roomName || "general");
              }
            }}
            className="space-y-6"
          >
            <div>
              <label
                htmlFor="username"
                className="block text-sm font-medium text-gray-300 mb-2"
              >
                Username
              </label>
              <input
                type="text"
                id="username"
                name="username"
                placeholder="Enter your username..."
                className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all"
                required
                autoFocus
              />
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => navigate("/")}
                className="flex-1 px-4 py-3 bg-gray-700/50 text-gray-300 rounded-xl hover:bg-gray-600/50 transition-all border border-gray-600"
              >
                Back to Home
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-3 bg-gradient-to-r from-green-400 to-green-600 text-white rounded-xl hover:from-green-500 hover:to-green-700 transition-all font-semibold"
              >
                Join #{roomName}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Header */}
      <Header>
        <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-gray-800/50 rounded-xl border border-gray-700/50">
          <span className="text-gray-400 text-sm">Room:</span>
          <span className="text-green-400 font-semibold">{roomName}</span>
        </div>
        <button
          onClick={handleLeaveRoom}
          className="px-4 py-2 bg-gray-700/50 text-gray-300 rounded-xl hover:bg-gray-600/50 transition-all border border-gray-600"
        >
          Leave Room
        </button>
      </Header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Room Info & Players */}
          <div className="lg:col-span-2 space-y-6">
            {/* Room Info */}
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-1">
                    Game Room
                  </h2>
                  <p className="text-gray-400">
                    Share this code with friends to invite them
                  </p>
                </div>
                <div className="px-6 py-3 bg-gradient-to-r from-green-400/20 to-green-600/20 rounded-xl border border-green-500/30">
                  <span className="text-3xl font-bold text-green-400 tracking-wider">
                    {roomName}
                  </span>
                </div>
              </div>

              {/* Playlist & Settings Row */}
              <div className="flex gap-4">
                {/* Playlist Selection */}
                <button
                  onClick={() => setShowPlaylistModal(true)}
                  className="flex-1 flex items-center gap-3 px-4 py-3 bg-gray-700/30 rounded-xl hover:bg-gray-700/50 transition-all border border-gray-600/30"
                >
                  <svg
                    className="w-5 h-5 text-green-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
                    />
                  </svg>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-white font-medium truncate">
                      {selectedPlaylist ? selectedPlaylist.name : "Select Playlist"}
                    </p>
                    <p className="text-xs text-gray-400 truncate">
                      {selectedPlaylist ? `${selectedPlaylist.trackCount} tracks` : "Choose a playlist"}
                    </p>
                  </div>
                  <svg
                    className="w-5 h-5 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </button>

                {/* Settings Button */}
                <button
                  onClick={() => setShowSettingsModal(true)}
                  className="flex-1 flex items-center gap-3 px-4 py-3 bg-gray-700/30 rounded-xl hover:bg-gray-700/50 transition-all border border-gray-600/30"
                >
                  <svg
                    className="w-5 h-5 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-white font-medium">Game Settings</p>
                    <p className="text-xs text-gray-400">
                      {gameSettings.rounds} rounds, {gameSettings.timePerRound}s per round
                    </p>
                  </div>
                  <svg
                    className="w-5 h-5 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </button>
              </div>
            </div>

            {/* Players List */}
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <svg
                  className="w-5 h-5 text-green-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
                Players ({players.length})
              </h3>
              <div className="space-y-3">
                {players.map((player) => (
                  <div
                    key={player.userId}
                    className={`flex items-center justify-between p-4 rounded-xl transition-all ${
                      player.isHost
                        ? "bg-yellow-500/10 border border-yellow-500/30"
                        : player.isReady
                        ? "bg-green-500/10 border border-green-500/30"
                        : "bg-gray-700/30 border border-gray-600/30"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center">
                        {player.userImage ? (
                          <img
                            src={player.userImage}
                            alt={player.username}
                            className="w-10 h-10 rounded-full"
                          />
                        ) : (
                          <span className="text-white font-semibold">
                            {player.username.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div>
                        <p className="text-white font-medium">
                          {player.username}
                          {player.userId === currentUser?.userId && (
                            <span className="ml-2 text-gray-400 text-sm">
                              (You)
                            </span>
                          )}
                        </p>
                        <p className="text-sm text-gray-400">
                          {player.isHost ? "Host" : (player.isReady ? "Ready to play!" : "Not ready")}
                        </p>
                      </div>
                    </div>
                    <div
                      className={`w-3 h-3 rounded-full ${
                        player.isHost
                          ? "bg-yellow-500"
                          : player.isReady
                          ? "bg-green-500"
                          : "bg-gray-500"
                      }`}
                    />
                  </div>
                ))}
              </div>
            </div>


          </div>

          {/* Right Column - Chat & Actions */}
          <div className="space-y-6">
            {/* Action Buttons */}
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50">
              <div className="space-y-4">
                {!isHost && (
                  <button
                    onClick={handleToggleReady}
                    className={`w-full py-4 rounded-xl font-semibold text-lg transition-all ${
                      isReady
                        ? "bg-green-500 text-white hover:bg-green-600"
                        : "bg-gray-700/50 text-gray-300 hover:bg-gray-600/50 border border-gray-600"
                    }`}
                  >
                    {isReady ? "✓ Ready!" : "Mark as Ready"}
                  </button>
                )}

                {isHost && (
                  <button
                    onClick={handleStartGame}
                    disabled={!canStartGame}
                    className={`w-full py-4 rounded-xl font-semibold text-lg transition-all ${
                      canStartGame
                        ? "bg-gradient-to-r from-green-400 to-green-600 text-white hover:from-green-500 hover:to-green-700"
                        : "bg-gray-700/30 text-gray-500 cursor-not-allowed"
                    }`}
                  >
                    Start Game
                  </button>
                )}

                {!isHost && (
                  <p className="text-center text-gray-400 text-sm">
                    Waiting for host to start the game...
                  </p>
                )}

                {isHost && currentWarning && (
                  <p className="text-center text-yellow-400 text-sm">
                    ⚠️ {currentWarning}
                  </p>
                )}
              </div>
            </div>

            {/* Chat */}
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700/50 overflow-hidden h-[423px]">
              <Chat
                username={currentUser.username}
                room={roomName || "general"}
                userId={currentUser.userId}
              />
            </div>
          </div>
        </div>
      </main>

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-2xl w-full max-w-md border border-gray-700/50 shadow-xl">
            <div className="flex items-center justify-between p-6 border-b border-gray-700/50">
              <h2 className="text-xl font-bold text-white">Game Settings</h2>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  Number of Rounds
                </label>
                <div className="grid grid-cols-4 gap-3">
                  {[5, 10, 15, 20].map((rounds) => (
                    <button
                      key={rounds}
                      onClick={() =>
                        setGameSettings((prev) => ({ ...prev, rounds }))
                      }
                      disabled={!isHost}
                      className={`py-3 rounded-xl font-medium transition-all ${
                        gameSettings.rounds === rounds
                          ? "bg-green-500 text-white"
                          : "bg-gray-700/50 text-gray-300 hover:bg-gray-600/50 border border-gray-600"
                      } ${!isHost ? "opacity-50 cursor-not-allowed" : ""}`}
                    >
                      {rounds}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  Time per Round (seconds)
                </label>
                <div className="grid grid-cols-5 gap-3">
                  {[10, 15, 20, 25, 30].map((time) => (
                    <button
                      key={time}
                      onClick={() =>
                        setGameSettings((prev) => ({
                          ...prev,
                          timePerRound: time,
                        }))
                      }
                      disabled={!isHost}
                      className={`py-3 rounded-xl font-medium transition-all ${
                        gameSettings.timePerRound === time
                          ? "bg-green-500 text-white"
                          : "bg-gray-700/50 text-gray-300 hover:bg-gray-600/50 border border-gray-600"
                      } ${!isHost ? "opacity-50 cursor-not-allowed" : ""}`}
                    >
                      {time}s
                    </button>
                  ))}
                </div>
              </div>

              {!isHost && (
                <p className="text-center text-gray-400 text-sm">
                  Only the host can change game settings
                </p>
              )}
            </div>

            <div className="p-6 border-t border-gray-700/50">
              <button
                onClick={() => setShowSettingsModal(false)}
                className="w-full py-3 bg-gradient-to-r from-green-400 to-green-600 text-white rounded-xl hover:from-green-500 hover:to-green-700 transition-all font-semibold"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Playlist Selection Modal */}
      {showPlaylistModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-2xl w-full max-w-2xl border border-gray-700/50 shadow-xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-700/50">
              <h2 className="text-xl font-bold text-white">Select Playlist</h2>
              <button
                onClick={() => setShowPlaylistModal(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {/* Spotify Link Input */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Import from Spotify
                </label>
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={spotifyLink}
                    onChange={(e) => setSpotifyLink(e.target.value)}
                    placeholder="Paste Spotify playlist link..."
                    className="flex-1 px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all"
                  />
                  <button
                    onClick={handleSpotifyLinkSubmit}
                    disabled={!spotifyLink.trim()}
                    className="px-6 py-3 bg-gradient-to-r from-green-400 to-green-600 text-white rounded-xl hover:from-green-500 hover:to-green-700 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Import
                  </button>
                </div>
              </div>

              {/* Create Blend Button */}
              <button
                onClick={handleCreateBlend}
                className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:from-purple-600 hover:to-pink-600 transition-all font-medium mb-6"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
                Create Blend from Players
              </button>

              {/* Divider */}
              <div className="flex items-center gap-4 mb-6">
                <div className="flex-1 h-px bg-gray-700/50"></div>
                <span className="text-gray-400 text-sm">or choose from list</span>
                <div className="flex-1 h-px bg-gray-700/50"></div>
              </div>

              {/* Playlists List */}
              <div className="space-y-3">
                {mockPlaylists.map((playlist) => (
                  <button
                    key={playlist.id}
                    onClick={() => handleSelectPlaylist(playlist)}
                    className={`w-full flex items-center gap-4 p-4 rounded-xl transition-all text-left ${
                      selectedPlaylist?.id === playlist.id
                        ? "bg-green-500/20 border-2 border-green-500"
                        : "bg-gray-700/30 border-2 border-transparent hover:border-gray-600"
                    }`}
                  >
                    <img
                      src={playlist.imageUrl}
                      alt={playlist.name}
                      className="w-14 h-14 rounded-lg object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium truncate">
                        {playlist.name}
                      </p>
                      <p className="text-sm text-gray-400 truncate">
                        {playlist.description}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {playlist.trackCount} tracks
                      </p>
                    </div>
                    {selectedPlaylist?.id === playlist.id && (
                      <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                        <svg
                          className="w-4 h-4 text-white"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-6 border-t border-gray-700/50">
              <button
                onClick={() => setShowPlaylistModal(false)}
                className="w-full py-3 bg-gray-700/50 text-gray-300 rounded-xl hover:bg-gray-600/50 transition-all font-medium border border-gray-600"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

