import { openai } from "@ai-sdk/openai";
import { generateObject, generateText, streamText } from "ai";
import {
  GlobalWorkerOptions,
  getDocument,
  VerbosityLevel,
} from "pdfjs-dist/legacy/build/pdf.mjs";
import mammoth from "mammoth";
import scribe from "scribe.js-ocr";
import { z } from "zod";

GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/legacy/build/pdf.worker.mjs",
  import.meta.url,
).href;

export const aiModel = openai("gpt-5.4");

const generatedQuestionSchema = z.object({
  type: z.enum(["MCQ", "OPEN"]),
  question: z.string().min(1),
  options: z.array(z.string()),
  correctAnswer: z.string().min(1),
  explanation: z.string().min(1),
});

function normalizeGeneratedQuestions(
  questions: z.infer<typeof generatedQuestionSchema>[],
) {
  return questions
    .map((question) => {
      const normalized = {
        ...question,
        question: question.question.trim(),
        correctAnswer: question.correctAnswer.trim(),
        explanation: question.explanation.trim(),
        options: question.options
          .map((option) => option.trim())
          .filter(Boolean),
      };

      if (normalized.type === "MCQ" && normalized.options.length !== 4) {
        return null;
      }

      if (normalized.type === "OPEN") {
        normalized.options = [];
      }

      if (
        !normalized.question ||
        !normalized.correctAnswer ||
        !normalized.explanation
      ) {
        return null;
      }

      return normalized;
    })
    .filter(
      (question): question is z.infer<typeof generatedQuestionSchema> =>
        question !== null,
    );
}

export async function extractTextFromPDF(pdfUrl: string): Promise<string> {
  const maxRetries = 3;
  const baseDelay = 1000;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(pdfUrl, {
        method: "GET",
        headers: {
          Accept: "application/pdf",
          "User-Agent": "TiCLearn/1.0",
        },
        signal: AbortSignal.timeout(30000),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch PDF: ${response.status}`);
      }

      const arrayBuffer = await response.arrayBuffer();
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
          console.log(
            "[PDF] Extracted text too short, falling back to OCR for scanned PDF",
          );
          return await extractTextFromPDFWithOCR(pdfUrl);
        }

        return extractedText;
      } finally {
        await loadingTask.destroy();
      }
    } catch (error) {
      const isLastAttempt = attempt === maxRetries - 1;
      const isRetryable =
        error instanceof TypeError &&
        (error.message.includes("fetch failed") ||
          error.message.includes("Connect Timeout") ||
          error.message.includes("ETIMEDOUT") ||
          error.message.includes("ECONNREFUSED"));

      if (isLastAttempt || !isRetryable) {
        throw error;
      }

      const delay = baseDelay * 2 ** attempt;
      console.warn(
        `PDF fetch attempt ${attempt + 1} failed, retrying in ${delay}ms:`,
        error,
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw new Error("PDF fetch failed after all retries");
}

async function extractTextFromPDFWithOCR(pdfUrl: string): Promise<string> {
  console.log("[OCR] Starting Scribe.js OCR for PDF:", pdfUrl);

  try {
    const response = await fetch(pdfUrl, {
      signal: AbortSignal.timeout(120000),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch PDF for OCR: ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const result = await scribe.extractText([new Uint8Array(arrayBuffer)]);

    const text = result.trim();
    console.log("[OCR] Scribe.js extracted", text.length, "characters");

    return normalizeExtractedText(text);
  } catch (error) {
    console.error("[OCR] Scribe.js OCR failed:", error);
    throw new Error("OCR failed to extract text from PDF");
  }
}

export async function extractTextFromImage(imageUrl: string): Promise<string> {
  console.log("[Image OCR] Starting Scribe.js for image:", imageUrl);

  try {
    const response = await fetch(imageUrl, {
      signal: AbortSignal.timeout(60000),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const result = await scribe.extractText([new Uint8Array(arrayBuffer)]);

    const text = result.trim();
    console.log("[Image OCR] Extracted", text.length, "characters");

    if (text.length < 20) {
      throw new Error(
        "Image contains insufficient text for meaningful extraction",
      );
    }

    return normalizeExtractedText(text);
  } catch (error) {
    console.error("[Image OCR] Extraction failed:", error);
    throw new Error(
      "Failed to extract text from image. Please use a clearer image.",
    );
  }
}

export async function extractTextFromWord(docxUrl: string): Promise<string> {
  console.log("[Word] Starting text extraction from Word document:", docxUrl);

  try {
    const response = await fetch(docxUrl, {
      signal: AbortSignal.timeout(60000),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch Word document: ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const result = await mammoth.extractRawText({
      arrayBuffer,
    });

    const text = result.value.trim();
    console.log("[Word] Extracted", text.length, "characters");

    if (text.length < 50) {
      console.log("[Word] Word text too short, trying OCR fallback");
      return await extractTextFromImage(docxUrl);
    }

    return normalizeExtractedText(text);
  } catch (error) {
    console.error("[Word] Extraction failed, trying OCR fallback:", error);

    try {
      return await extractTextFromImage(docxUrl);
    } catch {
      throw new Error(
        "Failed to extract text from Word document. Please convert to PDF.",
      );
    }
  }
}

export async function summarizeText(
  content: string,
): Promise<{ summary: string; topics: string[]; keyPoints: string[] }> {
  const schema = z.object({
    summary: z.string().min(1),
    topics: z.array(z.string().min(1)).min(3).max(5),
    keyPoints: z.array(z.string().min(1)).min(3).max(6),
  });

  const excerpt = content.slice(0, 24_000);

  const prompt = `Analyze the following study notes and return a concise study brief.

Requirements:
- summary: 2-3 sentences, max 500 characters
- topics: 3-5 short topic labels
- keyPoints: 3-6 concrete learning points written as complete sentences
- stay faithful to the source material
- avoid generic filler like "general overview"

Notes:
${excerpt}`;

  const { object } = await generateObject({
    model: aiModel,
    schema,
    prompt,
  });

  return {
    summary: object.summary.trim().slice(0, 500),
    topics: object.topics.map((topic) => topic.trim()).filter(Boolean),
    keyPoints: object.keyPoints.map((point) => point.trim()).filter(Boolean),
  };
}

export async function generateQuizFromNote(
  noteContent: string,
  options: {
    questionCount: number;
    questionTypes: "MCQ" | "OPEN" | "MIXED";
  },
) {
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

  const prompt = `You are an educational quiz generator. Generate ${options.questionCount} quiz questions based on the following study notes.

  ${questionTypeText}

  Return JSON only.

  For every question you MUST include all of these fields:
  - type
  - question
  - options
  - correctAnswer
  - explanation

  Rules:
  - MCQ: Provide exactly 4 options in the options array
  - OPEN: Provide an empty options array []
  - correctAnswer must always be a string
  - explanation must always be a non-empty string
  - Stay faithful to the note content

  Study Notes:
  ${noteContent.slice(0, 8000)} ${noteContent.length > 8000 ? "... (content truncated)" : ""}`;

  const schema = z.object({
    questions: z.array(generatedQuestionSchema),
  });

  try {
    console.log("[AI] Calling OpenAI with model: gpt-5.4");
    const { object } = await generateObject({
      model: aiModel,
      schema,
      prompt,
    });

    const questions = normalizeGeneratedQuestions(object.questions);

    console.log(`[AI] OpenAI returned ${questions.length} questions`);
    if (questions.length > 0) {
      console.log(
        `[AI] First question:`,
        JSON.stringify(questions[0], null, 2),
      );
    }

    return questions;
  } catch (error) {
    console.error("[AI] Quiz generation failed:", error);
    return [];
  }
}

export const DEFAULT_QUIZ_TOPICS = [
  "Cell Biology and Genetics",
  "Chemistry of Life - Biomolecules",
  "Motion and Energy in Physics",
  "Waves and Optics",
  "Ecosystems and Ecology",
  "Human Physiology",
  "Mathematical Techniques",
  "Statistics and Probability",
];

const DEFAULT_QUIZ_TOPIC_PROMPTS: Record<string, string> = {
  "Cell Biology and Genetics":
    "Topics covering cell structure, cell division (mitosis/meiosis), genetics, DNA, RNA, protein synthesis, inheritance patterns, and molecular biology for GCE A-Level.",
  "Chemistry of Life - Biomolecules":
    "Topics covering carbohydrates, proteins, lipids, enzymes, nucleic acids, bioenergetics, and biochemical reactions for GCE A-Level.",
  "Motion and Energy in Physics":
    "Topics covering kinematics, Newton's laws, work, energy, power, momentum, and conservation laws for GCE A-Level Physics.",
  "Waves and Optics":
    "Topics covering wave properties, reflection, refraction, diffraction, interference, lenses, and optical instruments for GCE A-Level Physics.",
  "Ecosystems and Ecology":
    "Topics covering ecosystems, energy flow, nutrient cycles, population dynamics, conservation, biodiversity, and environmental science for GCE A-Level.",
  "Human Physiology":
    "Topics covering the human digestive system, circulatory system, respiratory system, nervous system, excretory system, and homeostasis for GCE A-Level Biology.",
  "Mathematical Techniques":
    "Topics covering algebra, calculus, trigonometry, logarithms, sequences, series, and mathematical reasoning for GCE A-Level.",
  "Statistics and Probability":
    "Topics covering probability theory, random variables, statistical distributions, hypothesis testing, and data analysis for GCE A-Level.",
};

export async function generateQuizFromTopic(
  topic: string,
  options: {
    questionCount: number;
    questionTypes: "MCQ" | "OPEN" | "MIXED";
  },
) {
  console.log(`[AI] Generating default quiz for topic: ${topic}`);

  const topicPrompt = DEFAULT_QUIZ_TOPIC_PROMPTS[topic] || topic;
  const questionTypeText =
    options.questionTypes === "MIXED"
      ? "Generate a mix of MCQ and Open-ended questions."
      : options.questionTypes === "MCQ"
        ? "Generate only Multiple Choice Questions (MCQ)."
        : "Generate only Open-ended questions.";

  const prompt = `You are an educational quiz generator for GCE A-Level students. Generate ${options.questionCount} quiz questions based on the following topic.

  Topic: ${topic}
  Description: ${topicPrompt}

  ${questionTypeText}

  Return JSON only.

  For every question you MUST include all of these fields:
  - type
  - question
  - options
  - correctAnswer
  - explanation

  Rules:
  - MCQ: Provide exactly 4 options in the options array
  - OPEN: Provide an empty options array []
  - correctAnswer must always be a string
  - explanation must always be a non-empty string
  - Questions should be appropriate for GCE A-Level examination standard
  - Stay faithful to the topic description provided`;

  const schema = z.object({
    questions: z.array(generatedQuestionSchema),
  });

  try {
    console.log("[AI] Calling OpenAI for default quiz with model: gpt-5.4");
    const { object } = await generateObject({
      model: aiModel,
      schema,
      prompt,
    });

    const questions = normalizeGeneratedQuestions(object.questions);
    console.log(`[AI] Default quiz returned ${questions.length} questions`);

    return questions;
  } catch (error) {
    console.error("[AI] Default quiz generation failed:", error);
    return [];
  }
}

export async function gradeOpenAnswer(
  question: string,
  userAnswer: string,
  correctAnswer: string,
) {
  const prompt = `You are an AI grading assistant. Grade the following open-ended answer.

  Question: ${question}
  Correct Answer: ${correctAnswer}
  User's Answer: ${userAnswer}

  Provide:
  1. A score (0-100)
  2. Feedback on the answer
  3. Key points the user missed`;

  const { text } = await generateText({
    model: aiModel,
    prompt,
  });

  return text;
}

export async function explainMCQAnswer(
  question: string,
  userAnswer: string,
  correctAnswer: string,
  options: string[],
) {
  const prompt = `You are an AI tutoring assistant. Explain why the user's answer is incorrect and why the correct answer is right.

Question: ${question}
Options: ${options.join(", ")}
User's Answer: ${userAnswer}
Correct Answer: ${correctAnswer}

Provide a brief explanation (2-3 sentences) explaining:
1. Why the user's answer is wrong
2. Why the correct answer is right
3. A tip to remember this concept`;

  const { text } = await generateText({
    model: aiModel,
    prompt,
  });

  return text;
}

export async function generateExamQuestions(
  subject: string,
  topic: string,
  questionCount: number,
) {
  const subjectName = subject === "CS" ? "Computer Science" : "ICT";

  const prompt = `You are an exam generator for GCE A-Level ${subjectName}.

  Topic: ${topic}
  Number of questions: ${questionCount}

  Generate exam-quality questions that:
  - Follow the Cameroon GCE A-Level syllabus
  - Include a mix of difficulty levels
  - Have clear, accurate answers
  - Include explanations
  - Always include an options array
  - Use [] for open-ended questions`;

  const schema = z.object({
    questions: z.array(generatedQuestionSchema),
  });

  try {
    const { object } = await generateObject({
      model: aiModel,
      schema,
      prompt,
    });

    return normalizeGeneratedQuestions(object.questions);
  } catch (error) {
    console.error("Exam generation error:", error);
    return [];
  }
}

export async function processNoteContent(content: string) {
  return summarizeText(content);
}

export async function createChatStream(
  messages: { role: "user" | "assistant"; content: string }[],
) {
  const systemPrompt = `You are TiCLearn AI, an intelligent study assistant specialized in helping Cameroon GCE A-Level students.

  Your expertise:
  - Computer Science and ICT (GCE A-Level syllabus)
  - Biology, Chemistry, Physics
  - General academic tutoring

  Guidelines:
  - Be encouraging and supportive
  - Explain concepts clearly
  - Use examples from the Cameroon curriculum when relevant
  - Stay focused on educational topics
  - If asked about non-educational topics, politely redirect`;

  const result = await streamText({
    model: aiModel,
    messages: [
      { role: "system", content: systemPrompt },
      ...messages.slice(-10),
    ],
  });

  return result.textStream;
}

function normalizeExtractedText(text: string) {
  return text
    .replace(/\r\n/g, "\n")
    .replaceAll(String.fromCharCode(0), "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
