/** Line-based MCQ text (past papers / ingestion) split into stem + A–D + optional keyed answer */

export type ParsedMcqOption = { letter: string; label: string };

export type ParsedMcq = {
  stem: string;
  options: ParsedMcqOption[];
  correctOption?: string;
};

export function extractMcqFromPlainText(full: string): ParsedMcq | null {
  const trimmed = full.trim();
  if (!trimmed) return null;
  const rawLines = trimmed.split(/\r?\n/);
  const lines = rawLines.map((l) => l.trim()).filter(Boolean);
  const optRe = /^([A-Da-d])[\).\:\s]\s*(.+)$/;
  const options: ParsedMcqOption[] = [];
  const stemLines: string[] = [];
  let seenOption = false;
  for (const line of lines) {
    const m = line.match(optRe);
    if (m) {
      seenOption = true;
      options.push({
        letter: m[1].toUpperCase(),
        label: m[2].trim(),
      });
    } else if (!seenOption) {
      stemLines.push(line);
    }
  }
  if (options.length < 2) return null;

  const answerMatch = trimmed.match(
    /(?:^|\n)\s*(?:correct|answer|key)\s*[:\u2013\-]\s*([A-Da-d])\b/im,
  );
  const correctOption = answerMatch
    ? answerMatch[1].toUpperCase()
    : undefined;

  let stem = stemLines.join("\n").trim();
  stem = stem
    .replace(
      /\s*(?:correct|correct answer|answer|key)\s*[:\u2013\-]\s*[A-Da-d]\b\s*$/i,
      "",
    )
    .trim();

  return {
    stem: stem || trimmed,
    options: options.slice(0, 4),
    ...(correctOption ? { correctOption } : {}),
  };
}
