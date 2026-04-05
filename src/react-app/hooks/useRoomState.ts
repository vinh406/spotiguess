import { useReducer, useCallback, useMemo, useRef, useEffect } from "react";
import { useNavigate, useParams } from "react-router";
import { useAuth } from "../contexts/AuthContext";
import type { 
  Player, Playlist, SongChoice, PlayerScore, GamePhase, 
  OutgoingMessage, ChatMessage, UserJoinedMessage, UserLeftMessage, 
  UsersUpdatedMessage, AnswerMessage, UnifiedRoomState, 
  UserSession, RoomSettings, UnifiedRoomStateMessage
} from "../../shared/types";
import { DEFAULT_ROOM_SETTINGS } from "../../shared/constants";
import { useGameSocket } from "./useGameSocket";

export type ChatBoxMessage = ChatMessage | UserJoinedMessage | UserLeftMessage;

export interface RoomState {
  metadata: {
    roomName: string;
    players: Player[];
    selectedPlaylist: Playlist | null;
    gameSettings: { rounds: number; timePerRound: number; audioTime: number };
    isHost: boolean;
    isReady: boolean;
  };
  game: {
    phase: GamePhase;
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
  };
  ui: {
    currentUser: { username: string; userId: string } | null;
    showUsernamePrompt: boolean;
    showSettingsModal: boolean;
    showPlaylistModal: boolean;
    spotifyLink: string;
    availablePlaylists: Playlist[];
    playlistsLoading: boolean;
    isStartingGame: boolean;
    chatMessages: ChatBoxMessage[];
    isConnected: boolean;
  };
}

type RoomAction =
  | { type: 'SYNC_UNIFIED_STATE'; state: UnifiedRoomState; currentUserId: string }
  | { type: 'UPDATE_PLAYERS'; users: UserSession[]; currentUserId: string }
  | { type: 'CHAT_MESSAGE'; message: ChatBoxMessage }
  | { type: 'SETTINGS_UPDATED'; settings: RoomSettings }
  | { type: 'PLAYLIST_UPDATED'; playlist: Playlist }
  | { type: 'GAME_STARTED'; totalRounds: number; timePerRound: number; audioTime: number }
  | { type: 'ROUND_STARTED'; round: number; totalRounds: number; song: { previewUrl?: string; albumImageUrl?: string }; choices: SongChoice[]; startTime: number; endTime: number; duration: number }
  | { type: 'ROUND_ENDED'; round: number; correctAnswer: SongChoice; scores: PlayerScore[] }
  | { type: 'GAME_ENDED'; finalScores: PlayerScore[] }
  | { type: 'ANSWER_RESULT'; isCorrect: boolean; points: number; streak: number }
  | { type: 'LEADERBOARD_UPDATE'; leaderboard: PlayerScore[] }
  | { type: 'SET_CONNECTED'; connected: boolean }
  | { type: 'SET_USER'; user: { username: string; userId: string } | null }
  | { type: 'SET_SHOW_USERNAME_PROMPT'; show: boolean }
  | { type: 'SET_SHOW_SETTINGS_MODAL'; show: boolean }
  | { type: 'SET_SHOW_PLAYLIST_MODAL'; show: boolean }
  | { type: 'SET_SPOTIFY_LINK'; link: string }
  | { type: 'SET_AVAILABLE_PLAYLISTS'; playlists: Playlist[] }
  | { type: 'SET_PLAYLISTS_LOADING'; loading: boolean }
  | { type: 'LOCAL_ANSWER'; choiceIndex: number }
  | { type: 'TOGGLE_READY' }
  | { type: 'RESET_TO_LOBBY' };

function roomReducer(state: RoomState, action: RoomAction): RoomState {
  switch (action.type) {
    case 'SYNC_UNIFIED_STATE': {
      const { state: unified, currentUserId } = action;
      const myPlayer = unified.users.find(u => u.userId === currentUserId);
      const myScoreObj = unified.game.scores[currentUserId];
      const myAnswer = unified.game.answers[currentUserId];
      
      return {
        ...state,
        metadata: {
          ...state.metadata,
          roomName: unified.room,
          players: unified.users.map(u => ({
            userId: u.userId,
            username: u.username,
            userImage: u.userImage,
            isReady: u.isReady,
            isHost: u.isHost,
          })),
          selectedPlaylist: unified.playlist,
          gameSettings: {
            rounds: unified.settings.rounds,
            timePerRound: unified.settings.timePerRound / 1000,
            audioTime: unified.settings.audioTime / 1000,
          },
          isHost: myPlayer?.isHost ?? false,
          isReady: myPlayer?.isReady ?? false,
        },
        game: {
          ...state.game,
          phase: unified.game.phase,
          currentRound: unified.game.currentRound,
          totalRounds: unified.game.totalRounds,
          currentSong: unified.game.choices.length > 0 ? {
              previewUrl: unified.game.songs[unified.game.currentSongIndex]?.previewUrl,
              albumImageUrl: unified.game.songs[unified.game.currentSongIndex]?.albumImageUrl,
          } : null,
          choices: unified.game.choices,
          roundStartTime: unified.game.roundStartTime,
          roundEndTime: unified.game.roundEndTime,
          roundDuration: unified.game.roundDuration,
          scores: Object.values(unified.game.scores).sort((a, b) => b.score - a.score),
          myScore: myScoreObj?.score ?? 0,
          myStreak: myScoreObj?.streak ?? 0,
          hasAnswered: !!myAnswer,
          selectedChoice: myAnswer?.choiceIndex ?? null,
        }
      };
    }

    case 'UPDATE_PLAYERS': {
      const myPlayer = action.users.find(u => u.userId === action.currentUserId);
      return {
        ...state,
        metadata: {
          ...state.metadata,
          players: action.users.map(u => ({
            userId: u.userId,
            username: u.username,
            userImage: u.userImage,
            isReady: u.isReady,
            isHost: u.isHost,
          })),
          isHost: myPlayer?.isHost ?? state.metadata.isHost,
          isReady: myPlayer?.isReady ?? state.metadata.isReady,
        }
      };
    }

    case 'CHAT_MESSAGE':
      return {
        ...state,
        ui: {
          ...state.ui,
          chatMessages: [...state.ui.chatMessages, action.message].slice(-200)
        }
      };

    case 'SETTINGS_UPDATED':
      return {
        ...state,
        metadata: {
          ...state.metadata,
          gameSettings: {
            rounds: action.settings.rounds,
            timePerRound: action.settings.timePerRound / 1000,
            audioTime: action.settings.audioTime / 1000,
          }
        }
      };

    case 'PLAYLIST_UPDATED':
      return {
        ...state,
        metadata: {
          ...state.metadata,
          selectedPlaylist: action.playlist
        }
      };

    case 'GAME_STARTED':
      return {
        ...state,
        ui: { ...state.ui, isStartingGame: true },
        metadata: {
            ...state.metadata,
            gameSettings: {
                rounds: action.totalRounds,
                timePerRound: action.timePerRound / 1000,
                audioTime: action.audioTime / 1000,
            }
        }
      };

    case 'ROUND_STARTED':
      return {
        ...state,
        ui: { ...state.ui, isStartingGame: false },
        game: {
          ...state.game,
          phase: 'playing',
          currentRound: action.round,
          totalRounds: action.totalRounds,
          currentSong: action.song,
          choices: action.choices,
          roundStartTime: action.startTime,
          roundEndTime: action.endTime,
          roundDuration: action.duration,
          hasAnswered: false,
          selectedChoice: null,
          roundEndData: null,
          gameEndData: null,
        }
      };

    case 'ROUND_ENDED':
      return {
        ...state,
        game: {
          ...state.game,
          phase: 'roundEnd',
          roundEndData: { correctAnswer: action.correctAnswer, scores: action.scores },
          scores: action.scores,
        }
      };

    case 'GAME_ENDED':
      return {
        ...state,
        game: {
          ...state.game,
          phase: 'gameEnd',
          gameEndData: { finalScores: action.finalScores },
          scores: action.finalScores,
        }
      };

    case 'ANSWER_RESULT':
      return {
        ...state,
        game: {
          ...state.game,
          myScore: action.isCorrect ? state.game.myScore + action.points : state.game.myScore,
          myStreak: action.streak,
        }
      };

    case 'LEADERBOARD_UPDATE':
      return {
        ...state,
        game: { ...state.game, scores: action.leaderboard }
      };

    case 'SET_CONNECTED':
      return { ...state, ui: { ...state.ui, isConnected: action.connected } };

    case 'SET_USER':
      return { ...state, ui: { ...state.ui, currentUser: action.user } };

    case 'SET_SHOW_USERNAME_PROMPT':
      return { ...state, ui: { ...state.ui, showUsernamePrompt: action.show } };

    case 'SET_SHOW_SETTINGS_MODAL':
      return { ...state, ui: { ...state.ui, showSettingsModal: action.show } };

    case 'SET_SHOW_PLAYLIST_MODAL':
      return { ...state, ui: { ...state.ui, showPlaylistModal: action.show } };

    case 'SET_SPOTIFY_LINK':
      return { ...state, ui: { ...state.ui, spotifyLink: action.link } };

    case 'SET_AVAILABLE_PLAYLISTS':
      return { ...state, ui: { ...state.ui, availablePlaylists: action.playlists } };

    case 'SET_PLAYLISTS_LOADING':
      return { ...state, ui: { ...state.ui, playlistsLoading: action.loading } };

    case 'LOCAL_ANSWER':
      return {
        ...state,
        game: {
          ...state.game,
          hasAnswered: true,
          selectedChoice: action.choiceIndex,
        }
      };

    case 'TOGGLE_READY':
      return {
        ...state,
        metadata: { ...state.metadata, isReady: !state.metadata.isReady }
      };

    case 'RESET_TO_LOBBY':
      return {
        ...state,
        ui: { ...state.ui, isStartingGame: false },
        game: {
          ...state.game,
          phase: 'lobby',
          currentRound: 0,
          totalRounds: 0,
          currentSong: null,
          choices: [],
          roundStartTime: 0,
          roundEndTime: 0,
          roundDuration: 0,
          scores: [],
          myScore: 0,
          myStreak: 0,
          hasAnswered: false,
          selectedChoice: null,
          roundEndData: null,
          gameEndData: null,
        }
      };

    default:
      return state;
  }
}

const initialState: RoomState = {
  metadata: {
    roomName: "",
    players: [],
    selectedPlaylist: null,
    gameSettings: {
      rounds: DEFAULT_ROOM_SETTINGS.rounds,
      timePerRound: DEFAULT_ROOM_SETTINGS.timePerRound / 1000,
      audioTime: DEFAULT_ROOM_SETTINGS.audioTime / 1000,
    },
    isHost: false,
    isReady: false,
  },
  game: {
    phase: 'lobby',
    currentRound: 0,
    totalRounds: 0,
    currentSong: null,
    choices: [],
    roundStartTime: 0,
    roundEndTime: 0,
    roundDuration: 0,
    scores: [],
    myScore: 0,
    myStreak: 0,
    hasAnswered: false,
    selectedChoice: null,
    roundEndData: null,
    gameEndData: null,
  },
  ui: {
    currentUser: null,
    showUsernamePrompt: true,
    showSettingsModal: false,
    showPlaylistModal: false,
    spotifyLink: "",
    availablePlaylists: [],
    playlistsLoading: true,
    isStartingGame: false,
    chatMessages: [],
    isConnected: false,
  }
};

export function useRoomState() {
  const navigate = useNavigate();
  const { roomName } = useParams<{ roomName: string }>();
  const effectiveRoomName = roomName || "general";
  const { user, isAuthenticated, isLoading } = useAuth();

  const [state, dispatch] = useReducer(roomReducer, {
      ...initialState,
      metadata: { ...initialState.metadata, roomName: effectiveRoomName }
  });

  const fetchedPlaylistsRef = useRef(false);

  // Initialize auth state
  useEffect(() => {
    if (isLoading) return;

    if (isAuthenticated && user) {
      dispatch({ 
        type: 'SET_USER', 
        user: { username: user.name?.trim() || "", userId: user.id || "" } 
      });
      dispatch({ type: 'SET_SHOW_USERNAME_PROMPT', show: false });
    } else {
      const storedUsername = sessionStorage.getItem("chat-username");
      const storedUserId = sessionStorage.getItem("chat-userId");
      if (storedUsername) {
        const userId = storedUserId || `user-${Math.random().toString(36).substr(2, 9)}`;
        if (!storedUserId) sessionStorage.setItem("chat-userId", userId);
        dispatch({ type: 'SET_USER', user: { username: storedUsername, userId } });
        dispatch({ type: 'SET_SHOW_USERNAME_PROMPT', show: false });
      }
    }
  }, [isLoading, isAuthenticated, user]);

  const onMessage = useCallback((message: OutgoingMessage) => {
    const currentUserId = state.ui.currentUser?.userId || "";
    
    switch (message.type) {
      case "unified_room_state":
        dispatch({ type: 'SYNC_UNIFIED_STATE', state: (message as UnifiedRoomStateMessage).state, currentUserId });
        break;

      case "user_joined":
      case "user_left":
      case "users_updated":
        dispatch({ 
            type: 'UPDATE_PLAYERS', 
            users: (message as UserJoinedMessage | UserLeftMessage | UsersUpdatedMessage).users || [],
            currentUserId 
        });
        if (message.type === "user_joined" || message.type === "user_left") {
          dispatch({ type: 'CHAT_MESSAGE', message: message as ChatBoxMessage });
        }
        break;
      
      case "settings_updated":
        if (message.settings) dispatch({ type: 'SETTINGS_UPDATED', settings: message.settings });
        break;
        
      case "playlist_updated":
        if (message.playlist) dispatch({ type: 'PLAYLIST_UPDATED', playlist: message.playlist });
        break;
        
      case "game_started":
        dispatch({ 
            type: 'GAME_STARTED', 
            totalRounds: message.totalRounds, 
            timePerRound: message.timePerRound, 
            audioTime: message.audioTime 
        });
        break;
        
      case "round_started":
        dispatch({ 
            type: 'ROUND_STARTED', 
            round: message.round, 
            totalRounds: message.totalRounds,
            song: { previewUrl: message.song.previewUrl, albumImageUrl: message.song.albumImageUrl },
            choices: message.choices,
            startTime: message.startTime,
            endTime: message.endTime,
            duration: message.duration
        });
        break;
        
      case "round_ended":
        dispatch({ type: 'ROUND_ENDED', round: message.round, correctAnswer: message.correctAnswer, scores: message.scores });
        break;
        
      case "game_ended":
        dispatch({ type: 'GAME_ENDED', finalScores: message.finalScores });
        break;
        
      case "answer_result":
        dispatch({ type: 'ANSWER_RESULT', isCorrect: message.isCorrect, points: message.points, streak: message.streak });
        break;
        
      case "leaderboard_update":
        dispatch({ type: 'LEADERBOARD_UPDATE', leaderboard: message.leaderboard });
        break;
      
      case "message":
      case "chat_message":
        dispatch({ type: 'CHAT_MESSAGE', message: message as ChatMessage });
        break;
        
      case "error":
        console.error("Server error:", message.content);
        break;
    }
  }, [state.ui.currentUser?.userId]);

  const { isConnected, send } = useGameSocket({
    username: state.ui.currentUser?.username || "",
    room: effectiveRoomName,
    userId: state.ui.currentUser?.userId || "",
    userImage: user?.image || undefined,
    onMessage,
  });

  useEffect(() => {
    dispatch({ type: 'SET_CONNECTED', connected: isConnected });
  }, [isConnected]);

  const handleJoinRoom = useCallback((username: string) => {
    sessionStorage.setItem("chat-username", username);
    let userId = sessionStorage.getItem("chat-userId");
    if (!userId) {
      userId = `user-${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem("chat-userId", userId);
    }
    dispatch({ type: 'SET_USER', user: { username, userId } });
    dispatch({ type: 'SET_SHOW_USERNAME_PROMPT', show: false });

    if (roomName !== username) {
      navigate(`/room/${encodeURIComponent(roomName || "general")}`);
    }
  }, [navigate, roomName]);

  const handleLeaveRoom = useCallback(() => {
    sessionStorage.removeItem("chat-username");
    dispatch({ type: 'SET_USER', user: null });
    navigate("/");
  }, [navigate]);

  const handleToggleReady = useCallback(() => {
    dispatch({ type: 'TOGGLE_READY' });
    send({ type: "ready" });
  }, [send]);

  const handleStartGame = useCallback(() => {
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
    dispatch({ type: 'PLAYLIST_UPDATED', playlist });
    send({
      type: "update_playlist",
      payload: { playlist }
    });
    dispatch({ type: 'SET_SHOW_PLAYLIST_MODAL', show: false });
  }, [send]);

  const handleAnswer = useCallback((choiceIndex: number) => {
    if (state.game.hasAnswered) return;
    dispatch({ type: 'LOCAL_ANSWER', choiceIndex });
    send({
      type: "answer",
      choiceIndex,
    } as AnswerMessage);
  }, [state.game.hasAnswered, send]);

  const handleSendMessage = useCallback((content: string) => {
    send({
      type: "message",
      content,
    } as ChatMessage);
  }, [send]);

  const handlePlayAgain = useCallback(() => {
    send({ type: "start_game" });
  }, [send]);

  const handleOpenPlaylistModal = useCallback(() => {
    if (state.ui.availablePlaylists.length === 0 && !fetchedPlaylistsRef.current) {
      fetchedPlaylistsRef.current = true;
      dispatch({ type: 'SET_PLAYLISTS_LOADING', loading: true });
      fetch("/api/playlists")
        .then((res) => res.json())
        .then((data) => {
          if (data.playlists) dispatch({ type: 'SET_AVAILABLE_PLAYLISTS', playlists: data.playlists });
          dispatch({ type: 'SET_PLAYLISTS_LOADING', loading: false });
        })
        .catch(() => dispatch({ type: 'SET_PLAYLISTS_LOADING', loading: false }));
    }
    dispatch({ type: 'SET_SHOW_PLAYLIST_MODAL', show: true });
  }, [state.ui.availablePlaylists.length]);

  const handleSpotifyLinkSubmit = useCallback(async () => {
    if (!state.ui.spotifyLink.trim()) return;
    
    try {
      const response = await fetch("/api/playlists/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ link: state.ui.spotifyLink }),
      });
      
      const data = await response.json();
      if (response.ok && data.playlist) {
        handleSelectPlaylist(data.playlist);
      }
    } catch (error) {
      console.error("Error importing playlist:", error);
    }
    
    dispatch({ type: 'SET_SPOTIFY_LINK', link: "" });
    dispatch({ type: 'SET_SHOW_PLAYLIST_MODAL', show: false });
  }, [state.ui.spotifyLink, handleSelectPlaylist]);

  const { allNonHostPlayersReady, currentWarning } = useMemo(() => {
    const nonHostPlayers = state.metadata.players.filter((p) => !p.isHost);
    const hasNonHostPlayers = nonHostPlayers.length > 0;
    const allReady = !hasNonHostPlayers || nonHostPlayers.every((p) => p.isReady);

    let warning: string | null = null;
    if (!state.metadata.selectedPlaylist) {
      warning = "Please select a playlist to start";
    } else if (!allReady) {
      warning = "Waiting for all players to be ready";
    }

    return { allNonHostPlayersReady: allReady, currentWarning: warning };
  }, [state.metadata.players, state.metadata.selectedPlaylist]);

  const canStartGame = state.metadata.isHost && state.metadata.players.length >= 1 && state.metadata.selectedPlaylist && allNonHostPlayersReady;

  return {
    // State (flattened for backward compatibility with components)
    currentUser: state.ui.currentUser,
    showUsernamePrompt: state.ui.showUsernamePrompt,
    players: state.metadata.players,
    selectedPlaylist: state.metadata.selectedPlaylist,
    isReady: state.metadata.isReady,
    showSettingsModal: state.ui.showSettingsModal,
    showPlaylistModal: state.ui.showPlaylistModal,
    spotifyLink: state.ui.spotifyLink,
    gameSettings: state.metadata.gameSettings,
    isHost: state.metadata.isHost,
    canStartGame,
    isStartingGame: state.ui.isStartingGame,
    currentWarning,
    gamePhase: state.game.phase,
    currentRound: state.game.currentRound,
    totalRounds: state.game.totalRounds,
    currentSong: state.game.currentSong,
    choices: state.game.choices,
    roundStartTime: state.game.roundStartTime,
    roundEndTime: state.game.roundEndTime,
    roundDuration: state.game.roundDuration,
    scores: state.game.scores,
    myScore: state.game.myScore,
    myStreak: state.game.myStreak,
    hasAnswered: state.game.hasAnswered,
    selectedChoice: state.game.selectedChoice,
    roundEndData: state.game.roundEndData,
    gameEndData: state.game.gameEndData,
    availablePlaylists: state.ui.availablePlaylists,
    playlistsLoading: state.ui.playlistsLoading,
    isConnected: state.ui.isConnected,
    chatMessages: state.ui.chatMessages,
    // Actions
    handleJoinRoom,
    handleLeaveRoom,
    handleToggleReady,
    handleStartGame,
    handleSelectPlaylist,
    handleSpotifyLinkSubmit,
    handleCreateBlend: () => console.log("Creating blend..."),
    handleSettingsUpdate,
    handleAnswer,
    handlePlayAgain,
    handleSendMessage,
    setShowSettingsModal: (show: boolean) => dispatch({ type: 'SET_SHOW_SETTINGS_MODAL', show }),
    setShowPlaylistModal: (show: boolean) => dispatch({ type: 'SET_SHOW_PLAYLIST_MODAL', show }),
    setShowPlaylistModalWithFetch: handleOpenPlaylistModal,
    setSpotifyLink: (link: string) => dispatch({ type: 'SET_SPOTIFY_LINK', link }),
    resetToLobby: () => dispatch({ type: 'RESET_TO_LOBBY' }),
  };
}
