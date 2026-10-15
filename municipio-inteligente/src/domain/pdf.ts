import * as pdfjs from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { METRICS_BY_DOCUMENT } from './catalog'
import { parseBrazilianNumber } from './numbers'
import type { DocumentType, MetricKey } from '../types'

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl

export interface PdfExtraction {
  text: string
  pageCount: number
  type: DocumentType | null
  fields: Partial<Record<MetricKey, number>>
}

function normalize(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

function inferDocumentType(filename: string, text: string): DocumentType | null {
  const content = normalize(`${filename} ${text.slice(0, 12000)}`)
  const rules: Array<[DocumentType, RegExp]> = [
    ['pessoal', /despesa.{0,30}pessoal|pessoal.{0,30}rgf|demonstrativo.{0,30}pessoal/],
    ['rcl', /receita corrente liquida|\brcl\b/],
    ['restos', /restos a pagar|memorial.{0,20}restos/],
    ['numerario', /movimento numerario|demonstrativo.{0,20}numerario/],
    ['dvp', /demonstracao das variacoes patrimoniais|\bdvp\b/],
    ['bf', /balanco financeiro|\bbf\b/],
    ['bo', /balanco orcamentario|\bbo\b/],
    ['bp', /balanco patrimonial|\bbp\b/],
  ]

  return rules.find(([, pattern]) => pattern.test(content))?.[0] ?? null
}

function textLines(items: Array<{ str: string; transform?: number[] }>): string[] {
  const lines = new Map<number, Array<{ x: number; text: string }>>()

  for (const item of items) {
    const y = item.transform?.[5] ?? 0
    const x = item.transform?.[4] ?? 0
    const key = Math.round(y / 3) * 3
    const line = lines.get(key) ?? []
    line.push({ x, text: item.str })
    lines.set(key, line)
  }

  return [...lines.entries()]
    .sort(([a], [b]) => b - a)
    .map(([, parts]) => parts.sort((a, b) => a.x - b.x).map((part) => part.text).join(' ').trim())
    .filter(Boolean)
}

function extractFields(type: DocumentType | null, lines: string[]): Partial<Record<MetricKey, number>> {
  if (!type) return {}
  const fields: Partial<Record<MetricKey, number>> = {}

  for (const metric of METRICS_BY_DOCUMENT[type]) {
    const aliases = metric.aliases.map(normalize).sort((a, b) => b.length - a.length)
    for (let index = 0; index < lines.length; index += 1) {
      const normalizedLine = normalize(lines[index])
      if (!aliases.some((alias) => normalizedLine.includes(alias))) continue

      const candidates = [lines[index]].flatMap((line) => {
        const currencyMatches = line.match(/R\$\s*\(?-?\d[\d.\s]*(?:,\d{1,2})?\)?/gi)
        const matches = currencyMatches ?? line.match(/(?<![\w/])\(?-?\d[\d. ]*(?:,\d{1,2})?\)?(?![\w/])/g)
        return (matches ?? []).map((match) => match.trim())
      })
      const value = candidates.length > 0 ? parseBrazilianNumber(candidates[candidates.length - 1]) : undefined
      if (value !== undefined) fields[metric.key] = value
      break
    }
  }

  return fields
}

export async function extractPdf(file: File): Promise<PdfExtraction> {
  const data = await file.arrayBuffer()
  const loadingTask = pdfjs.getDocument({ data })
  const document = await loadingTask.promise
  const pageCount = document.numPages
  const pageText: string[] = []

  try {
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber)
      const content = await page.getTextContent()
      const items = content.items.filter((item) => 'str' in item) as Array<{ str: string; transform?: number[] }>
      pageText.push(...textLines(items))
    }
  } finally {
    await loadingTask.destroy()
  }

  const text = pageText.join('\n')
  const type = inferDocumentType(file.name, text)
  return { text, pageCount, type, fields: extractFields(type, pageText) }
}
