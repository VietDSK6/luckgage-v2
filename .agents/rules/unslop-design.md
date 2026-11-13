# Unslop Design Rules for Luckgage

Every UI change—whether mobile (Expo/React Native) or web (React admin)—MUST follow these
unslop principles. Treat them as a mandatory design review checklist before committing any
screen or component change.

## The 20 Unslop Rules

### Content & Copy
1. **Delete filler badges** – Remove decorative labels that add no information
   (e.g. "NHẬT KÝ HÀNH TRÌNH", "KHÔNG GIAN CỦA BẠN").
2. **Drop redundant labels** – If the context makes something obvious, don't label it again.
3. **Unitalicize random words** – Italics are for emphasis or titles, not decoration.
4. **Make headlines specific** – Headlines should say what the screen *does*, not be cute/vague.
   Avoid long poetic descriptions; be direct.
5. **Wrap headlines properly** – Control line breaks for readability; avoid orphaned words.

### Typography & Text
6. **Mono only where needed** – Monospace fonts are for code, IDs, or data—never body text.
7. **Use tabular nums** – Numeric data (dates, prices, counts) should use tabular/lining figures
   so columns align.
8. **Improve text contrast** – Body text must meet WCAG AA (4.5:1); large text meets 3:1.

### Visual Design
9. **Use a design system** – Every color, radius, spacing, and type size comes from the theme
   tokens. No magic numbers.
10. **Add an accent colour** – Use one strong accent for CTAs and key actions; don't spread
    color everywhere.
11. **Keep icons consistent** – Same family, same weight, same optical size throughout.
12. **Remove embellishments** – Cut gradients, shadows, decorative shapes that don't serve
    hierarchy or function.
13. **Inner radius = outer − padding** – Nested rounded rects must have mathematically correct
    inner radii.

### Layout & Hierarchy
14. **Show the actual product** – Hero areas should show real content, not placeholder art.
15. **Enlarge the main feature** – The primary action/content gets the most visual weight.
16. **Group with spacing** – Related items are close; unrelated items have clear gaps.
    Use Gestalt proximity.
17. **Align by eye, not pixels** – Optical alignment > mathematical alignment. Icons and text
    baselines should *look* aligned.
18. **Emphasize the CTA** – One primary action per screen should be visually dominant.

### Motion & States
19. **Add loading states** – Every async operation shows a skeleton, spinner, or shimmer.
20. **Animate useful feedback** – Transitions confirm actions (added, deleted, saved).
    No gratuitous animation.

## Luckgage-Specific Writing Guidelines

- **Be concise**: Max 8 words for a headline, max 15 words for a subtitle.
- **Be direct**: Tell the user what to do, not what the app is philosophically about.
- **No filler prose**: Descriptions like "Mỗi chuyến đi là một thẻ hành lý đang chờ được lắp
  đầy" are decorative—cut them or replace with actionable info.
- **Technical details are not UX copy**: Never surface format specs (YYYY-MM-DD) to users;
  handle formatting in code.
- **Bilingual consistency**: Vietnamese and English copy must carry the same meaning and tone;
  don't make one language more verbose than the other.
