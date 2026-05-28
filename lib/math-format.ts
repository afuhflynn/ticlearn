export function normalizeMathNotation(text: string): string {
  if (!text) return text;

  return text
    // ```math ... ``` → $$ ... $$ (code block style)
    .replace(/```math\s*\n?([\s\S]*?)```/g, (_, m) => `\n$$\n${m.trim()}\n$$\n`)
    // \[ ... \] → $$ ... $$ (display math, standard LaTeX)
    .replace(/\\\[([\s\S]*?)\\\]/g, (_, m) => `\n$$\n${m.trim()}\n$$\n`)
    // \( ... \) → $$ ... $$ (inline math, standard LaTeX)
    // NOTE: uses $$ because @streamdown/math has singleDollarTextMath: false
    .replace(/\\\(([\s\S]*?)\\\)/g, (_, m) => `$$ ${m.trim()} $$`)
    // $ # $ text → ### text (section heading, not math)
    .replace(/\$ # \$ ?/g, '### ')
    // ## formula ## → $$ formula $$ (display math, custom syntax)
    .replace(/##(.+?)##/g, (_, m) => `$$ ${m.trim()} $$`)
    // # formula # → $$ formula $$ (inline math, custom syntax)
    .replace(/(?<!\$|\\|`|#)#(.+?)#(?!\$|#)/g, (_, m) => `$$ ${m.trim()} $$`)
    // $ ... $ → $$ ... $$ (catches remaining single-$ patterns)
    .replace(/(?<!\$)\$(?!\$)([^$\n]+?)\$(?!\$)/g, (_, m) => `$$ ${m.trim()} $$`);
}
