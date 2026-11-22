// @vitest-environment jsdom
import { fireEvent, render, screen, within } from "@testing-library/react";
import { expect, it, vi } from "vitest";

import { ProfileForm } from "@/components/profile/profile-form";
import { saveProfileAction } from "@/lib/actions/profile";

vi.mock("@/lib/actions/profile", () => ({ saveProfileAction: vi.fn() }));
vi.mock("@/components/profile/profile-document-field", () => ({
  ProfileDocumentField: () => null,
}));
vi.mock("@/components/applications/profile-photo-field", () => ({
  ProfilePhotoField: () => null,
}));

it("opens on the overview and preserves edits when switching profile sections", async () => {
  vi.mocked(saveProfileAction).mockResolvedValue({
    ok: true,
    message: "Profile saved.",
  });
  render(
    <ProfileForm
      initial={{
        educationLevel: "BACHELOR",
        experienceSummary: null,
        birthYear: 1995,
        birthMonth: 6,
        physicalAddress: "Example address",
        computerLiteracy: "INTERMEDIATE",
        languages: "Kiswahili",
        category: "GENERAL",
        photoUrl: null,
        photoPublicId: null,
      }}
      initialDocuments={[]}
      maxBytes={1024}
      redirectToApply={null}
      incompleteNotice={false}
      overview={<h2>Profile overview</h2>}
      applications={<h2>My applications</h2>}
    />,
  );

  const nav = within(
    screen.getByRole("navigation", { name: "Profile sections" }),
  );
  expect(
    screen.getByRole("heading", { name: "Profile overview" }),
  ).toBeDefined();
  expect(screen.queryByRole("button", { name: "Save profile" })).toBeNull();
  fireEvent.click(nav.getByRole("button", { name: "My applications" }));
  expect(screen.getByRole("heading", { name: "My applications" })).toBeDefined();
  expect(screen.queryByRole("heading", { name: "Profile overview" })).toBeNull();
  expect(screen.queryByRole("button", { name: "Save profile" })).toBeNull();

  fireEvent.click(nav.getByRole("button", { name: "Language proficiency" }));
  const languages = screen.getByRole<HTMLInputElement>("textbox", {
    name: "Languages you speak",
  });
  expect(languages.value).toBe("Kiswahili");
  fireEvent.change(languages, {
    target: { value: "Kiswahili (fluent), English" },
  });

  fireEvent.click(
    nav.getByRole("button", { name: "Academic information & documents" }),
  );
  expect(
    screen.getByRole("heading", { name: "Academic information & documents" }),
  ).toBeDefined();
  expect(
    screen.getByRole("heading", { name: "Supporting documents" }),
  ).toBeDefined();
  expect(
    screen.queryByRole("textbox", { name: "Languages you speak" }),
  ).toBeNull();

  fireEvent.click(nav.getByRole("button", { name: "Language proficiency" }));
  expect(languages.value).toBe("Kiswahili (fluent), English");

  fireEvent.submit(languages.form!);
  await screen.findByRole("status");
  const submitted = vi.mocked(saveProfileAction).mock.calls[0]?.[1];
  expect(submitted?.get("languages")).toBe("Kiswahili (fluent), English");
  expect(submitted?.get("educationLevel")).toBe("BACHELOR");
});
