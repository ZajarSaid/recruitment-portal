import Image from "next/image";
import Link from "next/link";

import { ThemeToggle } from "@/components/theme-toggle";
import { logoutAction } from "@/lib/actions/auth";
import { getCurrentUser } from "@/lib/dal";
import { ROLE_LABELS } from "@/lib/roles";
import { isJobManager } from "@/lib/navigation";

export async function SiteHeader() {
  const user = await getCurrentUser();

  return (
    <header className="sticky top-0 z-10 border-b border-indigo-100 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:border-zinc-800/70 dark:bg-zinc-950/80 dark:supports-[backdrop-filter]:bg-zinc-950/60">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-3">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2.5">
            <Image
              src="/LOGO.png"
              alt="Zango Referral Hospital logo"
              width={48}
              height={48}
              className="h-12 w-12 rounded-full object-contain"
              preload
            />
            <span className="bg-gradient-to-r from-indigo-600 to-sky-600 bg-clip-text text-lg font-semibold text-transparent dark:from-indigo-400 dark:to-sky-400">
              ZZRH Recruitment Portal
            </span>
          </Link>
          <nav className="flex items-center gap-4 text-sm text-zinc-600 dark:text-zinc-300">
            <Link href="/jobs" className="hover:text-zinc-900 dark:hover:text-white">
              Jobs
            </Link>
            {user && isJobManager(user.role) && (
              <Link
                href="/recruiter/jobs"
                className="transition-colors hover:text-indigo-600 dark:hover:text-indigo-400"
              >
                Manage jobs
              </Link>
            )}
            {user && user.role === "CANDIDATE" && (
              <Link
                href="/dashboard"
                className="transition-colors hover:text-indigo-600 dark:hover:text-indigo-400"
              >
                My applications
              </Link>
            )}
            {user && user.role === "ADMIN" && (
              <Link
                href="/admin"
                className="transition-colors hover:text-indigo-600 dark:hover:text-indigo-400"
              >
                Admin
              </Link>
            )}
          </nav>
        </div>

        <div className="flex items-center gap-3 text-sm">
          <ThemeToggle />
          {user ? (
            <>
              <span className="hidden text-zinc-500 dark:text-zinc-400 sm:inline">
                {user.name} · {ROLE_LABELS[user.role]}
              </span>
              <form action={logoutAction}>
                <button
                  type="submit"
                  className="rounded-md border border-zinc-300 px-3 py-1.5 text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900"
                >
                  Sign out
                </button>
              </form>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="text-zinc-600 transition-colors hover:text-indigo-600 dark:text-zinc-300 dark:hover:text-indigo-400"
              >
                Log in
              </Link>
              <Link
                href="/register"
                className="rounded-lg bg-indigo-600 px-3.5 py-1.5 font-medium text-white shadow-sm shadow-indigo-600/20 transition-colors hover:bg-indigo-500 dark:bg-indigo-500 dark:hover:bg-indigo-400"
              >
                Register
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
