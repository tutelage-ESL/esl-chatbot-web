# Chat Layout & Navbar Style Guide

This guide documents the chat page structure, styles, accessibility, and navbar consistency updates.

## Layout Structure
- `chat-shell`: two-column grid — chat left, tips right. Collapses to single column ≤1020px.
- `chat-panel`: flex column with header, stream, and input bar; minimum height 72vh.
- `chat-header`: tutor profile and actions; wraps on smaller screens.
- `chat-stream`: scrollable area for messages with consistent 1rem gap between items.
- `insight-panel`: tips and secondary info on the right.

## Message Components
- `message`: row wrapper built by `app.js` with avatar + content.
- `message-avatar`: 32×32 circular icon; tinted for user, neutral for bot.
- `message-content`: column stack; max-width 78% (88% on small screens).
- `message-bubble`: rounded card with readable line-height and 0.95rem font.
- `user-message` vs `bot-message`: distinct backgrounds and borders for clear hierarchy.
- `message-time`: subdued timestamp; right-aligned for user messages.

## Input Area
- `input-bar`: sticky to bottom of the panel; soft border and backdrop.
- `input-pill`: rounded container with textarea, icons, and actions.
- Interaction feedback: `.focused` state, hover effects, and `:focus-visible` outlines.

## Accessibility
- Live region: `#chat-messages` uses `role="log"`, `aria-live="polite"`, and `aria-relevant="additions text"`.
- Buttons include `aria-label`s; textarea has `aria-label` and `aria-multiline`.
- Keyboard navigation: chips and buttons are native interactive elements with visible focus styles.

## Responsive Behavior
- Breakpoints: ≤1020px (single column), ≤768px (bubble sizing and header padding), ≤480px (compact paddings).
- Scrollbars: thin visual scrollbar for WebKit; defaults elsewhere.

## Navbar Consistency
- Global variable: `--nav-height: 68px` ensures consistent height.
- `.site-nav`: `position: sticky; top: 0; z-index: 100; min-height: var(--nav-height);`.
- `.nav-inner`: matches min-height to maintain vertical rhythm.
- Mobile menu (`.nav-links`) anchored using `top: calc(var(--nav-height) + 8px)`.

## Cross-Browser Test Plan
Test the chat page and navbar on Chrome, Firefox, Safari, and Edge:
1. Verify navbar height matches other pages; ensure no overlap with hero sections.
2. Confirm message bubble spacing and readability across DPI scaling.
3. Check sticky input bar visibility while scrolling long conversations.
4. Validate focus outlines and keyboard tab order on chips and controls.
5. Inspect live region updates using a screen reader (NVDA/VoiceOver).
6. Resize the window to typical device widths (1440, 1280, 1024, 768, 480).

## Notes
- Chat-specific styles live in `/public/css/chat.css` and are only linked on `chat.ejs`.
- Shared brand styles remain in `/public/css/brand-app.css`.
- Avoid duplicating message styles in global CSS to prevent overrides.