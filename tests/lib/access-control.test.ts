import { describe, expect, it } from "vitest";

import { prisma } from "@/lib/db";
import {
  getApplicationForCandidate,
} from "@/lib/applications";
import {
  getManagedJob,
  getPublicJob,
  listManagedJobs,
  listPublicJobs,
} from "@/lib/jobs";
import {
  createTestApplication,
  createTestJob,
  createTestUser,
  toCurrentUser,
} from "../harness/fixtures";

describe("candidate record ownership", () => {
  it("returns an application only to the candidate who submitted it", async () => {
    const recruiter = await createTestUser({ role: "RECRUITER" });
    const owner = await createTestUser({ role: "CANDIDATE" });
    const other = await createTestUser({ role: "CANDIDATE" });
    const job = await createTestJob({ createdById: recruiter.id });
    const application = await createTestApplication({
      candidateId: owner.id,
      jobId: job.id,
    });

    const own = await getApplicationForCandidate(owner.id, job.id);
    const someoneElses = await getApplicationForCandidate(other.id, job.id);

    expect(own?.id).toBe(application.id);
    expect(someoneElses).toBeNull();
  });

  it("does not expose an application for an unrelated job", async () => {
    const recruiter = await createTestUser({ role: "RECRUITER" });
    const candidate = await createTestUser({ role: "CANDIDATE" });
    const appliedJob = await createTestJob({ createdById: recruiter.id });
    const otherJob = await createTestJob({ createdById: recruiter.id });
    await createTestApplication({ candidateId: candidate.id, jobId: appliedJob.id });

    const result = await getApplicationForCandidate(candidate.id, otherJob.id);

    expect(result).toBeNull();
  });
});

describe("job record-level authorization", () => {
  it("hides another recruiter's job from getManagedJob", async () => {
    const owner = await createTestUser({ role: "RECRUITER" });
    const intruder = await createTestUser({ role: "RECRUITER" });
    const candidate = await createTestUser({ role: "CANDIDATE" });
    const admin = await createTestUser({ role: "ADMIN" });
    const job = await createTestJob({ createdById: owner.id });

    expect(await getManagedJob(job.id, toCurrentUser(owner))).not.toBeNull();
    expect(await getManagedJob(job.id, toCurrentUser(admin))).not.toBeNull();
    expect(await getManagedJob(job.id, toCurrentUser(intruder))).toBeNull();
    expect(await getManagedJob(job.id, toCurrentUser(candidate))).toBeNull();
  });

  it("lets an assigned recruiter manage a job they did not create", async () => {
    const creator = await createTestUser({ role: "ADMIN" });
    const assigned = await createTestUser({ role: "RECRUITER" });
    const job = await createTestJob({
      createdById: creator.id,
      recruiterId: assigned.id,
    });

    expect(await getManagedJob(job.id, toCurrentUser(assigned))).not.toBeNull();
  });

  it("scopes listManagedJobs to the recruiter's own work", async () => {
    const first = await createTestUser({ role: "RECRUITER" });
    const second = await createTestUser({ role: "RECRUITER" });
    const admin = await createTestUser({ role: "ADMIN" });

    const mine = await createTestJob({ createdById: first.id, title: "Mine" });
    const theirs = await createTestJob({ createdById: second.id, title: "Theirs" });

    const firstList = await listManagedJobs(toCurrentUser(first));
    const secondList = await listManagedJobs(toCurrentUser(second));
    const adminList = await listManagedJobs(toCurrentUser(admin));

    expect(firstList.map((job) => job.id)).toContain(mine.id);
    expect(firstList.map((job) => job.id)).not.toContain(theirs.id);
    expect(secondList.map((job) => job.id)).toContain(theirs.id);
    expect(secondList.map((job) => job.id)).not.toContain(mine.id);
    expect(adminList.map((job) => job.id)).toEqual(
      expect.arrayContaining([mine.id, theirs.id]),
    );
  });
});

describe("public job visibility", () => {
  it("returns published jobs but not drafts or closed ones", async () => {
    const recruiter = await createTestUser({ role: "RECRUITER" });
    const published = await createTestJob({
      createdById: recruiter.id,
      status: "PUBLISHED",
      title: "Visible Role",
    });
    const draft = await createTestJob({
      createdById: recruiter.id,
      status: "DRAFT",
      title: "Hidden Draft",
    });
    const closed = await createTestJob({
      createdById: recruiter.id,
      status: "CLOSED",
      title: "Hidden Closed",
    });

    expect((await getPublicJob(published.id))?.id).toBe(published.id);
    expect(await getPublicJob(draft.id)).toBeNull();
    expect(await getPublicJob(closed.id)).toBeNull();

    const visible = await listPublicJobs();
    const visibleIds = visible.map((job) => job.id);
    expect(visibleIds).toContain(published.id);
    expect(visibleIds).not.toContain(draft.id);
    expect(visibleIds).not.toContain(closed.id);
  });
});

describe("application statistics integrity", () => {
  it("counts applications for a job independently of ownership", async () => {
    const recruiter = await createTestUser({ role: "RECRUITER" });
    const job = await createTestJob({ createdById: recruiter.id });
    const candidates = await Promise.all([
      createTestUser({ role: "CANDIDATE" }),
      createTestUser({ role: "CANDIDATE" }),
    ]);

    for (const candidate of candidates) {
      await createTestApplication({ candidateId: candidate.id, jobId: job.id });
    }

    const count = await prisma.application.count({ where: { jobId: job.id } });
    expect(count).toBe(2);
  });
});
