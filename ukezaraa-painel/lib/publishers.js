// Publicação feita pelo servidor (sem navegador), usada pelos agendamentos.
import { getAccount, updateAccountSecret } from "@/lib/accounts";
import { GRAPH } from "@/lib/instagram";

const MB = 1024 * 1024;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function head(url) {
  const h = await fetch(url, { method: "HEAD" });
  const size = Number(h.headers.get("content-length") || 0);
  if (!h.ok || !size) throw new Error("O vídeo agendado não foi encontrado no armazenamento.");
  return { size, type: h.headers.get("content-type") || "video/mp4" };
}

export function buildCaption(post) {
  const tags = (post.tags || []).map((t) => `#${t}`).join(" ");
  return [String(post.description || "").trim(), tags].filter(Boolean).join("\n\n").slice(0, 2200);
}

/* ---------------- TikTok ---------------- */

async function tiktokToken() {
  const acc = await getAccount("tiktok");
  if (!acc) throw new Error("TikTok não está salvo para agendamentos. Reconecte em Conexões.");
  if (acc.expires_at && acc.expires_at - Date.now() > 5 * 60 * 1000) return acc.access_token;
  if (!acc.refresh_token) throw new Error("O acesso ao TikTok expirou. Reconecte em Conexões.");
  const r = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_key: process.env.TIKTOK_CLIENT_KEY,
      client_secret: process.env.TIKTOK_CLIENT_SECRET,
      grant_type: "refresh_token",
      refresh_token: acc.refresh_token,
    }),
  });
  const d = await r.json().catch(() => ({}));
  if (!d.access_token) throw new Error("Não consegui renovar o acesso ao TikTok. Reconecte em Conexões.");
  const { label, picture, updated_at, ...secret } = acc;
  await updateAccountSecret("tiktok", {
    ...secret,
    access_token: d.access_token,
    refresh_token: d.refresh_token || acc.refresh_token,
    expires_at: Date.now() + (d.expires_in || 86400) * 1000,
  });
  return d.access_token;
}

async function tt(path, token, body) {
  const r = await fetch(`https://open.tiktokapis.com/v2${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json; charset=UTF-8" },
    body: JSON.stringify(body),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || (j.error && j.error.code !== "ok")) throw new Error(j.error?.message || `Erro do TikTok (${r.status}).`);
  return j.data;
}

export async function publishTikTok(post) {
  const o = post.platforms.tiktok || {};
  const token = await tiktokToken();
  const creator = await tt("/post/publish/creator_info/query/", token, {});
  if (!creator.privacy_level_options?.includes(o.privacy_level)) {
    throw new Error("A privacidade escolhida não está disponível agora para esta conta do TikTok.");
  }
  const { size, type } = await head(post.video_url);
  const chunk = size <= 64 * MB ? size : 10 * MB;
  const total = size <= 64 * MB ? 1 : Math.floor(size / chunk);

  const post_info = {
    title: buildCaption(post),
    privacy_level: o.privacy_level,
    disable_comment: !o.allow_comment,
    disable_duet: !o.allow_duet,
    disable_stitch: !o.allow_stitch,
    brand_content_toggle: Boolean(o.branded),
    brand_organic_toggle: Boolean(o.your_brand),
  };
  if (o.cover_ms > 0) post_info.video_cover_timestamp_ms = Math.round(o.cover_ms);
  if (post.ai) post_info.is_aigc = true;

  const init = await tt("/post/publish/video/init/", token, {
    post_info,
    source_info: { source: "FILE_UPLOAD", video_size: size, chunk_size: chunk, total_chunk_count: total },
  });

  for (let i = 0; i < total; i++) {
    const start = i * chunk;
    const end = i === total - 1 ? size - 1 : start + chunk - 1;
    const bytes = Buffer.from(await (await fetch(post.video_url, { headers: { Range: `bytes=${start}-${end}` } })).arrayBuffer());
    const up = await fetch(init.upload_url, {
      method: "PUT",
      headers: { "Content-Type": type, "Content-Length": String(bytes.length), "Content-Range": `bytes ${start}-${end}/${size}` },
      body: bytes,
    });
    if (!up.ok) throw new Error(`Falha ao enviar a parte ${i + 1} de ${total} ao TikTok.`);
  }

  for (let i = 0; i < 30; i++) {
    await sleep(5000);
    const st = await tt("/post/publish/status/fetch/", token, { publish_id: init.publish_id });
    if (st.status === "PUBLISH_COMPLETE") return { state: "ok", msg: "Publicado" };
    if (st.status === "FAILED") throw new Error(`O TikTok recusou: ${st.fail_reason || "motivo não informado"}`);
  }
  return { state: "warn", msg: "Enviado. O TikTok ainda está processando." };
}

/* ---------------- Instagram ---------------- */

async function graph(path, token, params = {}, method = "GET") {
  const url = new URL(`${GRAPH}${path}`);
  const body = new URLSearchParams({ ...params, access_token: token });
  const r = method === "GET"
    ? await fetch(`${url}?${body}`)
    : await fetch(url, { method, body });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.error) throw new Error(j.error?.message || `Erro do Instagram (${r.status}).`);
  return j;
}

export async function publishInstagram(post) {
  const o = post.platforms.instagram || {};
  const acc = await getAccount("instagram");
  if (!acc) throw new Error("Instagram não está salvo para agendamentos. Reconecte em Conexões.");
  const params = {
    media_type: "REELS",
    video_url: post.video_url,
    caption: buildCaption(post),
    share_to_feed: o.share_to_feed === false ? "false" : "true",
  };
  if (post.ai) params.is_ai_generated = "true";
  if (post.cover_url) params.cover_url = post.cover_url;

  const c = await graph(`/${acc.ig_id}/media`, acc.token, params, "POST");
  for (let i = 0; i < 50; i++) {
    await sleep(4000);
    const st = await graph(`/${c.id}`, acc.token, { fields: "status_code,status" });
    if (st.status_code === "FINISHED") {
      const pub = await graph(`/${acc.ig_id}/media_publish`, acc.token, { creation_id: c.id }, "POST");
      const m = await graph(`/${pub.id}`, acc.token, { fields: "permalink" }).catch(() => ({}));
      return { state: "ok", msg: "Publicado", link: m.permalink, media_id: pub.id };
    }
    if (st.status_code === "ERROR" || st.status_code === "EXPIRED") throw new Error(`O Instagram recusou: ${st.status || st.status_code}`);
  }
  throw new Error("O Instagram demorou demais para processar. Tente de novo.");
}

/* ---------------- YouTube ---------------- */

async function youtubeToken() {
  const acc = await getAccount("youtube");
  if (!acc) throw new Error("YouTube não está salvo para agendamentos. Reconecte em Conexões.");
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      refresh_token: acc.refresh_token,
      grant_type: "refresh_token",
    }),
  });
  const d = await r.json().catch(() => ({}));
  if (!d.access_token) throw new Error("O acesso ao YouTube expirou. Reconecte em Conexões.");
  return d.access_token;
}

export async function publishYouTube(post) {
  const o = post.platforms.youtube || {};
  const token = await youtubeToken();
  const { size, type } = await head(post.video_url);
  let title = String(post.title || "").trim() || "Novo episódio";
  if (o.short && !/#shorts/i.test(title)) title = `${title} #Shorts`;

  const init = await fetch("https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json; charset=UTF-8",
      "X-Upload-Content-Length": String(size),
      "X-Upload-Content-Type": type,
    },
    body: JSON.stringify({
      snippet: { title: title.slice(0, 100), description: buildCaption(post).slice(0, 5000), tags: (post.tags || []).slice(0, 30), categoryId: "24" },
      status: {
        privacyStatus: ["public", "unlisted", "private"].includes(o.privacy) ? o.privacy : "public",
        selfDeclaredMadeForKids: false,
        containsSyntheticMedia: Boolean(post.ai),
      },
    }),
  });
  const session = init.headers.get("location");
  if (!init.ok || !session) {
    const e = await init.json().catch(() => ({}));
    throw new Error(e.error?.message || `O YouTube recusou o envio (${init.status}).`);
  }
  const video = await fetch(post.video_url);
  const up = await fetch(session, { method: "PUT", headers: { "Content-Type": type, "Content-Length": String(size) }, body: video.body, duplex: "half" });
  const d = await up.json().catch(() => ({}));
  if (!up.ok || !d.id) throw new Error(d.error?.message || `Falha no envio ao YouTube (${up.status}).`);

  const notes = [];
  if (d.status?.privacyStatus === "private" && o.privacy !== "private") notes.push("Saiu privado: falta a auditoria da API do Google.");
  if (post.cover_url) {
    try {
      const img = await fetch(post.cover_url);
      const bytes = Buffer.from(await img.arrayBuffer());
      const t = await fetch(`https://www.googleapis.com/upload/youtube/v3/thumbnails/set?videoId=${d.id}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": img.headers.get("content-type") || "image/jpeg" },
        body: bytes,
      });
      if (!t.ok) notes.push("Capa não aplicada (o canal precisa estar verificado).");
    } catch {
      notes.push("Capa não aplicada.");
    }
  }
  return { state: notes.length ? "warn" : "ok", msg: notes.join(" ") || "Publicado", link: `https://youtu.be/${d.id}` };
}

export const PUBLISHERS = { tiktok: publishTikTok, instagram: publishInstagram, youtube: publishYouTube };
