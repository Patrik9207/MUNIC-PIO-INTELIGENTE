export function parseBrazilianNumber(value: string): number | undefined {
  let normalized = value
    .replace(/R\$\s?/gi, '')
    .replace(/\s/g, '')
    .replace(/[^\d,().+-]/g, '')

  if (!normalized) return undefined

  const isNegative = normalized.startsWith('(') && normalized.endsWith(')')
  normalized = normalized.replace(/[()]/g, '')
  const hasComma = normalized.includes(',')

  if (hasComma) {
    normalized = normalized.replace(/\./g, '').replace(',', '.')
  } else if (/^-?\d{1,3}(?:\.\d{3})+$/.test(normalized)) {
    normalized = normalized.replace(/\./g, '')
  }

  const parsed = Number(normalized)
  if (!Number.isFinite(parsed)) return undefined
  return isNegative ? -Math.abs(parsed) : parsed
}

export function safeDivide(numerator: number | undefined, denominator: number | undefined): number | undefined {
  if (numerator === undefined || denominator === undefined || denominator === 0) return undefined
  const result = numerator / denominator
  return Number.isFinite(result) ? result : undefined
}

export function sumRequired(values: Array<number | undefined>): number | undefined {
  if (values.some((value) => value === undefined || !Number.isFinite(value))) return undefined
  return values.reduce<number>((total, value) => total + (value ?? 0), 0)
}
