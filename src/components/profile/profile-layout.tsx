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
  const desktopToggle = desktopOpen ? "Collapse profile navigation" : "Expand profile navigation";

  return (
    <div className="min-w-0 overflow-clip rounded-2xl border border-indigo-100 bg-slate-50/90 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/70">
      <div className={`grid min-w-0 ${desktopOpen ? "md:grid-cols-[13rem_minmax(0,1fr)] lg:grid-cols-[15rem_minmax(0,1fr)]" : "md:grid-cols-[3.5rem_minmax(0,1fr)]"}`}>
        <aside className="min-w-0 border-b border-indigo-100 bg-white p-1.5 md:border-r md:border-b-0 dark:border-zinc-800 dark:bg-zinc-950">
          <div className="md:sticky md:top-4 lg:top-24">
            <button ref={mobileToggle} type="button" aria-controls={sidebarId} aria-expanded={mobileOpen}
              onClick={() => setMobileOpen((open) => !open)} className={`${profileSectionClassName} md:hidden`}>
              Profile navigation
            </button>
            <div id={sidebarId} className={`${mobileOpen ? "block" : "hidden"} ${desktopOpen ? "md:block" : "md:hidden"} space-y-4 p-1.5`}>
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
            <button
              type="button"
              aria-label={desktopToggle}
              title={desktopToggle}
              aria-controls={sidebarId}
              aria-expanded={desktopOpen}
              onClick={() => setDesktopOpen((open) => !open)}
              className="hidden size-11 items-center justify-center rounded-lg text-indigo-700 hover:bg-indigo-50 focus-visible:outline-2 focus-visible:outline-indigo-600 md:flex dark:text-indigo-300 dark:hover:bg-zinc-900"
            >
              <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="size-5">
                <rect x="2.75" y="3.75" width="14.5" height="12.5" rx="2" />
                <path d="M8 4v12" />
              </svg>
            </button>
          </div>
        </aside>
        <div className="min-w-0 space-y-5 p-4 sm:p-6 lg:p-8">{children}</div>
      </div>
    </div>
  );
}
