import { getSpotifyClientForUser } from "./client";
import type { Playlist, Song } from "../../../shared/types";

export function parseSpotifyPlaylistLink(link: string): string | null {
  const patterns = [
    /spotify\.com\/playlist\/([a-zA-Z0-9]+)/,
    /spotify:playlist:([a-zA-Z0-9]+)/,
    /^([a-zA-Z0-9]{22})$/,
  ];

  for (const pattern of patterns) {
    const match = link.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

export async function getPlaylistMetadata(
  playlistId: string,
  userId: string,
  env: Env,
): Promise<Playlist | null> {
  const api = await getSpotifyClientForUser(userId, env);

  if (!api) {
    console.error("Failed to get Spotify client for user:", userId);
    return null;
  }

  try {
    const playlist = await api.playlists.getPlaylist(playlistId);
    return {
      id: playlist.id,
      name: playlist.name,
      description: playlist.description ?? undefined,
      trackCount: (playlist as any).items?.total ?? 0,
      imageUrl: playlist.images[0]?.url ?? undefined,
    };
  } catch (error) {
    console.error(
      `Failed to fetch playlist metadata for ${playlistId}:`,
      error,
    );
    return null;
  }
}

export async function getCurrentUserPlaylists(
  userId: string,
  env: Env,
): Promise<Playlist[]> {
  const playlists: Playlist[] = [];
  const api = await getSpotifyClientForUser(userId, env);

  if (!api) {
    console.error("Failed to get Spotify client for user:", userId);
    return playlists;
  }

  try {
    const result = await api.currentUser.playlists.playlists();

    for (const playlist of result.items ?? []) {
      if (!playlist) continue;
      playlists.push({
        id: playlist.id,
        name: playlist.name,
        description: playlist.description ?? undefined,
        trackCount: (playlist as any).items?.total ?? 0,
        imageUrl: playlist.images[0]?.url ?? undefined,
      });
    }
  } catch (error) {
    console.error("Failed to fetch current user's playlists:", error);
  }

  return playlists;
}

export async function getPlaylistTracks(
  playlistId: string,
  userId: string,
  env: Env,
): Promise<Song[]> {
  const api = await getSpotifyClientForUser(userId, env);

  if (!api) {
    console.error("Failed to get Spotify client for user:", userId);
    return [];
  }

  const songs: Song[] = [];

  try {
    const tracks = await api.playlists.getPlaylistItems(playlistId);

    for (const item of tracks.items ?? []) {
      if (!(item as any).item) continue;
      const track = (item as any).item;
      songs.push({
        id: track.id,
        title: track.name,
        artist: track.artists.map((a: { name: string }) => a.name).join(", "),
        album: track.album.name,
        albumImageUrl: track.album.images[0]?.url,
        previewUrl: track.preview_url ?? undefined,
        duration: track.duration_ms,
      });
    }
  } catch (error) {
    console.error(`Failed to fetch tracks for playlist ${playlistId}:`, error);
  }

  return songs;
}
