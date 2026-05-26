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

export const nimDeepSeek = nim.chatModel("deepseek-ai/deepseek-v4-pro");
export const nimMistral = nim.chatModel("mistralai/mistral-nemotron");
export const nimNemotron = nim.chatModel("nvidia/llama-3.3-nemotron-super-49b-v1");

// === Google Gemini — free tier, primarily for structured output ===
// Free until ~October 2026 (1,500 RPD for Flash, 100 RPD for Pro)
export const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
});

export const geminiFlash = google("gemini-2.5-flash");
export const geminiFlashLite = google("gemini-2.5-flash-lite");
export const geminiPro = google("gemini-2.5-pro");

// === OpenAI — emergency fallback only ===
// Kept for backward compatibility; orchestrator uses this as last resort
export { openai } from "@ai-sdk/openai";
