"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { uploadPresigned } from "@vercel/blob/client";

const PLATFORMS = [
  { id: "tiktok", name: "TikTok", color: "#ff2d6f", login: "/api/auth/login", me: "/api/me" },
  { id: "instagram", name: "Instagram", color: "#c13584", login: "/api/auth/instagram/login", me: "/api/instagram/me" },
  { id: "youtube", name: "YouTube", color: "#ff3b30", login: "/api/auth/youtube/login", me: "/api/youtube/me" },
];

const TT_PRIVACY = {
  PUBLIC_TO_EVERYONE: "Todos",
  MUTUAL_FOLLOW_FRIENDS: "Amigos",
  FOLLOWER_OF_CREATOR: "Seguidores",
  SELF_ONLY: "Só eu",
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function api(path, body) {
  const r = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error((typeof d.error === "string" ? d.error : d.error?.message) || "Algo deu errado.");
  return d;
}

// Reduz a capa para JPEG de até 1920 px e menos de 2 MB (limite do YouTube).
async function prepareCover(file) {
  const img = await createImageBitmap(file);
  const scale = Math.min(1, 1920 / Math.max(img.width, img.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
  for (const q of [0.92, 0.85, 0.75, 0.65]) {
    const blob = await new Promise((res) => canvas.toBlob(res, "image/jpeg", q));
    if (blob.size < 1.9 * 1024 * 1024) return new File([blob], "capa.jpg", { type: "image/jpeg" });
  }
  throw new Error("Não consegui deixar a capa abaixo de 2 MB.");
}

function Drop({ accept, onFile, children, disabled }) {
  const input = useRef(null);
  const [over, setOver] = useState(false);
  return (
    <div
      className={`drop ${over ? "over" : ""} ${disabled ? "off" : ""}`}
      onClick={() => !disabled && input.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); const f = e.dataTransfer.files?.[0]; if (f && !disabled) onFile(f); }}
    >
      <input ref={input} type="file" accept={accept} hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ""; }} />
      {children}
    </div>
  );
}

export default function Studio() {
  const [acc, setAcc] = useState({});
  const [loading, setLoading] = useState(true);

  const [video, setVideo] = useState(null);
  const [videoUrl, setVideoUrl] = useState("");
  const [duration, setDuration] = useState(0);
  const [cover, setCover] = useState(null);
  const [coverUrl, setCoverUrl] = useState("");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState([]);
  const [tagDraft, setTagDraft] = useState("");
  const [ai, setAi] = useState(true);
  const [pinComment, setPinComment] = useState("");

  const [selected, setSelected] = useState({ tiktok: false, instagram: false, youtube: false });

  const [tt, setTt] = useState({ privacy: "", comment: false, duet: false, stitch: false, disclose: false, yourBrand: false, branded: false, coverSec: 0 });
  const [ig, setIg] = useState({ feed: true });
  const [yt, setYt] = useState({ privacy: "public", short: true });

  const [mode, setMode] = useState("now");
  const [when, setWhen] = useState("");
  const [sched, setSched] = useState({ db: false, admin: false, accounts: [] });
  const [scheduled, setScheduled] = useState(null);

  const [running, setRunning] = useState(false);
  const [upload, setUpload] = useState({ pct: 0, label: "" });
  const [status, setStatus] = useState({});

  useEffect(() => {
    Promise.all(
      PLATFORMS.map((p) =>
        fetch(p.me).then((r) => (r.ok ? r.json() : null)).catch(() => null).then((d) => [p.id, d])
      )
    ).then((list) => {
      const map = Object.fromEntries(list);
      setAcc(map);
      setSelected({ tiktok: Boolean(map.tiktok), instagram: Boolean(map.instagram), youtube: Boolean(map.youtube) });
      setLoading(false);
    });
    fetch("/api/agenda/accounts").then((r) => r.json()).then(setSched).catch(() => {});
    const q = new URLSearchParams(window.location.search).get("agendar");
    if (q) {
      const d = /^\d{4}-\d{2}-\d{2}$/.test(q) ? new Date(`${q}T18:00`) : new Date(Date.now() + 86400000);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(q)) d.setHours(18, 0, 0, 0);
      const pad = (n) => String(n).padStart(2, "0");
      setMode("schedule");
      setWhen(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`);
    }
  }, []);

  const ttCreator = acc.tiktok?.creator;
  const ttOptions = ttCreator?.privacy_level_options || [];
  const ttMax = ttCreator?.max_video_post_duration_sec || 600;

  const hashtags = tags.map((t) => `#${t}`).join(" ");
  const caption = [description.trim(), hashtags].filter(Boolean).join("\n\n");
  const ytTitle = yt.short && title && !/#shorts/i.test(title) ? `${title} #Shorts`.slice(0, 100) : title;

  const problems = useMemo(() => {
    const p = [];
    if (!video) p.push("Escolha o vídeo.");
    if (!Object.values(selected).some(Boolean)) p.push("Marque pelo menos uma plataforma.");
    if (selected.youtube && !title.trim()) p.push("O YouTube precisa de título.");
    if (selected.tiktok && !tt.privacy) p.push("Escolha quem pode ver no TikTok.");
    if (selected.tiktok && tt.disclose && !tt.yourBrand && !tt.branded) p.push("TikTok: indique se o conteúdo promove você, terceiros ou ambos.");
    if (selected.tiktok && duration > ttMax) p.push("O vídeo passa do tempo máximo do TikTok desta conta.");
    if (mode === "schedule") {
      if (!sched.db) p.push("Agendar precisa do banco configurado (veja o guia de instalação).");
      else if (!sched.admin) p.push("Entre com a senha do estúdio para agendar.");
      if (!when) p.push("Escolha a data e a hora.");
      else if (new Date(when) < new Date(Date.now() + 60000)) p.push("A data do agendamento já passou.");
      const saved = new Set((sched.accounts || []).map((a) => a.platform));
      Object.entries(selected).filter(([, v]) => v).forEach(([k]) => {
        if (sched.db && sched.admin && !saved.has(k)) p.push(`Reconecte o ${PLATFORMS.find((x) => x.id === k).name} em Conexões para liberar agendamentos.`);
      });
    }
    return p;
  }, [video, selected, title, tt, duration, ttMax, mode, when, sched]);

  function pickVideo(f) {
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    setVideo(f); setVideoUrl(URL.createObjectURL(f)); setDuration(0); setStatus({});
  }
  function pickCover(f) {
    if (coverUrl) URL.revokeObjectURL(coverUrl);
    setCover(f); setCoverUrl(URL.createObjectURL(f));
  }
  function addTag(raw) {
    const list = raw.split(/[,\s]+/).map((t) => t.replace(/^#/, "").trim()).filter(Boolean);
    if (list.length) setTags((cur) => [...new Set([...cur, ...list])].slice(0, 30));
    setTagDraft("");
  }
  const set = (id, v) => setStatus((s) => ({ ...s, [id]: { ...s[id], ...v } }));

  async function runTikTok(blobUrl) {
    set("tiktok", { state: "run", msg: "Enviando ao TikTok…" });
    const { publish_id } = await api("/api/tiktok/publish", {
      blob_url: blobUrl, caption, privacy_level: tt.privacy,
      allow_comment: tt.comment, allow_duet: tt.duet, allow_stitch: tt.stitch,
      your_brand: tt.disclose && tt.yourBrand, branded: tt.disclose && tt.branded,
      cover_ms: Number(tt.coverSec) * 1000, ai,
    });
    for (let i = 0; i < 100; i++) {
      await sleep(4000);
      const st = await api("/api/status", { publish_id });
      if (st.status === "PUBLISH_COMPLETE") return set("tiktok", { state: "ok", msg: "Publicado" });
      if (st.status === "FAILED") throw new Error(`O TikTok recusou: ${st.fail_reason || "motivo não informado"}`);
      set("tiktok", { msg: "O TikTok está processando…" });
    }
    set("tiktok", { state: "warn", msg: "Ainda processando. Confira no app em alguns minutos." });
  }

  async function runInstagram(blobUrl, coverBlob) {
    set("instagram", { state: "run", msg: "Criando o Reel…" });
    const { container_id } = await api("/api/instagram/publish", {
      video_url: blobUrl, caption, share_to_feed: ig.feed, is_ai_generated: ai, cover_url: coverBlob || undefined,
    });
    for (let i = 0; i < 150; i++) {
      await sleep(4000);
      const st = await api("/api/instagram/status", { container_id });
      if (st.status_code === "FINISHED") break;
      if (st.status_code === "ERROR" || st.status_code === "EXPIRED") throw new Error(`O Instagram recusou: ${st.status || st.status_code}`);
      set("instagram", { msg: "O Instagram está processando…" });
      if (i === 149) throw new Error("O Instagram demorou demais para processar.");
    }
    set("instagram", { msg: "Publicando…" });
    const done = await api("/api/instagram/finish", { container_id, comment: pinComment || undefined });
    set("instagram", { state: "ok", msg: ["Publicado", done.comment_note].filter(Boolean).join(". "), link: done.permalink });
  }

  async function runYouTube(blobUrl, coverBlob) {
    set("youtube", { state: "run", msg: "Enviando ao YouTube…" });
    const d = await api("/api/youtube/publish", {
      blob_url: blobUrl, title: ytTitle, description: caption,
      tags, privacy: yt.privacy, ai, keep_blob: true, comment: pinComment || undefined,
    });
    let note = d.privacy === "private" && yt.privacy !== "private" ? "Saiu privado: o projeto do Google ainda não passou na auditoria." : "";
    if (coverBlob) {
      set("youtube", { msg: "Aplicando a capa…" });
      try { await api("/api/youtube/thumbnail", { video_id: d.id, cover_url: coverBlob }); }
      catch (e) { note = [note, `Capa não aplicada: ${e.message}`].filter(Boolean).join(" "); }
    }
    set("youtube", { state: note ? "warn" : "ok", msg: [note || "Publicado", d.comment_note].filter(Boolean).join(" "), link: d.url });
  }

  async function schedule() {
    setRunning(true); setScheduled(null); setStatus({});
    try {
      setUpload({ pct: 0, label: "Guardando o vídeo" });
      const safe = video.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const vb = await uploadPresigned(`agenda/${Date.now()}-${safe}`, video, {
        access: "public", handleUploadUrl: "/api/blob",
        multipart: video.size > 20 * 1024 * 1024,
        onUploadProgress: (e) => setUpload({ pct: Math.round(e.percentage), label: "Guardando o vídeo" }),
      });
      let coverBlob = null;
      if (cover) {
        setUpload({ pct: 100, label: "Guardando a capa" });
        const c = await prepareCover(cover);
        coverBlob = (await uploadPresigned(`agenda/${Date.now()}-capa.jpg`, c, { access: "public", handleUploadUrl: "/api/blob" })).url;
      }
      const platforms = {};
      if (selected.tiktok) platforms.tiktok = {
        privacy_level: tt.privacy, allow_comment: tt.comment, allow_duet: tt.duet, allow_stitch: tt.stitch,
        your_brand: tt.disclose && tt.yourBrand, branded: tt.disclose && tt.branded, cover_ms: Number(tt.coverSec) * 1000,
      };
      if (selected.instagram) platforms.instagram = { share_to_feed: ig.feed };
      if (selected.youtube) platforms.youtube = { privacy: yt.privacy, short: yt.short };
      const { post } = await api("/api/agenda", {
        scheduled_at: new Date(when).toISOString(), title, description, tags, ai,
        video_url: vb.url, video_name: video.name, cover_url: coverBlob, comment: pinComment || null, platforms,
      });
      setScheduled(post);
    } catch (e) {
      setUpload({ pct: 0, label: "" });
      setStatus({ _: { state: "err", msg: e.message } });
    } finally {
      setRunning(false);
    }
  }

  async function publish() {
    setRunning(true); setStatus({});
    const targets = PLATFORMS.filter((p) => selected[p.id]).map((p) => p.id);
    targets.forEach((id) => set(id, { state: "wait", msg: "Aguardando o envio do vídeo…" }));
    const cleanup = [];
    try {
      setUpload({ pct: 0, label: "Enviando o vídeo" });
      const safe = video.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const vb = await uploadPresigned(`estudio/${Date.now()}-${safe}`, video, {
        access: "public", handleUploadUrl: "/api/blob",
        multipart: video.size > 20 * 1024 * 1024,
        onUploadProgress: (e) => setUpload({ pct: Math.round(e.percentage), label: "Enviando o vídeo" }),
      });
      cleanup.push(vb.url);

      let coverBlob = "";
      if (cover && (selected.instagram || selected.youtube)) {
        setUpload({ pct: 100, label: "Enviando a capa" });
        const c = await prepareCover(cover);
        const cb = await uploadPresigned(`estudio/${Date.now()}-capa.jpg`, c, { access: "public", handleUploadUrl: "/api/blob" });
        coverBlob = cb.url;
        cleanup.push(cb.url);
      }
      setUpload({ pct: 100, label: "Arquivos enviados" });

      const jobs = { tiktok: () => runTikTok(vb.url), instagram: () => runInstagram(vb.url, coverBlob), youtube: () => runYouTube(vb.url, coverBlob) };
      await Promise.all(targets.map((id) => jobs[id]().catch((e) => set(id, { state: "err", msg: e.message }))));
    } catch (e) {
      targets.forEach((id) => set(id, { state: "err", msg: e.message }));
    } finally {
      if (cleanup.length) await api("/api/blob/cleanup", { urls: cleanup }).catch(() => {});
      setRunning(false);
    }
  }

  if (loading) return <p className="hint">Carregando o estúdio…</p>;

  const connected = PLATFORMS.filter((p) => acc[p.id]);
  if (!connected.length) {
    return (
      <section className="empty">
        <h1>Estúdio</h1>
        <p>Conecte pelo menos uma rede para começar a publicar.</p>
        <a className="btn" href="/conexoes">Conectar redes</a>
      </section>
    );
  }

  return (
    <div className="studio">
      <header className="studio-head">
        <div>
          <h1>Novo post</h1>
          <p className="hint">Suba uma vez e publique em todas as redes.</p>
        </div>
        <div className="head-actions">
          <a href="/agenda" className="btn ghost small">Agenda</a>
          <a href="/conexoes" className="btn ghost small">Conexões</a>
        </div>
      </header>

      <div className="studio-grid">
        {/* Coluna da mídia */}
        <section className="panel">
          <h2><span className="step">1</span> Vídeo</h2>
          <Drop accept="video/mp4,video/quicktime" onFile={pickVideo} disabled={running}>
            {videoUrl ? (
              <video className="media" src={videoUrl} controls playsInline onClick={(e) => e.stopPropagation()}
                onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)} />
            ) : (
              <div className="drop-empty"><strong>Arraste o vídeo aqui</strong><span>ou clique para escolher · MP4 ou MOV, vertical 9:16</span></div>
            )}
          </Drop>
          {video && <p className="hint">{video.name} · {(video.size / 1024 / 1024).toFixed(1)} MB{duration ? ` · ${Math.round(duration)} s` : ""} · clique no quadro para trocar</p>}

          <h2 style={{ marginTop: 22 }}><span className="step">2</span> Capa</h2>
          <Drop accept="image/jpeg,image/png,image/webp" onFile={pickCover} disabled={running}>
            {coverUrl ? <img className="media cover" src={coverUrl} alt="Capa" /> : (
              <div className="drop-empty small"><strong>Arraste a capa aqui</strong><span>JPG ou PNG · 1080×1920 para Reels</span></div>
            )}
          </Drop>
          {cover && <button className="link" onClick={() => { setCover(null); setCoverUrl(""); }} disabled={running}>Remover capa</button>}
          <p className="hint">Usada no Instagram e no YouTube. O TikTok não aceita imagem pela API: lá a capa é um quadro do vídeo (ajuste nas opções do TikTok).</p>
        </section>

        {/* Coluna do texto */}
        <section className="panel">
          <h2><span className="step">3</span> Texto</h2>

          <label className="field" htmlFor="t">Título <span className="tag-yt">YouTube</span></label>
          <input id="t" className="text" maxLength={100} value={title} onChange={(e) => setTitle(e.target.value)} disabled={running} placeholder="Ex.: Reencarnei como aranha · Parte 13" />
          <div className="counter">{title.length} / 100</div>

          <label className="field" htmlFor="d">Descrição</label>
          <textarea id="d" maxLength={2000} value={description} onChange={(e) => setDescription(e.target.value)} disabled={running}
            placeholder="Resumo do episódio e a pergunta da votação…" />
          <div className="counter">{caption.length} / 2200 com as tags</div>

          <label className="field" htmlFor="g">Tags</label>
          <div className="tags">
            {tags.map((t) => (
              <span key={t} className="chip">#{t}<button onClick={() => setTags(tags.filter((x) => x !== t))} disabled={running} aria-label={`Remover ${t}`}>×</button></span>
            ))}
            <input id="g" value={tagDraft} disabled={running}
              onChange={(e) => (/[,\s]$/.test(e.target.value) ? addTag(e.target.value) : setTagDraft(e.target.value))}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(tagDraft); } if (e.key === "Backspace" && !tagDraft) setTags(tags.slice(0, -1)); }}
              onBlur={() => tagDraft && addTag(tagDraft)}
              placeholder={tags.length ? "" : "isekai, rpg, animação…"} />
          </div>
          <p className="hint">Viram hashtags no fim da legenda do TikTok e do Instagram, e tags no YouTube.</p>

          <label className="check"><input type="checkbox" checked={ai} onChange={(e) => setAi(e.target.checked)} disabled={running} /> Marcar como conteúdo feito com IA</label>

          <label className="field" htmlFor="pc">Comentário do canal <span className="tag-yt">para fixar</span></label>
          <textarea id="pc" className="short" maxLength={2000} value={pinComment} onChange={(e) => setPinComment(e.target.value)} disabled={running}
            placeholder="Ex.: 🕷️ PARTE 14 COM 150 CURTIDAS! A) Comer o gavião · B) Contrato. Comenta A ou B 👇" />
          <p className="hint">Publicado pela sua conta logo depois do vídeo, no YouTube e no Instagram. As redes não deixam fixar pela API: é só abrir o post e tocar em Fixar.</p>
        </section>

        {/* Coluna das plataformas */}
        <section className="panel">
          <h2><span className="step">4</span> Onde publicar</h2>

          {PLATFORMS.map((p) => {
            const on = selected[p.id];
            const who = p.id === "tiktok" ? (acc.tiktok?.user?.display_name || ttCreator?.creator_nickname)
              : p.id === "instagram" ? (acc.instagram && `@${acc.instagram.username}`) : acc.youtube?.title;
            return (
              <div key={p.id} className={`plat ${on ? "on" : ""} ${acc[p.id] ? "" : "off"}`} style={{ "--brand": p.color }}>
                <div className="plat-head">
                  <label className="plat-toggle">
                    <input type="checkbox" checked={on} disabled={!acc[p.id] || running}
                      onChange={(e) => setSelected({ ...selected, [p.id]: e.target.checked })} />
                    <span className="dot" />
                    <span className="plat-name">{p.name}</span>
                  </label>
                  {acc[p.id] ? <span className="who">{who}</span> : <a className="link" href={p.login}>Conectar</a>}
                </div>

                {on && p.id === "tiktok" && (
                  <div className="plat-body">
                    <label className="field small" htmlFor="ttp">Quem pode ver</label>
                    <select id="ttp" value={tt.privacy} disabled={running} onChange={(e) => setTt({ ...tt, privacy: e.target.value })}>
                      <option value="" disabled>Escolha</option>
                      {ttOptions.map((o) => (
                        <option key={o} value={o} disabled={tt.disclose && tt.branded && o === "SELF_ONLY"}>{TT_PRIVACY[o] || o}</option>
                      ))}
                    </select>
                    <div className="inline">
                      {["comment", "duet", "stitch"].map((k) => {
                        const dis = ttCreator?.[`${k}_disabled`];
                        return (
                          <label key={k} className={`check ${dis ? "disabled" : ""}`}>
                            <input type="checkbox" checked={tt[k]} disabled={dis || running} onChange={(e) => setTt({ ...tt, [k]: e.target.checked })} />
                            {{ comment: "Comentários", duet: "Dueto", stitch: "Stitch" }[k]}
                          </label>
                        );
                      })}
                    </div>
                    <label className="field small" htmlFor="ttc">Capa: segundo do vídeo</label>
                    <input id="ttc" type="number" min={0} step={0.5} className="text" value={tt.coverSec} disabled={running}
                      onChange={(e) => setTt({ ...tt, coverSec: e.target.value })} />
                    <label className="check">
                      <input type="checkbox" checked={tt.disclose} disabled={running}
                        onChange={(e) => setTt({ ...tt, disclose: e.target.checked, yourBrand: false, branded: false })} />
                      Este vídeo promove marca, produto ou serviço
                    </label>
                    {tt.disclose && (
                      <div className="sub">
                        <label className="check"><input type="checkbox" checked={tt.yourBrand} disabled={running} onChange={(e) => setTt({ ...tt, yourBrand: e.target.checked })} /> Sua marca (“Conteúdo promocional”)</label>
                        <label className="check"><input type="checkbox" checked={tt.branded} disabled={running}
                          onChange={(e) => setTt({ ...tt, branded: e.target.checked, privacy: e.target.checked && tt.privacy === "SELF_ONLY" ? "" : tt.privacy })} /> Conteúdo de marca (“Parceria paga”)</label>
                      </div>
                    )}
                    <p className="hint">
                      Ao publicar, você concorda com a <a href="https://www.tiktok.com/legal/page/global/music-usage-confirmation/en" target="_blank" rel="noreferrer">Confirmação de Uso de Música</a> do TikTok
                      {tt.branded ? <> e a <a href="https://www.tiktok.com/legal/page/global/bc-policy/en" target="_blank" rel="noreferrer">Política de Conteúdo de Marca</a></> : null}.
                    </p>
                  </div>
                )}

                {on && p.id === "instagram" && (
                  <div className="plat-body">
                    <label className="check"><input type="checkbox" checked={ig.feed} disabled={running} onChange={(e) => setIg({ feed: e.target.checked })} /> Mostrar também no feed do perfil</label>
                  </div>
                )}

                {on && p.id === "youtube" && (
                  <div className="plat-body">
                    <label className="field small" htmlFor="ytp">Visibilidade</label>
                    <select id="ytp" value={yt.privacy} disabled={running} onChange={(e) => setYt({ ...yt, privacy: e.target.value })}>
                      <option value="public">Público</option>
                      <option value="unlisted">Não listado</option>
                      <option value="private">Privado</option>
                    </select>
                    <label className="check"><input type="checkbox" checked={yt.short} disabled={running} onChange={(e) => setYt({ ...yt, short: e.target.checked })} /> É um Short (adiciona #Shorts)</label>
                  </div>
                )}

                {status[p.id] && (
                  <div className={`state ${status[p.id].state}`}>
                    <span className="led" />
                    <span>{status[p.id].msg}</span>
                    {status[p.id].link && <a href={status[p.id].link} target="_blank" rel="noreferrer">Abrir</a>}
                  </div>
                )}
              </div>
            );
          })}

          <div className="when">
            <h2 style={{ margin: "18px 0 10px" }}><span className="step">5</span> Quando</h2>
            <div className="seg">
              <button className={mode === "now" ? "on" : ""} onClick={() => setMode("now")} disabled={running}>Publicar agora</button>
              <button className={mode === "schedule" ? "on" : ""} onClick={() => setMode("schedule")} disabled={running}>Agendar</button>
            </div>
            {mode === "schedule" && (
              <>
                <input className="text" type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} disabled={running} />
                <p className="hint">Horário de Brasília. O despertador confere a fila a cada 5 minutos, então o post sai em até 5 minutos depois do horário.</p>
              </>
            )}
          </div>

          {status._ && <div className="notice err">{status._.msg}</div>}
          {scheduled && (
            <div className="notice ok">
              Agendado para {new Date(scheduled.scheduled_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}. <a href="/agenda">Ver na agenda</a>
            </div>
          )}

          {running && upload.label && (
            <div className="progress"><div style={{ width: `${upload.pct}%` }} /><span>{upload.label} {upload.pct < 100 ? `${upload.pct}%` : ""}</span></div>
          )}

          <button className="btn big" disabled={running || problems.length > 0} onClick={mode === "schedule" ? schedule : publish}
            title={problems.join(" ")}>
            {running ? (mode === "schedule" ? "Agendando…" : "Publicando…")
              : mode === "schedule" ? `Agendar em ${Object.values(selected).filter(Boolean).length} rede(s)`
              : `Publicar em ${Object.values(selected).filter(Boolean).length} rede(s)`}
          </button>
          {!running && problems.length > 0 && video && <ul className="problems">{problems.map((p) => <li key={p}>{p}</li>)}</ul>}
        </section>
      </div>
    </div>
  );
}
