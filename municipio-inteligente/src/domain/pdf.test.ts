import { jsPDF } from 'jspdf'
import * as pdfjs from 'pdfjs-dist'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { extractPdf } from './pdf'

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
})
