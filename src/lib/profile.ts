import "server-only";

import { prisma } from "./db";
import type { CurrentUser } from "./dal";
import { getCategoryDocumentList } from "./profile-documents";

export type CandidateProfileWithDocuments = Awaited<
  ReturnType<typeof getCandidateProfile>
>;

export async function getCandidateProfile(userId: string) {
  return prisma.candidateProfile.findUnique({
    where: { userId },
    include: { documents: true },
  });
}

export function missingRequiredProfileDocuments(
  profile: CandidateProfileWithDocuments | null,
) {
  const specs = getCategoryDocumentList(profile?.category ?? "GENERAL");
  const uploadedKeys = new Set(
    profile?.documents.map((document) => document.documentKey) ?? [],
  );
  return specs.filter((spec) => spec.required && !uploadedKeys.has(spec.key));
}

export const APPLICATION_PROFILE_THRESHOLD = 60;

export function isLocalProfilePhoto(reference: string | null, userId: string) {
  const prefix = `profile-photos/${userId}/`;
  return Boolean(
    reference?.startsWith(prefix) &&
    /^[0-9a-f-]{36}\.(?:jpg|jpeg|png)$/i.test(reference.slice(prefix.length)),
  );
}

export function profileCompleteness(profile: CandidateProfileWithDocuments) {
  const required = getCategoryDocumentList(
    profile?.category ?? "GENERAL",
  ).filter((document) => document.required);
  const missing = missingRequiredProfileDocuments(profile).length;
  const personalPoints =
    (profile?.birthYear ? 8 : 0) +
    (profile?.birthMonth ? 7 : 0) +
    (profile?.physicalAddress?.trim() ? 10 : 0);
  const documentPoints = profile
    ? required.length === 0
      ? 10
      : Math.floor((10 * (required.length - missing)) / required.length)
    : 0;

  return [
    { label: "Personal details", points: personalPoints, maximum: 25 },
    {
      label: "Academic information",
      points:
        profile?.educationLevel && profile.educationLevel !== "NONE" ? 25 : 0,
      maximum: 25,
    },
    {
      label: "Computer literacy",
      points: profile?.computerLiteracy ? 15 : 0,
      maximum: 15,
    },
    {
      label: "Language proficiency",
      points: profile?.languages?.trim() ? 15 : 0,
      maximum: 15,
    },
    { label: "Documents", points: documentPoints, maximum: 10 },
    {
      label: "Experience",
      points: profile?.experienceSummary?.trim() ? 5 : 0,
      maximum: 5,
    },
    {
      label: "Profile photo",
      points:
        profile &&
        (profile.photoUrl ||
          isLocalProfilePhoto(profile.photoPublicId, profile.userId))
          ? 5
          : 0,
      maximum: 5,
    },
  ];
}

export async function getProfileReadiness(user: Pick<CurrentUser, "id">) {
  const profile = await getCandidateProfile(user.id);
  const breakdown = profileCompleteness(profile);
  const percentage = breakdown.reduce((total, item) => total + item.points, 0);
  return {
    profile,
    percentage,
    breakdown,
    canApply: percentage > APPLICATION_PROFILE_THRESHOLD,
  };
}
