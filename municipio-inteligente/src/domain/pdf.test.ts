import { jsPDF } from 'jspdf'
import * as pdfjs from 'pdfjs-dist'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { extractPdf, hasUsefulExtraction } from './pdf'

vi.mock('pdfjs-dist', async () => import('pdfjs-dist/legacy/build/pdf.mjs'))

beforeAll(() => {
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    '../../node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs',
    import.meta.url,
  ).toString()
})

function makePdfFile(name: string, content: string[]): File {
  const pdf = new jsPDF()
  content.forEach((line, index) => pdf.text(line, 18, 20 + index * 10))
  return new File([pdf.output('arraybuffer')], name, { type: 'application/pdf' })
}

describe('extractPdf', () => {
  it('extracts selectable text, classifies a report, and keeps its source page', async () => {
    const file = makePdfFile('relatorio.pdf', [
      'Balanço Orçamentário',
      'Receita realizada R$ 1.234,56',
    ])

    const result = await extractPdf(file)

    expect(result.type).toBe('bo')
    expect(result.pageCount).toBe(1)
    expect(result.fields.budgetRevenueActual).toBe(1234.56)
    expect(result.fieldSources.budgetRevenueActual).toMatchObject({
      pageNumber: 1,
      originalValue: 'R$ 1.234,56',
    })
    expect(result.pages[0]).toMatchObject({ pageNumber: 1, method: 'text' })
  })

  it('rejects a corrupt PDF with a clear error', async () => {
    const file = new File(['not a PDF'], 'corrompido.pdf', { type: 'application/pdf' })

    await expect(extractPdf(file)).rejects.toThrow()
  })

  it('treats empty content as not useful and requires manual review', () => {
    expect(hasUsefulExtraction({ text: '', type: null, fields: {} })).toBe(false)
    expect(hasUsefulExtraction({ text: 'Receita', type: null, fields: {} })).toBe(true)
    expect(hasUsefulExtraction({ text: 'Texto sem campos', type: 'bo', fields: {} })).toBe(true)
  })

  it('reads values even when the label and number are split across adjacent lines in a table', async () => {
    const pdf = new jsPDF()
    pdf.text('Balanço Orçamentário', 18, 20)
    pdf.text('Receita realizada', 18, 30)
    pdf.text('R$ 5.432.100,45', 120, 30)
    const file = new File([pdf.output('arraybuffer')], 'balanco.pdf', { type: 'application/pdf' })

    const result = await extractPdf(file)

    expect(result.type).toBe('bo')
    expect(result.fields.budgetRevenueActual).toBe(5_432_100.45)
  })

  it('detects and extracts the main municipal report types beyond the balance sheet', async () => {
    const cases = [
      { name: 'balanco-orcamentario.pdf', lines: ['Balanço Orçamentário', 'Receita realizada R$ 500,00'], type: 'bo' as const, key: 'budgetRevenueActual' as const, expected: 500 },
      { name: 'balanco-financeiro.pdf', lines: ['Balanço Financeiro', 'Saldo final R$ 700,00'], type: 'bf' as const, key: 'financialClosingBalance' as const, expected: 700 },
      { name: 'dvp.pdf', lines: ['Demonstração das Variações Patrimoniais', 'Variações patrimoniais aumentativas R$ 1.500,00'], type: 'dvp' as const, key: 'dvpIncrease' as const, expected: 1500 },
      { name: 'numerario.pdf', lines: ['Movimento Numerário', 'Saldo final de caixa e bancos R$ 900,00'], type: 'numerario' as const, key: 'cashClosing' as const, expected: 900 },
    ]

    for (const testCase of cases) {
      const pdf = new jsPDF()
      testCase.lines.forEach((line, index) => pdf.text(line, 18, 20 + index * 10))
      const file = new File([pdf.output('arraybuffer')], testCase.name, { type: 'application/pdf' })

      const result = await extractPdf(file)

      expect(result.type).toBe(testCase.type)
      expect(result.fields[testCase.key]).toBe(testCase.expected)
    }
  })

  it('infers the document type from the values found on the page even without a visible title', async () => {
    const pdf = new jsPDF()
    pdf.text('Receita realizada R$ 2.750,00', 18, 20)
    pdf.text('Despesas empenhadas R$ 1.900,00', 18, 30)
    const file = new File([pdf.output('arraybuffer')], 'documento-sem-titulo.pdf', { type: 'application/pdf' })

    const result = await extractPdf(file)

    expect(result.type).toBe('bo')
    expect(result.fields.budgetRevenueActual).toBe(2750)
    expect(result.fields.expensesCommitted).toBe(1900)
  })
})
