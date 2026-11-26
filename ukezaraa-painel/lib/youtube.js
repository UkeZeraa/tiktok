import { cookies } from "next/headers";

export const YT_COOKIE = "yt_session";
export const YT_SCOPES = [
  "https://www.googleapis.com/auth/youtube.upload",
  "https://www.googleapis.com/auth/youtube.readonly",
  "https://www.googleapis.com/auth/youtube.force-ssl", // publicar o comentário do canal
].join(" ");

// Publica um comentário do próprio canal no vídeo (a API não permite fixar: isso é feito no app).
export async function postYouTubeComment(token, videoId, text) {
  const r = await fetch("https://www.googleapis.com/youtube/v3/commentThreads?part=snippet", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ snippet: { videoId, topLevelComment: { snippet: { textOriginal: String(text).slice(0, 10000) } } } }),
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error?.message || `YouTube recusou o comentário (${r.status}).`);
  return d.id;
}

export function env(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Variável de ambiente ausente: ${name}`);
  return v;
}

export function ytRedirectUri() {
  return `${env("SITE_URL")}/api/auth/youtube/callback`;
}

export async function getYtSession() {
  const raw = (await cookies()).get(YT_COOKIE)?.value;
  if (!raw) return null;
  try {
    return JSON.parse(Buffer.from(raw, "base64url").toString("utf8"));
  } catch {
    return null;
  }
}

export function encodeYt(data) {
  return Buffer.from(JSON.stringify(data), "utf8").toString("base64url");
}

// Troca o refresh_token guardado por um access_token novo (vale ~1 hora).
export async function accessToken(session) {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env("GOOGLE_CLIENT_ID"),
      client_secret: env("GOOGLE_CLIENT_SECRET"),
      refresh_token: session.refresh_token,
      grant_type: "refresh_token",
    }),
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!data.access_token) throw new Error(data.error_description || data.error || "Não foi possível renovar o acesso ao YouTube.");
  return data.access_token;
}
