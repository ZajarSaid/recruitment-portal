import { describe, expect, it } from "vitest";

import {
  canManageJob,
  getJobAvailability,
  isAcceptingApplications,
} from "@/lib/jobs";

const NOW = new Date("2026-01-15T00:00:00.000Z");
const DAY = 24 * 60 * 60 * 1000;

function job(overrides: {
  status?: string;
  opensAt?: Date;
  closesAt?: Date;
}) {
  return {
    status: overrides.status ?? "PUBLISHED",
    opensAt: overrides.opensAt ?? new Date(NOW.getTime() - DAY),
    closesAt: overrides.closesAt ?? new Date(NOW.getTime() + DAY),
  };
}

describe("getJobAvailability", () => {
  it("treats DRAFT jobs as closed", () => {
    expect(getJobAvailability(job({ status: "DRAFT" }), NOW)).toBe("CLOSED");
  });

  it("treats CLOSED jobs as closed", () => {
    expect(getJobAvailability(job({ status: "CLOSED" }), NOW)).toBe("CLOSED");
  });

  it("reports UPCOMING when the opening date is in the future", () => {
    expect(
      getJobAvailability(
        job({ opensAt: new Date(NOW.getTime() + DAY) }),
        NOW,
      ),
    ).toBe("UPCOMING");
  });

  it("reports OPEN inside the application window", () => {
    expect(getJobAvailability(job({}), NOW)).toBe("OPEN");
  });

  it("reports CLOSED once the deadline has passed", () => {
    expect(
      getJobAvailability(
        job({ closesAt: new Date(NOW.getTime() - 1) }),
        NOW,
      ),
    ).toBe("CLOSED");
  });
});

describe("isAcceptingApplications", () => {
  it("accepts only PUBLISHED jobs inside the window", () => {
    expect(isAcceptingApplications(job({}), NOW)).toBe(true);
    expect(isAcceptingApplications(job({ status: "DRAFT" }), NOW)).toBe(false);
    expect(isAcceptingApplications(job({ status: "CLOSED" }), NOW)).toBe(false);
    expect(
      isAcceptingApplications(
        job({ opensAt: new Date(NOW.getTime() + DAY) }),
        NOW,
      ),
    ).toBe(false);
    expect(
      isAcceptingApplications(
        job({ closesAt: new Date(NOW.getTime() - DAY) }),
        NOW,
      ),
    ).toBe(false);
  });
});

describe("canManageJob", () => {
  const owner = "user-owner";
  const other = "user-other";

  it("allows administrators to manage any job", () => {
    expect(
      canManageJob(
        { id: other, role: "ADMIN" },
        { createdById: owner, recruiterId: null },
      ),
    ).toBe(true);
  });

  it("allows the creator to manage the job", () => {
    expect(
      canManageJob(
        { id: owner, role: "RECRUITER" },
        { createdById: owner, recruiterId: null },
      ),
    ).toBe(true);
  });

  it("allows an assigned recruiter to manage the job", () => {
    expect(
      canManageJob(
        { id: other, role: "RECRUITER" },
        { createdById: owner, recruiterId: other },
      ),
    ).toBe(true);
  });

  it("rejects an unrelated recruiter", () => {
    expect(
      canManageJob(
        { id: other, role: "RECRUITER" },
        { createdById: owner, recruiterId: null },
      ),
    ).toBe(false);
  });

  it("rejects candidates", () => {
    expect(
      canManageJob(
        { id: owner, role: "CANDIDATE" },
        { createdById: owner, recruiterId: owner },
      ),
    ).toBe(false);
  });
});
