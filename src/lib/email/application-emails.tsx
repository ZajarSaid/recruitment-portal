import "server-only";

import { after } from "next/server";

import {
  ApplicationReceivedEmail,
} from "@/emails/application-received";
import {
  ApplicationReceivedTeamEmail,
} from "@/emails/application-received-team";
import {
  ApplicationShortlistedEmail,
} from "@/emails/application-shortlisted";

import { env } from "@/lib/env";
import { formatDateTime } from "@/lib/format";
import { prisma } from "@/lib/db";

import { sendEmail } from "./email-client";

/** All the facts the application emails need, gathered before dispatch. */
export type ApplicationEmailContext = {
  applicationId: string;
  candidate: { name: string; email: string };
  job: {
    id: string;
    title: string;
    department: string;
    location: string;
  };
  submittedAt: Date;
};

/**
 * Schedules every email for a fresh application inside Next's `after`,
 * so the candidate's request (and redirect) is never blocked by mail
 * delivery, while the sends still run to completion this request.
 */
export function scheduleApplicationSubmittedEmails(
  context: ApplicationEmailContext,
): void {
  after(async () => {
    await sendApplicationSubmittedEmails(context);
  });
}

/**
 * Schedules the shortlisted email (guard: only for the SHORTLISTED
 * transition) inside `after`. `note` is the reviewer's optional note.
 */
export function scheduleApplicationShortlistedEmail(
  context: ApplicationEmailContext,
  note?: string | null,
): void {
  after(async () => {
    await sendApplicationShortlistedEmail(context, note);
  });
}

/** Candidate email: "your application is under review, more news later". */
async function sendApplicationSubmittedEmails(
  context: ApplicationEmailContext,
): Promise<void> {
  const { applicationId, candidate, job, submittedAt } = context;
  const submittedAtLabel = formatDateTime(submittedAt);
  const dashboardUrl = `${env.appUrl}/dashboard`;

  const promises: Promise<unknown>[] = [
    sendEmail({
      to: candidate.email,
      subject: `Application received — ${job.title}`,
      react: (
        <ApplicationReceivedEmail
          candidateName={candidate.name}
          jobTitle={job.title}
          department={job.department}
          location={job.location}
          submittedAtLabel={submittedAtLabel}
          dashboardUrl={dashboardUrl}
        />
      ),
    }),
  ];

  // Notify the assigned recruiter (when there is one) plus every active
  // admin, so both audiences asked for by the flow stay in the loop.
  promises.push(notifyRecruitmentTeam(context, submittedAtLabel));

  const results = await Promise.allSettled(promises);
  for (const result of results) {
    if (result.status === "rejected") {
      console.error(
        `[email] application email dispatch failed for ${applicationId}:`,
        result.reason,
      );
    }
  }
}

/** Recruiter + admin notification about the new application. */
async function notifyRecruitmentTeam(
  { candidate, job }: ApplicationEmailContext,
  submittedAtLabel: string,
): Promise<void> {
  const [recruiter, admins] = await Promise.all([
    jobRecruiter(job.id),
    prisma.user.findMany({
      where: { role: "ADMIN", isActive: true },
      select: { name: true, email: true },
    }),
  ]);

  const recipients: { name: string; email: string }[] = admins;
  if (recruiter) recipients.unshift(recruiter);

  if (recipients.length === 0) return;

  await Promise.allSettled(
    recipients.map((recipient) =>
      sendEmail({
        to: recipient.email,
        subject: `New application — ${candidate.name} applied for ${job.title}`,
        react: (
          <ApplicationReceivedTeamEmail
            recipientName={recipient.name}
            recipientRole={
              recipient.email === recruiter?.email ? "recruiter" : "admin"
            }
            candidateName={candidate.name}
            candidateEmail={candidate.email}
            jobTitle={job.title}
            department={job.department}
            location={job.location}
            submittedAtLabel={submittedAtLabel}
            applicationsUrl={`${env.appUrl}/recruiter/jobs/${job.id}/applications`}
          />
        ),
      }),
    ),
  );
}

async function jobRecruiter(
  jobId: string,
): Promise<{ name: string; email: string } | null> {
  const job = await prisma.job.findUnique({
    where: { id: jobId },
    select: {
      recruiter: { select: { name: true, email: true } },
    },
  });
  return job?.recruiter ?? null;
}

/** Candidate email: "shortlisted, prepare for interview". */
async function sendApplicationShortlistedEmail(
  context: ApplicationEmailContext,
  note?: string | null,
): Promise<void> {
  const { applicationId, candidate, job } = context;

  const jobRow = await prisma.job.findUnique({
    where: { id: job.id },
    select: { recruiter: { select: { name: true } } },
  });

  try {
    await sendEmail({
      to: candidate.email,
      subject: `Interview next steps — you have been shortlisted for ${job.title}`,
      react: (
        <ApplicationShortlistedEmail
          candidateName={candidate.name}
          jobTitle={job.title}
          department={job.department}
          location={job.location}
          recruiterName={jobRow?.recruiter?.name ?? null}
          reviewerNote={note?.trim() || null}
          statusUrl={`${env.appUrl}/applications/${applicationId}`}
        />
      ),
    });
  } catch (cause) {
    console.error(
      `[email] shortlisted email dispatch failed for ${applicationId}:`,
      cause,
    );
  }
}
