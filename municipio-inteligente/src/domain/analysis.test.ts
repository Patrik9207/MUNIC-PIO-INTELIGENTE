import { describe, expect, it } from 'vitest'
import { calculateIndicators, runCrossChecks } from './analysis'
import { DEMO_DOCUMENTS } from './demo'

describe('municipal financial analysis', () => {
  it('calculates indicators from the explicitly fictional sample', () => {
    const indicators = calculateIndicators(DEMO_DOCUMENTS, 'executive')

    expect(indicators.currentRatio).toBe(1.5)
    expect(indicators.immediateRatio).toBe(0.35)
    expect(indicators.budgetResult).toBe(3_500_000)
    expect(indicators.dvpResult).toBe(4_000_000)
    expect(indicators.personnelRatio).toBe(49)
    expect(indicators.fiscalLimits.maximum).toBe(54)
    expect(indicators.fiscalLimits.status).toBe('alert')
    expect(indicators.rpTotal).toBe(14_500_000)
  })

  it('uses compatible balances and flags comparisons that need scope review', () => {
    const checks = runCrossChecks(DEMO_DOCUMENTS)

    expect(checks.find((check) => check.id === 'financial-balance')?.status).toBe('Compatível')
    expect(checks.find((check) => check.id === 'cash-movement')?.status).toBe('Compatível')
    expect(checks.find((check) => check.id === 'balance-equation')?.status).toBe('Compatível')
    expect(checks.find((check) => check.id === 'rcl-personnel')?.status).toBe('Compatível')
    expect(checks.find((check) => check.id === 'expenses-rp')?.status).toBe('Diferença a conferir')
  })

  it('does not assert fiscal limits when the government unit is unknown', () => {
    const indicators = calculateIndicators(DEMO_DOCUMENTS, 'unknown')
    expect(indicators.personnelRatio).toBe(49)
    expect(indicators.fiscalLimits.status).toBe('pending')
    expect(indicators.fiscalLimits.maximum).toBeUndefined()
  })
})
