/**
 * Message template interpolation
 * Supports: {{name}}, {{first_name}}, {{company}}, {{phone}}, and custom fields
 */

export interface TemplateVars {
  name?: string
  first_name?: string
  phone?: string
  email?: string
  company?: string
  [key: string]: string | undefined
}

/**
 * Replace template variables in a message body
 * e.g. "שלום {{name}}!" → "שלום רון!"
 */
export function interpolateTemplate(template: string, vars: TemplateVars): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key: string) => {
    const value = vars[key]
    if (value !== undefined && value !== '') return value

    // Fallbacks for common fields
    if (key === 'name' || key === 'first_name') return 'שם'
    if (key === 'company') return ''

    return match // leave unknown vars as-is
  })
}

/**
 * Extract all variable names from a template
 * e.g. "שלום {{name}} מ-{{company}}" → ["name", "company"]
 */
export function extractTemplateVars(template: string): string[] {
  const matches = template.matchAll(/\{\{(\w+)\}\}/g)
  return [...new Set([...matches].map(m => m[1] ?? ''))]
}

/**
 * Validate that a template has no unclosed brackets
 */
export function validateTemplate(template: string): { valid: boolean; error?: string } {
  const openCount = (template.match(/\{\{/g) ?? []).length
  const closeCount = (template.match(/\}\}/g) ?? []).length

  if (openCount !== closeCount) {
    return { valid: false, error: 'Unclosed template variable brackets' }
  }

  return { valid: true }
}

/**
 * Detect language of text (basic: Hebrew if contains Hebrew chars)
 */
export function detectLanguage(text: string): 'he' | 'en' | 'unknown' {
  if (/[\u0590-\u05FF]/.test(text)) return 'he'
  if (/[a-zA-Z]/.test(text)) return 'en'
  return 'unknown'
}

/**
 * Opt-out keyword detection (Hebrew + English)
 */
export const OPT_OUT_KEYWORDS = [
  // English
  'stop', 'unsubscribe', 'remove', 'opt out', 'optout', 'no more', 'cancel',
  'dont send', "don't send", 'please stop',
  // Hebrew
  'הסר', 'הפסק', 'בטל', 'לא רוצה', 'אל תשלח', 'הורד אותי',
  'הורידו אותי', 'הוצא אותי', 'הפסיקו', 'בטלו', 'לא מעוניין',
  'לא מעוניינת', 'תפסיק', 'תפסיקו',
]

export function isOptOutMessage(text: string): boolean {
  const normalized = text.toLowerCase().trim()
  return OPT_OUT_KEYWORDS.some(keyword =>
    normalized.includes(keyword.toLowerCase())
  )
}
