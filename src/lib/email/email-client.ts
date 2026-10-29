import "server-only";

import * as React from "react";
import { Resend } from "resend";

import { env } from "@/lib/env";

/**
 * Single Resend client for the whole app. Instantiated lazily so a missing
 * `RESEND_API_KEY` never breaks the module import in local development.
 */
const client = env.resendApiKey ? new Resend(env.resendApiKey) : null;

export type SendEmailPayload = {
  /** Recipient address. */
  to: string;
  subject: string;
  /** React Email component rendered by Resend. */
  react: React.ReactNode;
};

export type SendEmailResult = {
  delivered: boolean;
  resendId?: string;
};

/**
 * Sends one transactional email via Resend and deliberately never throws:
 * an email outage must never block or fail an application flow. When no API
 * key is configured the payload is logged instead, so the flow can still be
 * exercised locally.
 */
export async function sendEmail(
  payload: SendEmailPayload,
): Promise<SendEmailResult> {
  if (!client) {
    if (!env.isProduction) {
      console.info(
        `[email] RESEND_API_KEY not configured; skipped subject="${payload.subject}" to=${payload.to}`,
      );
    }
    return { delivered: false };
  }

  try {
    const { data, error } = await client.emails.send({
      from: env.mailFrom,
      to: [payload.to],
      subject: payload.subject,
      react: payload.react,
    });

    if (error) {
      console.error(
        `[email] Resend rejected subject="${payload.subject}" to=${payload.to}: ${error.message}`,
      );
      return { delivered: false };
    }

    return { delivered: true, resendId: data?.id };
  } catch (cause) {
    console.error(
      `[email] failed to dispatch subject="${payload.subject}" to=${payload.to}:`,
      cause,
    );
    return { delivered: false };
  }
}
