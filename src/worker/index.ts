import { OpenAPIHono } from "@hono/zod-openapi";
import { Scalar } from "@scalar/hono-api-reference";
import { cors } from "hono/cors";
import { auth } from "./lib/better-auth";
import { getCurrentUserPlaylists, getPlaylistTracks, getPlaylistMetadata, parseSpotifyPlaylistLink } from "./lib/spotify/playlists";
export { WebSocketHibernationServer } from "./websocketDurableObject";

const app = new OpenAPIHono<{ Bindings: Env }>();

app.use("*", (c, next) => {
  return cors({
    origin: [c.env.BETTER_AUTH_URL],
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["POST", "GET", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
    credentials: true,
  })(c, next);
});

app.get("/api/", (c) => c.json({ name: "Cloudflare" }));

// Health check endpoint
app.get("/ok", (c) => c.json({ status: "ok" }));

// Better Auth handler
app.on(["GET", "POST"], "/api/auth/*", (c) => {
  return auth(c.env).handler(c.req.raw);
});

// Playlist API endpoints
app.get("/api/playlists", async (c) => {
  const authInstance = auth(c.env);
  const session = await authInstance.api.getSession(c.req.raw);
  
  if (!session?.user) {
    return c.json({ playlists: [] });
  }
  
  const playlists = await getCurrentUserPlaylists(session.user.id, c.env);
  return c.json({ playlists });
});

app.post("/api/playlists/import", async (c) => {
  const authInstance = auth(c.env);
  const session = await authInstance.api.getSession(c.req.raw);
  
  if (!session?.user) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  
  const { link } = await c.req.json().catch(() => ({}));

  if (!link || typeof link !== "string") {
    return c.json({ error: "Missing playlist link" }, 400);
  }

  const playlistId = parseSpotifyPlaylistLink(link);
  
  if (!playlistId) {
    return c.json({ error: "Invalid Spotify playlist link" }, 400);
  }

  const playlist = await getPlaylistMetadata(playlistId, session.user.id, c.env);
  
  if (!playlist) {
    return c.json({ error: "Playlist not found or access denied" }, 404);
  }
  
  return c.json({ playlist });
});

app.get("/api/playlists/:id", async (c) => {
  const authInstance = auth(c.env);
  const session = await authInstance.api.getSession(c.req.raw);
  
  if (!session?.user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const id = c.req.param("id");
  const playlist = await getPlaylistMetadata(id, session.user.id, c.env);
  if (!playlist) {
    return c.json({ error: "Playlist not found" }, 404);
  }
  return c.json(playlist);
});

app.get("/api/playlists/:id/tracks", async (c) => {
  const authInstance = auth(c.env);
  const session = await authInstance.api.getSession(c.req.raw);
  
  if (!session?.user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const id = c.req.param("id");
  const tracks = await getPlaylistTracks(id, session.user.id, c.env);
  return c.json({ tracks });
});

// OpenAPI documentation endpoint (Swagger UI)
app.doc("/api/doc", {
  openapi: "3.0.0",
  info: {
    version: "1.0.0",
    title: "SpotiGuess API",
    description: "API for SpotiGuess application",
  },
});

// Scalar API reference endpoint
app.get(
  "/docs",
  Scalar({
    pageTitle: "SpotiGuess API Documentation",
    sources: [
      { url: "/api/doc", title: "API" },
      { url: "/api/auth/open-api/generate-schema", title: "Auth" },
    ],
  }),
);

// WebSocket endpoint - supports room-based connections
app.get("/ws/:room?", async (c) => {
  const upgradeHeader = c.req.header("upgrade");
  if (upgradeHeader !== "websocket") {
    return c.text("Expected Upgrade: websocket", 426);
  }

  // Get room from URL parameter or default to "general"
  const room = c.req.param("room") || "general";

  // Get the Durable Object - use room name to create isolated chat rooms
  const durableObjectId = c.env.WEBSOCKET_HIBERNATION_SERVER.idFromName(
    `chat-room-${room}`
  );
  const durableObject = c.env.WEBSOCKET_HIBERNATION_SERVER.get(durableObjectId);

  // Forward the WebSocket upgrade request to the Durable Object
  return durableObject.fetch(c.req.raw);
});

// Serve the React SPA for all other routes (client-side routing)
app.get("*", async (c) => {
  const assets = c.env as unknown as { ASSETS: Fetcher };
  return assets.ASSETS.fetch(c.req.raw);
});

export default app;
