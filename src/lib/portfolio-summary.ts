import type { ApplicationStatus } from "@/generated/prisma/enums";

export function summarizeCandidateApplications(
  groups: readonly { status: ApplicationStatus; _count: { _all: number } }[],
) {
  const counts = { total: 0, pending: 0, shortlisted: 0, rejected: 0 };
  for (const { status, _count } of groups) {
    counts.total += _count._all;
    if (status === "SUBMITTED" || status === "UNDER_REVIEW") counts.pending += _count._all;
    if (status === "SHORTLISTED") counts.shortlisted += _count._all;
    if (status === "REJECTED") counts.rejected += _count._all;
  }
  return counts;
}

export function candidatePortfolioCompletion({
  hasLocation, hasEducation, hasRequiredDocuments,
}: {
  hasLocation: boolean;
  hasEducation: boolean;
  hasRequiredDocuments: boolean | null;
}) {
  const checklist = [
    { label: "Personal information", complete: hasLocation, suggestion: "Add your location in Personal information." },
    { label: "Educational background", complete: hasEducation, suggestion: "Add an education record or select your highest education level." },
  ];
  if (hasRequiredDocuments !== null) {
    checklist.push({ label: "Required profile documents", complete: hasRequiredDocuments, suggestion: "Upload the missing files listed in Documents." });
  }

  return {
    checklist,
    percentage: Math.round(100 * checklist.filter(({ complete }) => complete).length / checklist.length),
  };
}
