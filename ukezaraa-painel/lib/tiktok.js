import { cookies } from "next/headers";

export const API = "https://open.tiktokapis.com/v2";
export const SCOPES = "user.info.basic,video.upload,video.publish";
export const TOKEN_COOKIE = "tt_session";

export function env(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Variável de ambiente ausente: ${name}`);
  return v;
}

export function redirectUri() {
  return `${env("SITE_URL")}/api/auth/callback`;
}

export async function getSession() {
  const store = await cookies();
  const raw = store.get(TOKEN_COOKIE)?.value;
  if (!raw) return null;
  try {
    return JSON.parse(Buffer.from(raw, "base64url").toString("utf8"));
  } catch {
    return null;
  }
}

export function encodeSession(data) {
  return Buffer.from(JSON.stringify(data), "utf8").toString("base64url");
}

export async function tt(path, { token, method = "POST", body } = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { "Content-Type": "application/json; charset=UTF-8" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok && (!json.error || json.error.code === "ok"), status: res.status, json };
}
