import { serveStoredDocument } from "@/lib/document-response";
import { getCurrentUser } from "@/lib/dal";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(
  request: Request,
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

  return serveStoredDocument(document, new URL(request.url).searchParams.get("download") === "1");
}
