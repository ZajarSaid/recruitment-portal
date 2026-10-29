import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { RegisterForm } from "@/components/auth/register-form";
import { Card } from "@/components/ui";
import { getCurrentUser } from "@/lib/dal";
import { roleHome } from "@/lib/navigation";

export const metadata: Metadata = { title: "Register" };

export default async function RegisterPage() {
  const user = await getCurrentUser();
  if (user) {
    redirect(roleHome(user.role));
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        Create an account
      </h1>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
        Candidate registration. Recruiter and administrator accounts are
        created by an administrator.
      </p>

      <Card className="mt-6">
        <RegisterForm />
      </Card>

    </div>
  );
}
