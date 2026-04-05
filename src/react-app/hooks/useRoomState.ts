import { useState, useCallback, useMemo, useRef } from "react";
import { useNavigate, useParams } from "react-router";
import { useAuth } from "../contexts/AuthContext";
import type { Player, Playlist, SongChoice, PlayerScore, GamePhase, OutgoingMessage, ChatMessage, GameStateMessage, UserJoinedMessage, UserLeftMessage, UsersUpdatedMessage, AnswerMessage } from "../../shared/types";
import { DEFAULT_ROOM_SETTINGS } from "../../shared/constants";
import { useGameSocket } from "./useGameSocket";

export type ChatBoxMessage = ChatMessage | UserJoinedMessage | UserLeftMessage;

export interface RoomState {
  currentUser: { username: string; userId: string } | null;
  showUsernamePrompt: boolean;
  players: Player[];
  selectedPlaylist: Playlist | null;
  isReady: boolean;
  showSettingsModal: boolean;
  showPlaylistModal: boolean;
  spotifyLink: string;
  gameSettings: { rounds: number; timePerRound: number; audioTime: number };
  isHost: boolean | undefined;
  canStartGame: boolean | null | undefined;
  isStartingGame: boolean;
  currentWarning: string | null;
  gamePhase: GamePhase;
  currentRound: number;
  totalRounds: number;
  currentSong: { previewUrl?: string; albumImageUrl?: string } | null;
  choices: SongChoice[];
  roundStartTime: number;
  roundEndTime: number;
  roundDuration: number;
  scores: PlayerScore[];
  myScore: number;
  myStreak: number;
  hasAnswered: boolean;
  selectedChoice: number | null;
  roundEndData: { correctAnswer: SongChoice; scores: PlayerScore[] } | null;
  gameEndData: { finalScores: PlayerScore[] } | null;
  availablePlaylists: Playlist[];
  playlistsLoading: boolean;
  isConnected: boolean;
  chatMessages: ChatBoxMessage[];
}

export interface RoomActions {
  handleJoinRoom: (username: string) => void;
  handleLeaveRoom: () => void;
  handleToggleReady: () => void;
  handleStartGame: () => void;
  handleSelectPlaylist: (playlist: Playlist) => void;
  handleSpotifyLinkSubmit: () => void;
  handleCreateBlend: () => void;
  handleSettingsUpdate: (settings: { rounds: number; timePerRound: number; audioTime: number }) => void;
  handleAnswer: (choiceIndex: number) => void;
  handlePlayAgain: () => void;
  handleSendMessage: (content: string) => void;
  setShowSettingsModal: (show: boolean) => void;
  setShowPlaylistModal: (show: boolean) => void;
  setShowPlaylistModalWithFetch: () => void;
  setSpotifyLink: (link: string) => void;
  resetToLobby: () => void;
}

function getInitialAuthState(isLoading: boolean, isAuthenticated: boolean, user: { name?: string; id?: string; image?: string | null } | null): {
  currentUser: { username: string; userId: string } | null;
  showUsernamePrompt: boolean;
} {
  if (isLoading) {
    return { currentUser: null, showUsernamePrompt: false };
  }

  if (isAuthenticated && user) {
    return {
      currentUser: { username: user.name?.trim() || "", userId: user.id || "" },
      showUsernamePrompt: false,
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
    };
  }

  return { currentUser: null, showUsernamePrompt: true };
}

export function useRoomState(): RoomState & RoomActions {
  const navigate = useNavigate();
  const { roomName } = useParams<{ roomName: string }>();
  const effectiveRoomName = roomName || "general";
  const { user, isAuthenticated, isLoading } = useAuth();

  const initialAuth = getInitialAuthState(isLoading, isAuthenticated, user);
  const [currentUser, setCurrentUser] = useState<{ username: string; userId: string } | null>(initialAuth.currentUser);
  const [showUsernamePrompt, setShowUsernamePrompt] = useState(initialAuth.showUsernamePrompt);
  
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [spotifyLink, setSpotifyLink] = useState("");
  const [availablePlaylists, setAvailablePlaylists] = useState<Playlist[]>([]);
  const [playlistsLoading, setPlaylistsLoading] = useState(true);
  const [gameSettings, setGameSettings] = useState({
    rounds: DEFAULT_ROOM_SETTINGS.rounds,
    timePerRound: DEFAULT_ROOM_SETTINGS.timePerRound / 1000,
    audioTime: DEFAULT_ROOM_SETTINGS.audioTime / 1000,
  });
  const [gamePhase, setGamePhase] = useState<GamePhase>('lobby');
  const [currentRound, setCurrentRound] = useState(0);
  const [totalRounds, setTotalRounds] = useState(0);
  const [currentSong, setCurrentSong] = useState<{ previewUrl?: string; albumImageUrl?: string } | null>(null);
  const [choices, setChoices] = useState<SongChoice[]>([]);
  const [roundStartTime, setRoundStartTime] = useState(0);
  const [roundEndTime, setRoundEndTime] = useState(0);
  const [roundDuration, setRoundDuration] = useState(0);
  const [scores, setScores] = useState<PlayerScore[]>([]);
  const [myScore, setMyScore] = useState(0);
  const [myStreak, setMyStreak] = useState(0);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [selectedChoice, setSelectedChoice] = useState<number | null>(null);
  const [roundEndData, setRoundEndData] = useState<{ correctAnswer: SongChoice; scores: PlayerScore[] } | null>(null);
  const [gameEndData, setGameEndData] = useState<{ finalScores: PlayerScore[] } | null>(null);
  const [isStartingGame, setIsStartingGame] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatBoxMessage[]>([]);
  
  const fetchedPlaylistsRef = useRef(false);

  const onMessage = useCallback((message: OutgoingMessage) => {
    console.log('[useRoomState] Received message:', message.type, message);
    
    switch (message.type) {
      case "user_joined":
      case "user_left":
      case "users_updated": {
        const usersMsg = message as UserJoinedMessage | UserLeftMessage | UsersUpdatedMessage;
        const users = usersMsg.users || [];
        setPlayers(users.map(u => ({
          userId: u.userId,
          username: u.username,
          userImage: u.userImage,
          isReady: u.isReady,
          isHost: u.isHost,
        })));
        
        if (message.type === "user_joined" || message.type === "user_left") {
          setChatMessages(prev => [...prev, message as UserJoinedMessage | UserLeftMessage].slice(-200));
        }
        break;
      }
      
      case "settings_updated":
        if (message.settings) {
          setGameSettings({
            rounds: message.settings.rounds,
            timePerRound: message.settings.timePerRound / 1000,
            audioTime: message.settings.audioTime / 1000,
          });
        }
        break;
        
      case "playlist_updated":
        if (message.playlist) {
          setSelectedPlaylist(message.playlist);
        }
        break;
        
      case "game_started":
        setIsStartingGame(true);
        setGameSettings({
          rounds: message.totalRounds,
          timePerRound: message.timePerRound / 1000,
          audioTime: message.audioTime / 1000,
        });
        break;
        
      case "round_started":
        setGamePhase('playing');
        setIsStartingGame(false);
        setCurrentRound(message.round);
        setTotalRounds(message.totalRounds);
        setCurrentSong({
          previewUrl: message.song.previewUrl,
          albumImageUrl: message.song.albumImageUrl,
        });
        setChoices(message.choices);
        setRoundStartTime(message.startTime);
        setRoundEndTime(message.endTime);
        setRoundDuration(message.duration);
        setHasAnswered(false);
        setSelectedChoice(null);
        setRoundEndData(null);
        setGameEndData(null);
        break;
        
      case "round_ended":
        setRoundEndData({ correctAnswer: message.correctAnswer, scores: message.scores });
        setScores(message.scores);
        setGamePhase('roundEnd');
        break;
        
      case "game_ended":
        setGameEndData({ finalScores: message.finalScores });
        setScores(message.finalScores);
        setGamePhase('gameEnd');
        break;
        
      case "answer_result":
        if (message.isCorrect) {
          setMyScore(prev => prev + message.points);
        }
        setMyStreak(message.streak);
        break;
        
      case "leaderboard_update":
        setScores(message.leaderboard);
        break;
        
      case "game_state": {
        const state = message as GameStateMessage;
        setGamePhase(state.gamePhase);
        setCurrentRound(state.currentRound);
        setTotalRounds(state.totalRounds);
        setScores(state.scores);
        setMyScore(state.myScore);
        setMyStreak(state.myStreak);
        
        if (state.gamePhase === 'playing') {
          setCurrentSong(state.currentSong);
          setChoices(state.choices);
          setRoundStartTime(state.roundStartTime);
          setRoundEndTime(state.roundEndTime);
          setRoundDuration(state.duration);
          if (state.hasAnswered) {
            setHasAnswered(true);
            setSelectedChoice(state.selectedChoice);
          }
        }
        break;
      }
      
      case "room_state":
        if (message.settings) {
          setGameSettings({
            rounds: message.settings.rounds,
            timePerRound: message.settings.timePerRound / 1000,
            audioTime: message.settings.audioTime / 1000,
          });
        }
        if (message.playlist) {
          setSelectedPlaylist(message.playlist);
        }
        break;
        
      case "message":
      case "chat_message":
        setChatMessages(prev => [...prev, message as ChatMessage].slice(-200));
        break;
        
      case "error":
        console.error("Server error:", message.content);
        setIsStartingGame(false);
        break;
    }
  }, []);

  const { isConnected, send } = useGameSocket({
    username: currentUser?.username || "",
    room: effectiveRoomName,
    userId: currentUser?.userId || "",
    userImage: user?.image || undefined,
    onMessage,
  });

  const handleJoinRoom = useCallback((username: string) => {
    sessionStorage.setItem("chat-username", username);
    let userId = sessionStorage.getItem("chat-userId");
    if (!userId) {
      userId = `user-${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem("chat-userId", userId);
    }
    setCurrentUser({ username, userId });
    setShowUsernamePrompt(false);

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
    const nextReady = !isReady;
    setIsReady(nextReady);
    send({ type: "ready" });
  }, [isReady, send]);

  const handleStartGame = useCallback(() => {
    setIsStartingGame(true);
    send({ type: "start_game" });
  }, [send]);

  const handleSettingsUpdate = useCallback((settings: { rounds: number; timePerRound: number; audioTime: number }) => {
    send({
      type: "update_settings",
      payload: {
        rounds: settings.rounds,
        timePerRound: settings.timePerRound * 1000,
        audioTime: settings.audioTime * 1000,
      }
    });
  }, [send]);

  const handleSelectPlaylist = useCallback((playlist: Playlist) => {
    setSelectedPlaylist(playlist);
    send({
      type: "update_playlist",
      payload: { playlist }
    });
    setShowPlaylistModal(false);
  }, [send]);

  const handleAnswer = useCallback((choiceIndex: number) => {
    if (hasAnswered) return;
    setSelectedChoice(choiceIndex);
    setHasAnswered(true);
    send({
      type: "answer",
      choiceIndex,
    } as AnswerMessage);
  }, [hasAnswered, send]);

  const handleSendMessage = useCallback((content: string) => {
    send({
      type: "message",
      content,
    } as ChatMessage);
  }, [send]);

  const handlePlayAgain = useCallback(() => {
    send({ type: "start_game" });
  }, [send]);

  const resetToLobby = useCallback(() => {
    setGamePhase('lobby');
    setCurrentRound(0);
    setTotalRounds(0);
    setCurrentSong(null);
    setChoices([]);
    setRoundStartTime(0);
    setRoundEndTime(0);
    setRoundDuration(0);
    setScores([]);
    setMyScore(0);
    setMyStreak(0);
    setHasAnswered(false);
    setSelectedChoice(null);
    setRoundEndData(null);
    setGameEndData(null);
    setIsStartingGame(false);
  }, []);

  const handleOpenPlaylistModal = useCallback(() => {
    if (availablePlaylists.length === 0 && !fetchedPlaylistsRef.current) {
      fetchedPlaylistsRef.current = true;
      setPlaylistsLoading(true);
      fetch("/api/playlists")
        .then((res) => res.json())
        .then((data) => {
          if (data.playlists) {
            setAvailablePlaylists(data.playlists);
          }
          setPlaylistsLoading(false);
        })
        .catch(() => {
          setPlaylistsLoading(false);
        });
    }
    setShowPlaylistModal(true);
  }, [availablePlaylists.length]);

  const handleSpotifyLinkSubmit = useCallback(async () => {
    if (!spotifyLink.trim()) return;
    
    try {
      const response = await fetch("/api/playlists/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ link: spotifyLink }),
      });
      
      const data = await response.json();
      if (response.ok && data.playlist) {
        handleSelectPlaylist(data.playlist);
      }
    } catch (error) {
      console.error("Error importing playlist:", error);
    }
    
    setSpotifyLink("");
    setShowPlaylistModal(false);
  }, [spotifyLink, handleSelectPlaylist]);

  const handleCreateBlend = useCallback(() => {
    console.log("Creating blend from players");
    setShowPlaylistModal(false);
  }, []);

  const isHost = useMemo(
    () => players.find((p) => p.userId === currentUser?.userId)?.isHost,
    [players, currentUser?.userId]
  );

  const { allNonHostPlayersReady, currentWarning } = useMemo(() => {
    const nonHostPlayers = players.filter((p) => !p.isHost);
    const hasNonHostPlayers = nonHostPlayers.length > 0;
    const allReady = !hasNonHostPlayers || nonHostPlayers.every((p) => p.isReady);

    let warning: string | null = null;
    if (!selectedPlaylist) {
      warning = "Please select a playlist to start";
    } else if (!allReady) {
      warning = "Waiting for all players to be ready";
    }

    return { allNonHostPlayersReady: allReady, currentWarning: warning };
  }, [players, selectedPlaylist]);

  const canStartGame = isHost && players.length >= 1 && selectedPlaylist && allNonHostPlayersReady;

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
    roundEndTime,
    roundDuration,
    scores,
    myScore,
    myStreak,
    hasAnswered,
    selectedChoice,
    roundEndData,
    gameEndData,
    availablePlaylists,
    playlistsLoading,
    isConnected,
    chatMessages,
    // Actions
    handleJoinRoom,
    handleLeaveRoom,
    handleToggleReady,
    handleStartGame,
    handleSelectPlaylist,
    handleSpotifyLinkSubmit,
    handleCreateBlend,
    handleSettingsUpdate,
    handleAnswer,
    handlePlayAgain,
    handleSendMessage,
    setShowSettingsModal,
    setShowPlaylistModal,
    setShowPlaylistModalWithFetch: handleOpenPlaylistModal,
    setSpotifyLink,
    resetToLobby,
  };
}
