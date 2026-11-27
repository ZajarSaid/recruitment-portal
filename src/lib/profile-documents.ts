/**
 * Shared candidate-profile catalog used by both server code (validation,
 * storage) and client components (labels, document lists).
 *
 * The profile is filled once per candidate: common personal information that
 * every applicant provides, plus a category-specific list of supporting
 * documents. Once the profile is complete, applying for a vacancy only
 * requires the signed application letter.
 *
 * This module is intentionally free of `server-only` imports and Node
 * built-ins so it can be imported from client components.
 */

/** Well-known key for the signed application letter staged per application. */
export const APPLICATION_LETTER_KEY = "APPLICATION_LETTER";

export const APPLICATION_LETTER_LABEL = "Signed application letter";

export const APPLICATION_LETTER_DESCRIPTION =
  "A scanned or PDF application letter, signed by hand, addressed to the recruiting organisation for this vacancy.";

/** Professional fields a candidate (and a vacancy) can belong to. */
export type JobCategoryValue = "GENERAL" | "MEDICINE" | "IT" | "BUSINESS";

export const JOB_CATEGORIES: JobCategoryValue[] = [
  "GENERAL",
  "MEDICINE",
  "IT",
  "BUSINESS",
];

export const JOB_CATEGORY_LABELS: Record<JobCategoryValue, string> = {
  GENERAL: "General",
  MEDICINE: "Medicine and health",
  IT: "Information technology",
  BUSINESS: "Business and administration",
};

/** Highest completed education level. */
export type EducationLevelValue =
  | "NONE"
  | "PRIMARY"
  | "SECONDARY"
  | "CERTIFICATE"
  | "DIPLOMA"
  | "BACHELOR"
  | "MASTER"
  | "DOCTORATE";

export const EDUCATION_LEVELS: EducationLevelValue[] = [
  "NONE",
  "PRIMARY",
  "SECONDARY",
  "CERTIFICATE",
  "DIPLOMA",
  "BACHELOR",
  "MASTER",
  "DOCTORATE",
];

export const EDUCATION_LEVEL_LABELS: Record<EducationLevelValue, string> = {
  NONE: "None",
  PRIMARY: "Primary education",
  SECONDARY: "Secondary education",
  CERTIFICATE: "Certificate",
  DIPLOMA: "Diploma",
  BACHELOR: "Bachelor's degree",
  MASTER: "Master's degree",
  DOCTORATE: "Doctorate (PhD)",
};

/** Self-assessed computer literacy. */
export type ComputerLiteracyValue = "BASIC" | "INTERMEDIATE" | "ADVANCED";

export const COMPUTER_LITERACY_LEVELS: ComputerLiteracyValue[] = [
  "BASIC",
  "INTERMEDIATE",
  "ADVANCED",
];

export const COMPUTER_LITERACY_LABELS: Record<ComputerLiteracyValue, string> = {
  BASIC: "Basic (email, web browsing, word processing)",
  INTERMEDIATE: "Intermediate (spreadsheets, presentations, common tools)",
  ADVANCED: "Advanced (professional or technical software)",
};

export const BIRTH_MONTH_LABELS: string[] = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/** One category-specific document a candidate uploads to their profile. */
export type CategoryDocumentSpec = {
  /** Stable, well-known key stored in `CandidateDocument.documentKey`. */
  key: string;
  label: string;
  description: string;
  required: boolean;
};

export const IDENTITY_DOCUMENT: CategoryDocumentSpec = {
  key: "PROFILE_IDENTITY_DOCUMENT",
  label: "Identity document",
  description: "Upload one NIDA ID card, driving licence, or passport.",
  required: false,
};

/**
 * The fixed, predefined list of supporting documents per candidate category.
 * `GENERAL` candidates provide no extra documents beyond the common profile
 * information.
 */
export const CATEGORY_DOCUMENT_LISTS: Record<
  JobCategoryValue,
  CategoryDocumentSpec[]
> = {
  GENERAL: [],
  MEDICINE: [
    {
      key: "MEDICAL_QUALIFICATION",
      label: "Medical or clinical qualification",
      description:
        "Degree or diploma certificate in medicine or the relevant clinical field.",
      required: true,
    },
    {
      key: "PROFESSIONAL_REGISTRATION",
      label: "Professional registration certificate",
      description:
        "Registration with the relevant medical professional council.",
      required: true,
    },
    {
      key: "PRACTISING_LICENCE",
      label: "Valid practising licence",
      description: "A current licence to practise, where applicable.",
      required: false,
    },
    {
      key: "INTERNSHIP_CERTIFICATE",
      label: "Internship completion certificate",
      description: "Proof of completed internship, where applicable.",
      required: false,
    },
  ],
  IT: [
    {
      key: "ICT_QUALIFICATION",
      label: "ICT qualification",
      description:
        "Degree, diploma or certificate in an information technology field.",
      required: true,
    },
    {
      key: "ACADEMIC_TRANSCRIPTS",
      label: "Academic transcripts",
      description:
        "Official academic transcripts for the relevant qualification.",
      required: false,
    },
    {
      key: "TECHNICAL_CERTIFICATIONS",
      label: "Technical certifications",
      description:
        "Vendor or technical certifications relevant to your specialisation.",
      required: false,
    },
    {
      key: "PORTFOLIO",
      label: "Portfolio or project evidence",
      description:
        "Examples of past projects or a professional portfolio, if available.",
      required: false,
    },
  ],
  BUSINESS: [
    {
      key: "BUSINESS_ACADEMIC_QUALIFICATION",
      label: "Academic qualification",
      description:
        "Degree or diploma certificate relevant to business, administration or your specialisation.",
      required: true,
    },
    {
      key: "BUSINESS_ACADEMIC_TRANSCRIPTS",
      label: "Academic transcripts",
      description:
        "Official academic transcripts for the relevant qualification.",
      required: false,
    },
    {
      key: "EXPERIENCE_CERTIFICATES",
      label: "Employment or experience certificates",
      description: "Certificates of service from previous employers.",
      required: false,
    },
    {
      key: "PROFESSIONAL_LICENCE",
      label: "Professional registration or licence",
      description:
        "Professional registration or licence relevant to your field, where applicable.",
      required: false,
    },
  ],
};

/** Every document key that can appear on a profile, across all categories. */
// These documents can be reused by candidates in any category.
export const OPTIONAL_PORTFOLIO_DOCUMENTS: readonly CategoryDocumentSpec[] = [
  { key: "PROFILE_CV", label: "Curriculum Vitae (CV)", description: "Your current CV or résumé.", required: false },
  { key: "PROFILE_ACADEMIC_CERTIFICATE", label: "Academic certificate", description: "A certificate for a relevant qualification.", required: false },
  { key: "PROFILE_PROFESSIONAL_CERTIFICATE", label: "Professional certificate", description: "A professional qualification or certification.", required: false },
  { key: "PROFILE_SUPPORTING_DOCUMENT", label: "Other supporting document", description: "Additional evidence relevant to your professional background.", required: false },
];

export const ALL_PROFILE_DOCUMENT_KEYS: string[] = [
  ...new Set(
    [...Object.values(CATEGORY_DOCUMENT_LISTS).flat(), ...OPTIONAL_PORTFOLIO_DOCUMENTS, IDENTITY_DOCUMENT]
      .map((spec) => spec.key),
  ),
];

/** Looks up a catalog spec by its key, across every category. */
export function findProfileDocumentSpec(
  key: string,
): CategoryDocumentSpec | undefined {
  if (key === IDENTITY_DOCUMENT.key) return IDENTITY_DOCUMENT;
  const optional = OPTIONAL_PORTFOLIO_DOCUMENTS.find((spec) => spec.key === key);
  if (optional) return optional;
  for (const specs of Object.values(CATEGORY_DOCUMENT_LISTS)) {
    const match = specs.find((spec) => spec.key === key);
    if (match) return match;
  }
  return undefined;
}

/** Resolves the document list for a category (falls back to `GENERAL`). */
export function getCategoryDocumentList(
  category: string,
): CategoryDocumentSpec[] {
  return CATEGORY_DOCUMENT_LISTS[category as JobCategoryValue] ?? [];
}

/** Range of birth years accepted on the profile. */
export function birthYearRange(): { min: number; max: number } {
  return { min: 1930, max: new Date().getFullYear() - 14 };
}
