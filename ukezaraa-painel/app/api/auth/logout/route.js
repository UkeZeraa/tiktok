import { NextResponse } from "next/server";
import { env, TOKEN_COOKIE } from "@/lib/tiktok";

export async function GET() {
  const res = NextResponse.redirect(`${env("SITE_URL")}/`);
  res.cookies.delete(TOKEN_COOKIE);
  return res;
}
