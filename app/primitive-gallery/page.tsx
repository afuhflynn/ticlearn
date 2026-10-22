import type { Metadata } from "next";
import { Suspense } from "react";
import { PrimitiveGallery } from "@/components/primitive-gallery";
import { noIndex } from "@/lib/metadata";

/**
 * Not in the navigation and not in the sitemap, so it must not be indexed.
 * Through the helper, like every other surface the spec 0012 table covers.
 */
export const metadata: Metadata = {
  ...noIndex,
};

export default function PrimitiveGalleryPage() {
  // The gallery reads the search params, and a read of the search params
  // needs a boundary, or the page is rendered on the client only.
  return (
    <Suspense fallback={null}>
      <PrimitiveGallery />
    </Suspense>
  );
}
