import type { ReactNode } from "react";

export const profileSectionClassName =
  "flex min-h-11 w-full items-center rounded-lg border-l-2 border-transparent px-3 py-2.5 text-left text-sm font-medium text-zinc-700 hover:bg-zinc-100 focus-visible:outline-2 focus-visible:outline-indigo-600 aria-[current]:border-indigo-600 aria-[current]:bg-indigo-50 aria-[current]:text-indigo-950 dark:text-zinc-300 dark:hover:bg-zinc-900 dark:aria-[current]:bg-indigo-950 dark:aria-[current]:text-indigo-100";

export function ProfileLayout({
  sections,
  children,
}: {
  sections: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="grid min-w-0 items-start gap-5 md:grid-cols-[13rem_minmax(0,1fr)] lg:grid-cols-[15rem_minmax(0,1fr)]">
      <aside className="min-w-0 rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm md:sticky md:top-4 lg:top-24 dark:border-zinc-800 dark:bg-zinc-950">
        <nav aria-label="Profile sections">{sections}</nav>
      </aside>
      <div className="min-w-0 space-y-5">{children}</div>
    </div>
  );
}
