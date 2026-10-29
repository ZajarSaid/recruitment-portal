import type { Metadata } from "next";
import Link from "next/link";

import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { Alert, Card } from "@/components/ui";

export const metadata: Metadata = { title: "Reset password" };

export default async function ResetPasswordPage({
  searchParams,
}: PageProps<"/reset-password">) {
  const params = await searchParams;
  const token = typeof params.token === "string" ? params.token : "";

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        Set a new password
      </h1>

      <Card className="mt-6">
        {token ? (
          <ResetPasswordForm token={token} />
        ) : (
          <div className="space-y-4">
            <Alert tone="error">
              This password reset link is missing its token. Request a new
              link.
            </Alert>
            <Link
              href="/forgot-password"
              className="text-sm font-medium text-zinc-900 underline dark:text-zinc-100"
            >
              Request a new reset link
            </Link>
          </div>
        )}
      </Card>
    </div>
  );
}
