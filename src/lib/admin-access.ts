export const ADMIN_SIGN_IN_PATH = "/admin";

export function isAdminHost(host: string | null): boolean {
  if (!host) return false;
  const normalizedHost = host.toLowerCase();
  if (process.env.NODE_ENV === "development" &&
    /^(?:localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/.test(normalizedHost)) {
    return true;
  }
  try {
    const { protocol, host: portalHost } = new URL(process.env.APP_URL ?? "http://localhost:3000");
    return (protocol === "http:" || protocol === "https:") && portalHost === normalizedHost;
  } catch {
    return false;
  }
}
