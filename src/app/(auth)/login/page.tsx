import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { LoginForm } from "@/components/auth/login-form";
import { Alert, Card } from "@/components/ui";
import { getCurrentUser } from "@/lib/dal";
import { roleHome } from "@/lib/navigation";

export const metadata: Metadata = { title: "Log in" };

const activationMessages = {
  sent: "Check your email for an activation link. It expires in 24 hours.",
  "delivery-failed": "Your account was created, but the activation email could not be sent. Enter your details below and request a new link in a minute.",
  confirmed: "Your account is active. You can now sign in.",
  invalid: "This activation link is invalid, expired, or already used. Sign in if your account is active, or enter your details and request a new link.",
} as const;

export default async function LoginPage({
  searchParams,
}: PageProps<"/login">) {
  const user = await getCurrentUser();
  if (user) {
    redirect(roleHome(user.role));
  }

  const params = await searchParams;
  const next = typeof params.next === "string" ? params.next : undefined;
  const justReset = params.reset === "1";
  const activation =
    typeof params.activation === "string" && Object.hasOwn(activationMessages, params.activation)
      ? (params.activation as keyof typeof activationMessages)
      : undefined;

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        Sign in
      </h1>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
        Access your recruitment dashboard.
      </p>

      <Card className="mt-6">
        {activation && (
          <div className="mb-4">
            <Alert tone={activation === "confirmed" ? "success" : "info"}>
              {activationMessages[activation]}
            </Alert>
          </div>
        )}
        {justReset && (
          <div className="mb-4">
            <Alert tone="success">
              Your password has been reset. You can now sign in.
            </Alert>
          </div>
        )}
        <LoginForm next={next} />
      </Card>

      <p className="mt-6 text-center text-sm text-zinc-600 dark:text-zinc-300">
        Don&apos;t have an account?{" "}
        <Link
          href="/register"
          className="font-medium text-zinc-900 underline dark:text-zinc-100"
        >
          Create a candidate account
        </Link>
      </p>
    </div>
  );
}
