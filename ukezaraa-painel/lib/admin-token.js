// Token de administrador assinado com HMAC (Web Crypto). Sem dependências do Next, serve no proxy.
export const ADMIN_COOKIE = "uz_admin";
const enc = new TextEncoder();

function b64url(buf) {
  let s = "";
  for (const b of new Uint8Array(buf)) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function hmac(text) {
  const k = await crypto.subtle.importKey("raw", enc.encode(process.env.TOKEN_KEY || ""), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return b64url(await crypto.subtle.sign("HMAC", k, enc.encode(text)));
}

export async function makeAdminToken(days = 30) {
  const exp = Date.now() + days * 86400000;
  return `${exp}.${await hmac(`admin.${exp}`)}`;
}

export async function checkAdminToken(token) {
  if (!token || !process.env.TOKEN_KEY) return false;
  const [exp, sig] = String(token).split(".");
  if (!exp || !sig || Number(exp) < Date.now()) return false;
  return sig === (await hmac(`admin.${exp}`));
}
