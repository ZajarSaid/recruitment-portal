import { getCategoryDocumentList, type JobCategoryValue } from "./profile-documents";

export const PROFILE_STEPS = [
  { id: "personal-details", label: "Personal details", required: {
    birthYear: "Select your birth year.",
    birthMonth: "Select your birth month.",
    physicalAddress: "Enter your physical address.",
    nidaNumber: "Enter your NIDA number.",
  } },
  { id: "education", label: "Academic information & documents", required: {
    educationLevel: "Select your highest education level.",
  } },
  { id: "computer-literacy", label: "Computer literacy", required: {
    computerLiteracy: "Select your computer literacy level.",
  } },
  { id: "languages", label: "Language proficiency", required: {
    languages: "Enter at least one language you speak.",
  } },
  { id: "experience", label: "Experience", required: {} },
] as const;

type ProfileStep = (typeof PROFILE_STEPS)[number];
type RequiredProfileValues = Partial<{
  birthYear: number | null;
  birthMonth: number | null;
  physicalAddress: string | null;
  nidaNumber: string | null;
  educationLevel: string | null;
  computerLiteracy: string | null;
  languages: string | null;
  experienceSummary: string | null;
}>;

export function missingStepFields(step: ProfileStep, values: RequiredProfileValues) {
  return Object.fromEntries(
    (Object.entries(step.required) as [keyof RequiredProfileValues, string][])
      .filter(([field]) => {
        const value = values[field];
        return typeof value === "string" ? !value.trim() : !value;
      })
      .map(([field, message]) => [field, [message]]),
  );
}

export function hasRequiredProfileDocuments(
  category: JobCategoryValue,
  documents: readonly { documentKey: string }[],
) {
  const keys = new Set(documents.map(({ documentKey }) => documentKey));
  return getCategoryDocumentList(category).every(({ key, required }) => !required || keys.has(key));
}

export function firstIncompleteProfileStep(
  profile: (RequiredProfileValues & { category: JobCategoryValue }) | null,
  documents: readonly { documentKey: string }[],
) {
  if (!profile) return 0;
  const index = PROFILE_STEPS.findIndex((step) =>
    Object.keys(missingStepFields(step, profile)).length > 0 ||
    (step.id === "education" && !hasRequiredProfileDocuments(profile.category, documents)),
  );
  // Experience is optional, so it remains available once the first four steps are complete.
  return index === -1 ? PROFILE_STEPS.length - 1 : index;
}

export function profileApplicationPath(value: unknown) {
  return typeof value === "string" && /^\/jobs\/[\w-]+\/apply$/.test(value) ? value : null;
}

export function profileStepHref(step: ProfileStep["id"], next: string | null, incomplete: boolean) {
  const query = new URLSearchParams();
  if (next) query.set("next", next);
  if (incomplete) query.set("incomplete", "1");
  const search = query.toString();
  return `/profile/edit/${step}${search ? `?${search}` : ""}`;
}
