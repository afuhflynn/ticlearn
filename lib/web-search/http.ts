/**
 * The one place a provider is called over the wire, for spec 0022.
 *
 * Both companies answer with JSON over HTTPS and both fail in the same ways, so
 * the failure taxonomy lives here once. A caller reads a code, never a provider
 * message, and a timed out call is never retried: the provider keeps working
 * after the socket closes, so paying twice buys nothing.
 */

import type { WebSearchErrorCode } from "./types";

/** A provider call that did not return a usable JSON body. */
export class ProviderRequestError extends Error {
  readonly code: WebSearchErrorCode;
  readonly status: number | null;

  constructor(code: WebSearchErrorCode, status: number | null = null) {
    super(`Provider request failed: ${code}`);
    this.name = "ProviderRequestError";
    this.code = code;
    this.status = status;
  }
}

function codeForStatus(status: number): WebSearchErrorCode {
  if (status === 401 || status === 403) return "AUTH";
  if (status === 429) return "RATE_LIMITED";
  if (status >= 500) return "SERVER";
  return "MALFORMED";
}

function isTimeout(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.name === "TimeoutError" || error.name === "AbortError")
  );
}

/**
 * POST or GET a JSON endpoint inside a hard deadline. A non 2xx answer, a
 * timeout, a network failure or a body that is not JSON all leave as a
 * `ProviderRequestError` carrying one of the codes in the taxonomy.
 */
export async function fetchJson(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    throw new ProviderRequestError(isTimeout(error) ? "TIMEOUT" : "NETWORK");
  }

  if (!response.ok) {
    throw new ProviderRequestError(
      codeForStatus(response.status),
      response.status,
    );
  }

  try {
    return await response.json();
  } catch {
    throw new ProviderRequestError("MALFORMED", response.status);
  }
}

export function errorCodeFrom(error: unknown): WebSearchErrorCode {
  if (error instanceof ProviderRequestError) return error.code;
  return "NETWORK";
}
