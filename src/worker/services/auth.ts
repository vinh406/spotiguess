import { auth } from "./better-auth";
import type { DbInstance } from "../db";

type HonoCtx = { env: Env; req: { raw: Request } };

export async function getAuthenticatedUser(c: HonoCtx, db: DbInstance) {
  const authInstance = auth(c.env, db);
  const session = await authInstance.api.getSession({
    headers: c.req.raw.headers,
  });
  return session?.user;
}
