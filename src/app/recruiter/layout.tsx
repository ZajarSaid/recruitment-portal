import { StaffWorkspace } from "@/components/staff-workspace";
import { getCurrentUser } from "@/lib/dal";
import { adminSections, vacancySections } from "@/lib/staff-navigation";

export default async function RecruiterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = (await getCurrentUser())?.role === "ADMIN";
  return (
    <StaffWorkspace
      title={admin ? "Administrator workspace" : "Recruiter workspace"}
      sections={admin ? adminSections : vacancySections}
    >
      {children}
    </StaffWorkspace>
  );
}
