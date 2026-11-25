import { db, dbReady } from "@/lib/db";
import { encrypt, decrypt } from "@/lib/secure";
import { isAdmin } from "@/lib/admin";

// Guarda as chaves de uma rede no banco, para os posts agendados saírem sem o navegador.
// Só grava quando quem conectou é o administrador (senha do estúdio), nunca um visitante.
export async function saveAccountIfAdmin(platform, { label, picture, ...secret }) {
  if (!dbReady() || !(await isAdmin())) return false;
  const { error } = await db().from("accounts").upsert({
    platform,
    label: label || null,
    picture: picture || null,
    secret: encrypt(secret),
    updated_at: new Date().toISOString(),
  });
  if (error) console.error("[accounts] falha ao salvar", platform, error.message);
  return !error;
}

export async function getAccount(platform) {
  const { data, error } = await db().from("accounts").select("*").eq("platform", platform).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return { label: data.label, picture: data.picture, updated_at: data.updated_at, ...decrypt(data.secret) };
}

export async function updateAccountSecret(platform, secret) {
  const { error } = await db().from("accounts").update({ secret: encrypt(secret), updated_at: new Date().toISOString() }).eq("platform", platform);
  if (error) throw new Error(error.message);
}

export async function listAccounts() {
  const { data, error } = await db().from("accounts").select("platform,label,picture,updated_at");
  if (error) throw new Error(error.message);
  return data || [];
}
