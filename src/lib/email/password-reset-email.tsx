import "server-only";

import { after } from "next/server";

import { PasswordResetEmail } from "@/emails/password-reset";
import { sendEmail } from "./email-client";

export function schedulePasswordResetEmail(email: string, resetUrl: string) {
  after(async () => {
    await sendEmail({
      to: email,
      subject: "Reset your Recruitment Portal password",
      react: <PasswordResetEmail resetUrl={resetUrl} />,
    });
  });
}
