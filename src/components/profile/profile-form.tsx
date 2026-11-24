"use client";

import { useFeedbackAction } from "@/components/action-feedback";

import Link from "next/link";
import {
  startTransition,
  useEffect,
  useRef,
  useState,
  type FormEvent,
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
import { firstIncompleteProfileStep, PROFILE_STEPS as profileSections } from "@/lib/profile-steps";
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
  applicationThreshold,
  incompleteNotice,
  initialSection,
}: {
  initial: ProfileFormValues | null;
  initialDocuments: ProfileDocumentInfo[];
  savedPhotoSource?: string | null;
  maxBytes: number;
  redirectToApply: string | null;
  canApply: boolean;
  applicationThreshold: number;
  incompleteNotice: boolean;
  initialSection?: string;
}) {
  const availableStep = firstIncompleteProfileStep(initial, initialDocuments);
  const requestedStep = profileSections.findIndex(({ id }) => id === initialSection);
  const [stepIndex, setStepIndex] = useState(
    requestedStep >= 0 ? Math.min(requestedStep, availableStep) : availableStep,
  );
  const selected = profileSections[stepIndex].id;
  const nextStep = profileSections[stepIndex + 1];
  const stepIndicator = useRef<HTMLDivElement>(null);
  const previousPanel = useRef(selected);
  useEffect(() => {
    if (previousPanel.current !== selected) stepIndicator.current?.focus();
    previousPanel.current = selected;
  }, [selected]);
  const [state, action, saving] = useFeedbackAction(
    async (
      previous: Awaited<ReturnType<typeof saveProfileAction>>,
      data: FormData,
    ) => {
      const result = await saveProfileAction(previous, data);
      if (result?.ok && nextStep) setStepIndex(stepIndex + 1);
      return result;
    },
    undefined,
  );

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving || anyUploading) return;
    const data = new FormData(event.currentTarget);
    data.set("step", profileSections[stepIndex].id);
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
    <ProfileLayout sections={
        <ol className="grid gap-1 max-md:grid-cols-2">
          {profileSections.map(({ id, label }, index) => (
            <li key={id} className="min-w-0">
              <button
                type="button"
                aria-current={selected === id ? "step" : undefined}
                aria-controls={`profile-section-${id}`}
                disabled={saving || index > stepIndex}
                onClick={() => setStepIndex(index)}
                className={`${profileSectionClassName} disabled:cursor-not-allowed disabled:opacity-50`}
              >
                {label}
              </button>
            </li>
          ))}
        </ol>
    }>
        {canApply ? (
          <Alert tone="success">
            Your profile meets the application requirement.{" "}
            <Link href={redirectToApply ?? "/jobs"} className="font-semibold underline">
              {redirectToApply ? "Continue to your application" : "Browse vacancies"}
            </Link>
          </Alert>
        ) : incompleteNotice && (
          <Alert tone="info">
            Bring your profile completion above {applicationThreshold}% before applying.
          </Alert>
        )}
        <form
          onSubmit={handleSubmit}
          className="min-w-0 overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950"
          noValidate
        >
          <div ref={stepIndicator} tabIndex={-1} className="scroll-mt-24 border-b border-zinc-200 bg-zinc-50 px-5 py-4 sm:px-6 dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-sm font-semibold text-indigo-700 dark:text-indigo-300">
              Step {stepIndex + 1} of {profileSections.length}
            </p>
            {nextStep && <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">Complete this step and save to unlock the next one.</p>}
            <div aria-hidden="true" className="mt-2 flex gap-1">
              {profileSections.map(({ id }, index) => (
                <span
                  key={id}
                  className={`h-1.5 flex-1 rounded-full ${index <= stepIndex ? "bg-indigo-600 dark:bg-indigo-400" : "bg-indigo-100 dark:bg-zinc-800"}`}
                />
              ))}
            </div>
          </div>
          <section
            id="profile-section-personal-details"
            hidden={selected !== "personal-details"}
            className={sectionClassName}
          >
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
          </section>

          <section
            id="profile-section-education"
            hidden={selected !== "education"}
            className={sectionClassName}
          >
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

          <section
            id="profile-section-experience"
            hidden={selected !== "experience"}
            className={sectionClassName}
          >
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
              />
            </Field>
          </section>

          <section
            id="profile-section-computer-literacy"
            hidden={selected !== "computer-literacy"}
            className={sectionClassName}
          >
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
          <section
            id="profile-section-languages"
            hidden={selected !== "languages"}
            className={sectionClassName}
          >
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

          <div className="flex flex-wrap items-center justify-end gap-3 border-t border-zinc-200 bg-zinc-50 px-5 py-4 sm:px-6 dark:border-zinc-800 dark:bg-zinc-900">
            {stepIndex > 0 && (
              <button
                type="button"
                disabled={saving}
                onClick={() => setStepIndex(stepIndex - 1)}
                className="min-h-11 rounded-lg border border-zinc-300 px-4 text-sm font-semibold disabled:opacity-60 dark:border-zinc-700"
              >
                Back
              </button>
            )}
            <SubmitButton disabled={saving || anyUploading}>
              {saving ? "Saving profile…" : nextStep ? "Save and continue" : "Save profile"}
            </SubmitButton>
          </div>
        </form>
    </ProfileLayout>
  );
}
