import { describe, expect, it } from "vitest";
import { isTemplate, TEMPLATES } from "@/lib/email/templates";

describe("email templates", () => {
  it("verify-address renders code", () => {
    const { subject, html, text } = TEMPLATES["verify-address"].render({
      firstName: "Student",
      code: "123456",
      verifyUrl: "https://ticlearn.ticsummit.org/verify?token=abc",
      expiresMinutes: 10,
    });
    expect(subject).toBeTruthy();
    expect(html).toContain("1 2 3 4 5 6");
    expect(text).toContain("123456");
  });

  it("escapes user controlled html in verify-address", () => {
    const { html } = TEMPLATES["verify-address"].render({
      firstName: "<img src=x onerror=alert(1)>",
      code: "123456",
      verifyUrl: "https://ticlearn.ticsummit.org/verify?token=abc",
      expiresMinutes: 10,
    });
    expect(html).not.toContain("<img src=x onerror=alert(1)>");
    expect(html).toContain("&lt;img");
  });

  it("admin-feedback-alert renders", () => {
    const { subject, html, text } = TEMPLATES["admin-feedback-alert"].render({
      userName: "Student",
      userEmail: "s@x.com",
      typeLabel: "BUG",
      subjectLine: "Broken thing",
      message: "It broke",
      rating: 1,
    });
    expect(subject).toBeTruthy();
    expect(html).toContain("Student");
    expect(text).toContain("Broken thing");
  });

  it("isTemplate returns false for unknown", () => {
    expect(isTemplate("nope")).toBe(false);
  });

  it("weekly-digest renders stats", () => {
    const { html } = TEMPLATES["weekly-digest"].render({
      firstName: "Student",
      streak: 5,
      quizzes: 12,
      reportUrl: "https://ticlearn.ticsummit.org/quizzes",
      unsubscribeUrl: "https://ticlearn.ticsummit.org/settings",
      weekOf: "2026-10-17",
    });
    expect(html).toContain("Day streak");
    expect(html).toContain("12");
  });
});
