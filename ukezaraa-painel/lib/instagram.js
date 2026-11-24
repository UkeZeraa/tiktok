import { cookies } from "next/headers";

// Instagram API com Login unificado (Facebook Login for Business + config_id).
export const GRAPH = "https://graph.facebook.com/v26.0";
export const IG_COOKIE = "ig_session";

export function env(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Variável de ambiente ausente: ${name}`);
  return v;
}

export function igRedirectUri() {
  return `${env("SITE_URL")}/api/auth/instagram/callback`;
}

export async function getIgSession() {
  const store = await cookies();
  const raw = store.get(IG_COOKIE)?.value;
  if (!raw) return null;
  try {
    return JSON.parse(Buffer.from(raw, "base64url").toString("utf8"));
  } catch {
    return null;
  }
}

export function encodeIg(data) {
  return Buffer.from(JSON.stringify(data), "utf8").toString("base64url");
}

export async function graph(path, { token, method = "GET", params = {} } = {}) {
  const url = new URL(`${GRAPH}${path}`);
  const body = new URLSearchParams({ ...params, access_token: token });
  let res;
  if (method === "GET") {
    body.forEach((v, k) => url.searchParams.set(k, v));
    res = await fetch(url, { cache: "no-store" });
  } else {
    res = await fetch(url, { method, body, cache: "no-store" });
  }
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok && !json.error, json };
}
