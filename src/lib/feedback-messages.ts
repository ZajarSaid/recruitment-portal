export const FEEDBACK_COOKIE = "portal_feedback";

export const feedbackMessages = {
  "signed-in": "Signed in successfully.",
  "signed-out": "Logged out successfully.",
  "activation-sent": "Check your email for an activation link.",
  "activation-confirmed": "Your account is active. You can now sign in.",
  "password-reset": "Your password has been reset.",
  "application-submitted": "Application submitted.",
  "vacancy-created": "Vacancy created.",
  "vacancy-updated": "Vacancy updated.",
} as const;

export const feedbackErrors = {
  "activation-delivery-failed": "Email delivery failed. Request a new activation link in a minute.",
  "activation-invalid": "Activation link invalid or expired. Request a new link if needed.",
} as const;
