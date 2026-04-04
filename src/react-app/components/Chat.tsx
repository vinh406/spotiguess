import { useState, useEffect, useRef } from "react";
import type {
  UserSession,
  RoomSettings,
  Playlist,
  SongChoice,
  PlayerScore,
} from "../../shared/types";

interface Message {
  type: string;
  timestamp: number;
  content?: string;
  message?: string;
  userId?: string;
  username?: string;
  room?: string;
  users?: UserSession[];
  settings?: RoomSettings;
  playlist?: Playlist;
  payload?: {
    eventType?: string;
    category?: string;
    icon?: string;
    content?: string;
    data?: Record<string, unknown>;
  };
  totalRounds?: number;
  timePerRound?: number;
  round?: number;
  song?: { previewUrl?: string; albumImageUrl?: string };
  choices?: SongChoice[];
  startTime?: number;
  correctAnswer?: SongChoice;
  scores?: PlayerScore[];
  audioTime?: number;
  finalScores?: PlayerScore[];
  isCorrect?: boolean;
  points?: number;
  streak?: number;
  leaderboard?: PlayerScore[];
}

interface ChatProps {
  username: string;
  room: string;
  userId: string;
  userImage?: string;
  onUsersUpdate?: (users: UserSession[]) => void;
  onSettingsUpdate?: (settings: RoomSettings) => void;
  onPlaylistUpdate?: (playlist: Playlist) => void;
  onGameStarted?: (totalRounds: number, timePerRound: number, audioTime: number) => void;
  onRoundStarted?: (round: number, totalRounds: number, song: { previewUrl?: string; albumImageUrl?: string }, choices: SongChoice[], startTime: number) => void;
  onRoundEnded?: (round: number, correctAnswer: SongChoice, scores: PlayerScore[]) => void;
  onGameEnded?: (finalScores: PlayerScore[]) => void;
  onAnswerResult?: (isCorrect: boolean, points: number, streak: number) => void;
  onLeaderboardUpdate?: (leaderboard: PlayerScore[]) => void;
  onGameStateReceived?: (gameState: any) => void;
  onStartGameError?: () => void;
  readyTrigger?: number;
  settingsTrigger?: { rounds: number; timePerRound: number; audioTime: number } | null;
  playlistTrigger?: Playlist | null;
  startGameTrigger?: number;
  answerTrigger?: { choiceIndex: number; timestamp: number } | null;
}

const MAX_MESSAGES = 200;

function ChatBubbleIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
      />
    </svg>
  );
}

type BadgeVariant = "green" | "red" | "yellow";

const badgeVariantClasses: Record<BadgeVariant, string> = {
  green: "bg-green-500/20 text-green-400",
  red: "bg-red-500/20 text-red-400",
  yellow: "bg-yellow-500/20 text-yellow-400",
};

function NotificationBadge({
  variant,
  children,
}: {
  variant: BadgeVariant;
  children: React.ReactNode;
}) {
  return (
    <div className="text-center py-2">
      <div
        className={`inline-block px-3 py-1 rounded-full text-xs ${badgeVariantClasses[variant]}`}
      >
        {children}
      </div>
    </div>
  );
}

export function Chat({ username, room, userId, userImage, onUsersUpdate, onSettingsUpdate, onPlaylistUpdate, onGameStarted, onRoundStarted, onRoundEnded, onGameEnded, onAnswerResult, onLeaderboardUpdate, onGameStateReceived, onStartGameError, readyTrigger, settingsTrigger, playlistTrigger, startGameTrigger, answerTrigger }: ChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [users, setUsers] = useState<UserSession[]>([]);
  const [reconnectKey, setReconnectKey] = useState(0);
  const wsRef = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const reconnectAttempts = useRef(0);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const connectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wasOpen = useRef(false);

  // Handle ready trigger from parent
  useEffect(() => {
    if (readyTrigger && readyTrigger > 0 && wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: "ready",
          timestamp: Date.now(),
        })
      );
    }
  }, [readyTrigger]);

  // Handle settings trigger from parent (host updates settings)
  useEffect(() => {
    if (settingsTrigger && wsRef.current?.readyState === WebSocket.OPEN) {
      console.log('[Chat] Sending settings update to server:', settingsTrigger);
      wsRef.current.send(
        JSON.stringify({
          type: "update_settings",
            payload: {
              rounds: settingsTrigger.rounds,
              timePerRound: settingsTrigger.timePerRound * 1000, // Convert seconds to ms
              audioTime: settingsTrigger.audioTime * 1000, // Convert seconds to ms
            },
          timestamp: Date.now(),
        })
      );
    }
  }, [settingsTrigger]);

  // Handle playlist trigger from parent (host selects playlist)
  useEffect(() => {
    if (playlistTrigger && wsRef.current?.readyState === WebSocket.OPEN) {
      console.log('[Chat] Sending playlist update to server:', playlistTrigger);
      wsRef.current.send(
        JSON.stringify({
          type: "update_playlist",
          payload: {
            playlist: playlistTrigger,
          },
          timestamp: Date.now(),
        })
      );
    }
  }, [playlistTrigger]);

  // Handle start game trigger from parent
  useEffect(() => {
    if (startGameTrigger && startGameTrigger > 0 && wsRef.current?.readyState === WebSocket.OPEN) {
      console.log('[Chat] Sending start game to server');
      wsRef.current.send(
        JSON.stringify({
          type: "start_game",
          timestamp: Date.now(),
        })
      );
    }
  }, [startGameTrigger]);

  // Handle answer trigger from parent (user selects a choice in game)
  useEffect(() => {
    if (answerTrigger && wsRef.current?.readyState === WebSocket.OPEN) {
      console.log('[Chat] Sending answer to server:', answerTrigger);
      wsRef.current.send(
        JSON.stringify({
          type: "answer",
          choiceIndex: answerTrigger.choiceIndex,
          timestamp: answerTrigger.timestamp,
        })
      );
    }
  }, [answerTrigger]);

  useEffect(() => {
    // readyState: CONNECTING=0, OPEN=1, CLOSING=2, CLOSED=3
    if (wsRef.current && wsRef.current.readyState < WebSocket.CLOSING) {
      return;
    }

    // Create WebSocket connection
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws/${encodeURIComponent(
      room
    )}`;

    wasOpen.current = false;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    // Connection timeout — close stuck CONNECTING sockets
    connectTimer.current = setTimeout(() => {
      if (ws.readyState === WebSocket.CONNECTING) {
        console.warn("WebSocket connection timed out");
        ws.close();
      }
    }, 10000);

    ws.onopen = () => {
      if (connectTimer.current) {
        clearTimeout(connectTimer.current);
        connectTimer.current = null;
      }
      setIsConnected(true);
      reconnectAttempts.current = 0;
      wasOpen.current = true;
      console.log("WebSocket connected");

      // Send join message
      ws.send(
        JSON.stringify({
          type: "join",
          username,
          room,
          userId,
          userImage,
          timestamp: Date.now(),
        })
      );
    };

    ws.onmessage = (event) => {
      try {
        const message: Message = JSON.parse(event.data);
        console.log('[Chat] Received message:', message.type, message);

        switch (message.type) {
          case "user_joined":
          case "user_left":
          case "users_updated": {
            const newUsers = message.users || [];
            console.log('[Chat] Users updated:', newUsers);
            setUsers(newUsers);
            if (onUsersUpdate) {
              onUsersUpdate(newUsers);
            }
            break;
          }

          case "settings_updated":
            if (message.settings) {
              console.log('[Chat] Settings updated received:', message.settings);
              onSettingsUpdate?.(message.settings);
            }
            break;

          case "playlist_updated":
            if (message.playlist) {
              console.log('[Chat] Playlist updated received:', message.playlist);
              onPlaylistUpdate?.(message.playlist);
            }
            break;

          case "game_event":
            if (message.payload) {
              console.log("Game event received:", message.payload);
            }
            break;

          case "game_started":
            if (message.totalRounds !== undefined && message.timePerRound !== undefined && message.audioTime !== undefined) {
              onGameStarted?.(message.totalRounds, message.timePerRound, message.audioTime);
            }
            break;

          case "round_started":
            if (message.round && message.choices && message.song) {
              onRoundStarted?.(message.round, message.totalRounds!, message.song, message.choices, message.startTime || Date.now());
            }
            break;

          case "round_ended":
            if (message.correctAnswer && message.scores) {
              onRoundEnded?.(message.round!, message.correctAnswer, message.scores);
            }
            break;

          case "game_ended":
            if (message.finalScores) {
              onGameEnded?.(message.finalScores);
            }
            break;

          case "answer_result":
            if (message.isCorrect !== undefined && message.points !== undefined && message.streak !== undefined) {
              onAnswerResult?.(message.isCorrect, message.points, message.streak);
            }
            break;

          case "leaderboard_update":
            if (message.leaderboard) {
              onLeaderboardUpdate?.(message.leaderboard);
            }
            break;

          case "game_state":
            console.log('[Chat] Game state received:', message);
            if (onGameStateReceived) {
              onGameStateReceived(message);
            }
            break;

          case "room_state":
            if (message.settings) {
              console.log('[Chat] Room state received:', message);
              onSettingsUpdate?.(message.settings);
              if (message.playlist) {
                onPlaylistUpdate?.(message.playlist);
              }
            }
            break;

          case "error":
            console.error("Server error:", message.message);
            break;
        }

        setMessages((prev) => {
          const next = [...prev, message];
          return next.length > MAX_MESSAGES ? next.slice(-MAX_MESSAGES) : next;
        });
      } catch (e) {
        console.error("Failed to parse message:", e);
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
      console.log("WebSocket disconnected");

      // Only reconnect if the connection was previously open (lost connection),
      // not if it was already closing or never opened.
      if (wasOpen.current) {
        const maxAttempts = 5;
        if (reconnectAttempts.current < maxAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
          reconnectAttempts.current += 1;
          console.log(`Reconnecting in ${delay}ms (attempt ${reconnectAttempts.current}/${maxAttempts})`);
          reconnectTimer.current = setTimeout(() => {
            setReconnectKey((k) => k + 1);
          }, delay);
        } else {
          console.error("Max reconnection attempts reached");
        }
      }
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
      setIsConnected(false);
    };

    return () => {
      wasOpen.current = false;
      if (connectTimer.current) {
        clearTimeout(connectTimer.current);
        connectTimer.current = null;
      }
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current);
        reconnectTimer.current = null;
      }
      ws.close();
    };
  }, [username, room, userId, reconnectKey]);

  const sendMessage = () => {
    if (
      !inputMessage.trim() ||
      !wsRef.current ||
      wsRef.current.readyState !== WebSocket.OPEN
    ) {
      return;
    }

    const message = {
      type: "message",
      content: inputMessage.trim(),
      timestamp: Date.now(),
    };

    wsRef.current.send(JSON.stringify(message));
    setInputMessage("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const renderMessage = (message: Message, index: number) => {
    if (message.type === "user_joined") {
      return (
        <NotificationBadge key={index} variant="green">
          {message.username} joined the room
        </NotificationBadge>
      );
    }

    if (message.type === "user_left") {
      return (
        <NotificationBadge key={index} variant="red">
          {message.username} left the room
        </NotificationBadge>
      );
    }

    if (message.type === "error") {
      if (onStartGameError) {
        onStartGameError();
      }
      return (
        <NotificationBadge key={index} variant="yellow">
          {message.message}
        </NotificationBadge>
      );
    }

    if (message.type === "message" && message.content) {
      const isOwnMessage = message.userId === userId;
      return (
        <div
          key={index}
          className={`flex flex-col ${
            isOwnMessage ? "items-end" : "items-start"
          } mb-3`}
        >
          <div
            className={`max-w-[85%] px-4 py-2 rounded-2xl ${
              isOwnMessage
                ? "bg-gradient-to-r from-green-400 to-green-600 text-white rounded-br-md"
                : "bg-gray-700/50 text-gray-100 rounded-bl-md"
            }`}
          >
            {!isOwnMessage && message.username && (
              <div className="text-xs font-semibold mb-1 text-green-400">
                {message.username}
              </div>
            )}
            <p className="text-sm break-words">{message.content}</p>
          </div>
          <div className="flex items-center gap-2 mt-1 px-1">
            <span className="text-xs text-gray-500">
              {formatTime(message.timestamp)}
            </span>
            {isOwnMessage && (
              <span className="text-xs text-gray-500">You</span>
            )}
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700/50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center">
            <ChatBubbleIcon className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Room Chat</h3>
            <p className="text-xs text-gray-400">
              {users.length} user{users.length !== 1 ? "s" : ""} online
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full ${
              isConnected ? "bg-green-500" : "bg-red-500"
            }`}
          />
          <span className="text-xs text-gray-400">
            {isConnected ? "Connected" : "Disconnected"}
          </span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-1 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-12 h-12 bg-gray-700/30 rounded-full flex items-center justify-center mb-3">
              <ChatBubbleIcon className="w-6 h-6 text-gray-500" />
            </div>
            <p className="text-gray-500 text-sm">
              No messages yet. Start the conversation!
            </p>
          </div>
        ) : (
          messages.map((message, index) => renderMessage(message, index))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-700/50">
        <div className="flex gap-2">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            disabled={!isConnected}
            className="flex-1 px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          />
          <button
            onClick={sendMessage}
            disabled={!inputMessage.trim() || !isConnected}
            className="px-4 py-2 bg-gradient-to-r from-green-400 to-green-600 text-white rounded-xl hover:from-green-500 hover:to-green-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
