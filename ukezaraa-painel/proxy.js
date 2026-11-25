import { NextResponse } from "next/server";
import { ADMIN_COOKIE, checkAdminToken } from "@/lib/admin-token";

// Páginas e rotas do estúdio exigem a senha de administrador.
// Ficam abertas: página inicial, termos, privacidade, /dashboard do TikTok (usado na revisão),
// logins das redes, o despertador (/api/cron tem chave própria) e a tela de entrada.
export async function proxy(request) {
  if (!process.env.ADMIN_PASSWORD) return NextResponse.next(); // senha ainda não configurada
  const ok = await checkAdminToken(request.cookies.get(ADMIN_COOKIE)?.value);
  if (ok) return NextResponse.next();

  const { pathname, search } = request.nextUrl;
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Entre no estúdio com a senha de administrador." }, { status: 401 });
  }
  const url = request.nextUrl.clone();
  url.pathname = "/entrar";
  url.search = `?next=${encodeURIComponent(pathname + search)}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    "/studio/:path*",
    "/agenda/:path*",
    "/conexoes/:path*",
    "/instagram/:path*",
    "/youtube/:path*",
    "/api/agenda/:path*",
    "/api/blob/:path*",
    "/api/tiktok/:path*",
    "/api/instagram/:path*",
    "/api/youtube/:path*",
  ],
};
