import { headers } from "next/headers";
import { notFound } from "next/navigation";

import { isAdminHost } from "@/lib/admin-access";
import { getCurrentUser } from "@/lib/dal";
import { StaffWorkspace } from "@/components/staff-workspace";

const sections = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/users", label: "Users and roles" },
  { href: "/admin/jobs", label: "Jobs oversight" },
  { href: "/admin/applications", label: "Applications oversight" },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!isAdminHost((await headers()).get("host"))) notFound();
  const user = await getCurrentUser();

  if (user?.role !== "ADMIN") {
    return <div className="mx-auto max-w-6xl px-4 py-8">{children}</div>;
  }

  return (
    <StaffWorkspace title="Administrator workspace" sections={sections}>
      {children}
    </StaffWorkspace>
  );
}
