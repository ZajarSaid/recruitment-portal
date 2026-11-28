import { z } from "zod";

/* -------------------------------------------------------------------------- */
/* Field-error helpers                                                        */
/* -------------------------------------------------------------------------- */

export type FieldErrors = Record<string, string[]>;

/**
 * Converts a ZodError into a flat map of field name -> messages.
 * Implemented manually so it is independent of Zod version helpers.
 */
export function toFieldErrors(error: z.ZodError): FieldErrors {
  const result: FieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path.length > 0 ? issue.path.join(".") : "form";
    (result[key] ??= []).push(issue.message);
  }
  return result;
}

export type ActionState =
  | {
      ok?: boolean;
      message?: string;
      errors?: FieldErrors;
      resetLink?: string;
    }
  | undefined;

/* -------------------------------------------------------------------------- */
/* Primitive schemas                                                          */
/* -------------------------------------------------------------------------- */

export const emailSchema = z
  .string()
  .trim()
  .min(1, "Email is required.")
  .pipe(z.email("Enter a valid email address."))
  .transform((value) => value.toLowerCase());

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters long.")
  .max(128, "Password must be at most 128 characters long.")
  .regex(/[a-zA-Z]/, "Password must contain at least one letter.")
  .regex(/[0-9]/, "Password must contain at least one number.");

const nameSchema = z
  .string()
  .trim()
  .min(2, "Name must be at least 2 characters long.")
  .max(120, "Name must be at most 120 characters long.");

/* -------------------------------------------------------------------------- */
/* Auth schemas                                                               */
/* -------------------------------------------------------------------------- */

export const registerSchema = z
  .object({
    name: nameSchema,
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match.",
  });

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required."),
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1, "Reset token is missing."),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match.",
  });

/* -------------------------------------------------------------------------- */
/* Job schemas                                                                */
/* -------------------------------------------------------------------------- */

export const jobStatusSchema = z.enum(["DRAFT", "PUBLISHED", "CLOSED"]);

export const jobCategorySchema = z.enum(["GENERAL", "MEDICINE", "IT", "BUSINESS"]);

function formDate(label: string) {
  return z.preprocess(
    (value) => {
      if (typeof value === "string") {
        const trimmed = value.trim();
        if (trimmed === "") return undefined;
        const parsed = new Date(trimmed);
        return Number.isNaN(parsed.getTime()) ? undefined : parsed;
      }
      if (value instanceof Date) {
        return Number.isNaN(value.getTime()) ? undefined : value;
      }
      return value;
    },
    z.date({ error: `${label} is required.` }),
  );
}

export const jobSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(3, "Job title must be at least 3 characters long.")
      .max(200, "Job title must be at most 200 characters long."),
    department: z
      .string()
      .trim()
      .min(2, "Department must be at least 2 characters long.")
      .max(120, "Department must be at most 120 characters long."),
    location: z
      .string()
      .trim()
      .min(2, "Location must be at least 2 characters long.")
      .max(120, "Location must be at most 120 characters long."),
    description: z
      .string()
      .trim()
      .min(20, "Job description must be at least 20 characters long.")
      .max(10_000, "Job description must be at most 10000 characters long."),
    qualifications: z
      .string()
      .trim()
      .min(10, "Qualifications must be at least 10 characters long.")
      .max(10_000, "Qualifications must be at most 10000 characters long."),
    category: jobCategorySchema,
    opensAt: formDate("Opening date"),
    closesAt: formDate("Closing date"),
  })
  .refine((data) => data.closesAt.getTime() > data.opensAt.getTime(), {
    path: ["closesAt"],
    message: "Closing date must be after the opening date.",
  });

export type JobInput = z.infer<typeof jobSchema>;

/* -------------------------------------------------------------------------- */
/* Candidate profile schemas                                                  */
/* -------------------------------------------------------------------------- */

export const profileCategorySchema = z.enum(["GENERAL", "MEDICINE", "IT", "BUSINESS"]);

export const profileEducationLevelSchema = z.enum([
  "NONE",
  "PRIMARY",
  "SECONDARY",
  "CERTIFICATE",
  "DIPLOMA",
  "BACHELOR",
  "MASTER",
  "DOCTORATE",
]);

export const profileComputerLiteracySchema = z.enum([
  "BASIC",
  "INTERMEDIATE",
  "ADVANCED",
]);

function birthYearSchema(label: string) {
  return z.preprocess(
    (value) => {
      if (typeof value === "string") {
        const trimmed = value.trim();
        return trimmed === "" ? null : Number(trimmed);
      }
      return value;
    },
    z
      .number({ error: `${label} is required.` })
      .int(`${label} must be a whole year.`)
      .gte(1930, `${label} looks too early.`)
      .lte(new Date().getFullYear() - 14, `${label} looks too recent.`)
      .nullable(),
  );
}

function birthMonthSchema(label: string) {
  return z.preprocess(
    (value) => {
      if (typeof value === "string") {
        const trimmed = value.trim();
        return trimmed === "" ? null : Number(trimmed);
      }
      return value;
    },
    z
      .number({ error: `${label} is required.` })
      .int(`${label} must be a whole month.`)
      .gte(1, `${label} is invalid.`)
      .lte(12, `${label} is invalid.`)
      .nullable(),
  );
}

export const profileSchema = z.object({
  educationLevel: z.preprocess((value) => value === "" ? null : value, profileEducationLevelSchema.nullable()),
  experienceSummary: z
    .string()
    .trim()
    .max(2000, "Experience must be at most 2,000 characters long.")
    .optional(),
  birthYear: birthYearSchema("Birth year"),
  birthMonth: birthMonthSchema("Birth month"),
  nidaNumber: z.preprocess(
    (value) => value ?? "",
    z.string().trim()
      .regex(/^(?:[0-9]{20}|[0-9]{8}-[0-9]{5}-[0-9]{5}-[0-9]{2})$/, "Enter a 20-digit NIDA number.")
      .transform((value) => value.replaceAll("-", "")),
  ),
  physicalAddress: z.preprocess((value) => typeof value === "string" && !value.trim() ? null : value, z
    .string()
    .trim()
    .min(5, "Physical address must be at least 5 characters long.")
    .max(500, "Physical address must be at most 500 characters long.").nullable()),
  computerLiteracy: z.preprocess((value) => value === "" ? null : value, profileComputerLiteracySchema.nullable()),
  languages: z.preprocess((value) => typeof value === "string" && !value.trim() ? null : value, z
    .string()
    .trim()
    .min(2, "List at least one language you speak.")
    .max(500, "Languages must be at most 500 characters long.").nullable()),
  category: profileCategorySchema,
  photoUrl: z.string().trim().max(512).optional(),
  photoPublicId: z.string().trim().max(255).optional(),
});

export type ProfileInput = z.infer<typeof profileSchema>;
