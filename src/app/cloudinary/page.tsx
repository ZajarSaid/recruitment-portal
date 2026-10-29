import type { Metadata } from "next";

import { CldDemo } from "@/components/cloudinary/cld-demo";
import { UploadForm } from "@/components/cloudinary/upload-form";

export const metadata: Metadata = {
  title: "Cloudinary test",
};

/**
 * Manual test page for the Cloudinary integration: uploads a file through
 * `/api/upload` (streamed to Cloudinary) and renders a delivery-side sample
 * image via `next-cloudinary`.
 */
export default function CloudinaryPage() {
  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-10 px-4 py-12">
      <section className="space-y-2">
        <h1 className="text-2xl font-semibold">Cloudinary test</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Upload a file (requires a signed-in account). It is validated and
          streamed to Cloudinary; the returned link points at the CDN.
        </p>
        <UploadForm />
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold">Delivery (CldImage)</h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Sample asset from the media library, rendered through
          <code className="mx-1">next-cloudinary</code>.
        </p>
        <CldDemo />
      </section>
    </main>
  );
}
