import { NextResponse } from "next/server";
import { ADMIN_COOKIE, makeAdminToken } from "@/lib/admin";
import { safeEqual } from "@/lib/secure";

export async function POST(request) {
  const { password } = await request.json().catch(() => ({}));
  const real = process.env.ADMIN_PASSWORD;
  if (!real || !process.env.TOKEN_KEY) return NextResponse.json({ error: "Configure ADMIN_PASSWORD e TOKEN_KEY na Vercel." }, { status: 500 });
  if (!password || !safeEqual(password, real)) {
    await new Promise((r) => setTimeout(r, 800));
    return NextResponse.json({ error: "Senha incorreta." }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, await makeAdminToken(30), { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 30 * 86400 });
  return res;
}
