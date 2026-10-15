import type { DocumentType, MetricDefinition } from '../types'

export const METRICS_BY_DOCUMENT: Record<DocumentType, MetricDefinition[]> = {
  bp: [
    { key: 'assetsCurrent', label: 'Ativo circulante', aliases: ['ativo circulante'] },
    { key: 'assetsNonCurrent', label: 'Ativo não circulante', aliases: ['ativo nao circulante'] },
    { key: 'assetsTotal', label: 'Ativo total', aliases: ['ativo total', 'total do ativo'] },
    { key: 'liabilitiesCurrent', label: 'Passivo circulante', aliases: ['passivo circulante'] },
    { key: 'liabilitiesNonCurrent', label: 'Passivo não circulante', aliases: ['passivo nao circulante'] },
    { key: 'equity', label: 'Patrimônio líquido', aliases: ['patrimonio liquido'] },
    { key: 'cash', label: 'Caixa e equivalentes de caixa', aliases: ['caixa e equivalentes de caixa', 'caixa e equivalentes'] },
  ],
  bo: [
    { key: 'budgetRevenueInitial', label: 'Previsão inicial da receita', aliases: ['previsao inicial da receita', 'receita - previsao inicial'] },
    { key: 'budgetRevenueUpdated', label: 'Previsão atualizada da receita', aliases: ['previsao atualizada da receita', 'receita - previsao atualizada'] },
    { key: 'budgetRevenueActual', label: 'Receita realizada', aliases: ['receita realizada', 'receitas realizadas'] },
    { key: 'budgetExpenseInitial', label: 'Dotação inicial da despesa', aliases: ['dotacao inicial', 'despesa - dotacao inicial'] },
    { key: 'budgetExpenseUpdated', label: 'Dotação atualizada da despesa', aliases: ['dotacao atualizada', 'despesa - dotacao atualizada'] },
    { key: 'expensesCommitted', label: 'Despesas empenhadas', aliases: ['despesas empenhadas', 'despesa empenhada'] },
    { key: 'expensesLiquidated', label: 'Despesas liquidadas', aliases: ['despesas liquidadas', 'despesa liquidada'] },
    { key: 'expensesPaid', label: 'Despesas pagas', aliases: ['despesas pagas', 'despesa paga'] },
  ],
  bf: [
    { key: 'financialOpeningBalance', label: 'Saldo financeiro inicial', aliases: ['saldo do exercicio anterior', 'saldo inicial', 'saldo em especie do exercicio anterior'] },
    { key: 'financialBudgetaryReceipts', label: 'Ingressos orçamentários', aliases: ['ingressos orcamentarios', 'receitas orcamentarias'] },
    { key: 'financialExtraReceipts', label: 'Ingressos extraorçamentários', aliases: ['ingressos extraorcamentarios', 'receitas extraorcamentarias'] },
    { key: 'financialBudgetaryDisbursements', label: 'Dispêndios orçamentários', aliases: ['dispendios orcamentarios', 'despesas orcamentarias'] },
    { key: 'financialExtraDisbursements', label: 'Dispêndios extraorçamentários', aliases: ['dispendios extraorcamentarios', 'despesas extraorcamentarias'] },
    { key: 'financialClosingBalance', label: 'Saldo financeiro final', aliases: ['saldo para o exercicio seguinte', 'saldo final', 'saldo em especie para o exercicio seguinte'] },
  ],
  dvp: [
    { key: 'dvpIncrease', label: 'Variações patrimoniais aumentativas', aliases: ['variacoes patrimoniais aumentativas', 'total das variacoes patrimoniais aumentativas'] },
    { key: 'dvpDecrease', label: 'Variações patrimoniais diminutivas', aliases: ['variacoes patrimoniais diminutivas', 'total das variacoes patrimoniais diminutivas'] },
  ],
  numerario: [
    { key: 'cashOpening', label: 'Saldo inicial de caixa e bancos', aliases: ['saldo inicial de caixa', 'saldo inicial de caixa e bancos'] },
    { key: 'cashEntries', label: 'Entradas', aliases: ['total das entradas', 'entradas'] },
    { key: 'cashExits', label: 'Saídas', aliases: ['total das saidas', 'saidas'] },
    { key: 'cashTransfers', label: 'Transferências', aliases: ['transferencias'] },
    { key: 'cashClosing', label: 'Saldo final de caixa e bancos', aliases: ['saldo final de caixa', 'saldo final de caixa e bancos'] },
  ],
  restos: [
    { key: 'rpOpeningProcessed', label: 'Saldo inicial de restos processados', aliases: ['saldo inicial - processados', 'saldo anterior - processados', 'restos processados - saldo anterior'] },
    { key: 'rpOpeningUnprocessed', label: 'Saldo inicial de restos não processados', aliases: ['saldo inicial - nao processados', 'saldo anterior - nao processados', 'restos nao processados - saldo anterior'] },
    { key: 'rpRegisteredProcessed', label: 'Inscrições de restos processados', aliases: ['inscricoes - processados', 'inscritos - processados', 'restos processados - inscricoes'] },
    { key: 'rpRegisteredUnprocessed', label: 'Inscrições de restos não processados', aliases: ['inscricoes - nao processados', 'inscritos - nao processados', 'restos nao processados - inscricoes'] },
    { key: 'rpPaidProcessed', label: 'Pagamentos de restos processados', aliases: ['pagamentos - processados', 'pagos - processados', 'restos processados - pagos'] },
    { key: 'rpPaidUnprocessed', label: 'Pagamentos de restos não processados', aliases: ['pagamentos - nao processados', 'pagos - nao processados', 'restos nao processados - pagos'] },
    { key: 'rpCancelledProcessed', label: 'Cancelamentos de restos processados', aliases: ['cancelamentos - processados', 'cancelados - processados', 'restos processados - cancelados'] },
    { key: 'rpCancelledUnprocessed', label: 'Cancelamentos de restos não processados', aliases: ['cancelamentos - nao processados', 'cancelados - nao processados', 'restos nao processados - cancelados'] },
    { key: 'rpClosingProcessed', label: 'Saldo final de restos processados', aliases: ['saldo final - processados', 'restos processados - saldo final'] },
    { key: 'rpClosingUnprocessed', label: 'Saldo final de restos não processados', aliases: ['saldo final - nao processados', 'restos nao processados - saldo final'] },
  ],
  pessoal: [
    { key: 'personnelValue', label: 'Despesa total com pessoal', aliases: ['despesa total com pessoal', 'despesa liquida com pessoal'] },
    { key: 'personnelRclBase', label: 'RCL usada como base no demonstrativo', aliases: ['receita corrente liquida', 'rcl ajustada'] },
  ],
  rcl: [
    { key: 'rclValue', label: 'Receita Corrente Líquida', aliases: ['receita corrente liquida', 'rcl ajustada'] },
  ],
}
