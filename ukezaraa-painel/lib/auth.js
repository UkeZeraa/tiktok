import { getSession } from "@/lib/tiktok";
import { getIgSession } from "@/lib/instagram";
import { getYtSession } from "@/lib/youtube";

// Qualquer rede conectada libera o uso do armazenamento temporário.
export async function anySession() {
  return (await getSession()) || (await getIgSession()) || (await getYtSession());
}

export function isOurBlob(url) {
  try {
    return new URL(url).hostname.endsWith(".blob.vercel-storage.com");
  } catch {
    return false;
  }
}
