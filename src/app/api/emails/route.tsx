import { render } from "react-email";

import { ApplicationReceivedEmail } from "@/emails/application-received";
import { ApplicationReceivedTeamEmail } from "@/emails/application-received-team";
import { ApplicationShortlistedEmail } from "@/emails/application-shortlisted";

/**
 * Locally previews every transactional application email with the exact
 * demo data used for its template defaults. Disabled in production so the
 * endpoint never leaks an in-box view of the real templates.
 */
const previews = {
  "application-received": () => (
    <ApplicationReceivedEmail
      candidateName="Jane Doe"
      jobTitle="Software Engineer"
      department="Information Technology"
      location="New Delhi (onsite)"
      submittedAtLabel="29 Oct 2026, 14:32"
      dashboardUrl="http://localhost:3000/dashboard"
    />
  ),
  "application-received-recruiter": () => (
    <ApplicationReceivedTeamEmail
      recipientName="John Recruiter"
      recipientRole="recruiter"
      candidateName="Jane Doe"
      candidateEmail="jane.doe@example.com"
      jobTitle="Software Engineer"
      department="Information Technology"
      location="New Delhi (onsite)"
      submittedAtLabel="29 Oct 2026, 14:32"
      applicationsUrl="http://localhost:3000/recruiter/jobs/demo-job/applications"
    />
  ),
  "application-received-admin": () => (
    <ApplicationReceivedTeamEmail
      recipientName="Avery Admin"
      recipientRole="admin"
      candidateName="Jane Doe"
      candidateEmail="jane.doe@example.com"
      jobTitle="Software Engineer"
      department="Information Technology"
      location="New Delhi (onsite)"
      submittedAtLabel="29 Oct 2026, 14:32"
      applicationsUrl="http://localhost:3000/recruiter/jobs/demo-job/applications"
    />
  ),
  "application-shortlisted": () => (
    <ApplicationShortlistedEmail
      candidateName="Jane Doe"
      jobTitle="Software Engineer"
      department="Information Technology"
      location="New Delhi (onsite)"
      recruiterName="John Recruiter"
      reviewerNote="Strong backend experience; looking forward to discussing your work."
      statusUrl="http://localhost:3000/applications/demo-application"
    />
  ),
} as const;

export async function GET(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return Response.json({ error: "Not available in production." }, { status: 404 });
  }

  const template = new URL(request.url).searchParams.get("template");
  if (!template || !(template in previews)) {
    return Response.json({
      message: "Template preview route.",
      templates: template === null ? Object.keys(previews) : `${template} is not a valid template.`,
      usage: "/api/emails?template=<name> renders the template as HTML.",
    });
  }

  const html = await render(previews[template as keyof typeof previews]());
  return new Response(html, { headers: { "Content-Type": "text/html" } });
}
