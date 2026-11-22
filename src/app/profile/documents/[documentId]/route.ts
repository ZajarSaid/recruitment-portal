import { resolveStoredUpload } from "@/lib/cloud-storage";
import { getCurrentUser } from "@/lib/dal";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ documentId: string }> },
) {
  const user = await getCurrentUser();
  if (!user || user.role !== "CANDIDATE") {
    return new Response("Not found", { status: 404 });
  }

  const { documentId } = await params;
  const document = await prisma.candidateDocument.findFirst({
    where: { id: documentId, profile: { userId: user.id } },
    select: {
      storageKey: true,
      cloudUrl: true,
      mimeType: true,
      originalFileName: true,
    },
  });
  if (!document) return new Response("Not found", { status: 404 });

  const headers = new Headers({ "Cache-Control": "private, no-store" });
  try {
    const file = await resolveStoredUpload(document.storageKey, document.cloudUrl);
    if (file.kind === "redirect") {
      headers.set("Location", file.url);
      return new Response(null, { status: 302, headers });
    }

    const fileName = document.originalFileName
      .replace(/[^\x20-\x7e]/g, "_")
      .replace(/["\\]/g, "_");
    headers.set("Content-Type", document.mimeType);
    headers.set("Content-Disposition", `inline; filename="${fileName}"`);
    headers.set("X-Content-Type-Options", "nosniff");
    return new Response(new Uint8Array(file.buffer), { headers });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
