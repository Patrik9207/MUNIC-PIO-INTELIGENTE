import { jsPDF } from 'jspdf'
import { buildDiagnosis, calculateIndicators, runCrossChecks } from './analysis'
import { METRICS_BY_DOCUMENT } from './catalog'
import { DOCUMENT_TYPES, type DocumentRecord, type GovernmentUnit } from '../types'
import { formatCurrency, formatNumber, formatPercent } from '../utils/format'

export interface ReportDetails {
  municipality: string
  state: string
  exercise: string
  unit: GovernmentUnit
}

export function exportReportPdf(documents: DocumentRecord[], details: ReportDetails): void {
  const pdf = new jsPDF()
  const indicators = calculateIndicators(documents, details.unit)
  const diagnosis = buildDiagnosis(documents, details.unit)
  const checks = runCrossChecks(documents)
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  const margin = 18
  const lineWidth = pageWidth - margin * 2
  let y = 20

  const ensureSpace = (height: number) => {
    if (y + height > pageHeight - margin) {
      pdf.addPage()
      y = margin
    }
  }
  const write = (text: string, size = 10, color: [number, number, number] = [47, 58, 71]) => {
    pdf.setFontSize(size)
    pdf.setTextColor(...color)
    const lines = pdf.splitTextToSize(text, lineWidth) as string[]
    ensureSpace(lines.length * (size * 0.48) + 3)
    pdf.text(lines, margin, y)
    y += lines.length * (size * 0.48) + 3
  }
  const heading = (text: string) => {
    y += 3
    write(text, 13, [16, 52, 91])
    pdf.setDrawColor(219, 226, 233)
    pdf.line(margin, y - 1, pageWidth - margin, y - 1)
    y += 2
  }

  pdf.setFillColor(16, 52, 91)
  pdf.rect(0, 0, pageWidth, 38, 'F')
  pdf.setTextColor(255, 255, 255)
  pdf.setFontSize(19)
  pdf.text('Município Inteligente', margin, 17)
  pdf.setFontSize(10)
  pdf.text('Análise Contábil e Financeira Municipal', margin, 26)
  y = 47
  write(`Município: ${details.municipality || 'Não informado'} / ${details.state || 'UF não informada'}    Exercício: ${details.exercise || 'Não informado'}`)

  heading('1. Documentos analisados')
  if (documents.length === 0) write('Nenhum demonstrativo foi carregado.')
  for (const document of documents) {
    const kind = document.type ? DOCUMENT_TYPES[document.type] : 'Categoria não identificada'
    write(`• ${document.name} — ${kind}${document.isDemo ? ' [DADO FICTÍCIO]' : ''}; status: ${document.status}; páginas: ${document.pageCount ?? '—'}.`)
    if (document.type) {
      for (const field of METRICS_BY_DOCUMENT[document.type]) {
        const value = document.fields[field.key]
        if (value !== undefined) write(`  ${field.label}: ${formatNumber(value)}.`)
      }
    }
  }

  heading('2. Resumo executivo')
  for (const item of diagnosis.summary) write(`• ${item}`)
  write(`Tipo de diagnóstico: regras determinísticas. Não foi utilizada IA generativa.`)

  heading('3. Indicadores patrimoniais')
  write(`Liquidez corrente: ${indicators.currentRatio?.toFixed(2) ?? 'Dados insuficientes'} (ativo circulante / passivo circulante).`)
  write(`Liquidez imediata: ${indicators.immediateRatio?.toFixed(2) ?? 'Dados insuficientes'} (caixa e equivalentes / passivo circulante).`)
  write(`Endividamento sobre ativo: ${formatPercent(indicators.debtToAssets)}.`)

  heading('4. Resultado orçamentário e financeiro')
  write(`Resultado orçamentário calculado (receita realizada - despesas empenhadas): ${formatCurrency(indicators.budgetResult)}.`)
  write(`Realização da receita: ${formatPercent(indicators.revenueRealization)}; execução da despesa: ${formatPercent(indicators.expenseExecution)}.`)
  write('Os ingressos do Balanço Financeiro não foram tratados como receita orçamentária.')

  heading('5. Resultado patrimonial')
  write(`Resultado patrimonial (variações aumentativas - diminutivas): ${formatCurrency(indicators.dvpResult)}.`)

  heading('6. Movimento numerário e restos a pagar')
  write(`Restos a pagar ao final do período: ${formatCurrency(indicators.rpTotal)}.`)
  write('Diferenças entre documentos devem ser interpretadas considerando os respectivos períodos e abrangências.')

  heading('7. RCL e despesa com pessoal')
  write(`Despesa com pessoal / RCL: ${formatPercent(indicators.personnelRatio)}.`)
  if (indicators.fiscalLimits.maximum !== undefined) {
    write(`Referências para o Poder ${details.unit === 'executive' ? 'Executivo' : 'Legislativo'} municipal: máximo ${indicators.fiscalLimits.maximum}%; prudencial ${indicators.fiscalLimits.prudential}%; alerta ${indicators.fiscalLimits.alert}%.`)
  } else {
    write('Limites pendentes: informe se o documento se refere ao Poder Executivo ou Legislativo e valide a aplicabilidade legal.')
  }

  heading('8. Cruzamento entre demonstrativos')
  for (const check of checks) {
    write(`${check.status} — ${check.label}. ${check.values} ${check.message}`)
  }

  heading('9. Pontos de atenção e recomendações')
  for (const item of diagnosis.attention) write(`• ${item}`)
  for (const item of diagnosis.recommendations) write(`• ${item}`)

  heading('10. Fórmulas e limitações')
  write('Liquidez corrente = ativo circulante / passivo circulante. Liquidez imediata = caixa e equivalentes / passivo circulante.')
  write('Endividamento = (passivo circulante + passivo não circulante) / ativo total × 100.')
  write('Resultado orçamentário = receita realizada - despesa empenhada. Resultado patrimonial = variações aumentativas - variações diminutivas.')
  write('Despesa com pessoal sobre a RCL = despesa total com pessoal / RCL × 100.')
  write('A extração automática é preliminar e exige conferência humana. Valores ausentes não foram estimados. Relatório de apoio gerencial; não substitui o profissional responsável nem procedimentos formais de controle.')
  if (documents.some((document) => document.isDemo)) write('Este relatório contém exclusivamente um conjunto de demonstração fictício, não representativo de município real.')

  const filename = `diagnostico-${(details.municipality || 'municipio').toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${details.exercise || 'exercicio'}.pdf`
  pdf.save(filename)
}
