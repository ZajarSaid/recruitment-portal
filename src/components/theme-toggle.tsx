"use client";

import { useLayoutEffect } from "react";

/**
 * Switches between the light and dark palettes by toggling the `data-theme`
 * attribute on <html> and persisting the choice to localStorage. The initial
 * theme is applied before paint by the inline script in the root layout.
 */
export function ThemeToggle() {
  // The inline script sets the attribute during HTML parsing. React's Strict
  // Mode remount in development resets <html> to only the JSX-managed
  // attributes, so re-apply the stored value here (a no-op in production).
  useLayoutEffect(() => {
    try {
      const theme = localStorage.getItem("theme");
      if (theme === "dark" || theme === "light") {
        document.documentElement.setAttribute("data-theme", theme);
      }
    } catch {
      // Storage can be unavailable (private mode); ignore.
    }
  }, []);

  function toggleTheme() {
    const root = document.documentElement;
    const next =
      root.getAttribute("data-theme") === "dark" ? "light" : "dark";
    root.setAttribute("data-theme", next);
    try {
      localStorage.setItem("theme", next);
    } catch {
      // Storage can be unavailable (private mode); the attribute still applies.
    }
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label="Toggle colour theme"
      title="Toggle colour theme"
      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-300 text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-indigo-600 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900 dark:hover:text-indigo-400"
    >
      <svg
        className="h-4 w-4 dark:hidden"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
      </svg>
      <svg
        className="hidden h-4 w-4 dark:block"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
      </svg>
    </button>
  );
}
