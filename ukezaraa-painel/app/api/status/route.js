import { NextResponse } from "next/server";
import { getSession, tt } from "@/lib/tiktok";

export const dynamic = "force-dynamic";

export async function POST(request) {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: "not_logged_in" }, { status: 401 });
  const { publish_id } = await request.json();
  const r = await tt("/post/publish/status/fetch/", { token: s.access_token, body: { publish_id } });
  return NextResponse.json(r.ok ? r.json.data : { error: r.json?.error }, { status: r.ok ? 200 : 400 });
}
