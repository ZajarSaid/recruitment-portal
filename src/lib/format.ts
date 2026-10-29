/**
 * Every published vacancy advertises a negotiable salary rather than a fixed
 * figure or range, so this label is used wherever the salary would be shown.
 */
export const SALARY_LABEL = "Negotiable";

export function formatDate(value: Date | string): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(value: Date | string): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Formats a date as `yyyy-mm-dd` for use in `<input type="date">`. */
export function toDateInputValue(value: Date | string): string {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const statusLabels: Record<string, string> = {
  DRAFT: "Draft",
  PUBLISHED: "Published",
  CLOSED: "Closed",
  SUBMITTED: "Submitted",
  UNDER_REVIEW: "Under review",
  SHORTLISTED: "Shortlisted",
  REJECTED: "Rejected",
};

export function humanizeStatus(status: string): string {
  return statusLabels[status] ?? status;
}
