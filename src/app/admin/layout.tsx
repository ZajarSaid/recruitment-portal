import Link from "next/link";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <nav className="flex flex-wrap gap-5 border-b border-zinc-200 pb-3 text-sm font-medium text-zinc-600 dark:border-zinc-800 dark:text-zinc-300">
        <Link href="/admin" className="hover:text-zinc-900 dark:hover:text-white">
          Overview
        </Link>
        <Link
          href="/admin/users"
          className="hover:text-zinc-900 dark:hover:text-white"
        >
          Users and roles
        </Link>
        <Link
          href="/admin/jobs"
          className="hover:text-zinc-900 dark:hover:text-white"
        >
          Jobs oversight
        </Link>
        <Link
          href="/admin/applications"
          className="hover:text-zinc-900 dark:hover:text-white"
        >
          Applications oversight
        </Link>
      </nav>
      <div className="mt-6">{children}</div>
    </div>
  );
}
