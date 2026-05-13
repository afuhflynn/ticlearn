export function normalizeMathNotation(text: string): string {
  if (!text) return text;

  return text
    // ```math ... ``` → $$ ... $$ (code block style)
    .replace(/```math\s*\n?([\s\S]*?)```/g, (_, m) => `\n$$\n${m.trim()}\n$$\n`)
    // ## formula ## → $$ formula $$ (display math, custom syntax)
    .replace(/##(.+?)##/g, (_, m) => `$$ ${m.trim()} $$`)
    // # formula # → $ formula $ (inline math, custom syntax)
    .replace(/(?<!\$|\\|`|#)#(.+?)#(?!\$|#)/g, (_, m) => `$ ${m.trim()} $`)
    // Protect dollar amounts ($10 → $10) — single dollar followed by digit stays as-is
    // Already handled by remark-math's singleDollarTextMath: false option
    ;
}
