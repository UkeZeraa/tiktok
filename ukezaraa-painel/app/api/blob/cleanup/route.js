import { NextResponse } from "next/server";
import { del } from "@vercel/blob";
import { anySession, isOurBlob } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Apaga os arquivos temporários (vídeo e capa) depois que todas as redes terminaram.
export async function POST(request) {
  if (!(await anySession())) return NextResponse.json({ error: "not_logged_in" }, { status: 401 });
  const { urls } = await request.json();
  const list = (Array.isArray(urls) ? urls : []).filter(isOurBlob);
  if (list.length) await del(list).catch(() => {});
  return NextResponse.json({ deleted: list.length });
}
