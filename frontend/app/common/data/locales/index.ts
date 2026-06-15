import type { Locale, LocaleConfig, TranslationSchema } from '~/common/types/locale-types'
import { en } from './en'
import { ku } from './ku'

/**
 * Registry of public-page locales.
 *
 * To add a language (e.g. Arabic):
 *   1. add its code to the `Locale` union in `locale-types.ts`,
 *   2. add a `LocaleConfig` entry here,
 *   3. add it to `dictionaries` below (TypeScript enforces the full schema).
 */
export const LOCALES: readonly LocaleConfig[] = [
  { code: 'en', label: 'EN', nativeName: 'English', dir: 'ltr', htmlLang: 'en' },
  { code: 'ku', label: 'کوردی', nativeName: 'کوردی', dir: 'rtl', htmlLang: 'ckb' },
]

export const DEFAULT_LOCALE: Locale = 'en'

/** The default locale's config — used as a safe fallback (never undefined). */
export const DEFAULT_LOCALE_CONFIG: LocaleConfig =
  LOCALES.find((l) => l.code === DEFAULT_LOCALE) ?? LOCALES[0]!

/** Locale code → translation dictionary. Every `Locale` must be present. */
export const dictionaries: Record<Locale, TranslationSchema> = {
  en,
  ku,
}

/** Type guard: is an arbitrary string a supported locale code? */
export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && LOCALES.some((l) => l.code === value)
}
