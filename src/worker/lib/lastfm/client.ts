import { LastFMTrack, LastFMArtist } from "lastfm-ts-api";

export interface LastFMSimilarTrack {
  name: string;
  artist: string;
  mbid: string;
  url: string;
  imageUrl: string | null;
}

let lastFmClient: LastFMTrack | null = null;
let lastFmArtistClient: LastFMArtist | null = null;
let currentApiKey: string | null = null;

export function getLastFMClient(apiKey: string): LastFMTrack {
  if (!lastFmClient || currentApiKey !== apiKey) {
    lastFmClient = new LastFMTrack(apiKey);
    currentApiKey = apiKey;
  }
  return lastFmClient;
}

export function getLastFMArtistClient(apiKey: string): LastFMArtist {
  if (!lastFmArtistClient || currentApiKey !== apiKey) {
    lastFmArtistClient = new LastFMArtist(apiKey);
    currentApiKey = apiKey;
  }
  return lastFmArtistClient;
}

export async function getSimilarTracks(
  artist: string,
  track: string,
  apiKey: string,
  limit: number = 10
): Promise<LastFMSimilarTrack[]> {
  try {
    const client = getLastFMClient(apiKey);
    const artistParts = artist.split(/[,;\u00A0]/);
    const firstArtist = artistParts[0]?.trim() ?? artist;
    const response = await client.getSimilar({
      artist: firstArtist,
      track,
      limit,
    });

    if (!response?.similartracks?.track) {
      return [];
    }

    return response.similartracks.track.map((t) => ({
      name: t.name,
      artist: t.artist.name,
      mbid: t.mbid,
      url: t.url,
      imageUrl: t.image.find((img) => img.size === "medium")?.["#text"] ?? 
                t.image.find((img) => img.size === "large")?.["#text"] ?? 
                null,
    }));
  } catch (error) {
    console.error("Failed to fetch similar tracks from Last.fm:", error);
    return [];
  }
}

export async function getArtistTopTracks(
  artist: string,
  apiKey: string,
  limit: number = 10
): Promise<LastFMSimilarTrack[]> {
  try {
    const client = getLastFMArtistClient(apiKey);
    const artistParts = artist.split(/[,;\u00A0]/);
    const firstArtist = artistParts[0]?.trim() ?? artist;
    const response = await client.getTopTracks({
      artist: firstArtist,
      limit,
    });

    if (!response?.toptracks?.track) {
      return [];
    }

    return response.toptracks.track.map((t) => ({
      name: t.name,
      artist: firstArtist,
      mbid: t.mbid,
      url: t.url,
      imageUrl: t.image.find((img) => img.size === "medium")?.["#text"] ?? 
                t.image.find((img) => img.size === "large")?.["#text"] ?? 
                null,
    }));
  } catch (error) {
    console.error("Failed to fetch artist top tracks from Last.fm:", error);
    return [];
  }
}

export async function prefetchSimilarTracksForSongs(
  songs: { id: string; artist: string; title: string }[],
  apiKey: string
): Promise<Map<string, LastFMSimilarTrack[]>> {
  const similarTracksMap = new Map<string, LastFMSimilarTrack[]>();
  const client = getLastFMClient(apiKey);

  const batchSize = 5;
  for (let i = 0; i < songs.length; i += batchSize) {
    const batch = songs.slice(i, i + batchSize);
    
    const promises = batch.map(async (song) => {
      try {
        const artistParts = song.artist.split(/[,;\u00A0]/);
        const firstArtist = artistParts[0]?.trim() ?? song.artist;
        const response = await client.getSimilar({
          artist: firstArtist,
          track: song.title,
          limit: 10,
        });

        if (!response?.similartracks?.track) {
          return { id: song.id, tracks: [] };
        }

        const tracks: LastFMSimilarTrack[] = response.similartracks.track.map((t) => ({
          name: t.name,
          artist: t.artist.name,
          mbid: t.mbid,
          url: t.url,
          imageUrl:
            t.image.find((img) => img.size === "medium")?.["#text"] ??
            t.image.find((img) => img.size === "large")?.["#text"] ??
            null,
        }));

        return { id: song.id, tracks };
      } catch (error) {
        console.error(`Failed to fetch similar tracks for ${song.title}:`, error);
        return { id: song.id, tracks: [] };
      }
    });

    const results = await Promise.all(promises);
    results.forEach(({ id, tracks }) => {
      similarTracksMap.set(id, tracks);
    });

    if (i + batchSize < songs.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  return similarTracksMap;
}