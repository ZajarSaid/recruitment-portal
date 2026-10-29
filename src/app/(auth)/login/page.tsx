import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { LoginForm } from "@/components/auth/login-form";
import { Alert, Card } from "@/components/ui";
import { getCurrentUser } from "@/lib/dal";
import { roleHome } from "@/lib/navigation";

export const metadata: Metadata = { title: "Log in" };

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

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        Sign in
      </h1>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
        Access your recruitment dashboard.
      </p>

      <Card className="mt-6">
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
