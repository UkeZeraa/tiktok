import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAdmin } from "@/lib/admin";
import { isOurBlob } from "@/lib/auth";

export const dynamic = "force-dynamic";
const PLATS = ["tiktok", "instagram", "youtube"];

export async function GET(request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Entre com a senha do estúdio." }, { status: 401 });
  const u = new URL(request.url);
  let q = db().from("posts").select("*").order("scheduled_at", { ascending: true });
  if (u.searchParams.get("from")) q = q.gte("scheduled_at", u.searchParams.get("from"));
  if (u.searchParams.get("to")) q = q.lte("scheduled_at", u.searchParams.get("to"));
  const { data, error } = await q.limit(500);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ posts: data });
}

export async function POST(request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Entre com a senha do estúdio." }, { status: 401 });
  const b = await request.json();
  const when = new Date(b.scheduled_at);
  if (isNaN(when)) return NextResponse.json({ error: "Data e hora inválidas." }, { status: 400 });
  if (!isOurBlob(b.video_url)) return NextResponse.json({ error: "Vídeo inválido." }, { status: 400 });
  if (b.cover_url && !isOurBlob(b.cover_url)) return NextResponse.json({ error: "Capa inválida." }, { status: 400 });
  const platforms = Object.fromEntries(Object.entries(b.platforms || {}).filter(([k]) => PLATS.includes(k)));
  if (!Object.keys(platforms).length) return NextResponse.json({ error: "Escolha pelo menos uma rede." }, { status: 400 });

  const { data, error } = await db().from("posts").insert({
    scheduled_at: when.toISOString(),
    title: String(b.title || "").slice(0, 100),
    description: String(b.description || "").slice(0, 2000),
    tags: (b.tags || []).map(String).slice(0, 30),
    ai: Boolean(b.ai),
    video_url: b.video_url,
    video_name: b.video_name || null,
    cover_url: b.cover_url || null,
    comment: b.comment ? String(b.comment).slice(0, 2000) : null,
    platforms,
  }).select("*").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ post: data });
}
