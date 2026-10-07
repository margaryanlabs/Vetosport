import type { Metadata } from "next";
import { Exo_2, Montserrat } from "next/font/google";
import "./globals.css";

const montserrat = Montserrat({
  subsets: ["latin", "cyrillic"],
  variable: "--font-veto-sans",
  display: "swap",
});

const exo2 = Exo_2({
  subsets: ["latin", "cyrillic"],
  variable: "--font-veto-tech",
  display: "swap",
});

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
    <html lang="ru" className={`${montserrat.variable} ${exo2.variable}`}>
      <body>{children}</body>
    </html>
  );
}
