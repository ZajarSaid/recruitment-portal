// @vitest-environment jsdom
import type { ComponentProps } from "react";

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { loginAction } from "@/lib/actions/auth";
import { LoginForm } from "@/components/auth/login-form";
import { ToastViewport } from "@/components/action-feedback";

vi.mock("@/lib/actions/auth", () => ({ loginAction: vi.fn() }));
vi.mock("next/navigation", () => {
  const search = new URLSearchParams();
  return { usePathname: () => "/login", useSearchParams: () => search };
});
vi.mock("next/link", () => ({
  default: ({ children, href, ...rest }: ComponentProps<"a">) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

const loginActionMock = vi.mocked(loginAction);

function renderWithFeedback() {
  return render(<><LoginForm /><ToastViewport /></>);
}

beforeEach(() => {
  loginActionMock.mockReset();
});

describe("LoginForm", () => {
  it("renders accessible email and password fields with a submit button", () => {
    render(<LoginForm />);

    expect(screen.getByLabelText("Email")).toBeDefined();
    expect(screen.getByLabelText("Password")).toBeDefined();
    expect(screen.getByRole("button", { name: "Sign in" })).toBeDefined();
    expect(screen.getByRole("link", { name: "Forgot password?" })).toBeDefined();
  });

  it("forwards the next path as a hidden field so the return journey works", () => {
    render(<LoginForm next="/jobs" />);

    const hidden = document.querySelector<HTMLInputElement>(
      'input[name="next"]',
    );
    expect(hidden?.value).toBe("/jobs");
  });

  it("submits the resend intent and shows activation delivery feedback", async () => {
    loginActionMock.mockResolvedValue({ ok: true, message: "Activation email sent." });
    renderWithFeedback();

    const button = screen.getByRole<HTMLButtonElement>("button", { name: "Resend activation email" });
    fireEvent(button.form!, new SubmitEvent("submit", { bubbles: true, cancelable: true, submitter: button }));

    expect((await screen.findByRole("status")).textContent).toContain("Activation email sent.");
    expect(loginActionMock.mock.calls[0][1].get("intent")).toBe("resend-activation");
  });

  it("surfaces a message returned by the server action", async () => {
    loginActionMock.mockResolvedValue({
      message: "Invalid email or password.",
    });

    renderWithFeedback();
    fireEvent.submit(document.querySelector("form")!);

    await waitFor(() => {
      expect(
        screen.getByText("Invalid email or password."),
      ).toBeDefined();
    });
  });

  it("surfaces field-level validation errors", async () => {
    loginActionMock.mockResolvedValue({
      errors: { email: ["Enter a valid email address."] },
    });

    render(<LoginForm />);
    fireEvent.submit(document.querySelector("form")!);

    await waitFor(() => {
      expect(
        screen.getByText("Enter a valid email address."),
      ).toBeDefined();
    });
  });

  it("keeps the email after a rejected sign-in and clears the password", async () => {
    loginActionMock.mockResolvedValue({ message: "Invalid email or password." });
    renderWithFeedback();

    const email = screen.getByLabelText<HTMLInputElement>("Email");
    const password = screen.getByLabelText<HTMLInputElement>("Password");
    fireEvent.change(email, { target: { value: "candidate@example.com" } });
    fireEvent.change(password, { target: { value: "wrong-password" } });
    fireEvent.submit(email.form!);

    await screen.findByRole("alert");
    expect(email.value).toBe("candidate@example.com");
    expect(password.value).toBe("");
  });
});
