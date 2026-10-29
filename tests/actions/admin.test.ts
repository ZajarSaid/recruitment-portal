import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  assignRecruiterAction,
  setUserActiveAction,
  updateUserRoleAction,
} from "@/lib/actions/admin";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/dal";
import { resetRateLimits } from "@/lib/rate-limit";
import {
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
}): void {
  currentUser.mockResolvedValue(toCurrentUser(user));
}

beforeEach(() => {
  resetCookies();
  resetRateLimits();
  currentUser.mockReset();
});

describe("updateUserRoleAction", () => {
  it("rejects role changes from a recruiter", async () => {
    const recruiter = await createTestUser({ role: "RECRUITER" });
    const target = await createTestUser({ role: "CANDIDATE" });
    signIn(recruiter);

    const state = await updateUserRoleAction(
      undefined,
      formData({ userId: target.id, role: "ADMIN" }),
    );

    expect(state?.message).toBe(
      "You are not authorized to perform this action.",
    );
    const unchanged = await prisma.user.findUnique({ where: { id: target.id } });
    expect(unchanged?.role).toBe("CANDIDATE");
  });

  it("rejects role changes from a candidate", async () => {
    const candidate = await createTestUser({ role: "CANDIDATE" });
    signIn(candidate);

    const state = await updateUserRoleAction(
      undefined,
      formData({ userId: candidate.id, role: "RECRUITER" }),
    );

    expect(state?.message).toBe(
      "You are not authorized to perform this action.",
    );
  });

  it("lets an administrator change another user's role", async () => {
    const admin = await createTestUser({ role: "ADMIN" });
    const target = await createTestUser({ role: "CANDIDATE" });
    signIn(admin);

    const state = await updateUserRoleAction(
      undefined,
      formData({ userId: target.id, role: "RECRUITER" }),
    );

    expect(state?.ok).toBe(true);
    const updated = await prisma.user.findUnique({ where: { id: target.id } });
    expect(updated?.role).toBe("RECRUITER");
  });

  it("stops an administrator from changing their own role", async () => {
    const admin = await createTestUser({ role: "ADMIN" });
    signIn(admin);

    const state = await updateUserRoleAction(
      undefined,
      formData({ userId: admin.id, role: "CANDIDATE" }),
    );

    expect(state?.message).toBe("You cannot change your own role.");
    const unchanged = await prisma.user.findUnique({ where: { id: admin.id } });
    expect(unchanged?.role).toBe("ADMIN");
  });

  it("rejects an unknown role value", async () => {
    const admin = await createTestUser({ role: "ADMIN" });
    const target = await createTestUser({ role: "CANDIDATE" });
    signIn(admin);

    const state = await updateUserRoleAction(
      undefined,
      formData({ userId: target.id, role: "SUPERADMIN" }),
    );

    expect(state?.errors?.role).toBeDefined();
    const unchanged = await prisma.user.findUnique({ where: { id: target.id } });
    expect(unchanged?.role).toBe("CANDIDATE");
  });

  it("reports a missing user", async () => {
    const admin = await createTestUser({ role: "ADMIN" });
    signIn(admin);

    const state = await updateUserRoleAction(
      undefined,
      formData({ userId: "no-such-user", role: "RECRUITER" }),
    );

    expect(state?.message).toBe("User not found.");
  });
});

describe("setUserActiveAction", () => {
  it("deactivates another user's account", async () => {
    const admin = await createTestUser({ role: "ADMIN" });
    const target = await createTestUser({ role: "CANDIDATE" });
    signIn(admin);

    const state = await setUserActiveAction(
      undefined,
      formData({ userId: target.id, isActive: "false" }),
    );

    expect(state?.ok).toBe(true);
    const updated = await prisma.user.findUnique({ where: { id: target.id } });
    expect(updated?.isActive).toBe(false);
  });

  it("reactivates a deactivated account", async () => {
    const admin = await createTestUser({ role: "ADMIN" });
    const target = await createTestUser({ role: "RECRUITER", isActive: false });
    signIn(admin);

    const state = await setUserActiveAction(
      undefined,
      formData({ userId: target.id, isActive: "true" }),
    );

    expect(state?.ok).toBe(true);
    const updated = await prisma.user.findUnique({ where: { id: target.id } });
    expect(updated?.isActive).toBe(true);
  });

  it("stops an administrator from deactivating themselves", async () => {
    const admin = await createTestUser({ role: "ADMIN" });
    signIn(admin);

    const state = await setUserActiveAction(
      undefined,
      formData({ userId: admin.id, isActive: "false" }),
    );

    expect(state?.message).toBe(
      "You cannot deactivate your own account.",
    );
    const unchanged = await prisma.user.findUnique({ where: { id: admin.id } });
    expect(unchanged?.isActive).toBe(true);
  });

  it("rejects activation requests from non-administrators", async () => {
    const recruiter = await createTestUser({ role: "RECRUITER" });
    const target = await createTestUser({ role: "CANDIDATE" });
    signIn(recruiter);

    const state = await setUserActiveAction(
      undefined,
      formData({ userId: target.id, isActive: "false" }),
    );

    expect(state?.message).toBe(
      "You are not authorized to perform this action.",
    );
  });
});

describe("assignRecruiterAction", () => {
  it("assigns an active recruiter to a job", async () => {
    const admin = await createTestUser({ role: "ADMIN" });
    const recruiter = await createTestUser({ role: "RECRUITER" });
    const job = await createTestJob({ createdById: admin.id });
    signIn(admin);

    const state = await assignRecruiterAction(
      undefined,
      formData({ jobId: job.id, recruiterEmail: recruiter.email }),
    );

    expect(state?.ok).toBe(true);
    const updated = await prisma.job.findUnique({ where: { id: job.id } });
    expect(updated?.recruiterId).toBe(recruiter.id);
  });

  it("normalises the recruiter email before matching", async () => {
    const admin = await createTestUser({ role: "ADMIN" });
    const recruiter = await createTestUser({ role: "RECRUITER" });
    const job = await createTestJob({ createdById: admin.id });
    signIn(admin);

    const state = await assignRecruiterAction(
      undefined,
      formData({ jobId: job.id, recruiterEmail: `  ${recruiter.email.toUpperCase()}  ` }),
    );

    expect(state?.ok).toBe(true);
    const updated = await prisma.job.findUnique({ where: { id: job.id } });
    expect(updated?.recruiterId).toBe(recruiter.id);
  });

  it("rejects an email that does not match an active recruiter", async () => {
    const admin = await createTestUser({ role: "ADMIN" });
    const candidate = await createTestUser({ role: "CANDIDATE" });
    const job = await createTestJob({ createdById: admin.id });
    signIn(admin);

    const state = await assignRecruiterAction(
      undefined,
      formData({ jobId: job.id, recruiterEmail: candidate.email }),
    );

    expect(state?.message).toBe(
      "No active recruiter account matches that email address.",
    );
    const updated = await prisma.job.findUnique({ where: { id: job.id } });
    expect(updated?.recruiterId).toBeNull();
  });

  it("rejects a deactivated recruiter", async () => {
    const admin = await createTestUser({ role: "ADMIN" });
    const recruiter = await createTestUser({ role: "RECRUITER", isActive: false });
    const job = await createTestJob({ createdById: admin.id });
    signIn(admin);

    const state = await assignRecruiterAction(
      undefined,
      formData({ jobId: job.id, recruiterEmail: recruiter.email }),
    );

    expect(state?.message).toBe(
      "No active recruiter account matches that email address.",
    );
  });

  it("clears the assignment when the email is empty", async () => {
    const admin = await createTestUser({ role: "ADMIN" });
    const recruiter = await createTestUser({ role: "RECRUITER" });
    const job = await createTestJob({
      createdById: admin.id,
      recruiterId: recruiter.id,
    });
    signIn(admin);

    const state = await assignRecruiterAction(
      undefined,
      formData({ jobId: job.id, recruiterEmail: "" }),
    );

    expect(state?.ok).toBe(true);
    expect(state?.message).toBe("Recruiter assignment cleared.");
    const updated = await prisma.job.findUnique({ where: { id: job.id } });
    expect(updated?.recruiterId).toBeNull();
  });

  it("rejects assignment requests from non-administrators", async () => {
    const recruiter = await createTestUser({ role: "RECRUITER" });
    const other = await createTestUser({ role: "RECRUITER" });
    const job = await createTestJob({ createdById: recruiter.id });
    signIn(recruiter);

    const state = await assignRecruiterAction(
      undefined,
      formData({ jobId: job.id, recruiterEmail: other.email }),
    );

    expect(state?.message).toBe(
      "You are not authorized to perform this action.",
    );
    const updated = await prisma.job.findUnique({ where: { id: job.id } });
    expect(updated?.recruiterId).toBeNull();
  });
});
