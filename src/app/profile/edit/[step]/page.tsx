import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { ProfileForm } from "@/components/profile/profile-form";
import { ProfileSidebarIdentity } from "@/components/profile/profile-sidebar-identity";
import { requireUser } from "@/lib/dal";
import { env } from "@/lib/env";
import { hasOpenVacancies } from "@/lib/jobs";
import { APPLICATION_PROFILE_THRESHOLD, getProfileReadiness, isLocalProfilePhoto } from "@/lib/profile";
import { IDENTITY_DOCUMENT } from "@/lib/profile-documents";
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
  const openVacancies = canApply && await hasOpenVacancies();

  const photoSource = profile?.photoUrl ||
    (profile && isLocalProfilePhoto(profile.photoPublicId, user.id)
      ? `/profile/photo?v=${encodeURIComponent(profile.photoPublicId ?? "")}`
      : null);

  return (
    <main className="mx-auto w-full max-w-[100rem] px-3 py-4 sm:px-5 sm:py-6">
      <ProfileForm
        key={step}
        sidebarHeader={<ProfileSidebarIdentity name={user.name} photoSource={photoSource} />}
        initial={profile && {
          educationLevel: profile.educationLevel,
          experienceSummary: profile.experienceSummary,
          birthYear: profile.birthYear,
          birthMonth: profile.birthMonth,
          physicalAddress: profile.physicalAddress,
          nidaNumber: step === "personal-details" ? profile.nidaNumber : null,
          computerLiteracy: profile.computerLiteracy,
          languages: profile.languages,
          category: profile.category,
          photoUrl: profile.photoUrl,
          photoPublicId: profile.photoPublicId,
        }}
        initialDocuments={documents.filter(({ documentKey }) =>
          step === "personal-details" || documentKey !== IDENTITY_DOCUMENT.key,
        ).map((document) => ({
          id: document.id,
          documentKey: document.documentKey,
          originalFileName: document.originalFileName,
          mimeType: document.mimeType,
          fileSize: document.fileSize,
          url: document.documentKey === IDENTITY_DOCUMENT.key ? null : document.cloudUrl,
        }))}
        stepIndex={stepIndex}
        availableStep={availableStep}
        savedPhotoSource={photoSource}
        maxBytes={env.maxUploadBytes}
        redirectToApply={nextPath}
        canApply={canApply}
        openVacancies={openVacancies}
        applicationThreshold={APPLICATION_PROFILE_THRESHOLD}
        incompleteNotice={incomplete}
      />
    </main>
  );
}
