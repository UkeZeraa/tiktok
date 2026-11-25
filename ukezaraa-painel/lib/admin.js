import { cookies } from "next/headers";
import { ADMIN_COOKIE, checkAdminToken } from "@/lib/admin-token";

export { ADMIN_COOKIE, makeAdminToken, checkAdminToken } from "@/lib/admin-token";

export async function isAdmin() {
  return checkAdminToken((await cookies()).get(ADMIN_COOKIE)?.value);
}
