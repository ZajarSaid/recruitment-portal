import { beforeEach, expect, it } from "vitest";

import { GET as getProfileDocument } from "@/app/profile/documents/[documentId]/route";
import { deleteCandidatePortfolioRecord, saveCandidatePortfolio } from "@/lib/actions/candidate-portfolio";
import { removeProfileDocumentAction, uploadProfileDocumentAction } from "@/lib/actions/profile";
import { prisma } from "@/lib/db";
import { summarizeCandidateApplications } from "@/lib/portfolio-summary";
import { createSession } from "@/lib/session";
import { SESSION_COOKIE_NAME } from "@/lib/session-core";
import { getCookie, resetCookies, setCookie } from "../harness/cookies";
import { createTestApplication, createTestJob, createTestUser, formData, testFile } from "../harness/fixtures";

const education = {
  kind: "education",
  qualification: "Diploma",
  institution: "Example College",
  fieldOfStudy: "Health Records",
  grade: "",
  startDate: "2020-01-15",
  endDate: "2023-06-20",
};

beforeEach(resetCookies);

async function signIn(role: "CANDIDATE" | "RECRUITER" = "CANDIDATE") {
  resetCookies();
  const user = await createTestUser({ role });
  expect(await createSession({ userId: user.id, role })).toBe("created");
  return user;
}

function save(input: Record<string, string>) {
  return saveCandidatePortfolio(undefined, formData(input));
}

function remove(kind: string, id: string) {
  return deleteCandidatePortfolioRecord(undefined, formData({ kind, id }));
}

it("rejects signed-out visitors and recruiters", async () => {
  expect(await save(education)).toMatchObject({ message: expect.stringContaining("Sign in as a candidate") });
  await signIn("RECRUITER");
  expect(await save(education)).toMatchObject({ message: expect.stringContaining("Sign in as a candidate") });
});

it("allows only the owner to change or remove a validated education record", async () => {
  const owner = await signIn();
  expect(await save({ ...education, endDate: "2019-01-01" })).toMatchObject({ errors: { endDate: expect.any(Array) } });
  expect(await save(education)).toMatchObject({ ok: true });
  expect(await save({ ...education, qualification: "Degree" })).toMatchObject({ ok: true });
  const ownerSession = getCookie(SESSION_COOKIE_NAME)!;
  const record = await prisma.candidateEducation.findFirstOrThrow({
    where: { qualification: "Diploma", profile: { userId: owner.id } },
  });
  expect(await prisma.candidateEducation.count({ where: { profileId: record.profileId } })).toBe(2);
  await signIn();
  expect(await save({ ...education, id: record.id, qualification: "Changed" })).toMatchObject({ message: expect.stringContaining("not be found") });
  expect(await remove("education", record.id)).toMatchObject({ message: expect.stringContaining("not be found") });
  expect(await prisma.candidateEducation.findUnique({ where: { id: record.id } })).toMatchObject({ qualification: "Diploma" });

  resetCookies();
  setCookie(SESSION_COOKIE_NAME, ownerSession);
  expect(await save({ ...education, id: record.id, qualification: "Advanced Diploma" })).toMatchObject({ ok: true });
  expect(await remove("education", record.id)).toMatchObject({ ok: true });
  expect(await prisma.candidateEducation.findUnique({ where: { id: record.id } })).toBeNull();
});

it("persists contact, summary, work and licences and rejects duplicate skills", async () => {
  const candidate = await signIn();
  expect(await save({
    kind: "contact", headline: "Health records officer", location: "Zanzibar",
    phone: "+255 700 123 456", birthYear: "", birthMonth: "", physicalAddress: "", languages: "Kiswahili",
    computerLiteracy: "BASIC",
  })).toMatchObject({ ok: true });
  expect(await save({ kind: "summary", experienceSummary: "Experienced with digital health records." })).toMatchObject({ ok: true });
  expect(await save({ kind: "skill", name: "Health  records" })).toMatchObject({ ok: true });
  expect(await save({ kind: "skill", name: "health records" })).toMatchObject({ errors: { name: expect.any(Array) } });
  expect(await save({
    kind: "employment", jobTitle: "Records officer", organization: "Example Clinic",
    startDate: "2023-05-05", endDate: "", current: "on", description: "Manage records.",
  })).toMatchObject({ ok: true });
  expect(await save({
    kind: "certification", name: "Practising Licence", issuer: "Example Council",
    registrationNumber: "ABC-012", issueDate: "2025-01-01", expiryDate: "2027-01-01",
  })).toMatchObject({ ok: true });

  expect(await prisma.candidateProfile.findUnique({
    where: { userId: candidate.id },
    include: { skills: true, employment: true, certifications: true },
  })).toMatchObject({
    headline: "Health records officer",
    location: "Zanzibar",
    experienceSummary: "Experienced with digital health records.",
    skills: [{ name: "Health records" }],
    employment: [{ current: true, endDate: null }],
    certifications: [{ registrationNumber: "ABC-012" }],
  });
});

it("scopes application statistics and preserves submitted data when the portfolio changes", async () => {
  const candidate = await signIn();
  const recruiter = await createTestUser({ role: "RECRUITER" });
  const other = await createTestUser();
  const rows = [];
  for (const status of ["SUBMITTED", "UNDER_REVIEW", "SHORTLISTED", "REJECTED"] as const) {
    const job = await createTestJob({ createdById: recruiter.id });
    rows.push(await createTestApplication({ candidateId: candidate.id, jobId: job.id, status }));
  }
  await createTestApplication({ candidateId: other.id, jobId: rows[0].jobId });

  expect(await save({ kind: "summary", experienceSummary: "A new profile summary." })).toMatchObject({ ok: true });
  const groups = await prisma.application.groupBy({
    by: ["status"], where: { candidateId: candidate.id }, _count: { _all: true },
  });
  expect(summarizeCandidateApplications(groups)).toEqual({ total: 4, pending: 2, shortlisted: 1, rejected: 1 });
  expect(await prisma.application.findUnique({ where: { id: rows[0].id } })).toEqual(rows[0]);
});

it("reuses protected upload and download for an optional CV", async () => {
  await signIn();
  expect(await save({ kind: "summary", experienceSummary: "Portfolio summary." })).toMatchObject({ ok: true });
  const upload = formData({ documentKey: "PROFILE_CV" });
  upload.set("file", testFile());
  const result = await uploadProfileDocumentAction(undefined, upload);
  expect(result).toMatchObject({ ok: true, documentKey: "PROFILE_CV" });
  const documentId = result!.document!.id;
  const routeParams = { params: Promise.resolve({ documentId }) };
  const request = new Request(`http://localhost/profile/documents/${documentId}?download=1`);
  const download = await getProfileDocument(request, routeParams);
  expect(download.status).toBe(200);
  expect(download.headers.get("Content-Disposition")).toContain("attachment");
  const ownerSession = getCookie(SESSION_COOKIE_NAME)!;
  await signIn();
  expect((await getProfileDocument(request, routeParams)).status).toBe(404);
  setCookie(SESSION_COOKIE_NAME, ownerSession);
  expect(await removeProfileDocumentAction(undefined, formData({ documentKey: "PROFILE_CV" }))).toMatchObject({ ok: true });
  expect((await getProfileDocument(request, routeParams)).status).toBe(404);
});
