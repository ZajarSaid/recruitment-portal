import Image from "next/image";
import Link from "next/link";

import { ThemeToggle } from "@/components/theme-toggle";
import { LogoutButton } from "@/components/logout-button";
import { SessionMonitor } from "@/components/auth/session-monitor";
import { ADMIN_SIGN_IN_PATH } from "@/lib/admin-access";
import { getCurrentUser } from "@/lib/dal";
import { isJobManager } from "@/lib/navigation";
import { ROLE_LABELS } from "@/lib/roles";

const navLinkClass =
  "inline-flex min-h-11 items-center rounded-lg px-2 py-1 font-medium hover:bg-indigo-50 hover:text-indigo-700 dark:hover:bg-zinc-900 dark:hover:text-indigo-300";

export async function SiteHeader() {
  const user = await getCurrentUser();

  return (
    <header className="relative z-10 border-b border-indigo-100 bg-white/95 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/95 lg:sticky lg:top-0">
      {user && <SessionMonitor signInPath={user.role === "ADMIN" ? ADMIN_SIGN_IN_PATH : "/login"} />}
      <a
        href="#page-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-2 focus:z-20 focus:rounded-lg focus:bg-indigo-700 focus:px-4 focus:py-3 focus:text-white"
      >
        Skip to content
      </a>
      <div className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 px-4 py-2 sm:px-6 lg:flex lg:gap-5 lg:py-3">
        <Link href="/" className="flex min-h-11 min-w-0 items-center gap-2.5">
          <Image
            src="/LOGO.png"
            alt=""
            width={48}
            height={48}
            className="size-9 shrink-0 rounded-full object-contain sm:size-12"
            preload
          />
          <span className="font-semibold text-indigo-700 dark:text-indigo-300 sm:text-lg">
            ZZRH Recruitment Portal
          </span>
        </Link>
        <div>
          <ThemeToggle />
        </div>
        <div className="col-span-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-sm text-zinc-700 dark:text-zinc-200 lg:min-w-0 lg:flex-1">
          <nav aria-label="Main navigation" className="flex flex-wrap gap-x-1">
            <Link href="/jobs" className={navLinkClass}>
              Jobs
            </Link>
            {user && isJobManager(user.role) && (
              <Link href="/recruiter/jobs" className={navLinkClass}>
                Manage jobs
              </Link>
            )}
            {user && (
              <Link href="/profile" className={navLinkClass}>
                My profile
              </Link>
            )}
            {user?.role === "CANDIDATE" && (
              <Link href="/profile?section=applications" className={navLinkClass}>
                My applications
              </Link>
            )}
          </nav>

          <div className="flex min-w-0 items-center gap-2">
            {user ? (
              <>
                <span
                  className="hidden max-w-48 truncate text-zinc-500 dark:text-zinc-400 xl:block"
                  title={`${user.name} · ${ROLE_LABELS[user.role]}`}
                >
                  {user.name} · {ROLE_LABELS[user.role]}
                </span>
                <LogoutButton className={`${navLinkClass} border border-zinc-300 px-3 dark:border-zinc-700`} />
              </>
            ) : (
              <>
                <Link href="/login" className={navLinkClass}>
                  Log in
                </Link>
                <Link
                  href="/register"
                  className="inline-flex min-h-11 items-center rounded-lg bg-indigo-700 px-3 font-medium text-white transition-colors hover:bg-indigo-800 dark:bg-indigo-400 dark:text-indigo-950 dark:hover:bg-indigo-300"
                >
                  Register
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
