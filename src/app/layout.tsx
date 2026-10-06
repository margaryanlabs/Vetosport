import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VETO Sport — Sports Decision Intelligence",
  description: "Intelligence layer between the game and the odds.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
