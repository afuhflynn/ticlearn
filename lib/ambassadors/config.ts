export const AMBASSADOR_THRESHOLD = 3;
export const AMBASSADOR_EXPIRY_DAYS = 180;
export const AMBASSADOR_PASS_PLAN = "PRO";
export const AMBASSADOR_MAX_GRANTS_PER_USER = 1;
export const AMBASSADOR_COOKIE_NAME = "tic_ref";
export const AMBASSADOR_COOKIE_MAX_AGE = 180 * 24 * 60 * 60;

export function ambassadorSharePath(code: string): string {
  return `/r/${code}`;
}

export function ambassadorShareUrl(origin: string, code: string): string {
  const clean = origin.replace(/\/$/, "");
  return `${clean}${ambassadorSharePath(code)}`;
}
