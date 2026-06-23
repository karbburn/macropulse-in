import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Macro Event Impact Tracker — India Edition",
  description: "Analyze Indian macroeconomic event impacts on financial markets.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground font-sans">
        {/* Navigation Bar */}
        <header className="sticky top-0 z-50 border-b border-[#2c2c2c] bg-[#1a1a1a]/85 backdrop-blur-md">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex h-16 items-center justify-between">
              <div className="flex items-center gap-8">
                <Link href="/" className="flex items-center gap-2 hover:opacity-90 transition-opacity">
                  <span className="font-serif text-xl font-bold tracking-tight text-brand-amber">
                    MACRO<span className="text-neutral-400 font-sans text-xs font-semibold ml-1.5 uppercase tracking-widest">Tracker</span>
                  </span>
                </Link>
                <nav className="flex items-center gap-6">
                  <Link
                    href="/"
                    className="text-sm font-medium text-neutral-300 hover:text-brand-amber transition-colors"
                  >
                    Timeline
                  </Link>
                  <Link
                    href="/study"
                    className="text-sm font-medium text-neutral-300 hover:text-brand-amber transition-colors"
                  >
                    Event Study
                  </Link>
                  <Link
                    href="/report"
                    className="text-sm font-medium text-neutral-300 hover:text-brand-amber transition-colors"
                  >
                    Report Builder
                  </Link>
                </nav>
              </div>
              <div className="hidden sm:flex items-center gap-4">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-400 ring-1 ring-inset ring-emerald-500/20">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Connected
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1">
          {children}
        </main>

        {/* Footer */}
        <footer className="border-t border-[#2c2c2c] bg-[#151515] py-6 text-center text-xs text-neutral-500">
          <p>© {new Date().getFullYear()} Macro Event Impact Tracker — India Edition. Market data powered by yfinance.</p>
        </footer>
      </body>
    </html>
  );
}
