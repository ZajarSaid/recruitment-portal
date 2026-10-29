import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import { SiteHeader } from "@/components/site-header";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "ZZRH Recruitment Portal — Careers",
    template: "%s | ZZRH Recruitment Portal",
  },
  description:
    "Career and recruitment portal. Browse vacancies and apply online in a few simple steps.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      data-theme="light"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("theme");if(t==="dark"||t==="light")document.documentElement.setAttribute("data-theme",t)}catch(e){}})()`,
          }}
        />
      </head>
      <body className="flex min-h-full flex-col bg-gradient-to-br from-indigo-50 via-white to-sky-100 text-slate-900 dark:from-zinc-950 dark:via-zinc-900 dark:to-slate-950 dark:text-zinc-100">
        <SiteHeader />
        <div className="flex-1">{children}</div>
        <footer className="border-t border-zinc-200/70 py-6 text-center text-xs text-zinc-500 backdrop-blur-sm dark:border-zinc-800/70 dark:text-zinc-400">
          Careers and recruitment portal. Automated resume scoring (when
          enabled) is a simulated assessment, not a validated measure of
          suitability.
        </footer>
      </body>
    </html>
  );
}
