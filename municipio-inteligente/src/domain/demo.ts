import { DOCUMENT_TYPES } from '../types'
import type { DocumentRecord } from '../types'

const demoValues: Array<[DocumentRecord['type'], string, DocumentRecord['fields']]> = [
  ['bp', DOCUMENT_TYPES.bp, {
    assetsCurrent: 18_000_000,
    assetsNonCurrent: 52_000_000,
    assetsTotal: 70_000_000,
    liabilitiesCurrent: 12_000_000,
    liabilitiesNonCurrent: 25_000_000,
    equity: 33_000_000,
    cash: 4_200_000,
  }],
  ['bo', DOCUMENT_TYPES.bo, {
    budgetRevenueInitial: 80_000_000,
    budgetRevenueUpdated: 84_000_000,
    budgetRevenueActual: 81_500_000,
    budgetExpenseInitial: 80_000_000,
    budgetExpenseUpdated: 84_000_000,
    expensesCommitted: 78_000_000,
    expensesLiquidated: 73_000_000,
    expensesPaid: 69_000_000,
  }],
  ['bf', DOCUMENT_TYPES.bf, {
    financialOpeningBalance: 2_800_000,
    financialBudgetaryReceipts: 81_500_000,
    financialExtraReceipts: 8_000_000,
    financialBudgetaryDisbursements: 78_000_000,
    financialExtraDisbursements: 10_000_000,
    financialClosingBalance: 4_300_000,
  }],
  ['dvp', DOCUMENT_TYPES.dvp, { dvpIncrease: 90_000_000, dvpDecrease: 86_000_000 }],
  ['numerario', DOCUMENT_TYPES.numerario, {
    cashOpening: 2_800_000,
    cashEntries: 89_500_000,
    cashExits: 88_000_000,
    cashTransfers: 300_000,
    cashClosing: 4_300_000,
  }],
  ['restos', DOCUMENT_TYPES.restos, {
    rpOpeningProcessed: 4_000_000,
    rpOpeningUnprocessed: 6_000_000,
    rpRegisteredProcessed: 2_500_000,
    rpRegisteredUnprocessed: 5_500_000,
    rpPaidProcessed: 2_000_000,
    rpPaidUnprocessed: 1_000_000,
    rpCancelledProcessed: 200_000,
    rpCancelledUnprocessed: 300_000,
    rpClosingProcessed: 4_300_000,
    rpClosingUnprocessed: 10_200_000,
  }],
  ['pessoal', DOCUMENT_TYPES.pessoal, { personnelValue: 29_400_000, personnelRclBase: 60_000_000 }],
  ['rcl', DOCUMENT_TYPES.rcl, { rclValue: 60_000_000 }],
]

export const DEMO_DOCUMENTS: DocumentRecord[] = demoValues.map(([type, name, fields], index) => ({
  id: `demo-${index + 1}`,
  name: `DEMONSTRACAO FICTICIA - ${name}.pdf`,
  type,
  fields,
  status: 'demo',
  isDemo: true,
}))
