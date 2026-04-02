import { useParams } from "react-router";
import { useRoomState } from "../hooks/useRoomState";
import { Chat } from "../components/Chat";
import { RoomLobby } from "../components/room/RoomLobby";
import { SettingsModal } from "../components/room/SettingsModal";
import { PlaylistModal } from "../components/room/PlaylistModal";
import { UsernamePrompt } from "../components/room/UsernamePrompt";
import { useAuth } from "../contexts/AuthContext";
import Header from "../components/Header";
import LoadingSpinner from "../components/common/LoadingSpinner";

export default function RoomPage() {
  const { user, isLoading } = useAuth();
  const { roomName } = useParams<{ roomName: string }>();
  const effectiveRoomName = roomName || "general";
  const {
    currentUser,
    showUsernamePrompt,
    players,
    selectedPlaylist,
    isReady,
    showSettingsModal,
    showPlaylistModal,
    spotifyLink,
    readyTrigger,
    settingsTrigger,
    playlistTrigger,
    gameSettings,
    isHost,
    canStartGame,
    currentWarning,
    handleJoinRoom,
    handleLeaveRoom,
    handleToggleReady,
    handleStartGame,
    handleSelectPlaylist,
    handleSpotifyLinkSubmit,
    handleCreateBlend,
    handleSettingsUpdate,
    handlePlaylistUpdate,
    handleUsersUpdate,
    setShowSettingsModal,
    setShowPlaylistModal,
    setSpotifyLink,
    setGameSettings,
    setSettingsTrigger,
  } = useRoomState();

  // Show loading state while auth is loading
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
        <div className="text-center">
          <LoadingSpinner size="xl" className="text-green-500 mx-auto" />
          <p className="mt-4 text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Show username prompt if no user is set
  if (showUsernamePrompt || !currentUser) {
    return (
      <UsernamePrompt
        roomName={effectiveRoomName}
        onSubmit={handleJoinRoom}
        onBack={() => window.history.back()}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Header */}
      <Header>
        <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-gray-800/50 rounded-xl border border-gray-700/50">
          <span className="text-gray-400 text-sm">Room:</span>
          <span className="text-green-400 font-semibold">{effectiveRoomName}</span>
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
          {/* Left Column - Room Lobby */}
          <div className="lg:col-span-2">
            <RoomLobby
              roomName={effectiveRoomName}
              players={players}
              selectedPlaylist={selectedPlaylist}
              gameSettings={gameSettings}
              isHost={isHost ?? false}
              isReady={isReady}
              canStartGame={canStartGame ?? false}
              currentWarning={currentWarning}
              currentUser={currentUser}
              onToggleReady={handleToggleReady}
              onStartGame={handleStartGame}
              onOpenSettings={() => setShowSettingsModal(true)}
              onOpenPlaylist={() => setShowPlaylistModal(true)}
            />
          </div>

          {/* Right Column - Chat */}
          <div className="space-y-6">
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700/50 overflow-hidden h-[calc(100vh-140px)]">
              <Chat
                username={currentUser.username}
                room={effectiveRoomName}
                userId={currentUser.userId}
                userImage={user?.image || undefined}
                readyTrigger={readyTrigger}
                settingsTrigger={settingsTrigger}
                playlistTrigger={playlistTrigger}
                onSettingsUpdate={handleSettingsUpdate}
                onPlaylistUpdate={handlePlaylistUpdate}
                onUsersUpdate={handleUsersUpdate}
              />
            </div>
          </div>
        </div>
      </main>

      {/* Settings Modal */}
      {showSettingsModal && (
        <SettingsModal
          rounds={gameSettings.rounds}
          timePerRound={gameSettings.timePerRound}
          isHost={isHost ?? false}
          onSave={(settings) => {
            setGameSettings(settings);
            setSettingsTrigger(settings);
            setShowSettingsModal(false);
          }}
          onClose={() => setShowSettingsModal(false)}
        />
      )}

      {/* Playlist Modal */}
      {showPlaylistModal && (
        <PlaylistModal
          selectedPlaylist={selectedPlaylist}
          spotifyLink={spotifyLink}
          onSpotifyLinkChange={setSpotifyLink}
          onSelectPlaylist={handleSelectPlaylist}
          onSubmitSpotifyLink={handleSpotifyLinkSubmit}
          onCreateBlend={handleCreateBlend}
          onClose={() => setShowPlaylistModal(false)}
        />
      )}
    </div>
  );
}
