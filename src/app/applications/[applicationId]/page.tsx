import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { Badge, Card } from "@/components/ui";
import { getCandidateApplicationStatus } from "@/lib/applications";
import { requireUser } from "@/lib/dal";
import { humanizeStatus } from "@/lib/format";
import { roleHome } from "@/lib/navigation";

export const metadata: Metadata = {
  title: "Application status",
  robots: { index: false, follow: false },
};

const statusTone: Record<string, string> = {
  SUBMITTED: "blue",
  UNDER_REVIEW: "amber",
  SHORTLISTED: "green",
  REJECTED: "red",
};

export default async function ApplicationStatusPage({
  params,
}: PageProps<"/applications/[applicationId]">) {
  const user = await requireUser();
  if (user.role !== "CANDIDATE") {
    redirect(roleHome(user.role));
  }

  const { applicationId } = await params;

  const application = await getCandidateApplicationStatus(
    applicationId,
    user.id,
  );
  if (!application) {
    notFound();
  }

  const reason = application.rejectionReason;

  return (
    <main className="mx-auto max-w-xl px-4 py-12">
      <Link
        href="/dashboard"
        className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white"
      >
        ← Back to my applications
      </Link>

      <Card className="mt-4 p-5">
        <p className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Application status
        </p>
        <h1 className="mt-1 text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          {application.jobTitle}
        </h1>
        <div className="mt-3">
          <Badge tone={statusTone[application.status] ?? "neutral"}>
            {humanizeStatus(application.status)}
          </Badge>
        </div>

        {application.status === "SHORTLISTED" && (
          <div className="mt-5 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm dark:border-emerald-900/60 dark:bg-emerald-950/40">
            <p className="font-medium text-emerald-900 dark:text-emerald-200">
              Congratulations — you have been shortlisted!
            </p>
            <p className="mt-1 text-emerald-800 dark:text-emerald-300">
              Your application stood out to our team. You will be contacted soon
              with the next steps of the interview process, so please keep an
              eye on your email and phone for updates.
            </p>
          </div>
        )}

        {application.status === "REJECTED" && reason && (
          <div className="mt-5 rounded-md border border-red-200 bg-red-50 p-3 text-sm dark:border-red-900/60 dark:bg-red-950/40">
            <p className="font-medium text-red-900 dark:text-red-200">
              Reason for rejection
            </p>
            <p className="mt-1 whitespace-pre-line text-red-800 dark:text-red-300">
              {reason}
            </p>
          </div>
        )}
      </Card>
    </main>
  );
}
