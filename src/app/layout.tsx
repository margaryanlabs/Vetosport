import type { Metadata } from "next";
import "./globals.css";
import "./veto-brand.css";
import "./workspace-shell.css";
import "./match-room.css";
import "./observed-room.css";
import "./veto-terminal-v3.css";
import "./veto-sport-system.css";
import "./veto-sport-showcase.css";
import "./veto-sport-observation.css";
import "./veto-sport-light.css";
import "./veto-sport-product.css";

export const metadata: Metadata = {
  title: "VETO Sport — Sports Market Intelligence",
  description:
    "Research-grade sports market intelligence: live state, price auditing, regime transitions and decision authority.",
  icons: {
    icon: "/veto-mark.svg",
    shortcut: "/veto-mark.svg",
    apple: "/veto-mark.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#07090c" />
        <script dangerouslySetInnerHTML={{ __html: `try { document.documentElement.dataset.vetoSportAppearance = localStorage.getItem("veto-sport-appearance") === "light" ? "light" : "dark"; } catch { document.documentElement.dataset.vetoSportAppearance = "dark"; }` }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
