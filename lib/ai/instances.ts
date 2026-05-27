import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { createGoogleGenerativeAI } from "@ai-sdk/google";

// === NVIDIA NIM — primary for tool-calling, permanent fallback ===
// Free tier: 40 RPM, phone verification required
export const nim = createOpenAICompatible({
  name: "nim",
  baseURL: "https://integrate.api.nvidia.com/v1",
  headers: {
    Authorization: `Bearer ${process.env.NIM_API_KEY}`,
  },
});

export const nimDeepSeek = nim.chatModel("deepseek-ai/deepseek-v4-flash");
export const nimNemotron = nim.chatModel("nvidia/llama-3.3-nemotron-super-49b-v1");
export const nimMistral = nim.chatModel("mistralai/mistral-nemotron");

// === Google Gemini 3+ — free tier, flash for speed, pro for deep reasoning ===
export const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
});

export const geminiFlash = google("gemini-3.5-flash");

// === OpenAI — quota-exhausted (429), fail fast ===
export { openai } from "@ai-sdk/openai";
