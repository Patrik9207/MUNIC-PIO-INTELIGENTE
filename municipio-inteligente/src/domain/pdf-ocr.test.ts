import { beforeEach, describe, expect, it, vi } from 'vitest'

const pdfState = vi.hoisted(() => ({
  pageItems: [] as Array<Array<{ str: string; transform: number[] }>>,
  ocrText: '',
}))

const tesseractState = vi.hoisted(() => ({
  terminated: false,
}))

vi.mock('pdfjs-dist', () => ({
  GlobalWorkerOptions: {},
  PasswordResponses: { NEED_PASSWORD: 1, INCORRECT_PASSWORD: 2 },
  getDocument: () => ({
    promise: Promise.resolve({
      getPage: async (pageNumber: number) => ({
        rotate: pageNumber === 2 ? 90 : 0,
        getTextContent: async () => ({ items: pdfState.pageItems[pageNumber - 1] }),
        getViewport: () => ({ width: 20, height: 20 }),
        render: () => ({ promise: Promise.resolve() }),
      }),
      numPages: pdfState.pageItems.length,
    }),
    destroy: async () => undefined,
  }),
}))

vi.mock('tesseract.js', () => ({
  createWorker: async (_language: string, _oem: unknown, options: { logger: (event: { status: string; progress: number }) => void }) => {
    options.logger({ status: 'recognizing text', progress: 0.6 })
    return {
      recognize: async () => ({ data: { text: pdfState.ocrText, confidence: 88 } }),
      terminate: async () => { tesseractState.terminated = true },
    }
  },
}))

import { extractPdf } from './pdf'

function mockCanvasEnvironment() {
  const canvas = {
    width: 0,
    height: 0,
    getContext: () => ({}),
  }
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: { document: { createElement: () => canvas } },
  })
}

describe('extractPdf OCR fallback', () => {
  beforeEach(() => {
    pdfState.pageItems = []
    pdfState.ocrText = ''
    tesseractState.terminated = false
    mockCanvasEnvironment()
  })

  it('runs OCR on scanned pages, preserves page rotation and reports confidence', async () => {
    pdfState.pageItems = [[]]
    pdfState.ocrText = 'Receita Corrente Líquida R$ 1.234,56'
    const progress: number[] = []

    const result = await extractPdf(
      new File(['pdf'], 'relatorio.pdf', { type: 'application/pdf' }),
      (_page, value) => progress.push(value),
    )

    expect(result.type).toBe('rcl')
    expect(result.fields.rclValue).toBe(1234.56)
    expect(result.pages[0]).toMatchObject({ method: 'ocr', confidence: 0.88 })
    expect(progress).toContain(0.6)
    expect(tesseractState.terminated).toBe(true)
  })

  it('uses selectable text for text pages and OCR only on image pages in a mixed PDF', async () => {
    pdfState.pageItems = [
      [{ str: 'Balanço Orçamentário Receita realizada R$ 500,00', transform: [1, 0, 0, 1, 10, 10] }],
      [],
    ]
    pdfState.ocrText = 'Despesa empenhada R$ 300,00'

    const result = await extractPdf(new File(['pdf'], 'misto.pdf', { type: 'application/pdf' }))

    expect(result.type).toBe('bo')
    expect(result.pages.map((page) => page.method)).toEqual(['text', 'ocr'])
    expect(result.pages[1].rotation).toBe(90)
    expect(result.fields.budgetRevenueActual).toBe(500)
    expect(result.fields.expensesCommitted).toBe(300)
  })
})
