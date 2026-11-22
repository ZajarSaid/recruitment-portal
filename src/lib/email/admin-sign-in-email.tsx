import "server-only";

import { EmailParagraph, EmailShell } from "@/emails/components/email-shell";
import { sendEmail } from "./email-client";

export function sendAdminSignInCode(email: string, code: string) {
  return sendEmail({
    to: email,
    subject: "Your administrator sign-in code",
    react: (
      <EmailShell
        heading="Administrator sign-in"
        preview="Your one-time sign-in code expires in 10 minutes."
      >
        <EmailParagraph>
          Enter this code on the administrator sign-in page. It expires in 10
          minutes.
        </EmailParagraph>
        <EmailParagraph
          style={{ fontSize: "26px", fontWeight: 700, letterSpacing: "6px" }}
        >
          {code}
        </EmailParagraph>
        <EmailParagraph>
          If you did not request this code, ignore this email.
        </EmailParagraph>
      </EmailShell>
    ),
  });
}
