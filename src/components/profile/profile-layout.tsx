"use client";

import { useId, useRef, useState, type ReactNode } from "react";

export const profileSectionClassName =
  "flex min-h-11 w-full items-center rounded-lg border-l-2 border-transparent px-3 py-2.5 text-left text-sm font-medium text-zinc-700 hover:bg-zinc-100 focus-visible:outline-2 focus-visible:outline-indigo-600 aria-[current]:border-indigo-600 aria-[current]:bg-indigo-50 aria-[current]:text-indigo-950 dark:text-zinc-300 dark:hover:bg-zinc-900 dark:aria-[current]:bg-indigo-950 dark:aria-[current]:text-indigo-100";

export function ProfileLayout({
  sections,
  sidebarHeader,
  children,
}: {
  sections: ReactNode;
  sidebarHeader?: ReactNode;
  children: ReactNode;
}) {
  const sidebarId = useId();
  const mobileToggle = useRef<HTMLButtonElement>(null);
  const [desktopOpen, setDesktopOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const toggleClass = "min-h-11 w-fit rounded-lg border border-indigo-200 px-3 text-sm font-semibold text-indigo-700 hover:bg-indigo-50 dark:border-zinc-700 dark:text-indigo-300 dark:hover:bg-zinc-900";

  return (
    <div className="min-w-0 overflow-clip rounded-2xl border border-indigo-100 bg-slate-50/90 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/70">
      <div className="border-b border-indigo-100 bg-white px-4 py-2 dark:border-zinc-800 dark:bg-zinc-950">
        <button ref={mobileToggle} type="button" aria-controls={sidebarId} aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((open) => !open)} className={`${toggleClass} md:hidden`}>
          {mobileOpen ? "Hide profile menu" : "Show profile menu"}
        </button>
        <button type="button" aria-controls={sidebarId} aria-expanded={desktopOpen}
          onClick={() => setDesktopOpen((open) => !open)} className={`hidden md:inline-flex md:items-center ${toggleClass}`}>
          {desktopOpen ? "Hide profile sidebar" : "Show profile sidebar"}
        </button>
      </div>
      <div className={`grid min-w-0 ${desktopOpen ? "md:grid-cols-[13rem_minmax(0,1fr)] lg:grid-cols-[15rem_minmax(0,1fr)]" : ""}`}>
        <aside id={sidebarId} className={`${mobileOpen ? "block" : "hidden"} ${desktopOpen ? "md:block" : "md:hidden"} min-w-0 border-b border-indigo-100 bg-white p-3 md:border-r md:border-b-0 dark:border-zinc-800 dark:bg-zinc-950`}>
          <div className="space-y-4 md:sticky md:top-4 lg:top-24">
            {sidebarHeader}
            <nav
              aria-label="Profile sections"
              onClick={(event) => {
                if (mobileOpen && event.target instanceof Element && event.target.closest("a, button")) {
                  setMobileOpen(false);
                  mobileToggle.current?.focus();
                }
              }}
            >
              {sections}
            </nav>
          </div>
        </aside>
        <div className="min-w-0 space-y-5 p-4 sm:p-6 lg:p-8">{children}</div>
      </div>
    </div>
  );
}
