import type { NextRequest } from "next/server";

import { uploadBuffer } from "@/lib/cloudinary";
import { getCurrentUser } from "@/lib/dal";
import { validateUpload } from "@/lib/uploads";

/**
 * Uploads a file to Cloudinary instead of the local `storage/` directory.
 * Responds with `{ url, publicId }` on success, or `{ error }` with a
 * non-2xx status on failure.
 */

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return Response.json({ error: "No file was provided." }, { status: 400 });
  }

  const validation = await validateUpload(file);
  if (!validation.ok) {
    return Response.json({ error: validation.message }, { status: 400 });
  }

  try {
    const result = await uploadBuffer(validation.buffer, { folder: "uploads" });
    return Response.json({
      url: result.secure_url,
      publicId: result.public_id,
    });
  } catch {
    return Response.json(
      { error: "Cloudinary upload failed." },
      { status: 502 },
    );
  }
}
