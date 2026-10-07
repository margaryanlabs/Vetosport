import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VETO Sport — Sports Market Intelligence",
  description: "Research-grade sports market intelligence: live state, price auditing, regime transitions and decision authority.",
  icons: { icon: "/veto-mark.svg", shortcut: "/veto-mark.svg", apple: "/veto-mark.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
