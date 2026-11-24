import { NextResponse } from "next/server";
import { env, YT_COOKIE } from "@/lib/youtube";

export async function GET() {
  const res = NextResponse.redirect(`${env("SITE_URL")}/youtube`);
  res.cookies.delete(YT_COOKIE);
  return res;
}
