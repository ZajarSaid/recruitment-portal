// @vitest-environment jsdom
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";

import { HeroCarousel } from "@/components/hero-carousel";

function renderCarousel(reducedMotion = false) {
  vi.useFakeTimers();
  vi.stubGlobal("matchMedia", () => ({
    matches: reducedMotion,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
  render(<HeroCarousel />);
}

function advanceSlideTimer() {
  act(() => { vi.advanceTimersByTime(4000); });
}

function activePhoto() {
  return screen.getByRole("button", { pressed: true, name: /^Show photo/ });
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

it("cycles through the photos and supports pausing and manual selection", () => {
  renderCarousel();

  expect(activePhoto().getAttribute("aria-label")).toMatch(/^Show photo 1/);
  advanceSlideTimer();
  expect(activePhoto().getAttribute("aria-label")).toMatch(/^Show photo 2/);

  fireEvent.click(screen.getByRole("button", { name: "Pause slideshow" }));
  fireEvent.click(screen.getByRole("button", { name: /^Show photo 3/ }));
  advanceSlideTimer();
  expect(activePhoto().getAttribute("aria-label")).toMatch(/^Show photo 3/);

  fireEvent.click(screen.getByRole("button", { name: "Play slideshow" }));
  advanceSlideTimer();
  expect(activePhoto().getAttribute("aria-label")).toMatch(/^Show photo 1/);
});

it("starts paused when reduced motion is enabled", () => {
  renderCarousel(true);

  advanceSlideTimer();
  expect(activePhoto().getAttribute("aria-label")).toMatch(/^Show photo 1/);
  expect(screen.getByRole("button", { name: "Play slideshow" })).toBeDefined();
});
