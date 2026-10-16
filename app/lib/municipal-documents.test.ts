import { describe, expect, it } from "vitest";

import { detectDocumentType, extractFinancialFields, parseBrazilianNumber } from "./municipal-documents";

describe("municipal document parser", () => {
  it("normalizes Brazilian values", () => {
    expect(parseBrazilianNumber("1.234,56")).toBe(1234.56);
    expect(parseBrazilianNumber("(1.234,56)")).toBe(-1234.56);
    expect(parseBrazilianNumber("1,234.56")).toBe(1234.56);
    expect(parseBrazilianNumber("-567,89")).toBe(-567.89);
  });

  it("detects the correct demonstrative type", () => {
    const bp = detectDocumentType("BALANCO PATRIMONIAL ATIVO PASSIVO PATRIMONIO LIQUIDO");
    const rcl = detectDocumentType("RECEITA CORRENTE LIQUIDA RCL receitas e despesas");

    expect(bp.kind).toBe("Balanço Patrimonial");
    expect(rcl.kind).toBe("RCL");
    expect(detectDocumentType("texto sem referencia fiscal").kind).toBe("Indefinido");
  });

  it("extracts financial rows with descriptions", () => {
    const sampleText = `
    ATIVO CIRCULANTE 1.245.000,00
    PASSIVO CIRCULANTE 890.200,50
    PATRIMONIO LIQUIDO 354.799,50
    `;

    const extracted = extractFinancialFields(sampleText);
    expect(extracted.length).toBeGreaterThanOrEqual(2);
    expect(extracted[0]?.description).toContain("ATIVO");
    expect(extracted[0]?.normalizedValue).toBe(1245000);
  });
});
