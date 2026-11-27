"use client";

import { useEffect } from "react";

const CHECK_INTERVAL_MS = 5000;

export function SessionMonitor({ signInPath }: { signInPath: string }) {
  useEffect(() => {
    const controller = new AbortController();
    let checking = false;

    async function checkSession() {
      if (checking || document.visibilityState !== "visible") return;
      checking = true;
      try {
        const response = await fetch("/api/session", {
          cache: "no-store",
          signal: controller.signal,
        });
        if (response.status === 401 && !controller.signal.aborted) {
          window.location.replace(signInPath);
        }
      } catch {
        // Network interruptions are retried by the next check.
      } finally {
        checking = false;
      }
    }

    const interval = window.setInterval(checkSession, CHECK_INTERVAL_MS);
    document.addEventListener("visibilitychange", checkSession);
    window.addEventListener("focus", checkSession);
    window.addEventListener("pageshow", checkSession);
    return () => {
      controller.abort();
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", checkSession);
      window.removeEventListener("focus", checkSession);
      window.removeEventListener("pageshow", checkSession);
    };
  }, [signInPath]);

  return null;
}
