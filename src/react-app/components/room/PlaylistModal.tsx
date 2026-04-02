import type { Playlist } from "../../../shared/types";
import { MOCK_PLAYLISTS } from "../../../shared/constants";

export interface PlaylistModalProps {
  selectedPlaylist: Playlist | null;
  spotifyLink: string;
  onSpotifyLinkChange: (link: string) => void;
  onSelectPlaylist: (playlist: Playlist) => void;
  onSubmitSpotifyLink: () => void;
  onCreateBlend: () => void;
  onClose: () => void;
}

export function PlaylistModal({
  selectedPlaylist,
  spotifyLink,
  onSpotifyLinkChange,
  onSelectPlaylist,
  onSubmitSpotifyLink,
  onCreateBlend,
  onClose,
}: PlaylistModalProps) {
  const mockPlaylists = MOCK_PLAYLISTS;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-2xl w-full max-w-2xl border border-gray-700/50 shadow-xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-700/50">
          <h2 className="text-xl font-bold text-white">Select Playlist</h2>
          <button
            onClick={onClose}
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
                onChange={(e) => onSpotifyLinkChange(e.target.value)}
                placeholder="Paste Spotify playlist link..."
                className="flex-1 px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all"
              />
              <button
                onClick={onSubmitSpotifyLink}
                disabled={!spotifyLink.trim()}
                className="px-6 py-3 bg-gradient-to-r from-green-400 to-green-600 text-white rounded-xl hover:from-green-500 hover:to-green-700 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Import
              </button>
            </div>
          </div>

          {/* Create Blend Button */}
          <button
            onClick={onCreateBlend}
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
                onClick={() => onSelectPlaylist(playlist)}
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
            onClick={onClose}
            className="w-full py-3 bg-gray-700/50 text-gray-300 rounded-xl hover:bg-gray-600/50 transition-all font-medium border border-gray-600"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
