import "server-only";

import { isCloudReference, resolveStoredUpload } from "./cloud-storage";

export async function serveStoredDocument(
  document: {
    storageKey: string;
    cloudUrl: string | null;
    mimeType: string;
    originalFileName: string;
  },
  download = false,
) {
  const headers = new Headers({
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
  });

  try {
    const data = await resolveStoredUpload(document.storageKey, document.cloudUrl, document.mimeType);
    const fileName = document.originalFileName.replace(/[^\x20-\x7e]|["\\]/g, "_");
    headers.set("Content-Type", document.mimeType);
    headers.set("Content-Length", String(data.length));
    headers.set("Content-Disposition", `${download ? "attachment" : "inline"}; filename="${fileName}"`);
    return new Response(new Uint8Array(data), { headers });
  } catch {
    return isCloudReference(document.storageKey)
      ? new Response("The document could not be loaded. Please try again.", { status: 502, headers })
      : new Response("Not found", { status: 404, headers });
  }
}
