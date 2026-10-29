import * as React from "react";

import {
  EmailButton,
  EmailMuted,
  EmailParagraph,
  EmailShell,
  EmailSummaryCard,
} from "./components/email-shell";

export type ApplicationReceivedEmailProps = {
  candidateName: string;
  jobTitle: string;
  department: string;
  location: string;
  submittedAtLabel: string;
  dashboardUrl: string;
};

/**
 * Sent to the candidate immediately after an application is submitted, to
 * acknowledge receipt and set expectations: the application is now under
 * review and the candidate will be contacted about the outcome later.
 */
export function ApplicationReceivedEmail({
  candidateName,
  jobTitle,
  department,
  location,
  submittedAtLabel,
  dashboardUrl,
}: ApplicationReceivedEmailProps) {
  return (
    <EmailShell
      preview={`We received your application for ${jobTitle}. It is now under review.`}
      heading="Application received"
    >
      <EmailParagraph>Hi {candidateName},</EmailParagraph>

      <EmailParagraph>
        Thank you for applying. We have received your application for the
        vacancy below and it is currently <strong>under review</strong> by the
        recruitment team.
      </EmailParagraph>

      <EmailSummaryCard
        rows={[
          { label: "Job title", value: jobTitle },
          { label: "Department", value: department },
          { label: "Location", value: location },
          { label: "Submitted on", value: submittedAtLabel },
        ]}
      />

      <EmailParagraph>
        No further action is needed from you at this stage. You will be
        notified by email as soon as there is an update on the status of your
        application &mdash; for example if it has been shortlisted.
      </EmailParagraph>

      <EmailMuted>
        You can also follow the latest status of your application from your
        dashboard at any time.
      </EmailMuted>

      <EmailButton href={dashboardUrl}>View application status</EmailButton>
    </EmailShell>
  );
}

const ApplicationReceivedPreview = () => (
  <ApplicationReceivedEmail
    candidateName="Jane Doe"
    jobTitle="Software Engineer"
    department="Information Technology"
    location="New Delhi (onsite)"
    submittedAtLabel="29 Oct 2026, 14:32"
    dashboardUrl="http://localhost:3000/dashboard"
  />
);

export default ApplicationReceivedPreview;
