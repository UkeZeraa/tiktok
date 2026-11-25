import { NextResponse } from "next/server";
import { ADMIN_COOKIE } from "@/lib/admin";

export async function GET(request) {
  const res = NextResponse.redirect(new URL("/entrar", request.url));
  res.cookies.delete(ADMIN_COOKIE);
  return res;
}
