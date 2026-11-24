import { NextResponse } from "next/server";
import { del } from "@vercel/blob";
import { getYtSession, accessToken } from "@/lib/youtube";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

// Pega o vídeo já enviado ao Vercel Blob e repassa para o YouTube (upload resumível, servidor para servidor).
export async function POST(request) {
  const s = await getYtSession();
  if (!s) return NextResponse.json({ error: "not_logged_in" }, { status: 401 });
  const { blob_url, title, description, tags, privacy, ai, keep_blob } = await request.json();
  if (!blob_url || !title) return NextResponse.json({ error: "Vídeo e título são obrigatórios." }, { status: 400 });

  try {
    const token = await accessToken(s);
    const head = await fetch(blob_url, { method: "HEAD" });
    const size = Number(head.headers.get("content-length") || 0);
    const type = head.headers.get("content-type") || "video/mp4";
    if (!size) throw new Error("Não consegui ler o tamanho do vídeo enviado.");

    const meta = {
      snippet: {
        title: String(title).slice(0, 100),
        description: String(description || "").slice(0, 5000),
        tags: Array.isArray(tags) ? tags.slice(0, 30) : [],
        categoryId: "24", // Entretenimento
      },
      status: {
        privacyStatus: ["public", "unlisted", "private"].includes(privacy) ? privacy : "private",
        selfDeclaredMadeForKids: false,
        containsSyntheticMedia: Boolean(ai),
      },
    };

    const init = await fetch("https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json; charset=UTF-8",
        "X-Upload-Content-Length": String(size),
        "X-Upload-Content-Type": type,
      },
      body: JSON.stringify(meta),
    });
    const sessionUrl = init.headers.get("location");
    if (!init.ok || !sessionUrl) {
      const err = await init.json().catch(() => ({}));
      throw new Error(err.error?.message || `O YouTube recusou o início do envio (${init.status}).`);
    }

    const video = await fetch(blob_url);
    const up = await fetch(sessionUrl, {
      method: "PUT",
      headers: { "Content-Type": type, "Content-Length": String(size) },
      body: video.body,
      duplex: "half",
    });
    const data = await up.json().catch(() => ({}));
    if (!up.ok || !data.id) throw new Error(data.error?.message || `Falha no envio ao YouTube (${up.status}).`);

    if (!keep_blob) await del(blob_url).catch(() => {});
    return NextResponse.json({
      id: data.id,
      url: `https://youtu.be/${data.id}`,
      privacy: data.status?.privacyStatus,
    });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
