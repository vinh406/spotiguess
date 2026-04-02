import { useState, useEffect, useRef } from "react";
import type {
  UserSession,
  RoomSettings,
  Playlist,
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
}

interface ChatProps {
  username: string;
  room: string;
  userId: string;
  userImage?: string;
  onUsersUpdate?: (users: UserSession[]) => void;
  onSettingsUpdate?: (settings: RoomSettings) => void;
  onPlaylistUpdate?: (playlist: Playlist) => void;
  readyTrigger?: number; // Increment to trigger ready toggle
  settingsTrigger?: { rounds: number; timePerRound: number } | null; // Trigger settings update to server
  playlistTrigger?: Playlist | null; // Trigger playlist update to server
}

const MAX_MESSAGES = 200;

export function Chat({ username, room, userId, userImage, onUsersUpdate, onSettingsUpdate, onPlaylistUpdate, readyTrigger, settingsTrigger, playlistTrigger }: ChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [users, setUsers] = useState<UserSession[]>([]);
  const [reconnectKey, setReconnectKey] = useState(0);
  const wsRef = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const reconnectAttempts = useRef(0);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wasOpen = useRef(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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

  useEffect(() => {
    // Create WebSocket connection
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws/${encodeURIComponent(
      room
    )}`;

    wasOpen.current = false;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
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

        // Handle different message types
        if (message.type === "user_joined" || message.type === "user_left" || message.type === "users_updated") {
          const newUsers = message.users || [];
          console.log('[Chat] Users updated:', newUsers);
          setUsers(newUsers);
          // Notify parent component about user updates
          if (onUsersUpdate) {
            onUsersUpdate(newUsers);
          }
        }

        // Handle settings updates
        if (message.type === "settings_updated" && message.settings) {
          console.log('[Chat] Settings updated received:', message.settings);
          if (onSettingsUpdate) {
            onSettingsUpdate(message.settings);
          }
        }

        // Handle playlist updates
        if (message.type === "playlist_updated" && message.playlist) {
          console.log('[Chat] Playlist updated received:', message.playlist);
          if (onPlaylistUpdate) {
            onPlaylistUpdate(message.playlist);
          }
        }

        // Handle game events
        if (message.type === "game_event" && message.payload) {
          // Game events are added to messages for display in chat
          console.log("Game event received:", message.payload);
        }

        // Handle room state (new player joins, receive current state)
        if (message.type === "room_state" && message.settings) {
          console.log('[Chat] Room state received:', message);
          if (onSettingsUpdate) {
            onSettingsUpdate(message.settings);
          }
          if (message.playlist && onPlaylistUpdate) {
            onPlaylistUpdate(message.playlist);
          }
        }

        // Handle error messages
        if (message.type === "error") {
          console.error("Server error:", message.message);
          // You could show a toast notification here
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
        <div key={index} className="text-center py-2">
          <div className="inline-block bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-xs">
            {message.username} joined the room
          </div>
        </div>
      );
    }

    if (message.type === "user_left") {
      return (
        <div key={index} className="text-center py-2">
          <div className="inline-block bg-red-500/20 text-red-400 px-3 py-1 rounded-full text-xs">
            {message.username} left the room
          </div>
        </div>
      );
    }

    if (message.type === "error") {
      return (
        <div key={index} className="text-center py-2">
          <div className="inline-block bg-yellow-500/20 text-yellow-400 px-3 py-1 rounded-full text-xs">
            {message.message}
          </div>
        </div>
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
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
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
              <svg
                className="w-6 h-6 text-gray-500"
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
