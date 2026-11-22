import { requireRole } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { isLocalProfilePhoto } from "@/lib/profile";
import { detectMimeType, readStoredFile } from "@/lib/uploads";

export async function GET() {
  const user = await requireRole("CANDIDATE");
  const profile = await prisma.candidateProfile.findUnique({
    where: { userId: user.id },
    select: { photoPublicId: true },
  });
  const reference = profile?.photoPublicId;
  if (reference && isLocalProfilePhoto(reference, user.id)) {
    const photo = await readStoredFile(reference).catch(() => null);
    const type = photo && detectMimeType(photo);
    if (photo && (type === "image/jpeg" || type === "image/png")) {
      return new Response(new Uint8Array(photo), {
        headers: {
          "Content-Type": type,
          "Cache-Control": "private, no-store",
          "X-Content-Type-Options": "nosniff",
        },
      });
    }
  }
  return new Response(null, { status: 404 });
}
