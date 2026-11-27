import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { ProfileForm } from "@/components/profile/profile-form";
import { requireUser } from "@/lib/dal";
import { env } from "@/lib/env";
import { APPLICATION_PROFILE_THRESHOLD, getProfileReadiness, isLocalProfilePhoto } from "@/lib/profile";
import { firstIncompleteProfileStep, profileStepHref, PROFILE_STEPS, profileApplicationPath } from "@/lib/profile-steps";

export const metadata: Metadata = {
  title: "Edit profile",
  robots: { index: false, follow: false },
};

export default async function ProfileStepPage({ params, searchParams }: PageProps<"/profile/edit/[step]">) {
  const user = await requireUser();
  if (user.role !== "CANDIDATE") redirect("/profile");

  const { step } = await params;
  const stepIndex = PROFILE_STEPS.findIndex(({ id }) => id === step);
  if (stepIndex < 0) notFound();

  const search = await searchParams;
  const nextPath = profileApplicationPath(search.next);
  const incomplete = search.incomplete === "1";
  const { profile, canApply } = await getProfileReadiness(user);
  const documents = profile?.documents ?? [];
  const availableStep = firstIncompleteProfileStep(profile, documents);
  if (stepIndex > availableStep) {
    redirect(profileStepHref(PROFILE_STEPS[availableStep].id, nextPath, incomplete));
  }

  const photoSource = profile?.photoUrl ||
    (profile && isLocalProfilePhoto(profile.photoPublicId, user.id)
      ? `/profile/photo?v=${encodeURIComponent(profile.photoPublicId ?? "")}`
      : null);

  return (
    <main className="mx-auto w-full max-w-6xl space-y-5 px-4 py-6 sm:px-6 sm:py-8">
      <Link href="/profile" className="inline-flex min-h-11 items-center text-sm font-semibold text-indigo-700 hover:underline dark:text-indigo-300">← My profile</Link>
      <h1 className="text-3xl font-semibold tracking-tight text-slate-950 dark:text-zinc-50">Edit profile</h1>
      <ProfileForm
        key={step}
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
        stepIndex={stepIndex}
        availableStep={availableStep}
        savedPhotoSource={photoSource}
        maxBytes={env.maxUploadBytes}
        redirectToApply={nextPath}
        canApply={canApply}
        applicationThreshold={APPLICATION_PROFILE_THRESHOLD}
        incompleteNotice={incomplete}
      />
    </main>
  );
}
