/**
 * Phone number normalization utilities
 * Uses a simple approach without external deps for shared package
 */

const COUNTRY_PREFIXES: Record<string, string> = {
  IL: '972',
  US: '1',
  GB: '44',
  DE: '49',
  FR: '33',
  AE: '971',
  SA: '966',
  IN: '91',
  BR: '55',
  AU: '61',
}

/**
 * Normalize a raw phone number to E.164 format
 * e.g. "050-123-4567" → "+972501234567"
 */
export function normalizePhone(
  raw: string,
  defaultCountry: keyof typeof COUNTRY_PREFIXES = 'IL'
): string | null {
  if (!raw) return null

  // Strip everything except digits and leading +
  let cleaned = raw.replace(/[^\d+]/g, '')

  // Already E.164
  if (cleaned.startsWith('+')) {
    const digits = cleaned.slice(1)
    if (digits.length >= 10 && digits.length <= 15) {
      return cleaned
    }
    return null
  }

  // Remove leading zeros
  cleaned = cleaned.replace(/^0+/, '')

  // Check if it already starts with a known country code
  for (const prefix of Object.values(COUNTRY_PREFIXES)) {
    if (cleaned.startsWith(prefix) && cleaned.length >= 10) {
      return `+${cleaned}`
    }
  }

  // Prepend default country code
  const countryCode = COUNTRY_PREFIXES[defaultCountry]
  if (!countryCode) return null

  const withCountry = `${countryCode}${cleaned}`

  if (withCountry.length < 10 || withCountry.length > 15) return null

  return `+${withCountry}`
}

/**
 * Extract country code from E.164 number
 */
export function getCountryFromPhone(phone: string): string | null {
  if (!phone.startsWith('+')) return null
  const digits = phone.slice(1)

  for (const [country, prefix] of Object.entries(COUNTRY_PREFIXES)) {
    if (digits.startsWith(prefix)) return country
  }
  return null
}

/**
 * Format phone for display: +972501234567 → 050-123-4567 (IL)
 */
export function formatPhoneForDisplay(phone: string): string {
  if (!phone.startsWith('+')) return phone

  const digits = phone.slice(1)

  // Israel
  if (digits.startsWith('972')) {
    const local = digits.slice(3)
    if (local.length === 9) {
      return `0${local.slice(0, 2)}-${local.slice(2, 5)}-${local.slice(5)}`
    }
  }

  return phone
}

/**
 * Check if a phone number looks valid (basic check)
 */
export function isValidPhone(phone: string): boolean {
  return /^\+\d{10,15}$/.test(phone)
}
