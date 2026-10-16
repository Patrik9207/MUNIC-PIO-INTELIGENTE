export function parseBrazilianNumber(value: string): number | undefined {
  let normalized = value.replace(/R\$\s?/gi, '').replace(/\s/g, '').replace(/[^\d,().+-]/g, '')

  if (!normalized) return undefined

  const isNegative = (normalized.startsWith('(') && normalized.endsWith(')')) || normalized.startsWith('-')
  normalized = normalized.replace(/[()]/g, '')
  const commaIndex = normalized.lastIndexOf(',')
  const dotIndex = normalized.lastIndexOf('.')

  if (commaIndex >= 0 && dotIndex >= 0) {
    if (dotIndex > commaIndex) {
      normalized = normalized.replace(/,/g, '')
    } else {
      normalized = normalized.replace(/\./g, '').replace(',', '.')
    }
  } else if (commaIndex >= 0) {
    const commaCount = (normalized.match(/,/g) ?? []).length
    if (commaCount > 1 || /,\d{3}$/.test(normalized)) {
      normalized = normalized.replace(/,/g, '')
    } else {
      normalized = normalized.replace(',', '.')
    }
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
