import type { PlatformSettings } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export const PLATFORM_SETTINGS_KEY = "global";

/** Fapshi `externalId` prefix for credit top-up orders (avoids collision with subscription ids). */
export const CREDIT_PURCHASE_EXTERNAL_ID_PREFIX = "cpo_";

export type PlatformSettingsSnapshot = Pick<
  PlatformSettings,
  | "creditCostQuizGeneration"
  | "creditCostMockQuestion"
  | "creditCostMockGeneration"
  | "creditCostPracticeQuestion"
  | "creditCostRevisionGuideView"
  | "creditCostRevisionGuideGen"
  | "creditCostAiTutorMessage"
  | "mockMinQuestions"
  | "mockMaxQuestions"
  | "enforceCreditsForMocks"
  | "enforceCreditsForPractice"
  | "enforceCreditsForRevisionGuides"
  | "enforceCreditsForAiTutor"
  | "enforceCreditsAll"
  | "creditsPer1000Xaf"
  | "minCreditPurchaseXaf"
  | "maxCreditPurchaseXaf"
  | "useAceShortAnswerGrading"
>;

export const DEFAULT_PLATFORM_SETTINGS: PlatformSettingsSnapshot = {
  creditCostQuizGeneration: 50,
  creditCostMockQuestion: 10,
  creditCostMockGeneration: 40,
  creditCostPracticeQuestion: 5,
  creditCostRevisionGuideView: 0,
  creditCostRevisionGuideGen: 0,
  creditCostAiTutorMessage: 5,
  mockMinQuestions: 5,
  mockMaxQuestions: 50,
  enforceCreditsForMocks: true,
  enforceCreditsForPractice: true,
  enforceCreditsForRevisionGuides: false,
  enforceCreditsForAiTutor: true,
  enforceCreditsAll: false,
  creditsPer1000Xaf: 50,
  minCreditPurchaseXaf: 100,
  maxCreditPurchaseXaf: 500_000,
  useAceShortAnswerGrading: true,
};

export type CreditEnforcementEffective = {
  mocks: boolean;
  practice: boolean;
  revisionGuides: boolean;
  aiTutor: boolean;
};

export function creditEnforcementEffective(
  settings: PlatformSettingsSnapshot,
): CreditEnforcementEffective {
  const all = settings.enforceCreditsAll;
  return {
    mocks: all || settings.enforceCreditsForMocks,
    practice: all || settings.enforceCreditsForPractice,
    revisionGuides: all || settings.enforceCreditsForRevisionGuides,
    aiTutor: all || settings.enforceCreditsForAiTutor,
  };
}

/** Quiz generation debits when practice enforcement is on and quiz cost is positive. */
export function quizCreditsRequired(settings: PlatformSettingsSnapshot): boolean {
  const e = creditEnforcementEffective(settings);
  return e.practice && settings.creditCostQuizGeneration > 0;
}

/** Paper 1/2 mock assembly debits when practice enforcement is on and generation cost is positive. */
export function practiceMockGenerationCreditsRequired(
  settings: PlatformSettingsSnapshot,
): boolean {
  const e = creditEnforcementEffective(settings);
  return e.practice && settings.creditCostMockGeneration > 0;
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
    creditCostMockQuestion: settings.creditCostMockQuestion,
    creditCostMockGeneration: settings.creditCostMockGeneration,
    creditCostPracticeQuestion: settings.creditCostPracticeQuestion,
    creditCostRevisionGuideView: settings.creditCostRevisionGuideView,
    creditCostRevisionGuideGen: settings.creditCostRevisionGuideGen,
    creditCostAiTutorMessage: settings.creditCostAiTutorMessage,
    mockMinQuestions: settings.mockMinQuestions,
    mockMaxQuestions: settings.mockMaxQuestions,
    enforceCreditsForMocks: settings.enforceCreditsForMocks,
    enforceCreditsForPractice: settings.enforceCreditsForPractice,
    enforceCreditsForRevisionGuides: settings.enforceCreditsForRevisionGuides,
    enforceCreditsForAiTutor: settings.enforceCreditsForAiTutor,
    enforceCreditsAll: settings.enforceCreditsAll,
    creditsPer1000Xaf: settings.creditsPer1000Xaf,
    minCreditPurchaseXaf: settings.minCreditPurchaseXaf,
    maxCreditPurchaseXaf: settings.maxCreditPurchaseXaf,
    useAceShortAnswerGrading: settings.useAceShortAnswerGrading,
  };
}

export async function ensurePlatformSettings() {
  return prisma.platformSettings.upsert({
    where: { key: PLATFORM_SETTINGS_KEY },
    create: { key: PLATFORM_SETTINGS_KEY, ...DEFAULT_PLATFORM_SETTINGS },
    update: {},
  });
}

export function maxAffordableMockQuestions(
  credits: number,
  settings: PlatformSettingsSnapshot,
): number {
  if (settings.creditCostMockQuestion <= 0) {
    return settings.mockMaxQuestions;
  }

  const affordable = Math.floor(credits / settings.creditCostMockQuestion);
  return Math.min(settings.mockMaxQuestions, Math.max(0, affordable));
}

export function mockCreditCost(
  questionCount: number,
  settings: PlatformSettingsSnapshot,
): number {
  return questionCount * settings.creditCostMockQuestion;
}
