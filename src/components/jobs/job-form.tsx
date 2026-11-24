"use client";

import { useFeedbackAction } from "@/components/action-feedback";

import Link from "next/link";

import { SubmitButton } from "@/components/submit-button";
import { Field, Select, TextArea, TextInput } from "@/components/ui";
import {
  JOB_CATEGORIES,
  JOB_CATEGORY_LABELS,
  type JobCategoryValue,
} from "@/lib/profile-documents";
import { createJobAction, updateJobAction } from "@/lib/actions/jobs";

export type JobFormValues = {
  id: string;
  title: string;
  department: string;
  location: string;
  description: string;
  qualifications: string;
  category: JobCategoryValue;
  opensAt: string;
  closesAt: string;
};

export function JobForm({ job }: { job?: JobFormValues }) {
  const action = job ? updateJobAction : createJobAction;
  const [state, formAction] = useFeedbackAction(action, undefined);

  return (
    <form action={formAction} className="space-y-4" noValidate>
      {job && <input type="hidden" name="id" value={job.id} />}

      <Field label="Job title" htmlFor="title" error={state?.errors?.title}>
        <TextInput
          id="title"
          name="title"
          defaultValue={job?.title}
          required
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Department"
          htmlFor="department"
          error={state?.errors?.department}
        >
          <TextInput
            id="department"
            name="department"
            defaultValue={job?.department}
            required
          />
        </Field>
        <Field
          label="Location"
          htmlFor="location"
          error={state?.errors?.location}
        >
          <TextInput
            id="location"
            name="location"
            defaultValue={job?.location}
            required
          />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Applications open"
          htmlFor="opensAt"
          error={state?.errors?.opensAt}
        >
          <TextInput
            id="opensAt"
            name="opensAt"
            type="date"
            defaultValue={job?.opensAt}
            required
          />
        </Field>
        <Field
          label="Applications close"
          htmlFor="closesAt"
          error={state?.errors?.closesAt}
        >
          <TextInput
            id="closesAt"
            name="closesAt"
            type="date"
            defaultValue={job?.closesAt}
            required
          />
        </Field>
      </div>

      <Field label="Job category" htmlFor="category" error={state?.errors?.category}>
        <Select
          id="category"
          name="category"
          defaultValue={job?.category ?? "GENERAL"}
        >
          {JOB_CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {JOB_CATEGORY_LABELS[category]}
            </option>
          ))}
        </Select>
      </Field>

      <Field
        label="Job description"
        htmlFor="description"
        error={state?.errors?.description}
      >
        <TextArea
          id="description"
          name="description"
          rows={6}
          defaultValue={job?.description}
          required
        />
      </Field>

      <Field
        label="Qualifications and requirements"
        htmlFor="qualifications"
        error={state?.errors?.qualifications}
      >
        <TextArea
          id="qualifications"
          name="qualifications"
          rows={6}
          defaultValue={job?.qualifications}
          required
        />
      </Field>

      {!job && (
        <Field label="Initial status" htmlFor="status">
          <Select id="status" name="status" defaultValue="DRAFT">
            <option value="DRAFT">Save as draft</option>
            <option value="PUBLISHED">Publish immediately</option>
          </Select>
        </Field>
      )}

      <div className="flex items-center gap-4">
        <SubmitButton pendingLabel="Saving…">
          {job ? "Save changes" : "Create vacancy"}
        </SubmitButton>
        <Link
          href={job ? `/recruiter/jobs/${job.id}` : "/recruiter/jobs"}
          className="text-sm text-zinc-600 hover:underline dark:text-zinc-300"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
