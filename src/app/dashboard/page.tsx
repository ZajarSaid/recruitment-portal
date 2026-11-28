import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Alert, Badge } from "@/components/ui";
import { requireUser } from "@/lib/dal";
import { getProfileReadiness } from "@/lib/profile";
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
  if (!forbidden) redirect("/profile?section=applications");

  const { percentage, canApply, applicationRequirement } = await getProfileReadiness(user);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-indigo-900 bg-indigo-950 p-5 text-white sm:p-8">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            My applications
          </h1>
          <p className="mt-2 text-sm text-indigo-100">
            Track submitted applications and review their latest updates.
          </p>
        </div>
        <Badge tone={canApply ? "green" : "amber"}>
          {percentage}% profile completion
        </Badge>
      </div>

      {!canApply && (
        <div className="mt-4">
          <Alert tone="info">
            {applicationRequirement}{" "}
            <Link href="/profile" className="font-medium underline">
              Complete your profile
            </Link>
          </Alert>
        </div>
      )}

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
