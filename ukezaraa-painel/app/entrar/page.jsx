"use client";
import { useState } from "react";

export default function Entrar() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setError("");
    const r = await fetch("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) { setError(d.error || "Não foi possível entrar."); setBusy(false); return; }
    const next = new URLSearchParams(window.location.search).get("next");
    window.location.href = next && next.startsWith("/") ? next : "/agenda";
  }

  return (
    <section className="login">
      <form className="panel" onSubmit={submit}>
        <img src="/icon.png" alt="" width={64} height={64} />
        <h1>Entrar no estúdio</h1>
        <p className="hint">Área do administrador do UkeZaraa.</p>
        <input className="text" type="password" autoFocus placeholder="Senha" value={password} onChange={(e) => setPassword(e.target.value)} />
        {error && <div className="notice err">{error}</div>}
        <button className="btn big" disabled={!password || busy}>{busy ? "Entrando…" : "Entrar"}</button>
      </form>
    </section>
  );
}
