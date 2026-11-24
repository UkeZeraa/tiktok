import { NextResponse } from "next/server";
import { getIgSession, graph } from "@/lib/instagram";

export const dynamic = "force-dynamic";

export async function POST(request) {
  const s = await getIgSession();
  if (!s) return NextResponse.json({ error: "not_logged_in" }, { status: 401 });
  const { container_id } = await request.json();
  const r = await graph(`/${container_id}`, { token: s.token, params: { fields: "status_code,status" } });
  if (!r.ok) return NextResponse.json({ error: r.json?.error?.message }, { status: 400 });
  return NextResponse.json(r.json);
}
