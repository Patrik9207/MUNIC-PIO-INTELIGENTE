import { describe, expect, it } from 'vitest'
import { parseBrazilianNumber, safeDivide, sumRequired } from './numbers'

describe('parseBrazilianNumber', () => {
  it('parses Brazilian thousands and decimal separators', () => {
    expect(parseBrazilianNumber('R$ 1.234.567,89')).toBe(1_234_567.89)
  })

  it('parses accounting negatives and plain integers', () => {
    expect(parseBrazilianNumber('(R$ 1.234,56)')).toBe(-1_234.56)
    expect(parseBrazilianNumber('1500')).toBe(1500)
  })

  it('rejects blank and invalid values', () => {
    expect(parseBrazilianNumber('')).toBeUndefined()
    expect(parseBrazilianNumber('R$ --')).toBeUndefined()
  })
})

describe('safeDivide and sumRequired', () => {
  it('does not divide by zero or silently sum missing values', () => {
    expect(safeDivide(10, 0)).toBeUndefined()
    expect(safeDivide(10, undefined)).toBeUndefined()
    expect(sumRequired([10, undefined])).toBeUndefined()
  })

  it('calculates valid ratios and complete sums', () => {
    expect(safeDivide(30, 60)).toBe(0.5)
    expect(sumRequired([10, 20, -5])).toBe(25)
  })
})
