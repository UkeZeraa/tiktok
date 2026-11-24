import "./globals.css";
import Link from "next/link";

export const metadata = {
  title: "UkeZaraa Studio",
  description: "Publishing studio for the original animated stories of the UkeZaraa channel.",
  icons: { icon: "/icon.png" },
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>
        <header className="top">
          <Link href="/" className="brand">
            <img src="/icon.png" alt="" width={34} height={34} />
            <span>UkeZaraa <em>Studio</em></span>
          </Link>
          <nav>
            <Link href="/studio">Estúdio</Link>
            <Link href="/conexoes">Conexões</Link>
            <Link href="/terms">Terms</Link>
            <Link href="/privacy">Privacy</Link>
          </nav>
        </header>
        <main>{children}</main>
        <footer className="foot">
          <Link href="/terms">Terms of Service</Link>
          <span>·</span>
          <Link href="/privacy">Privacy Policy</Link>
          <span>·</span>
          <span>© {new Date().getFullYear()} UkeZaraa</span>
        </footer>
      </body>
    </html>
  );
}
