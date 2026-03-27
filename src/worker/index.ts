import { OpenAPIHono } from "@hono/zod-openapi";
import { Scalar } from "@scalar/hono-api-reference";
import { cors } from "hono/cors";
import { auth } from "./lib/better-auth";

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

export default app;
