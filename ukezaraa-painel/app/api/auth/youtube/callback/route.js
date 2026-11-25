import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { env, ytRedirectUri, encodeYt, YT_COOKIE } from "@/lib/youtube";
import { saveAccountIfAdmin } from "@/lib/accounts";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const site = env("SITE_URL");
  const back = (q) => NextResponse.redirect(`${site}/youtube?error=${encodeURIComponent(q)}`);

  if (searchParams.get("error")) return back(searchParams.get("error"));
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  if (!code || !state || state !== (await cookies()).get("yt_state")?.value) return back("invalid_state");

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env("GOOGLE_CLIENT_ID"),
      client_secret: env("GOOGLE_CLIENT_SECRET"),
      code,
      grant_type: "authorization_code",
      redirect_uri: ytRedirectUri(),
    }),
    cache: "no-store",
  });
  const tok = await res.json().catch(() => ({}));
  if (!tok.refresh_token) return back(tok.error_description || "O Google não devolveu o acesso permanente. Tente entrar de novo.");

  const ch = await fetch("https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true", {
    headers: { Authorization: `Bearer ${tok.access_token}` },
    cache: "no-store",
  }).then((r) => r.json()).catch(() => ({}));
  const c = ch.items?.[0];
  if (!c) return back("Essa conta do Google não tem canal no YouTube. Escolha a conta (ou o canal de marca) do UkeZaraa.");

  const saved = await saveAccountIfAdmin("youtube", {
    label: c.snippet?.title,
    picture: c.snippet?.thumbnails?.default?.url || "",
    refresh_token: tok.refresh_token,
    channel_id: c.id,
  });

  const out = NextResponse.redirect(saved ? `${site}/conexoes` : `${site}/youtube`);
  out.cookies.delete("yt_state");
  out.cookies.set(
    YT_COOKIE,
    encodeYt({
      refresh_token: tok.refresh_token,
      channel_id: c.id,
      title: c.snippet?.title,
      thumb: c.snippet?.thumbnails?.default?.url || "",
    }),
    { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 180 }
  );
  return out;
}
