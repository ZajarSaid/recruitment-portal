// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { expect, it, vi } from "vitest";

import { LogoutButton } from "@/components/logout-button";
import { logoutAction } from "@/lib/actions/auth";

vi.mock("@/lib/actions/auth", () => ({ logoutAction: vi.fn() }));

it("only logs out after the user confirms in the dialog", async () => {
  const { container } = render(<LogoutButton className="" />);
  const dialog = container.querySelector("dialog")!;
  // JSDOM does not implement the native dialog controls.
  dialog.showModal = () => { dialog.open = true; };
  dialog.close = () => { dialog.open = false; };
  const trigger = screen.getByRole("button", { name: "Sign out" });

  fireEvent.click(trigger);
  const modal = screen.getByRole("dialog", { name: "Are you sure you want to log out?" });
  expect(logoutAction).not.toHaveBeenCalled();
  fireEvent.click(within(modal).getByRole("button", { name: "Cancel" }));
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(logoutAction).not.toHaveBeenCalled();

  fireEvent.click(trigger);
  fireEvent.click(within(modal).getByRole("button", { name: "Log out" }));
  await waitFor(() => expect(logoutAction).toHaveBeenCalledTimes(1));
});
