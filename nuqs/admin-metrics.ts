import { parseAsInteger, parseAsString, parseAsStringLiteral } from "nuqs";

function todayStr(): string {
  const day = new Date().toISOString().split("T")[0];
  return day ?? "";
}

function thirtyDaysAgoStr(): string {
  const day = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];
  return day ?? "";
}

// Area date defaults, computed once per load so parsers and the
// correction pass below can never disagree with each other.
const defaultFrom = thirtyDaysAgoStr();
const defaultTo = todayStr();

// Admin metrics descriptor. Tab set, granularity set, metric set, sort
// columns, and date range are owned by this area. Page, size, search
// text, and sort direction follow the shared plumbing. The metric key
// doubles as the chart highlight on overview style tabs and as the
// server filter on the data tab. This screen has no modal.
export const adminMetricsViewParsers = {
  tab: parseAsStringLiteral([
    "overview",
    "engagement",
    "learning",
    "growth",
    "monetization",
    "retention",
    "data",
  ]).withDefault("overview"),
  from: parseAsString.withDefault(defaultFrom),
  to: parseAsString.withDefault(defaultTo),
  granularity: parseAsStringLiteral(["daily", "monthly", "yearly"]).withDefault(
    "daily",
  ),
  metric: parseAsStringLiteral([
    "all",
    "active_users",
    "paid_users",
    "new_users",
    "new_paid_users",
    "conversion_rate",
    "feedbacks",
    "revenue",
    "chat_messages",
    "quizzes_taken",
    "exams_completed",
    "practice_answered",
    "silent_churn_7d",
    "silent_churn_30d",
  ]).withDefault("all"),
  q: parseAsString.withDefault(""),
  page: parseAsInteger.withDefault(1),
  limit: parseAsInteger.withDefault(50),
  sort: parseAsStringLiteral(["date", "metric", "value"]).withDefault("date"),
  order: parseAsStringLiteral(["asc", "desc"]).withDefault("desc"),
};

// Canonical defaults for the correction pass. Kept beside the parsers
// so the two can never drift apart.
export const adminMetricsViewDefaults = {
  tab: "overview",
  from: defaultFrom,
  to: defaultTo,
  granularity: "daily",
  metric: "all",
  q: "",
  page: 1,
  limit: 50,
  sort: "date",
  order: "desc",
};
