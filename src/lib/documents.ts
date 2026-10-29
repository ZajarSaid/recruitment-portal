/**
 * Reusable, configurable document requirement templates.
 *
 * These templates are convenience starting points only. Recruiters must be
 * able to customize the final list for each vacancy (change required/optional/
 * not-applicable, add custom items, remove or reorder). Nothing here should be
 * treated as a mandatory rule for a whole job category.
 *
 * This module is intentionally free of server-only imports so it can be shared
 * by both server code and client components.
 */

export type RequirementStatusValue = "REQUIRED" | "OPTIONAL";

/** UI-only status that lets a recruiter disable a suggested row. */
export type RequirementChoiceValue =
  | RequirementStatusValue
  | "NOT_APPLICABLE";

export type TemplateItem = {
  /** Catalogue document name (matches a `DocumentType.name`). */
  name: string;
  description: string;
  defaultStatus: RequirementStatusValue;
};

export type DocumentTemplate = {
  id: string;
  label: string;
  /** Short explanation shown in the recruiter UI. */
  description: string;
  /** Broad category used to build the reusable document-type catalogue. */
  category: string;
  items: TemplateItem[];
};

export const DOCUMENT_TEMPLATES: DocumentTemplate[] = [
  {
    id: "general",
    label: "General application documents",
    description: "Common documents used across most vacancies.",
    category: "General",
    items: [
      {
        name: "Curriculum Vitae (CV)",
        description:
          "An up-to-date curriculum vitae covering education, experience and referees.",
        defaultStatus: "REQUIRED",
      },
      {
        name: "Application letter",
        description: "A formal letter expressing interest in the vacancy.",
        defaultStatus: "REQUIRED",
      },
      {
        name: "Passport-size photograph",
        description:
          "A recent passport-size photograph (JPEG or PNG image).",
        defaultStatus: "OPTIONAL",
      },
      {
        name: "Birth certificate",
        description:
          "Required only where the recruitment policy demands proof of age or nationality.",
        defaultStatus: "OPTIONAL",
      },
      {
        name: "National identity document",
        description:
          "National identity card, passport or equivalent, where applicable.",
        defaultStatus: "OPTIONAL",
      },
      {
        name: "Other supporting documents",
        description: "Any additional documents the applicant wishes to attach.",
        defaultStatus: "OPTIONAL",
      },
    ],
  },
  {
    id: "medical",
    label: "Medical and clinical positions",
    description: "Documents for doctors and other clinical practitioners.",
    category: "Medical",
    items: [
      {
        name: "Relevant medical or clinical qualification",
        description: "Degree or diploma in medicine or the relevant clinical field.",
        defaultStatus: "REQUIRED",
      },
      {
        name: "Professional registration certificate",
        description: "Registration with the relevant professional council.",
        defaultStatus: "REQUIRED",
      },
      {
        name: "Valid practising licence",
        description: "A current licence to practise, where applicable.",
        defaultStatus: "OPTIONAL",
      },
      {
        name: "Internship completion certificate",
        description: "Proof of completed internship, where required.",
        defaultStatus: "OPTIONAL",
      },
      {
        name: "Academic transcripts",
        description: "Official academic transcripts for the relevant qualification.",
        defaultStatus: "OPTIONAL",
      },
      {
        name: "Employment or experience certificates",
        description: "Certificates of service from previous employers.",
        defaultStatus: "OPTIONAL",
      },
      {
        name: "Relevant specialist qualifications",
        description: "Additional specialist or sub-specialist qualifications.",
        defaultStatus: "OPTIONAL",
      },
    ],
  },
  {
    id: "nursing",
    label: "Nursing and midwifery positions",
    description: "Documents for nurses, midwives and related cadres.",
    category: "Nursing",
    items: [
      {
        name: "Relevant nursing or midwifery qualification",
        description: "Nursing or midwifery degree or diploma.",
        defaultStatus: "REQUIRED",
      },
      {
        name: "Applicable professional registration",
        description: "Registration with the relevant nursing council.",
        defaultStatus: "REQUIRED",
      },
      {
        name: "Valid practising licence",
        description: "A current licence to practise, where required.",
        defaultStatus: "OPTIONAL",
      },
      {
        name: "Internship or clinical placement evidence",
        description: "Proof of internship or supervised clinical placement.",
        defaultStatus: "OPTIONAL",
      },
      {
        name: "Academic transcripts",
        description: "Official academic transcripts for the relevant qualification.",
        defaultStatus: "OPTIONAL",
      },
      {
        name: "Employment or experience certificates",
        description: "Certificates of service from previous employers.",
        defaultStatus: "OPTIONAL",
      },
      {
        name: "Specialty training certificates",
        description: "Certificates for specialty or post-basic training.",
        defaultStatus: "OPTIONAL",
      },
    ],
  },
  {
    id: "hr-admin",
    label: "HR and administrative positions",
    description: "Documents for human resources and administrative roles.",
    category: "HR & Administration",
    items: [
      {
        name: "Relevant academic qualification",
        description: "Degree or diploma relevant to the role.",
        defaultStatus: "REQUIRED",
      },
      {
        name: "Academic transcripts",
        description: "Official academic transcripts for the relevant qualification.",
        defaultStatus: "OPTIONAL",
      },
      {
        name: "Employment or experience certificates",
        description: "Certificates of service from previous employers.",
        defaultStatus: "OPTIONAL",
      },
      {
        name: "Relevant HR or administration professional certifications",
        description: "Professional certifications relevant to HR or administration.",
        defaultStatus: "OPTIONAL",
      },
    ],
  },
  {
    id: "it",
    label: "IT positions",
    description: "Documents for ICT and technology roles.",
    category: "ICT",
    items: [
      {
        name: "Relevant ICT qualification",
        description: "Degree, diploma or certification in an ICT field.",
        defaultStatus: "REQUIRED",
      },
      {
        name: "Academic transcripts",
        description: "Official academic transcripts for the relevant qualification.",
        defaultStatus: "OPTIONAL",
      },
      {
        name: "Employment or experience certificates",
        description: "Certificates of service from previous employers.",
        defaultStatus: "OPTIONAL",
      },
      {
        name: "Relevant technical certifications",
        description: "Vendor or technical certifications relevant to the role.",
        defaultStatus: "OPTIONAL",
      },
      {
        name: "Portfolio or project evidence",
        description: "Examples of past projects or a professional portfolio, if required.",
        defaultStatus: "OPTIONAL",
      },
    ],
  },
  {
    id: "finance-procurement",
    label: "Finance, procurement and support positions",
    description: "Documents for finance, procurement and support roles.",
    category: "Finance & Procurement",
    items: [
      {
        name: "Relevant academic, vocational, or professional qualification",
        description: "Qualification relevant to finance, procurement or support work.",
        defaultStatus: "REQUIRED",
      },
      {
        name: "Relevant professional registration or licence",
        description: "Professional registration or licence, where applicable.",
        defaultStatus: "OPTIONAL",
      },
      {
        name: "Experience certificates",
        description: "Certificates of service from previous employers.",
        defaultStatus: "OPTIONAL",
      },
      {
        name: "Role-specific permits or certifications",
        description: "Any permits or certifications specific to the role, where applicable.",
        defaultStatus: "OPTIONAL",
      },
    ],
  },
];

export function getDocumentTemplate(id: string): DocumentTemplate | undefined {
  return DOCUMENT_TEMPLATES.find((template) => template.id === id);
}

export type DocumentTypeSeed = {
  name: string;
  description: string;
  category: string;
};

/**
 * The reusable document-type catalogue derived from every template. Names are
 * de-duplicated so the same document type (for example "Academic transcripts")
 * is stored once even when it appears in several templates.
 */
export function buildDocumentTypeCatalog(): DocumentTypeSeed[] {
  const byName = new Map<string, DocumentTypeSeed>();
  for (const template of DOCUMENT_TEMPLATES) {
    for (const item of template.items) {
      if (!byName.has(item.name)) {
        byName.set(item.name, {
          name: item.name,
          description: item.description,
          category: template.category,
        });
      }
    }
  }
  return [...byName.values()];
}
