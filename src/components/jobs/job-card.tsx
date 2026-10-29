import Link from "next/link";

import { Badge } from "@/components/ui";
import { formatDate, SALARY_LABEL } from "@/lib/format";
import { getJobAvailability } from "@/lib/jobs";

type JobCardJob = {
  id: string;
  title: string;
  department: string;
  location: string;
  closesAt: Date;
  status: string;
  opensAt: Date;
};

const availabilityBadge: Record<string, { tone: string; label: string }> = {
  OPEN: { tone: "green", label: "Open" },
  UPCOMING: { tone: "amber", label: "Opening soon" },
  CLOSED: { tone: "neutral", label: "Closed" },
};

export function JobCard({ job }: { job: JobCardJob }) {
  const availability = getJobAvailability(job);
  const badge = availabilityBadge[availability];

  return (
    <Link
      href={`/jobs/${job.id}`}
      className="block rounded-xl border border-indigo-100 bg-white/90 p-5 shadow-sm shadow-indigo-900/5 transition-all hover:-translate-y-1 hover:border-indigo-300 hover:shadow-lg hover:shadow-indigo-900/15 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700 animate-in fade-in duration-500"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
            {job.title}
          </h3>
          <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
            {job.department} · {job.location}
          </p>
        </div>
        <Badge tone={badge.tone}>{badge.label}</Badge>
      </div>

      <dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-1 text-sm text-zinc-600 dark:text-zinc-300 sm:grid-cols-2">
        <div className="flex justify-between sm:block">
          <dt className="text-zinc-500 dark:text-zinc-400">Salary</dt>
          <dd className="font-medium text-emerald-700 dark:text-emerald-400">
            {SALARY_LABEL}
          </dd>
        </div>
        <div className="flex justify-between sm:block">
          <dt className="text-zinc-500 dark:text-zinc-400">Applications close</dt>
          <dd>{formatDate(job.closesAt)}</dd>
        </div>
      </dl>
    </Link>
  );
}
