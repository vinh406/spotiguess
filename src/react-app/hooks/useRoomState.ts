import { useState, useCallback, useMemo } from "react";
import { useNavigate, useParams } from "react-router";
import { useAuth } from "../contexts/AuthContext";
import type { Player, Playlist, UserSession, SongChoice, PlayerScore, GamePhase } from "../../shared/types";
import { DEFAULT_ROOM_SETTINGS } from "../../shared/constants";

export interface RoomState {
  currentUser: { username: string; userId: string } | null;
  showUsernamePrompt: boolean;
  players: Player[];
  selectedPlaylist: Playlist | null;
  isReady: boolean;
  showSettingsModal: boolean;
  showPlaylistModal: boolean;
  spotifyLink: string;
  readyTrigger: number;
  settingsTrigger: { rounds: number; timePerRound: number } | null;
  playlistTrigger: Playlist | null;
  gameSettings: { rounds: number; timePerRound: number };
  isHost: boolean | undefined;
  canStartGame: boolean | null | undefined;
  currentWarning: string | null;
  gamePhase: GamePhase;
  currentRound: number;
  totalRounds: number;
  currentSong: { previewUrl?: string; albumImageUrl?: string } | null;
  choices: SongChoice[];
  roundStartTime: number;
  scores: PlayerScore[];
  myScore: number;
  myStreak: number;
  hasAnswered: boolean;
  selectedChoice: number | null;
  startGameTrigger: number;
  answerTrigger: { choiceIndex: number; timestamp: number } | null;
  roundEndData: { correctAnswer: SongChoice; scores: PlayerScore[] } | null;
  gameEndData: { finalScores: PlayerScore[] } | null;
}

export interface RoomActions {
  handleJoinRoom: (username: string) => void;
  handleLeaveRoom: () => void;
  handleToggleReady: () => void;
  handleStartGame: () => void;
  handleSelectPlaylist: (playlist: Playlist) => void;
  handleSpotifyLinkSubmit: () => void;
  handleCreateBlend: () => void;
  handleSettingsUpdate: (settings: { rounds: number; timePerRound: number }) => void;
  handlePlaylistUpdate: (playlist: { id: string; name: string; description?: string; trackCount: number; imageUrl?: string }) => void;
  handleUsersUpdate: (users: UserSession[]) => Player[];
  setShowSettingsModal: (show: boolean) => void;
  setShowPlaylistModal: (show: boolean) => void;
  setSpotifyLink: (link: string) => void;
  setGameSettings: React.Dispatch<React.SetStateAction<{ rounds: number; timePerRound: number }>>;
  setSettingsTrigger: (trigger: { rounds: number; timePerRound: number } | null) => void;
  setGamePhase: (phase: GamePhase) => void;
  setRoundData: (round: number, totalRounds: number, song: { previewUrl?: string; albumImageUrl?: string }, choices: SongChoice[], startTime: number) => void;
  setScores: (scores: PlayerScore[]) => void;
  resetToLobby: () => void;
  setStartGameTrigger: React.Dispatch<React.SetStateAction<number>>;
  setAnswerTrigger: React.Dispatch<React.SetStateAction<{ choiceIndex: number; timestamp: number } | null>>;
  setMyScore: React.Dispatch<React.SetStateAction<number>>;
  setMyStreak: React.Dispatch<React.SetStateAction<number>>;
  setHasAnswered: React.Dispatch<React.SetStateAction<boolean>>;
  setSelectedChoice: React.Dispatch<React.SetStateAction<number | null>>;
  setCurrentRound: React.Dispatch<React.SetStateAction<number>>;
  setTotalRounds: React.Dispatch<React.SetStateAction<number>>;
  handleAnswer: (choiceIndex: number) => void;
  handleRoundEnded: (round: number, correctAnswer: SongChoice, scores: PlayerScore[]) => void;
  handleGameEnded: (finalScores: PlayerScore[]) => void;
  handlePlayAgain: () => void;
}

// Helper function to compute initial auth state based on auth and sessionStorage
function getInitialAuthState(isLoading: boolean, isAuthenticated: boolean, user: { name?: string; id?: string; image?: string | null } | null): {
  currentUser: { username: string; userId: string } | null;
  showUsernamePrompt: boolean;
  players: Player[];
} {
  if (isLoading) {
    return { currentUser: null, showUsernamePrompt: false, players: [] };
  }

  if (isAuthenticated && user) {
    const displayName = user.name?.trim() || "";
    return {
      currentUser: { username: displayName, userId: user.id || "" },
      showUsernamePrompt: false,
      players: [{
        userId: user.id || "",
        username: displayName,
        userImage: user.image || null,
        isReady: false,
        isHost: false,
      }],
    };
  }

  const storedUsername = sessionStorage.getItem("chat-username");
  const storedUserId = sessionStorage.getItem("chat-userId");
  if (storedUsername) {
    const userId = storedUserId || `user-${Math.random().toString(36).substr(2, 9)}`;
    if (!storedUserId) {
      sessionStorage.setItem("chat-userId", userId);
    }
    return {
      currentUser: { username: storedUsername, userId },
      showUsernamePrompt: false,
      players: [{ userId, username: storedUsername, userImage: null, isReady: false, isHost: false }],
    };
  }

  return { currentUser: null, showUsernamePrompt: true, players: [] };
}

export function useRoomState(): RoomState & RoomActions {
  const navigate = useNavigate();
  const { roomName } = useParams<{ roomName: string }>();
  const { user, isAuthenticated, isLoading } = useAuth();

  const initialAuthState = getInitialAuthState(isLoading, isAuthenticated, user);

  const [currentUser, setCurrentUser] = useState<{ username: string; userId: string } | null>(initialAuthState.currentUser);
  const [showUsernamePrompt, setShowUsernamePrompt] = useState(initialAuthState.showUsernamePrompt);
  const [players, setPlayers] = useState<Player[]>(initialAuthState.players);
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [spotifyLink, setSpotifyLink] = useState("");
  const [readyTrigger, setReadyTrigger] = useState(0);
  const [settingsTrigger, setSettingsTrigger] = useState<{ rounds: number; timePerRound: number } | null>(null);
  const [playlistTrigger, setPlaylistTrigger] = useState<Playlist | null>(null);
  const [gameSettings, setGameSettings] = useState({
    rounds: DEFAULT_ROOM_SETTINGS.rounds,
    timePerRound: DEFAULT_ROOM_SETTINGS.timePerRound / 1000,
  });
  const [gamePhase, setGamePhase] = useState<GamePhase>('lobby');
  const [currentRound, setCurrentRound] = useState(0);
  const [totalRounds, setTotalRounds] = useState(0);
  const [currentSong, setCurrentSong] = useState<{ previewUrl?: string; albumImageUrl?: string } | null>(null);
  const [choices, setChoices] = useState<SongChoice[]>([]);
  const [roundStartTime, setRoundStartTime] = useState(0);
  const [scores, setScores] = useState<PlayerScore[]>([]);
  const [myScore, setMyScore] = useState(0);
  const [myStreak, setMyStreak] = useState(0);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [selectedChoice, setSelectedChoice] = useState<number | null>(null);
  const [startGameTrigger, setStartGameTrigger] = useState(0);
  const [answerTrigger, setAnswerTrigger] = useState<{ choiceIndex: number; timestamp: number } | null>(null);
  const [roundEndData, setRoundEndData] = useState<{ correctAnswer: SongChoice; scores: PlayerScore[] } | null>(null);
  const [gameEndData, setGameEndData] = useState<{ finalScores: PlayerScore[] } | null>(null);

  const handleJoinRoom = useCallback((username: string) => {
    sessionStorage.setItem("chat-username", username);
    let userId = sessionStorage.getItem("chat-userId");
    if (!userId) {
      userId = `user-${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem("chat-userId", userId);
    }
    setCurrentUser({ username, userId });
    setShowUsernamePrompt(false);
    // Don't set isHost here - wait for server response
    setPlayers([{ userId, username, userImage: null, isReady: false, isHost: false }]);

    if (roomName !== username) {
      navigate(`/room/${encodeURIComponent(roomName || "general")}`);
    }
  }, [navigate, roomName]);

  const handleLeaveRoom = useCallback(() => {
    sessionStorage.removeItem("chat-username");
    setCurrentUser(null);
    navigate("/");
  }, [navigate]);

  const handleToggleReady = useCallback(() => {
    setIsReady((prev) => !prev);
    setReadyTrigger((prev) => prev + 1);
  }, []);

  const handleSettingsUpdate = useCallback((settings: { rounds: number; timePerRound: number }) => {
    console.log('[RoomPage] Received settings update from server:', settings);
    setGameSettings({
      rounds: settings.rounds,
      timePerRound: settings.timePerRound / 1000,
    });
  }, []);

  const handlePlaylistUpdate = useCallback((playlist: { id: string; name: string; description?: string; trackCount: number; imageUrl?: string }) => {
    console.log('[RoomPage] Received playlist update from server:', playlist);
    setSelectedPlaylist({
      id: playlist.id,
      name: playlist.name,
      description: playlist.description || '',
      trackCount: playlist.trackCount,
      imageUrl: playlist.imageUrl || '',
    });
  }, []);

  const handleStartGame = useCallback(() => {
    setStartGameTrigger(prev => prev + 1);
  }, []);

  const setRoundData = useCallback((round: number, totalRounds: number, song: { previewUrl?: string; albumImageUrl?: string }, choices: SongChoice[], startTime: number) => {
    setCurrentRound(round);
    setTotalRounds(totalRounds);
    setCurrentSong(song);
    setChoices(choices);
    setRoundStartTime(startTime);
    setHasAnswered(false);
    setSelectedChoice(null);
    setRoundEndData(null);
    setGameEndData(null);
  }, []);

  const resetToLobby = useCallback(() => {
    setGamePhase('lobby');
    setCurrentRound(0);
    setTotalRounds(0);
    setCurrentSong(null);
    setChoices([]);
    setRoundStartTime(0);
    setScores([]);
    setMyScore(0);
    setMyStreak(0);
    setHasAnswered(false);
    setSelectedChoice(null);
    setRoundEndData(null);
    setGameEndData(null);
  }, []);

  const handleSelectPlaylist = useCallback((playlist: Playlist) => {
    setSelectedPlaylist(playlist);
    const isHost = players.find((p) => p.userId === currentUser?.userId)?.isHost;
    if (isHost) {
      setPlaylistTrigger(playlist);
    }
    setShowPlaylistModal(false);
  }, [players, currentUser]);

  const handleSpotifyLinkSubmit = useCallback(() => {
    console.log("Spotify link submitted:", spotifyLink);
    setSpotifyLink("");
    setShowPlaylistModal(false);
  }, [spotifyLink]);

  const handleCreateBlend = useCallback(() => {
    console.log("Creating blend from players");
    setShowPlaylistModal(false);
  }, []);

  const handleUsersUpdate = useCallback((users: UserSession[]): Player[] => {
    const newPlayers = users.map((u) => ({
      userId: u.userId,
      username: u.username,
      userImage: u.userImage,
      isReady: u.isReady,
      isHost: u.isHost,
    }));
    setPlayers(newPlayers);
    return newPlayers;
  }, []);

  const handleAnswer = useCallback((choiceIndex: number) => {
    if (hasAnswered) return;
    setSelectedChoice(choiceIndex);
    setHasAnswered(true);
    setAnswerTrigger({ choiceIndex, timestamp: Date.now() });
  }, [hasAnswered]);

  const handleRoundEnded = useCallback((_round: number, correctAnswer: SongChoice, scores: PlayerScore[]) => {
    setRoundEndData({ correctAnswer, scores });
    setScores(scores);
    setGamePhase('roundEnd');
  }, []);

  const handleGameEnded = useCallback((finalScores: PlayerScore[]) => {
    setGameEndData({ finalScores });
    setScores(finalScores);
    setGamePhase('gameEnd');
  }, []);

  const handlePlayAgain = useCallback(() => {
    setStartGameTrigger(prev => prev + 1);
    // Don't set gamePhase here — wait for server's round_started message
    // to drive the phase change via onRoundStarted callback
  }, []);

  // Computed values
  const isHost = useMemo(
    () => players.find((p) => p.userId === currentUser?.userId)?.isHost,
    [players, currentUser?.userId]
  );

  const { allNonHostPlayersReady, currentWarning } = useMemo(() => {
    const nonHostPlayers = players.filter((p) => !p.isHost);
    const allReady = nonHostPlayers.length > 0 && nonHostPlayers.every((p) => p.isReady);

    let warning: string | null = null;
    if (players.length < 2) {
      warning = "Need at least 2 players to start";
    } else if (!selectedPlaylist) {
      warning = "Please select a playlist to start";
    } else if (!allReady) {
      warning = "Waiting for all players to be ready";
    }

    return { allNonHostPlayersReady: allReady, currentWarning: warning };
  }, [players, selectedPlaylist]);

  const canStartGame = isHost && players.length >= 2 && selectedPlaylist && allNonHostPlayersReady;

  return {
    // State
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
    gamePhase,
    currentRound,
    totalRounds,
    currentSong,
    choices,
    roundStartTime,
    scores,
    myScore,
    myStreak,
    hasAnswered,
    selectedChoice,
    startGameTrigger,
    answerTrigger,
    roundEndData,
    gameEndData,
    // Actions
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
    setGamePhase,
    setRoundData,
    setScores,
    resetToLobby,
    setStartGameTrigger,
    setAnswerTrigger,
    setMyScore,
    setMyStreak,
    setHasAnswered,
    setSelectedChoice,
    setCurrentRound,
    setTotalRounds,
    handleAnswer,
    handleRoundEnded,
    handleGameEnded,
    handlePlayAgain,
  };
}
