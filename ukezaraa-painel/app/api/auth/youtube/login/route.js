import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { env, ytRedirectUri, YT_SCOPES } from "@/lib/youtube";

export async function GET() {
  const state = crypto.randomBytes(16).toString("hex");
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", env("GOOGLE_CLIENT_ID"));
  url.searchParams.set("redirect_uri", ytRedirectUri());
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", YT_SCOPES);
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent select_account");
  url.searchParams.set("include_granted_scopes", "true");
  url.searchParams.set("state", state);

  const res = NextResponse.redirect(url.toString());
  res.cookies.set("yt_state", state, { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 600 });
  return res;
}
