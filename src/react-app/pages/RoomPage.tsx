import { useState } from "react";
import { useParams } from "react-router";
import { useRoomState } from "../hooks/useRoomState";
import { Chat } from "../components/Chat";
import { RoomLobby } from "../components/room/RoomLobby";
import { SettingsModal } from "../components/room/SettingsModal";
import { PlaylistModal } from "../components/room/PlaylistModal";
import { UsernamePrompt } from "../components/room/UsernamePrompt";
import { GameView } from "../components/game/GameView";
import { RoundEndView } from "../components/game/RoundEndView";
import { GameEndView } from "../components/game/GameEndView";
import { useAuth } from "../contexts/AuthContext";
import LoadingSpinner from "../components/common/LoadingSpinner";

export default function RoomPage() {
  const { user, isLoading } = useAuth();
  const { roomName } = useParams<{ roomName: string }>();
  const effectiveRoomName = roomName || "general";
  const [chatOpen, setChatOpen] = useState(true);

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
    isStartingGame,
    currentWarning,
    gamePhase,
    currentRound,
    totalRounds,
    currentSong,
    choices,
    roundStartTime,
    myScore,
    myStreak,
    hasAnswered,
    selectedChoice,
    answerTrigger,
    startGameTrigger,
    roundEndData,
    gameEndData,
    availablePlaylists,
    playlistsLoading,
    handleJoinRoom,
    handleLeaveRoom,
    handleToggleReady,
    handleStartGame,
    resetStartingGame,
    handleSelectPlaylist,
    handleSpotifyLinkSubmit,
    handleCreateBlend,
    handleSettingsUpdate,
    handlePlaylistUpdate,
    handleUsersUpdate,
    setShowSettingsModal,
    setShowPlaylistModal,
    setShowPlaylistModalWithFetch,
    setSpotifyLink,
    setGameSettings,
    setSettingsTrigger,
    handleAnswer,
    handleRoundEnded,
    handleGameEnded,
    handlePlayAgain,
    resetToLobby,
    setRoundData,
    setGamePhase,
    setMyScore,
    setMyStreak,
    setScores,
    setHasAnswered,
    setSelectedChoice,
    setCurrentRound,
    setTotalRounds,
  } = useRoomState();

  const isGameActive = gamePhase === 'playing' || gamePhase === 'roundEnd' || gamePhase === 'gameEnd';

  if (isLoading) {
    return (
      <div className="h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
        <div className="text-center">
          <LoadingSpinner size="xl" className="text-green-500 mx-auto" />
          <p className="mt-4 text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

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
    <div className="h-screen flex flex-col bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Compact Header */}
      <header className="shrink-0 border-b border-gray-700/50 bg-gray-900/80 backdrop-blur-sm">
        <div className="px-3 sm:px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
              </svg>
            </div>
            <span className="text-lg font-bold text-white hidden sm:inline">Spotiguess</span>
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-800/50 rounded-lg border border-gray-700/50 ml-2">
              <span className="text-gray-400 text-xs">Room:</span>
              <span className="text-green-400 font-semibold text-sm">{effectiveRoomName}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Chat toggle button */}
            <button
              onClick={() => setChatOpen(!chatOpen)}
              className={`relative p-2 rounded-lg transition-all border ${
                chatOpen
                  ? "bg-green-500/20 border-green-500/30 text-green-400"
                  : "bg-gray-800/50 border-gray-700/50 text-gray-400 hover:text-white hover:bg-gray-700/50"
              }`}
              aria-label={chatOpen ? "Close chat" : "Open chat"}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              {!chatOpen && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              )}
            </button>

            <button
              onClick={handleLeaveRoom}
              className="px-3 py-1.5 bg-gray-700/50 text-gray-300 rounded-lg hover:bg-gray-600/50 transition-all border border-gray-600 text-sm"
            >
              Leave
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 min-h-0 flex overflow-hidden">
        {/* Game/Lobby Area */}
        <main className="flex-1 min-w-0 overflow-hidden">
          {isGameActive ? (
            /* Active Game - Full Width */
            <div className="h-full">
              {gamePhase === 'playing' && currentSong ? (
                <GameView
                  round={currentRound}
                  totalRounds={totalRounds}
                  song={currentSong}
                  choices={choices}
                  startTime={roundStartTime}
                  timePerRound={gameSettings.timePerRound * 1000}
                  audioTime={gameSettings.audioTime * 1000}
                  hasAnswered={hasAnswered}
                  selectedChoice={selectedChoice}
                  myScore={myScore}
                  myStreak={myStreak}
                  onAnswer={handleAnswer}
                />
              ) : gamePhase === 'roundEnd' && roundEndData ? (
                <RoundEndView
                  round={currentRound}
                  totalRounds={totalRounds}
                  correctAnswer={roundEndData.correctAnswer}
                  scores={roundEndData.scores}
                  myUserId={currentUser.userId}
                  onNextRound={() => {
                    setGamePhase('roundEnd');
                  }}
                />
              ) : gamePhase === 'gameEnd' && gameEndData ? (
                <GameEndView
                  finalScores={gameEndData.finalScores}
                  myUserId={currentUser.userId}
                  onPlayAgain={handlePlayAgain}
                  onBackToLobby={resetToLobby}
                />
              ) : null}
            </div>
          ) : (
            /* Lobby - With side padding */
            <div className="h-full overflow-y-auto p-3 sm:p-4 lg:p-6">
              <div className="max-w-3xl mx-auto">
                <RoomLobby
                  roomName={effectiveRoomName}
                  players={players}
                  selectedPlaylist={selectedPlaylist}
                  gameSettings={gameSettings}
                  isHost={isHost ?? false}
                  isReady={isReady}
                  canStartGame={canStartGame ?? false}
                  isStartingGame={isStartingGame}
                  currentWarning={currentWarning}
                  currentUser={currentUser}
                  onToggleReady={handleToggleReady}
                  onStartGame={handleStartGame}
                  onOpenSettings={() => setShowSettingsModal(true)}
                  onOpenPlaylist={setShowPlaylistModalWithFetch}
                />
              </div>
            </div>
          )}
        </main>

        {/* Chat Sidebar */}
        <aside
          className={`shrink-0 border-l border-gray-700/50 bg-gray-900/50 backdrop-blur-sm transition-all duration-300 ease-in-out overflow-hidden ${
            chatOpen ? "w-72 sm:w-80" : "w-0"
          }`}
        >
          <div className="w-72 sm:w-80 h-full">
            <Chat
              username={currentUser.username}
              room={effectiveRoomName}
              userId={currentUser.userId}
              userImage={user?.image || undefined}
              readyTrigger={readyTrigger}
              settingsTrigger={settingsTrigger}
              playlistTrigger={playlistTrigger}
              startGameTrigger={isHost ? startGameTrigger : undefined}
              answerTrigger={answerTrigger}
              onSettingsUpdate={handleSettingsUpdate}
              onPlaylistUpdate={handlePlaylistUpdate}
              onUsersUpdate={handleUsersUpdate}
              onStartGameError={resetStartingGame}
              onGameStarted={(totalRounds, timePerRound, audioTime) => {
                setGameSettings({ rounds: totalRounds, timePerRound: timePerRound / 1000, audioTime: audioTime / 1000 });
              }}
              onRoundStarted={(round, totalRounds, song, choices, startTime) => {
                setGamePhase('playing');
                setRoundData(round, totalRounds, song, choices, startTime);
              }}
              onRoundEnded={(round, correctAnswer, scores) => {
                handleRoundEnded(round, correctAnswer, scores);
              }}
              onGameEnded={(finalScores) => {
                handleGameEnded(finalScores);
              }}
              onAnswerResult={(isCorrect, points, streak) => {
                if (isCorrect) {
                  setMyScore(prev => prev + points);
                }
                setMyStreak(streak);
              }}
              onLeaderboardUpdate={(leaderboard) => {
                setScores(leaderboard);
              }}
              onGameStateReceived={(gameState) => {
                setGamePhase(gameState.gamePhase);
                
                if (gameState.gamePhase === 'playing') {
                  setRoundData(
                    gameState.currentRound,
                    gameState.totalRounds,
                    gameState.currentSong,
                    gameState.choices,
                    gameState.roundStartTime
                  );
                  setScores(gameState.scores);
                  setMyScore(gameState.myScore);
                  setMyStreak(gameState.myStreak);
                  
                  if (gameState.hasAnswered) {
                    setHasAnswered(true);
                    setSelectedChoice(gameState.selectedChoice);
                  }
                } else if (gameState.gamePhase === 'roundEnd') {
                  setCurrentRound(gameState.currentRound);
                  setTotalRounds(gameState.totalRounds);
                  setScores(gameState.scores);
                  setMyScore(gameState.myScore);
                  setMyStreak(gameState.myStreak);
                } else if (gameState.gamePhase === 'gameEnd') {
                  setCurrentRound(gameState.currentRound);
                  setTotalRounds(gameState.totalRounds);
                  setScores(gameState.scores);
                  setMyScore(gameState.myScore);
                  setMyStreak(gameState.myStreak);
                }
              }}
            />
          </div>
        </aside>
      </div>

      {/* Modals */}
      {showSettingsModal && (
        <SettingsModal
          rounds={gameSettings.rounds}
          timePerRound={gameSettings.timePerRound}
          audioTime={gameSettings.audioTime}
          isHost={isHost ?? false}
          onSave={(settings) => {
            setGameSettings(settings);
            setSettingsTrigger(settings);
            setShowSettingsModal(false);
          }}
          onClose={() => setShowSettingsModal(false)}
        />
      )}

      {showPlaylistModal && (
        <PlaylistModal
          selectedPlaylist={selectedPlaylist}
          availablePlaylists={availablePlaylists}
          isLoading={playlistsLoading}
          error={null}
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
