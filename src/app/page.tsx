import Link from "next/link";

import { HeroCarousel } from "@/components/hero-carousel";
import { JobCard } from "@/components/jobs/job-card";
import { Card } from "@/components/ui";
import { getCurrentUser } from "@/lib/dal";
import { listPublicJobs } from "@/lib/jobs";

export default async function HomePage() {
  const [user, jobs] = await Promise.all([
    getCurrentUser(),
    listPublicJobs(),
  ]);

  const featured = jobs.slice(0, 3);

  return (
    <main className="mx-auto max-w-6xl px-4 py-12">
      <section className="grid gap-8 lg:grid-cols-2 lg:items-center">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Careers Platform
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-4xl">
            Build your career with us
          </h1>
          <p className="mt-4 text-base text-zinc-600 dark:text-zinc-300">
            Explore current openings and apply online in a few simple steps.
            Submit your application, attach the required documents, and track
            your progress — all in one place.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/jobs"
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm shadow-indigo-600/20 transition-colors hover:bg-indigo-500 dark:bg-indigo-500 dark:hover:bg-indigo-400"
            >
              Browse jobs
            </Link>
            {!user && (
              <Link
                href="/register"
                className="rounded-lg border border-indigo-200 bg-white/70 px-4 py-2 text-sm font-medium text-indigo-700 transition-colors hover:bg-indigo-50 dark:border-zinc-700 dark:bg-transparent dark:text-zinc-200 dark:hover:bg-zinc-900"
              >
                Create a candidate account
              </Link>
            )}
          </div>
        </div>
        <div>
          <HeroCarousel />
        </div>
      </section>

      <section className="mt-12">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Latest vacancies
          </h2>
          <Link
            href="/jobs"
            className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white"
          >
            View all →
          </Link>
        </div>

        {featured.length === 0 ? (
          <Card>
            <p className="text-sm text-zinc-600 dark:text-zinc-300">
              There are no published vacancies at the moment. Please check back
              soon.
            </p>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        )}
      </section>

      <section className="mt-12">
        <Card>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            How this platform works
          </h2>
          <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
            This recruitment portal connects qualified candidates with career
            opportunities. Browse published vacancies, review role
            requirements, and apply directly through a streamlined online
            process.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-lg border border-zinc-200 bg-white/70 p-3 transition-all hover:-translate-y-1 hover:shadow-md dark:border-zinc-700 dark:bg-zinc-900/70 animate-in fade-in duration-500">
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                1. Create an account
              </p>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
                Register as a candidate to track applications and receive
                updates in one place.
              </p>
            </div>
            <div className="rounded-lg border border-zinc-200 bg-white/70 p-3 transition-all hover:-translate-y-1 hover:shadow-md dark:border-zinc-700 dark:bg-zinc-900/70 animate-in fade-in duration-700">
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                2. Browse & apply
              </p>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
                Find roles that match your skills, review details, and submit
                your application with the required documents.
              </p>
            </div>
            <div className="rounded-lg border border-zinc-200 bg-white/70 p-3 transition-all hover:-translate-y-1 hover:shadow-md dark:border-zinc-700 dark:bg-zinc-900/70 animate-in fade-in duration-900">
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                3. Track your progress
              </p>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
                Monitor status updates and manage your applications from your
                candidate dashboard.
              </p>
            </div>
          </div>
          <p className="mt-4 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
            Recruiters and administrators can manage postings, review
            applications, and coordinate hiring workflows through dedicated
            portals.
          </p>
        </Card>
      </section>
    </main>
  );
}
