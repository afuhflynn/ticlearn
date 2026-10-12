import { z } from "zod";

const edgeEnvSchema = z.object({
  ARCJET_KEY: z.string().min(1, "ARCJET_KEY is required"),
});

const nodeEnvSchema = z.object({
  ARCJET_KEY: z.string().min(1, "ARCJET_KEY is required"),
  BETTER_AUTH_TRUSTED_ORIGINS: z
    .string()
    .min(1, "BETTER_AUTH_TRUSTED_ORIGINS is required"),
  FAPSHI_WEBHOOK_SECRET: z.string().optional(),
});

const placeholderPattern = /^(your-|changeme|placeholder|example|test-)/i;

function isPlaceholder(value: string): boolean {
  return placeholderPattern.test(value);
}

function validateEdgeEnv(): { arcjetKey: string } {
  const parsed = edgeEnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const errors = parsed.error.flatten().fieldErrors;
    const msg = Object.entries(errors)
      .map(([k, v]) => `${k}: ${v.join(", ")}`)
      .join("; ");
    throw new Error(`Edge env validation failed: ${msg}`);
  }
  const { ARCJET_KEY } = parsed.data;
  if (isPlaceholder(ARCJET_KEY)) {
    throw new Error("ARCJET_KEY is set to a placeholder value");
  }
  return { arcjetKey: ARCJET_KEY };
}

function validateNodeEnv(): {
  arcjetKey: string;
  trustedOrigins: string[];
  webhookSecret: string | undefined;
} {
  const parsed = nodeEnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const errors = parsed.error.flatten().fieldErrors;
    const msg = Object.entries(errors)
      .map(([k, v]) => `${k}: ${v.join(", ")}`)
      .join("; ");
    throw new Error(`Node env validation failed: ${msg}`);
  }
  const { ARCJET_KEY, BETTER_AUTH_TRUSTED_ORIGINS, FAPSHI_WEBHOOK_SECRET } =
    parsed.data;
  if (isPlaceholder(ARCJET_KEY)) {
    throw new Error("ARCJET_KEY is set to a placeholder value");
  }
  if (isPlaceholder(BETTER_AUTH_TRUSTED_ORIGINS)) {
    throw new Error(
      "BETTER_AUTH_TRUSTED_ORIGINS is set to a placeholder value",
    );
  }
  if (FAPSHI_WEBHOOK_SECRET && isPlaceholder(FAPSHI_WEBHOOK_SECRET)) {
    throw new Error("FAPSHI_WEBHOOK_SECRET is set to a placeholder value");
  }
  return {
    arcjetKey: ARCJET_KEY,
    trustedOrigins: BETTER_AUTH_TRUSTED_ORIGINS.split(",").map((o) => o.trim()),
    webhookSecret: FAPSHI_WEBHOOK_SECRET,
  };
}

let edgeEnv: { arcjetKey: string } | null = null;
let nodeEnv: {
  arcjetKey: string;
  trustedOrigins: string[];
  webhookSecret: string | undefined;
} | null = null;

export function getEdgeEnv(): { arcjetKey: string } {
  if (!edgeEnv) {
    edgeEnv = validateEdgeEnv();
  }
  return edgeEnv;
}

export function getNodeEnv(): {
  arcjetKey: string;
  trustedOrigins: string[];
  webhookSecret: string | undefined;
} {
  if (!nodeEnv) {
    nodeEnv = validateNodeEnv();
  }
  return nodeEnv;
}

export const arcjetKey = ((): string => {
  try {
    return getEdgeEnv().arcjetKey;
  } catch {
    return getNodeEnv().arcjetKey;
  }
})();

export const trustedOrigins = ((): string[] => {
  try {
    return getNodeEnv().trustedOrigins;
  } catch {
    return [process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"];
  }
})();

export const webhookSecret = ((): string | undefined => {
  try {
    return getNodeEnv().webhookSecret;
  } catch {
    return process.env.FAPSHI_WEBHOOK_SECRET;
  }
})();
