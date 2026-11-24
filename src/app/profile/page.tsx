import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import { CandidatePortfolio } from "@/components/profile/candidate-portfolio";
import DashboardApplications from "@/components/dashboard/applications-section";
import { ProfileForm } from "@/components/profile/profile-form";
import { Card } from "@/components/ui";
import { requireUser } from "@/lib/dal";
import { env } from "@/lib/env";
import { formatDate } from "@/lib/format";
import {
  APPLICATION_PROFILE_THRESHOLD,
  getProfileReadiness,
  isLocalProfilePhoto,
} from "@/lib/profile";
import { ROLE_LABELS } from "@/lib/roles";

export const metadata: Metadata = {
  title: "My profile",
  robots: { index: false, follow: false },
};

const actionClass =
  "inline-flex min-h-11 w-fit items-center rounded-lg bg-indigo-700 px-4 text-sm font-semibold text-white hover:bg-indigo-600 dark:bg-indigo-400 dark:text-indigo-950 dark:hover:bg-indigo-300";
const linkClass =
  "inline-flex min-h-11 items-center text-sm font-semibold text-indigo-700 hover:underline dark:text-indigo-300";
const headingClass = "text-lg font-semibold tracking-tight text-slate-950 dark:text-zinc-50";
const mutedClass = "text-sm text-slate-600 dark:text-zinc-400";
const dashboardGridClass = "grid gap-4 md:grid-cols-2";
function ProfileHeader({
  name,
  role,
  photoSource,
  action,
}: {
  name: string;
  role: string;
  photoSource?: string | null;
  action?: ReactNode;
}) {
  const initials = name.trim().split(/\s+/).slice(0, 2)
    .map((part) => Array.from(part)[0]).join("").toUpperCase();

  return (
    <header className="rounded-2xl border border-indigo-100 bg-white p-5 shadow-sm sm:p-6 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4 sm:gap-5">
          {photoSource ? (
            // eslint-disable-next-line @next/next/no-img-element -- Profiles use uploaded photo URLs.
            <img src={photoSource} alt="" width={88} height={88} className="size-16 shrink-0 rounded-full object-cover sm:size-[5.5rem]" />
          ) : (
            <span aria-hidden="true" className="grid size-16 shrink-0 place-items-center rounded-full bg-indigo-100 text-xl font-semibold text-indigo-800 sm:size-[5.5rem] dark:bg-indigo-950 dark:text-indigo-200">
              {initials}
            </span>
          )}
          <div className="min-w-0">
            <p className="wrap-anywhere text-xl font-semibold tracking-tight sm:text-2xl">{name}</p>
            <p className={mutedClass}>{role}</p>
          </div>
        </div>
        {action}
      </div>
    </header>
  );
}

function ProfileField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0 py-3 first:pt-0 last:pb-0">
      <dt className={mutedClass}>{label}</dt>
      <dd className="mt-0.5 wrap-anywhere text-sm font-semibold">{children}</dd>
    </div>
  );
}

export default async function ProfilePage({ searchParams }: PageProps<"/profile">) {
  const user = await requireUser();
  const params = await searchParams;
  const role = ROLE_LABELS[user.role];
  const pageClass = "mx-auto w-full max-w-6xl space-y-5 px-4 py-6 sm:px-6 sm:py-8";
  const titleClass = "text-3xl font-semibold tracking-tight text-slate-950 dark:text-zinc-50";

  if (user.role !== "CANDIDATE") {
    return (
      <main className={pageClass}>
        <h1 className={titleClass}>My profile</h1>
        <ProfileHeader name={user.name} role={role} />
        <div className={dashboardGridClass}>
          <Card>
            <h2 className={headingClass}>Account details</h2>
            <dl className="mt-4 divide-y divide-indigo-100 dark:divide-zinc-800">
              <ProfileField label="Full name">{user.name}</ProfileField>
              <ProfileField label="Sign-in email">{user.email}</ProfileField>
              <ProfileField label="Member since">{formatDate(user.createdAt)}</ProfileField>
            </dl>
          </Card>
          <Card>
            <h2 className={headingClass}>Workspace</h2>
            <p className={`mt-2 ${mutedClass}`}>{role} workspace</p>
            <Link href={user.role === "ADMIN" ? "/admin" : "/recruiter/jobs"} className={`mt-4 ${actionClass}`}>
              Open workspace
            </Link>
          </Card>
        </div>
      </main>
    );
  }

  if (params.section === "applications") {
    return (
      <main className={pageClass}>
        <h1 className="sr-only">My profile</h1>
        <Link href="/profile" className={linkClass}>← My profile</Link>
        <DashboardApplications embedded />
      </main>
    );
  }

  const nextPath =
    typeof params.next === "string" && /^\/jobs\/[\w-]+\/apply$/.test(params.next)
      ? params.next
      : null;
  const { profile, percentage, canApply } = await getProfileReadiness(user);
  const photoSource = profile?.photoUrl ||
    (profile && isLocalProfilePhoto(profile.photoPublicId, user.id)
      ? `/profile/photo?v=${encodeURIComponent(profile.photoPublicId ?? "")}`
      : null);
  const documents = profile?.documents ?? [];

  if (params.section === "edit" || nextPath || params.incomplete === "1") {
    return (
      <main className={pageClass}>
        <Link href="/profile" className={linkClass}>← My profile</Link>
        <h1 className={titleClass}>Edit profile</h1>
        <ProfileForm
          key={typeof params.step === "string" ? params.step : undefined}
          initial={profile && {
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
          }}
          initialDocuments={documents.map((document) => ({
            id: document.id,
            documentKey: document.documentKey,
            originalFileName: document.originalFileName,
            mimeType: document.mimeType,
            fileSize: document.fileSize,
            url: document.cloudUrl,
          }))}
          initialSection={typeof params.step === "string" ? params.step : undefined}
          savedPhotoSource={photoSource}
          maxBytes={env.maxUploadBytes}
          redirectToApply={nextPath}
          canApply={canApply}
          applicationThreshold={APPLICATION_PROFILE_THRESHOLD}
          incompleteNotice={params.incomplete === "1" && !canApply}
        />
      </main>
    );
  }

  return (
    <CandidatePortfolio
      user={user}
      profile={profile}
      photoSource={photoSource}
      canApply={canApply}
      eligibilityScore={percentage}
      maxUploadBytes={env.maxUploadBytes}
    />
  );
}
