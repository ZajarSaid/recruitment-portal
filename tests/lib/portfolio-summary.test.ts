import { expect, it } from "vitest";

import { candidatePortfolioCompletion, summarizeCandidateApplications } from "@/lib/portfolio-summary";

it("combines submitted and under-review applications as pending", () => {
  expect(summarizeCandidateApplications([])).toEqual({ total: 0, pending: 0, shortlisted: 0, rejected: 0 });
  expect(summarizeCandidateApplications([
    { status: "SUBMITTED", _count: { _all: 3 } },
    { status: "UNDER_REVIEW", _count: { _all: 2 } },
    { status: "SHORTLISTED", _count: { _all: 1 } },
    { status: "REJECTED", _count: { _all: 1 } },
  ])).toEqual({ total: 7, pending: 5, shortlisted: 1, rejected: 1 });
});

it("allows a complete profile without the optional professional sections", () => {
  expect(candidatePortfolioCompletion({ hasLocation: true, hasEducation: true, hasRequiredDocuments: true }).percentage).toBe(100);
  const partial = candidatePortfolioCompletion({ hasLocation: false, hasEducation: true, hasRequiredDocuments: true });
  expect(partial.percentage).toBe(67);
  expect(partial.checklist[0]).toMatchObject({ complete: false, suggestion: expect.stringContaining("location") });
  expect(candidatePortfolioCompletion({ hasLocation: true, hasEducation: true, hasRequiredDocuments: null }).percentage).toBe(100);
});
