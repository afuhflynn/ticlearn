import type { Metadata } from "next";
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
  return <PrimitiveGallery />;
}
