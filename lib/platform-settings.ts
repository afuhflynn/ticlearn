import { withReadCache } from "@/lib/cache/reads";
import type { PlatformSettingsSnapshot } from "@/lib/platform-settings-direct";
import {
  DEFAULT_PLATFORM_SETTINGS,
  PLATFORM_SETTINGS_KEY,
  readPlatformSettings,
} from "@/lib/platform-settings-direct";
import { prisma } from "@/lib/prisma";

export { DEFAULT_PLATFORM_SETTINGS, PLATFORM_SETTINGS_KEY };
export type { PlatformSettingsSnapshot };

/** Fapshi `externalId` prefix for credit top-up orders (avoids collision with subscription ids). */
export const CREDIT_PURCHASE_EXTERNAL_ID_PREFIX = "cpo_";

export type CreditEnforcementEffective = {
  practice: boolean;
  aiTutor: boolean;
};

export function creditEnforcementEffective(
  settings: PlatformSettingsSnapshot,
): CreditEnforcementEffective {
  const all = settings.enforceCreditsAll;
  return {
    practice: all || settings.enforceCreditsForPractice,
    aiTutor: all || settings.enforceCreditsForAiTutor,
  };
}

/** Quiz generation debits when practice enforcement is on and quiz cost is positive. */
export function quizCreditsRequired(
  settings: PlatformSettingsSnapshot,
): boolean {
  const e = creditEnforcementEffective(settings);
  return e.practice && settings.creditCostQuizGeneration > 0;
}

/** Credits from XAF using floor (same as pay-as-you-go purchase calculation). */
export function creditsFromXaf(
  amountXaf: number,
  creditsPer1000Xaf: number,
): number {
  if (amountXaf <= 0 || creditsPer1000Xaf <= 0) return 0;
  return Math.floor((amountXaf * creditsPer1000Xaf) / 1000);
}

/**
 * The settings every reader shares, served from the shared read cache at spec
 * 0010's 60 second life. The direct read it wraps is `readPlatformSettings`,
 * which the cache switch itself uses, so this accessor can never recurse.
 */
export async function getPlatformSettings(): Promise<PlatformSettingsSnapshot> {
  return withReadCache(
    "read:platform-settings",
    { kind: "global" },
    readPlatformSettings,
  );
}

export async function ensurePlatformSettings() {
  return prisma.platformSettings.upsert({
    where: { key: PLATFORM_SETTINGS_KEY },
    create: { key: PLATFORM_SETTINGS_KEY, ...DEFAULT_PLATFORM_SETTINGS },
    update: {},
  });
}
