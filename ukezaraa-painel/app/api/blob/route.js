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
      onUploadCompleted: async () => {},
    });
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
