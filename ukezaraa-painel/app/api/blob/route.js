import { NextResponse } from "next/server";
import { handleUploadPresigned } from "@vercel/blob/client";
import { issueSignedToken } from "@vercel/blob";
import { getIgSession } from "@/lib/instagram";
import { getYtSession } from "@/lib/youtube";

// Loja Blob conectada pelo formato novo da Vercel (OIDC + BLOB_STORE_ID, sem BLOB_READ_WRITE_TOKEN).
// O navegador recebe um link pré-assinado e envia o vídeo direto ao Blob, sem o limite de 4,5 MB da função.
const TYPES = ["video/mp4", "video/quicktime"];
const MAX = 1024 * 1024 * 1024;

export async function POST(request) {
  const body = await request.json();
  try {
    const result = await handleUploadPresigned({
      body,
      request,
      getSignedToken: async (pathname) => {
        const ok = (await getIgSession()) || (await getYtSession());
        if (!ok) throw new Error("Conecte o Instagram ou o YouTube antes de enviar vídeos.");
        const token = await issueSignedToken({
          pathname,
          operations: ["put"],
          allowedContentTypes: TYPES,
          maximumSizeInBytes: MAX,
        });
        return {
          token,
          urlOptions: { allowedContentTypes: TYPES, maximumSizeInBytes: MAX, addRandomSuffix: true },
        };
      },
    });
    return NextResponse.json(result);
  } catch (e) {
    console.error("[blob] falha ao gerar link de envio:", e.message);
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}

// Diagnóstico sem expor segredos: abra /api/blob no navegador.
export async function GET() {
  const s = await getIgSession();
  return NextResponse.json({
    loja_blob_id_presente: Boolean(process.env.BLOB_STORE_ID),
    instagram_conectado: Boolean(s),
    youtube_conectado: Boolean(await getYtSession()),
  });
}
