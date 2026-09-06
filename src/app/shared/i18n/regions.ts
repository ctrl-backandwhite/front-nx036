import type { Locale } from './translations'

/**
 * A "region" bundles a country with its preferred currency and language. Picking a region
 * sets both the X-Currency header and the UI locale at once — replacing the old split picker.
 *
 * The list is curated, not exhaustive: ~30 markets that cover the storefront's main
 * customer base. Currencies must exist in the backend's currency_rate table.
 */
export interface Region {
  countryCode: string   // ISO 3166-1 alpha-2
  countryLabel: string
  flag: string
  currency: string      // ISO 4217
  locale: Locale
}

export const REGIONS: Region[] = [
  // Europe
  { countryCode: 'ES', countryLabel: 'España',         flag: '🇪🇸', currency: 'EUR', locale: 'es' },
  { countryCode: 'FR', countryLabel: 'France',         flag: '🇫🇷', currency: 'EUR', locale: 'fr' },
  { countryCode: 'DE', countryLabel: 'Deutschland',    flag: '🇩🇪', currency: 'EUR', locale: 'de' },
  { countryCode: 'IT', countryLabel: 'Italia',         flag: '🇮🇹', currency: 'EUR', locale: 'it' },
  { countryCode: 'PT', countryLabel: 'Portugal',       flag: '🇵🇹', currency: 'EUR', locale: 'pt' },
  { countryCode: 'NL', countryLabel: 'Nederland',      flag: '🇳🇱', currency: 'EUR', locale: 'nl' },
  { countryCode: 'GB', countryLabel: 'United Kingdom', flag: '🇬🇧', currency: 'GBP', locale: 'en' },
  { countryCode: 'CH', countryLabel: 'Switzerland',    flag: '🇨🇭', currency: 'CHF', locale: 'en' },
  { countryCode: 'SE', countryLabel: 'Sverige',        flag: '🇸🇪', currency: 'SEK', locale: 'en' },
  { countryCode: 'NO', countryLabel: 'Norge',          flag: '🇳🇴', currency: 'NOK', locale: 'en' },
  { countryCode: 'PL', countryLabel: 'Polska',         flag: '🇵🇱', currency: 'PLN', locale: 'en' },
  // Americas
  { countryCode: 'US', countryLabel: 'United States',  flag: '🇺🇸', currency: 'USD', locale: 'en' },
  { countryCode: 'CA', countryLabel: 'Canada',         flag: '🇨🇦', currency: 'CAD', locale: 'en' },
  { countryCode: 'MX', countryLabel: 'México',         flag: '🇲🇽', currency: 'MXN', locale: 'es' },
  { countryCode: 'BR', countryLabel: 'Brasil',         flag: '🇧🇷', currency: 'BRL', locale: 'pt' },
  { countryCode: 'AR', countryLabel: 'Argentina',      flag: '🇦🇷', currency: 'ARS', locale: 'es' },
  { countryCode: 'CL', countryLabel: 'Chile',          flag: '🇨🇱', currency: 'CLP', locale: 'es' },
  { countryCode: 'CO', countryLabel: 'Colombia',       flag: '🇨🇴', currency: 'COP', locale: 'es' },
  { countryCode: 'PE', countryLabel: 'Perú',           flag: '🇵🇪', currency: 'PEN', locale: 'es' },
  // Asia / Pacific
  { countryCode: 'CN', countryLabel: '中国',            flag: '🇨🇳', currency: 'CNY', locale: 'zh' },
  { countryCode: 'HK', countryLabel: '香港',            flag: '🇭🇰', currency: 'HKD', locale: 'zh' },
  { countryCode: 'JP', countryLabel: '日本',            flag: '🇯🇵', currency: 'JPY', locale: 'en' },
  { countryCode: 'KR', countryLabel: '대한민국',         flag: '🇰🇷', currency: 'KRW', locale: 'en' },
  { countryCode: 'SG', countryLabel: 'Singapore',      flag: '🇸🇬', currency: 'SGD', locale: 'en' },
  { countryCode: 'IN', countryLabel: 'India',          flag: '🇮🇳', currency: 'INR', locale: 'en' },
  { countryCode: 'AU', countryLabel: 'Australia',      flag: '🇦🇺', currency: 'AUD', locale: 'en' },
  { countryCode: 'NZ', countryLabel: 'New Zealand',    flag: '🇳🇿', currency: 'AUD', locale: 'en' },
  { countryCode: 'AE', countryLabel: 'الإمارات',        flag: '🇦🇪', currency: 'AED', locale: 'en' },
  { countryCode: 'TR', countryLabel: 'Türkiye',        flag: '🇹🇷', currency: 'TRY', locale: 'en' },
  { countryCode: 'ZA', countryLabel: 'South Africa',   flag: '🇿🇦', currency: 'ZAR', locale: 'en' },
]

export function findRegion(currency: string, locale: string): Region | undefined {
  // Best match: same currency AND same locale; fall back to currency only.
  return REGIONS.find((r) => r.currency === currency && r.locale === locale)
      ?? REGIONS.find((r) => r.currency === currency)
}

export function regionFromBrowser(): Region {
  try {
    const lang = navigator.language || 'en-US'
    const country = (lang.split('-')[1] || 'US').toUpperCase()
    return REGIONS.find((r) => r.countryCode === country) ?? REGIONS.find((r) => r.countryCode === 'US')!
  } catch {
    return REGIONS.find((r) => r.countryCode === 'US')!
  }
}
