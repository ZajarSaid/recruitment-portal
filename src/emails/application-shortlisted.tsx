import * as React from "react";

import {
  EmailButton,
  EmailMuted,
  EmailParagraph,
  EmailShell,
  EmailSummaryCard,
} from "./components/email-shell";

export type ApplicationShortlistedEmailProps = {
  candidateName: string;
  jobTitle: string;
  department: string;
  location: string;
  /** Recruiter owner of the vacancy, shown for context when available. */
  recruiterName: string | null;
  /** Optional note left by the reviewer when shortlisting. */
  reviewerNote?: string | null;
  statusUrl: string;
};

/**
 * Sent to the candidate when their application is moved to SHORTLISTED.
 * Confirms the shortlist decision, tells the candidate to prepare for an
 * interview, and notes that they will be contacted with scheduling details
 * (and that any changes will be communicated by email).
 */
export function ApplicationShortlistedEmail({
  candidateName,
  jobTitle,
  department,
  location,
  recruiterName,
  reviewerNote,
  statusUrl,
}: ApplicationShortlistedEmailProps) {
  return (
    <EmailShell
      preview={`Good news: you have been shortlisted for ${jobTitle}.`}
      heading="You have been shortlisted"
    >
      <EmailParagraph>Dear {candidateName},</EmailParagraph>

      <EmailParagraph>
        Good news! Your application for the vacancy below has been{" "}
        <strong>shortlisted for an interview</strong>. Congratulations on
        reaching this stage.
      </EmailParagraph>

      <EmailSummaryCard
        rows={[
          { label: "Job title", value: jobTitle },
          { label: "Department", value: department },
          { label: "Location", value: location },
          { label: "Managed by", value: recruiterName ?? "Recruitment team" },
        ]}
      />

      {reviewerNote ? (
        <>
          <EmailParagraph style={{ fontStyle: "italic" }}>
            &ldquo;{reviewerNote}&rdquo;
          </EmailParagraph>
          <EmailMuted>Reviewer&rsquo;s note from the recruitment team.</EmailMuted>
        </>
      ) : null}

      <EmailParagraph style={{ fontWeight: 700 }}>
        What happens next?
      </EmailParagraph>

      <EmailParagraph>
        1. Please start preparing for an interview. Review the vacancy
        qualifications, your submitted application, and any relevant work
        examples you would like to highlight.
      </EmailParagraph>

      <EmailParagraph>
        2. The interview time, format, and joining details will be sent to you
        in a follow-up email.
      </EmailParagraph>

      <EmailParagraph>
        3. If anything about the schedule changes, you will be notified by
        email so you always have the latest arrangement.
      </EmailParagraph>

      <EmailMuted>
        Keep an eye on your inbox (and spam folder) so you do not miss the
        interview details.
      </EmailMuted>

      <EmailButton href={statusUrl}>View your application status</EmailButton>
    </EmailShell>
  );
}

const ApplicationShortlistedPreview = () => (
  <ApplicationShortlistedEmail
    candidateName="Jane Doe"
    jobTitle="Software Engineer"
    department="Information Technology"
    location="New Delhi (onsite)"
    recruiterName="John Recruiter"
    reviewerNote="Strong backend experience; we would like to discuss your work on distributed systems."
    statusUrl="http://localhost:3000/applications/cmq1xyz789"
  />
);

export default ApplicationShortlistedPreview;
