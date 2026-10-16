import Tesseract from "tesseract.js";
import * as pdfjsLib from "pdfjs-dist";

import { detectDocumentType, extractFinancialFields, type ExtractedField } from "./municipal-documents";

export type PdfProcessingMethod = "text" | "ocr" | "mixed";

export type PdfPageResult = {
  pageNumber: number;
  text: string;
  hasExtractableText: boolean;
  confidence: number;
  method: "pdfjs" | "ocr";
};

export type ProcessedPdfDocument = {
  text: string;
  pages: PdfPageResult[];
  method: PdfProcessingMethod;
  warnings: string[];
  classification: ReturnType<typeof detectDocumentType>;
  fields: ExtractedField[];
};

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();

async function getTextFromPdf(file: File) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const pages: PdfPageResult[] = [];
  const chunks: string[] = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const textContent = await page.getTextContent();
    const text = textContent.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();

    const hasExtractableText = text.length > 0;
    pages.push({
      pageNumber,
      text,
      hasExtractableText,
      confidence: hasExtractableText ? 0.86 : 0.42,
      method: hasExtractableText ? "pdfjs" : "ocr",
    });
    chunks.push(`Página ${pageNumber}: ${text || "[sem texto extraível]"}`);
  }

  return { pages, text: chunks.join("\n\n") };
}

async function runOcrFallback(file: File) {
  const ocrResult = await Tesseract.recognize(file, "por", {
    logger: () => undefined,
  });
  return ocrResult.data.text ?? "";
}

export async function processPdfDocument(file: File): Promise<ProcessedPdfDocument> {
  if (!file.name.toLowerCase().endsWith(".pdf")) {
    throw new Error("Somente arquivos PDF podem ser processados.");
  }

  if (file.size === 0) {
    throw new Error("O arquivo enviado está vazio.");
  }

  if (file.size > 20 * 1024 * 1024) {
    throw new Error("Arquivo excede 20 MB.");
  }

  let pages: PdfPageResult[] = [];
  let extractedText = "";
  const warnings: string[] = [];

  try {
    const pdfText = await getTextFromPdf(file);
    pages = pdfText.pages;
    extractedText = pdfText.text;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao extrair texto do PDF.";
    warnings.push(message);
    extractedText = "";
  }

  let method: PdfProcessingMethod = "text";
  if (!extractedText || pages.some((page) => !page.hasExtractableText)) {
    try {
      const ocrText = await runOcrFallback(file);
      if (ocrText.trim()) {
        extractedText = extractedText ? `${extractedText}\n\n--- OCR ---\n${ocrText}` : ocrText;
        method = extractedText && pages.some((page) => !page.hasExtractableText) ? "mixed" : "ocr";
      } else {
        warnings.push("OCR não encontrou texto suficiente para leitura confiável.");
      }
    } catch {
      warnings.push("Não foi possível concluir a leitura por OCR local.");
    }
  }

  if (!extractedText.trim()) {
    throw new Error("O PDF não contém texto legível nem foi possível executar OCR local.");
  }

  if (pages.length === 0) {
    pages = [{
      pageNumber: 1,
      text: extractedText,
      hasExtractableText: true,
      confidence: 0.55,
      method: "ocr",
    }];
  }

  const classification = detectDocumentType(extractedText);
  const fields = extractFinancialFields(extractedText, classification.kind);

  return {
    text: extractedText,
    pages,
    method,
    warnings,
    classification,
    fields,
  };
}
