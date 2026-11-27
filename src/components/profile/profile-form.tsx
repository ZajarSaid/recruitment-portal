"use client";

import { notifyAction, useFeedbackAction } from "@/components/action-feedback";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  startTransition,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";

import { SubmitButton } from "@/components/submit-button";
import { Alert, Field, Select, TextArea, TextInput } from "@/components/ui";
import { ProfilePhotoField } from "@/components/applications/profile-photo-field";
import { ProfileLayout, profileSectionClassName } from "@/components/profile/profile-layout";
import {
  ProfileDocumentField,
  type ProfileDocumentInfo,
} from "@/components/profile/profile-document-field";
import { saveProfileAction } from "@/lib/actions/profile";
import { profileStepHref, PROFILE_STEPS as profileSections } from "@/lib/profile-steps";
import {
  DOCUMENT_ACCEPT_ATTRIBUTE,
  formatFileSize,
} from "@/lib/document-files";
import {
  BIRTH_MONTH_LABELS,
  CATEGORY_DOCUMENT_LISTS,
  COMPUTER_LITERACY_LABELS,
  COMPUTER_LITERACY_LEVELS,
  EDUCATION_LEVEL_LABELS,
  EDUCATION_LEVELS,
  IDENTITY_DOCUMENT,
  JOB_CATEGORIES,
  JOB_CATEGORY_LABELS,
  birthYearRange,
  type JobCategoryValue,
} from "@/lib/profile-documents";

export type ProfileFormValues = {
  educationLevel: string | null;
  experienceSummary: string | null;
  birthYear: number | null;
  birthMonth: number | null;
  physicalAddress: string | null;
  nidaNumber: string | null;
  computerLiteracy: string | null;
  languages: string | null;
  category: JobCategoryValue;
  photoUrl: string | null;
  photoPublicId: string | null;
};

const { min: MIN_YEAR, max: MAX_YEAR } = birthYearRange();

const YEAR_OPTIONS = Array.from(
  { length: MAX_YEAR - MIN_YEAR + 1 },
  (_, index) => MAX_YEAR - index,
);

const sectionClassName = "space-y-5 p-5 sm:p-6";

const sectionHeadingClassName =
  "text-xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50";

export function ProfileForm({
  initial,
  initialDocuments,
  savedPhotoSource,
  maxBytes,
  redirectToApply,
  canApply,
  openVacancies,
  applicationThreshold,
  incompleteNotice,
  stepIndex,
  availableStep,
  sidebarHeader,
}: {
  initial: ProfileFormValues | null;
  initialDocuments: ProfileDocumentInfo[];
  savedPhotoSource?: string | null;
  maxBytes: number;
  redirectToApply: string | null;
  canApply: boolean;
  openVacancies: boolean;
  applicationThreshold: number;
  incompleteNotice: boolean;
  stepIndex: number;
  availableStep: number;
  sidebarHeader?: ReactNode;
}) {
  const router = useRouter();
  const selected = profileSections[stepIndex].id;
  const nextStep = profileSections[stepIndex + 1];
  const previousStep = profileSections[stepIndex - 1];
  const showStepStatus = stepIndex === availableStep && Boolean(nextStep);
  const href = (step: typeof selected) => profileStepHref(step, redirectToApply, incompleteNotice);
  const [state, action, saving] = useFeedbackAction(
    async (previous, data) => {
      const result = await saveProfileAction(previous, data);
      if (result?.ok && nextStep) {
        notifyAction(result.message ?? "Profile saved.", true);
        router.push(href(nextStep.id));
        return undefined;
      }
      return result;
    },
    undefined,
  );

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving || anyUploading) return;
    const data = new FormData(event.currentTarget);
    data.set("step", selected);
    startTransition(() => action(data));
  }

  const [category, setCategory] = useState<JobCategoryValue>(
    initial?.category ?? "GENERAL",
  );
  const [documents, setDocuments] = useState<
    Record<string, ProfileDocumentInfo | null>
  >(() => {
    const map: Record<string, ProfileDocumentInfo | null> = {};
    for (const document of initialDocuments) {
      map[document.documentKey] = document;
    }
    return map;
  });
  const [uploading, setUploading] = useState<Record<string, boolean>>({});

  const specs = CATEGORY_DOCUMENT_LISTS[category];
  const requiredSpecs = specs.filter((spec) => spec.required);

  const handleDocumentChange = (
    documentKey: string,
    document: ProfileDocumentInfo | null,
    isUploading: boolean,
  ) => {
    setDocuments((previous) => ({ ...previous, [documentKey]: document }));
    setUploading((previous) => ({ ...previous, [documentKey]: isUploading }));
  };

  const missingRequired = requiredSpecs.filter((spec) => !documents[spec.key]);
  const anyUploading = Object.values(uploading).some(Boolean);

  return (
    <ProfileLayout sidebarHeader={sidebarHeader} sections={
      <ol className="grid gap-1">
        <li><Link href="/profile" className={profileSectionClassName}>Dashboard</Link></li>
        {profileSections.map(({ id, label }, index) => (
          <li key={id} className="min-w-0">
            {index > availableStep || saving || anyUploading ? (
              <span aria-disabled="true" aria-current={selected === id ? "step" : undefined} className={`${profileSectionClassName} opacity-50`}>
                {label}
              </span>
            ) : (
              <Link href={href(id)} aria-current={selected === id ? "step" : undefined} className={profileSectionClassName}>
                {label}
              </Link>
            )}
          </li>
        ))}
      </ol>
    }>
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Edit profile</h1>
      {canApply && openVacancies && (
        <Alert tone="success">
          Your profile meets the application requirement.{" "}
          <Link href={redirectToApply ?? "/jobs"} className="font-semibold underline">
            {redirectToApply ? "Continue to your application" : "Browse vacancies"}
          </Link>
        </Alert>
      )}
      {!canApply && incompleteNotice && (
        <Alert tone="info">
          Bring your profile completion above {applicationThreshold}% before applying.
        </Alert>
      )}
      <form
        onSubmit={handleSubmit}
        className="min-w-0 overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950"
        noValidate
      >
        {showStepStatus && (
          <div className="scroll-mt-24 border-b border-zinc-200 bg-zinc-50 px-5 py-4 sm:px-6 dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-sm font-semibold text-indigo-700 dark:text-indigo-300">
              Step {stepIndex + 1} of {profileSections.length}
            </p>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
              Complete this step and save to unlock the next one.
            </p>
            <div aria-hidden="true" className="mt-2 flex gap-1">
              {profileSections.map(({ id }, index) => (
                <span
                  key={id}
                  className={`h-1.5 flex-1 rounded-full ${index <= stepIndex ? "bg-indigo-600 dark:bg-indigo-400" : "bg-indigo-100 dark:bg-zinc-800"}`}
                />
              ))}
            </div>
          </div>
        )}
        {selected === "personal-details" && (
          <section className={sectionClassName}>
            <h2 className={sectionHeadingClassName}>Personal details</h2>

            <ProfilePhotoField
              initial={
                initial?.photoUrl || initial?.photoPublicId
                  ? {
                      url: initial.photoUrl,
                      publicId: initial.photoPublicId ?? "",
                    }
                  : null
              }
              maxBytes={maxBytes}
              savedPreview={savedPhotoSource}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Birth year"
                htmlFor="birthYear"
                error={state?.errors?.birthYear}
              >
                <Select
                  id="birthYear"
                  name="birthYear"
                  required
                  defaultValue={
                    initial?.birthYear ? String(initial.birthYear) : ""
                  }
                >
                  <option value="">Select year…</option>
                  {YEAR_OPTIONS.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field
                label="Birth month"
                htmlFor="birthMonth"
                error={state?.errors?.birthMonth}
              >
                <Select
                  id="birthMonth"
                  name="birthMonth"
                  required
                  defaultValue={
                    initial?.birthMonth ? String(initial.birthMonth) : ""
                  }
                >
                  <option value="">Select month…</option>
                  {BIRTH_MONTH_LABELS.map((label, index) => (
                    <option key={label} value={index + 1}>
                      {label}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>

            <Field
              label="Physical address"
              htmlFor="physicalAddress"
              error={state?.errors?.physicalAddress}
            >
              <TextArea
                id="physicalAddress"
                name="physicalAddress"
                required
                rows={2}
                defaultValue={initial?.physicalAddress ?? ""}
                placeholder="Street, ward, district, region"
              />
            </Field>
            <Field
              label="NIDA number (optional)"
              htmlFor="nidaNumber"
              error={state?.errors?.nidaNumber}
              hint="Enter 20 digits, with or without hyphens."
            >
              <TextInput
                id="nidaNumber"
                name="nidaNumber"
                inputMode="numeric"
                autoComplete="off"
                maxLength={23}
                defaultValue={initial?.nidaNumber ?? ""}
                placeholder="19900312-78996-66554-80"
              />
            </Field>
            <div className="rounded-xl border border-zinc-200 px-4 dark:border-zinc-800">
              <ProfileDocumentField
                document={IDENTITY_DOCUMENT}
                initial={documents[IDENTITY_DOCUMENT.key] ?? null}
                accept={DOCUMENT_ACCEPT_ATTRIBUTE}
                canUpload={!saving}
                onChange={handleDocumentChange}
              />
              <p className="pb-3 text-xs text-zinc-500 dark:text-zinc-400">
                PDF, JPEG, or PNG up to {formatFileSize(maxBytes)}.
              </p>
            </div>
          </section>
        )}

        {selected === "education" && (
          <section className={sectionClassName}>
            <h2 className={sectionHeadingClassName}>
              Academic information &amp; documents
            </h2>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Highest education level"
                htmlFor="educationLevel"
                error={state?.errors?.educationLevel}
              >
                <Select
                  id="educationLevel"
                  name="educationLevel"
                  required
                  defaultValue={initial?.educationLevel ?? ""}
                >
                  <option value="">Select level…</option>
                  {EDUCATION_LEVELS.map((level) => (
                    <option key={level} value={level}>
                      {EDUCATION_LEVEL_LABELS[level]}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field
                label="Professional category"
                htmlFor="category"
                error={state?.errors?.category}
                hint="This determines which supporting documents your profile asks for."
              >
                <Select
                  id="category"
                  name="category"
                  value={category}
                  onChange={(event) =>
                    setCategory(event.target.value as JobCategoryValue)
                  }
                >
                  {JOB_CATEGORIES.map((value) => (
                    <option key={value} value={value}>
                      {JOB_CATEGORY_LABELS[value]}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>

            <div className="space-y-3 border-t border-zinc-200 pt-5 dark:border-zinc-800">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-base font-semibold text-zinc-950 dark:text-zinc-50">
                  Supporting documents
                </h3>
                {requiredSpecs.length > 0 && (
                  <p
                    aria-live="polite"
                    className="text-sm font-medium text-zinc-600 dark:text-zinc-300"
                  >
                    {requiredSpecs.length - missingRequired.length}
                    {" of "}
                    {requiredSpecs.length} required uploaded
                  </p>
                )}
              </div>
              {specs.length === 0 ? (
                <p className="text-sm text-zinc-600 dark:text-zinc-300">
                  No supporting documents are listed for this category.
                </p>
              ) : (
                <>
                  <p className="text-sm text-zinc-600 dark:text-zinc-300">
                    PDF, JPEG, or PNG up to {formatFileSize(maxBytes)} per file.
                  </p>
                  {!initial && (
                    <p className="text-sm text-zinc-600 dark:text-zinc-300">
                      Save the first step to enable document uploads.
                    </p>
                  )}
                  <ul className="divide-y divide-indigo-100 rounded-xl border border-indigo-100 dark:divide-zinc-800 dark:border-zinc-800">
                    {specs.map((spec) => (
                      <li key={spec.key}>
                        <ProfileDocumentField
                          document={spec}
                          initial={documents[spec.key] ?? null}
                          accept={DOCUMENT_ACCEPT_ATTRIBUTE}
                          canUpload={Boolean(initial)}
                          onChange={handleDocumentChange}
                        />
                      </li>
                    ))}
                  </ul>
                  {missingRequired.length > 0 && (
                    <p className="text-xs text-amber-600 dark:text-amber-400">
                      Still required:{" "}
                      {missingRequired.map((spec) => spec.label).join(", ")}
                    </p>
                  )}
                </>
              )}
            </div>
          </section>
        )}

        {selected === "experience" && (
          <section className={sectionClassName}>
            <h2 className={sectionHeadingClassName}>Experience</h2>
            <Field
              label="Experience summary (optional)"
              htmlFor="experienceSummary"
              error={state?.errors?.experienceSummary}
              hint="Include relevant work, internships, volunteering, or projects."
            >
              <TextArea
                id="experienceSummary"
                name="experienceSummary"
                defaultValue={initial?.experienceSummary ?? ""}
                rows={4}
                maxLength={2000}
                placeholder="Summarize your relevant work, internships, or projects"
              />
            </Field>
          </section>
        )}

        {selected === "computer-literacy" && (
          <section className={sectionClassName}>
            <h2 className={sectionHeadingClassName}>Computer literacy</h2>
            <Field
              label="Computer literacy"
              htmlFor="computerLiteracy"
              error={state?.errors?.computerLiteracy}
            >
              <Select
                id="computerLiteracy"
                name="computerLiteracy"
                required
                defaultValue={initial?.computerLiteracy ?? ""}
              >
                <option value="">Select level…</option>
                {COMPUTER_LITERACY_LEVELS.map((level) => (
                  <option key={level} value={level}>
                    {COMPUTER_LITERACY_LABELS[level]}
                  </option>
                ))}
              </Select>
            </Field>
          </section>
        )}
        {selected === "languages" && (
          <section className={sectionClassName}>
            <h2 className={sectionHeadingClassName}>Language proficiency</h2>
            <Field
              label="Languages you speak"
              htmlFor="languages"
              error={state?.errors?.languages}
              hint="Separate languages with commas. You can include your proficiency for each language."
            >
              <TextInput
                id="languages"
                name="languages"
                required
                defaultValue={initial?.languages ?? ""}
                placeholder="Kiswahili (fluent), English (intermediate)"
              />
            </Field>
          </section>
        )}

        <div className="flex flex-wrap items-center justify-end gap-3 border-t border-zinc-200 bg-zinc-50 px-5 py-4 sm:px-6 dark:border-zinc-800 dark:bg-zinc-900">
          {previousStep && !saving && !anyUploading && (
            <Link
              href={href(previousStep.id)}
              className="inline-flex min-h-11 items-center rounded-lg border border-zinc-300 px-4 text-sm font-semibold dark:border-zinc-700"
            >
              Back
            </Link>
          )}
          <SubmitButton disabled={saving || anyUploading}>
            {saving ? "Saving profile…" : nextStep ? "Save and continue" : "Save profile"}
          </SubmitButton>
        </div>
      </form>
    </ProfileLayout>
  );
}
