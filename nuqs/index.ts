import {
  parseAsBoolean,
  parseAsString,
  type SingleParserBuilder,
  type Values,
} from "nuqs";

export const searchParamsSchema = {
  redirect: parseAsString,
  page: parseAsString.withDefault("1"),
  limit: parseAsString.withDefault("10"),
  archived: parseAsBoolean.withDefault(false),
  search: parseAsString.withDefault(""),
  token: parseAsString,
  checkout_id: parseAsString,
  tab: parseAsString.withDefault("overview"),
  conversationId: parseAsString,
  email: parseAsString,
};

type ParamsTypes = Values<{
  redirect: SingleParserBuilder<string>;
  page: SingleParserBuilder<number>;
  limit: SingleParserBuilder<number>;
  archived: SingleParserBuilder<boolean>;
  search: SingleParserBuilder<string>;
  token: SingleParserBuilder<string>;
  checkout_id: SingleParserBuilder<string>;
  tab: SingleParserBuilder<string>;
  conversationId: SingleParserBuilder<string>;
  email: SingleParserBuilder<string>;
}>;

// Helper function to build URLs with current params
export const buildUrl = (
  href: string,
  overrides: Partial<typeof searchParamsSchema> = {},
  params: ParamsTypes,
) => {
  const newParams = new URLSearchParams();
  const merged = { ...params, ...overrides };

  Object.entries(merged).forEach(([key, value]) => {
    if (value !== null && value !== undefined) {
      newParams.set(key, value as string);
    }
  });

  return `${href}?${newParams.toString()}`;
};
