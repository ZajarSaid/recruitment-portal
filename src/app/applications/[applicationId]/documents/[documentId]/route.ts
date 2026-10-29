import type { NextRequest } from "next/server";

import { getAccessibleApplicationDocument } from "@/lib/application-documents";
import { resolveStoredUpload } from "@/lib/cloud-storage";
import { getCurrentUser } from "@/lib/dal";

/**
 * Serves a private application document to its owner (the candidate) or to a
 * recruiter/administrator who manages the vacancy. Documents stored locally are
 * streamed; documents held in cloud storage redirect to their delivery URL
 * after the same authorization check.
 */

export const runtime = "nodejs";

function contentDisposition(fileName: string, download: boolean): string {
  const fallback = fileName.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_");
  return `${download ? "attachment" : "inline"}; filename="${fallback}"`;
}

export async function GET(
  request: NextRequest,
  ctx: RouteContext<"/applications/[applicationId]/documents/[documentId]">,
) {
  const user = await getCurrentUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { applicationId, documentId } = await ctx.params;
  const document = await getAccessibleApplicationDocument(
    documentId,
    applicationId,
    user,
  );
  if (!document) {
    // Deliberately generic: do not reveal whether the document exists.
    return new Response("Not found", { status: 404 });
  }

  let resolved;
  try {
    resolved = await resolveStoredUpload(document.storageKey, document.cloudUrl);
  } catch {
    return new Response("Not found", { status: 404 });
  }

  if (resolved.kind === "redirect") {
    return Response.redirect(resolved.url, 302);
  }

  const data = resolved.buffer;
  const download = request.nextUrl.searchParams.get("download") === "1";

  return new Response(new Uint8Array(data), {
    status: 200,
    headers: {
      "Content-Type": document.mimeType,
      "Content-Length": String(data.length),
      "Content-Disposition": contentDisposition(
        document.originalFileName,
        download,
      ),
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
    },
  });
}
