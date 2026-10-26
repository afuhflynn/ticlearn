import { type Tool, type ToolExecutionOptions, tool } from "ai";

type PolicyName =
  | "userScope"
  | "webSearchScrub"
  | "noRawText"
  | "noIsPublic"
  | "chatInputCap";

interface PolicyContext {
  userId: string;
}

type PolicyFn = (
  args: unknown,
  context: PolicyContext,
) => { allowed: boolean; modifiedArgs?: unknown; reason?: string };

const policies: Record<PolicyName, PolicyFn> = {
  userScope: (args, { userId }) => {
    const obj = args as Record<string, unknown>;
    if (obj.userId && obj.userId !== userId) {
      return {
        allowed: false,
        reason: "User scope violation: cannot access other user's data",
      };
    }
    return { allowed: true, modifiedArgs: { ...obj, userId } };
  },

  webSearchScrub: (args) => {
    const obj = args as { query?: string };
    if (!obj.query) return { allowed: true };
    const query = obj.query;
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/;
    const phoneRegex = /\b\d{7,}\b/;
    const instructionRegex =
      /(ignore|disregard|forget|system prompt|you are|act as|pretend)/i;
    if (
      emailRegex.test(query) ||
      phoneRegex.test(query) ||
      instructionRegex.test(query)
    ) {
      return {
        allowed: false,
        reason:
          "Query contains disallowed content (email, phone, or instructions)",
      };
    }
    return {
      allowed: true,
      modifiedArgs: { ...obj, query: query.slice(0, 500) },
    };
  },

  noRawText: (args) => {
    const obj = args as Record<string, unknown>;
    if (obj.extractedText) {
      return {
        allowed: false,
        reason: "Tool cannot return raw extracted text",
      };
    }
    return { allowed: true };
  },

  noIsPublic: (args) => {
    const obj = args as Record<string, unknown>;
    if ("isPublic" in obj) {
      return { allowed: true, modifiedArgs: { ...obj, isPublic: false } };
    }
    return { allowed: true };
  },

  chatInputCap: (args) => {
    const obj = args as { messages?: unknown[] };
    if (!obj.messages) return { allowed: true };
    if (obj.messages.length > 50) {
      return { allowed: false, reason: "Too many messages (max 50)" };
    }
    for (const msg of obj.messages) {
      if (msg && typeof msg === "object" && "content" in msg) {
        const content = (msg as { content?: unknown }).content;
        if (typeof content === "string" && content.length > 8000) {
          return {
            allowed: false,
            reason: "Message too long (max 8000 characters)",
          };
        }
      }
    }
    return { allowed: true };
  },
};

export function wrapTool<T extends Tool>(
  toolDef: T,
  policyNames: PolicyName[],
  context: PolicyContext,
): T {
  const originalExecute = toolDef.execute;
  const originalInputSchema = toolDef.inputSchema;

  if (!originalExecute) {
    throw new Error("Tool has no execute function");
  }

  return tool({
    description: toolDef.description,
    inputSchema: originalInputSchema,
    execute: async (args: unknown, options: ToolExecutionOptions) => {
      let currentArgs = args;
      for (const policyName of policyNames) {
        const policy = policies[policyName];
        if (!policy) continue;
        const result = policy(currentArgs, context);
        if (!result.allowed) {
          throw new Error(result.reason || `Policy ${policyName} denied`);
        }
        if (result.modifiedArgs) {
          currentArgs = result.modifiedArgs;
        }
      }
      return originalExecute(currentArgs, options);
    },
  }) as T;
}

export function createToolPolicyContext(userId: string): PolicyContext {
  return { userId };
}

export const TOOL_POLICIES = {
  userScope: "userScope" as PolicyName,
  webSearchScrub: "webSearchScrub" as PolicyName,
  noRawText: "noRawText" as PolicyName,
  noIsPublic: "noIsPublic" as PolicyName,
  chatInputCap: "chatInputCap" as PolicyName,
};

export const DEFAULT_CHAT_TOOL_POLICIES: PolicyName[] = [
  "userScope",
  "noRawText",
  "chatInputCap",
];

export const WEB_SEARCH_TOOL_POLICIES: PolicyName[] = [
  "webSearchScrub",
  "chatInputCap",
];

/**
 * `readPage` needs no wrapper here: its scheme, host and length checks run in
 * `lib/web-search` before any request leaves the server, and a refusal comes
 * back as a result rather than a thrown error.
 */
export const READ_PAGE_TOOL_POLICIES: PolicyName[] = [];

export const CREATE_QUIZ_TOOL_POLICIES: PolicyName[] = [
  "userScope",
  "noIsPublic",
  "chatInputCap",
];
