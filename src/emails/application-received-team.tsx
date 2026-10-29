import * as React from "react";

import {
  EmailButton,
  EmailMuted,
  EmailParagraph,
  EmailShell,
  EmailSummaryCard,
} from "./components/email-shell";

export type ApplicationReceivedTeamEmailProps = {
  recipientName: string;
  /** Drives the first sentence so recruiter and admin copies read naturally. */
  recipientRole: "recruiter" | "admin";
  candidateName: string;
  candidateEmail: string;
  jobTitle: string;
  department: string;
  location: string;
  submittedAtLabel: string;
  applicationsUrl: string;
};

/**
 * Sent to the assigned recruiter (and to admins) whenever a candidate
 * submits an application, so the right person knows a new review has
 * entered their pipeline.
 */
export function ApplicationReceivedTeamEmail({
  recipientName,
  recipientRole,
  candidateName,
  candidateEmail,
  jobTitle,
  department,
  location,
  submittedAtLabel,
  applicationsUrl,
}: ApplicationReceivedTeamEmailProps) {
  const intro =
    recipientRole === "recruiter"
      ? "A candidate has submitted an application for a vacancy you are managing."
      : "A candidate has submitted an application on the portal and it is now waiting in the review queue.";

  return (
    <EmailShell
      preview={`New application: ${candidateName} applied for ${jobTitle}.`}
      heading="New application received"
    >
      <EmailParagraph>Hello {recipientName},</EmailParagraph>

      <EmailParagraph>{intro}</EmailParagraph>

      <EmailSummaryCard
        rows={[
          { label: "Candidate", value: `${candidateName} (${candidateEmail})` },
          { label: "Job title", value: jobTitle },
          { label: "Department", value: department },
          { label: "Location", value: location },
          { label: "Submitted on", value: submittedAtLabel },
        ]}
      />

      <EmailParagraph>
        The application, including the resume summary and uploaded documents,
        is available in the applications view for this vacancy. It is currently
        marked as <strong>Submitted</strong> and is ready to be reviewed or
        shortlisted.
      </EmailParagraph>

      <EmailButton href={applicationsUrl}>Review applications</EmailButton>

      <EmailMuted>
        The candidate has already been told that their application is under
        review, so there is no need to reply to their submission directly.
      </EmailMuted>
    </EmailShell>
  );
}

const ApplicationReceivedTeamPreview = () => (
  <ApplicationReceivedTeamEmail
    recipientName="John Recruiter"
    recipientRole="recruiter"
    candidateName="Jane Doe"
    candidateEmail="jane.doe@example.com"
    jobTitle="Software Engineer"
    department="Information Technology"
    location="New Delhi (onsite)"
    submittedAtLabel="29 Oct 2026, 14:32"
    applicationsUrl="http://localhost:3000/recruiter/jobs/cmq0abc123/applications"
  />
);

export default ApplicationReceivedTeamPreview;
