import type { Metadata } from "next";
import Link from "next/link";

import { SubmitButton } from "@/components/submit-button";
import { Alert, Card } from "@/components/ui";
import { activateCandidateAction } from "@/lib/actions/auth";

export const metadata: Metadata = {
  title: "Activate account",
  referrer: "no-referrer",
};

export default async function ActivateAccountPage({
  searchParams,
}: PageProps<"/activate-account">) {
  const { token } = await searchParams;
  const hasToken = typeof token === "string" && /^[0-9a-f]{64}$/.test(token);

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Activate your account</h1>
      <Card className="mt-6">
        {hasToken ? (
          <form action={activateCandidateAction} className="space-y-4">
            <input type="hidden" name="token" value={token} />
            <p className="text-sm">Confirm your email address to activate your candidate account.</p>
            <SubmitButton className="w-full" pendingLabel="Activating…">
              Activate account
            </SubmitButton>
          </form>
        ) : (
          <div className="space-y-4">
            <Alert tone="error">This activation link is invalid.</Alert>
            <Link href="/login" className="text-sm font-medium underline">
              Go to sign in to request a new link
            </Link>
          </div>
        )}
      </Card>
    </div>
  );
}
