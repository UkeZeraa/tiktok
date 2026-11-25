import { createClient } from "@supabase/supabase-js";

let client = null;

// Acesso ao banco só pelo servidor, com a chave service_role (nunca vai para o navegador).
export function db() {
  if (client) return client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Banco não configurado: faltam SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY na Vercel.");
  client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return client;
}

export function dbReady() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}
