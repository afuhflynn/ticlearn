import { parseAsInteger, parseAsString, parseAsStringLiteral } from "nuqs";

// Admin plan upgrades descriptor. Search text uses `q` with an empty
// default. The change plan dialog is a view state modal
// (`modal=change`) plus the user id in `selectedId`. The picked plan
// and the reason stay local form drafts inside the dialog.
export const adminPlanUpgradesViewParsers = {
  q: parseAsString.withDefault(""),
  role: parseAsStringLiteral(["USER", "ADMIN", "all"]).withDefault("USER"),
  onboarding: parseAsStringLiteral([
    "completed",
    "not_completed",
    "skipped",
    "all",
  ]).withDefault("all"),
  plan: parseAsStringLiteral([
    "FREE",
    "STARTER",
    "STANDARD",
    "PREMIUM",
    "PRO",
    "all",
  ]).withDefault("all"),
  status: parseAsStringLiteral([
    "all",
    "ACTIVE",
    "PENDING",
    "FAILED",
  ]).withDefault("all"),
  page: parseAsInteger.withDefault(1),
  limit: parseAsInteger.withDefault(20),
  modal: parseAsStringLiteral(["change", ""]).withDefault(""),
  selectedId: parseAsString.withDefault(""),
};

// Canonical defaults for the correction pass. Kept beside the parsers
// so the two can never drift apart.
export const adminPlanUpgradesViewDefaults = {
  q: "",
  role: "USER",
  onboarding: "all",
  plan: "all",
  status: "all",
  page: 1,
  limit: 20,
  modal: "",
  selectedId: "",
};
