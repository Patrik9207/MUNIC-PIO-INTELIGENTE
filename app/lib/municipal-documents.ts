export type ReportKey =
  | "bp"
  | "bo"
  | "bf"
  | "dvp"
  | "movimentacao"
  | "restos"
  | "pessoal"
  | "rcl"
  | "complementar";

export type DocumentKind =
  | "Balanço Patrimonial"
  | "Balanço Orçamentário"
  | "Balanço Financeiro"
  | "DVP"
  | "Movimento Numerário"
  | "Restos a Pagar"
  | "Despesa com Pessoal"
  | "RCL"
  | "Complementar"
  | "Indefinido";

export type ExtractionResult = {
  kind: DocumentKind;
  label: string;
  confidence: number;
  reason: string;
};

export type ExtractedField = {
  id: string;
  page: number;
  description: string;
  value: string;
  normalizedValue: number | null;
  confidence: number;
  status: "ok" | "warning" | "empty";
};

export const REPORT_CATALOG = [
  { key: "bp", label: "Balanço Patrimonial", short: "BP" },
  { key: "bo", label: "Balanço Orçamentário", short: "BO" },
  { key: "bf", label: "Balanço Financeiro", short: "BF" },
  { key: "dvp", label: "DVP", short: "DVP" },
  { key: "movimentacao", label: "Movimento Numerário", short: "MN" },
  { key: "restos", label: "Memorial de Restos a Pagar", short: "RRP" },
  { key: "pessoal", label: "Despesa com Pessoal", short: "DP" },
  { key: "rcl", label: "Receita Corrente Líquida", short: "RCL" },
] as const;

export function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function parseBrazilianNumber(value: string): number | null {
  if (!value) return null;

  const sanitized = value
    .trim()
    .replace(/\s+/g, "")
    .replace(/\u00A0/g, "")
    .replace(/\(%\)|\(%\)/g, "");

  if (!sanitized) return null;

  let negative = false;
  let core = sanitized;

  if (core.startsWith("(") && core.endsWith(")")) {
    negative = true;
    core = core.slice(1, -1);
  }

  if (core.startsWith("-") || core.startsWith("−")) {
    negative = true;
    core = core.slice(1);
  }

  const hasDecimalComma = core.includes(",") && core.includes(".");
  const hasOnlyComma = core.includes(",") && !core.includes(".");
  const hasOnlyDot = core.includes(".") && !core.includes(",");

  if (hasDecimalComma) {
    const lastComma = core.lastIndexOf(",");
    const lastDot = core.lastIndexOf(".");
    if (lastComma > lastDot) {
      core = core.replace(/\./g, "").replace(",", ".");
    } else {
      core = core.replace(/,/g, "");
    }
  } else if (hasOnlyComma) {
    core = core.replace(/\./g, "").replace(",", ".");
  } else if (hasOnlyDot) {
    const parts = core.split(".");
    if (parts.length > 2) {
      core = parts.join("");
    }
  }

  const onlyNumbers = core.replace(/[^0-9.\-]/g, "");
  if (!onlyNumbers) return null;

  const parsed = Number.parseFloat(onlyNumbers);
  if (!Number.isFinite(parsed)) return null;

  return negative ? -parsed : parsed;
}

const DOCUMENT_PATTERNS: Array<{
  kind: DocumentKind;
  label: string;
  patterns: string[];
}> = [
  {
    kind: "Balanço Patrimonial",
    label: "Balanço Patrimonial",
    patterns: [
      "balanco patrimonial",
      "ativo",
      "passivo",
      "patrimonio liquido",
      "passivo circulante",
      "ativo circulante",
    ],
  },
  {
    kind: "Balanço Orçamentário",
    label: "Balanço Orçamentário",
    patterns: [
      "balanco orcamentario",
      "receita orcamentaria",
      "despesa orcamentaria",
      "receitas",
      "despesas",
      "resultado primario",
    ],
  },
  {
    kind: "Balanço Financeiro",
    label: "Balanço Financeiro",
    patterns: [
      "balanco financeiro",
      "inflow",
      "outflow",
      "receitas financeiras",
      "despesas financeiras",
      "vinculadas",
    ],
  },
  {
    kind: "DVP",
    label: "Demonstração das Variações Patrimoniais",
    patterns: [
      "variacoes patrimoniais",
      "dvp",
      "variacoes patrimoniais",
      "demonstracao das variacoes patrimoniais",
      "alteracao do patrimonio liquido",
    ],
  },
  {
    kind: "Movimento Numerário",
    label: "Demonstrativo do Movimento Numerário",
    patterns: [
      "movimento numerario",
      "numerario",
      "caixa",
      "bancos",
      "saldo do movimento",
    ],
  },
  {
    kind: "Restos a Pagar",
    label: "Memorial de Restos a Pagar",
    patterns: [
      "restos a pagar",
      "restos a pagar nao processados",
      "restos a pagar processados",
      "memorial",
    ],
  },
  {
    kind: "Despesa com Pessoal",
    label: "Demonstrativo da Despesa com Pessoal",
    patterns: [
      "despesa com pessoal",
      "folha de pagamento",
      "remuneracao",
      "encargos",
      "pessoal",
    ],
  },
  {
    kind: "RCL",
    label: "Receita Corrente Líquida",
    patterns: [
      "receita corrente liquida",
      "rcl",
      "receita liquida",
      "receita corrente líquida",
    ],
  },
];

export function detectDocumentType(rawText: string): ExtractionResult {
  const text = normalizeText(rawText);

  if (!text) {
    return {
      kind: "Indefinido",
      label: "Não identificado",
      confidence: 0,
      reason: "Documento vazio ou ilegível.",
    };
  }

  const scored = DOCUMENT_PATTERNS.map((definition) => {
    const score = definition.patterns.reduce((sum, pattern) => {
      const normalizedPattern = normalizeText(pattern);
      return sum + (text.includes(normalizedPattern) ? 1 : 0);
    }, 0);

    return { ...definition, score };
  }).sort((a, b) => b.score - a.score);

  const top = scored[0];
  if (!top || top.score === 0) {
    return {
      kind: "Indefinido",
      label: "Indefinido",
      confidence: 0.2,
      reason: "O texto não permitiu classificar com segurança o tipo do demonstrativo.",
    };
  }

  return {
    kind: top.kind,
    label: top.label,
    confidence: Math.min(0.96, 0.45 + top.score * 0.16),
    reason:
      top.score >= 2
        ? "Padrões contábeis compatíveis com o tipo identificado."
        : "Identificação parcial: revise o tipo do documento.",
  };
}

export function extractFinancialFields(rawText: string, fallbackKind?: DocumentKind): ExtractedField[] {
  const cleaned = rawText.replace(/\r/g, "\n").replace(/\t/g, " ");
  const lines = cleaned.split("\n");
  const matches: ExtractedField[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].trim();
    if (!line || line.length < 6) continue;

    const numberMatch = line.match(
      /([0-9]{1,3}(?:\.[0-9]{3})*(?:,\d{1,2})?|\d+(?:,\d{1,2})?|\(\s*[-\d.]{1,12}\s*\)|[-]?\d+(?:[.,]\d+)?)/,
    );
    if (!numberMatch) continue;

    const numberIndex = line.indexOf(numberMatch[0]);
    if (numberIndex <= 0) continue;

    const description = line.slice(0, numberIndex).replace(/[:=]/g, "").trim();
    const value = numberMatch[0].trim();
    const normalizedValue = parseBrazilianNumber(value);

    if (!description || normalizedValue === null) continue;

    matches.push({
      id: `${description}-${index}`,
      page: 1,
      description,
      value,
      normalizedValue,
      confidence: 0.78,
      status: normalizedValue === 0 ? "empty" : "ok",
    });
  }

  if (!matches.length && fallbackKind) {
    return [{
      id: "fallback",
      page: 1,
      description: `Identificação do documento: ${fallbackKind}`,
      value: "Documento processado sem valor financeiro localizado.",
      normalizedValue: null,
      confidence: 0.32,
      status: "warning",
    }];
  }

  return matches.slice(0, 8);
}
