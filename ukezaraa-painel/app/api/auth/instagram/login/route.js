import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { env, igRedirectUri } from "@/lib/instagram";

export async function GET() {
  const state = crypto.randomBytes(16).toString("hex");
  const url = new URL("https://www.facebook.com/v26.0/dialog/oauth");
  url.searchParams.set("client_id", env("META_APP_ID"));
  url.searchParams.set("config_id", env("META_CONFIG_ID"));
  url.searchParams.set("redirect_uri", igRedirectUri());
  url.searchParams.set("response_type", "code");
  url.searchParams.set("override_default_response_type", "true");
  url.searchParams.set("state", state);
  url.searchParams.set("prompt", "login");

  const res = NextResponse.redirect(url.toString());
  res.cookies.set("ig_state", state, { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 600 });
  return res;
}
