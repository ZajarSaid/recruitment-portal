import { describe, expect, it } from "vitest";

import {
  jobSchema,
  loginSchema,
  registerSchema,
  toFieldErrors,
} from "@/lib/definitions";

describe("registerSchema", () => {
  const valid = {
    name: "Asha Moyo",
    email: "Asha.Moyo@Example.COM",
    password: "Secret123",
    confirmPassword: "Secret123",
  };

  it("accepts valid input and normalises the email", () => {
    const parsed = registerSchema.safeParse(valid);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.email).toBe("asha.moyo@example.com");
    }
  });

  it("rejects weak passwords", () => {
    const short = registerSchema.safeParse({ ...valid, password: "abc", confirmPassword: "abc" });
    const noNumber = registerSchema.safeParse({
      ...valid,
      password: "onlyletters",
      confirmPassword: "onlyletters",
    });

    expect(short.success).toBe(false);
    expect(noNumber.success).toBe(false);
  });

  it("rejects mismatched password confirmation", () => {
    const parsed = registerSchema.safeParse({
      ...valid,
      confirmPassword: "SomethingElse1",
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(toFieldErrors(parsed.error).confirmPassword).toContain(
        "Passwords do not match.",
      );
    }
  });

  it("requires a valid email address", () => {
    expect(registerSchema.safeParse({ ...valid, email: "not-an-email" }).success).toBe(
      false,
    );
  });
});

describe("loginSchema", () => {
  it("requires a password", () => {
    expect(loginSchema.safeParse({ email: "a@b.com", password: "" }).success).toBe(
      false,
    );
  });
});

describe("jobSchema", () => {
  function validJob(overrides: Record<string, unknown> = {}) {
    return {
      title: "Senior Software Engineer",
      department: "ICT",
      location: "Dodoma",
      description: "Design and build reliable recruitment systems for the portal.",
      qualifications: "Degree in Computer Science with five years experience.",
      opensAt: "2026-01-01",
      closesAt: "2026-02-01",
      ...overrides,
    };
  }

  it("parses string form values into dates", () => {
    const parsed = jobSchema.safeParse(validJob());
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.opensAt).toBeInstanceOf(Date);
      expect(parsed.data.closesAt.getTime()).toBeGreaterThan(
        parsed.data.opensAt.getTime(),
      );
    }
  });

  it("rejects a closing date before the opening date", () => {
    const parsed = jobSchema.safeParse(
      validJob({ opensAt: "2026-03-01", closesAt: "2026-02-01" }),
    );
    expect(parsed.success).toBe(false);
  });

  it("no longer requires salary information", () => {
    const parsed = jobSchema.safeParse(validJob());
    expect(parsed.success).toBe(true);
  });
});
