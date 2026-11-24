import { NextResponse } from "next/server";
import { del } from "@vercel/blob";
import { getIgSession, graph } from "@/lib/instagram";

export const dynamic = "force-dynamic";

// Publica o contêiner pronto e apaga o vídeo temporário do Vercel Blob.
export async function POST(request) {
  const s = await getIgSession();
  if (!s) return NextResponse.json({ error: "not_logged_in" }, { status: 401 });
  const { container_id, blob_url } = await request.json();

  const pub = await graph(`/${s.ig_id}/media_publish`, {
    token: s.token,
    method: "POST",
    params: { creation_id: container_id },
  });
  if (!pub.ok) return NextResponse.json({ error: pub.json?.error?.message || "Falha ao publicar." }, { status: 400 });

  const media = await graph(`/${pub.json.id}`, { token: s.token, params: { fields: "permalink" } });
  if (blob_url) await del(blob_url).catch(() => {});

  return NextResponse.json({ media_id: pub.json.id, permalink: media.json?.permalink || null });
}
