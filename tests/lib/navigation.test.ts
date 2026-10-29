import { describe, expect, it } from "vitest";

import { isJobManager, roleHome } from "@/lib/navigation";
import { isAppRole, ROLES } from "@/lib/roles";

describe("roleHome", () => {
  it("routes each role to its landing page", () => {
    expect(roleHome("ADMIN")).toBe("/admin");
    expect(roleHome("RECRUITER")).toBe("/recruiter");
    expect(roleHome("CANDIDATE")).toBe("/dashboard");
  });
});

describe("isJobManager", () => {
  it("allows recruiters and administrators only", () => {
    expect(isJobManager("RECRUITER")).toBe(true);
    expect(isJobManager("ADMIN")).toBe(true);
    expect(isJobManager("CANDIDATE")).toBe(false);
  });
});

describe("isAppRole", () => {
  it("accepts only known roles", () => {
    expect(ROLES).toEqual(["CANDIDATE", "RECRUITER", "ADMIN"]);
    expect(isAppRole("ADMIN")).toBe(true);
    expect(isAppRole("SUPERADMIN")).toBe(false);
    expect(isAppRole(null)).toBe(false);
    expect(isAppRole(42)).toBe(false);
  });
});
