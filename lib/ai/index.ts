import mammoth from "mammoth";
import {
  GlobalWorkerOptions,
  getDocument,
  VerbosityLevel,
} from "pdfjs-dist/legacy/build/pdf.mjs";
import Tesseract from "tesseract.js";
import { UTApi } from "uploadthing/server";
import { z } from "zod";
import { MAX_CHARACTERS_FOR_QUIZ_NOTE_CONTEXT } from "@/constants";
import {
  generate,
  generateCritical,
  generateTextCritical,
} from "@/lib/ai/orchestrator";
import { normalizeGeneratedQuestions } from "@/lib/ai/validators";
import { getPrompt, promptCallFields } from "@/lib/prompts/loader";

const utapi = new UTApi();

GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/legacy/build/pdf.worker.mjs",
  import.meta.url,
).href;

const generatedQuestionSchema = z.object({
  type: z.enum(["MCQ", "OPEN"]),
  question: z.string().min(1),
  options: z.array(z.string()),
  correctAnswer: z.string().min(1),
  explanation: z.string().min(1),
});

/**
 * Tokens budgeted per question when scaling the model output cap. A question
 * with four options plus an explanation runs ~150-250 tokens; 250 leaves
 * headroom so the JSON never truncates mid-array for large quizzes.
 */
export const QUIZ_TOKENS_PER_QUESTION = 250;

export async function extractTextFromPDF(
  uploadthingKey: string,
  language: string = "eng",
): Promise<string> {
  const candidateUrls = await getFileFetchCandidates(undefined, uploadthingKey);
  if (candidateUrls.length === 0) {
    throw new Error("No fetchable URL available for PDF extraction");
  }

  console.log("[PDF] Candidate URLs:", candidateUrls);

  const maxRetries = 3;
  const baseDelay = 1000;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    for (const pdfUrl of candidateUrls) {
      try {
        console.log(`[PDF] Attempt ${attempt + 1} - fetching:`, pdfUrl);

        const response = await fetch(pdfUrl, {
          method: "GET",
          headers: {
            Accept: "application/pdf",
          },
          signal: AbortSignal.timeout(30000),
        });

        console.log(
          `[PDF] Response status: ${response.status} ${response.statusText}`,
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch PDF: ${response.status}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        console.log(
          "[PDF] Array buffer size:",
          arrayBuffer.byteLength,
          "bytes",
        );

        const pdfData = new Uint8Array(arrayBuffer);

        const loadingTask = getDocument({
          data: pdfData,
          useWorkerFetch: false,
          isEvalSupported: false,
          verbosity: VerbosityLevel.ERRORS,
        });

        try {
          const pdfDocument = await loadingTask.promise;
          const pages: string[] = [];

          for (
            let pageNumber = 1;
            pageNumber <= pdfDocument.numPages;
            pageNumber++
          ) {
            const page = await pdfDocument.getPage(pageNumber);
            const textContent = await page.getTextContent();
            const pageText = textContent.items
              .map((item) => ("str" in item ? item.str : ""))
              .join(" ");

            pages.push(normalizeExtractedText(pageText));
            page.cleanup();
          }

          await pdfDocument.destroy();

          const extractedText = normalizeExtractedText(
            pages.filter((page) => page.length > 0).join("\n\n"),
          );

          if (extractedText.length < 100) {
            console.log("[PDF] Text too short, falling back to OCR");
            return await extractTextFromPDFWithOCR(candidateUrls, language);
          }

          return extractedText;
        } finally {
          await loadingTask.destroy();
        }
      } catch (error) {
        console.warn(
          `[PDF Extraction] Attempt ${attempt + 1} failed for URL ${pdfUrl}:`,
          error,
        );
      }
    }

    if (attempt < maxRetries - 1) {
      await new Promise((resolve) =>
        setTimeout(resolve, baseDelay * 2 ** attempt),
      );
    }
  }

  throw new Error("PDF fetch failed after all retries");
}

async function extractTextFromPDFWithOCR(
  candidateUrls: string[],
  language: string = "eng",
): Promise<string> {
  console.log(
    "[OCR] Starting Tesseract.js OCR for PDF:",
    candidateUrls[0],
    "language:",
    language,
  );

  for (const candidateUrl of candidateUrls) {
    try {
      const response = await fetch(candidateUrl, {
        signal: AbortSignal.timeout(120000),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch PDF: ${response.status}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const blob = new Blob([arrayBuffer], { type: "application/pdf" });

      const { data } = await Tesseract.recognize(blob, language, {
        logger: (m) => {
          if (m.status === "recognizing text") {
            console.log(`[OCR] Progress: ${Math.round(m.progress * 100)}%`);
          }
        },
      });

      const text = data.text.trim();
      console.log("[OCR] Tesseract.js extracted", text.length, "characters");

      return normalizeExtractedText(text);
    } catch (error) {
      console.error(
        `[OCR] Tesseract.js OCR failed for URL ${candidateUrl}:`,
        error,
      );
    }
  }

  throw new Error("OCR failed to extract text from PDF");
}

export async function extractTextFromImage(
  uploadthingKey: string | undefined,
  fileUrl?: string,
  language: string = "eng",
): Promise<string> {
  console.log(
    "[Image OCR] Starting Tesseract.js for image",
    "uploadthingKey:",
    uploadthingKey,
    "language:",
    language,
  );

  const candidateUrls = await getFileFetchCandidates(fileUrl, uploadthingKey);
  if (candidateUrls.length === 0) {
    throw new Error("No fetchable URL available for image extraction");
  }

  console.log("[Image OCR] Candidate URLs:", candidateUrls);

  const maxRetries = 3;
  const baseDelay = 1000;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    for (const imageUrl of candidateUrls) {
      try {
        console.log("[Image OCR] Fetching image as Blob...", imageUrl);

        const response = await fetch(imageUrl, {
          signal: AbortSignal.timeout(30000),
        });

        console.log("[Image OCR] Fetch response status:", response.status);
        if (!response.ok) {
          throw new Error(`Failed to fetch image: ${response.status}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        console.log(
          "[Image OCR] Array buffer size:",
          arrayBuffer.byteLength,
          "bytes",
        );

        if (arrayBuffer.byteLength === 0) {
          throw new Error("Image is empty (0 bytes)");
        }

        const contentType = response.headers.get("content-type") || "image/png";
        console.log("[Image OCR] Detected content-type:", contentType);

        const buffer = Buffer.from(arrayBuffer);
        console.log("[Image OCR] Buffer created,", buffer.length, "bytes");

        console.log("[Image OCR] Starting recognition...");

        const { data } = await Tesseract.recognize(buffer, language, {
          logger: (m) => {
            if (m.status === "recognizing text") {
              console.log(
                `[Image OCR] Progress: ${Math.round(m.progress * 100)}%`,
              );
            }
          },
        });

        const text = data.text.trim();
        console.log("[Image OCR] Extracted", text.length, "characters");
        console.log("[Image OCR] First 200 chars:", text.substring(0, 200));

        if (text.length < 20) {
          throw new Error(
            "Image contains insufficient text for meaningful extraction",
          );
        }

        return normalizeExtractedText(text);
      } catch (error) {
        console.warn(`[Image OCR] Failed for URL ${imageUrl}:`, error);
      }
    }

    const isLastAttempt = attempt === maxRetries - 1;
    if (isLastAttempt) {
      throw new Error("Failed to extract text from image after all retries");
    }

    const delay = baseDelay * 2 ** attempt;
    console.warn(
      `[Image OCR] Attempt ${attempt + 1} failed, retrying in ${delay}ms`,
    );
    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  throw new Error("Image OCR failed after all retries");
}

export async function extractTextFromWord(
  uploadthingKey: string | undefined,
  fileUrl?: string,
): Promise<string> {
  console.log(
    "[Word] Starting text extraction from Word document, key:",
    uploadthingKey,
  );

  let arrayBuffer: ArrayBuffer | null = null;
  const candidateUrls = await getFileFetchCandidates(fileUrl, uploadthingKey);
  if (candidateUrls.length === 0) {
    throw new Error("No fetchable URL available for Word document extraction");
  }
  console.log("[Word] Candidate URLs:", candidateUrls);

  const maxRetries = 3;
  const baseDelay = 1000;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    for (const docxUrl of candidateUrls) {
      try {
        console.log(
          "[Word] Step 2: Fetching document...",
          `Attempt ${attempt + 1}`,
          docxUrl,
        );
        const response = await fetch(docxUrl, {
          signal: AbortSignal.timeout(60000),
        });

        console.log("[Word] Fetch response status:", response.status);
        if (!response.ok) {
          throw new Error(`Failed to fetch Word document: ${response.status}`);
        }

        console.log("[Word] Step 3: Converting to array buffer...");
        arrayBuffer = await response.arrayBuffer();
        console.log(
          "[Word] Array buffer size:",
          arrayBuffer.byteLength,
          "bytes",
        );

        if (arrayBuffer.byteLength === 0) {
          throw new Error("Word document is empty (0 bytes)");
        }

        break;
      } catch (error) {
        console.warn(`[Word] Failed for URL ${docxUrl}:`, error);
      }
    }

    if (arrayBuffer) {
      break;
    }

    const isLastAttempt = attempt === maxRetries - 1;
    if (isLastAttempt) {
      throw new Error("Word document fetch failed after all retries");
    }

    const delay = baseDelay * 2 ** attempt;
    console.warn(
      `[Word] Fetch attempt ${attempt + 1} failed, retrying in ${delay}ms`,
    );
    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  if (!arrayBuffer) {
    throw new Error("Word document fetch failed after all retries");
  }

  try {
    console.log("[Word] Step 4: Extracting text with mammoth...");
    const buffer = Buffer.from(arrayBuffer);
    const result = await mammoth.extractRawText({
      buffer,
    });

    console.log("[Word] Step 5: Processing result...");
    const text = result.value.trim();
    console.log("[Word] Extracted", text.length, "characters");
    console.log("[Word] First 200 chars:", text.substring(0, 200));

    if (text.length < 50) {
      console.log(
        "[Word] Warning: Text too short, but continuing...",
        text.length,
      );
      if (text.length < 10) {
        throw new Error("Word document contains insufficient text");
      }
    }

    return normalizeExtractedText(text);
  } catch (error) {
    console.error("[Word] Extraction failed at step:", error);
    console.error("[Word] Full error:", JSON.stringify(error, null, 2));
    throw new Error(
      `Failed to extract text from Word document: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

async function getFileFetchCandidates(
  fileUrl?: string,
  uploadthingKey?: string,
): Promise<string[]> {
  const candidates = new Set<string>();

  if (fileUrl) {
    candidates.add(fileUrl);
  }

  if (uploadthingKey) {
    const fileKey =
      (uploadthingKey.includes("ufs.sh/f/")
        ? uploadthingKey.split("ufs.sh/f/").pop()?.split("?")[0]
        : uploadthingKey.includes("utfs.io/f/")
          ? uploadthingKey.split("utfs.io/f/").pop()?.split("?")[0]
          : uploadthingKey) ?? uploadthingKey;

    try {
      const { ufsUrl } = await utapi.generateSignedURL(fileKey);
      if (ufsUrl) {
        candidates.add(ufsUrl);
      }
    } catch (error) {
      console.warn(
        `[UploadThing] Failed to generate signed URL for key ${fileKey}:`,
        error,
      );
    }

    candidates.add(`https://utfs.io/f/${fileKey}`);
  }

  return [...candidates];
}

export async function summarizeText(
  content: string,
  userId?: string | null,
): Promise<{ summary: string; topics: string[]; keyPoints: string[] }> {
  const schema = z.object({
    summary: z.string().min(1),
    topics: z.array(z.string().min(1)).min(3).max(5),
    keyPoints: z.array(z.string().min(1)).min(3).max(6),
  });

  const excerpt = content.slice(0, MAX_CHARACTERS_FOR_QUIZ_NOTE_CONTEXT);

  const { text: prompt, settings } = await getPrompt("quiz", "study_brief", {
    excerpt,
  });

  const { object } = await generate({
    task: "summarize",
    schema,
    prompt,
    ...promptCallFields(settings),
    userId,
  });

  return {
    summary: object.summary.trim().slice(0, 500),
    topics: object.topics.map((topic) => topic.trim()).filter(Boolean),
    keyPoints: object.keyPoints.map((point) => point.trim()).filter(Boolean),
  };
}

/**
 * Returns the questions plus whether they came from the shared cache, so the
 * caller can decide whether a credit should be spent. A hit means no model ran,
 * so charging for it would charge a student for work that never happened.
 */
export async function generateQuizFromNote(
  noteContent: string,
  options: {
    questionCount: number;
    questionTypes: "MCQ" | "OPEN" | "MIXED";
  },
  userId?: string | null,
): Promise<{
  questions: ReturnType<typeof normalizeGeneratedQuestions>;
  fromCache: boolean;
}> {
  console.log(
    `[AI] Generating quiz with ${options.questionCount} questions, type: ${options.questionTypes}`,
  );
  console.log(`[AI] Note content length: ${noteContent.length} chars`);

  const questionTypeText =
    options.questionTypes === "MIXED"
      ? "Generate a mix of MCQ and Open-ended questions."
      : options.questionTypes === "MCQ"
        ? "Generate only Multiple Choice Questions (MCQ)."
        : "Generate only Open-ended questions.";

  const { text: prompt, settings } = await getPrompt("quiz", "quiz_from_note", {
    questionCount: options.questionCount,
    questionTypeText,
    noteExcerpt: noteContent.slice(0, MAX_CHARACTERS_FOR_QUIZ_NOTE_CONTEXT),
    truncatedSuffix:
      noteContent.length > MAX_CHARACTERS_FOR_QUIZ_NOTE_CONTEXT
        ? " ... (content truncated)"
        : "",
  });

  const schema = z.object({
    questions: z.array(generatedQuestionSchema),
  });

  // A question with four options plus an explanation runs ~150-250 tokens.
  // The prompt file cap fits ~10 questions; without scaling, a larger request
  // truncates mid-JSON, schema validation fails fast, and the whole quiz dies.
  const fields = promptCallFields(settings);
  const scaledMaxOutputTokens = Math.max(
    fields.modelOptions.maxOutputTokens,
    options.questionCount * QUIZ_TOKENS_PER_QUESTION,
  );

  try {
    const { object, fromCache } = await generateCritical({
      task: "quiz_gen",
      schema,
      prompt,
      ...fields,
      modelOptions: {
        ...fields.modelOptions,
        maxOutputTokens: scaledMaxOutputTokens,
      },
      userId,
    });

    const questions = normalizeGeneratedQuestions(object.questions);
    if (questions.length > 0) {
      console.log(
        `[AI] First question:`,
        JSON.stringify(questions[0], null, 2),
      );
    }

    return { questions, fromCache };
  } catch (error) {
    // Never swallow the cause: the Inngest job reports "AI returned no
    // questions" and retries, and it needs the real reason in the logs.
    console.error("[AI] Quiz generation failed:", error);
    throw new Error(
      `Quiz generation failed: ${error instanceof Error ? error.message : String(error)}`,
      { cause: error },
    );
  }
}

interface NoteContext {
  id: string;
  title: string;
  subject: string;
  extractedText: string | null;
}

export async function gradeOpenAnswer(
  question: string,
  userAnswer: string,
  correctAnswer: string,
  userId?: string | null,
) {
  const { text: prompt, settings } = await getPrompt(
    "grade",
    "grade_open_answer",
    {
      question,
      correctAnswer,
      userAnswer,
    },
  );

  const { text } = await generateTextCritical({
    task: "grading",
    prompt,
    ...promptCallFields(settings),
    userId,
  });

  return text;
}

export async function explainMCQAnswer(
  question: string,
  userAnswer: string,
  correctAnswer: string,
  options: string[],
  userId?: string | null,
) {
  const { text: prompt, settings } = await getPrompt(
    "grade",
    "explain_mcq_answer",
    {
      question,
      options: options.join(", "),
      userAnswer,
      correctAnswer,
    },
  );

  const { text } = await generateTextCritical({
    task: "grading",
    prompt,
    ...promptCallFields(settings),
    userId,
  });

  return text;
}

function normalizeExtractedText(text: string) {
  return text
    .replace(/\r\n/g, "\n")
    .replaceAll(String.fromCharCode(0), "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
