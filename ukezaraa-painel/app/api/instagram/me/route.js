import { NextResponse } from "next/server";
import { getIgSession, graph } from "@/lib/instagram";

export const dynamic = "force-dynamic";

export async function GET() {
  const s = await getIgSession();
  if (!s) return NextResponse.json({ error: "not_logged_in" }, { status: 401 });
  const limit = await graph(`/${s.ig_id}/content_publishing_limit`, {
    token: s.token,
    params: { fields: "quota_usage,config" },
  });
  return NextResponse.json({
    username: s.username,
    picture: s.picture,
    limit: limit.ok ? limit.json?.data?.[0] || null : null,
  });
}
