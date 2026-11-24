"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getCurrentUser } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { profileSchema, toFieldErrors, type ActionState } from "@/lib/definitions";

const optionalText = (max: number) =>
  z.string().trim().max(max).transform((value) => value || null);
const requiredText = (max: number) =>
  z.string().trim().min(1, "Enter a value.").max(max);
const date = z.iso.date()
  .refine((value) => value >= "1000-01-01", "Enter a valid year.")
  .transform((value) => new Date(`${value}T00:00:00Z`));
const optionalDate = z.union([date, z.literal("").transform(() => null)]);

const contact = profileSchema.pick({
  birthYear: true, birthMonth: true, physicalAddress: true, languages: true, computerLiteracy: true,
}).extend({
  kind: z.literal("contact"),
  headline: optionalText(160),
  location: optionalText(160),
  phone: optionalText(40).refine(
    (value) => !value || (/^\+?[\d().\s-]+$/.test(value) && value.replace(/\D/g, "").length >= 5),
    "Enter a valid phone number.",
  ),
});

const portfolioInput = z.discriminatedUnion("kind", [
  contact,
  profileSchema.pick({ educationLevel: true }).extend({ kind: z.literal("academic-level") }),
  profileSchema.pick({ experienceSummary: true }).extend({ kind: z.literal("summary") }),
  z.object({
    kind: z.literal("education"),
    qualification: requiredText(160),
    institution: requiredText(160),
    fieldOfStudy: optionalText(160),
    startDate: optionalDate,
    endDate: optionalDate,
    grade: optionalText(40),
  }).refine(({ startDate, endDate }) => !startDate || !endDate || startDate <= endDate,
    { path: ["endDate"], message: "Completion must be on or after the start date." }),
  z.object({
    kind: z.literal("employment"),
    jobTitle: requiredText(160),
    organization: requiredText(160),
    startDate: date,
    endDate: optionalDate,
    current: z.literal("on").optional().transform(Boolean),
    description: optionalText(4000),
  }).refine(({ current, startDate, endDate }) => current || Boolean(endDate && startDate <= endDate),
    { path: ["endDate"], message: "Enter an end date on or after the start date, or mark this as current." }),
  z.object({
    kind: z.literal("skill"),
    name: requiredText(80).transform((value) => value.replace(/\s+/g, " ")),
  }),
  z.object({
    kind: z.literal("certification"),
    name: requiredText(160),
    issuer: requiredText(160),
    registrationNumber: optionalText(120),
    issueDate: optionalDate,
    expiryDate: optionalDate,
  }).refine(({ issueDate, expiryDate }) => !issueDate || !expiryDate || issueDate <= expiryDate,
    { path: ["expiryDate"], message: "Expiry must be on or after the issue date." }),
]);

const recordKind = z.enum(["education", "employment", "skill", "certification"]);

export async function saveCandidatePortfolio(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await getCurrentUser();
  if (user?.role !== "CANDIDATE") return { message: "Sign in as a candidate to edit your profile." };

  const input = portfolioInput.safeParse(Object.fromEntries(formData));
  if (!input.success) return { errors: toFieldErrors(input.error) };

  const rawId = formData.get("id");
  const id = rawId === null ? undefined : z.cuid().safeParse(rawId).data;
  if (rawId !== null && !id) return { message: "This record could not be found." };

  try {
    const saved = await prisma.$transaction(async (tx) => {
      const owned = { id, profile: { userId: user.id } };
      const profile = { connectOrCreate: { where: { userId: user.id }, create: { userId: user.id } } };
      const { data } = input;
      switch (data.kind) {
        case "contact": {
          const { headline, location, phone, birthYear, birthMonth, physicalAddress, computerLiteracy, languages } = data;
          const fields = { headline, location, phone, birthYear, birthMonth, physicalAddress, computerLiteracy, languages };
          await tx.candidateProfile.upsert({
            where: { userId: user.id }, create: { userId: user.id, ...fields }, update: fields,
          });
          return true;
        }
        case "summary": {
          const experienceSummary = data.experienceSummary || null;
          await tx.candidateProfile.upsert({
            where: { userId: user.id }, create: { userId: user.id, experienceSummary }, update: { experienceSummary },
          });
          return true;
        }
        case "academic-level": {
          const { educationLevel } = data;
          await tx.candidateProfile.upsert({
            where: { userId: user.id }, create: { userId: user.id, educationLevel }, update: { educationLevel },
          });
          return true;
        }
        case "education": {
          const { qualification, institution, fieldOfStudy, startDate, endDate, grade } = data;
          const fields = { qualification, institution, fieldOfStudy, startDate, endDate, grade };
          if (id) return (await tx.candidateEducation.updateMany({ where: owned, data: fields })).count === 1;
          await tx.candidateEducation.create({ data: { ...fields, profile } });
          return true;
        }
        case "employment": {
          const { jobTitle, organization, startDate, endDate, current, description } = data;
          const fields = { jobTitle, organization, startDate, endDate: current ? null : endDate, current, description };
          if (id) return (await tx.candidateEmployment.updateMany({ where: owned, data: fields })).count === 1;
          await tx.candidateEmployment.create({ data: { ...fields, profile } });
          return true;
        }
        case "skill":
          if (id) return false;
          await tx.candidateSkill.create({ data: { name: data.name, profile } });
          return true;
        case "certification": {
          const { name, issuer, registrationNumber, issueDate, expiryDate } = data;
          const fields = { name, issuer, registrationNumber, issueDate, expiryDate };
          if (id) return (await tx.candidateCertification.updateMany({ where: owned, data: fields })).count === 1;
          await tx.candidateCertification.create({ data: { ...fields, profile } });
          return true;
        }
      }
    });
    if (!saved) return { message: "This record could not be found." };
  } catch (error) {
    if (input.data.kind === "skill" && typeof error === "object" && error && "code" in error && error.code === "P2002") {
      return { errors: { name: ["This skill is already on your profile."] } };
    }
    return { message: "Could not save your profile. Please try again." };
  }

  revalidatePath("/profile");
  return { ok: true, message: "Profile saved." };
}

export async function deleteCandidatePortfolioRecord(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await getCurrentUser();
  if (user?.role !== "CANDIDATE") return { message: "Sign in as a candidate to edit your profile." };
  const kind = recordKind.safeParse(formData.get("kind"));
  const id = z.cuid().safeParse(formData.get("id"));
  if (!kind.success || !id.success) return { message: "This record could not be found." };

  const where = { id: id.data, profile: { userId: user.id } };
  try {
    const operations = {
      education: () => prisma.candidateEducation.deleteMany({ where }),
      employment: () => prisma.candidateEmployment.deleteMany({ where }),
      skill: () => prisma.candidateSkill.deleteMany({ where }),
      certification: () => prisma.candidateCertification.deleteMany({ where }),
    };
    if (!(await operations[kind.data]()).count) return { message: "This record could not be found." };
  } catch {
    return { message: "Could not delete this record. Please try again." };
  }

  revalidatePath("/profile");
  return { ok: true, message: "Record removed." };
}
