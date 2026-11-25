import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { API, env, redirectUri, encodeSession, TOKEN_COOKIE } from "@/lib/tiktok";
import { saveAccountIfAdmin } from "@/lib/accounts";

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

  // Para os agendamentos: guarda as chaves (com renovação) no banco, se for o administrador.
  const info = await fetch(`${API}/user/info/?fields=open_id,avatar_url,display_name`, {
    headers: { Authorization: `Bearer ${data.access_token}` },
    cache: "no-store",
  }).then((r) => r.json()).catch(() => ({}));
  const u = info?.data?.user || {};
  const saved = await saveAccountIfAdmin("tiktok", {
    label: u.display_name || "TikTok",
    picture: u.avatar_url || "",
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: Date.now() + (data.expires_in || 86400) * 1000,
    open_id: data.open_id,
  });

  const out = NextResponse.redirect(saved ? `${site}/conexoes` : `${site}/dashboard`);
  out.cookies.delete("tt_state");
  out.cookies.set(
    TOKEN_COOKIE,
    encodeSession({ access_token: data.access_token, open_id: data.open_id, scope: data.scope }),
    { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: data.expires_in || 86400 }
  );
  return out;
}
