"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

type StaffSection = { href: string; label: string };

export function StaffWorkspace({
  title,
  sections,
  children,
}: {
  title: string;
  sections: readonly StaffSection[];
  children: ReactNode;
}) {
  const pathname = usePathname();
  const activeSection = sections.reduce<StaffSection | undefined>(
    (active, section) => {
      const matches =
        pathname === section.href || pathname?.startsWith(`${section.href}/`);
      return matches && (!active || section.href.length > active.href.length)
        ? section
        : active;
    },
    undefined,
  );

  return (
    <div className="mx-auto grid w-full max-w-7xl items-start gap-5 px-4 py-6 sm:px-6 md:grid-cols-[13rem_minmax(0,1fr)] md:py-8 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-7">
      <aside className="rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 lg:sticky lg:top-24">
        <nav aria-label={title}>
          <p className="mb-2 px-3 pt-1 text-sm font-semibold text-zinc-950 dark:text-zinc-100">
            {title}
          </p>
          <ul className="flex flex-wrap gap-1 md:flex-col">
            {sections.map((section) => (
              <li key={section.href}>
                <Link
                  href={section.href}
                  aria-current={
                    activeSection === section
                      ? pathname === section.href
                        ? "page"
                        : "location"
                      : undefined
                  }
                  className="block rounded-lg border-l-2 border-transparent px-3 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100 focus-visible:outline-2 focus-visible:outline-indigo-600 aria-[current]:border-indigo-600 aria-[current]:bg-indigo-50 aria-[current]:text-indigo-950 dark:text-zinc-300 dark:hover:bg-zinc-900 dark:aria-[current]:bg-indigo-950 dark:aria-[current]:text-indigo-100"
                >
                  {section.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </aside>
      <main className="min-w-0 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 sm:p-6 lg:p-7">
        {children}
      </main>
    </div>
  );
}
