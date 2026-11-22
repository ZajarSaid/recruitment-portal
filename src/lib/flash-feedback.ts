import "server-only";

import { cookies } from "next/headers";

import { env } from "./env";
import { FEEDBACK_COOKIE, type feedbackMessages } from "./feedback-messages";

export async function flashFeedback(key: keyof typeof feedbackMessages) {
  (await cookies()).set(FEEDBACK_COOKIE, key, {
    path: "/",
    sameSite: "lax",
    secure: env.cookieSecure,
    maxAge: 60,
  });
}
