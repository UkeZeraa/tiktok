import { NextResponse } from "next/server";
import { ADMIN_COOKIE, makeAdminToken } from "@/lib/admin";
import { safeEqual } from "@/lib/secure";

export async function POST(request) {
  const { password, remember } = await request.json().catch(() => ({}));
  const real = process.env.ADMIN_PASSWORD;
  if (!real || !process.env.TOKEN_KEY) return NextResponse.json({ error: "Configure ADMIN_PASSWORD e TOKEN_KEY na Vercel." }, { status: 500 });
  if (!password || !safeEqual(password, real)) {
    await new Promise((r) => setTimeout(r, 800));
    return NextResponse.json({ error: "Senha incorreta." }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  const days = remember ? 90 : 0.5;
  res.cookies.set(ADMIN_COOKIE, await makeAdminToken(days), { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: Math.round(days * 86400) });
  return res;
}
