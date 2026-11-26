"use client";
import { useCallback, useEffect, useMemo, useState } from "react";

const PLAT = {
  tiktok: { name: "TikTok", color: "#ff2d6f" },
  instagram: { name: "Instagram", color: "#c13584" },
  youtube: { name: "YouTube", color: "#ff3b30" },
};
const STATUS = {
  scheduled: { label: "Agendado", cls: "s-scheduled" },
  running: { label: "Publicando", cls: "s-running" },
  done: { label: "Publicado", cls: "s-done" },
  partial: { label: "Parcial", cls: "s-partial" },
  error: { label: "Com erro", cls: "s-error" },
  canceled: { label: "Cancelado", cls: "s-canceled" },
};
const WEEK = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MONTHS = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

const pad = (n) => String(n).padStart(2, "0");
const dayKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const hhmm = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
const toLocalInput = (iso) => { const d = new Date(iso); return `${dayKey(d)}T${hhmm(d)}`; };

async function call(path, opts = {}) {
  const r = await fetch(path, { ...opts, headers: { "Content-Type": "application/json", ...(opts.headers || {}) } });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || "Algo deu errado.");
  return d;
}

function Pill({ post, onOpen, onDragStart }) {
  const d = new Date(post.scheduled_at);
  const st = STATUS[post.status] || STATUS.scheduled;
  return (
    <button
      className={`pill ${st.cls}`}
      draggable={post.status === "scheduled"}
      onDragStart={(e) => onDragStart(e, post)}
      onClick={(e) => { e.stopPropagation(); onOpen(post); }}
      title={`${hhmm(d)} · ${post.title || "Sem título"} · ${st.label}`}
    >
      <span className="pill-top">
        <span className="pill-time">{hhmm(d)}</span>
        <span className="pill-dots">{Object.keys(post.platforms || {}).map((p) => <i key={p} style={{ background: PLAT[p]?.color }} />)}</span>
      </span>
      <span className="pill-title">{post.title || post.description || "Sem título"}</span>
    </button>
  );
}

function Detail({ post, onClose, onChanged }) {
  const [when, setWhen] = useState(toLocalInput(post.scheduled_at));
  const [title, setTitle] = useState(post.title || "");
  const [description, setDescription] = useState(post.description || "");
  const [tags, setTags] = useState((post.tags || []).join(", "));
  const [comment, setComment] = useState(post.comment || "");
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    setWhen(toLocalInput(post.scheduled_at)); setTitle(post.title || ""); setDescription(post.description || "");
    setTags((post.tags || []).join(", ")); setComment(post.comment || ""); setMsg("");
  }, [post]);

  const editable = post.status === "scheduled" || post.status === "canceled";
  const st = STATUS[post.status] || STATUS.scheduled;

  async function act(kind) {
    setBusy(kind); setMsg("");
    try {
      if (kind === "save") {
        await call(`/api/agenda/${post.id}`, { method: "PATCH", body: JSON.stringify({
          scheduled_at: new Date(when).toISOString(), title, description,
          tags: tags.split(",").map((t) => t.replace(/^#/, "").trim()).filter(Boolean),
          comment,
        }) });
        setMsg("Alterações salvas.");
      }
      if (kind === "cancel") await call(`/api/agenda/${post.id}`, { method: "PATCH", body: JSON.stringify({ status: "canceled" }) });
      if (kind === "reactivate") await call(`/api/agenda/${post.id}`, { method: "PATCH", body: JSON.stringify({ status: "scheduled" }) });
      if (kind === "delete") {
        if (!confirm("Excluir este post e o vídeo guardado? Não dá para desfazer.")) { setBusy(""); return; }
        await call(`/api/agenda/${post.id}`, { method: "DELETE" });
        onChanged(null); return;
      }
      if (kind === "run") {
        setMsg("Publicando… pode levar alguns minutos.");
        await call(`/api/agenda/${post.id}/run`, { method: "POST" });
        setMsg("");
      }
      onChanged(post.id);
    } catch (e) {
      setMsg(e.message);
    } finally {
      setBusy("");
    }
  }

  return (
    <aside className="panel detail">
      <div className="detail-head">
        <span className={`badge ${st.cls}`}>{st.label}</span>
        <button className="link" onClick={onClose}>Fechar</button>
      </div>

      <div className="detail-media">
        {post.status !== "done" ? (
          <video src={post.video_url} controls playsInline poster={post.cover_url || undefined} />
        ) : post.cover_url ? <img src={post.cover_url} alt="" /> : <div className="gone">Arquivos apagados depois da publicação</div>}
      </div>

      <label className="field small">Data e hora</label>
      <input className="text" type="datetime-local" value={when} disabled={!editable || !!busy} onChange={(e) => setWhen(e.target.value)} />

      <label className="field small">Título</label>
      <input className="text" maxLength={100} value={title} disabled={!editable || !!busy} onChange={(e) => setTitle(e.target.value)} />

      <label className="field small">Descrição</label>
      <textarea value={description} disabled={!editable || !!busy} onChange={(e) => setDescription(e.target.value)} />

      <label className="field small">Tags</label>
      <input className="text" value={tags} disabled={!editable || !!busy} onChange={(e) => setTags(e.target.value)} />

      <label className="field small">Comentário do canal (para fixar)</label>
      <textarea className="short" value={comment} disabled={!editable || !!busy} onChange={(e) => setComment(e.target.value)} placeholder="Opcional" />

      <label className="field small">Redes</label>
      <div className="results">
        {Object.keys(post.platforms || {}).map((p) => {
          const r = post.results?.[p];
          return (
            <div key={p} className={`result ${r?.state || "pending"}`} style={{ "--brand": PLAT[p]?.color }}>
              <span className="dot" />
              <strong>{PLAT[p]?.name}</strong>
              <span className="result-msg">{r ? r.msg : "Aguardando o horário"}</span>
              {r?.link && <a href={r.link} target="_blank" rel="noreferrer">Abrir</a>}
            </div>
          );
        })}
      </div>

      {msg && <div className="notice info">{msg}</div>}

      <div className="detail-actions">
        {editable && <button className="btn small" disabled={!!busy} onClick={() => act("save")}>{busy === "save" ? "Salvando…" : "Salvar"}</button>}
        {post.status === "scheduled" && <button className="btn ghost small" disabled={!!busy} onClick={() => act("run")}>{busy === "run" ? "Publicando…" : "Publicar agora"}</button>}
        {(post.status === "partial" || post.status === "error") && <button className="btn small" disabled={!!busy} onClick={() => act("run")}>{busy === "run" ? "Tentando…" : "Tentar de novo"}</button>}
        {post.status === "scheduled" && <button className="btn ghost small" disabled={!!busy} onClick={() => act("cancel")}>Pausar</button>}
        {post.status === "canceled" && <button className="btn ghost small" disabled={!!busy} onClick={() => act("reactivate")}>Reativar</button>}
        {post.status !== "running" && <button className="link danger" disabled={!!busy} onClick={() => act("delete")}>Excluir</button>}
      </div>
    </aside>
  );
}

export default function Agenda() {
  const [cursor, setCursor] = useState(() => { const d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0); return d; });
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openId, setOpenId] = useState(null);
  const [dragOver, setDragOver] = useState("");

  const grid = useMemo(() => {
    const start = new Date(cursor); start.setDate(1 - start.getDay());
    const last = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
    const weeks = Math.ceil((cursor.getDay() + last.getDate()) / 7);
    return Array.from({ length: weeks * 7 }, (_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return d; });
  }, [cursor]);

  const load = useCallback(async () => {
    setError("");
    try {
      const from = new Date(grid[0]); const to = new Date(grid[grid.length - 1]); to.setHours(23, 59, 59);
      const d = await call(`/api/agenda?from=${from.toISOString()}&to=${to.toISOString()}`);
      setPosts(d.posts || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [grid]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { const t = setInterval(load, 30000); return () => clearInterval(t); }, [load]);

  const byDay = useMemo(() => {
    const m = {};
    for (const p of posts) (m[dayKey(new Date(p.scheduled_at))] ||= []).push(p);
    return m;
  }, [posts]);

  const monthPosts = posts.filter((p) => new Date(p.scheduled_at).getMonth() === cursor.getMonth());
  const count = (s) => monthPosts.filter((p) => (Array.isArray(s) ? s.includes(p.status) : p.status === s)).length;
  const upcoming = posts.filter((p) => p.status === "scheduled" && new Date(p.scheduled_at) >= new Date()).slice(0, 6);
  const open = posts.find((p) => p.id === openId);
  const today = dayKey(new Date());

  function move(delta) { const d = new Date(cursor); d.setMonth(d.getMonth() + delta); setCursor(d); }

  function onDragStart(e, post) { e.dataTransfer.setData("text/plain", post.id); e.dataTransfer.effectAllowed = "move"; }
  async function onDrop(e, day) {
    e.preventDefault(); setDragOver("");
    const id = e.dataTransfer.getData("text/plain");
    const post = posts.find((p) => p.id === id);
    if (!post) return;
    const old = new Date(post.scheduled_at);
    const next = new Date(day); next.setHours(old.getHours(), old.getMinutes(), 0, 0);
    if (dayKey(next) === dayKey(old)) return;
    setPosts((ps) => ps.map((p) => (p.id === id ? { ...p, scheduled_at: next.toISOString() } : p)));
    try { await call(`/api/agenda/${id}`, { method: "PATCH", body: JSON.stringify({ scheduled_at: next.toISOString() }) }); }
    catch (err) { setError(err.message); }
    load();
  }

  return (
    <div className="studio">
      <header className="studio-head">
        <div>
          <h1>Agenda</h1>
          <p className="hint">Arraste um post para outro dia para remarcar. Clique para ver, editar ou publicar agora.</p>
        </div>
        <div className="head-actions">
          <a href="/conexoes" className="btn ghost small">Conexões</a>
          <a href="/agenda/lote" className="btn ghost small">Agendar em lote</a>
          <a href="/studio?agendar=1" className="btn small">+ Novo agendamento</a>
        </div>
      </header>

      <div className="stats">
        <div className="stat"><span>{count("scheduled")}</span>agendados no mês</div>
        <div className="stat ok"><span>{count("done")}</span>publicados</div>
        <div className="stat warn"><span>{count(["partial", "error"])}</span>precisam de atenção</div>
        <div className="stat next">
          <span>{upcoming[0] ? `${pad(new Date(upcoming[0].scheduled_at).getDate())}/${pad(new Date(upcoming[0].scheduled_at).getMonth() + 1)} ${hhmm(new Date(upcoming[0].scheduled_at))}` : "—"}</span>
          próxima publicação
        </div>
      </div>

      {error && <div className="notice err">{error}</div>}

      <div className={`agenda ${open ? "with-detail" : ""}`}>
        <section className="panel cal">
          <div className="cal-head">
            <button className="btn ghost small" onClick={() => move(-1)} aria-label="Mês anterior">‹</button>
            <h2>{MONTHS[cursor.getMonth()]} {cursor.getFullYear()}</h2>
            <button className="btn ghost small" onClick={() => move(1)} aria-label="Próximo mês">›</button>
            <button className="link" onClick={() => { const d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0); setCursor(d); }}>Hoje</button>
          </div>
          <div className="cal-grid">
            {WEEK.map((w) => <div key={w} className="cal-week">{w}</div>)}
            {grid.map((d) => {
              const k = dayKey(d);
              const items = byDay[k] || [];
              const out = d.getMonth() !== cursor.getMonth();
              const past = k < today;
              return (
                <div
                  key={k}
                  className={`cal-day ${out ? "out" : ""} ${k === today ? "today" : ""} ${past ? "past" : ""} ${dragOver === k ? "drop-here" : ""}`}
                  onDragOver={(e) => { if (!past) { e.preventDefault(); setDragOver(k); } }}
                  onDragLeave={() => setDragOver("")}
                  onDrop={(e) => !past && onDrop(e, d)}
                  onDoubleClick={() => !past && (window.location.href = `/studio?agendar=${k}`)}
                >
                  <span className="cal-num">{d.getDate()}</span>
                  <div className="cal-items">
                    {items.slice(0, 3).map((p) => <Pill key={p.id} post={p} onOpen={(x) => setOpenId(x.id)} onDragStart={onDragStart} />)}
                    {items.length > 3 && <button className="more" onClick={() => setOpenId(items[3].id)}>+{items.length - 3} mais</button>}
                  </div>
                </div>
              );
            })}
          </div>
          {loading && <p className="hint">Carregando…</p>}
          {!loading && !posts.length && !error && (
            <p className="hint center">Nenhum post neste período. Clique duas vezes num dia ou em “+ Novo agendamento”.</p>
          )}
        </section>

        {open ? (
          <Detail post={open} onClose={() => setOpenId(null)} onChanged={(id) => { if (!id) setOpenId(null); load(); }} />
        ) : (
          <aside className="panel side">
            <h2>Próximas publicações</h2>
            {upcoming.length ? upcoming.map((p) => {
              const d = new Date(p.scheduled_at);
              return (
                <button key={p.id} className="up" onClick={() => setOpenId(p.id)}>
                  <span className="up-date"><strong>{pad(d.getDate())}</strong>{MONTHS[d.getMonth()].slice(0, 3)}</span>
                  <span className="up-body">
                    <span className="up-title">{p.title || p.description || "Sem título"}</span>
                    <span className="up-meta">{hhmm(d)} · {Object.keys(p.platforms).map((x) => PLAT[x]?.name).join(", ")}</span>
                  </span>
                </button>
              );
            }) : <p className="hint">Nada agendado ainda.</p>}
            <div className="legend">
              {Object.entries(STATUS).map(([k, v]) => <span key={k} className={`badge ${v.cls}`}>{v.label}</span>)}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
