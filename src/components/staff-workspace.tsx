"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import {
  ProfileLayout,
  profileSectionClassName,
} from "@/components/profile/profile-layout";

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
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
      <ProfileLayout
        navigationLabel={title}
        sidebarHeader={
          <p className="mb-2 px-3 pt-1 text-sm font-semibold text-zinc-950 dark:text-zinc-100">
            {title}
          </p>
        }
        sections={
          <ul className="flex flex-wrap gap-1 lg:flex-col">
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
                  className={profileSectionClassName}
                >
                  {section.label}
                </Link>
              </li>
            ))}
          </ul>
        }
      >
        <main className="min-w-0 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 sm:p-6 lg:p-7">
          {children}
        </main>
      </ProfileLayout>
    </div>
  );
}
