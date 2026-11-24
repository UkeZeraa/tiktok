import { NextResponse } from "next/server";
import { getSession, tt } from "@/lib/tiktok";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Na Vercel o corpo da requisição tem limite de ~4,5 MB, por isso o envio é em pedaço único até 4 MB.
const MAX_BYTES = 4 * 1024 * 1024;

export async function POST(request) {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: "not_logged_in" }, { status: 401 });

  const form = await request.formData();
  const file = form.get("video");
  const privacy = form.get("privacy_level");
  if (!file || typeof file === "string") return NextResponse.json({ error: "Escolha um vídeo." }, { status: 400 });
  if (!privacy) return NextResponse.json({ error: "Escolha quem pode ver o vídeo." }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "Vídeo maior que 4 MB. Use um corte curto para a demonstração." }, { status: 400 });

  const bool = (k) => form.get(k) === "true";
  const init = await tt("/post/publish/video/init/", {
    token: s.access_token,
    body: {
      post_info: {
        title: String(form.get("title") || "").slice(0, 2200),
        privacy_level: privacy,
        disable_comment: bool("disable_comment"),
        disable_duet: bool("disable_duet"),
        disable_stitch: bool("disable_stitch"),
        brand_content_toggle: bool("brand_content_toggle"),
        brand_organic_toggle: bool("brand_organic_toggle"),
      },
      source_info: {
        source: "FILE_UPLOAD",
        video_size: file.size,
        chunk_size: file.size,
        total_chunk_count: 1,
      },
    },
  });
  if (!init.ok) return NextResponse.json({ error: init.json?.error?.message || "Falha ao iniciar a publicação.", detail: init.json?.error }, { status: 400 });

  const { publish_id, upload_url } = init.json.data;
  const bytes = Buffer.from(await file.arrayBuffer());
  const up = await fetch(upload_url, {
    method: "PUT",
    headers: {
      "Content-Type": file.type || "video/mp4",
      "Content-Length": String(bytes.length),
      "Content-Range": `bytes 0-${bytes.length - 1}/${bytes.length}`,
    },
    body: bytes,
  });
  if (!up.ok) return NextResponse.json({ error: `Falha no envio do arquivo (${up.status}).`, publish_id }, { status: 400 });

  return NextResponse.json({ publish_id });
}
