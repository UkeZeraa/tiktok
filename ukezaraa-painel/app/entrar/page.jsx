"use client";
import { useEffect, useState } from "react";

export default function Entrar() {
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [next, setNext] = useState("/agenda");

  useEffect(() => {
    const n = new URLSearchParams(window.location.search).get("next");
    if (n && n.startsWith("/") && !n.startsWith("//")) setNext(n);
    // já entrou neste aparelho? segue direto
    fetch("/api/admin/me", { cache: "no-store" }).then((r) => r.json()).then((d) => { if (d.admin) window.location.replace(n && n.startsWith("/") && !n.startsWith("//") ? n : "/agenda"); }).catch(() => {});
  }, []);

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setError("");
    const r = await fetch("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password, remember }) });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) { setError(d.error || "Não foi possível entrar."); setBusy(false); return; }
    window.location.href = next;
  }

  return (
    <section className="login">
      <form className="panel login-card" onSubmit={submit}>
        <img src="/icon.png" alt="" width={72} height={72} />
        <h1>Entrar no estúdio</h1>
        <p className="hint">Com a senha, este aparelho usa as redes já conectadas, a agenda e os Stories.</p>

        <label className="pw">
          <input className="text" type={show ? "text" : "password"} autoFocus autoComplete="current-password"
            placeholder="Senha do estúdio" value={password} onChange={(e) => setPassword(e.target.value)} />
          <button type="button" className="pw-eye" onClick={() => setShow(!show)} aria-label={show ? "Esconder senha" : "Mostrar senha"}>
            {show ? "Esconder" : "Mostrar"}
          </button>
        </label>

        <label className="remember">
          <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
          <span>Manter conectado neste aparelho <em>(90 dias)</em></span>
        </label>
        {!remember && <p className="hint small">Sem marcar, a entrada vale por 12 horas. Use assim em computador de outra pessoa.</p>}

        {error && <div className="notice err">{error}</div>}
        <button className="btn big" disabled={!password || busy}>{busy ? "Entrando…" : "Entrar"}</button>

        <div className="login-goes">
          <span>Depois de entrar:</span>
          <a href="/agenda">Agenda</a><a href="/stories">Stories</a><a href="/conexoes">Conexões</a><a href="/studio">Estúdio</a>
        </div>
      </form>
    </section>
  );
}
