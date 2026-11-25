"use client";
import { useEffect, useState } from "react";

const PLATFORMS = [
  { id: "tiktok", name: "TikTok", color: "#ff2d6f", me: "/api/me", login: "/api/auth/login", logout: "/api/auth/logout", page: "/dashboard",
    who: (d) => d.user?.display_name || d.creator?.creator_nickname, pic: (d) => d.user?.avatar_url,
    note: "Sandbox: posts saem privados até a TikTok aprovar o app e a auditoria." },
  { id: "instagram", name: "Instagram", color: "#c13584", me: "/api/instagram/me", login: "/api/auth/instagram/login", logout: "/api/auth/instagram/logout", page: "/instagram",
    who: (d) => `@${d.username}`, pic: (d) => d.picture, note: "Reels públicos." },
  { id: "youtube", name: "YouTube", color: "#ff3b30", me: "/api/youtube/me", login: "/api/auth/youtube/login", logout: "/api/auth/youtube/logout", page: "/youtube",
    who: (d) => d.title, pic: (d) => d.thumb, note: "Privado até o projeto do Google passar na auditoria da API." },
];

export default function Conexoes() {
  const [data, setData] = useState(null);
  const [sched, setSched] = useState(null);

  useEffect(() => {
    Promise.all(PLATFORMS.map((p) => fetch(p.me).then((r) => (r.ok ? r.json() : null)).catch(() => null)))
      .then((list) => setData(Object.fromEntries(PLATFORMS.map((p, i) => [p.id, list[i]]))));
    fetch("/api/agenda/accounts").then((r) => r.json()).then(setSched).catch(() => setSched({ db: false }));
  }, []);
  const saved = new Set((sched?.accounts || []).map((a) => a.platform));

  return (
    <div className="studio">
      <header className="studio-head">
        <div>
          <h1>Conexões</h1>
          <p className="hint">As contas que o estúdio usa para publicar.</p>
        </div>
        <div className="head-actions">
          <a href="/agenda" className="btn ghost small">Agenda</a>
          <a href="/studio" className="btn small">Ir para o estúdio</a>
        </div>
      </header>

      {sched && !sched.db && (
        <div className="notice info">Para agendar posts, configure o banco (SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY) na Vercel. As publicações imediatas já funcionam.</div>
      )}
      {sched?.db && !sched.admin && (
        <div className="notice info">Entre com a senha do estúdio em <a href="/entrar?next=/conexoes">/entrar</a> e reconecte as redes para liberar os agendamentos.</div>
      )}

      <div className="conn-grid">
        {PLATFORMS.map((p) => {
          const d = data?.[p.id];
          return (
            <div key={p.id} className={`panel conn ${d ? "on" : ""}`} style={{ "--brand": p.color }}>
              <div className="conn-top">
                <span className="dot" />
                <h2>{p.name}</h2>
                <span className={`badge ${d ? "ok" : ""}`}>{data ? (d ? "Conectado" : "Desconectado") : "…"}</span>
              </div>
              {d ? (
                <div className="account">
                  {p.pic(d) && <img src={p.pic(d)} alt="" />}
                  <div className="name">{p.who(d)}</div>
                </div>
              ) : (
                <p className="hint">Nenhuma conta conectada.</p>
              )}
              <p className="hint">{p.note}</p>
              {sched?.db && sched?.admin && (
                <p className={`sched-flag ${saved.has(p.id) ? "ok" : ""}`}>
                  {saved.has(p.id) ? "✓ Pronto para agendamentos" : "Reconecte para liberar agendamentos"}
                </p>
              )}
              <div className="conn-actions">
                {d ? (
                  <>
                    <a className="btn ghost small" href={p.login}>Reconectar</a>
                    <a className="btn ghost small" href={p.logout}>Desconectar</a>
                    <a className="link" href={p.page}>Publicar só aqui</a>
                  </>
                ) : (
                  <a className="btn small" href={p.login}>Conectar</a>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
