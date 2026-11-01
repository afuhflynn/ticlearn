/**
 * Pure quiet rule for the upgrade invite.
 * Full invite shows at most once per active Douala day.
 * A dismiss keeps the day quiet. A shown invite turns later hits short.
 */
export function decidePromptForm(input: {
  shownToday: boolean;
  dismissedToday: boolean;
}): { showFull: boolean; quiet: boolean } {
  if (input.dismissedToday) return { showFull: false, quiet: true };
  if (input.shownToday) return { showFull: false, quiet: false };
  return { showFull: true, quiet: false };
}
