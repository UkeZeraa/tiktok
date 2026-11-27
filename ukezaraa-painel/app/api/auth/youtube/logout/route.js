import { NextResponse } from "next/server";
import { deleteAccountIfAdmin } from "@/lib/accounts";
import { env, YT_COOKIE } from "@/lib/youtube";

export async function GET() {
  const admin = await deleteAccountIfAdmin("youtube"); // desconecta em todos os aparelhos
  const res = NextResponse.redirect(`${env("SITE_URL")}${admin ? "/conexoes" : "/youtube"}`);
  res.cookies.delete(YT_COOKIE);
  return res;
}
