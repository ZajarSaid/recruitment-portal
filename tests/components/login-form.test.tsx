// @vitest-environment jsdom
import type { ComponentProps } from "react";

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { loginAction } from "@/lib/actions/auth";
import { LoginForm } from "@/components/auth/login-form";

vi.mock("@/lib/actions/auth", () => ({ loginAction: vi.fn() }));
vi.mock("next/link", () => ({
  default: ({ children, href, ...rest }: ComponentProps<"a">) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

const loginActionMock = vi.mocked(loginAction);

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

  it("surfaces a message returned by the server action", async () => {
    loginActionMock.mockResolvedValue({
      message: "Invalid email or password.",
    });

    render(<LoginForm />);
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
});
