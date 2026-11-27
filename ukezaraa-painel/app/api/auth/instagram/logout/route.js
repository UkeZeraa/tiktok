import { NextResponse } from "next/server";
import { deleteAccountIfAdmin } from "@/lib/accounts";
import { env, IG_COOKIE } from "@/lib/instagram";

export async function GET() {
  const admin = await deleteAccountIfAdmin("instagram"); // desconecta em todos os aparelhos
  const res = NextResponse.redirect(`${env("SITE_URL")}${admin ? "/conexoes" : "/instagram"}`);
  res.cookies.delete(IG_COOKIE);
  return res;
}
