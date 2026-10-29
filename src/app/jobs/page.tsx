import type { Metadata } from "next";

import { JobCard } from "@/components/jobs/job-card";
import { EmptyState } from "@/components/ui";
import { listPublicDepartments, listPublicJobs } from "@/lib/jobs";

export const metadata: Metadata = {
  title: "Job vacancies",
  description:
    "Browse current job vacancies, including departments, locations, and application deadlines.",
};

export default async function JobsPage({ searchParams }: PageProps<"/jobs">) {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q : "";
  const department =
    typeof params.department === "string" ? params.department : "";

  const [jobs, departments] = await Promise.all([
    listPublicJobs({ q, department }),
    listPublicDepartments(),
  ]);

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        Job vacancies
      </h1>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
        {jobs.length} published {jobs.length === 1 ? "vacancy" : "vacancies"}
        {q ? ` matching “${q}”` : ""}.
      </p>

      <form
        method="get"
        className="mt-6 flex flex-col gap-3 rounded-lg border border-zinc-200 bg-white p-4 sm:flex-row sm:items-end dark:border-zinc-800 dark:bg-zinc-950"
      >
        <div className="flex-1">
          <label
            htmlFor="q"
            className="block text-sm font-medium text-zinc-900 dark:text-zinc-100"
          >
            Search
          </label>
          <input
            id="q"
            name="q"
            defaultValue={q}
            placeholder="Job title, department, or location"
            className="mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          />
        </div>
        <div className="sm:w-64">
          <label
            htmlFor="department"
            className="block text-sm font-medium text-zinc-900 dark:text-zinc-100"
          >
            Department
          </label>
          <select
            id="department"
            name="department"
            defaultValue={department}
            className="mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          >
            <option value="">All departments</option>
            {departments.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          Filter
        </button>
      </form>

      <div className="mt-6">
        {jobs.length === 0 ? (
          <EmptyState
            title="No vacancies found"
            description="Try adjusting your search terms or clearing the department filter."
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {jobs.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
