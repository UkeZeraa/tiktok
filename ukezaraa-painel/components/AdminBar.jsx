"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

// Mostra "Entrar" ou "Sair" no topo, em qualquer aparelho.
export default function AdminBar() {
  const [admin, setAdmin] = useState(null);
  const path = usePathname();
  useEffect(() => {
    fetch("/api/admin/me", { cache: "no-store" }).then((r) => r.json()).then((d) => setAdmin(!!d.admin)).catch(() => setAdmin(false));
  }, [path]);
  if (admin === null) return null;
  return admin
    ? <a href="/api/admin/logout" className="nav-cta out">Sair</a>
    : <a href={`/entrar?next=${encodeURIComponent(path || "/agenda")}`} className="nav-cta">Entrar</a>;
}
