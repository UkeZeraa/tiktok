import crypto from "node:crypto";

// Chave de 32 bytes derivada de TOKEN_KEY (qualquer texto longo e aleatório).
function key() {
  const k = process.env.TOKEN_KEY;
  if (!k || k.length < 24) throw new Error("Configure TOKEN_KEY na Vercel (texto aleatório com 32 caracteres ou mais).");
  return crypto.createHash("sha256").update(k).digest();
}

export function encrypt(obj) {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv("aes-256-gcm", key(), iv);
  const data = Buffer.concat([c.update(JSON.stringify(obj), "utf8"), c.final()]);
  return [iv, c.getAuthTag(), data].map((b) => b.toString("base64url")).join(".");
}

export function decrypt(text) {
  const [iv, tag, data] = text.split(".").map((p) => Buffer.from(p, "base64url"));
  const d = crypto.createDecipheriv("aes-256-gcm", key(), iv);
  d.setAuthTag(tag);
  return JSON.parse(Buffer.concat([d.update(data), d.final()]).toString("utf8"));
}

export function safeEqual(a, b) {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}
