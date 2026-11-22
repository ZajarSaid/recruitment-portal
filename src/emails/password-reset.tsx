import {
  EmailButton,
  EmailMuted,
  EmailParagraph,
  EmailShell,
} from "./components/email-shell";

export function PasswordResetEmail({ resetUrl }: { resetUrl: string }) {
  return (
    <EmailShell heading="Reset your password" preview="Your reset link expires in one hour.">
      <EmailParagraph>
        We received a request to reset the password for your Recruitment Portal account.
        Use the link below within one hour to choose a new password.
      </EmailParagraph>
      <EmailButton href={resetUrl}>Reset password</EmailButton>
      <EmailMuted>If you did not request a password reset, you can ignore this email.</EmailMuted>
    </EmailShell>
  );
}
