"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import {
  ArrowUpRight,
  Building2,
  CircleDollarSign,
  FileText,
  Filter,
  MapPinned,
  TrendingUp,
  Upload,
  X,
} from "lucide-react";

import { detectDocumentType, extractFinancialFields, REPORT_CATALOG, type DocumentKind, type ExtractedField } from "./lib/municipal-documents";
import { processPdfDocument, type ProcessedPdfDocument } from "./lib/document-processing";

type ReitRow = {
  symbol: string;
  name: string;
  sector: string;
  price: number | null;
  marketValue: number | null;
  liquidityAverage: number | null;
  dividendYield: number | null;
  dividendAnnual: Array<number | null>;
  occupancy: number | null;
  debtToAssets: number | null;
  change: number | null;
  ffoAnnual: Array<number | null>;
  ffoTypeAnnual?: Array<string | null>;
  ffoLatest: number | null;
};

type UploadStatus = "idle" | "processing" | "done" | "warning" | "error";

type ReportAttachment = {
  file: File | null;
  name: string;
  size: number;
  status: UploadStatus;
  message: string;
  previewUrl: string;
  documentType: DocumentKind | "Complementar" | "Indefinido";
  confidence: number;
  extractedFields: ExtractedField[];
  textPreview: string;
  error?: string;
};

type ComplementaryUpload = {
  id: string;
  file: File | null;
  name: string;
  size: number;
  previewUrl: string;
  status: UploadStatus;
  message: string;
};

function formatMetric(value: number | null, suffix = "") {
  if (value === null || Number.isNaN(value)) return "N/D";
  return `${value.toFixed(2)}${suffix}`;
}

function averageMetric(values: Array<number | null>) {
  const available = values.filter((value): value is number => value !== null && Number.isFinite(value));
  if (!available.length) return null;
  return available.reduce((sum, value) => sum + value, 0) / available.length;
}

function ffoSourceLabel(source: string | null | undefined) {
  if (source === "ESTIMATED") return "Estimativa SEC com D&A imobiliário e ajuste por ganhos de venda identificados";
  if (source === "ESTIMATED_PARTIAL") return "Estimativa SEC parcial: D&A agregado ou ganhos de venda não identificados";
  if (source === "AFFO") return "AFFO reportado pela empresa (usado como fallback)";
  if (source === "FFO") return "FFO reportado pela empresa (usado como fallback)";
  return "Estimativa não disponível";
}

function formatFileSize(value: number) {
  if (value <= 0) return "0 KB";
  const units = ["B", "KB", "MB", "GB"];
  const unitIndex = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
  const size = value / 1024 ** unitIndex;
  return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

const annualYears = [2022, 2023, 2024, 2025, 2026];

type SortKey =
  | "symbol"
  | "sector"
  | "price"
  | "marketValue"
  | "liquidityAverage"
  | "dividendYield"
  | "occupancy"
  | "debtToAssets"
  | "change"
  | `ffo-${number}`
  | `div-${number}`;
type SortDirection = "asc" | "desc";

const initialReportFiles = () => {
  const indexed: Record<string, ReportAttachment> = {};
  for (const item of REPORT_CATALOG) {
    indexed[item.key] = {
      file: null,
      name: "",
      size: 0,
      status: "idle",
      message: "Nenhum arquivo anexado.",
      previewUrl: "",
      documentType: "Indefinido",
      confidence: 0,
      extractedFields: [],
      textPreview: "",
    };
  }
  return indexed;
};

function Page() {
  const [rows, setRows] = useState<ReitRow[]>([]);
  const [selectedSector, setSelectedSector] = useState("Todos");
  const [sortKey, setSortKey] = useState<SortKey>("symbol");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [municipio, setMunicipio] = useState("Município Inteligente");
  const [exercicio, setExercicio] = useState("2025");
  const [periodo, setPeriodo] = useState("Anual");
  const [reportFiles, setReportFiles] = useState<Record<string, ReportAttachment>>(initialReportFiles);
  const [complementaryFiles, setComplementaryFiles] = useState<ComplementaryUpload[]>([]);
  const [processingSummary, setProcessingSummary] = useState<string[]>([]);
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection((direction) => (direction === "asc" ? "desc" : "asc"));
      return;
    }

    setSortKey(key);
    setSortDirection("asc");
  };

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch("/api/reits");
        if (!response.ok) throw new Error("Não foi possível carregar os dados de mercado.");

        const marketRows: ReitRow[] = await response.json();
        setRows(marketRows);
        setLoadError(null);
      } catch {
        setRows([]);
        setLoadError("Não foi possível carregar os dados de mercado. Tente novamente mais tarde.");
      } finally {
        setLoading(false);
      }

      try {
        const fundamentalsResponse = await fetch("/api/reits?fundamentals=1");
        if (!fundamentalsResponse.ok) return;

        const fundamentalsRows: Array<Pick<ReitRow, "symbol" | "occupancy" | "debtToAssets" | "ffoAnnual" | "ffoTypeAnnual">> =
          await fundamentalsResponse.json();
        const fundamentalsBySymbol = new Map<string, Partial<ReitRow>>();

        fundamentalsRows.forEach((item) => fundamentalsBySymbol.set(item.symbol, item));
        setRows((currentRows) =>
          currentRows.map((item) => ({
            ...item,
            ...(fundamentalsBySymbol.get(item.symbol) ?? {}),
          })),
        );
      } catch {
        // Keep the live market data and spreadsheets if fundamentals are unavailable.
      }
    };

    load();
  }, []);

  const sectors = ["Todos", ...Array.from(new Set(rows.map((item) => item.sector).filter(Boolean)))];

  const visibleReits = useMemo(() => {
    const filtered =
      selectedSector === "Todos" ? [...rows] : rows.filter((item) => item.sector === selectedSector);

    return [...filtered].sort((a, b) => {
      const getValue = (row: ReitRow): number | string | null => {
        if (sortKey === "symbol" || sortKey === "sector") return row[sortKey];
        if (sortKey === "price" || sortKey === "marketValue" || sortKey === "liquidityAverage" || sortKey === "dividendYield" || sortKey === "occupancy" || sortKey === "debtToAssets" || sortKey === "change") {
          return row[sortKey];
        }
        if (sortKey.startsWith("ffo-")) return row.ffoAnnual[Number(sortKey.slice(4))] ?? null;
        return row.dividendAnnual[Number(sortKey.slice(4))] ?? null;
      };

      const left = getValue(a);
      const right = getValue(b);
      let result = 0;

      if (left === null && right !== null) result = 1;
      else if (left !== null && right === null) result = -1;
      else if (typeof left === "string" && typeof right === "string") result = left.localeCompare(right);
      else result = Number(left ?? 0) - Number(right ?? 0);

      return sortDirection === "asc" ? result : -result;
    });
  }, [rows, selectedSector, sortDirection, sortKey]);

  const averageYield = averageMetric(rows.map((item) => item.dividendYield));
  const averageLiquidity = averageMetric(rows.map((item) => item.liquidityAverage));
  const averageOccupancy = averageMetric(rows.map((item) => item.occupancy));

  const formatCurrencyMetric = (value: number | null) => {
    if (value === null || Number.isNaN(value)) return "N/D";
    return `$${value.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  };

  const statValues = [
    { label: "REITs listados", value: `${rows.length}`, icon: Building2, delta: rows.length ? "+" : "—" },
    { label: "Yield médio", value: formatMetric(averageYield, "%"), icon: TrendingUp, delta: "—" },
    { label: "Liquidez média", value: formatCurrencyMetric(averageLiquidity), icon: CircleDollarSign, delta: "—" },
    { label: "Ocupação média", value: formatMetric(averageOccupancy, "%"), icon: MapPinned, delta: "—" },
  ];

  const exportToExcel = () => {
    if (!rows.length) return;

    const exportRows = rows.map((reit) => {
      const row: Record<string, number | string | null> = {
        Ticker: reit.symbol,
        Setor: reit.sector || "N/D",
        Preço: reit.price ?? null,
        "Valor de mercado": reit.marketValue ?? null,
        "Liquidez média/dia": reit.liquidityAverage ?? null,
        "Dividend yield": reit.dividendYield ?? null,
        Ocupação: reit.occupancy ?? null,
        "Dívida/Ativo": reit.debtToAssets ?? null,
      };

      annualYears.forEach((year) => {
        row[`FFO/Ação est. ${year}`] = reit.ffoAnnual[year - 2022] ?? null;
        row[`Fonte FFO/Ação ${year}`] = ffoSourceLabel(reit.ffoTypeAnnual?.[year - 2022]);
        row[`Dividendos/Ação ${year}`] = reit.dividendAnnual[year - 2022] ?? null;
      });

      return row;
    });

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "REITs");
    XLSX.writeFile(workbook, "america-real-estate-reits.xlsx");
  };

  const openFilePicker = (key: string) => {
    inputRefs.current[key]?.click();
  };

  const applyFileSelection = async (key: string, fileList: File | FileList | null) => {
    const selectedFile = fileList instanceof File ? fileList : fileList?.[0] ?? null;
    if (!selectedFile) return;

    if (selectedFile.type !== "application/pdf" && !selectedFile.name.toLowerCase().endsWith(".pdf")) {
      setReportFiles((current) => ({
        ...current,
        [key]: {
          ...current[key],
          status: "error",
          name: selectedFile.name,
          size: selectedFile.size,
          message: "Formato inválido. Envie apenas arquivos PDF.",
          error: "Formato inválido. Envie apenas arquivos PDF.",
        },
      }));
      return;
    }

    if (selectedFile.size > 20 * 1024 * 1024) {
      setReportFiles((current) => ({
        ...current,
        [key]: {
          ...current[key],
          status: "error",
          name: selectedFile.name,
          size: selectedFile.size,
          message: "Arquivo excede 20 MB. Reduza o tamanho ou use um documento menor.",
          error: "Arquivo excedeu o limite.",
        },
      }));
      return;
    }

    const previewUrl = URL.createObjectURL(selectedFile);
    setReportFiles((current) => ({
      ...current,
      [key]: {
        ...current[key],
        file: selectedFile,
        name: selectedFile.name,
        size: selectedFile.size,
        status: "processing",
        message: "Validando o documento e extraindo os dados...",
        previewUrl,
        documentType: "Indefinido",
        confidence: 0,
        extractedFields: [],
        textPreview: "",
      },
    }));

    try {
      const processed: ProcessedPdfDocument = await processPdfDocument(selectedFile);
      const classification = processed.classification;
      const extractedFields = processed.fields;

      setReportFiles((current) => ({
        ...current,
        [key]: {
          ...current[key],
          file: selectedFile,
          name: selectedFile.name,
          size: selectedFile.size,
          status: extractedFields.length ? "done" : "warning",
          message: extractedFields.length
            ? `Leitura concluída: ${classification.label}.`
            : "Leitura concluída, mas não foi possível localizar valores financeiros confiáveis.",
          previewUrl,
          documentType: classification.kind,
          confidence: classification.confidence,
          extractedFields,
          textPreview: processed.text.slice(0, 240),
          error: processed.warnings.length ? processed.warnings.join(" ") : undefined,
        },
      }));

      setProcessingSummary((current) => [
        ...current.filter((item) => !item.includes(selectedFile.name)),
        `${selectedFile.name}: ${classification.label} (${classification.confidence.toFixed(2)} de confiança)`,
      ]);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Não foi possível processar o arquivo.";
      setReportFiles((current) => ({
        ...current,
        [key]: {
          ...current[key],
          status: "error",
          message: errorMessage,
          error: errorMessage,
          previewUrl,
        },
      }));
      setProcessingSummary((current) => [
        ...current.filter((item) => !item.includes(selectedFile.name)),
        `${selectedFile.name}: erro de leitura — ${errorMessage}`,
      ]);
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>, key: string) => {
    event.preventDefault();
    event.stopPropagation();
    applyFileSelection(key, event.dataTransfer.files);
  };

  const removeReportFile = (key: string) => {
    setReportFiles((current) => ({
      ...current,
      [key]: {
        ...current[key],
        file: null,
        name: "",
        size: 0,
        status: "idle",
        message: "Nenhum arquivo anexado.",
        previewUrl: "",
        documentType: "Indefinido",
        confidence: 0,
        extractedFields: [],
        textPreview: "",
        error: undefined,
      },
    }));
  };

  const handleComplementarySelection = async (fileList: FileList | null) => {
    if (!fileList) return;
    const nextFiles: ComplementaryUpload[] = Array.from(fileList).map((file) => ({
      id: `${file.name}-${file.size}-${Date.now()}`,
      file,
      name: file.name,
      size: file.size,
      previewUrl: file.type === "application/pdf" ? URL.createObjectURL(file) : "",
      status: file.type === "application/pdf" ? "done" : "warning",
      message: file.type === "application/pdf" ? "Arquivo anexado e pronto para conferência." : "Arquivo anexado, mas o tipo não foi identificado como PDF.",
    }));
    setComplementaryFiles((current) => [...current, ...nextFiles]);
  };

  const processedCount = Object.values(reportFiles).filter((item) => item.status === "done" || item.status === "warning").length;
  const warningCount = Object.values(reportFiles).filter((item) => item.status === "warning" || item.status === "error").length;

  const conferenceRows = Object.entries(reportFiles)
    .flatMap(([key, item]) => item.extractedFields.map((field) => ({
      reportKey: key,
      reportName: REPORT_CATALOG.find((entry) => entry.key === key)?.label ?? "Complementar",
      ...field,
    })));

  const exportSummary = () => {
    const payload = Object.entries(reportFiles)
      .filter(([, item]) => item.file)
      .map(([key, item]) => ({
        key,
        name: item.name,
        kind: item.documentType,
        confidence: item.confidence,
        status: item.status,
        fields: item.extractedFields.map((field) => ({
          description: field.description,
          value: field.value,
          normalizedValue: field.normalizedValue,
          confidence: field.confidence,
          status: field.status,
        })),
      }));

    const blob = new Blob([JSON.stringify({ municipio, exercicio, periodo, payload }, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "municipio-inteligente-resumo.json";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="page-shell py-6 md:py-8">
      <div className="reveal">
        <header className="panel mb-6 flex items-center justify-between gap-4 px-4 py-3 md:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[rgba(38,106,255,0.12)] text-[#2563eb]">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-[#6b7280]">Município</div>
              <div className="text-base font-semibold text-[#0f172a]">Inteligente</div>
            </div>
          </div>

          <div className="hidden items-center gap-6 text-sm text-[#334155] md:flex">
            <span>Processamento local</span>
            <span>OCR inclusivo</span>
            <span>Conferência manual</span>
          </div>
        </header>

        <section className="panel mb-6 p-4 md:p-6">
          <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="eyebrow">Identificação</div>
              <h1 className="mt-1 text-2xl font-semibold text-[#0f172a] md:text-3xl">Gestão contábil e financeira municipal</h1>
            </div>
            <button type="button" onClick={exportSummary} className="inline-flex items-center gap-2 rounded-full border border-[#2563eb] bg-[#eff6ff] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#1d4ed8]">
              Exportar resumo
              <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <label className="flex flex-col gap-2 text-sm font-medium text-[#334155]">
              Município
              <input value={municipio} onChange={(event) => setMunicipio(event.target.value)} className="rounded-xl border border-[#cbd5e1] bg-white px-3 py-2.5 text-[#0f172a] outline-none ring-0 transition focus:border-[#2563eb]" />
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium text-[#334155]">
              Exercício
              <input value={exercicio} onChange={(event) => setExercicio(event.target.value)} className="rounded-xl border border-[#cbd5e1] bg-white px-3 py-2.5 text-[#0f172a] outline-none focus:border-[#2563eb]" />
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium text-[#334155]">
              Período
              <input value={periodo} onChange={(event) => setPeriodo(event.target.value)} className="rounded-xl border border-[#cbd5e1] bg-white px-3 py-2.5 text-[#0f172a] outline-none focus:border-[#2563eb]" />
            </label>
          </div>
        </section>

        <section className="panel mb-6 p-4 md:p-6">
          <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="eyebrow">Upload dos demonstrativos</div>
              <h2 className="mt-1 text-xl font-semibold text-[#0f172a]">Relatórios financeiros e contábeis</h2>
            </div>
            <button type="button" onClick={() => {
              Object.entries(reportFiles).forEach(([key, item]) => {
                if (item.file) {
                  void applyFileSelection(key, item.file);
                }
              });
            }} className="inline-flex items-center gap-2 rounded-full border border-[#2563eb] bg-[#2563eb] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-white">
              <Upload className="h-3.5 w-3.5" />
              Importar todos
            </button>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {REPORT_CATALOG.map((item) => {
              const current = reportFiles[item.key];
              return (
                <div key={item.key} className="rounded-2xl border border-[#dbeafe] bg-[#f8fbff] p-3">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#64748b]">{item.short}</div>
                      <h3 className="text-sm font-semibold text-[#0f172a]">{item.label}</h3>
                    </div>
                    <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${current.status === "done" ? "bg-emerald-100 text-emerald-700" : current.status === "warning" ? "bg-amber-100 text-amber-700" : current.status === "error" ? "bg-rose-100 text-rose-700" : current.status === "processing" ? "bg-sky-100 text-sky-700" : "bg-slate-100 text-slate-600"}`}>
                      {current.status === "idle" ? "Pendente" : current.status === "processing" ? "Processando" : current.status === "done" ? "Concluído" : current.status === "warning" ? "Aviso" : current.status === "error" ? "Erro" : "—"}
                    </span>
                  </div>

                  <div
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => handleDrop(event, item.key)}
                    className="rounded-2xl border-2 border-dashed border-[#bfdbfe] bg-white p-3 transition hover:border-[#60a5fa]"
                  >
                    <input ref={(element) => { inputRefs.current[item.key] = element; }} type="file" accept="application/pdf" className="hidden" onChange={(event) => void applyFileSelection(item.key, event.target.files)} />
                    {current.file ? (
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-medium text-[#0f172a]">{current.name}</div>
                            <div className="text-xs text-[#64748b]">{formatFileSize(current.size)}</div>
                          </div>
                          <button type="button" onClick={() => removeReportFile(item.key)} className="rounded-full bg-slate-100 p-1 text-slate-500 hover:bg-slate-200">
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="flex gap-2">
                          <button type="button" onClick={() => openFilePicker(item.key)} className="rounded-full border border-[#cbd5e1] px-2.5 py-1.5 text-xs font-medium text-[#334155]">Substituir</button>
                          {current.previewUrl ? (
                            <button type="button" onClick={() => window.open(current.previewUrl, "_blank", "noopener,noreferrer")} className="rounded-full border border-[#bfdbfe] bg-[#eff6ff] px-2.5 py-1.5 text-xs font-medium text-[#1d4ed8]">Prévia</button>
                          ) : null}
                        </div>
                        <div className="rounded-xl bg-[#f8fafc] p-2 text-xs text-[#475569]">
                          <div className="font-medium text-[#0f172a]">Processamento</div>
                          <div className="mt-1">{current.message}</div>
                          {current.documentType !== "Indefinido" ? <div className="mt-1 text-[#1d4ed8]">Tipo: {current.documentType}</div> : null}
                        </div>
                      </div>
                    ) : (
                      <button type="button" onClick={() => openFilePicker(item.key)} className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-[#bfdbfe] bg-[#f8fbff] p-6 text-center text-[#475569]">
                        <Upload className="h-5 w-5 text-[#2563eb]" />
                        <span className="text-sm font-medium text-[#0f172a]">Selecionar PDF</span>
                        <span className="text-xs">Arraste e solte ou escolha um arquivo</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="panel mb-6 p-4 md:p-6">
          <div className="mb-4">
            <div className="eyebrow">Documentos complementares</div>
            <h2 className="mt-1 text-xl font-semibold text-[#0f172a]">Relatórios extras ou não previstos</h2>
          </div>
          <div className="rounded-2xl border border-dashed border-[#bfdbfe] bg-[#f8fbff] p-4">
            <input type="file" accept="application/pdf" multiple className="hidden" id="complementary-upload" onChange={(event) => void handleComplementarySelection(event.target.files)} />
            <label htmlFor="complementary-upload" className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-[#bfdbfe] bg-white p-6 text-center text-[#475569]">
              <FileText className="h-5 w-5 text-[#2563eb]" />
              <span className="text-sm font-medium text-[#0f172a]">Adicionar documentos complementares</span>
              <span className="text-xs">PDFs não previstos na tabela ou anexos auxiliares</span>
            </label>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {complementaryFiles.length ? complementaryFiles.map((entry) => (
              <div key={entry.id} className="rounded-2xl border border-[#dbeafe] bg-[#f8fbff] p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="truncate text-sm font-medium text-[#0f172a]">{entry.name}</div>
                  <button type="button" onClick={() => setComplementaryFiles((current) => current.filter((item) => item.id !== entry.id))} className="rounded-full bg-slate-100 p-1 text-slate-500"><X className="h-4 w-4" /></button>
                </div>
                <div className="mt-2 text-xs text-[#64748b]">{formatFileSize(entry.size)}</div>
                <div className="mt-3 rounded-xl bg-white p-2 text-xs text-[#475569]">{entry.message}</div>
              </div>
            )) : <div className="col-span-full rounded-xl border border-[#e2e8f0] bg-slate-50 p-3 text-sm text-[#64748b]">Nenhum documento complementar anexado.</div>}
          </div>
        </section>

        <section className="panel mb-6 p-4 md:p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <div className="eyebrow">Situação do processamento</div>
              <h2 className="mt-1 text-xl font-semibold text-[#0f172a]">Status geral da leitura</h2>
            </div>
            <div className="rounded-full bg-[#eff6ff] px-3 py-1 text-xs font-semibold text-[#1d4ed8]">{processedCount}/{REPORT_CATALOG.length} concluídos</div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-[#dbeafe] bg-[#f8fbff] p-4">
              <div className="text-xs uppercase tracking-[0.12em] text-[#64748b]">Concluídos</div>
              <div className="mt-2 text-2xl font-semibold text-[#0f172a]">{processedCount}</div>
            </div>
            <div className="rounded-2xl border border-[#dbeafe] bg-[#f8fbff] p-4">
              <div className="text-xs uppercase tracking-[0.12em] text-[#64748b]">Avisos</div>
              <div className="mt-2 text-2xl font-semibold text-[#0f172a]">{warningCount}</div>
            </div>
            <div className="rounded-2xl border border-[#dbeafe] bg-[#f8fbff] p-4">
              <div className="text-xs uppercase tracking-[0.12em] text-[#64748b]">Arquivos válidos</div>
              <div className="mt-2 text-2xl font-semibold text-[#0f172a]">{Object.values(reportFiles).filter((item) => item.file).length}</div>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-[#e2e8f0] bg-slate-50 p-3">
            {processingSummary.length ? processingSummary.map((entry) => (
              <div key={entry} className="border-b border-slate-200 py-2 text-sm text-[#334155] last:border-0">{entry}</div>
            )) : <div className="text-sm text-[#64748b]">Aguardando envio dos relatórios.</div>}
          </div>
        </section>

        <section className="panel mb-6 p-4 md:p-6">
          <div className="mb-4">
            <div className="eyebrow">Conferência</div>
            <h2 className="mt-1 text-xl font-semibold text-[#0f172a]">Dados extraídos e necessidade de correção</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm text-[#334155]">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-[0.12em] text-[#64748b]">
                  <th className="px-3 py-2">Documento</th>
                  <th className="px-3 py-2">Página</th>
                  <th className="px-3 py-2">Descrição</th>
                  <th className="px-3 py-2">Valor</th>
                  <th className="px-3 py-2">Confiabilidade</th>
                  <th className="px-3 py-2">Correção</th>
                </tr>
              </thead>
              <tbody>
                {conferenceRows.length ? conferenceRows.map((row) => (
                  <tr key={`${row.reportKey}-${row.id}`} className="border-b border-slate-100">
                    <td className="px-3 py-3 font-medium text-[#0f172a]">{row.reportName}</td>
                    <td className="px-3 py-3">{row.page}</td>
                    <td className="px-3 py-3">{row.description}</td>
                    <td className="px-3 py-3">{row.value}</td>
                    <td className="px-3 py-3">{row.confidence.toFixed(2)}</td>
                    <td className="px-3 py-3">
                      <input value={row.value} onChange={() => undefined} className="w-28 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-[#0f172a] outline-none focus:border-[#2563eb]" />
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan={6} className="px-3 py-6 text-center text-[#64748b]">Nenhum dado extraído até o momento.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="panel mb-6 p-4 md:p-6">
          <div className="mb-4">
            <div className="eyebrow">Indicadores e inconsistências</div>
            <h2 className="mt-1 text-xl font-semibold text-[#0f172a]">Resumo executivo</h2>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <div className="rounded-2xl border border-[#dbeafe] bg-[#f8fbff] p-4">
              <div className="text-xs uppercase tracking-[0.12em] text-[#64748b]">Total de PDFs</div>
              <div className="mt-2 text-2xl font-semibold text-[#0f172a]">{Object.values(reportFiles).filter((item) => item.file).length}</div>
            </div>
            <div className="rounded-2xl border border-[#dbeafe] bg-[#f8fbff] p-4">
              <div className="text-xs uppercase tracking-[0.12em] text-[#64748b]">Média de confiança</div>
              <div className="mt-2 text-2xl font-semibold text-[#0f172a]">{conferenceRows.length ? (conferenceRows.reduce((sum, item) => sum + item.confidence, 0) / conferenceRows.length).toFixed(2) : "0.00"}</div>
            </div>
            <div className="rounded-2xl border border-[#dbeafe] bg-[#f8fbff] p-4">
              <div className="text-xs uppercase tracking-[0.12em] text-[#64748b]">Documentos pendentes</div>
              <div className="mt-2 text-2xl font-semibold text-[#0f172a]">{REPORT_CATALOG.length - processedCount}</div>
            </div>
            <div className="rounded-2xl border border-[#dbeafe] bg-[#f8fbff] p-4">
              <div className="text-xs uppercase tracking-[0.12em] text-[#64748b]">Interpretação</div>
              <div className="mt-2 text-lg font-semibold text-[#0f172a]">Local e rastreável</div>
            </div>
          </div>
        </section>

        <section className="panel mb-6 p-4 md:p-6">
          <div className="mb-4">
            <div className="eyebrow">Diagnóstico e exportação</div>
            <h2 className="mt-1 text-xl font-semibold text-[#0f172a]">Relatório consolidado</h2>
          </div>
          <div className="rounded-2xl border border-[#dbeafe] bg-[#f8fbff] p-4 text-sm text-[#334155]">
            <p className="leading-7">A análise municipal utiliza leitura local de PDF, detecção do tipo do demonstrativo e extração de valores com rastreabilidade. Quando um documento não puder ser lido por texto selecionável, o sistema faz OCR local e indica a confiabilidade da leitura. Os cálculos são realizados por fórmulas determinísticas e as informações divergentes ficam disponíveis para revisão manual antes da geração do relatório final.</p>
          </div>
        </section>
      </div>
    </main>
  );
}

export default Page;
