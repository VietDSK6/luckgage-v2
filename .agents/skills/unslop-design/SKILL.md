---
name: unslop-design
description: >
  Audit and fix UI screens against the 20 Unslop Design Rules. Use this skill when reviewing
  or implementing any screen in the Luckgage app (mobile or web) to ensure clean, professional,
  non-AI-looking design. Covers content/copy, typography, visual design, layout/hierarchy,
  and motion/states.
---

# Unslop Design Skill

## When to Activate
- Designing or modifying any screen, component, or layout
- Reviewing screenshots or mockups for quality
- Writing or editing UI copy (headlines, descriptions, labels, buttons, placeholders)
- Before any PR that touches visible UI

## Audit Process

### Step 1: Screenshot/Screen Review
Evaluate the screen against all 20 rules (see `.agents/rules/unslop-design.md`).
For each violation found, note:
- **Rule #** and name
- **Where** on screen (component / file path)
- **Current** state
- **Proposed** fix
- **Priority**: P0 (looks broken), P1 (looks amateur), P2 (polish)

### Step 2: Copy Review
For every piece of user-facing text, check:
1. **Is it necessary?** If removing it doesn't hurt comprehension, remove it.
2. **Is it concise?** Headlines ≤ 8 words. Subtitles ≤ 15 words.
3. **Is it actionable?** Does it help the user do something, or is it decorative?
4. **Is it jargon-free?** No technical terms (YYYY-MM-DD, API, UTC) in user-facing copy.
5. **Is it bilingual-consistent?** Same meaning and length in both VN and EN.

### Step 3: Visual Hierarchy Check
1. What is the ONE primary action on this screen? Is it visually dominant?
2. Are there competing visual elements that dilute focus?
3. Is spacing used to group related items (Gestalt proximity)?
4. Are decorative badges/labels adding information or just noise?

### Step 4: Implementation
Apply fixes following this order:
1. **Remove** unnecessary elements first (filler badges, redundant labels, decorative text)
2. **Rewrite** copy to be concise and direct
3. **Restructure** layout for clear hierarchy
4. **Refine** spacing, alignment, and visual consistency
5. **Add** missing states (loading, empty, error) if needed

## Copy Writing Cheat Sheet

### Headlines (Vietnamese)
| ❌ Bad | ✅ Good | Why |
|--------|---------|-----|
| Đi đâu tiếp? | Chuyến đi của bạn | Specific, not a question |
| Đi đâu, khi nào? | Điểm đến & lịch trình | Direct, scannable |
| Không gian của bạn | Cài đặt | Just say what it is |

### Descriptions
| ❌ Bad | ✅ Good | Why |
|--------|---------|-----|
| Mỗi chuyến đi là một thẻ hành lý đang chờ được lắp đầy | *(remove entirely)* | Filler prose |
| Điều chỉnh luckgage theo cách bạn chuẩn bị cho mỗi chuyến đi | *(remove entirely)* | Obvious from context |
| Giữ ngày dưới dạng YYYY-MM-DD để lịch không bị đổi theo múi giờ | *(remove entirely)* | Technical detail, handle in code |

### Button Labels
- Use verbs: "Tạo chuyến đi" ✅, "Tiếp tục" ✅
- Be specific when possible: "Lưu & tiếp tục" > "Tiếp tục"
- Keep ≤ 3 words

## File Checklist
After making unslop changes, verify:
- [ ] No filler badges remain (section labels that don't aid navigation)
- [ ] All descriptions are actionable or removed
- [ ] Headlines are ≤ 8 words and specific
- [ ] Primary CTA is visually dominant
- [ ] Loading states exist for async operations
- [ ] Both VN and EN translations updated
- [ ] Spacing follows design system tokens
- [ ] Icons are from the same family/weight
