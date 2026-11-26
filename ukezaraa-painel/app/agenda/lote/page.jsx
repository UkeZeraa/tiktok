"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { uploadPresigned } from "@vercel/blob/client";
import { PLANS } from "@/lib/plans";

const PLAT = {
  tiktok: { name: "TikTok", color: "#ff2d6f" },
  instagram: { name: "Instagram", color: "#c13584" },
  youtube: { name: "YouTube", color: "#ff3b30" },
};

// Acha o número do episódio no nome do arquivo: ep02, parte_2, parte12, p13, "2.mp4"…
function epFromName(name) {
  const base = name.toLowerCase().replace(/\.[a-z0-9]+$/, "");
  const m = base.match(/(?:ep|parte|part|p)[\s._-]*0*(\d{1,3})/) || base.match(/(?:^|[^0-9])0*(\d{1,3})(?:[^0-9]|$)/);
  return m ? Number(m[1]) : null;
}

const fmt = (local) => {
  const d = new Date(local);
  return d.toLocaleString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
};

export default function Lote() {
  const planKey = "fome-herdada-shorts";
  const plan = PLANS[planKey];
  const [rows, setRows] = useState(() => plan.itens.map((i) => ({ ...i, video: null, cover: null, state: "", msg: "" })));
  const [sched, setSched] = useState(null);
  const [running, setRunning] = useState(false);
  const [yt, setYt] = useState(plan.redes.youtube);
  const [unmatched, setUnmatched] = useState([]);
  const pickAll = useRef(null);
  const pickCovers = useRef(null);

  useEffect(() => { fetch("/api/agenda/accounts").then((r) => r.json()).then(setSched).catch(() => setSched({})); }, []);

  const saved = new Set((sched?.accounts || []).map((a) => a.platform));
  const ready = rows.filter((r) => r.video).length;
  const done = rows.filter((r) => r.state === "ok").length;

  const problems = useMemo(() => {
    const p = [];
    if (sched && !sched.db) p.push("O banco não está configurado na Vercel.");
    else if (sched && !sched.admin) p.push("Entre com a senha do estúdio.");
    else if (sched && !saved.has("youtube")) p.push("Reconecte o YouTube em Conexões para liberar agendamentos.");
    const past = rows.filter((r) => r.video && r.state !== "ok" && new Date(r.quando) < new Date(Date.now() + 60000));
    if (past.length) p.push(`Horário já passou: Parte ${past.map((r) => r.ep).join(", ")}. Ajuste a data ou remova o vídeo.`);
    if (!ready) p.push("Arraste os vídeos dos episódios.");
    return p;
  }, [sched, rows, ready]);

  function assign(files, kind) {
    const extra = [];
    setRows((cur) => {
      const next = cur.map((r) => ({ ...r }));
      for (const f of files) {
        const n = epFromName(f.name);
        const row = next.find((r) => r.ep === n);
        if (row) row[kind] = f; else extra.push(f.name);
      }
      return next;
    });
    setUnmatched(extra);
  }

  function onDrop(e) {
    e.preventDefault();
    const files = [...(e.dataTransfer.files || [])];
    assign(files.filter((f) => f.type.startsWith("video/")), "video");
    assign(files.filter((f) => f.type.startsWith("image/")), "cover");
  }

  const upd = (ep, patch) => setRows((cur) => cur.map((r) => (r.ep === ep ? { ...r, ...patch } : r)));

  async function scheduleAll() {
    setRunning(true);
    for (const r of rows) {
      if (!r.video || r.state === "ok") continue;
      try {
        upd(r.ep, { state: "run", msg: "Enviando o vídeo… 0%" });
        const safe = r.video.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const vb = await uploadPresigned(`agenda/${Date.now()}-${safe}`, r.video, {
          access: "public", handleUploadUrl: "/api/blob",
          multipart: r.video.size > 20 * 1024 * 1024,
          onUploadProgress: (e) => upd(r.ep, { msg: `Enviando o vídeo… ${Math.round(e.percentage)}%` }),
        });
        let cover = null;
        if (r.cover) {
          upd(r.ep, { msg: "Enviando a capa…" });
          cover = (await uploadPresigned(`agenda/${Date.now()}-capa-${r.ep}.${r.cover.name.split(".").pop()}`, r.cover, { access: "public", handleUploadUrl: "/api/blob" })).url;
        }
        upd(r.ep, { msg: "Salvando na agenda…" });
        const res = await fetch("/api/agenda", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            scheduled_at: new Date(r.quando).toISOString(),
            title: r.titulo, description: r.descricao, tags: r.tags, ai: true,
            video_url: vb.url, video_name: r.video.name, cover_url: cover, comment: r.comentario || null,
            platforms: { youtube: yt },
          }),
        });
        const d = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(d.error || "Falha ao salvar.");
        upd(r.ep, { state: "ok", msg: "Agendado" });
      } catch (e) {
        upd(r.ep, { state: "err", msg: e.message });
      }
    }
    setRunning(false);
  }

  return (
    <div className="studio">
      <header className="studio-head">
        <div>
          <h1>Agendar em lote</h1>
          <p className="hint">{plan.nome}. Arraste todos os vídeos de uma vez: cada um cai no episódio certo pelo número no nome do arquivo.</p>
        </div>
        <div className="head-actions">
          <a href="/agenda" className="btn ghost small">Voltar à agenda</a>
        </div>
      </header>

      <div
        className="drop batch-drop"
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
        onClick={() => !running && pickAll.current?.click()}
      >
        <input ref={pickAll} type="file" accept="video/mp4,video/quicktime" multiple hidden onChange={(e) => { assign([...e.target.files], "video"); e.target.value = ""; }} />
        <input ref={pickCovers} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={(e) => { assign([...e.target.files], "cover"); e.target.value = ""; }} />
        <div className="drop-empty">
          <strong>Arraste aqui os vídeos (e as capas, se quiser) dos episódios 2 a 13</strong>
          <span>Ex.: fome_herdada_ep02_shorts.mp4, parte3.mp4, P13.mp4 · {ready} de {rows.length} vídeos encontrados</span>
        </div>
      </div>
      <div className="batch-bar">
        <button className="link" onClick={() => pickCovers.current?.click()} disabled={running}>Escolher capas</button>
        {unmatched.length > 0 && <span className="hint">Não reconheci o episódio de: {unmatched.join(", ")}</span>}
      </div>

      <div className="batch-grid">
        <section className="panel">
          <div className="batch-table">
            {rows.map((r) => (
              <div key={r.ep} className={`batch-row ${r.state}`}>
                <div className="batch-ep"><span>PARTE</span><strong>{r.ep}</strong></div>
                <div className="batch-main">
                  <input className="text" value={r.titulo} maxLength={100} disabled={running || r.state === "ok"} onChange={(e) => upd(r.ep, { titulo: e.target.value })} />
                  <details>
                    <summary>Descrição e comentário para fixar</summary>
                    <label className="field small">Descrição</label>
                    <textarea value={r.descricao} disabled={running || r.state === "ok"} onChange={(e) => upd(r.ep, { descricao: e.target.value })} />
                    <label className="field small">Comentário do canal (fixar pelo app)</label>
                    <textarea className="short" value={r.comentario} disabled={running || r.state === "ok"} onChange={(e) => upd(r.ep, { comentario: e.target.value })} />
                  </details>
                  <div className="batch-files">
                    <span className={r.video ? "file ok" : "file"}>{r.video ? `🎬 ${r.video.name} · ${(r.video.size / 1048576).toFixed(1)} MB` : "Sem vídeo"}</span>
                    <span className={r.cover ? "file ok" : "file"}>{r.cover ? `🖼️ ${r.cover.name}` : "Sem capa"}</span>
                    {r.video && r.state !== "ok" && !running && <button className="link" onClick={() => upd(r.ep, { video: null, cover: null })}>remover</button>}
                  </div>
                </div>
                <div className="batch-when">
                  <input className="text" type="datetime-local" value={r.quando} disabled={running || r.state === "ok"} onChange={(e) => upd(r.ep, { quando: e.target.value })} />
                  <span className="hint">{fmt(r.quando)}</span>
                </div>
                <div className={`batch-state ${r.state}`}>{r.msg || (r.video ? "Pronto" : "")}</div>
              </div>
            ))}
          </div>
        </section>

        <aside className="panel">
          <h2>Onde publicar</h2>
          <div className="plat on" style={{ "--brand": PLAT.youtube.color }}>
            <div className="plat-head">
              <span className="plat-toggle"><span className="dot" /><span className="plat-name">YouTube Shorts</span></span>
              <span className="who">{(sched?.accounts || []).find((a) => a.platform === "youtube")?.label || ""}</span>
            </div>
            <div className="plat-body">
              <label className="field small" htmlFor="ytp">Visibilidade</label>
              <select id="ytp" value={yt.privacy} disabled={running} onChange={(e) => setYt({ ...yt, privacy: e.target.value })}>
                <option value="public">Público</option>
                <option value="unlisted">Não listado</option>
                <option value="private">Privado</option>
              </select>
              <label className="check"><input type="checkbox" checked={yt.short} disabled={running} onChange={(e) => setYt({ ...yt, short: e.target.checked })} /> É um Short (adiciona #Shorts)</label>
              <p className="hint">Enquanto o projeto do Google não passar na auditoria, o YouTube deixa os vídeos privados mesmo marcando Público.</p>
              <p className="hint">Cada episódio leva um comentário do canal, publicado logo depois do vídeo. A API não permite fixar: abra o Short e toque em Fixar.</p>
            </div>
          </div>

          <div className="stats mini">
            <div className="stat"><span>{ready}</span>com vídeo</div>
            <div className="stat ok"><span>{done}</span>agendados</div>
          </div>

          <button className="btn big" disabled={running || problems.length > 0} onClick={scheduleAll}>
            {running ? "Agendando…" : `Agendar ${ready - done} episódio(s)`}
          </button>
          {!running && problems.length > 0 && <ul className="problems">{problems.map((p) => <li key={p}>{p}</li>)}</ul>}
          {done > 0 && !running && <div className="notice ok">Pronto! <a href="/agenda">Ver na agenda</a></div>}
          <p className="hint">Mantenha esta aba aberta até terminar: os vídeos sobem um por vez.</p>
        </aside>
      </div>
    </div>
  );
}
