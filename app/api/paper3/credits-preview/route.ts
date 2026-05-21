import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
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

    const maxQuestions = maxAffordableMockQuestions(balance, settings);

    return NextResponse.json({
      balance,
      settings: {
        creditCostMockQuestion: settings.creditCostMockQuestion,
        creditCostPracticeQuestion: settings.creditCostPracticeQuestion,
        creditCostRevisionGuideView: settings.creditCostRevisionGuideView,
        creditCostAiTutorMessage: settings.creditCostAiTutorMessage,
        mockMinQuestions: settings.mockMinQuestions,
        mockMaxQuestions: settings.mockMaxQuestions,
        enforceCreditsForMocks: settings.enforceCreditsForMocks,
        enforceCreditsForPractice: settings.enforceCreditsForPractice,
        enforceCreditsForRevisionGuides: settings.enforceCreditsForRevisionGuides,
        enforceCreditsForAiTutor: settings.enforceCreditsForAiTutor,
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
