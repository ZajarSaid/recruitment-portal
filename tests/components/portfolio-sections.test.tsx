// @vitest-environment jsdom
import { fireEvent, render, screen, within } from "@testing-library/react";
import { expect, it } from "vitest";

import { PortfolioSections } from "@/components/profile/portfolio-sections";

it("switches the visible section while keeping profile completion in view", () => {
  render(
    <PortfolioSections
      sections={[
        { id: "personal", label: "Personal information", content: <h2>Contact details</h2> },
        { id: "education", label: "Education", content: <h2>Qualifications</h2> },
      ]}
      completion={<progress aria-label="Profile completion" value={50} max={100} />}
    />,
  );

  const mobileToggle = screen.getByRole("button", { name: "Show profile menu" });
  expect(mobileToggle.getAttribute("aria-expanded")).toBe("false");
  fireEvent.click(mobileToggle);
  expect(mobileToggle.getAttribute("aria-expanded")).toBe("true");

  const nav = within(screen.getByRole("navigation", { name: "Profile sections" }));
  const personal = nav.getByRole("button", { name: "Personal information" });
  const education = nav.getByRole("button", { name: "Education" });
  expect(personal.getAttribute("aria-current")).toBe("true");
  expect(screen.getByRole("heading", { name: "Contact details" })).toBeDefined();
  expect(screen.queryByRole("heading", { name: "Qualifications" })).toBeNull();

  fireEvent.click(education);
  expect(mobileToggle.getAttribute("aria-expanded")).toBe("false");
  expect(education.getAttribute("aria-current")).toBe("true");
  expect(screen.queryByRole("heading", { name: "Contact details" })).toBeNull();
  expect(screen.getByRole("heading", { name: "Qualifications" })).toBeDefined();
  expect(within(screen.getByRole("complementary", { name: "Profile progress" })).getByRole("progressbar")).toBeDefined();

  const desktopToggle = screen.getByRole("button", { name: "Hide profile sidebar" });
  fireEvent.click(desktopToggle);
  expect(desktopToggle.getAttribute("aria-expanded")).toBe("false");
  fireEvent.click(desktopToggle);
  expect(desktopToggle.getAttribute("aria-expanded")).toBe("true");
});
