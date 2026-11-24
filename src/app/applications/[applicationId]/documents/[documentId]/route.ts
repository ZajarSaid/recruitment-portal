import type { NextRequest } from "next/server";

import {
  getAccessibleApplicationDocument,
  getAccessibleApplicationProfileDocument,
} from "@/lib/application-documents";
import { serveStoredDocument } from "@/lib/document-response";
import { getCurrentUser } from "@/lib/dal";

/**
 * Serves a private application document to its owner (the candidate) or to a
 * recruiter/administrator who manages the vacancy. Both storage backends
 * serve document bytes through this route after the same authorization check.
 */

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  ctx: RouteContext<"/applications/[applicationId]/documents/[documentId]">,
) {
  const user = await getCurrentUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { applicationId, documentId } = await ctx.params;
  const document = request.nextUrl.searchParams.get("source") === "profile"
    ? await getAccessibleApplicationProfileDocument(documentId, applicationId, user)
    : await getAccessibleApplicationDocument(documentId, applicationId, user);
  if (!document) {
    // Deliberately generic: do not reveal whether the document exists.
    return new Response("Not found", { status: 404 });
  }

  return serveStoredDocument(document, request.nextUrl.searchParams.get("download") === "1");
}
