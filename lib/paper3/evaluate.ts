import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { z } from "zod";

const aiModel = openai("gpt-5.4");

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

  if (!question.partialCredit) {
    if (
      userAnswer.trim().toLowerCase() ===
      question.expectedAnswer.trim().toLowerCase()
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
    case "WEB_PROGRAMMING":
    case "ALGORITHM_PSEUDOCODE":
      return evaluateCodeAnswer(
        userAnswer,
        question.expectedAnswer,
        totalMarks,
        question.language ?? "c",
      );
    default:
      return evaluateInputField(
        userAnswer,
        question.expectedAnswer,
        totalMarks,
      );
  }
}

export async function evaluateWithAI(
  question: {
    taskType: Paper3TaskType;
    content: string;
    expectedAnswer: string;
    totalMarks: number;
  },
  userAnswer: string,
): Promise<EvaluationResult> {
  const prompt = `You are an expert GCE examiner. Evaluate the following student answer for a ${question.taskType} question.

Question:
${question.content}

Expected Answer:
${question.expectedAnswer}

Student Answer:
${userAnswer}

Evaluate and provide:
1. isCorrect: boolean
2. marksEarned: number (0 to ${question.totalMarks})
3. feedback: constructive feedback
4. breakdown: specific criteria that were met or missed

Use partial credit where appropriate.`;

  const responseSchema = z.object({
    isCorrect: z.boolean(),
    marksEarned: z.number().min(0).max(question.totalMarks),
    feedback: z.string(),
    breakdown: z.array(
      z.object({
        criteria: z.string(),
        marks: z.number(),
        description: z.string(),
      }),
    ),
  });

  try {
    const { object } = await generateObject({
      model: aiModel,
      schema: responseSchema,
      prompt,
    });

    return {
      ...object,
      totalMarks: question.totalMarks,
      correctAnswer: question.expectedAnswer,
      partialCredit:
        object.marksEarned > 0 && object.marksEarned < question.totalMarks,
    };
  } catch {
    return evaluateAnswer(
      {
        taskType: question.taskType,
        expectedAnswer: question.expectedAnswer,
        totalMarks: question.totalMarks,
        partialCredit: true,
      },
      userAnswer,
    );
  }
}
