import { NextResponse } from "next/server";
import { env, IG_COOKIE } from "@/lib/instagram";

export async function GET() {
  const res = NextResponse.redirect(`${env("SITE_URL")}/instagram`);
  res.cookies.delete(IG_COOKIE);
  return res;
}
