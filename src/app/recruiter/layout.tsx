import { StaffWorkspace } from "@/components/staff-workspace";

const sections = [
  { href: "/recruiter/jobs", label: "Vacancies" },
  { href: "/recruiter/jobs/new", label: "Create vacancy" },
];

export default function RecruiterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <StaffWorkspace title="Recruiter workspace" sections={sections}>
      {children}
    </StaffWorkspace>
  );
}
