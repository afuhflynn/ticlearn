import type { PlatformSettings } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export const PLATFORM_SETTINGS_KEY = "global";

/** Fapshi `externalId` prefix for credit top-up orders (avoids collision with subscription ids). */
export const CREDIT_PURCHASE_EXTERNAL_ID_PREFIX = "cpo_";

export type PlatformSettingsSnapshot = Pick<
  PlatformSettings,
  | "creditCostQuizGeneration"
  | "creditCostPracticeQuestion"
  | "creditCostRevisionGuideView"
  | "creditCostRevisionGuideGen"
  | "creditCostAiTutorMessage"
  | "enforceCreditsForPractice"
  | "enforceCreditsForRevisionGuides"
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
  creditCostRevisionGuideView: 0,
  creditCostRevisionGuideGen: 0,
  creditCostAiTutorMessage: 5,
  enforceCreditsForPractice: true,
  enforceCreditsForRevisionGuides: false,
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

export type CreditEnforcementEffective = {
  practice: boolean;
  revisionGuides: boolean;
  aiTutor: boolean;
};

export function creditEnforcementEffective(
  settings: PlatformSettingsSnapshot,
): CreditEnforcementEffective {
  const all = settings.enforceCreditsAll;
  return {
    practice: all || settings.enforceCreditsForPractice,
    revisionGuides: all || settings.enforceCreditsForRevisionGuides,
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

export async function getPlatformSettings(): Promise<PlatformSettingsSnapshot> {
  const settings = await prisma.platformSettings.findUnique({
    where: { key: PLATFORM_SETTINGS_KEY },
  });

  if (!settings) {
    return DEFAULT_PLATFORM_SETTINGS;
  }

  return {
    creditCostQuizGeneration: settings.creditCostQuizGeneration,
    creditCostPracticeQuestion: settings.creditCostPracticeQuestion,
    creditCostRevisionGuideView: settings.creditCostRevisionGuideView,
    creditCostRevisionGuideGen: settings.creditCostRevisionGuideGen,
    creditCostAiTutorMessage: settings.creditCostAiTutorMessage,
    enforceCreditsForPractice: settings.enforceCreditsForPractice,
    enforceCreditsForRevisionGuides: settings.enforceCreditsForRevisionGuides,
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

export async function ensurePlatformSettings() {
  return prisma.platformSettings.upsert({
    where: { key: PLATFORM_SETTINGS_KEY },
    create: { key: PLATFORM_SETTINGS_KEY, ...DEFAULT_PLATFORM_SETTINGS },
    update: {},
  });
}
