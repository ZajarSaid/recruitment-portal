export const vacancySections = [
  { href: "/recruiter/jobs", label: "Vacancies" },
  { href: "/recruiter/jobs/new", label: "Create vacancy" },
];

export const adminSections = [
  { href: "/admin", label: "Overview" },
  ...vacancySections,
  { href: "/admin/users", label: "Users and roles" },
  { href: "/admin/jobs", label: "Recruiter assignments" },
  { href: "/admin/applications", label: "Applications oversight" },
];
