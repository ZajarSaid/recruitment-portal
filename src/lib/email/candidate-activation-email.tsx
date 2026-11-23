import "server-only";

import {
  EmailButton,
  EmailMuted,
  EmailParagraph,
  EmailShell,
} from "@/emails/components/email-shell";
import { sendEmail } from "./email-client";

export function sendCandidateActivationEmail(email: string, activationUrl: string) {
  return sendEmail({
    to: email,
    subject: "Activate your Recruitment Portal account",
    react: (
      <EmailShell heading="Activate your account" preview="Confirm your email address to sign in.">
        <EmailParagraph>
          Confirm your email address within 24 hours to activate your candidate account.
        </EmailParagraph>
        <EmailButton href={activationUrl}>Activate account</EmailButton>
        <EmailMuted>If you did not register, you can ignore this email.</EmailMuted>
      </EmailShell>
    ),
  });
}
