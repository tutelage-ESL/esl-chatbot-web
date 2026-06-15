/**
 * Locale + translation types for the public (marketing) pages.
 *
 * Scope: ONLY the public-facing pages (landing page, navbar, footer) are
 * translated. The authenticated dashboard and auth flows stay English.
 *
 * Adding a new language (e.g. Arabic) is three steps:
 *   1. add its code to the `Locale` union below,
 *   2. add a `LocaleConfig` entry in `common/data/locales/index.ts`,
 *   3. add a dictionary file (`ar.ts`) implementing `TranslationSchema`.
 * TypeScript then forces every key to be filled — no silent gaps.
 */

/** Supported public-page locales. Add `'ar'` here when Arabic is ready. */
export type Locale = 'en' | 'ku'

export interface LocaleConfig {
  /** Stable locale code (matches the `Locale` union + dictionary key). */
  code: Locale
  /** Short label shown in the switcher (e.g. "EN"). */
  label: string
  /** Native language name (e.g. "کوردی"). */
  nativeName: string
  /** Text direction — drives `dir` on the public layout root. */
  dir: 'ltr' | 'rtl'
  /** BCP-47 tag for the `lang` attribute (e.g. "en", "ckb" for Sorani). */
  htmlLang: string
}

/** Generic title + description pair, reused across feature/step blocks. */
export interface TitleDesc {
  title: string
  description: string
}

export interface NavTranslations {
  features: string
  howItWorks: string
  dashboard: string
  pricing: string
  getStarted: string
}

export interface HeroTranslations {
  badgeNew: string
  badgeText: string
  titleLead: string
  titleAccent: string
  titleTrail: string
  subtitle: string
  ctaPrimary: string
  ctaSecondary: string
  checks: string[]
  trustedBy: string
}

export interface ChatMockupTranslations {
  tutorName: string
  sessionLabel: string
  listening: string
  voiceMode: string
  pronunciation: string
  messages: string[]
}

export interface FeaturesTranslations {
  eyebrow: string
  title: string
  description: string
  learnMore: string
  items: {
    conversation: TitleDesc
    voice: TitleDesc
    vocab: TitleDesc
    pronunciation: TitleDesc
    goals: TitleDesc
    analytics: TitleDesc
  }
}

export interface HowItWorksTranslations {
  eyebrow: string
  title: string
  seeInAction: string
  steps: {
    one: TitleDesc
    two: TitleDesc
    three: TitleDesc
  }
}

export interface DashboardPreviewTranslations {
  eyebrow: string
  title: string
  description: string
  /** Strings embedded inside the stylized dashboard mockup. */
  mockup: {
    greeting: string
    welcome: string
    newSession: string
    dailyGoal: string
    statLessons: string
    statLessonsSub: string
    statStudyTime: string
    statStudyTimeSub: string
    statStreak: string
    statStreakSub: string
    statLevel: string
    statLevelSub: string
    wordsLearned: string
    consistency: string
    recentSession: string
    minutesAgo: string
    turnsAccuracy: string
    continue: string
  }
}

export interface PlanTranslation {
  name: string
  price: string
  description: string
  cta: string
  features: string[]
}

export interface PricingTranslations {
  eyebrow: string
  title: string
  perMonth: string
  mostPopular: string
  footnote: string
  plans: {
    starter: PlanTranslation
    gold: PlanTranslation
    premium: PlanTranslation
  }
}

export interface FinalCtaTranslations {
  badge: string
  titleLead: string
  titleTrail: string
  subtitle: string
  ctaPrimary: string
  ctaSecondary: string
}

export interface FooterColumn {
  heading: string
  links: string[]
}

export interface FooterTranslations {
  tagline: string
  columns: {
    product: FooterColumn
    resources: FooterColumn
    company: FooterColumn
  }
  rights: string
  status: string
}

/** The full set of strings every locale dictionary must provide. */
export interface TranslationSchema {
  nav: NavTranslations
  hero: HeroTranslations
  chatMockup: ChatMockupTranslations
  features: FeaturesTranslations
  howItWorks: HowItWorksTranslations
  dashboardPreview: DashboardPreviewTranslations
  pricing: PricingTranslations
  finalCta: FinalCtaTranslations
  footer: FooterTranslations
}
