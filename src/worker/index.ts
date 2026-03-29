import { OpenAPIHono } from "@hono/zod-openapi";
import { Scalar } from "@scalar/hono-api-reference";
import { cors } from "hono/cors";
import { auth } from "./lib/better-auth";
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
