import { NextResponse } from "next/server";
import { LEVELS } from "@/constants/levels";

export async function GET() {
  return NextResponse.json({
    levels: LEVELS.map(({ value, label, blurb }) => ({ value, label, blurb })),
  });
}
