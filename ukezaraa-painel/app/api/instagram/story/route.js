import { NextResponse } from "next/server";
import { getIgSession, graph } from "@/lib/instagram";
import { isOurBlob } from "@/lib/auth";
import { del } from "@vercel/blob";

export const dynamic = "force-dynamic";
export const maxDuration = 180;

// Publica um Story agora (imagem JPEG ou vídeo vertical já enviado ao Blob).
export async function POST(request) {
  const s = await getIgSession();
  if (!s) return NextResponse.json({ error: "Conecte o Instagram em Conexões." }, { status: 401 });
  const { media_url, kind } = await request.json();
  if (!isOurBlob(media_url)) return NextResponse.json({ error: "Arquivo inválido." }, { status: 400 });

  const params = { media_type: "STORIES" };
  if (kind === "video") params.video_url = media_url; else params.image_url = media_url;
  const c = await graph(`/${s.ig_id}/media`, { token: s.token, method: "POST", params });
  if (!c.ok) return NextResponse.json({ error: c.json?.error?.message || "O Instagram recusou o Story." }, { status: 400 });

  for (let i = 0; i < 35; i++) {
    await new Promise((r) => setTimeout(r, i === 0 ? 2000 : 4000));
    const st = await graph(`/${c.json.id}`, { token: s.token, params: { fields: "status_code,status" } });
    if (st.json?.status_code === "FINISHED") {
      const pub = await graph(`/${s.ig_id}/media_publish`, { token: s.token, method: "POST", params: { creation_id: c.json.id } });
      await del(media_url).catch(() => {});
      if (!pub.ok) return NextResponse.json({ error: pub.json?.error?.message || "Falha ao publicar." }, { status: 400 });
      return NextResponse.json({ ok: true, media_id: pub.json.id });
    }
    if (["ERROR", "EXPIRED"].includes(st.json?.status_code)) {
      return NextResponse.json({ error: `O Instagram recusou: ${st.json.status || st.json.status_code}` }, { status: 400 });
    }
  }
  return NextResponse.json({ error: "O Instagram demorou demais para processar." }, { status: 504 });
}
