import { NextResponse } from "next/server";
import { handleUpload } from "@vercel/blob/client";
import { getIgSession } from "@/lib/instagram";

// Gera o token para o navegador enviar o vídeo direto ao Vercel Blob (sem o limite de 4,5 MB da função).
export async function POST(request) {
  const body = await request.json();
  try {
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => {
        const s = await getIgSession();
        if (!s) throw new Error("Conecte o Instagram antes de enviar vídeos.");
        return {
          allowedContentTypes: ["video/mp4", "video/quicktime"],
          maximumSizeInBytes: 1024 * 1024 * 1024,
          addRandomSuffix: true,
        };
      },
    });
    return NextResponse.json(result);
  } catch (e) {
    console.error("[blob] falha ao gerar token:", e.message);
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}

// Diagnóstico sem expor segredos: abra /api/blob no navegador.
export async function GET() {
  const t = process.env.BLOB_READ_WRITE_TOKEN || "";
  const s = await getIgSession();
  return NextResponse.json({
    blob_token_presente: Boolean(t),
    blob_token_formato_ok: t.startsWith("vercel_blob_rw_"),
    instagram_conectado: Boolean(s),
    outras_variaveis_blob: Object.keys(process.env).filter((k) => k.includes("BLOB")),
  });
}
