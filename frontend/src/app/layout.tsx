import type { Metadata } from "next";
import { DM_Serif_Display, Syne, JetBrains_Mono } from "next/font/google";
import { AnimatePresence } from "framer-motion";
import "./globals.css";
import { NavBar } from "@/components/NavBar";

const dmSerifDisplay = DM_Serif_Display({
  variable: "--font-display-next",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  display: "swap",
});

const syne = Syne({
  variable: "--font-body-next",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono-next",
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "MacroPulse — India Edition",
  description: "Analyze Indian macroeconomic event impacts on financial markets.",
};

export const viewport = {
  themeColor: '#0e0e0e',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${dmSerifDisplay.variable} ${syne.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <NavBar />

        {/* Main Content — pb-20 on mobile for bottom tab bar clearance */}
        <main className="flex-1 pb-20 md:pb-0">
          <AnimatePresence mode="wait">
            {children}
          </AnimatePresence>
        </main>

        {/* Footer — minimal, per DESIGN.MD §6.1 */}
        <footer
          className="hidden md:block"
          style={{
            borderTop: '1px solid var(--border-subtle)',
            background: 'var(--bg-surface)',
            padding: 'var(--space-6) 0',
            textAlign: 'center',
            fontFamily: 'var(--font-body)',
            fontSize: 'var(--text-xs)',
            color: 'var(--text-tertiary)',
          }}
        >
          <p>Data: yfinance · Finnhub · data.gov.in</p>
        </footer>
      </body>
    </html>
  );
}
