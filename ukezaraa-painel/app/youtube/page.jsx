"use client";
import { useEffect, useState } from "react";
import { uploadPresigned } from "@vercel/blob/client";

export default function YouTubePage() {
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loginError, setLoginError] = useState("");

  const [file, setFile] = useState(null);
  const [videoUrl, setVideoUrl] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [privacy, setPrivacy] = useState("public");
  const [isShort, setIsShort] = useState(true);
  const [ai, setAi] = useState(true);

  const [step, setStep] = useState("");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if (p.get("error")) setLoginError(p.get("error"));
    fetch("/api/youtube/me")
      .then((r) => (r.ok ? r.json() : null))
      .then(setMe)
      .finally(() => setLoading(false));
  }, []);

  function pickFile(e) {
    const f = e.target.files?.[0];
    setError(""); setStep(""); setResult(null);
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    setFile(f || null);
    setVideoUrl(f ? URL.createObjectURL(f) : "");
  }

  async function publish() {
    setError(""); setResult(null); setProgress(0);
    try {
      setStep("Enviando o vídeo…");
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const blob = await uploadPresigned(`youtube/${Date.now()}-${safeName}`, file, {
        access: "public",
        handleUploadUrl: "/api/blob",
        multipart: file.size > 20 * 1024 * 1024,
        onUploadProgress: (e) => setProgress(Math.round(e.percentage)),
      });

      setStep("Enviando ao YouTube…");
      const finalTitle = isShort && !/#shorts/i.test(title) ? `${title} #Shorts`.slice(0, 100) : title;
      const r = await fetch("/api/youtube/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          blob_url: blob.url,
          title: finalTitle,
          description,
          tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
          privacy,
          ai,
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Algo deu errado.");
      setResult(d);
      setStep("");
    } catch (e) {
      setError(e.message);
      setStep("");
    }
  }

  if (loading) return <p className="hint">Carregando…</p>;

  if (!me) {
    return (
      <section className="hero">
        <h1>Conectar o YouTube</h1>
        <p>Entre com a conta do Google dona do canal UkeZaraa. Se o canal for de marca, escolha ele na lista.</p>
        {loginError && <div className="notice err">Falha no login: {loginError}</div>}
        <a href="/api/auth/youtube/login" className="btn">Continuar com o Google</a>
      </section>
    );
  }

  const busy = Boolean(step);

  return (
    <>
      <div className="card">
        <h2>Canal do YouTube</h2>
        <div className="account">
          {me.thumb && <img src={me.thumb} alt="" />}
          <div>
            <div className="name">{me.title}</div>
            <div className="sub">Conectado</div>
          </div>
          <a href="/api/auth/youtube/logout" className="btn ghost" style={{ marginLeft: "auto" }}>Sair</a>
        </div>
      </div>

      <div className="row">
        <div className="col card">
          <h2>1. Vídeo</h2>
          <input type="file" accept="video/mp4,video/quicktime" onChange={pickFile} disabled={busy} />
          <p className="hint">Para virar Short: vertical (9:16) e com até 3 minutos.</p>
          {videoUrl && <video className="preview" src={videoUrl} controls playsInline />}
        </div>

        <div className="col card">
          <h2>2. Detalhes</h2>
          <label className="field" htmlFor="t">Título</label>
          <input id="t" className="text" maxLength={100} value={title} onChange={(e) => setTitle(e.target.value)} disabled={busy} />
          <div className="counter">{title.length} / 100</div>

          <label className="field" htmlFor="d">Descrição</label>
          <textarea id="d" maxLength={5000} value={description} onChange={(e) => setDescription(e.target.value)} disabled={busy} />

          <label className="field" htmlFor="g">Tags (separadas por vírgula)</label>
          <input id="g" className="text" value={tags} onChange={(e) => setTags(e.target.value)} disabled={busy} placeholder="isekai, animação, historias" />

          <label className="field" htmlFor="p">Visibilidade</label>
          <select id="p" value={privacy} onChange={(e) => setPrivacy(e.target.value)} disabled={busy}>
            <option value="public">Público</option>
            <option value="unlisted">Não listado</option>
            <option value="private">Privado</option>
          </select>

          <label className="check"><input type="checkbox" checked={isShort} onChange={(e) => setIsShort(e.target.checked)} disabled={busy} /> É um Short (adiciona #Shorts ao título)</label>
          <label className="check"><input type="checkbox" checked={ai} onChange={(e) => setAi(e.target.checked)} disabled={busy} /> Contém conteúdo gerado ou alterado por IA</label>

          <button className="btn" style={{ width: "100%", marginTop: 14 }} disabled={!file || !title.trim() || busy} onClick={publish}>
            {busy ? "Publicando…" : "Publicar no YouTube"}
          </button>

          {step && <div className="notice info">{step}{step.startsWith("Enviando o") ? ` ${progress}%` : ""}</div>}
          {result && (
            <div className="notice ok">
              Enviado! <a href={result.url} target="_blank" rel="noreferrer">Abrir no YouTube</a>
              {result.privacy === "private" && privacy !== "private" && (
                <><br /><span className="hint">O YouTube deixou o vídeo privado. Isso acontece enquanto o projeto do Google Cloud não passa pela auditoria da API.</span></>
              )}
            </div>
          )}
          {error && <div className="notice err">{error}</div>}
        </div>
      </div>
    </>
  );
}
