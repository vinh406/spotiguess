/**
 * Better Auth CLI configuration file
 *
 * Docs: https://www.better-auth.com/docs/concepts/cli
 */
import { drizzle } from "drizzle-orm/postgres-js";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { betterAuth } from "better-auth";
import { betterAuthOptions } from "./src/worker/lib/better-auth/options";
import postgres from "postgres";

const {
  DATABASE_URL,
  BETTER_AUTH_URL,
  BETTER_AUTH_SECRET,
  SPOTIFY_CLIENT_ID,
  SPOTIFY_CLIENT_SECRET,
} = process.env;

const sql = postgres(DATABASE_URL!);
const db = drizzle(sql);

export const auth = betterAuth({
  ...betterAuthOptions,
  database: drizzleAdapter(db, { provider: "pg" }),
  baseURL: BETTER_AUTH_URL,
  secret: BETTER_AUTH_SECRET,
  socialProviders: {
    spotify: {
      clientId: SPOTIFY_CLIENT_ID!,
      clientSecret: SPOTIFY_CLIENT_SECRET!,
    },
  },
});
