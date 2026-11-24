import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { GRAPH, env, igRedirectUri, encodeIg, graph, IG_COOKIE } from "@/lib/instagram";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const site = env("SITE_URL");
  const back = (q) => NextResponse.redirect(`${site}/instagram${q ? `?error=${encodeURIComponent(q)}` : ""}`);

  if (searchParams.get("error")) return back(searchParams.get("error_description") || searchParams.get("error"));
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const expected = (await cookies()).get("ig_state")?.value;
  if (!code || !state || state !== expected) return back("invalid_state");

  // 1. troca o código por token (Login unificado devolve um token de usuário do sistema)
  const tokUrl = new URL(`${GRAPH}/oauth/access_token`);
  tokUrl.searchParams.set("client_id", env("META_APP_ID"));
  tokUrl.searchParams.set("client_secret", env("META_APP_SECRET"));
  tokUrl.searchParams.set("redirect_uri", igRedirectUri());
  tokUrl.searchParams.set("code", code);
  const tokRes = await fetch(tokUrl, { cache: "no-store" });
  const tok = await tokRes.json().catch(() => ({}));
  if (!tok.access_token) return back(tok.error?.message || "token_failed");

  // 2. descobre a conta do Instagram liberada para o app
  const acc = await graph("/me/assigned_instagram_accounts", {
    token: tok.access_token,
    params: { fields: "id,username,profile_picture_url" },
  });
  const list = acc.json?.data || [];
  if (!list.length) return back(acc.json?.error?.message || "Nenhuma conta do Instagram foi liberada no login.");
  const preferred = process.env.INSTAGRAM_USERNAME;
  const ig = list.find((a) => preferred && a.username === preferred) || list[0];

  const out = NextResponse.redirect(`${site}/instagram`);
  out.cookies.delete("ig_state");
  out.cookies.set(
    IG_COOKIE,
    encodeIg({ token: tok.access_token, ig_id: ig.id, username: ig.username, picture: ig.profile_picture_url || "" }),
    { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: tok.expires_in || 60 * 60 * 24 * 60 }
  );
  return out;
}
