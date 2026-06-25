import { cookies } from "next/headers";
import {
  SESSION_COOKIE,
  createSessionToken,
  getSessionMaxAge,
  validateCredentials,
  verifySessionToken,
} from "./authSession";

export { SESSION_COOKIE, validateCredentials, verifySessionToken } from "./authSession";

export async function setSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, await createSessionToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: getSessionMaxAge(),
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function isAuthenticated() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  return verifySessionToken(token);
}

export async function requireAuth() {
  if (!(await isAuthenticated())) {
    throw new Error("Unauthorized");
  }
}
