import Link from "next/link";

export default function RecruiterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <nav className="flex gap-5 border-b border-zinc-200 pb-3 text-sm font-medium text-zinc-600 dark:border-zinc-800 dark:text-zinc-300">
        <Link href="/recruiter/jobs" className="hover:text-zinc-900 dark:hover:text-white">
          Vacancies
        </Link>
        <Link
          href="/recruiter/jobs/new"
          className="hover:text-zinc-900 dark:hover:text-white"
        >
          Create vacancy
        </Link>
      </nav>
      <div className="mt-6">{children}</div>
    </div>
  );
}
