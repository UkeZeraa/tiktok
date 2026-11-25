import { NextResponse } from "next/server";
import { runDue } from "@/lib/runner";
import { safeEqual } from "@/lib/secure";
import { dbReady } from "@/lib/db";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

// Despertador: o cron-job.org chama esta rota a cada 5 minutos.
// URL: https://SEU-SITE/api/cron?key=CRON_SECRET
export async function GET(request) {
  const secret = process.env.CRON_SECRET;
  const url = new URL(request.url);
  const given = url.searchParams.get("key") || (request.headers.get("authorization") || "").replace(/^Bearer /, "");
  if (!secret || !given || !safeEqual(given, secret)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!dbReady()) return NextResponse.json({ error: "Banco não configurado." }, { status: 500 });
  try {
    const ran = await runDue(1);
    return NextResponse.json({ ok: true, ran: ran.length, posts: ran.map((r) => ({ id: r.id, status: r.status })) });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
