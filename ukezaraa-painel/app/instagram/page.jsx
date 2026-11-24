"use client";
import { useEffect, useRef, useState } from "react";
import { uploadPresigned } from "@vercel/blob/client";

const STEPS = {
  uploading: "Enviando o vídeo…",
  creating: "Criando o Reel no Instagram…",
  processing: "O Instagram está processando o vídeo…",
  publishing: "Publicando…",
  done: "Publicado",
};

export default function InstagramPage() {
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loginError, setLoginError] = useState("");

  const [file, setFile] = useState(null);
  const [videoUrl, setVideoUrl] = useState("");
  const [caption, setCaption] = useState("");
  const [shareToFeed, setShareToFeed] = useState(true);
  const [aiLabel, setAiLabel] = useState(true);

  const [step, setStep] = useState("");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [permalink, setPermalink] = useState("");
  const timer = useRef(null);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if (p.get("error")) setLoginError(p.get("error"));
    fetch("/api/instagram/me")
      .then((r) => (r.ok ? r.json() : null))
      .then(setMe)
      .finally(() => setLoading(false));
    return () => clearInterval(timer.current);
  }, []);

  function pickFile(e) {
    const f = e.target.files?.[0];
    setError(""); setStep(""); setPermalink("");
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    setFile(f || null);
    setVideoUrl(f ? URL.createObjectURL(f) : "");
  }

  async function api(path, body) {
    const r = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d.error || "Algo deu errado.");
    return d;
  }

  async function publish() {
    setError(""); setPermalink(""); setProgress(0);
    try {
      setStep("uploading");
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const blob = await uploadPresigned(`episodios/${Date.now()}-${safeName}`, file, {
        access: "public",
        handleUploadUrl: "/api/blob",
        multipart: file.size > 20 * 1024 * 1024,
        onUploadProgress: (e) => setProgress(Math.round(e.percentage)),
      });

      setStep("creating");
      const { container_id } = await api("/api/instagram/publish", {
        video_url: blob.url,
        caption,
        share_to_feed: shareToFeed,
        is_ai_generated: aiLabel,
      });

      setStep("processing");
      await new Promise((resolve, reject) => {
        clearInterval(timer.current);
        timer.current = setInterval(async () => {
          try {
            const s = await api("/api/instagram/status", { container_id });
            if (s.status_code === "FINISHED") { clearInterval(timer.current); resolve(); }
            if (s.status_code === "ERROR" || s.status_code === "EXPIRED") {
              clearInterval(timer.current);
              reject(new Error(`O Instagram recusou o vídeo: ${s.status || s.status_code}`));
            }
          } catch (e) { clearInterval(timer.current); reject(e); }
        }, 4000);
      });

      setStep("publishing");
      const done = await api("/api/instagram/finish", { container_id, blob_url: blob.url });
      setPermalink(done.permalink || "");
      setStep("done");
    } catch (e) {
      setError(e.message);
      setStep("");
    }
  }

  if (loading) return <p className="hint">Carregando…</p>;

  if (!me) {
    return (
      <section className="hero">
        <h1>Conectar o Instagram</h1>
        <p>Entre com a conta do Instagram do canal para publicar os episódios como Reels.</p>
        {loginError && <div className="notice err">Falha no login: {loginError}</div>}
        <a href="/api/auth/instagram/login" className="btn">Continuar com o Instagram</a>
      </section>
    );
  }

  const busy = step && step !== "done";
  const quota = me.limit ? `${me.limit.quota_usage ?? 0} de ${me.limit.config?.quota_total ?? 100} posts usados nas últimas 24 h` : "";

  return (
    <>
      <div className="card">
        <h2>Conta do Instagram</h2>
        <div className="account">
          {me.picture && <img src={me.picture} alt="" />}
          <div>
            <div className="name">@{me.username}</div>
            <div className="sub">{quota || "Conectada"}</div>
          </div>
          <a href="/api/auth/instagram/logout" className="btn ghost" style={{ marginLeft: "auto" }}>Sair</a>
        </div>
      </div>

      <div className="row">
        <div className="col card">
          <h2>1. Vídeo</h2>
          <input type="file" accept="video/mp4,video/quicktime" onChange={pickFile} disabled={busy} />
          <p className="hint">MP4 ou MOV, vertical 9:16, de 3 segundos a 15 minutos.</p>
          {videoUrl && <video className="preview" src={videoUrl} controls playsInline />}
        </div>

        <div className="col card">
          <h2>2. Legenda</h2>
          <label className="field" htmlFor="cap">Legenda e hashtags</label>
          <textarea id="cap" maxLength={2200} value={caption} onChange={(e) => setCaption(e.target.value)} disabled={busy} />
          <div className="counter">{caption.length} / 2200</div>

          <label className="check"><input type="checkbox" checked={shareToFeed} onChange={(e) => setShareToFeed(e.target.checked)} disabled={busy} /> Mostrar também no feed do perfil</label>
          <label className="check"><input type="checkbox" checked={aiLabel} onChange={(e) => setAiLabel(e.target.checked)} disabled={busy} /> Marcar como feito com IA (selo "Info de IA")</label>

          <button className="btn" style={{ width: "100%", marginTop: 14 }} disabled={!file || busy} onClick={publish}>
            {busy ? "Publicando…" : "Publicar Reel"}
          </button>

          {step && step !== "done" && (
            <div className="notice info">
              {STEPS[step]}{step === "uploading" ? ` ${progress}%` : ""}
              <br /><span className="hint">Vídeos longos podem levar alguns minutos no processamento.</span>
            </div>
          )}
          {step === "done" && (
            <div className="notice ok">
              Reel publicado!{permalink && <> <a href={permalink} target="_blank" rel="noreferrer">Abrir no Instagram</a></>}
            </div>
          )}
          {error && <div className="notice err">{error}</div>}
        </div>
      </div>
    </>
  );
}
