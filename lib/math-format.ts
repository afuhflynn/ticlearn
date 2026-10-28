export function normalizeMathNotation(text: string): string {
  if (!text) return text;

  return (
    text
      // ```math ... ``` → $$ ... $$ (code block style)
      .replace(
        /```math\s*\n?([\s\S]*?)```/g,
        (_, m) => `\n$$\n${m.trim()}\n$$\n`,
      )
      // \[ ... \] → $$ ... $$ (display math, standard LaTeX)
      .replace(/\\\[([\s\S]*?)\\\]/g, (_, m) => `\n$$\n${m.trim()}\n$$\n`)
      // \( ... \) → $$ ... $$ (inline math, standard LaTeX)
      // NOTE: uses $$ because @streamdown/math has singleDollarTextMath: false
      .replace(/\\\(([\s\S]*?)\\\)/g, (_, m) => `$$ ${m.trim()} $$`)
      // $ # $ text → ### text (section heading, not math)
      .replace(/\$ # \$ ?/g, "### ")
      // ## formula ## → $$ formula $$ (display math, custom syntax)
      .replace(/##(.+?)##/g, (_, m) => `$$ ${m.trim()} $$`)
      // # formula # → $$ formula $$ (inline math, custom syntax)
      .replace(/(?<!\$|\\|`|#)#(.+?)#(?!\$|#)/g, (_, m) => `$$ ${m.trim()} $$`)
      // $ ... $ → $$ ... $$ (catches remaining single-$ patterns).
      // Guarded against money: an opening $ followed by a digit with no
      // math signal inside (`\ ^ _ { } = + - * / | < >`) is a price like
      // `$5 and $10`, not an equation, so it is left alone. Digit-led
      // real math (`$5 + 3$`) still converts because of the `+`.
      .replace(
        /(?<!\$)\$(?!\$)([^$\n]+?)\$(?!\$)/g,
        (whole, m: string, offset: number, full: string) => {
          const afterOpen = full[offset + 1];
          const looksLikeMoney =
            afterOpen !== undefined &&
            /\d/.test(afterOpen) &&
            !/[\\^_{}=+\-*/|<>]/.test(m);
          if (looksLikeMoney) return whole;
          return `$$ ${m.trim()} $$`;
        },
      )
  );
}
