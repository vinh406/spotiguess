import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useNavigate, useParams } from "react-router";
import { useAuth } from "../contexts/AuthContext";
import type { Player, Playlist, UserSession } from "../../shared/types";
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
}

export function useRoomState(): RoomState & RoomActions {
  const navigate = useNavigate();
  const { roomName } = useParams<{ roomName: string }>();
  const { user, isAuthenticated, isLoading } = useAuth();

  const [currentUser, setCurrentUser] = useState<{ username: string; userId: string } | null>(null);
  const [showUsernamePrompt, setShowUsernamePrompt] = useState(false);
  const [players, setPlayers] = useState<Player[]>([]);
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

  const initializedRef = useRef(false);

  // Initialize user from auth
  useEffect(() => {
    if (isLoading) return;
    if (initializedRef.current) return;
    initializedRef.current = true;

    if (isAuthenticated && user) {
      const displayName = user.name.trim();
      setCurrentUser({ username: displayName, userId: user.id });
      setShowUsernamePrompt(false);
      // Don't set isHost here - wait for server response
      setPlayers([{
        userId: user.id,
        username: displayName,
        userImage: user.image || null,
        isReady: false,
        isHost: false,
      }]);
    } else {
      const storedUsername = sessionStorage.getItem("chat-username");
      if (storedUsername) {
        const userId = `user-${Math.random().toString(36).substr(2, 9)}`;
        setCurrentUser({ username: storedUsername, userId });
        // Don't set isHost here - wait for server response
        setPlayers([{ userId, username: storedUsername, userImage: null, isReady: false, isHost: false }]);
      } else {
        setShowUsernamePrompt(true);
      }
    }
  }, [isLoading, isAuthenticated, user]);

  const handleJoinRoom = useCallback((username: string) => {
    sessionStorage.setItem("chat-username", username);
    const userId = `user-${Math.random().toString(36).substr(2, 9)}`;
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
    console.log("Starting game with settings:", {
      playlist: selectedPlaylist,
      rounds: gameSettings.rounds,
      timePerRound: gameSettings.timePerRound,
      players,
    });
  }, [selectedPlaylist, gameSettings, players]);

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
  };
}
