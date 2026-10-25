import { type HandleUploadBody, handleUpload } from "@vercel/blob/client";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { limit } from "@/lib/rate-limit";

export const runtime = "nodejs";

const MB = 1024 * 1024;

const PDF = "application/pdf";
const DOCX =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const TEXT_TYPES = [
  "text/plain",
  "text/markdown",
  "text/csv",
  "application/json",
];

type DeclaredFile = { mediaType: string; size: number };

/** The ceilings from the spec, applied to the declared type before a token exists. */
function constraintsFor(declared: DeclaredFile): {
  allowedContentTypes: string[];
  maximumSizeInBytes: number;
} | null {
  if (declared.mediaType.startsWith("image/")) {
    return { allowedContentTypes: ["image/*"], maximumSizeInBytes: 8 * MB };
  }
  if (declared.mediaType === PDF) {
    return { allowedContentTypes: [PDF], maximumSizeInBytes: 16 * MB };
  }
  if (declared.mediaType === DOCX) {
    return { allowedContentTypes: [DOCX], maximumSizeInBytes: 16 * MB };
  }
  if (TEXT_TYPES.includes(declared.mediaType)) {
    return { allowedContentTypes: TEXT_TYPES, maximumSizeInBytes: 4 * MB };
  }
  return null;
}

function parseDeclared(clientPayload: string | null): DeclaredFile | null {
  if (!clientPayload) return null;
  try {
    const parsed = JSON.parse(clientPayload) as Partial<DeclaredFile>;
    if (
      typeof parsed.mediaType !== "string" ||
      typeof parsed.size !== "number" ||
      !Number.isFinite(parsed.size) ||
      parsed.size <= 0
    ) {
      return null;
    }
    return { mediaType: parsed.mediaType, size: parsed.size };
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rateLimitResponse = await limit("upload", request);
  if (rateLimitResponse) return rateLimitResponse;

  const body = (await request.json()) as HandleUploadBody;
  const prefix = `chat/${session.user.id}/`;

  try {
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        if (!pathname.startsWith(prefix)) {
          throw new Error("Upload path is outside this student's folder.");
        }

        const declared = parseDeclared(clientPayload);
        if (!declared) {
          throw new Error("The upload must declare its type and size.");
        }

        const constraints = constraintsFor(declared);
        if (!constraints) {
          throw new Error("That file type cannot be attached to a chat.");
        }
        if (declared.size > constraints.maximumSizeInBytes) {
          throw new Error("That file is larger than the limit for its type.");
        }

        return {
          allowedContentTypes: constraints.allowedContentTypes,
          maximumSizeInBytes: constraints.maximumSizeInBytes,
          addRandomSuffix: true,
          // The browser starts the upload immediately, so a minute is plenty.
          validUntil: Date.now() + 60_000,
          tokenPayload: JSON.stringify({ userId: session.user.id }),
        };
      },
      onUploadCompleted: async () => {
        // The composer already holds the URL, so nothing waits on this callback.
      },
    });

    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "That upload was rejected.";
    console.error("[CHAT] Upload token rejected:", message);
    return NextResponse.json({ error: message }, { status: 415 });
  }
}
