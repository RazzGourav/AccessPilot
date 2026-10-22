---
name: human-crafted-ui
description: Strict rules for designing or changing UI so it does not look AI-generated or templated. Use before designing, while building, and when reviewing any page, section or component, especially for portfolios and marketing sites.
---

# Human-crafted UI (strict mode)

The owner's explicit brief and `docs/design.md` always win over this file. Where they leave a choice open, do not spend that freedom on a default listed below.

## 1. Plan before code (two passes)

1. Write a short plan: the subject, the audience, and the page's one job. Name 4 to 6 palette colors with hex values, the typefaces and their roles, a one-sentence layout idea per section (an ASCII wireframe helps), and the single memorable moment.
2. Test the plan. Ask whether a similar prompt given to any other designer or model would land in the same place. If yes, change that part, and say what you changed and why. Only then write code.

## 2. Defaults that read as AI-made (never choose them by default)

- A warm cream background with a high-contrast serif and a terracotta accent.
- Near-black with one acid-green or vermilion accent.
- Purple, indigo or purple-to-blue gradients, gradient headline text, aurora or neon glow washes.
- The card kit: everything chopped into identical rounded cards, one radius on everything, the same soft grey shadow under each.
- Inter, Roboto or Arial as the main face.
- Emoji used as icons. A tracked-out all-caps label above every heading.
- Accenting one word of a headline in a different color or italic.
- Numbered markers (01, 02, 03) on content that is not really a sequence.
- Meta strings joined with middle dots, "WORD - fragment" labels, an arrow appended to every link.
- A centered hero followed by three equal feature cards, and a big-number-plus-gradient stats strip.
- Stock photos, mock dashboards, lorem ipsum, fake testimonials.

## 3. Typography

- One family, or two that are clearly different. Pick them for this subject, not out of habit.
- Set an explicit scale with purposeful weights and tracking. Headlines are part of the design.
- Line length under 80 characters. Sentence case. No all-caps labels.
- Add a label above a heading only if it carries information the heading lacks.

## 4. Color and surfaces

- One accent. Keep it a true hue, not drifting toward indigo or purple. Check contrast (AA) in every theme.
- Glass only over rich backgrounds, never over flat color, and never more than two blur layers in one area.
- Vary radius and elevation by hierarchy. Shadows are soft, large and low-opacity.

## 5. Layout and structure

- Visual structure must encode information (borders, dividers, numbers, labels). Remove decoration that does not.
- No two neighbouring sections share the same layout. Use asymmetry and different densities.
- Real content drives the layout: real numbers, real names, real screenshots.

## 6. Motion

- Spend motion in one place per screen. One orchestrated moment beats many small effects.
- A fade-and-slide-up on every section and a hover lift on every card are generic defaults. Vary distance, easing and order, or cut them.
- Motion that answers an action (opening, switching, confirming) is welcome. Use springs with a reason, and keep scroll effects to transform and opacity.
- Respect `prefers-reduced-motion`.

## 7. Copy

- Plain, specific, active voice, from the visitor's point of view.
- Banned filler: passionate, innovative, cutting-edge, seamless, robust, leverage, elevate, unlock, empower, game-changer, delve, journey, tapestry.
- Avoid "not just X but Y", lists of exactly three adjectives, and heavy em-dash use.
- Every claim is true and checkable. Never invent metrics, links or testimonials.

## 8. Imagery and icons

- Real screenshots under one consistent color grade. Inline SVG icons from one family.
- Alt text that describes the real content.

## 9. Engineering floor

- Semantic HTML, visible keyboard focus, AA contrast, responsive down to 360px.
- Small bundle, compressed images, no layout shift, no console errors, no secrets.
- Watch for CSS specificity collisions between section and element selectors.

## 10. Verify, then critique

- Check 360px, 768px and 1280px, in light and dark, with reduced motion on, using a real browser tool if one exists. Say so if none exists.
- Before finishing, remove one accessory: cut the decoration that serves the least.
- Ask: "Would a visitor guess an AI made this?" If yes, redo the weakest part first.

## 11. Report format

Reply briefly with: what was built, what was assumed, **Pass / Fix / Ask the owner**, and the one-line answer to the question in step 10.
