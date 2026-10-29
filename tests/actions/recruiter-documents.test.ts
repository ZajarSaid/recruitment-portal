import { beforeEach, describe, expect, it, vi } from "vitest";

import { updateApplicationStatusAction } from "@/lib/actions/recruiter";
import { getCurrentUser } from "@/lib/dal";
import { resetRateLimits } from "@/lib/rate-limit";
import {
  createTestApplication,
  createTestJob,
  createTestUser,
  formData,
  toCurrentUser,
} from "../harness/fixtures";
import { resetCookies } from "../harness/cookies";

vi.mock("@/lib/dal", () => ({ getCurrentUser: vi.fn() }));
const currentUser = vi.mocked(getCurrentUser);

function signIn(user: {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: Date;
}) {
  currentUser.mockResolvedValue(toCurrentUser(user));
}

function statusForm(applicationId: string, toStatus: string): FormData {
  return formData({ applicationId, toStatus });
}

beforeEach(() => {
  resetCookies();
  resetRateLimits();
  currentUser.mockReset();
});

async function seedScenario() {
  const owner = await createTestUser({ role: "RECRUITER", name: "Job Owner" });
  const candidate = await createTestUser({ role: "CANDIDATE", name: "Applicant" });
  const job = await createTestJob({ createdById: owner.id, status: "PUBLISHED" });
  const application = await createTestApplication({
    candidateId: candidate.id,
    jobId: job.id,
  });
  return { owner, candidate, job, application };
}

describe("authorization alongside status changes", () => {
  it("still respects job manager authorization for status changes", async () => {
    const { owner, application } = await seedScenario();
    signIn(owner);
    const state = await updateApplicationStatusAction(
      undefined,
      statusForm(application.id, "SHORTLISTED"),
    );
    expect(state?.ok).toBe(true);
  });
});
