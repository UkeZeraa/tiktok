import "./globals.css";
import Link from "next/link";

export const metadata = {
  title: "UkeZaraa",
  description: "Publishing dashboard for the original animated stories of the UkeZaraa channel.",
  icons: { icon: "/icon.png" },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <header className="top">
          <Link href="/" className="brand">
            <img src="/icon.png" alt="" width={36} height={36} />
            <span>UkeZaraa</span>
          </Link>
          <nav>
            <Link href="/dashboard">Dashboard</Link>
            <Link href="/terms">Terms of Service</Link>
            <Link href="/privacy">Privacy Policy</Link>
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
