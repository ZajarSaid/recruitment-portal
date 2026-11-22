import { expect, it } from "vitest";

import { saveProfileAction } from "@/lib/actions/profile";
import { prisma } from "@/lib/db";
import { createSession } from "@/lib/session";
import { resetCookies } from "../harness/cookies";
import { createTestProfile, createTestUser, formData } from "../harness/fixtures";

it("saves, preserves, and clears an optional experience summary", async () => {
  resetCookies();
  const user = await createTestUser();
  const profile = await createTestProfile({ userId: user.id });
  await createSession({ userId: user.id, role: user.role });
  const fields = {
    educationLevel: profile.educationLevel ?? "",
    birthYear: String(profile.birthYear),
    birthMonth: String(profile.birthMonth),
    physicalAddress: profile.physicalAddress ?? "",
    computerLiteracy: profile.computerLiteracy ?? "",
    languages: profile.languages ?? "",
    category: profile.category,
  };
  const savedExperience = async () => (
    await prisma.candidateProfile.findUniqueOrThrow({ where: { id: profile.id } })
  ).experienceSummary;

  try {
    expect(await savedExperience()).toBeNull();
    expect(await saveProfileAction(undefined, formData({
      ...fields,
      experienceSummary: "  Volunteer clinic coordinator  ",
    }))).toMatchObject({ ok: true });
    expect(await savedExperience()).toBe("Volunteer clinic coordinator");

    expect(await saveProfileAction(undefined, formData(fields))).toMatchObject({ ok: true });
    expect(await savedExperience()).toBe("Volunteer clinic coordinator");

    expect(await saveProfileAction(undefined, formData({
      ...fields,
      experienceSummary: "",
    }))).toMatchObject({ ok: true });
    expect(await savedExperience()).toBeNull();
  } finally {
    resetCookies();
  }
});
