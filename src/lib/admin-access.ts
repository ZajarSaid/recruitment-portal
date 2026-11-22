export const ADMIN_SIGN_IN_PATH = "/admin";

export function isAdminHost(host: string | null): boolean {
  const normalizedHost = host?.toLowerCase();
  return normalizedHost === "localhost:3000" ||
    (process.env.NODE_ENV === "development" && normalizedHost === "localhost:3001");
}
