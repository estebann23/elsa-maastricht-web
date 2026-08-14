"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import {
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  createSessionToken,
  isAuthConfigured,
  safeNextPath,
  verifyCredentials,
} from "@/lib/auth";
import type { LoginState } from "./types";

function readField(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

export async function login(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const username = readField(formData, "username").trim();
  // Not trimmed: a password may legitimately begin or end with a space.
  const password = readField(formData, "password");
  const next = safeNextPath(readField(formData, "next"));

  if (!isAuthConfigured()) {
    return {
      error:
        "Login is not configured on this deployment. Set ADMIN_PASSWORD and ADMIN_SESSION_SECRET.",
    };
  }

  if (!username || !password) {
    return { error: "Please enter both a username and a password." };
  }

  if (!verifyCredentials(username, password)) {
    // One message for both cases, so this cannot be used to discover whether
    // a given username exists.
    return { error: "Incorrect username or password." };
  }

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, createSessionToken(username), {
    httpOnly: true,
    sameSite: "lax",
    // Plain HTTP on localhost would drop a Secure cookie, so only in production.
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });

  redirect(next);
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
  redirect("/login");
}
