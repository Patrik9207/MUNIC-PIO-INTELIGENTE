import type { DocumentRecord, DocumentType, GovernmentUnit, MetricKey } from '../types'
import { safeDivide, sumRequired } from './numbers'

export interface Indicators {
  currentRatio?: number
  immediateRatio?: number
  debtToAssets?: number
  revenueRealization?: number
  expenseExecution?: number
  budgetResult?: number
  dvpResult?: number
  personnelRatio?: number
  rpTotal?: number
  fiscalLimits: {
    maximum?: number
    prudential?: number
    alert?: number
    status: 'pending' | 'below-alert' | 'alert' | 'prudential' | 'over-limit'
  }
}

export type CheckStatus = 'Compatível' | 'Diferença a conferir' | 'Inconsistência aparente' | 'Dados insuficientes'

export interface CrossCheck {
  id: string
  label: string
  status: CheckStatus
  values: string
  difference?: number
  message: string
}

export interface Diagnosis {
  summary: string[]
  attention: string[]
  fiscal: string[]
  recommendations: string[]
}

function metric(documents: DocumentRecord[], type: DocumentType, key: MetricKey): number | undefined {
  const value = documents.find((document) => document.type === type)?.fields[key]
  return value !== undefined && Number.isFinite(value) ? value : undefined
}

function compare(id: string, label: string, actual: number | undefined, expected: number | undefined, message: string): CrossCheck {
  if (actual === undefined || expected === undefined) {
    return { id, label, status: 'Dados insuficientes', values: 'Não há dados suficientes nos documentos selecionados.', message }
  }
  const difference = actual - expected
  const status: CheckStatus = Math.abs(difference) <= 0.02
    ? 'Compatível'
    : Math.abs(difference) / Math.max(Math.abs(expected), 1) > 0.05
      ? 'Inconsistência aparente'
      : 'Diferença a conferir'
  return {
    id,
    label,
    status,
    values: `Valor apurado: ${actual.toFixed(2)}; valor informado: ${expected.toFixed(2)}.`,
    difference,
    message,
  }
}

export function calculateIndicators(documents: DocumentRecord[], unit: GovernmentUnit): Indicators {
  const currentAssets = metric(documents, 'bp', 'assetsCurrent')
  const currentLiabilities = metric(documents, 'bp', 'liabilitiesCurrent')
  const totalAssets = metric(documents, 'bp', 'assetsTotal')
  const totalLiabilities = sumRequired([
    metric(documents, 'bp', 'liabilitiesCurrent'),
    metric(documents, 'bp', 'liabilitiesNonCurrent'),
  ])
  const revenueUpdated = metric(documents, 'bo', 'budgetRevenueUpdated')
  const revenueActual = metric(documents, 'bo', 'budgetRevenueActual')
  const expenseUpdated = metric(documents, 'bo', 'budgetExpenseUpdated')
  const committed = metric(documents, 'bo', 'expensesCommitted')
  const personnelValue = metric(documents, 'pessoal', 'personnelValue')
  const personnelBase = metric(documents, 'pessoal', 'personnelRclBase') ?? metric(documents, 'rcl', 'rclValue')
  const personnelRatio = safeDivide(personnelValue, personnelBase)
  const dvpIncrease = metric(documents, 'dvp', 'dvpIncrease')
  const dvpDecrease = metric(documents, 'dvp', 'dvpDecrease')
  const maximum = unit === 'executive' ? 54 : unit === 'legislative' ? 6 : undefined
  const alert = maximum === undefined ? undefined : maximum * 0.9
  const prudential = maximum === undefined ? undefined : maximum * 0.95
  const fiscalStatus: Indicators['fiscalLimits']['status'] = personnelRatio === undefined || maximum === undefined
    ? 'pending'
    : personnelRatio * 100 > maximum
      ? 'over-limit'
      : personnelRatio * 100 >= (prudential ?? maximum)
        ? 'prudential'
        : personnelRatio * 100 >= (alert ?? maximum)
          ? 'alert'
          : 'below-alert'

  return {
    currentRatio: safeDivide(currentAssets, currentLiabilities),
    immediateRatio: safeDivide(metric(documents, 'bp', 'cash'), currentLiabilities),
    debtToAssets: safeDivide(totalLiabilities, totalAssets) === undefined
      ? undefined
      : (safeDivide(totalLiabilities, totalAssets) ?? 0) * 100,
    revenueRealization: safeDivide(revenueActual, revenueUpdated) === undefined
      ? undefined
      : (safeDivide(revenueActual, revenueUpdated) ?? 0) * 100,
    expenseExecution: safeDivide(committed, expenseUpdated) === undefined
      ? undefined
      : (safeDivide(committed, expenseUpdated) ?? 0) * 100,
    budgetResult: revenueActual !== undefined && committed !== undefined ? revenueActual - committed : undefined,
    dvpResult: dvpIncrease !== undefined && dvpDecrease !== undefined ? dvpIncrease - dvpDecrease : undefined,
    personnelRatio: personnelRatio === undefined ? undefined : personnelRatio * 100,
    rpTotal: sumRequired([metric(documents, 'restos', 'rpClosingProcessed'), metric(documents, 'restos', 'rpClosingUnprocessed')]),
    fiscalLimits: { maximum, prudential, alert, status: fiscalStatus },
  }
}

export function runCrossChecks(documents: DocumentRecord[]): CrossCheck[] {
  const get = (type: DocumentType, key: MetricKey) => metric(documents, type, key)
  const checks: CrossCheck[] = []
  const financialExpected = sumRequired([
    get('bf', 'financialOpeningBalance'),
    get('bf', 'financialBudgetaryReceipts'),
    get('bf', 'financialExtraReceipts'),
    get('bf', 'financialBudgetaryDisbursements') === undefined ? undefined : -get('bf', 'financialBudgetaryDisbursements')!,
    get('bf', 'financialExtraDisbursements') === undefined ? undefined : -get('bf', 'financialExtraDisbursements')!,
  ])
  checks.push(compare(
    'financial-balance',
    'Equação do Balanço Financeiro',
    get('bf', 'financialClosingBalance'),
    financialExpected,
    'Saldo inicial + ingressos orçamentários e extraorçamentários - dispêndios deve corresponder ao saldo final.',
  ))

  const numerarioExpected = sumRequired([
    get('numerario', 'cashOpening'),
    get('numerario', 'cashEntries'),
    get('numerario', 'cashExits') === undefined ? undefined : -get('numerario', 'cashExits')!,
  ])
  checks.push(compare(
    'cash-movement',
    'Equação do Movimento Numerário',
    get('numerario', 'cashClosing'),
    numerarioExpected,
    'Saldo inicial + entradas - saídas. Transferências não são somadas sem identificação de sua direção.',
  ))
  checks.push(compare(
    'cash-cross-document',
    'Saldo final do Balanço Financeiro x Movimento Numerário',
    get('bf', 'financialClosingBalance'),
    get('numerario', 'cashClosing'),
    'Compare somente documentos referentes ao mesmo período e abrangência.',
  ))

  const assetsParts = sumRequired([get('bp', 'assetsCurrent'), get('bp', 'assetsNonCurrent')])
  checks.push(compare(
    'assets-total',
    'Ativo circulante + não circulante x ativo total',
    assetsParts,
    get('bp', 'assetsTotal'),
    'A soma dos componentes do ativo é comparada ao total informado.',
  ))
  const liabilitiesAndEquity = sumRequired([
    get('bp', 'liabilitiesCurrent'),
    get('bp', 'liabilitiesNonCurrent'),
    get('bp', 'equity'),
  ])
  checks.push(compare(
    'balance-equation',
    'Equação patrimonial',
    get('bp', 'assetsTotal'),
    liabilitiesAndEquity,
    'Ativo total deve corresponder ao passivo exigível mais o patrimônio líquido.',
  ))

  const rpGroups: Array<[string, MetricKey, MetricKey, MetricKey, MetricKey, MetricKey]> = [
    ['processados', 'rpOpeningProcessed', 'rpRegisteredProcessed', 'rpPaidProcessed', 'rpCancelledProcessed', 'rpClosingProcessed'],
    ['não processados', 'rpOpeningUnprocessed', 'rpRegisteredUnprocessed', 'rpPaidUnprocessed', 'rpCancelledUnprocessed', 'rpClosingUnprocessed'],
  ]
  for (const [label, openingKey, registeredKey, paidKey, cancelledKey, closingKey] of rpGroups) {
    const expected = sumRequired([
      get('restos', openingKey),
      get('restos', registeredKey),
      get('restos', paidKey) === undefined ? undefined : -get('restos', paidKey)!,
      get('restos', cancelledKey) === undefined ? undefined : -get('restos', cancelledKey)!,
    ])
    checks.push(compare(
      `rp-${label}`,
      `Movimentação de restos a pagar ${label}`,
      get('restos', closingKey),
      expected,
      'Saldo inicial + inscrições - pagamentos - cancelamentos deve corresponder ao saldo final.',
    ))
  }

  const rclValue = get('rcl', 'rclValue')
  const personnelBase = get('pessoal', 'personnelRclBase')
  checks.push(compare(
    'rcl-personnel',
    'RCL informada x base da despesa com pessoal',
    personnelBase,
    rclValue,
    'Verifique período de apuração e metodologia antes de concluir que há divergência.',
  ))

  const committed = get('bo', 'expensesCommitted')
  const paid = get('bo', 'expensesPaid')
  const rpTotal = sumRequired([get('restos', 'rpClosingProcessed'), get('restos', 'rpClosingUnprocessed')])
  const unpaidDifference = committed !== undefined && paid !== undefined ? committed - paid : undefined
  checks.push({
    id: 'expenses-rp',
    label: 'Despesas empenhadas/pagas x saldo de restos a pagar',
    status: unpaidDifference === undefined || rpTotal === undefined ? 'Dados insuficientes' : 'Diferença a conferir',
    values: unpaidDifference === undefined || rpTotal === undefined
      ? 'Não há dados suficientes nos documentos selecionados.'
      : `Empenhado - pago: ${unpaidDifference.toFixed(2)}; saldo final de restos a pagar: ${rpTotal.toFixed(2)}.`,
    difference: unpaidDifference !== undefined && rpTotal !== undefined ? unpaidDifference - rpTotal : undefined,
    message: 'Comparação indicativa: o saldo final pode incluir restos de exercícios anteriores e ter abrangência distinta.',
  })
  return checks
}

export function buildDiagnosis(documents: DocumentRecord[], unit: GovernmentUnit): Diagnosis {
  const indicators = calculateIndicators(documents, unit)
  const checks = runCrossChecks(documents)
  const summary: string[] = []
  const attention: string[] = []
  const fiscal: string[] = []
  const recommendations: string[] = []

  if (indicators.currentRatio !== undefined) {
    summary.push(`Liquidez corrente calculada em ${indicators.currentRatio.toFixed(2)} (ativo circulante ÷ passivo circulante).`)
  }
  if (indicators.budgetResult !== undefined) {
    summary.push(`Resultado orçamentário calculado em R$ ${indicators.budgetResult.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (receita realizada - despesa empenhada).`)
  }
  if (indicators.dvpResult !== undefined) {
    summary.push(`Resultado patrimonial calculado em R$ ${indicators.dvpResult.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.`)
  }
  if (summary.length === 0) summary.push('Ainda não há dados suficientes para compor um resumo. Adicione demonstrativos e informe os valores manualmente.')

  for (const check of checks.filter((item) => item.status === 'Inconsistência aparente' || item.status === 'Diferença a conferir')) {
    attention.push(`${check.label}: ${check.status.toLowerCase()}. ${check.message}`)
  }
  if (attention.length === 0) attention.push('Nenhuma divergência calculável foi identificada nos dados disponíveis. Isso não substitui a revisão dos documentos.')
  const pct = indicators.personnelRatio
  if (pct === undefined || indicators.fiscalLimits.maximum === undefined) {
    fiscal.push('Análise fiscal pendente: confirme a RCL, o período de apuração e se o demonstrativo se refere ao Poder Executivo ou Legislativo.')
  } else {
    const limit = indicators.fiscalLimits
    fiscal.push(`Despesa com pessoal corresponde a ${pct.toFixed(2)}% da RCL, comparada ao limite informado para o Poder ${unit === 'executive' ? 'Executivo' : 'Legislativo'} municipal (${limit.maximum}% máximo, ${limit.prudential}% prudencial e ${limit.alert}% de alerta).`)
    if (limit.status === 'over-limit') fiscal.push('O percentual calculado supera o parâmetro máximo de referência; valide os dados, o período e a aplicação legal antes de qualquer conclusão.')
    else if (limit.status === 'prudential' || limit.status === 'alert') fiscal.push('O percentual atingiu a faixa de alerta ou prudencial; recomenda-se acompanhamento e validação dos dados.')
    else fiscal.push('O percentual está abaixo da faixa de alerta indicada, conforme os dados informados; isso não equivale a uma declaração de conformidade legal.')
  }
  recommendations.push('Confira manualmente todos os valores informados com os demonstrativos oficiais, observando o período e a abrangência de cada documento.')
  recommendations.push('Confirme que os demonstrativos comparados pertencem ao mesmo município, período e abrangência.')
  if (checks.some((check) => check.status !== 'Compatível')) recommendations.push('Investigue as diferenças sinalizadas e documente as justificativas antes de usar o relatório em decisões formais.')
  recommendations.push('Valide limites fiscais e metodologia com o profissional responsável antes de declarar conformidade legal.')
  return { summary, attention, fiscal, recommendations }
}
