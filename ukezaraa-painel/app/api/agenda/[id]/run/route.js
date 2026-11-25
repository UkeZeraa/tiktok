import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { runPost } from "@/lib/runner";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

// Publicar agora / tentar de novo as redes que falharam.
export async function POST(_request, { params }) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Entre com a senha do estúdio." }, { status: 401 });
  const { id } = await params;
  try {
    const r = await runPost(id);
    if (r.skipped) return NextResponse.json({ error: "Este post já foi publicado, cancelado ou está em andamento." }, { status: 409 });
    return NextResponse.json(r);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
