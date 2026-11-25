import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { dbReady } from "@/lib/db";
import { listAccounts } from "@/lib/accounts";

export const dynamic = "force-dynamic";

// Quais redes estão salvas no banco (prontas para agendamentos).
export async function GET() {
  const admin = await isAdmin();
  if (!dbReady()) return NextResponse.json({ db: false, admin, accounts: [] });
  if (!admin) return NextResponse.json({ db: true, admin, accounts: [] });
  try {
    return NextResponse.json({ db: true, admin, accounts: await listAccounts() });
  } catch (e) {
    return NextResponse.json({ db: true, admin, accounts: [], error: e.message });
  }
}
