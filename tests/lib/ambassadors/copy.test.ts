import { describe, expect, it } from "vitest";
import {
  AMBASSADOR_COPY,
  ambassadorCopyIsHonest,
  ambassadorWhatsAppText,
} from "@/constants/ambassador-copy";

describe("ambassador copy honesty (spec 0036 AC-11)", () => {
  it("promises a pass only and never money or income", () => {
    const texts = [
      AMBASSADOR_COPY.headline,
      AMBASSADOR_COPY.subhead,
      AMBASSADOR_COPY.cta,
      AMBASSADOR_COPY.finePrint,
      ambassadorWhatsAppText("https://ticlearn.ticsummit.org/r/ABC123"),
    ];
    for (const text of texts) {
      expect(ambassadorCopyIsHonest(text)).toBe(true);
    }
    expect(AMBASSADOR_COPY.finePrint.toLowerCase()).toContain("semester pass");
  });
});
