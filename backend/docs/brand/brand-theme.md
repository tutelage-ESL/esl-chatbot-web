# Tutelage Web Brand — Design Principles & Theme

This document captures the visual language, theme tokens, and usage guidance so new apps look consistent with the Tutelage brand.

## Brand Essence

- Clean, learning‑first, friendly academic feel.
- High contrast surfaces (light: white; dark: near‑black) with warm yellow highlights.
- Motion is subtle and purposeful; interactions feel responsive, not flashy.

## Core Theme Tokens

Light theme (default):
- `background`: white
- `foreground`: black
- `primary`: `#f59e0b` (dim yellow) — key interactive highlight
- `accent`: `#fec016` — brand/logo yellow for emphasis
- `secondary`: `#111111` — deep neutral for surfaces
- `muted`: `#f2f2f2` — light neutral background
- `muted-foreground`: `#4a4a50` — subdued text
- `border`: light neutral; `input`: light neutral; `ring`: neutral
- `radius`: `0.625rem` — base corner radius

Dark theme:
- `background`: `#111111`
- `foreground`: white
- `primary`: `#f59e0b`
- `accent`: `#fdbe10`
- `secondary`: `#232323`
- `muted`: `#1e1e1e`; `muted-foreground`: `#a1a1aa`
- `border`: `#232323`; `input`: `#232323`; `ring`: `#f59e0b`
- `radius`: `0.625rem`

Tailwind utility mapping:
- Use `bg-background`, `text-foreground`, `border-border`, `ring-primary`, `bg-primary`, `text-primary`, `bg-accent`, `text-muted-foreground`, etc.
- The tokens are wired via CSS variables and an inline Tailwind theme, so the utilities above are available directly.

## Typography

- Typeface: system sans (e.g., Inter/Segoe UI/Roboto). Keep it modern and readable.
- Headings: bold (`font-bold`), clear hierarchy; avoid overly decorative fonts.
- Body: `text-foreground` on light and dark surfaces; use `text-muted-foreground` for secondary text.

## Layout & Spacing

- Containers: `max-w-7xl` for page content; navigation can use `max-w-8xl`.
- Horizontal padding: `px-4 sm:px-6 lg:px-8` is the standard cadence.
- Vertical rhythm: 4–8–12–16 spacing scale; prefer `gap-2/3/4/6`.
- Cards and panels: `bg-card border border-border rounded-lg shadow-sm`.

## Motion & Interaction

- Use `framer-motion` for subtle reveals (duration ~0.2–0.3s; ease‑out; small translate/scale).
- Hover states: `hover:text-primary`, `hover:bg-primary/10` for gentle emphasis.
- Focus states: rings use `focus:ring-2 focus:ring-primary/40`; respect accessibility.

## Components

- Forms: use shared `Input`, `Button`, etc.; keep colors semantic (`bg-primary text-primary-foreground`).
- Navigation: active links use `text-primary font-bold`; dropdowns are light/dark surface with borders.
- Icons: `lucide-react` set; size 16–20px in nav and lists.

## Brand Assets

- Logo file: `/only-logo-black-border-yellow-bg.svg` (used in navbar and footer).
- Accent color application: CTA accents, highlights, scrollbars.
- Custom scrollbar: brand yellow (`rgb(234, 179, 8)`), rounded thumb.

## Do / Don’t

Do:
- Keep backgrounds simple and high contrast.
- Use `primary` and `accent` sparingly for emphasis and actions.
- Maintain `0.625rem` corner radius across components.
- Ensure hover/focus states are visible and consistent.

Don’t:
- Introduce new colors outside the palette without strong rationale.
- Use large shadows or heavy gradients; prefer flat, crisp surfaces.
- Over‑animate; keep motion subtle and purposeful.

## Implementation Notes (Next.js)

- Wrap the app in the theme provider with `attribute="class"`, `defaultTheme="system"`, `enableSystem` so dark/light adheres to OS.
- Use the mapped Tailwind utilities (`bg-background`, `text-foreground`, `bg-primary`, etc.) rather than hard‑coded hex values.

## Examples

CTA Button:

```jsx
<Button className="bg-primary text-primary-foreground hover:bg-primary/90">
  Get Started
</Button>
```

Card:

```jsx
<div className="bg-card border border-border rounded-lg shadow-sm p-4">
  <h3 className="text-foreground font-bold">Title</h3>
  <p className="text-muted-foreground">Supporting copy.</p>
</div>
```

Input with focus ring:

```jsx
<Input className="bg-background border border-border text-foreground focus:ring-2 focus:ring-primary/40" />
```

Navigation link:

```jsx
<Link className="text-foreground hover:text-primary">Courses</Link>
```

---

Use this spec as the single source of truth when creating new products under the Tutelage brand so UI remains cohesive across apps.