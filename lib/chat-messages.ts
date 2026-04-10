import type { UIMessage } from "ai";

export function normalizeStoredParts(
  parts: unknown,
  fallbackContent = "",
): UIMessage["parts"] {
  if (Array.isArray(parts)) {
    return parts as UIMessage["parts"];
  }

  if (typeof parts === "string") {
    try {
      const parsed = JSON.parse(parts);
      return normalizeStoredParts(parsed, fallbackContent);
    } catch {
      if (parts.length > 0) {
        return [{ type: "text", text: parts }];
      }
    }
  }

  if (fallbackContent.length > 0) {
    return [{ type: "text", text: fallbackContent }];
  }

  return [];
}

export function extractTextFromParts(parts: UIMessage["parts"]) {
  return parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("\n")
    .trim();
}
