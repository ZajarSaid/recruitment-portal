import { NextRequest } from "next/server";
import { afterEach, expect, it, vi } from "vitest";

import { isAdminHost } from "@/lib/admin-access";
import { proxy } from "@/proxy";

afterEach(() => vi.unstubAllEnvs());

it("serves the administrator sign-in page on the configured production host", async () => {
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("APP_URL", "https://careers.example.com");

  const request = (path: string, host = "careers.example.com") =>
    new NextRequest(`https://${host}${path}`, { headers: { host } });

  expect((await proxy(request("/admin"))).status).toBe(200);
  const restricted = await proxy(request("/admin/users"));
  expect(restricted.headers.get("location")).toBe("https://careers.example.com/admin");
  expect((await proxy(request("/admin", "other.example.com"))).status).toBe(404);
});

it("supports loopback addresses and alternate ports in development", () => {
  vi.stubEnv("NODE_ENV", "development");
  expect(isAdminHost("localhost:3002")).toBe(true);
  expect(isAdminHost("127.0.0.1:3002")).toBe(true);
  expect(isAdminHost("[::1]:3002")).toBe(true);
  expect(isAdminHost("localhost.example.com:3002")).toBe(false);
});
