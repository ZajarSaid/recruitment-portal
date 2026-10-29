"use client";

import { CldImage } from "next-cloudinary";

/**
 * Minimal `next-cloudinary` smoke test: renders a sample asset from the
 * Cloudinary media library to verify delivery is configured correctly.
 */
export function CldDemo() {
  return (
    <CldImage
      src="cld-sample-5"
      width={500}
      height={500}
      alt="Cloudinary sample image"
      crop={{
        type: "auto",
        source: true,
      }}
    />
  );
}
