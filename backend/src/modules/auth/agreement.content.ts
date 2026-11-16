/**
 * Terms of Service / User Agreement — single source of truth.
 *
 * `version` is an opaque string compared by EXACT MATCH. A user is considered
 * up to date only if they have a UserAgreement row whose `version` equals the
 * value below. To force every existing user to re-accept (e.g. after a legal
 * change), bump `version` here — no code or migration change is needed. Acceptance
 * is recorded on registration and on the re-accept flow (POST /auth/accept-agreement).
 *
 * This is an initial, project-specific template intended to be reviewed and
 * adjusted by the business owner / legal counsel before launch (notably the
 * bracketed [Company], governing-law, and refund clauses). It is written to
 * reflect what Tutelage actually does today. When the reviewed copy is ready,
 * update `text` and bump `version`; nothing else in the codebase changes.
 */
export interface AgreementContent {
  /** Opaque version identifier. Exact-match comparison gates re-acceptance. */
  version: string;
  /** Human-readable effective date (ISO yyyy-mm-dd). */
  effectiveDate: string;
  /** Full agreement body. Markdown-friendly; rendered by the frontend. */
  text: string;
}

export const CURRENT_AGREEMENT: AgreementContent = {
  version: "1.0",
  effectiveDate: "2026-06-17",
  text: `# Tutelage — Terms of Service

_Effective date: 17 June 2026 · Version 1.0_

Welcome to Tutelage, an AI-assisted English-learning platform ("Tutelage", "the
Service", "we", "us"). By creating an account or using the Service you ("you", the
"user") agree to these Terms of Service ("Terms"). Please read them carefully. If
you do not agree, do not create an account or use the Service.

## 1. Eligibility
You must be at least 13 years old to use the Service. If you are under the age of
majority where you live, you may use the Service only with the involvement and
consent of a parent, guardian, or your school/tutor. By using the Service you
confirm that the information you provide at registration is accurate.

## 2. The Service
Tutelage provides AI-assisted English-language learning, including: text and voice
conversations with an AI tutor; automated feedback and scoring of your grammar,
vocabulary, and fluency; spaced-repetition vocabulary practice; learning goals and
progress tracking; and class features that let tutors organise students, assign
tasks and vocabulary, post announcements, and view class progress. Features,
limits, and availability may change as the Service evolves.

## 3. Accounts and verification
You are responsible for the activity that occurs under your account and for keeping
your password and access credentials secure. To use the AI features you must verify
a means of contact — either by confirming your email with the one-time code we send
you, or by linking a Google account (Google-verified emails are accepted as
verified). You agree to notify us promptly of any unauthorised use of your account.

## 4. Subscriptions, plans, and payment
The Service offers a free plan (FREE) and paid plans (GOLD, PREMIUM) with higher
usage limits and additional capabilities, as described in the app. Free-plan usage
is subject to daily and per-session limits intended to keep the Service sustainable.

Paid plans are activated through the payment methods offered at checkout (including
the First Iraqi Bank (FIB) payment service and, where applicable, cash activation by
an administrator). Prices, plan features, and usage limits are shown in the app and
may be updated; changes do not affect a paid period you have already purchased. A
paid plan remains active until the end of its paid period, after which the account
returns to the free plan unless renewed. Payment processing is handled by third-party
providers and is subject to their terms; transaction fees charged by those providers
may apply. Except where required by applicable law, payments are non-refundable.
[Company to confirm pricing, billing cycle, and refund policy before launch.]

## 5. AI-generated content
The AI tutor generates feedback, corrections, scores, translations, and
conversation automatically. This content is provided for language-learning purposes
only. It may contain mistakes and should not be relied upon as professional,
educational-certification, legal, medical, or other expert advice. Scores and CEFR
estimates are indicative, not official assessments. You are responsible for how you
use AI-generated output.

## 6. Acceptable use
You agree not to:
- use the Service for any unlawful, harmful, harassing, hateful, or abusive purpose,
  or to generate or submit such content;
- attempt to disrupt, overload, reverse-engineer, scrape, or gain unauthorised
  access to the Service or its systems;
- circumvent usage limits, rate limits, or access controls, or share or resell
  access in violation of your plan;
- impersonate others or submit another person's personal information without
  authorisation;
- use the Service to develop a competing product by extracting its content or models.

We may apply automated and manual measures (including rate limiting and account
restrictions) to protect the Service and its users.

## 7. Classes, tutors, and shared content
Tutors and administrators can create classes, generate join codes, assign tasks and
vocabulary, post announcements, and view the learning progress of students in their
class. If you join a class, the tutor and administrators of that class can see your
class-related progress and submissions. If you create or manage a class, you are
responsible for the content you post and for using student information only to
support their learning. Do not share class join codes with people who should not
have access.

## 8. Your content and data
You retain ownership of the content you submit (for example, your messages,
recordings, vocabulary, and goals). You grant us a limited licence to process, store,
and use that content to operate and improve the Service — including sending it to our
AI and speech providers to generate responses, transcriptions, and feedback. We
process your data to provide the Service as described in our Privacy Policy, which
will be made available separately. Do not submit sensitive personal information you
do not want processed for these purposes.

## 9. Intellectual property
The Service, including its software, design, and content (excluding your own
content), is owned by [Company] and its licensors and is protected by applicable
intellectual-property laws. These Terms do not grant you any right to our trademarks
or branding.

## 10. Suspension and termination
You may stop using the Service and request deletion of your account at any time. We
may suspend or terminate your access if you breach these Terms, misuse the Service,
or where necessary to protect the Service or other users. Provisions that by their
nature should survive termination (including sections 5, 8, 9, 11, and 12) will
survive.

## 11. Changes to these Terms
We may update these Terms from time to time. When we make a material change, we will
publish a new version and ask you to review and accept it before you continue to use
the Service. Continuing to use the Service after a new version takes effect means you
accept the updated Terms.

## 12. Disclaimers and limitation of liability
The Service is provided "as is" and "as available", without warranties of any kind to
the maximum extent permitted by law. We do not warrant that the Service will be
uninterrupted, error-free, or that AI-generated output will be accurate. To the
maximum extent permitted by law, [Company] will not be liable for indirect,
incidental, or consequential damages, or for loss of data or profits, arising from
your use of the Service. Nothing in these Terms excludes liability that cannot be
excluded under applicable law.

## 13. Governing law
These Terms are governed by the laws of [jurisdiction to be specified by Company],
without regard to conflict-of-laws rules. [Company to confirm governing law and
dispute-resolution venue before launch.]

## 14. Contact
For questions about these Terms, contact the platform administrators through the
support channel provided in the app.

By selecting "I accept", you confirm that you have read and agree to these Terms of
Service.
`,
};
