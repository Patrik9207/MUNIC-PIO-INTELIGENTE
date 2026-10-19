import type { DocumentType, MetricDefinition } from '../types'

export const METRICS_BY_DOCUMENT: Record<DocumentType, MetricDefinition[]> = {
  bp: [
    { key: 'assetsCurrent', label: 'Ativo circulante', aliases: ['ativo circulante', 'ativo corrente'] },
    { key: 'assetsNonCurrent', label: 'Ativo não circulante', aliases: ['ativo nao circulante', 'ativo nao corrente', 'ativo não circulante'] },
    { key: 'assetsTotal', label: 'Ativo total', aliases: ['ativo total', 'total do ativo', 'total ativo'] },
    { key: 'liabilitiesCurrent', label: 'Passivo circulante', aliases: ['passivo circulante', 'passivo corrente'] },
    { key: 'liabilitiesNonCurrent', label: 'Passivo não circulante', aliases: ['passivo nao circulante', 'passivo não circulante', 'passivo nao corrente'] },
    { key: 'equity', label: 'Patrimônio líquido', aliases: ['patrimonio liquido', 'patrimônio líquido', 'patrimonio liquido do exercicio'] },
    { key: 'cash', label: 'Caixa e equivalentes de caixa', aliases: ['caixa e equivalentes de caixa', 'caixa e equivalentes', 'caixa e equivalentes de banco'] },
  ],
  bo: [
    { key: 'budgetRevenueInitial', label: 'Previsão inicial da receita', aliases: ['previsao inicial da receita', 'receita - previsao inicial', 'receita inicial', 'previsao da receita'] },
    { key: 'budgetRevenueUpdated', label: 'Previsão atualizada da receita', aliases: ['previsao atualizada da receita', 'receita - previsao atualizada', 'receita prevista atualizada', 'receita atualizada'] },
    { key: 'budgetRevenueActual', label: 'Receita realizada', aliases: ['receita realizada', 'receitas realizadas', 'receita arrecadada', 'receita executada'] },
    { key: 'budgetExpenseInitial', label: 'Dotação inicial da despesa', aliases: ['dotacao inicial', 'despesa - dotacao inicial', 'despesa inicial', 'dotacao inicial da despesa'] },
    { key: 'budgetExpenseUpdated', label: 'Dotação atualizada da despesa', aliases: ['dotacao atualizada', 'despesa - dotacao atualizada', 'despesa atualizada', 'dotacao total atualizada'] },
    { key: 'expensesCommitted', label: 'Despesas empenhadas', aliases: ['despesas empenhadas', 'despesa empenhada', 'total empenhado'] },
    { key: 'expensesLiquidated', label: 'Despesas liquidadas', aliases: ['despesas liquidadas', 'despesa liquidada', 'total liquidado'] },
    { key: 'expensesPaid', label: 'Despesas pagas', aliases: ['despesas pagas', 'despesa paga', 'total pago'] },
  ],
  bf: [
    { key: 'financialOpeningBalance', label: 'Saldo financeiro inicial', aliases: ['saldo do exercicio anterior', 'saldo inicial', 'saldo em especie do exercicio anterior', 'saldo inicial financeiro'] },
    { key: 'financialBudgetaryReceipts', label: 'Ingressos orçamentários', aliases: ['ingressos orcamentarios', 'receitas orcamentarias', 'receitas orçamentárias'] },
    { key: 'financialExtraReceipts', label: 'Ingressos extraorçamentários', aliases: ['ingressos extraorcamentarios', 'receitas extraorcamentarias', 'receitas extraorçamentárias'] },
    { key: 'financialBudgetaryDisbursements', label: 'Dispêndios orçamentários', aliases: ['dispendios orcamentarios', 'despesas orcamentarias', 'despesas orçamentárias'] },
    { key: 'financialExtraDisbursements', label: 'Dispêndios extraorçamentários', aliases: ['dispendios extraorcamentarios', 'despesas extraorcamentarias', 'despesas extraorçamentárias'] },
    { key: 'financialClosingBalance', label: 'Saldo financeiro final', aliases: ['saldo para o exercicio seguinte', 'saldo final', 'saldo em especie para o exercicio seguinte', 'saldo final financeiro'] },
  ],
  dvp: [
    { key: 'dvpIncrease', label: 'Variações patrimoniais aumentativas', aliases: ['variacoes patrimoniais aumentativas', 'variações patrimoniais aumentativas', 'total das variacoes patrimoniais aumentativas', 'vpa'] },
    { key: 'dvpDecrease', label: 'Variações patrimoniais diminutivas', aliases: ['variacoes patrimoniais diminutivas', 'variações patrimoniais diminutivas', 'total das variacoes patrimoniais diminutivas', 'vpd'] },
  ],
  numerario: [
    { key: 'cashOpening', label: 'Saldo inicial de caixa e bancos', aliases: ['saldo inicial de caixa', 'saldo inicial de caixa e bancos', 'saldo inicial caixa'] },
    { key: 'cashEntries', label: 'Entradas', aliases: ['total das entradas', 'entradas', 'entradas de caixa'] },
    { key: 'cashExits', label: 'Saídas', aliases: ['total das saidas', 'saidas', 'saídas de caixa'] },
    { key: 'cashTransfers', label: 'Transferências', aliases: ['transferencias', 'transferências'] },
    { key: 'cashClosing', label: 'Saldo final de caixa e bancos', aliases: ['saldo final de caixa', 'saldo final de caixa e bancos', 'saldo final caixa'] },
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
