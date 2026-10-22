import Image from "next/image";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * The neutral shell, shown when the document cannot stream any content yet.
 *
 * The blocks are generic because the shape of the content is not known at
 * this level. It carries the brand mark and nothing else, so a student who
 * lands on a slow connection sees a page that looks like TiCLearn rather than
 * a blank screen.
 */
export function RootFallback() {
  return (
    <div
      data-slot="root-fallback"
      className="flex min-h-screen flex-col bg-background"
    >
      <div className="flex items-center justify-center border-b py-4">
        <Image
          src="/icons/favicon-32x32.png"
          alt="TiCLearn"
          width={32}
          height={32}
          className="h-8 w-8"
        />
        <span className="ml-2 text-xl font-bold">TiCLearn</span>
      </div>
      <div className="mx-auto w-full max-w-6xl flex-1 space-y-6 px-4 py-8">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-40 w-full rounded-xl" />
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}
