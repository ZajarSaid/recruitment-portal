// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import { expect, it, vi } from "vitest";

import { StaffWorkspace } from "@/components/staff-workspace";

const { usePathname } = vi.hoisted(() => ({ usePathname: vi.fn() }));
vi.mock("next/navigation", () => ({ usePathname }));

it("highlights Create vacancy instead of the parent Vacancies section", () => {
  usePathname.mockReturnValue("/recruiter/jobs/new");
  render(
    <StaffWorkspace
      title="Recruiter workspace"
      sections={[
        { href: "/recruiter/jobs", label: "Vacancies" },
        { href: "/recruiter/jobs/new", label: "Create vacancy" },
      ]}
    >
      <h1>Create vacancy</h1>
    </StaffWorkspace>,
  );

  const nav = screen.getByRole("navigation", { name: "Recruiter workspace" });
  expect(
    within(nav)
      .getByRole("link", { name: "Vacancies" })
      .hasAttribute("aria-current"),
  ).toBe(false);
  expect(
    within(nav)
      .getByRole("link", { name: "Create vacancy" })
      .getAttribute("aria-current"),
  ).toBe("page");
  expect(
    within(screen.getByRole("main")).getByRole("heading", {
      name: "Create vacancy",
    }),
  ).toBeDefined();
});
