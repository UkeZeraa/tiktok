import { NextResponse } from "next/server";
import { deleteAccountIfAdmin } from "@/lib/accounts";
import { env, TOKEN_COOKIE } from "@/lib/tiktok";

export async function GET() {
  const admin = await deleteAccountIfAdmin("tiktok"); // desconecta em todos os aparelhos
  const res = NextResponse.redirect(`${env("SITE_URL")}${admin ? "/conexoes" : "/"}`);
  res.cookies.delete(TOKEN_COOKIE);
  return res;
}
