import { NextResponse } from "next/server";
import { getYtSession } from "@/lib/youtube";

export const dynamic = "force-dynamic";

export async function GET() {
  const s = await getYtSession();
  if (!s) return NextResponse.json({ error: "not_logged_in" }, { status: 401 });
  return NextResponse.json({ channel_id: s.channel_id, title: s.title, thumb: s.thumb });
}
