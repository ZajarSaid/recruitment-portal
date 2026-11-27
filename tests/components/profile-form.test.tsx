// @vitest-environment jsdom
import { act, fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";

import { ProfileForm } from "@/components/profile/profile-form";
import { saveProfileAction } from "@/lib/actions/profile";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("@/lib/actions/profile", () => ({ saveProfileAction: vi.fn() }));
vi.mock("@/components/profile/profile-document-field", () => ({
  ProfileDocumentField: () => null,
}));
vi.mock("@/components/applications/profile-photo-field", () => ({
  ProfilePhotoField: () => null,
}));

const props = {
  initial: null,
  initialDocuments: [],
  maxBytes: 1024,
  redirectToApply: "/jobs/job-1/apply",
  applicationThreshold: 60,
  canApply: false,
  openVacancies: false,
  incompleteNotice: true,
};

it("renders only the current step and saves its fields before navigating", async () => {
  push.mockClear();
  vi.mocked(saveProfileAction).mockResolvedValue({ ok: true, message: "Profile saved." });
  render(
    <ProfileForm
      {...props}
      initial={{
        educationLevel: "BACHELOR",
        experienceSummary: null,
        birthYear: 1995,
        birthMonth: 6,
        physicalAddress: "Example address",
        nidaNumber: null,
        computerLiteracy: "INTERMEDIATE",
        languages: "Kiswahili",
        category: "GENERAL",
        photoUrl: null,
        photoPublicId: null,
      }}
      stepIndex={3}
      availableStep={4}
      canApply
      openVacancies
    />,
  );

  const languages = screen.getByRole<HTMLInputElement>("textbox", { name: "Languages you speak" });
  expect(languages.value).toBe("Kiswahili");
  expect(screen.queryByText("Step 4 of 5")).toBeNull();
  expect(screen.queryByLabelText("Highest education level")).toBeNull();
  expect(screen.getByRole("link", { name: "Back" }).getAttribute("href"))
    .toBe("/profile/edit/computer-literacy?next=%2Fjobs%2Fjob-1%2Fapply&incomplete=1");
  expect(screen.getByRole("link", { name: "Experience" }).getAttribute("href"))
    .toBe("/profile/edit/experience?next=%2Fjobs%2Fjob-1%2Fapply&incomplete=1");
  expect(screen.getByRole("link", { name: "Continue to your application" }).getAttribute("href"))
    .toBe("/jobs/job-1/apply");

  fireEvent.change(languages, { target: { value: "Kiswahili (fluent), English" } });
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Save and continue" }));
  });

  const submitted = vi.mocked(saveProfileAction).mock.lastCall?.[1];
  expect(submitted?.get("step")).toBe("languages");
  expect(submitted?.get("languages")).toBe("Kiswahili (fluent), English");
  expect(submitted?.has("educationLevel")).toBe(false);
  expect(push).toHaveBeenCalledWith("/profile/edit/experience?next=%2Fjobs%2Fjob-1%2Fapply&incomplete=1");
});

it("hides the application-ready alert for an eligible candidate when no vacancies are open", () => {
  render(<ProfileForm {...props} stepIndex={0} availableStep={0} canApply redirectToApply={null} />);

  expect(screen.queryByText("Your profile meets the application requirement.")).toBeNull();
  expect(screen.queryByRole("link", { name: "Browse vacancies" })).toBeNull();
  expect(screen.queryByText(/Bring your profile completion/)).toBeNull();
});

it("keeps future sections locked and stays on the current page after a failed save", async () => {
  push.mockClear();
  vi.mocked(saveProfileAction)
    .mockResolvedValueOnce({ errors: { physicalAddress: ["Enter a valid address."] } })
    .mockResolvedValueOnce({ ok: true, message: "Profile saved." });
  render(<ProfileForm {...props} stepIndex={0} availableStep={0} />);

  expect(screen.getByText("Step 1 of 5")).toBeDefined();
  expect(screen.queryByRole("link", { name: "Academic information & documents" })).toBeNull();
  expect(screen.getByText("Academic information & documents").getAttribute("aria-disabled")).toBe("true");
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Save and continue" }));
  });
  expect(await screen.findByText("Enter a valid address.")).toBeDefined();
  expect(push).not.toHaveBeenCalled();

  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Save and continue" }));
  });
  expect(push).toHaveBeenCalledWith("/profile/edit/education?next=%2Fjobs%2Fjob-1%2Fapply&incomplete=1");
});
