import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { env, redirectUri, SCOPES } from "@/lib/tiktok";

export async function GET() {
  const state = crypto.randomBytes(16).toString("hex");
  const url = new URL("https://www.tiktok.com/v2/auth/authorize/");
  url.searchParams.set("client_key", env("TIKTOK_CLIENT_KEY"));
  url.searchParams.set("scope", SCOPES);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("redirect_uri", redirectUri());
  url.searchParams.set("state", state);

  const res = NextResponse.redirect(url.toString());
  res.cookies.set("tt_state", state, { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 600 });
  return res;
}
