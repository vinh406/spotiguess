import { getSpotifyClientForUser } from "./client";
import type { Playlist, Song } from "../../../shared/types";
import spotifyUrlInfo from "spotify-url-info";

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
  _userId: string,
  _env: Env,
): Promise<Playlist | null> {
  try {
    const spotifyUrlInfoModule = spotifyUrlInfo(fetch);
    const getDetails = spotifyUrlInfoModule.getDetails;

    const spotifyUrl = `https://open.spotify.com/playlist/${playlistId}`;
    const details = await getDetails(spotifyUrl);

    return {
      id: playlistId,
      name: details.preview.title,
      description: details.preview.description ?? undefined,
      trackCount: details.tracks.length,
      imageUrl: details.preview.image ?? undefined,
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
  _userId: string,
  _env: Env,
): Promise<Song[]> {
  try {
    const spotifyUrlInfoModule = spotifyUrlInfo(fetch);
    const getTracksFromUrl = spotifyUrlInfoModule.getTracks;

    const spotifyUrl = `https://open.spotify.com/playlist/${playlistId}`;
    const tracks = await getTracksFromUrl(spotifyUrl);
    return tracks.map((track) => ({
      id: track.uri.replace("spotify:track:", ""),
      title: track.name,
      artist: track.artist,
      album: "",
      albumImageUrl: undefined,
      previewUrl: track.previewUrl,
      duration: track.duration ?? 0,
    }));
  } catch (error) {
    console.error(`Failed to fetch tracks for playlist ${playlistId}:`, error);
    return [];
  }
}
