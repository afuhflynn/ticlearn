import Image from "next/image";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * The shape of an auth form, drawn while the form is still arriving.
 *
 * The shape of an auth form is known, so a skeleton is honest here. It
 * mirrors the card the form lives in, the brand mark above it, the fields and
 * the button, so nothing moves when the real form lands.
 */
export function AuthFormSkeleton() {
  return (
    <div
      className="flex min-h-[80vh] items-center justify-center"
      data-slot="auth-form-skeleton"
    >
      <div className="w-full max-w-md space-y-6 rounded-xl border-2 p-6">
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center gap-2">
            <Image
              src="/icons/favicon-32x32.png"
              alt="TiCLearn Logo"
              width={32}
              height={32}
              className="h-8 w-8"
            />
            <span className="text-xl font-bold">TiCLearn</span>
          </div>
          <Skeleton className="h-7 w-44" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="space-y-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-10 w-full" />
          </div>
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    </div>
  );
}
