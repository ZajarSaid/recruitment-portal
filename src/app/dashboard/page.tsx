import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { Alert } from "@/components/ui";
import { requireUser } from "@/lib/dal";
import { roleHome } from "@/lib/navigation";
import ApplicationsSection from "@/components/dashboard/applications-section";

export const metadata: Metadata = {
  title: "My dashboard",
  robots: { index: false, follow: false },
};

export default async function DashboardPage({
  searchParams,
}: PageProps<"/dashboard">) {
  const user = await requireUser();
  if (user.role !== "CANDIDATE") {
    redirect(roleHome(user.role));
  }

  const params = await searchParams;
  const forbidden = params.error === "forbidden";

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        Welcome, {user.name}
      </h1>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
        Manage your profile and track the applications you have submitted.
      </p>

      {forbidden && (
        <div className="mt-4">
          <Alert tone="error">
            You are not authorized to access that area.
          </Alert>
        </div>
      )}

      <ApplicationsSection />
    </main>
  );
}
