// Must match Prisma enum in lib/generated/prisma/enums.ts
export type Paper3TaskType =
  | "ACCESS_TABLE"
  | "ACCESS_RELATIONSHIP"
  | "ALGORITHM_PSEUDOCODE"
  | "C_PROGRAM"
  | "EXCEL_FORMULA"
  | "EXCEL_GRID"
  | "INPUT_FIELD"
  | "PASCAL_PROGRAM"
  | "SQL_QUERY"
  | "WEB_PROGRAMMING";

export interface MarkingCriteria {
  criteria: string;
  marks: number;
  description: string;
}

export interface EvaluationResult {
  isCorrect: boolean;
  marksEarned: number;
  totalMarks: number;
  feedback: string;
  correctAnswer: string;
  breakdown: MarkingCriteria[];
  partialCredit: boolean;
}

function normalizeAnswer(answer: string, taskType: Paper3TaskType): string {
  const normalized = answer.trim().toUpperCase();

  switch (taskType) {
    case "EXCEL_FORMULA":
    case "EXCEL_GRID":
      return normalized
        .replace(/\s+/g, "")
        .replace(/=/g, "")
        .replace(/SUM\(/g, "SUM(")
        .replace(/AVERAGE\(/g, "AVERAGE(")
        .replace(/IF\(/g, "IF(")
        .replace(/VLOOKUP\(/g, "VLOOKUP(")
        .replace(/HLOOKUP\(/g, "HLOOKUP(")
        .replace(/COUNTIF\(/g, "COUNTIF(")
        .replace(/SUMIF\(/g, "SUMIF(");

    case "SQL_QUERY":
    case "ACCESS_TABLE":
    case "ACCESS_RELATIONSHIP":
      return normalized
        .replace(/\s+/g, " ")
        .replace(/;/g, "")
        .replace(/,\s*/g, ", ")
        .trim();

    case "C_PROGRAM":
    case "PASCAL_PROGRAM":
    case "WEB_PROGRAMMING":
    case "ALGORITHM_PSEUDOCODE":
      return normalized
        .replace(/[{}[\]();]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    default:
      return normalized.replace(/[^A-Z0-9]/gi, "").toUpperCase();
  }
}

function evaluateSpreadsheetAnswer(
  userAnswer: string,
  correctAnswer: string,
  totalMarks: number,
): EvaluationResult {
  const userNorm = normalizeAnswer(userAnswer, "EXCEL_FORMULA");
  const correctNorm = normalizeAnswer(correctAnswer, "EXCEL_FORMULA");

  if (userNorm === correctNorm) {
    return {
      isCorrect: true,
      marksEarned: totalMarks,
      totalMarks,
      feedback: "Correct! Your formula is correct.",
      correctAnswer: correctAnswer,
      breakdown: [
        {
          criteria: "Formula matches expected",
          marks: totalMarks,
          description: "Correct formula",
        },
      ],
      partialCredit: false,
    };
  }

  const userFunctions = extractFunctions(userNorm);
  const correctFunctions = extractFunctions(correctNorm);

  const hasCorrectFunctions =
    correctFunctions.every((f) => userFunctions.includes(f)) &&
    userFunctions.every((f) => correctFunctions.includes(f));

  const userCellRefs = extractCellReferences(userNorm);
  const correctCellRefs = extractCellReferences(correctNorm);

  const hasCorrectCellRefs =
    correctCellRefs.every((r) => userCellRefs.includes(r)) &&
    userCellRefs.length === correctCellRefs.length;

  if (hasCorrectFunctions && hasCorrectCellRefs) {
    return {
      isCorrect: true,
      marksEarned: totalMarks,
      totalMarks,
      feedback: "Correct! Your formula produces the expected result.",
      correctAnswer: correctAnswer,
      breakdown: [
        {
          criteria: "Uses correct functions and cell references",
          marks: totalMarks,
          description: "All elements correct",
        },
      ],
      partialCredit: false,
    };
  }

  const partialMarks = Math.floor(totalMarks / 2);
  const breakdown: MarkingCriteria[] = [];

  if (hasCorrectFunctions) {
    breakdown.push({
      criteria: "Uses correct functions",
      marks: partialMarks,
      description: "Functions are correct",
    });
  }
  if (hasCorrectCellRefs) {
    breakdown.push({
      criteria: "Uses correct cell references",
      marks: partialMarks,
      description: "Cell references are correct",
    });
  }

  const earnedMarks = breakdown.reduce((sum, b) => sum + b.marks, 0);
  const cappedMarks = Math.min(earnedMarks, totalMarks);

  return {
    isCorrect: false,
    marksEarned: cappedMarks,
    totalMarks,
    feedback:
      cappedMarks > 0
        ? `Partially correct. You earned ${cappedMarks}/${totalMarks} marks.`
        : "Incorrect formula.",
    correctAnswer: correctAnswer,
    breakdown:
      breakdown.length > 0
        ? breakdown
        : [
            {
              criteria: "No correct elements",
              marks: 0,
              description: "Formula does not match expected",
            },
          ],
    partialCredit: true,
  };
}

function extractFunctions(formula: string): string[] {
  const functionPattern = /[A-Z]+\(/gi;
  const matches = formula.match(functionPattern);
  return matches ? matches.map((f) => f.replace("(", "").toUpperCase()) : [];
}

function extractCellReferences(formula: string): string[] {
  const cellPattern = /[A-Z]+[0-9]+(?::[A-Z]+[0-9]+)?/gi;
  const matches = formula.match(cellPattern);
  return matches ? [...new Set(matches.map((m) => m.toUpperCase()))] : [];
}

function evaluateSqlAnswer(
  userAnswer: string,
  correctAnswer: string,
  totalMarks: number,
): EvaluationResult {
  const userNorm = normalizeAnswer(userAnswer, "SQL_QUERY");
  const correctNorm = normalizeAnswer(correctAnswer, "SQL_QUERY");

  if (userNorm === correctNorm) {
    return {
      isCorrect: true,
      marksEarned: totalMarks,
      totalMarks,
      feedback: "Correct! Your SQL query is correct.",
      correctAnswer: correctAnswer,
      breakdown: [
        {
          criteria: "Query structure matches",
          marks: totalMarks,
          description: "Complete and correct query",
        },
      ],
      partialCredit: false,
    };
  }

  const userKeywords = extractSqlKeywords(userNorm);
  const correctKeywords = extractSqlKeywords(correctNorm);

  const hasSelect = userKeywords.includes("SELECT");
  const hasFrom = userKeywords.includes("FROM");
  const hasWhere = correctKeywords.includes("WHERE")
    ? userKeywords.includes("WHERE")
    : true;
  const hasGroupBy = correctKeywords.includes("GROUP BY")
    ? userKeywords.includes("GROUP BY")
    : true;
  const hasOrderBy = correctKeywords.includes("ORDER BY")
    ? userKeywords.includes("ORDER BY")
    : true;
  const hasJoin = correctKeywords.includes("JOIN")
    ? userKeywords.includes("JOIN")
    : true;

  const keywordsPresent = [
    hasSelect,
    hasFrom,
    hasWhere,
    hasGroupBy,
    hasOrderBy,
    hasJoin,
  ].filter(Boolean).length;
  const keywordsExpected = [
    hasSelect,
    hasFrom,
    hasWhere,
    hasGroupBy,
    hasOrderBy,
    hasJoin,
  ].length;

  const breakdown: MarkingCriteria[] = [];
  let earnedMarks = 0;

  if (hasSelect && hasFrom) {
    breakdown.push({
      criteria: "Basic SELECT/FROM",
      marks: Math.floor(totalMarks / 3),
      description: "Has SELECT and FROM",
    });
    earnedMarks += Math.floor(totalMarks / 3);
  }
  if (hasWhere) {
    breakdown.push({
      criteria: "WHERE clause",
      marks: Math.floor(totalMarks / 3),
      description: "Has WHERE clause",
    });
    earnedMarks += Math.floor(totalMarks / 3);
  }
  if (hasGroupBy || hasOrderBy || hasJoin) {
    breakdown.push({
      criteria: "Advanced clauses",
      marks: Math.floor(totalMarks / 3),
      description: "Has advanced clauses",
    });
    earnedMarks += Math.floor(totalMarks / 3);
  }

  const cappedMarks = Math.min(earnedMarks, totalMarks);
  const partialCredit = cappedMarks > 0;

  return {
    isCorrect: hasSelect && hasFrom && keywordsPresent === keywordsExpected,
    marksEarned: cappedMarks,
    totalMarks,
    feedback: partialCredit
      ? `Partially correct. You earned ${cappedMarks}/${totalMarks} marks.`
      : "Incorrect SQL query.",
    correctAnswer: correctAnswer,
    breakdown,
    partialCredit,
  };
}

function extractSqlKeywords(query: string): string[] {
  const keywords = [
    "SELECT",
    "FROM",
    "WHERE",
    "GROUP BY",
    "ORDER BY",
    "HAVING",
    "JOIN",
    "LEFT JOIN",
    "RIGHT JOIN",
    "INNER JOIN",
    "ON",
    "AND",
    "OR",
    "ORDER",
    "BY",
    "LIMIT",
    "OFFSET",
  ];
  const found: string[] = [];
  const upperQuery = query.toUpperCase();

  for (const keyword of keywords) {
    if (upperQuery.includes(keyword)) {
      found.push(keyword);
    }
  }

  return found;
}

function evaluateCodeAnswer(
  userAnswer: string,
  correctAnswer: string,
  totalMarks: number,
  _language: string = "python",
): EvaluationResult {
  const userNorm = normalizeAnswer(userAnswer, "C_PROGRAM");
  const correctNorm = normalizeAnswer(correctAnswer, "C_PROGRAM");

  if (userNorm === correctNorm) {
    return {
      isCorrect: true,
      marksEarned: totalMarks,
      totalMarks,
      feedback: "Correct! Your code is correct.",
      correctAnswer: correctAnswer,
      breakdown: [
        {
          criteria: "Code matches expected",
          marks: totalMarks,
          description: "Complete and correct code",
        },
      ],
      partialCredit: false,
    };
  }

  const userTokens = tokenizeCode(userNorm);
  const correctTokens = tokenizeCode(correctNorm);

  const correctTokensTotal = correctTokens.length;
  const matchingTokens = userTokens.filter((t) =>
    correctTokens.includes(t),
  ).length;
  const matchRatio =
    correctTokensTotal > 0 ? matchingTokens / correctTokensTotal : 0;

  if (matchRatio >= 0.8) {
    return {
      isCorrect: true,
      marksEarned: totalMarks,
      totalMarks,
      feedback: "Correct! Your code produces the expected output.",
      correctAnswer: correctAnswer,
      breakdown: [
        {
          criteria: "Code logic correct",
          marks: totalMarks,
          description: "All logic elements present",
        },
      ],
      partialCredit: false,
    };
  }

  if (matchRatio >= 0.5) {
    const partialMarks = Math.floor(totalMarks / 2);
    return {
      isCorrect: false,
      marksEarned: partialMarks,
      totalMarks,
      feedback: `Partially correct. You earned ${partialMarks}/${totalMarks} marks.`,
      correctAnswer: correctAnswer,
      breakdown: [
        {
          criteria: "Partial code logic",
          marks: partialMarks,
          description: "Some code elements present",
        },
      ],
      partialCredit: true,
    };
  }

  return {
    isCorrect: false,
    marksEarned: 0,
    totalMarks,
    feedback: "Incorrect code. Refer to the correct answer.",
    correctAnswer: correctAnswer,
    breakdown: [
      {
        criteria: "Code does not match",
        marks: 0,
        description: "Insufficient correct elements",
      },
    ],
    partialCredit: false,
  };
}

function tokenizeCode(code: string): string[] {
  const keywords = [
    "IF",
    "ELSE",
    "FOR",
    "WHILE",
    "RETURN",
    "DEF",
    "FUNCTION",
    "VAR",
    "LET",
    "CONST",
    "PRINT",
    "INPUT",
    "SUM",
    "MAX",
    "MIN",
    "AVG",
    "COUNT",
    "LEN",
    "RANGE",
    "IN",
    "NOT",
    "AND",
    "OR",
    "TRUE",
    "FALSE",
  ];

  const tokens: string[] = [];
  const upperCode = code.toUpperCase();

  for (const keyword of keywords) {
    if (upperCode.includes(keyword)) {
      tokens.push(keyword);
    }
  }

  const varPattern = /[A-Z_][A-Z0-9_]*/gi;
  const vars = code.match(varPattern);
  if (vars) {
    tokens.push(...vars.map((v) => v.toUpperCase()));
  }

  return [...new Set(tokens)];
}

export interface HtmlEvaluationCriteria {
  hasHeading: boolean;
  headingLevel: number | null;
  hasParagraph: boolean;
  hasTable: boolean;
  tableRowCount: number;
  tableCellCount: number;
  hasTextInput: boolean;
  hasButton: boolean;
  hasInlineStyles: boolean;
  hasForm: boolean;
  structureScore: number;
}

function normalizeHtml(html: string): string {
  return html
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\s+/g, " ")
    .replace(/>\s+</g, "><")
    .replace(/<\s+/g, "<")
    .replace(/\s+>/g, ">")
    .trim()
    .toLowerCase();
}

function extractHtmlElements(html: string): HtmlEvaluationCriteria {
  const normalized = normalizeHtml(html);
  const criteria: HtmlEvaluationCriteria = {
    hasHeading: false,
    headingLevel: null,
    hasParagraph: false,
    hasTable: false,
    tableRowCount: 0,
    tableCellCount: 0,
    hasTextInput: false,
    hasButton: false,
    hasInlineStyles: false,
    hasForm: false,
    structureScore: 0,
  };

  const h1Match = normalized.match(/<h1[^>]*>(.*?)<\/h1>/);
  const h2Match = normalized.match(/<h2[^>]*>(.*?)<\/h2>/);
  const h3Match = normalized.match(/<h3[^>]*>(.*?)<\/h3>/);
  const h4Match = normalized.match(/<h4[^>]*>(.*?)<\/h4>/);
  const h5Match = normalized.match(/<h5[^>]*>(.*?)<\/h5>/);
  const h6Match = normalized.match(/<h6[^>]*>(.*?)<\/h6>/);

  if (h1Match && h1Match[1].trim().length > 0) {
    criteria.hasHeading = true;
    criteria.headingLevel = 1;
  } else if (h2Match && h2Match[1].trim().length > 0) {
    criteria.hasHeading = true;
    criteria.headingLevel = 2;
  } else if (h3Match && h3Match[1].trim().length > 0) {
    criteria.hasHeading = true;
    criteria.headingLevel = 3;
  } else if (h4Match && h4Match[1].trim().length > 0) {
    criteria.hasHeading = true;
    criteria.headingLevel = 4;
  } else if (h5Match && h5Match[1].trim().length > 0) {
    criteria.hasHeading = true;
    criteria.headingLevel = 5;
  } else if (h6Match && h6Match[1].trim().length > 0) {
    criteria.hasHeading = true;
    criteria.headingLevel = 6;
  }

  const pMatch = normalized.match(/<p[^>]*>(.*?)<\/p>/);
  if (pMatch && pMatch[1].trim().length > 0) {
    criteria.hasParagraph = true;
  }

  if (normalized.includes("<table")) {
    criteria.hasTable = true;
    const trMatches = normalized.match(/<tr[^>]*>/g);
    const tdMatches = normalized.match(/<t[hd][^>]*>/g);
    criteria.tableRowCount = trMatches ? trMatches.length : 0;
    criteria.tableCellCount = tdMatches ? tdMatches.length : 0;
  }

  if (normalized.includes('<input') || normalized.includes("<input ")) {
    criteria.hasTextInput = true;
  }

  if (normalized.includes("<button") || normalized.includes('<input type="submit"') || normalized.includes("<input type='submit'")) {
    criteria.hasButton = true;
  }

  if (normalized.includes('style=')) {
    criteria.hasInlineStyles = true;
  }

  if (normalized.includes("<form")) {
    criteria.hasForm = true;
  }

  let openCount = 0;
  let closeCount = 0;
  const tags = ["div", "span", "p", "h1", "h2", "h3", "table", "tr", "td", "th", "form", "input", "button"];
  for (const tag of tags) {
    const openPattern = new RegExp(`<${tag}[^>]*>`, "gi");
    const closePattern = new RegExp(`</${tag}>`, "gi");
    const opens = normalized.match(openPattern);
    const closes = normalized.match(closePattern);
    openCount += opens ? opens.length : 0;
    closeCount += closes ? closes.length : 0;
  }

  if (openCount === 0 && closeCount === 0) {
    criteria.structureScore = 0.5;
  } else if (openCount === closeCount) {
    criteria.structureScore = 1;
  } else if (Math.abs(openCount - closeCount) <= 2) {
    criteria.structureScore = 0.7;
  } else {
    criteria.structureScore = 0.3;
  }

  return criteria;
}

function evaluateHtmlAnswer(
  userAnswer: string,
  correctAnswer: string,
  totalMarks: number,
): EvaluationResult {
  const userCriteria = extractHtmlElements(userAnswer);
  const correctCriteria = extractHtmlElements(correctAnswer);

  const breakdown: MarkingCriteria[] = [];
  let earnedMarks = 0;

  const headingMarks = 2;
  if (userCriteria.hasHeading === correctCriteria.hasHeading) {
    breakdown.push({
      criteria: "Heading element",
      marks: headingMarks,
      description: userCriteria.hasHeading ? `Found <h${userCriteria.headingLevel}>` : "No heading found",
    });
    earnedMarks += headingMarks;
  } else if (userCriteria.hasHeading && !correctCriteria.hasHeading) {
    breakdown.push({
      criteria: "Heading element (extra)",
      marks: 0,
      description: "Extra heading found (not required but allowed)",
    });
  } else {
    breakdown.push({
      criteria: "Heading element",
      marks: 0,
      description: "Expected heading element",
    });
  }

  const paragraphMarks = 2;
  if (userCriteria.hasParagraph === correctCriteria.hasParagraph) {
    breakdown.push({
      criteria: "Paragraph element",
      marks: paragraphMarks,
      description: userCriteria.hasParagraph ? "Found <p> element" : "No paragraph required",
    });
    earnedMarks += paragraphMarks;
  } else if (userCriteria.hasParagraph) {
    breakdown.push({
      criteria: "Paragraph element (extra)",
      marks: 0,
      description: "Extra paragraph found (not required but allowed)",
    });
  } else {
    breakdown.push({
      criteria: "Paragraph element",
      marks: 0,
      description: "Expected paragraph element",
    });
  }

  const tableMarks = 3;
  if (userCriteria.hasTable) {
    if (correctCriteria.hasTable) {
      const rowBonus = Math.min(userCriteria.tableRowCount, correctCriteria.tableRowCount) * 0.3;
      const cellBonus = Math.min(userCriteria.tableCellCount, correctCriteria.tableCellCount) * 0.1;
      breakdown.push({
        criteria: "Table with data",
        marks: tableMarks,
        description: `Found table with ${userCriteria.tableRowCount} rows and ${userCriteria.tableCellCount} cells`,
      });
      earnedMarks += tableMarks;
    } else {
      breakdown.push({
        criteria: "Table element (not required)",
        marks: 0,
        description: `Found table with ${userCriteria.tableRowCount} rows (not required)`,
      });
    }
  } else {
    if (correctCriteria.hasTable) {
      breakdown.push({
        criteria: "Table element",
        marks: 0,
        description: "Expected table with data",
      });
    } else {
      breakdown.push({
        criteria: "No table required",
        marks: 0,
        description: "No table required for this question",
      });
    }
  }

  const inputMarks = 2;
  if (userCriteria.hasTextInput === correctCriteria.hasTextInput) {
    breakdown.push({
      criteria: "Text input field",
      marks: inputMarks,
      description: userCriteria.hasTextInput ? "Found text input" : "No text input required",
    });
    earnedMarks += inputMarks;
  } else if (userCriteria.hasTextInput) {
    breakdown.push({
      criteria: "Text input field (extra)",
      marks: 0,
      description: "Extra text input found (not required but allowed)",
    });
  } else {
    breakdown.push({
      criteria: "Text input field",
      marks: 0,
      description: "Expected text input field",
    });
  }

  const buttonMarks = 2;
  if (userCriteria.hasButton === correctCriteria.hasButton) {
    breakdown.push({
      criteria: "Submit button",
      marks: buttonMarks,
      description: userCriteria.hasButton ? "Found button" : "No button required",
    });
    earnedMarks += buttonMarks;
  } else if (userCriteria.hasButton) {
    breakdown.push({
      criteria: "Submit button (extra)",
      marks: 0,
      description: "Extra button found (not required but allowed)",
    });
  } else {
    breakdown.push({
      criteria: "Submit button",
      marks: 0,
      description: "Expected submit button",
    });
  }

  const styleMarks = 2;
  if (userCriteria.hasInlineStyles === correctCriteria.hasInlineStyles) {
    breakdown.push({
      criteria: "Inline styling",
      marks: styleMarks,
      description: userCriteria.hasInlineStyles ? "Found inline styles" : "No inline styling required",
    });
    earnedMarks += styleMarks;
  } else if (userCriteria.hasInlineStyles) {
    breakdown.push({
      criteria: "Inline styling (extra)",
      marks: 0,
      description: "Extra inline styles found (not required but allowed)",
    });
  } else {
    breakdown.push({
      criteria: "Inline styling",
      marks: 0,
      description: "Expected inline styling",
    });
  }

  const structureMarks = 2;
  const structureEarned = Math.round(userCriteria.structureScore * structureMarks);
  breakdown.push({
    criteria: "Structure completeness",
    marks: structureEarned,
    description: structureEarned === structureMarks
      ? "All tags properly opened and closed"
      : `Structure score: ${Math.round(userCriteria.structureScore * 100)}%`,
  });
  earnedMarks += structureEarned;

  const isCorrect = earnedMarks >= totalMarks * 0.8;
  const partialCredit = earnedMarks > 0 && earnedMarks < totalMarks;

  let feedback = "";
  if (isCorrect) {
    feedback = "Excellent! Your HTML page is complete and correct.";
  } else if (partialCredit) {
    feedback = `Partially correct. You earned ${earnedMarks}/${totalMarks} marks.`;
  } else if (earnedMarks === 0) {
    feedback = "Your HTML does not match the expected structure. Please review the requirements.";
  } else {
    feedback = `Needs improvement. You earned ${earnedMarks}/${totalMarks} marks.`;
  }

  return {
    isCorrect,
    marksEarned: earnedMarks,
    totalMarks,
    feedback,
    correctAnswer,
    breakdown,
    partialCredit,
  };
}

function evaluateInputField(
  userAnswer: string,
  correctAnswer: string,
  totalMarks: number,
): EvaluationResult {
  const userNorm = normalizeAnswer(userAnswer, "INPUT_FIELD");
  const correctNorm = normalizeAnswer(correctAnswer, "INPUT_FIELD");

  const isCorrect = userNorm === correctNorm;

  if (isCorrect) {
    return {
      isCorrect: true,
      marksEarned: totalMarks,
      totalMarks,
      feedback: "Correct!",
      correctAnswer: correctAnswer,
      breakdown: [
        {
          criteria: "Answer matches",
          marks: totalMarks,
          description: "Correct answer",
        },
      ],
      partialCredit: false,
    };
  }

  const similarity = calculateStringSimilarity(userNorm, correctNorm);

  if (similarity >= 0.8) {
    return {
      isCorrect: true,
      marksEarned: totalMarks,
      totalMarks,
      feedback: "Correct!",
      correctAnswer: correctAnswer,
      breakdown: [
        {
          criteria: "Answer matches",
          marks: totalMarks,
          description: "Correct answer",
        },
      ],
      partialCredit: false,
    };
  }

  if (similarity >= 0.5) {
    const partialMarks = Math.floor(totalMarks / 2);
    return {
      isCorrect: false,
      marksEarned: partialMarks,
      totalMarks,
      feedback: `Partially correct. You earned ${partialMarks}/${totalMarks} marks.`,
      correctAnswer: correctAnswer,
      breakdown: [
        {
          criteria: "Partial match",
          marks: partialMarks,
          description: "Some elements correct",
        },
      ],
      partialCredit: true,
    };
  }

  return {
    isCorrect: false,
    marksEarned: 0,
    totalMarks,
    feedback: "Incorrect. Please try again.",
    correctAnswer: correctAnswer,
    breakdown: [
      { criteria: "No match", marks: 0, description: "Answer does not match" },
    ],
    partialCredit: false,
  };
}

function calculateStringSimilarity(a: string, b: string): number {
  if (a.length === 0 && b.length === 0) return 1;
  if (a.length === 0 || b.length === 0) return 0;

  const longer = a.length > b.length ? a : b;
  const shorter = a.length > b.length ? b : a;

  if (longer.length === 0) return 1;

  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1,
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

export function isHtmlQuestion(taskType: string, contentMd?: string | null): boolean {
  if (taskType === "WEB_PROGRAMMING") return true;
  
  if (contentMd) {
    const trimmed = contentMd.trim().toLowerCase();
    if (trimmed.startsWith("<html") || trimmed.startsWith("<!doctype")) return true;
    const htmlTagPattern = /^<(html|head|body|div|span|p|h[1-6]|table|form|input|button|ul|ol|li|a|img)/;
    if (htmlTagPattern.test(trimmed)) return true;
    if (trimmed.includes("<html") || trimmed.includes("<div")) {
      const htmlDensity = (trimmed.match(/<[a-z][^>]*>/gi) || []).length;
      const textDensity = trimmed.split(/\s+/).length;
      if (htmlDensity > 3 && htmlDensity > textDensity * 0.3) return true;
    }
  }
  
  return false;
}

export async function evaluateAnswer(
  question: {
    taskType: Paper3TaskType;
    expectedAnswer: string;
    totalMarks?: number;
    partialCredit?: boolean;
    markingBreakdown?: MarkingCriteria[];
    language?: string;
  },
  userAnswer: string,
): Promise<EvaluationResult> {
  const totalMarks = question.totalMarks ?? 1;

  if (!userAnswer || userAnswer.trim() === "") {
    return {
      isCorrect: false,
      marksEarned: 0,
      totalMarks,
      feedback: "No answer provided.",
      correctAnswer: question.expectedAnswer,
      breakdown: question.markingBreakdown ?? [
        { criteria: "No answer", marks: 0, description: "Empty answer" },
      ],
      partialCredit: false,
    };
  }

  // Always use specialized evaluation for spreadsheet/SQL task types
  const specializedTypes = ["EXCEL_FORMULA", "EXCEL_GRID", "SQL_QUERY", "ACCESS_TABLE", "ACCESS_RELATIONSHIP"];
  if (specializedTypes.includes(question.taskType)) {
    switch (question.taskType) {
      case "EXCEL_FORMULA":
      case "EXCEL_GRID":
        return evaluateSpreadsheetAnswer(
          userAnswer,
          question.expectedAnswer,
          totalMarks,
        );
      case "ACCESS_TABLE":
      case "ACCESS_RELATIONSHIP":
      case "SQL_QUERY":
        return evaluateSqlAnswer(userAnswer, question.expectedAnswer, totalMarks);
    }
  }

  // Use specialized evaluation for code/programming types
  const codeTypes = ["C_PROGRAM", "PASCAL_PROGRAM", "WEB_PROGRAMMING", "ALGORITHM_PSEUDOCODE"];
  if (codeTypes.includes(question.taskType)) {
    return evaluateCodeAnswer(
      userAnswer,
      question.expectedAnswer,
      totalMarks,
      question.language ?? "c",
    );
  }

  if (!question.partialCredit) {
    if (
      normalizeAnswer(userAnswer, question.taskType) ===
      normalizeAnswer(question.expectedAnswer, question.taskType)
    ) {
      return {
        isCorrect: true,
        marksEarned: totalMarks,
        totalMarks,
        feedback: "Correct!",
        correctAnswer: question.expectedAnswer,
        breakdown: [
          {
            criteria: "Correct answer",
            marks: totalMarks,
            description: "Answer matches",
          },
        ],
        partialCredit: false,
      };
    }

    return {
      isCorrect: false,
      marksEarned: 0,
      totalMarks,
      feedback: "Incorrect.",
      correctAnswer: question.expectedAnswer,
      breakdown: [
        {
          criteria: "Incorrect",
          marks: 0,
          description: "Answer does not match",
        },
      ],
      partialCredit: false,
    };
  }

switch (question.taskType) {
    case "EXCEL_FORMULA":
    case "EXCEL_GRID":
      return evaluateSpreadsheetAnswer(
        userAnswer,
        question.expectedAnswer,
        totalMarks,
      );

    case "ACCESS_TABLE":
    case "ACCESS_RELATIONSHIP":
    case "SQL_QUERY":
      return evaluateSqlAnswer(userAnswer, question.expectedAnswer, totalMarks);

    case "C_PROGRAM":
    case "PASCAL_PROGRAM":
    case "ALGORITHM_PSEUDOCODE":
      return evaluateCodeAnswer(
        userAnswer,
        question.expectedAnswer,
        totalMarks,
        question.language ?? "c",
      );
    case "WEB_PROGRAMMING":
      return evaluateHtmlAnswer(userAnswer, question.expectedAnswer, totalMarks);
    default:
      return evaluateInputField(
        userAnswer,
        question.expectedAnswer,
        totalMarks,
      );
  }
}


