import { NextResponse } from "next/server";
import { del } from "@vercel/blob";
import { db } from "@/lib/db";
import { isAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";
const deny = () => NextResponse.json({ error: "Entre com a senha do estúdio." }, { status: 401 });

// Editar: data/hora, textos, tags ou cancelar/reativar.
export async function PATCH(request, { params }) {
  if (!(await isAdmin())) return deny();
  const { id } = await params;
  const b = await request.json();
  const patch = { updated_at: new Date().toISOString() };
  if (b.scheduled_at) {
    const d = new Date(b.scheduled_at);
    if (isNaN(d)) return NextResponse.json({ error: "Data inválida." }, { status: 400 });
    patch.scheduled_at = d.toISOString();
  }
  if (typeof b.title === "string") patch.title = b.title.slice(0, 100);
  if (typeof b.description === "string") patch.description = b.description.slice(0, 2000);
  if (Array.isArray(b.tags)) patch.tags = b.tags.map(String).slice(0, 30);
  if (b.status === "canceled" || b.status === "scheduled") patch.status = b.status;

  const { data, error } = await db().from("posts").update(patch).eq("id", id).neq("status", "running").select("*").maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Este post está sendo publicado agora ou não existe." }, { status: 409 });
  return NextResponse.json({ post: data });
}

// Excluir: apaga o post e os arquivos guardados.
export async function DELETE(_request, { params }) {
  if (!(await isAdmin())) return deny();
  const { id } = await params;
  const { data, error } = await db().from("posts").delete().eq("id", id).neq("status", "running").select("video_url,cover_url").maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Este post está sendo publicado agora ou não existe." }, { status: 409 });
  await del([data.video_url, data.cover_url].filter(Boolean)).catch(() => {});
  return NextResponse.json({ ok: true });
}
