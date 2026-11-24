import { NextResponse } from "next/server";
import { getSession, tt } from "@/lib/tiktok";
import { isOurBlob } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const MB = 1024 * 1024;

// Publica no TikTok (Direct Post) a partir do vídeo já enviado ao Vercel Blob.
// O servidor lê o vídeo em pedaços do Blob e repassa ao TikTok, sem o limite de 4,5 MB do navegador.
export async function POST(request) {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: "TikTok não conectado." }, { status: 401 });
  const b = await request.json();
  if (!b.blob_url || !isOurBlob(b.blob_url)) return NextResponse.json({ error: "Vídeo inválido." }, { status: 400 });
  if (!b.privacy_level) return NextResponse.json({ error: "Escolha quem pode ver o vídeo no TikTok." }, { status: 400 });

  try {
    const head = await fetch(b.blob_url, { method: "HEAD" });
    const size = Number(head.headers.get("content-length") || 0);
    const type = head.headers.get("content-type") || "video/mp4";
    if (!size) throw new Error("Não consegui ler o tamanho do vídeo.");

    // Regras do TikTok: pedaços de 5 a 64 MB; até 64 MB vai inteiro; o último pedaço leva o resto.
    const chunk = size <= 64 * MB ? size : 10 * MB;
    const total = size <= 64 * MB ? 1 : Math.floor(size / chunk);

    const post_info = {
      title: String(b.caption || "").slice(0, 2200),
      privacy_level: b.privacy_level,
      disable_comment: !b.allow_comment,
      disable_duet: !b.allow_duet,
      disable_stitch: !b.allow_stitch,
      brand_content_toggle: Boolean(b.branded),
      brand_organic_toggle: Boolean(b.your_brand),
    };
    if (Number.isFinite(b.cover_ms) && b.cover_ms > 0) post_info.video_cover_timestamp_ms = Math.round(b.cover_ms);
    if (b.ai) post_info.is_aigc = true;

    const init = await tt("/post/publish/video/init/", {
      token: s.access_token,
      body: {
        post_info,
        source_info: { source: "FILE_UPLOAD", video_size: size, chunk_size: chunk, total_chunk_count: total },
      },
    });
    if (!init.ok) throw new Error(init.json?.error?.message || "O TikTok recusou o início da publicação.");
    const { publish_id, upload_url } = init.json.data;

    for (let i = 0; i < total; i++) {
      const start = i * chunk;
      const end = i === total - 1 ? size - 1 : start + chunk - 1;
      const part = await fetch(b.blob_url, { headers: { Range: `bytes=${start}-${end}` } });
      const bytes = Buffer.from(await part.arrayBuffer());
      const up = await fetch(upload_url, {
        method: "PUT",
        headers: {
          "Content-Type": type,
          "Content-Length": String(bytes.length),
          "Content-Range": `bytes ${start}-${end}/${size}`,
        },
        body: bytes,
      });
      if (!up.ok) throw new Error(`Falha ao enviar a parte ${i + 1} de ${total} ao TikTok (${up.status}).`);
    }

    return NextResponse.json({ publish_id });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
