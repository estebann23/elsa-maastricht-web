import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Minimal single-account session auth for the ELSA team area.
 *
 * There is no user table: one shared account lives in environment variables,
 * and a successful login issues an HMAC-signed cookie that the proxy checks on
 * every /private request. The cookie carries only a username and an expiry —
 * nothing secret — and the signature is what makes it unforgeable.
 *
 * Imported by proxy.ts, which runs on the Node.js runtime in Next 16, so
 * node:crypto is available here.
 */

export const SESSION_COOKIE = "elsa_session";

/** How long a login lasts before it has to be repeated. */
export const SESSION_TTL_SECONDS = 60 * 60 * 8; // 8 hours

export const DEFAULT_USERNAME = "elsa-admin";

function getUsername(): string {
  return process.env.ADMIN_USERNAME || DEFAULT_USERNAME;
}

function getPassword(): string | undefined {
  return process.env.ADMIN_PASSWORD || undefined;
}

function getSecret(): string | undefined {
  return process.env.ADMIN_SESSION_SECRET || undefined;
}

/**
 * True only when both the password and the signing secret are configured.
 *
 * Everything below fails closed on this: a misconfigured deployment locks the
 * team out rather than letting anyone in.
 */
export function isAuthConfigured(): boolean {
  return Boolean(getPassword() && getSecret());
}

function base64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function sign(payload: string, secret: string): string {
  return base64url(createHmac("sha256", secret).update(payload).digest());
}

/** Length-safe constant-time comparison. */
function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    // Still burn a comparison so the timing does not leak the length.
    timingSafeEqual(bufA, bufA);
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}

/** Checks submitted credentials against the configured account. */
export function verifyCredentials(username: string, password: string): boolean {
  const expectedPassword = getPassword();
  if (!expectedPassword) return false;

  // Both compared in constant time, and neither short-circuits the other.
  const userOk = safeEqual(username, getUsername());
  const passOk = safeEqual(password, expectedPassword);
  return userOk && passOk;
}

/** Issues a signed token of the form `<base64url payload>.<signature>`. */
export function createSessionToken(username: string = getUsername()): string {
  const secret = getSecret();
  if (!secret) throw new Error("ADMIN_SESSION_SECRET is not set.");

  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const payload = base64url(JSON.stringify({ u: username, exp: expiresAt }));
  return `${payload}.${sign(payload, secret)}`;
}

/**
 * Returns the session if the token is intact and unexpired, otherwise null.
 * Any malformed input is treated as "not logged in" rather than throwing.
 */
export function verifySessionToken(
  token: string | undefined,
): { username: string } | null {
  const secret = getSecret();
  if (!token || !secret) return null;

  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;

  if (!safeEqual(signature, sign(payload, secret))) return null;

  try {
    const decoded = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    ) as { u?: string; exp?: number };

    if (!decoded.u || typeof decoded.exp !== "number") return null;
    if (decoded.exp < Math.floor(Date.now() / 1000)) return null;

    return { username: decoded.u };
  } catch {
    return null;
  }
}

/**
 * Keeps a post-login redirect pointing inside this site.
 *
 * Without this, `/login?next=https://evil.example` would turn the login form
 * into an open redirect.
 */
export function safeNextPath(next: string | undefined | null): string {
  if (!next) return "/private/add-member";
  if (!next.startsWith("/") || next.startsWith("//")) {
    return "/private/add-member";
  }
  return next;
}
