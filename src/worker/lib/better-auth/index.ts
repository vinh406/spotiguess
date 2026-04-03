import { drizzle } from "drizzle-orm/postgres-js";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { betterAuth } from "better-auth";
import { openAPI } from "better-auth/plugins";
import { betterAuthOptions } from "./options";
import postgres from "postgres";
import * as schema from "../../db/schema";

/**
 * Better Auth Instance
 */
export const auth = (env: Env) => {
  const sql = postgres(env.DATABASE_URL);
  const db = drizzle(sql);

  return betterAuth({
    ...betterAuthOptions,
    database: drizzleAdapter(db, {
      provider: "pg",
      schema,
    }),
    baseURL: env.BETTER_AUTH_URL,
    secret: env.BETTER_AUTH_SECRET,

    // Spotify OAuth provider configuration
    socialProviders: {
      spotify: {
        clientId: env.SPOTIFY_CLIENT_ID,
        clientSecret: env.SPOTIFY_CLIENT_SECRET,
        scope: [
          "user-read-email",
          "playlist-read-private",
          "playlist-read-collaborative",
        ],
      },
    },

    // OpenAPI plugin for API documentation
    plugins: [
      openAPI({
        disableDefaultReference: true,
      }),
    ],
  });
};
