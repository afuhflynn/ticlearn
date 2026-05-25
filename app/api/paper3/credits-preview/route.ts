import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  creditEnforcementEffective,
  getPlatformSettings,
  maxAffordableMockQuestions,
} from "@/lib/platform-settings";
import { getUserCreditBalance } from "@/lib/credits";

export async function GET() {
  try {
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [settings, balance] = await Promise.all([
      getPlatformSettings(),
      getUserCreditBalance(session.user.id),
    ]);

    const enforcement = creditEnforcementEffective(settings);
    const maxQuestions = maxAffordableMockQuestions(balance, settings);

    return NextResponse.json({
      balance,
      settings: {
        creditCostQuizGeneration: settings.creditCostQuizGeneration,
        creditCostMockGeneration: settings.creditCostMockGeneration,
        creditCostMockQuestion: settings.creditCostMockQuestion,
        creditCostPracticeQuestion: settings.creditCostPracticeQuestion,
        creditCostRevisionGuideView: settings.creditCostRevisionGuideView,
        creditCostAiTutorMessage: settings.creditCostAiTutorMessage,
        mockMinQuestions: settings.mockMinQuestions,
        mockMaxQuestions: settings.mockMaxQuestions,
        enforceCreditsAll: settings.enforceCreditsAll,
        enforceCreditsForMocks: enforcement.mocks,
        enforceCreditsForPractice: enforcement.practice,
        enforceCreditsForRevisionGuides: enforcement.revisionGuides,
        enforceCreditsForAiTutor: enforcement.aiTutor,
        creditsPer1000Xaf: settings.creditsPer1000Xaf,
        minCreditPurchaseXaf: settings.minCreditPurchaseXaf,
        maxCreditPurchaseXaf: settings.maxCreditPurchaseXaf,
      },
      mock: {
        maxAffordableQuestions: maxQuestions,
        creditCostFormula: "questionCount * creditCostMockQuestion",
      },
    });
  } catch (error) {
    console.error("Paper3 credits preview GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch credit preview" },
      { status: 500 },
    );
  }
}
