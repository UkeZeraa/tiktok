import { del } from "@vercel/blob";
import { db } from "@/lib/db";
import { PUBLISHERS } from "@/lib/publishers";

// Executa um post da agenda: publica em cada rede marcada que ainda não deu certo.
export async function runPost(id) {
  // Trava o post (só um despertador por vez consegue pegar o mesmo post).
  const { data: post, error } = await db()
    .from("posts")
    .update({ status: "running", updated_at: new Date().toISOString() })
    .eq("id", id)
    .in("status", ["scheduled", "partial", "error"])
    .select("*")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!post) return { skipped: true };

  const results = { ...(post.results || {}) };
  const targets = Object.keys(post.platforms || {}).filter((p) => PUBLISHERS[p] && results[p]?.state !== "ok" && results[p]?.state !== "warn");

  await Promise.all(
    targets.map(async (p) => {
      try {
        results[p] = { ...(await PUBLISHERS[p](post)), at: new Date().toISOString() };
      } catch (e) {
        results[p] = { state: "err", msg: e.message, at: new Date().toISOString() };
      }
    })
  );

  const states = Object.keys(post.platforms).map((p) => results[p]?.state);
  const allOk = states.every((s) => s === "ok" || s === "warn");
  const noneOk = states.every((s) => s === "err");
  const status = allOk ? "done" : noneOk ? "error" : "partial";

  await db().from("posts").update({
    status,
    results,
    attempts: (post.attempts || 0) + 1,
    updated_at: new Date().toISOString(),
  }).eq("id", id);

  // Só apaga os arquivos quando todas as redes terminaram bem (se falhar, dá para tentar de novo).
  if (allOk) await del([post.video_url, post.cover_url].filter(Boolean)).catch(() => {});
  return { status, results };
}

// Pega os posts vencidos. Um por vez, para caber no tempo máximo da função.
export async function runDue(limit = 1) {
  // Recupera posts que ficaram travados em "executando" (função interrompida no meio).
  await db().from("posts")
    .update({ status: "error", updated_at: new Date().toISOString() })
    .eq("status", "running")
    .lt("updated_at", new Date(Date.now() - 10 * 60 * 1000).toISOString());

  const { data, error } = await db()
    .from("posts")
    .select("id")
    .eq("status", "scheduled")
    .lte("scheduled_at", new Date().toISOString())
    .order("scheduled_at", { ascending: true })
    .limit(limit);
  if (error) throw new Error(error.message);
  const out = [];
  for (const p of data || []) out.push({ id: p.id, ...(await runPost(p.id)) });
  return out;
}
