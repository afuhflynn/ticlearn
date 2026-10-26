/**
 * The platform settings row, read straight from the database (spec 0010).
 *
 * The cache module reads the shared cache switch through this module rather
 * than through `lib/platform-settings.ts`, because that accessor is itself
 * served from the cache. Two hops back into the cache while deciding whether
 * the cache may answer would recurse, so the switch asks the database directly
 * and nothing else in the app should import this file.
 */

import type { PlatformSettings } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export const PLATFORM_SETTINGS_KEY = "global";

export type PlatformSettingsSnapshot = Pick<
  PlatformSettings,
  | "creditCostQuizGeneration"
  | "creditCostPracticeQuestion"
  | "creditCostAiTutorMessage"
  | "creditCostWebSearch"
  | "enforceCreditsForPractice"
  | "enforceCreditsForAiTutor"
  | "enforceCreditsAll"
  | "creditsPer1000Xaf"
  | "minCreditPurchaseXaf"
  | "maxCreditPurchaseXaf"
  | "creditCostMultiplierStarter"
  | "creditCostMultiplierStandard"
  | "creditCostMultiplierPremium"
  | "creditCostMultiplierPro"
  | "usdToXafRate"
  | "aiFusionAllow"
  | "sharedCacheEnabled"
>;

export const DEFAULT_PLATFORM_SETTINGS: PlatformSettingsSnapshot = {
  creditCostQuizGeneration: 50,
  creditCostPracticeQuestion: 5,
  creditCostAiTutorMessage: 5,
  creditCostWebSearch: 1,
  enforceCreditsForPractice: true,
  enforceCreditsForAiTutor: true,
  enforceCreditsAll: false,
  creditsPer1000Xaf: 50,
  minCreditPurchaseXaf: 100,
  maxCreditPurchaseXaf: 500_000,
  creditCostMultiplierStarter: 0.8,
  creditCostMultiplierStandard: 0.6,
  creditCostMultiplierPremium: 0.4,
  creditCostMultiplierPro: 0.4,
  usdToXafRate: 650,
  aiFusionAllow: false,
  sharedCacheEnabled: true,
};

/** The uncached read. The cached accessor lives in `lib/platform-settings.ts`. */
export async function readPlatformSettings(): Promise<PlatformSettingsSnapshot> {
  const settings = await prisma.platformSettings.findUnique({
    where: { key: PLATFORM_SETTINGS_KEY },
  });

  if (!settings) {
    return DEFAULT_PLATFORM_SETTINGS;
  }

  return {
    creditCostQuizGeneration: settings.creditCostQuizGeneration,
    creditCostPracticeQuestion: settings.creditCostPracticeQuestion,
    creditCostAiTutorMessage: settings.creditCostAiTutorMessage,
    creditCostWebSearch: settings.creditCostWebSearch,
    enforceCreditsForPractice: settings.enforceCreditsForPractice,
    enforceCreditsForAiTutor: settings.enforceCreditsForAiTutor,
    enforceCreditsAll: settings.enforceCreditsAll,
    creditsPer1000Xaf: settings.creditsPer1000Xaf,
    minCreditPurchaseXaf: settings.minCreditPurchaseXaf,
    maxCreditPurchaseXaf: settings.maxCreditPurchaseXaf,
    creditCostMultiplierStarter: settings.creditCostMultiplierStarter,
    creditCostMultiplierStandard: settings.creditCostMultiplierStandard,
    creditCostMultiplierPremium: settings.creditCostMultiplierPremium,
    creditCostMultiplierPro: settings.creditCostMultiplierPro,
    usdToXafRate: settings.usdToXafRate,
    aiFusionAllow: settings.aiFusionAllow,
    sharedCacheEnabled: settings.sharedCacheEnabled,
  };
}
