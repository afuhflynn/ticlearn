"use client";

import { PENDING_CHAT_MESSAGE_PREFIX } from "./constants";

type PendingChatMessage = {
  text: string;
};

function getStorageKey(conversationId: string) {
  return `${PENDING_CHAT_MESSAGE_PREFIX}.${conversationId}`;
}

export function storePendingChatMessage(
  conversationId: string,
  message: PendingChatMessage,
) {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(
    getStorageKey(conversationId),
    JSON.stringify(message),
  );
}

export function consumePendingChatMessage(
  conversationId: string,
): PendingChatMessage | null {
  if (typeof window === "undefined") {
    return null;
  }

  const key = getStorageKey(conversationId);
  const stored = window.sessionStorage.getItem(key);

  if (!stored) {
    return null;
  }

  window.sessionStorage.removeItem(key);

  try {
    return JSON.parse(stored) as PendingChatMessage;
  } catch {
    return null;
  }
}
