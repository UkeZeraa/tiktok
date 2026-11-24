import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { API, env, redirectUri, encodeSession, TOKEN_COOKIE } from "@/lib/tiktok";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const site = env("SITE_URL");
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const store = await cookies();
  const expected = store.get("tt_state")?.value;

  if (searchParams.get("error")) {
    return NextResponse.redirect(`${site}/dashboard?error=${encodeURIComponent(searchParams.get("error_description") || searchParams.get("error"))}`);
  }
  if (!code || !state || state !== expected) {
    return NextResponse.redirect(`${site}/dashboard?error=invalid_state`);
  }

  const res = await fetch(`${API}/oauth/token/`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_key: env("TIKTOK_CLIENT_KEY"),
      client_secret: env("TIKTOK_CLIENT_SECRET"),
      code,
      grant_type: "authorization_code",
      redirect_uri: redirectUri(),
    }),
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!data.access_token) {
    return NextResponse.redirect(`${site}/dashboard?error=${encodeURIComponent(data.error_description || "token_failed")}`);
  }

  const out = NextResponse.redirect(`${site}/dashboard`);
  out.cookies.delete("tt_state");
  out.cookies.set(
    TOKEN_COOKIE,
    encodeSession({ access_token: data.access_token, open_id: data.open_id, scope: data.scope }),
    { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: data.expires_in || 86400 }
  );
  return out;
}
