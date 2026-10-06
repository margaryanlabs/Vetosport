import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VETO Sport — Sports Decision Intelligence",
  description: "Live sports decision intelligence between the game and the market.",
  icons: { icon: "/veto-mark.svg", shortcut: "/veto-mark.svg", apple: "/veto-mark.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
