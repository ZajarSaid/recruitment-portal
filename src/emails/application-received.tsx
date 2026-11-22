import * as React from "react";
import { humanizeStatus } from "@/lib/format";

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
 * acknowledge receipt and tell the candidate where to track their application.
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
      preview={`We received your application for ${jobTitle}.`}
      heading="Application received"
    >
      <EmailParagraph>Hi {candidateName},</EmailParagraph>

      <EmailParagraph>
        Thank you for applying. We have received your application for the
        vacancy below. You can follow its progress from your dashboard.
      </EmailParagraph>

      <EmailSummaryCard
        rows={[
          { label: "Job title", value: jobTitle },
          { label: "Department", value: department },
          { label: "Location", value: location },
          { label: "Submitted on", value: submittedAtLabel },
          { label: "Status", value: humanizeStatus("SUBMITTED") },
        ]}
      />

      <EmailParagraph>
        No further action is needed from you at this stage. If you are shortlisted,
        we will let you know by email.
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
