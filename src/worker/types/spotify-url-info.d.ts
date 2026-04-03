declare module "spotify-url-info" {
  interface Track {
    artist: string;
    duration?: number;
    name: string;
    previewUrl?: string;
    uri: string;
  }

  interface Preview {
    date: string | null;
    title: string;
    type: string;
    track: string;
    description?: string;
    artist: string;
    image?: string;
    audio?: string;
    link: string;
    embed: string;
  }

  interface Details {
    preview: Preview;
    tracks: Track[];
  }

  interface SpotifyUrlInfo {
    getLink: (data: unknown) => string;
    getData: (url: string, opts?: RequestInit) => Promise<unknown>;
    getPreview: (url: string, opts?: RequestInit) => Promise<Preview>;
    getTracks: (url: string, opts?: RequestInit) => Promise<Track[]>;
    getDetails: (url: string, opts?: RequestInit) => Promise<Details>;
  }

  function spotifyUrlInfo(fetch: typeof globalThis.fetch): SpotifyUrlInfo;
  export default spotifyUrlInfo;
}
