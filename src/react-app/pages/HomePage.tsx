import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import ActionCard from "../components/common/ActionCard";
import StatCard from "../components/common/StatCard";

export default function HomePage() {
  const { user, logout } = useAuth();
  const [roomCode, setRoomCode] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);

  const handleCreateRoom = async () => {
    setIsCreating(true);
    try {
      // TODO: Implement room creation API call
      console.log("Creating room...");
    } catch (error) {
      console.error("Failed to create room:", error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinRoom = async () => {
    if (!roomCode.trim()) return;
    
    setIsJoining(true);
    try {
      // TODO: Implement room join API call
      console.log("Joining room:", roomCode);
    } catch (error) {
      console.error("Failed to join room:", error);
    } finally {
      setIsJoining(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Failed to logout:", error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Header */}
      <header className="border-b border-gray-700/50 bg-gray-900/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
              </svg>
            </div>
            <span className="text-2xl font-bold text-white">Spotiguess</span>
          </div>
          
          <div className="flex items-center gap-4">
            {user && (
              <div className="flex items-center gap-3">
                {user.image && (
                  <img 
                    src={user.image} 
                    alt={user.name}
                    className="w-8 h-8 rounded-full"
                  />
                )}
                <span className="text-gray-300 font-medium">{user.name}</span>
                <button
                  onClick={handleLogout}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-16">
        <div className="text-center mb-16">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
            Welcome back,{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-500">
              {user?.name?.split(" ")[0] || "Player"}
            </span>
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Ready to challenge your friends? Create a new room or join an existing one to start guessing songs!
          </p>
        </div>

        {/* Action Cards */}
        <div className="grid md:grid-cols-2 gap-8">
          {/* Create Room Card */}
          <ActionCard
            icon={
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            }
            title="Create a Room"
            description="Start a new game and invite your friends with a room code. You'll be the host!"
            gradientFrom="from-green-400"
            gradientTo="to-green-600"
            hoverFrom="hover:from-green-600"
            hoverTo="hover:to-emerald-700"
            borderColor="border-green-500/50"
            buttonText="Create Room"
            onClick={handleCreateRoom}
            isLoading={isCreating}
          />

          {/* Join Room Card */}
          <ActionCard
            icon={
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            }
            title="Join a Room"
            description="Have a room code? Enter it below to join your friend's game!"
            gradientFrom="from-blue-400"
            gradientTo="to-blue-600"
            hoverFrom="hover:from-blue-600"
            hoverTo="hover:to-blue-700"
            borderColor="border-blue-500/50"
            buttonText="Join Room"
            onClick={handleJoinRoom}
            isLoading={isJoining}
            disabled={!roomCode.trim()}
          >
            <input
              type="text"
              placeholder="Enter room code"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              className="w-full px-6 py-4 bg-gray-700/50 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all mb-4"
              maxLength={8}
            />
          </ActionCard>
        </div>

        {/* Quick Stats */}
        <div className="mt-16 grid grid-cols-3 gap-6">
          <StatCard value={0} label="Games Played" />
          <StatCard value={0} label="Total Wins" />
          <StatCard value={0} label="Songs Guessed" />
        </div>
      </main>
    </div>
  );
}
