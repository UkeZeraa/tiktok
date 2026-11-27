"use client";
import "@fontsource/roboto-condensed/800.css";
import "@fontsource/roboto-condensed/900.css";
import { useEffect, useRef, useState } from "react";
import { uploadPresigned } from "@vercel/blob/client";

// Padrão dos Stories da série (chat "Reencarnação de aranha em fantasia"):
// "VOCÊ DECIDE A PARTE N" no topo · quadro arredondado cortado na diagonal com A e B · círculo "OU"
// · "VOTE NA ENQUETE" com setas amarelas e área livre embaixo para a figurinha · vinheta.
const W = 1080, H = 1920;
const FONT = '"Roboto Condensed", "Arial Narrow", system-ui, sans-serif';
const NY = "#FFC62E";               // amarelo do padrão v4
const INK = "rgba(12,8,30,.95)";    // contorno
const SIDE_A = ["#ff8a3d", "#c2410c"]; // quente
const SIDE_B = ["#3aa0ff", "#1e3a8a"]; // frio

const TEMPLATES = {
  enquete: { nome: "Votação da parte", desc: "VOCÊ DECIDE A PARTE N · A ou B na diagonal" },
  novidade: { nome: "Parte nova no ar", desc: "Capa do episódio + PARTE N JÁ SAIU" },
  embreve: { nome: "Em breve", desc: "Próxima parte com dia e hora" },
};

function wrap(ctx, text, maxW) {
  const words = String(text || "").split(/\s+/).filter(Boolean);
  const lines = []; let line = "";
  for (const w of words) {
    const t = line ? `${line} ${w}` : w;
    if (ctx.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t;
  }
  if (line) lines.push(line);
  return lines;
}
function rr(ctx, x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
// Texto grande com contorno grosso (como o bigT/text do padrão).
function T(ctx, text, x, y, size, color = "#fff", { maxW = 960, stroke = 0.17, weight = 900, align = "center", lh = 1.0 } = {}) {
  ctx.font = `${weight} ${size}px ${FONT}`; ctx.textAlign = align; ctx.textBaseline = "alphabetic"; ctx.lineJoin = "round";
  const lines = wrap(ctx, String(text).toUpperCase(), maxW);
  lines.forEach((l, i) => {
    const yy = y + i * size * lh;
    ctx.lineWidth = size * stroke; ctx.strokeStyle = INK; ctx.strokeText(l, x, yy);
    ctx.fillStyle = color; ctx.fillText(l, x, yy);
  });
  return y + (lines.length - 1) * size * lh;
}
function cover(ctx, img, x, y, w, h) {
  const r = Math.max(w / img.width, h / img.height);
  const iw = img.width * r, ih = img.height * r;
  ctx.drawImage(img, x + (w - iw) / 2, y + (h - ih) / 2, iw, ih);
}
function vignette(ctx, k = 0.6) {
  const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.25, W / 2, H / 2, H * 0.75);
  g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, `rgba(0,0,0,${k})`);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}
function arrow(ctx, cx, y) {
  ctx.beginPath(); ctx.moveTo(cx - 26, y); ctx.lineTo(cx + 26, y); ctx.lineTo(cx, y + 44); ctx.closePath();
  ctx.fillStyle = NY; ctx.fill(); ctx.lineWidth = 6; ctx.strokeStyle = INK; ctx.stroke();
}
function badge(ctx, text, cx, y, size = 44) {
  ctx.font = `900 ${size}px ${FONT}`;
  const w = ctx.measureText(text).width + size * 1.2, h = size * 1.55;
  rr(ctx, cx - w / 2, y, w, h, 16);
  ctx.fillStyle = "rgba(44,56,86,.95)"; ctx.fill(); ctx.lineWidth = 5; ctx.strokeStyle = "rgba(200,215,255,.85)"; ctx.stroke();
  ctx.fillStyle = NY; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(text, cx, y + h / 2 + 3);
  return y + h;
}
function background(ctx, bg) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "#3A1A54"); g.addColorStop(0.5, "#1c1040"); g.addColorStop(1, "#0b0820");
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  if (bg) {
    ctx.save(); ctx.filter = "blur(18px) brightness(.55) saturate(1.2)"; cover(ctx, bg, -40, -40, W + 80, H + 80); ctx.restore();
  } else {
    for (let i = 0; i < 46; i++) {
      ctx.fillStyle = i % 3 ? `rgba(70,220,230,${0.04 + (i % 5) * 0.015})` : `rgba(255,92,170,${0.05 + (i % 4) * 0.02})`;
      ctx.beginPath(); ctx.arc((i * 263) % W, (i * 491) % H, 6 + (i % 7) * 6, 0, Math.PI * 2); ctx.fill();
    }
  }
}
function brand(ctx, logo, serie) {
  if (logo) ctx.drawImage(logo, W / 2 - 165, 205, 60, 60);
  ctx.font = `900 42px ${FONT}`; ctx.textAlign = "left"; ctx.textBaseline = "middle";
  ctx.lineWidth = 8; ctx.strokeStyle = INK; ctx.strokeText("UKEZARAA", W / 2 - 92, 237);
  ctx.fillStyle = "#fff"; ctx.fillText("UKEZARAA", W / 2 - 92, 237);
  if (serie) badge(ctx, serie.toUpperCase(), W / 2, 290, 38);
}

function drawEnquete(ctx, s, im) {
  background(ctx, im.a || im.b);
  brand(ctx, im.logo, s.serie);
  T(ctx, "VOCÊ DECIDE", W / 2, 520, 120, "#fff");
  T(ctx, `A PARTE ${s.parte || "?"}`, W / 2, 640, 130, NY);

  const X0 = 90, Y0 = 720, BW = 900, BH = 640, R = 46;
  rr(ctx, X0, Y0, BW, BH, R); ctx.save(); ctx.clip();
  // metade A (canto de cima à esquerda)
  ctx.save();
  ctx.beginPath(); ctx.moveTo(X0, Y0); ctx.lineTo(X0 + BW, Y0); ctx.lineTo(X0 + BW, Y0 + 200); ctx.lineTo(X0, Y0 + 440); ctx.closePath(); ctx.clip();
  if (im.a) cover(ctx, im.a, X0, Y0, BW, BH);
  else { const g = ctx.createLinearGradient(X0, Y0, X0 + BW, Y0 + 440); g.addColorStop(0, SIDE_A[0]); g.addColorStop(1, SIDE_A[1]); ctx.fillStyle = g; ctx.fillRect(X0, Y0, BW, BH); }
  const sa = ctx.createLinearGradient(0, Y0, 0, Y0 + 300); sa.addColorStop(0, "rgba(120,40,0,.0)"); sa.addColorStop(1, `rgba(60,20,0,${im.a ? .3 : .55})`);
  ctx.fillStyle = sa; ctx.fillRect(X0, Y0, BW, 440);
  ctx.restore();
  // metade B (canto de baixo à direita)
  ctx.save();
  ctx.beginPath(); ctx.moveTo(X0, Y0 + 440); ctx.lineTo(X0 + BW, Y0 + 200); ctx.lineTo(X0 + BW, Y0 + BH); ctx.lineTo(X0, Y0 + BH); ctx.closePath(); ctx.clip();
  if (im.b) cover(ctx, im.b, X0, Y0, BW, BH);
  else { const g = ctx.createLinearGradient(X0, Y0 + 200, X0 + BW, Y0 + BH); g.addColorStop(0, SIDE_B[0]); g.addColorStop(1, SIDE_B[1]); ctx.fillStyle = g; ctx.fillRect(X0, Y0, BW, BH); }
  const sb = ctx.createLinearGradient(0, Y0 + 300, 0, Y0 + BH); sb.addColorStop(0, "rgba(0,20,80,0)"); sb.addColorStop(1, `rgba(0,10,50,${im.b ? .3 : .6})`);
  ctx.fillStyle = sb; ctx.fillRect(X0, Y0 + 200, BW, BH);
  ctx.restore();
  // rótulos
  const label = (letter, text, x, y, align, sc, maxW) => {
    ctx.font = `900 120px ${FONT}`; ctx.textAlign = align; ctx.textBaseline = "alphabetic";
    ctx.lineWidth = 18; ctx.strokeStyle = INK; ctx.strokeText(letter, x, y); ctx.fillStyle = NY; ctx.fillText(letter, x, y);
    ctx.font = `900 60px ${FONT}`;
    const lines = wrap(ctx, String(text || "").toUpperCase(), maxW).slice(0, 3);
    lines.forEach((l, i) => {
      const yy = y + 70 + i * 62;
      ctx.lineWidth = 12; ctx.strokeStyle = sc; ctx.strokeText(l, x, yy); ctx.fillStyle = "#fff"; ctx.fillText(l, x, yy);
    });
  };
  label("A", s.opcaoA || "Opção A", X0 + 50, Y0 + 130, "left", "rgba(110,30,0,.95)", 520);
  label("B", s.opcaoB || "Opção B", X0 + BW - 50, Y0 + 430, "right", "rgba(20,30,110,.95)", 600);
  ctx.restore();
  // linha da diagonal, borda e "OU"
  ctx.beginPath(); ctx.moveTo(X0, Y0 + 440); ctx.lineTo(X0 + BW, Y0 + 200); ctx.lineWidth = 12; ctx.strokeStyle = "#fff"; ctx.stroke();
  rr(ctx, X0, Y0, BW, BH, R); ctx.lineWidth = 8; ctx.strokeStyle = "#fff"; ctx.stroke();
  const ox = X0 + 690, oy = Y0 + 440 - (240 * 690) / BW; // ponto da diagonal mais à direita
  ctx.beginPath(); ctx.arc(ox, oy, 62, 0, Math.PI * 2); ctx.fillStyle = "#140e28"; ctx.fill(); ctx.lineWidth = 7; ctx.strokeStyle = "#fff"; ctx.stroke();
  ctx.font = `900 56px ${FONT}`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillStyle = NY; ctx.fillText("OU", ox, oy + 4);

  if (s.figurinha) {
    T(ctx, "VOTE NA ENQUETE", W / 2, 1470, 66, "#fff");
    arrow(ctx, W / 2 - 330, 1420); arrow(ctx, W / 2 + 330, 1420);
    // área livre embaixo para a figurinha de enquete do Instagram
  } else {
    T(ctx, "RESPONDA ESTE STORY", W / 2, 1480, 64, "#fff");
    T(ctx, "COM A OU B", W / 2, 1560, 76, NY);
  }
  vignette(ctx, 0.6);
}

function drawNovidade(ctx, s, im) {
  background(ctx, im.capa);
  brand(ctx, im.logo, s.serie);
  T(ctx, `PARTE ${s.parte || "?"}`, W / 2, 500, 140, NY);
  T(ctx, s.titulo || "JÁ SAIU", W / 2, 600, 84, "#fff", { maxW: 940 });
  const X0 = 190, Y0 = 660, BW = 700, BH = 860;
  ctx.save(); ctx.shadowColor = "rgba(0,0,0,.6)"; ctx.shadowBlur = 40; rr(ctx, X0, Y0, BW, BH, 40); ctx.fillStyle = "#000"; ctx.fill(); ctx.restore();
  ctx.save(); rr(ctx, X0, Y0, BW, BH, 40); ctx.clip();
  if (im.capa) cover(ctx, im.capa, X0, Y0, BW, BH);
  else { const g = ctx.createLinearGradient(0, Y0, 0, Y0 + BH); g.addColorStop(0, "#703A96"); g.addColorStop(1, "#1c1040"); ctx.fillStyle = g; ctx.fillRect(X0, Y0, BW, BH); T(ctx, "CAPA", W / 2, Y0 + BH / 2, 80, "rgba(255,255,255,.4)", { stroke: 0 }); }
  ctx.restore();
  rr(ctx, X0, Y0, BW, BH, 40); ctx.lineWidth = 8; ctx.strokeStyle = "#fff"; ctx.stroke();
  // selo "NOVO"
  ctx.save(); ctx.translate(X0 + BW - 40, Y0 + 30); ctx.rotate(0.18);
  badge(ctx, "NOVO!", 0, -10, 50); ctx.restore();
  if (s.texto) T(ctx, s.texto, W / 2, 1600, 54, "#fff", { maxW: 900, weight: 800 });
  T(ctx, "ASSISTA NO PERFIL", W / 2, s.texto ? 1690 : 1620, 64, NY);
  vignette(ctx, 0.55);
}

function drawEmbreve(ctx, s, im) {
  background(ctx, im.capa);
  brand(ctx, im.logo, s.serie);
  T(ctx, "EM BREVE", W / 2, 520, 110, "#fff");
  T(ctx, `PARTE ${s.parte || "?"}`, W / 2, 680, 190, NY);
  if (s.texto) T(ctx, s.texto, W / 2, 800, 64, "#fff", { maxW: 900, weight: 800 });
  {
    const X0 = 240, Y0 = 880, BW = 600, BH = 520;
    ctx.save(); rr(ctx, X0, Y0, BW, BH, 36); ctx.clip();
    if (im.capa) { ctx.filter = "brightness(.85)"; cover(ctx, im.capa, X0, Y0, BW, BH); }
    else {
      const g = ctx.createLinearGradient(0, Y0, 0, Y0 + BH); g.addColorStop(0, "#703A96"); g.addColorStop(1, "#1c1040");
      ctx.fillStyle = g; ctx.fillRect(X0, Y0, BW, BH);
      T(ctx, "?", W / 2, Y0 + BH / 2 + 130, 380, NY, { stroke: 0.08 });
    }
    ctx.restore();
    rr(ctx, X0, Y0, BW, BH, 36); ctx.lineWidth = 8; ctx.strokeStyle = "#fff"; ctx.stroke();
  }
  if (s.quando) {
    const d = new Date(s.quando);
    const p = (n) => String(n).padStart(2, "0");
    const dias = ["DOMINGO", "SEGUNDA", "TERÇA", "QUARTA", "QUINTA", "SEXTA", "SÁBADO"];
    badge(ctx, `${dias[d.getDay()]} · ${p(d.getDate())}/${p(d.getMonth() + 1)} · ${p(d.getHours())}H${d.getMinutes() ? p(d.getMinutes()) : ""}`, W / 2, 1450, 62);
  }
  T(ctx, s.meta ? `SAI COM ${s.meta} CURTIDAS` : "ATIVE AS NOTIFICAÇÕES", W / 2, 1640, 60, "#fff");
  vignette(ctx, 0.55);
}

function loadImg(src) {
  return new Promise((res) => { if (!src) return res(null); const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; });
}
const fileUrl = (e) => { const f = e.target.files?.[0]; return f ? URL.createObjectURL(f) : ""; };

export default function Stories() {
  const canvas = useRef(null);
  const [s, setS] = useState({
    modelo: "enquete", serie: "Fome Herdada", parte: "15",
    opcaoA: "Descer e mostrar que já foi gente", opcaoB: "Se esconder e seguir os humanos", figurinha: true,
    titulo: "Presas de Brasa", texto: "Um humano apontou pra você: MONSTRO.", quando: "", meta: "150",
  });
  const [urls, setUrls] = useState({ a: "/arte/parte15-a.jpg", b: "/arte/parte15-b.jpg", capa: "" });
  const [video, setVideo] = useState(null);
  const [mode, setMode] = useState("now");
  const [when, setWhen] = useState("");
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState(null);
  const [acc, setAcc] = useState(undefined);
  const imgs = useRef({ logo: null, a: null, b: null, capa: null });
  const [fontOk, setFontOk] = useState(false);

  useEffect(() => {
    fetch("/api/instagram/me").then((r) => (r.ok ? r.json() : null)).then(setAcc).catch(() => setAcc(null));
    loadImg("/icon.png").then((l) => { imgs.current.logo = l; render(); });
    Promise.all([document.fonts.load(`900 80px "Roboto Condensed"`), document.fonts.load(`800 80px "Roboto Condensed"`)])
      .then(() => setFontOk(true)).catch(() => setFontOk(true));
  }, []);
  useEffect(() => {
    Promise.all([loadImg(urls.a), loadImg(urls.b), loadImg(urls.capa)]).then(([a, b, capa]) => {
      Object.assign(imgs.current, { a, b, capa }); render();
    });
  }, [urls]);
  useEffect(() => { render(); }, [s, video, fontOk]);

  function render() {
    const c = canvas.current; if (!c) return;
    const ctx = c.getContext("2d"); ctx.clearRect(0, 0, W, H);
    if (s.modelo === "enquete") drawEnquete(ctx, s, imgs.current);
    else if (s.modelo === "novidade") drawNovidade(ctx, s, imgs.current);
    else drawEmbreve(ctx, s, imgs.current);
  }
  const set = (k) => (e) => setS({ ...s, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value });

  function download() {
    render();
    canvas.current.toBlob((b) => {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(b); a.download = `${(s.serie || "story").toLowerCase().replace(/\s+/g, "_")}_parte${s.parte}_stories_${s.modelo}.jpg`; a.click();
    }, "image/jpeg", 0.95);
  }

  async function go() {
    setBusy(mode === "now" ? "Publicando…" : "Agendando…"); setMsg(null);
    try {
      let file, kind;
      if (video) { file = video; kind = "video"; }
      else {
        render();
        const blob = await new Promise((r) => canvas.current.toBlob(r, "image/jpeg", 0.92));
        file = new File([blob], "story.jpg", { type: "image/jpeg" }); kind = "image";
      }
      const up = await uploadPresigned(`stories/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`, file, {
        access: "public", handleUploadUrl: "/api/blob", multipart: file.size > 20 * 1024 * 1024,
      });
      if (mode === "now") {
        const r = await fetch("/api/instagram/story", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ media_url: up.url, kind }) });
        const d = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(d.error || "Falha ao publicar.");
        setMsg({ ok: true, text: "Story publicado! Ele fica 24 horas no ar." });
      } else {
        const nome = video ? "Vídeo" : TEMPLATES[s.modelo].nome;
        const r = await fetch("/api/agenda", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            scheduled_at: new Date(when).toISOString(),
            title: `Story · ${nome} · ${s.serie} Parte ${s.parte}`.slice(0, 100),
            description: s.modelo === "enquete" ? `A) ${s.opcaoA}\nB) ${s.opcaoB}` : (s.texto || s.titulo || ""),
            tags: [], ai: false, video_url: up.url, video_name: file.name, cover_url: null,
            platforms: { instagram_story: { kind } },
          }),
        });
        const d = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(d.error || "Falha ao agendar.");
        setMsg({ ok: true, text: `Story agendado para ${new Date(when).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}.`, link: "/agenda" });
      }
    } catch (e) {
      setMsg({ ok: false, text: e.message });
    } finally {
      setBusy("");
    }
  }

  const blocked = acc === null;
  const stickerMode = s.modelo === "enquete" && s.figurinha && !video;
  const cantGo = !!busy || blocked || (mode === "schedule" && (!when || new Date(when) < new Date(Date.now() + 60000)));

  return (
    <div className="studio">
      <header className="studio-head">
        <div>
          <h1>Stories</h1>
          <p className="hint">No padrão dos Stories da série: VOCÊ DECIDE, quadro na diagonal, OU no meio e área para a enquete.</p>
        </div>
        <div className="head-actions"><a href="/agenda" className="btn ghost small">Agenda</a></div>
      </header>

      {blocked && <div className="notice info">Conecte o Instagram em <a href="/conexoes">Conexões</a> para publicar Stories.</div>}

      <div className="story-grid">
        <section className="panel">
          <h2><span className="step">1</span> Modelo</h2>
          <div className="tpl-list">
            {Object.entries(TEMPLATES).map(([k, t]) => (
              <button key={k} className={`tpl ${s.modelo === k && !video ? "on" : ""}`} onClick={() => { setVideo(null); setS({ ...s, modelo: k }); }}>
                <strong>{t.nome}</strong><span>{t.desc}</span>
              </button>
            ))}
            <label className={`tpl ${video ? "on" : ""}`}>
              <strong>Vídeo próprio</strong><span>{video ? video.name : "Um trecho vertical de até 60 s"}</span>
              <input type="file" accept="video/mp4,video/quicktime" hidden onChange={(e) => setVideo(e.target.files?.[0] || null)} />
            </label>
          </div>

          {!video && (
            <>
              <h2 style={{ marginTop: 22 }}><span className="step">2</span> Conteúdo</h2>
              <div className="two">
                <div><label className="field small">Série</label><input className="text" value={s.serie} onChange={set("serie")} maxLength={24} /></div>
                <div><label className="field small">Parte</label><input className="text" value={s.parte} onChange={set("parte")} maxLength={4} /></div>
              </div>

              {s.modelo === "enquete" && (
                <>
                  <label className="field small">Opção A (lado quente, em cima)</label>
                  <input className="text" value={s.opcaoA} onChange={set("opcaoA")} maxLength={40} />
                  <label className="field small">Cena da opção A (opcional)</label>
                  <input type="file" accept="image/*" onChange={(e) => setUrls({ ...urls, a: fileUrl(e) })} />
                  <label className="field small">Opção B (lado frio, embaixo)</label>
                  <input className="text" value={s.opcaoB} onChange={set("opcaoB")} maxLength={40} />
                  <label className="field small">Cena da opção B (opcional)</label>
                  <input type="file" accept="image/*" onChange={(e) => setUrls({ ...urls, b: fileUrl(e) })} />
                  <label className="check" style={{ marginTop: 14 }}>
                    <input type="checkbox" checked={s.figurinha} onChange={set("figurinha")} />
                    Vou colocar a figurinha de enquete no app
                  </label>
                  <p className="hint">{s.figurinha
                    ? "Mostra VOTE NA ENQUETE com as setas e deixa a área de baixo livre para a figurinha (publicar pelo app)."
                    : "Mostra RESPONDA ESTE STORY COM A OU B: dá para publicar direto daqui, e os votos chegam por mensagem."}</p>
                </>
              )}

              {s.modelo === "novidade" && (
                <>
                  <label className="field small">Nome do episódio</label>
                  <input className="text" value={s.titulo} onChange={set("titulo")} maxLength={40} />
                  <label className="field small">Frase de apoio (opcional)</label>
                  <input className="text" value={s.texto} onChange={set("texto")} maxLength={70} />
                  <label className="field small">Capa do episódio</label>
                  <input type="file" accept="image/*" onChange={(e) => setUrls({ ...urls, capa: fileUrl(e) })} />
                </>
              )}

              {s.modelo === "embreve" && (
                <>
                  <label className="field small">Frase (opcional)</label>
                  <input className="text" value={s.texto} onChange={set("texto")} maxLength={50} />
                  <div className="two">
                    <div><label className="field small">Data e hora</label><input className="text" type="datetime-local" value={s.quando} onChange={set("quando")} /></div>
                    <div><label className="field small">Meta de curtidas</label><input className="text" value={s.meta} onChange={set("meta")} maxLength={6} placeholder="vazio = notificações" /></div>
                  </div>
                  <label className="field small">Imagem (opcional)</label>
                  <input type="file" accept="image/*" onChange={(e) => setUrls({ ...urls, capa: fileUrl(e) })} />
                </>
              )}
            </>
          )}
        </section>

        <section className="panel preview-col">
          <h2>Prévia</h2>
          <div className="phone">
            {video ? <video src={URL.createObjectURL(video)} controls playsInline /> : <canvas ref={canvas} width={W} height={H} />}
          </div>
          <p className="hint center">1080×1920 · padrão da série</p>
        </section>

        <section className="panel">
          <h2><span className="step">3</span> Publicar</h2>
          {stickerMode ? (
            <>
              <p className="hint">
                Com a figurinha de enquete, o caminho é pelo app (a API do Instagram não coloca figurinhas):
              </p>
              <ol className="hint steps-list">
                <li>Baixe a imagem.</li>
                <li>No app, crie um Story com ela.</li>
                <li>Adicione a figurinha <b>Enquete</b> na área livre de baixo, com as respostas <b>A: {s.opcaoA}</b> e <b>B: {s.opcaoB}</b>.</li>
              </ol>
              <button className="btn big" onClick={download}>Baixar imagem do Story</button>
              <button className="link" style={{ marginTop: 10 }} onClick={() => setS({ ...s, figurinha: false })}>Prefiro publicar direto daqui (voto por mensagem)</button>
            </>
          ) : (
            <>
              <div className="seg">
                <button className={mode === "now" ? "on" : ""} onClick={() => setMode("now")}>Agora</button>
                <button className={mode === "schedule" ? "on" : ""} onClick={() => setMode("schedule")}>Agendar</button>
              </div>
              {mode === "schedule" && <input className="text" type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />}
              <button className="btn big" disabled={cantGo} onClick={go}>{busy || (mode === "now" ? "Publicar Story" : "Agendar Story")}</button>
              {!video && <button className="btn ghost small" style={{ width: "100%", marginTop: 10 }} onClick={download}>Baixar imagem do Story</button>}
            </>
          )}
          {msg && <div className={`notice ${msg.ok ? "ok" : "err"}`}>{msg.text} {msg.link && <a href={msg.link}>Ver na agenda</a>}</div>}
          <p className="hint">Conta: {acc ? `@${acc.username}` : "—"}</p>
        </section>
      </div>
    </div>
  );
}
