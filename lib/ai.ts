import { openai } from "@ai-sdk/openai";
import { generateText, generateObject, streamText } from "ai";
import { z } from "zod";

export const aiModel = openai("gpt-4o-mini");

export async function generateQuizFromNote(
  noteContent: string,
  options: {
    questionCount: number;
    questionTypes: "MCQ" | "OPEN" | "MIXED";
  },
) {
  const questionTypeText =
    options.questionTypes === "MIXED"
      ? "Generate a mix of MCQ and Open-ended questions."
      : options.questionTypes === "MCQ"
        ? "Generate only Multiple Choice Questions (MCQ)."
        : "Generate only Open-ended questions.";

  const prompt = `You are an educational quiz generator. Generate ${options.questionCount} quiz questions based on the following study notes. 
  
  ${questionTypeText}
  
  For each question:
  - MCQ: Provide 4 options (A, B, C, D), mark the correct answer, and provide an explanation
  - Open-ended: Provide the correct answer and a detailed explanation
  
  Study Notes:
  ${noteContent}
  
  Return the response as a JSON array.`;

  const schema = z.array(
    z.object({
      type: z.enum(["MCQ", "OPEN"]),
      question: z.string(),
      options: z.array(z.string()).optional(),
      correctAnswer: z.string(),
      explanation: z.string(),
    }),
  );

  const { object } = await generateObject({
    model: aiModel,
    schema,
    prompt,
  });

  return object;
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
  
  Return as JSON array.`;

  const schema = z.array(
    z.object({
      type: z.enum(["MCQ", "OPEN"]),
      question: z.string(),
      options: z.array(z.string()).optional(),
      correctAnswer: z.string(),
      explanation: z.string(),
    }),
  );

  const { object } = await generateObject({
    model: aiModel,
    schema,
    prompt,
  });

  return object;
}

export async function processNoteContent(content: string) {
  const prompt = `Analyze the following study notes and provide:
  1. A concise summary (2-3 sentences, max 500 characters)
  2. Key topics covered (array of 3-5 topics)
  
  Notes:
  ${content}`;

  const { text } = await generateText({
    model: aiModel,
    prompt,
  });

  const lines = text.split("\n").filter((l) => l.trim());
  const summary = lines.slice(0, 2).join(" ").slice(0, 500);
  const topics = lines
    .filter((l) => l.match(/^[-•*•]\s/))
    .map((l) => l.replace(/^[-•*•]\s*/, ""))
    .slice(0, 5);

  return { summary, topics };
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
