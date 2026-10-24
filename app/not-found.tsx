import { Compass, FilePlus2 } from "lucide-react";
import Link from "next/link";
import { FaWhatsapp } from "react-icons/fa6";
import { Button } from "@/components/ui/button";
import { WHATSAPP_GROUP_LABEL, WHATSAPP_GROUP_URL } from "@/constants/contact";

/**
 * The not found page, from spec 0014 AC-10. It says what may have happened, gives
 * a way back into the app, and gives a way to reach a human. It carries no phone
 * number, and the WhatsApp link comes from the one constants file.
 */
export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-5 py-16">
      <div className="w-full max-w-md space-y-8 text-center">
        <div className="flex justify-center">
          <Compass
            className="size-14 text-muted-foreground/40"
            strokeWidth={1}
            aria-hidden="true"
          />
        </div>

        <div className="space-y-3">
          <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
            That page is not here.
          </h1>
          <p className="text-base text-muted-foreground">
            The link may be old, or the page may have moved.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button asChild className="min-h-12">
            <Link href="/">Go home</Link>
          </Button>
          <Button variant="outline" asChild className="min-h-12">
            <Link href="/sign-up">
              <FilePlus2 className="mr-2 h-4 w-4" aria-hidden="true" />
              Start with one note
            </Link>
          </Button>
        </div>

        <a
          href={WHATSAPP_GROUP_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-12 items-center gap-2 text-primary underline-offset-4 hover:underline"
        >
          <FaWhatsapp className="h-5 w-5" aria-hidden="true" />
          {WHATSAPP_GROUP_LABEL}
        </a>
      </div>
    </main>
  );
}
