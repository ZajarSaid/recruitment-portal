import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Badge, Card } from "@/components/ui";
import { requireUser } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { humanizeStatus } from "@/lib/format";
import {
  APPLICATION_PROFILE_THRESHOLD,
  getProfileReadiness,
  isLocalProfilePhoto,
  missingRequiredProfileDocuments,
} from "@/lib/profile";
import { BIRTH_MONTH_LABELS, JOB_CATEGORY_LABELS } from "@/lib/profile-documents";
import { ProfileForm } from "@/components/profile/profile-form";
import DashboardApplications from "@/components/dashboard/applications-section";

export const metadata: Metadata = {
  title: "My profile",
  robots: { index: false, follow: false },
};

export default async function ProfilePage({
  searchParams,
}: PageProps<"/profile">) {
  const user = await requireUser();
  if (user.role !== "CANDIDATE") {
    redirect("/dashboard?error=forbidden");
  }

  const params = await searchParams;
  const incompleteNotice = params.incomplete === "1";
  const nextPath =
    typeof params.next === "string" &&
    /^\/jobs\/[\w-]+\/apply$/.test(params.next)
      ? params.next
      : null;

  const [{ profile, percentage, breakdown, canApply }, applicationCounts] =
    await Promise.all([
      getProfileReadiness(user),
      prisma.application.groupBy({
        by: ["status"],
        where: { candidateId: user.id },
        _count: { _all: true },
        orderBy: { status: "asc" },
      }),
    ]);
  const missingDocuments = missingRequiredProfileDocuments(profile);
  const photoSource =
    profile?.photoUrl ||
    (profile && isLocalProfilePhoto(profile.photoPublicId, user.id)
      ? `/profile/photo?v=${encodeURIComponent(profile.photoPublicId ?? "")}`
      : null);
  const applicationTotal = applicationCounts.reduce(
    (total, group) => total + group._count._all,
    0,
  );
  const initials = user.name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => Array.from(part)[0])
    .join("")
    .toUpperCase();

  const initialDocuments = (profile?.documents ?? []).map((document) => ({
    id: document.id,
    documentKey: document.documentKey,
    originalFileName: document.originalFileName,
    mimeType: document.mimeType,
    fileSize: document.fileSize,
    url: document.cloudUrl,
  }));

  return (
    <main className="mx-auto w-full max-w-6xl space-y-5 px-4 py-6 sm:px-6 sm:py-8">
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
        My profile
      </h1>
      <header className="overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <div aria-hidden="true" className="h-2 bg-indigo-600 dark:bg-indigo-400" />
        <div className="grid items-center gap-5 p-5 sm:grid-cols-[minmax(0,1fr)_minmax(12rem,30%)] sm:p-6">
          <div className="flex min-w-0 items-center gap-4">
            {photoSource ? (
              // eslint-disable-next-line @next/next/no-img-element -- Profiles use uploaded photo URLs.
              <img
                src={photoSource}
                alt=""
                width={64}
                height={64}
                className="size-14 shrink-0 rounded-full object-cover ring-1 ring-indigo-100 sm:size-16 dark:ring-zinc-700"
              />
            ) : (
              <span
                aria-hidden="true"
                className="grid size-14 shrink-0 place-items-center rounded-full bg-indigo-100 text-lg font-semibold text-indigo-800 sm:size-16 dark:bg-indigo-950 dark:text-indigo-200"
              >
                {initials}
              </span>
            )}
            <div className="min-w-0">
              <p className="wrap-anywhere text-xl font-semibold tracking-tight text-zinc-950 sm:text-2xl dark:text-zinc-50">
                {user.name}
              </p>
              <p className="wrap-anywhere text-sm text-zinc-600 dark:text-zinc-400">
                {user.email}
              </p>
              <p className="mt-1 text-sm font-medium text-indigo-700 dark:text-indigo-300">
                {profile ? JOB_CATEGORY_LABELS[profile.category] : "Candidate"}
              </p>
            </div>
          </div>
          <div className="border-t border-indigo-100 pt-3 sm:border-t-0 sm:border-l sm:pt-0 sm:pl-5 dark:border-zinc-800">
            <label
              htmlFor="profile-progress"
              className="block text-sm font-semibold text-zinc-950 dark:text-zinc-50"
            >
              {percentage}% complete
            </label>
            <progress
              id="profile-progress"
              value={percentage}
              max={100}
              className="mt-2 block h-2.5 w-full appearance-none overflow-hidden rounded-full bg-indigo-100 [&::-webkit-progress-bar]:bg-indigo-100 [&::-webkit-progress-value]:rounded-full [&::-webkit-progress-value]:bg-indigo-600 [&::-moz-progress-bar]:rounded-full [&::-moz-progress-bar]:bg-indigo-600 dark:bg-indigo-950 dark:[&::-webkit-progress-bar]:bg-indigo-950 dark:[&::-webkit-progress-value]:bg-indigo-400 dark:[&::-moz-progress-bar]:bg-indigo-400"
            />
          </div>
        </div>
      </header>

      <ProfileForm
        initial={
          profile
            ? {
                educationLevel: profile.educationLevel,
                experienceSummary: profile.experienceSummary,
                birthYear: profile.birthYear,
                birthMonth: profile.birthMonth,
                physicalAddress: profile.physicalAddress,
                computerLiteracy: profile.computerLiteracy,
                languages: profile.languages,
                category: profile.category,
                photoUrl: profile.photoUrl,
                photoPublicId: profile.photoPublicId,
              }
            : null
        }
        initialDocuments={initialDocuments}
        applications={<DashboardApplications embedded />}
        showApplicationsInitially={params.section === "applications"}
        savedPhotoSource={photoSource}
        maxBytes={env.maxUploadBytes}
        redirectToApply={nextPath}
        canApply={canApply}
        applicationThreshold={APPLICATION_PROFILE_THRESHOLD}
        incompleteNotice={incompleteNotice && !canApply}
        overview={
          <div className="min-w-0 space-y-5">
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
                Profile overview
              </h2>
            </div>
            <Card>
              <h3 className="text-lg font-semibold tracking-tight">Personal details</h3>
              <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-zinc-600 dark:text-zinc-400">Birth month and year</dt>
                  <dd className="mt-1 font-medium">
                    {profile?.birthMonth && profile.birthYear
                      ? `${BIRTH_MONTH_LABELS[profile.birthMonth - 1]} ${profile.birthYear}`
                      : "Not provided"}
                  </dd>
                </div>
                <div>
                  <dt className="text-zinc-600 dark:text-zinc-400">Physical address</dt>
                  <dd className="mt-1 wrap-anywhere font-medium">
                    {profile?.physicalAddress || "Not provided"}
                  </dd>
                </div>
              </dl>
            </Card>
            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <h3 className="text-lg font-semibold tracking-tight">
                  Profile completion
                </h3>
                <div className="mt-3">
                  <Badge tone={canApply ? "green" : "amber"}>
                    {canApply
                      ? "Ready to apply"
                      : "Below application threshold"}
                  </Badge>
                </div>
                <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
                  Applications require more than {APPLICATION_PROFILE_THRESHOLD}
                  %.
                </p>
                <dl className="mt-3 divide-y divide-zinc-200 text-sm dark:divide-zinc-800">
                  {breakdown.map(({ label, points, maximum }) => (
                    <div
                      key={label}
                      className="flex justify-between gap-3 py-1.5"
                    >
                      <dt>{label}</dt>
                      <dd className="shrink-0 tabular-nums">
                        {points}/{maximum}
                      </dd>
                    </div>
                  ))}
                </dl>
                {profile ? (
                  missingDocuments.length > 0 && (
                    <ul className="mt-3 list-disc space-y-1 pl-4 text-sm text-zinc-600 dark:text-zinc-300">
                      {missingDocuments.map((document) => (
                        <li key={document.key}>{document.label}</li>
                      ))}
                    </ul>
                  )
                ) : (
                  <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-300">
                    Save your profile details to get started.
                  </p>
                )}
              </Card>

              <Card>
                <h3 className="text-lg font-semibold tracking-tight">
                  Application summary
                </h3>
                <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-300">
                  {applicationTotal === 0
                    ? "No applications yet."
                    : `${applicationTotal} total`}
                </p>
                {applicationCounts.length > 0 && (
                  <dl className="mt-2 divide-y divide-zinc-200 text-sm dark:divide-zinc-800">
                    {applicationCounts.map(({ status, _count }) => (
                      <div
                        key={status}
                        className="flex justify-between gap-3 py-2"
                      >
                        <dt>{humanizeStatus(status)}</dt>
                        <dd className="font-semibold tabular-nums">
                          {_count._all}
                        </dd>
                      </div>
                    ))}
                  </dl>
                )}
                {applicationTotal > 0 && (
                  <Link
                    href="/profile?section=applications"
                    className="mt-3 inline-flex text-sm font-semibold text-indigo-700 hover:underline dark:text-indigo-300"
                  >
                    View my applications
                  </Link>
                )}
              </Card>
            </div>

          </div>
        }
      />
    </main>
  );
}
