import type { Metadata } from "next";

import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { Card } from "@/components/ui";

export const metadata: Metadata = { title: "Forgot password" };

export default function ForgotPasswordPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        Recover your password
      </h1>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
        Enter the email address associated with your account.
      </p>

      <Card className="mt-6">
        <ForgotPasswordForm />
      </Card>
    </div>
  );
}
