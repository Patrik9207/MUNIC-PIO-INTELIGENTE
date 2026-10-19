export type DocumentType =
  | 'bp'
  | 'bo'
  | 'bf'
  | 'dvp'
  | 'numerario'
  | 'restos'
  | 'pessoal'
  | 'rcl'

export type MetricKey =
  | 'assetsCurrent'
  | 'assetsNonCurrent'
  | 'assetsTotal'
  | 'liabilitiesCurrent'
  | 'liabilitiesNonCurrent'
  | 'equity'
  | 'cash'
  | 'budgetRevenueInitial'
  | 'budgetRevenueUpdated'
  | 'budgetRevenueActual'
  | 'budgetExpenseInitial'
  | 'budgetExpenseUpdated'
  | 'expensesCommitted'
  | 'expensesLiquidated'
  | 'expensesPaid'
  | 'financialOpeningBalance'
  | 'financialBudgetaryReceipts'
  | 'financialExtraReceipts'
  | 'financialBudgetaryDisbursements'
  | 'financialExtraDisbursements'
  | 'financialClosingBalance'
  | 'dvpIncrease'
  | 'dvpDecrease'
  | 'cashOpening'
  | 'cashEntries'
  | 'cashExits'
  | 'cashTransfers'
  | 'cashClosing'
  | 'rpOpeningProcessed'
  | 'rpOpeningUnprocessed'
  | 'rpRegisteredProcessed'
  | 'rpRegisteredUnprocessed'
  | 'rpPaidProcessed'
  | 'rpPaidUnprocessed'
  | 'rpCancelledProcessed'
  | 'rpCancelledUnprocessed'
  | 'rpClosingProcessed'
  | 'rpClosingUnprocessed'
  | 'rclValue'
  | 'personnelValue'
  | 'personnelRclBase'

export interface MetricDefinition {
  key: MetricKey
  label: string
  aliases: string[]
}

export interface DocumentRecord {
  id: string
  name: string
  fileSize?: number
  previewUrl?: string
  pageReadings?: Array<{
    pageNumber: number
    method: 'text' | 'ocr' | 'empty'
    confidence: number | null
    rotation: number
  }>
  fieldSources?: Partial<Record<MetricKey, {
    pageNumber: number
    originalDescription: string
    originalValue: string
    confidence: number | null
  }>>
  type: DocumentType | null
  status: 'processing' | 'review' | 'no-text' | 'error' | 'demo'
  fields: Partial<Record<MetricKey, number>>
  pageCount?: number
  error?: string
  isDemo?: boolean
  isManual?: boolean
}

export type GovernmentUnit = 'executive' | 'legislative' | 'unknown'

export const DOCUMENT_TYPES: Record<DocumentType, string> = {
  bp: 'Balanço Patrimonial (BP)',
  bo: 'Balanço Orçamentário (BO)',
  bf: 'Balanço Financeiro (BF)',
  dvp: 'Demonstração das Variações Patrimoniais (DVP)',
  numerario: 'Movimento Numerário',
  restos: 'Memorial de Restos a Pagar',
  pessoal: 'Despesa com Pessoal',
  rcl: 'Receita Corrente Líquida (RCL)',
}
