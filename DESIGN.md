# Design System

## Register

product

## Theme

Light mode only. Clean, high-contrast surfaces optimised for prolonged screen use.

### Color strategy

Restrained: tinted neutrals + one accent ≤10% of surface.

### Color tokens

```css
--color-bg: oklch(0.99 0 0);
--color-surface: oklch(1 0 0);
--color-surface-subtle: oklch(0.97 0.005 240);
--color-border: oklch(0.92 0.005 240);
--color-border-strong: oklch(0.85 0.005 240);
--color-ink: oklch(0.12 0.01 240);
--color-ink-secondary: oklch(0.45 0.01 240);
--color-ink-muted: oklch(0.6 0.01 240);
--color-accent: oklch(0.5 0.18 240);
--color-accent-hover: oklch(0.42 0.18 240);
--color-success: oklch(0.55 0.16 150);
--color-success-bg: oklch(0.95 0.05 150);
--color-warning: oklch(0.65 0.18 85);
--color-warning-bg: oklch(0.95 0.06 85);
--color-destructive: oklch(0.5 0.2 25);
--color-destructive-bg: oklch(0.95 0.05 25);
--color-focus-ring: oklch(0.5 0.18 240 / 0.35);
```

Color application:
- Accent is used for primary actions, current selection, and active nav state only.
- Success / warning / destructive fill semantic roles and have paired background tints.
- Surface-subtle is used for sidebars, Kanban column backgrounds, and note containers.

## Typography

- **Family:** `system-ui, -apple-system, sans-serif` — no external fonts.
- **Scale:** 12 / 14 / 16 / 18 / 20 / 24 / 32 (px), fixed rem values, no fluid clamp.
- **Weights:** 400 (body), 500 (labels), 600 (subtitles), 700 (headings).
- **Line height:** 1.5 body, 1.3 headings.
- **Line length:** 65–75ch for prose; data/tables denser permitted.

## Spacing

4px increment scale: 4 / 8 / 12 / 16 / 20 / 24 / 32 / 48 / 64.

## Border radius

- Buttons, inputs, selects: 8px.
- Cards, dialogs, Kanban columns: 12px.
- Badges, tags: 6px.
- Full pill for counters only.

## Shadows

- Card/panel: `0 1px 3px 0 rgb(0 0 0 / 0.06)`.
- Elevated (dialog, dropdown): `0 4px 12px 0 rgb(0 0 0 / 0.1)`.
- No shadow on buttons (flat is the default).

## Motion

- 150–200ms transitions, ease-out.
- Transform/opacity only. No layout-animating properties.
- Respect `prefers-reduced-motion`: instant transitions.

## Component principles

- Every interactive component has: default, hover, focus, active, disabled, loading.
- Skeleton states for loading, not text placeholders.
- Empty states with title, description, and action.
- Error states with recovery path.
- Consistent affordances across the surface — same button shape, same form vocabulary, same icon system (Lucide).
