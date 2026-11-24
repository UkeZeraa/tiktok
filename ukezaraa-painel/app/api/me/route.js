import { NextResponse } from "next/server";
import { getSession, tt } from "@/lib/tiktok";

export const dynamic = "force-dynamic";

export async function GET() {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: "not_logged_in" }, { status: 401 });

  const [user, creator] = await Promise.all([
    tt("/user/info/?fields=open_id,avatar_url,display_name", { token: s.access_token, method: "GET" }),
    tt("/post/publish/creator_info/query/", { token: s.access_token, body: {} }),
  ]);

  if (user.status === 401) return NextResponse.json({ error: "session_expired" }, { status: 401 });

  return NextResponse.json({
    user: user.json?.data?.user || null,
    creator: creator.ok ? creator.json.data : null,
    creator_error: creator.ok ? null : creator.json?.error,
  });
}
