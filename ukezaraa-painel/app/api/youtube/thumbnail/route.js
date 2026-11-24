import { NextResponse } from "next/server";
import { getYtSession, accessToken } from "@/lib/youtube";
import { isOurBlob } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Define a capa (miniatura) do vídeo no YouTube. Exige canal verificado (youtube.com/verify).
export async function POST(request) {
  const s = await getYtSession();
  if (!s) return NextResponse.json({ error: "YouTube não conectado." }, { status: 401 });
  const { video_id, cover_url } = await request.json();
  if (!video_id || !cover_url || !isOurBlob(cover_url)) return NextResponse.json({ error: "Capa inválida." }, { status: 400 });

  try {
    const token = await accessToken(s);
    const img = await fetch(cover_url);
    const type = img.headers.get("content-type") || "image/jpeg";
    const bytes = Buffer.from(await img.arrayBuffer());
    if (bytes.length > 2 * 1024 * 1024) throw new Error("A capa passou de 2 MB, o limite do YouTube.");

    const r = await fetch(`https://www.googleapis.com/upload/youtube/v3/thumbnails/set?videoId=${encodeURIComponent(video_id)}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": type, "Content-Length": String(bytes.length) },
      body: bytes,
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d.error?.message || `O YouTube recusou a capa (${r.status}).`);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
