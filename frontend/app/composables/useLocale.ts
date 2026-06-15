import type { Locale } from '~/common/types/locale-types'
import {
  DEFAULT_LOCALE,
  DEFAULT_LOCALE_CONFIG,
  LOCALES,
  dictionaries,
  isLocale,
} from '~/common/data/locales'

/**
 * Public-page localization.
 *
 * SSR-safe by design: the active locale is persisted in a cookie (not
 * localStorage), so the server reads it on the request and renders the
 * correct language + direction up-front — no hydration flash or mismatch.
 *
 * Scope: only the public marketing pages (landing/navbar/footer) consume
 * this. The dashboard and auth flows stay English regardless of the cookie.
 *
 * Usage in a component:
 *   const { t, dir } = useLocale()
 *   // template: {{ t.hero.titleLead }}
 *
 * `t` is a computed dictionary object (NOT a function) — access keys
 * directly (`t.hero.subtitle`), which keeps everything fully type-checked.
 */
export function useLocale() {
  // Year-long cookie: persistence + SSR (server reads it on the request).
  const cookie = useCookie<Locale>('locale', {
    default: () => DEFAULT_LOCALE,
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
    path: '/',
  })

  // Shared, reactive state across EVERY component. `useCookie` refs are
  // per-call and do not sync between components (so writing one would leave
  // the rest of the page stale); `useState` is a single shared ref. It's
  // seeded from the cookie on the server, so SSR + hydration stay correct.
  // Reads are guarded against tampered/legacy cookie values.
  const locale = useState<Locale>('app-locale', () =>
    isLocale(cookie.value) ? cookie.value : DEFAULT_LOCALE,
  )

  const config = computed(
    () => LOCALES.find((l) => l.code === locale.value) ?? DEFAULT_LOCALE_CONFIG,
  )

  const dir = computed(() => config.value.dir)
  const isRtl = computed(() => config.value.dir === 'rtl')
  const htmlLang = computed(() => config.value.htmlLang)

  /** Active translation dictionary — fully typed against TranslationSchema. */
  const t = computed(() => dictionaries[locale.value])

  function setLocale(next: Locale) {
    if (!isLocale(next)) return
    locale.value = next // updates every component immediately
    cookie.value = next // persists for the next visit / SSR
  }

  return {
    locale,
    locales: LOCALES,
    config,
    dir,
    isRtl,
    htmlLang,
    t,
    setLocale,
  }
}
