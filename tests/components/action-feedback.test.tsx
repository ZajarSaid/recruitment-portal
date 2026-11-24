// @vitest-environment jsdom
import { act, fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";

import {
  confirmAction,
  confirmForm,
  notifyAction,
  ToastViewport,
} from "@/components/action-feedback";
import { FEEDBACK_COOKIE } from "@/lib/feedback-messages";

vi.mock("next/navigation", () => {
  const search = new URLSearchParams();
  return { usePathname: () => "/login", useSearchParams: () => search };
});

it("only runs a confirmation after the user approves it", () => {
  const action = vi.fn();
  render(<ToastViewport />);
  act(() => confirmAction("Remove this photo?", "Remove photo", action));
  expect(action).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  expect(action).not.toHaveBeenCalled();
  act(() => confirmAction("Remove this photo?", "Remove photo", action));
  fireEvent.click(screen.getByRole("button", { name: "Remove photo" }));
  expect(action).toHaveBeenCalledTimes(1);
});

it("submits the original form once after confirmation", () => {
  const action = vi.fn();
  render(
    <>
      <form
        action={action}
        onSubmit={(event) =>
          confirmForm(event, "Submit this application?", "Confirm submission")
        }
      >
        <input type="hidden" name="jobId" value="job-1" />
        <button type="submit">Submit application</button>
      </form>
      <ToastViewport />
    </>,
  );
  fireEvent.click(screen.getByRole("button", { name: "Submit application" }));
  expect(action).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Confirm submission" }));
  expect(action).toHaveBeenCalledTimes(1);
  expect(action.mock.calls[0]?.[0].get("jobId")).toBe("job-1");
});

it("shows redirect and action feedback and lets users dismiss notifications", () => {
  document.cookie = `${FEEDBACK_COOKIE}=signed-in; Path=/`;
  render(<ToastViewport />);
  expect(screen.getByRole("status").textContent).toContain(
    "Signed in successfully.",
  );
  expect(document.cookie).not.toContain(FEEDBACK_COOKIE);

  act(() => notifyAction("Upload failed.", false));
  const error = screen.getByRole("alert");
  expect(error.textContent).toContain("Upload failed.");
  fireEvent.click(error.querySelector("button")!);
  expect(screen.queryByRole("alert")).toBeNull();
});

it("shows the successful logout notification on the sign-in page", () => {
  document.cookie = `${FEEDBACK_COOKIE}=signed-out; Path=/`;
  render(<ToastViewport />);
  expect(screen.getByRole("status").textContent).toContain("Logged out successfully.");
  expect(document.cookie).not.toContain(FEEDBACK_COOKIE);
});

it("dismisses success and error toasts after one second", () => {
  vi.useFakeTimers();
  try {
    render(<ToastViewport />);
    act(() => {
      notifyAction("Saved.", true);
      notifyAction("Upload failed.", false);
    });
    act(() => vi.advanceTimersByTime(999));
    expect(screen.getByRole("status").textContent).toContain("Saved.");
    expect(screen.getByRole("alert").textContent).toContain("Upload failed.");
    act(() => vi.advanceTimersByTime(1));
    expect(screen.queryByRole("status")).toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
  } finally {
    vi.useRealTimers();
  }
});
