import * as pdfjs from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import tesseractWorkerUrl from 'tesseract.js/dist/worker.min.js?url'
import { createWorker } from 'tesseract.js'
import { METRICS_BY_DOCUMENT } from './catalog'
import { parseBrazilianNumber } from './numbers'
import type { DocumentRecord, DocumentType, MetricKey } from '../types'

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl

export interface PdfPageReading {
  pageNumber: number
  method: 'text' | 'ocr' | 'empty'
  confidence: number | null
  rotation: number
  text: string
}

export interface PdfExtraction {
  text: string
  pageCount: number
  type: DocumentType | null
  fields: Partial<Record<MetricKey, number>>
  fieldSources: NonNullable<DocumentRecord['fieldSources']>
  pages: PdfPageReading[]
  warnings: string[]
}

export function hasUsefulExtraction(extraction: Pick<PdfExtraction, 'text' | 'type' | 'fields'>): boolean {
  return extraction.text.trim().length > 0
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

function extractFields(type: DocumentType | null, pages: PdfPageReading[]) {
  const fields: Partial<Record<MetricKey, number>> = {}
  const fieldSources: PdfExtraction['fieldSources'] = {}
  if (!type) return { fields, fieldSources }
  const lines = pages.flatMap((page) => page.text.split(/\r?\n/).filter(Boolean).map((text) => ({
    pageNumber: page.pageNumber,
    text,
    confidence: page.confidence,
  })))

  for (const metric of METRICS_BY_DOCUMENT[type]) {
    const aliases = metric.aliases.map(normalize).sort((a, b) => b.length - a.length)
    for (let index = 0; index < lines.length; index += 1) {
      const normalizedLine = normalize(lines[index].text)
      if (!aliases.some((alias) => normalizedLine.includes(alias))) continue

      const currencyMatches = lines[index].text.match(/R\$\s*\(?-?\d[\d.\s]*(?:,\d{1,2})?\)?/gi)
      const matches = currencyMatches ?? lines[index].text.match(/(?<![\w/])\(?-?\d[\d. ]*(?:,\d{1,2})?\)?(?![\w/])/g)
      const candidates = (matches ?? []).map((match) => match.trim())
      const value = candidates.length > 0 ? parseBrazilianNumber(candidates[candidates.length - 1]) : undefined
      if (value !== undefined) {
        fields[metric.key] = value
        fieldSources[metric.key] = {
          pageNumber: lines[index].pageNumber,
          originalDescription: lines[index].text,
          originalValue: candidates[candidates.length - 1],
          confidence: lines[index].confidence,
        }
      }
      break
    }
  }

  return { fields, fieldSources }
}

function passwordPrompt(reason: number): string | null {
  const promptText = reason === pdfjs.PasswordResponses.INCORRECT_PASSWORD
    ? 'A senha informada está incorreta. Digite novamente para abrir o PDF.'
    : 'Este PDF está protegido por senha. Digite a senha para continuar.'
  const password = window.prompt(promptText)
  return password?.trim() || null
}

export async function extractPdf(
  file: File,
  onOcrProgress?: (pageNumber: number, progress: number) => void,
): Promise<PdfExtraction> {
  const data = await file.arrayBuffer()
  const loadingTask = pdfjs.getDocument({ data })
  let ocrWorker: Awaited<ReturnType<typeof createWorker>> | undefined
  const warnings: string[] = []

  loadingTask.onPassword = (updatePassword: (password: string) => void, reason: number) => {
    const password = passwordPrompt(reason)
    if (password) {
      updatePassword(password)
    } else {
      void loadingTask.destroy()
    }
  }

  try {
    const pdfDocument = await loadingTask.promise
    const pageCount = pdfDocument.numPages
    const pages: PdfPageReading[] = []

    for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
      const page = await pdfDocument.getPage(pageNumber)
      const content = await page.getTextContent()
      const items = content.items.filter((item) => 'str' in item) as Array<{ str: string; transform?: number[] }>
      const selectableText = textLines(items).join('\n').trim()
      let pageText = selectableText
      let method: PdfPageReading['method'] = selectableText ? 'text' : 'empty'
      let confidence: number | null = null

      if (selectableText.length < 25) {
        try {
          ocrWorker ??= await createWorker('por', undefined, {
            workerPath: tesseractWorkerUrl,
            logger: (event) => {
              if (event.status === 'recognizing text') onOcrProgress?.(pageNumber, event.progress)
            },
          })
          const viewport = page.getViewport({ scale: 1.7 })
          const canvas = window.document.createElement('canvas')
          canvas.width = Math.ceil(viewport.width)
          canvas.height = Math.ceil(viewport.height)
          const context = canvas.getContext('2d')
          if (!context) throw new Error('Não foi possível preparar a página para OCR.')

          try {
            await page.render({ canvas, canvasContext: context, viewport }).promise
            const result = await ocrWorker.recognize(canvas, { rotateAuto: true })
            const recognizedText = result.data.text.trim()
            if (recognizedText) {
              pageText = recognizedText
              method = 'ocr'
              confidence = Math.max(0, Math.min(100, result.data.confidence)) / 100
            }
          } finally {
            canvas.width = 0
            canvas.height = 0
          }
        } catch (error) {
          const detail = error instanceof Error ? error.message : 'erro desconhecido'
          warnings.push(`Página ${pageNumber}: OCR indisponível (${detail}).`)
        }
      }

      if (!pageText) method = 'empty'
      pages.push({
        pageNumber,
        method,
        confidence,
        rotation: page.rotate,
        text: pageText,
      })
    }

    const text = pages.map((page) => page.text).filter(Boolean).join('\n')
    const type = inferDocumentType(file.name, text)
    const { fields, fieldSources } = extractFields(type, pages)
    return { text, pageCount, type, fields, fieldSources, pages, warnings }
  } catch (error) {
    if (error instanceof Error && error.name === 'PasswordException') {
      throw new Error('A leitura do PDF protegido foi cancelada ou a senha não foi aceita.')
    }
    if (error instanceof Error && error.name === 'InvalidPDFException') {
      throw new Error('O arquivo não parece ser um PDF íntegro ou está corrompido.')
    }
    throw error
  } finally {
    if (ocrWorker) await ocrWorker.terminate()
    await loadingTask.destroy()
  }
}
