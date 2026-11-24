import { NextResponse } from "next/server";
import { getIgSession, graph } from "@/lib/instagram";

export const dynamic = "force-dynamic";

// Cria o contêiner do Reel. O Instagram baixa o vídeo da URL pública do Vercel Blob.
export async function POST(request) {
  const s = await getIgSession();
  if (!s) return NextResponse.json({ error: "not_logged_in" }, { status: 401 });
  const { video_url, caption, share_to_feed, is_ai_generated } = await request.json();
  if (!video_url) return NextResponse.json({ error: "Vídeo ausente." }, { status: 400 });

  const params = {
    media_type: "REELS",
    video_url,
    caption: String(caption || "").slice(0, 2200),
    share_to_feed: share_to_feed ? "true" : "false",
  };
  if (is_ai_generated) params.is_ai_generated = "true";

  const r = await graph(`/${s.ig_id}/media`, { token: s.token, method: "POST", params });
  if (!r.ok) return NextResponse.json({ error: r.json?.error?.message || "Falha ao criar o Reel." }, { status: 400 });
  return NextResponse.json({ container_id: r.json.id });
}
