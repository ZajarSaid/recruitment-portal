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
  const fields = { step: "experience" };
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

it("requires NIDA, enforces step order, and saves only the current step", async () => {
  resetCookies();
  const user = await createTestUser();
  await createSession({ userId: user.id, role: user.role });

  try {
    const save = (fields: Record<string, string>) => saveProfileAction(undefined, formData(fields));
    expect(await save({ step: "languages", languages: "English" })).toMatchObject({
      message: "Complete and save the earlier profile steps first.",
    });
    expect(await save({ step: "personal-details", birthYear: "1995", birthMonth: "6", physicalAddress: "Example address" }))
      .toMatchObject({ errors: { nidaNumber: expect.any(Array) } });
    expect(await save({
      step: "personal-details", birthYear: "1995", birthMonth: "6",
      physicalAddress: "Example address", nidaNumber: "00000000-00000-00000-00", languages: "English",
    })).toMatchObject({ ok: true });
    expect(await prisma.candidateProfile.findUniqueOrThrow({ where: { userId: user.id } }))
      .toMatchObject({ birthYear: 1995, nidaNumber: "00000000000000000000", languages: null });

    expect(await save({ step: "education", educationLevel: "BACHELOR", category: "MEDICINE" }))
      .toMatchObject({ message: "Upload all required documents for this category before continuing." });
    expect(await save({ step: "education", educationLevel: "BACHELOR", category: "GENERAL" }))
      .toMatchObject({ ok: true });
    expect(await save({ step: "computer-literacy", computerLiteracy: "BASIC" }))
      .toMatchObject({ ok: true });
    expect(await save({ step: "languages", languages: "English" })).toMatchObject({ ok: true });
  } finally {
    resetCookies();
  }
});
