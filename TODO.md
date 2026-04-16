# Mobile Responsiveness Improvement for index.html - Approved Plan

## Current Progress
- [x] **Analysis Complete**: Reviewed index.html (self-contained), identified issues
- [x] **Plan Approved**: User confirmed: Hero/tabs priority, iPhone/Android focus, no off-limits sections
- [x] **Create TODO.md** ← **Current Step (Retry)**

## Implementation Steps (Breakdown of Approved Plan)

### Phase 1: Core Foundations (High Priority) ⭐ PRIORITY
1. [x] **Update viewport & CSS variables** (Added maximum-scale=5.0, new CSS vars: --mobile-padding, --mobile-gap, --mobile-fs-h1)
2. [x] **Navigation overhaul** (Fullscreen mobile menu, logo responsive, slide-in animation, touch targets)
3. [x] **Hero optimization** (`100svh`, responsive typography, CTA stacking, stats grid)

### Phase 2: Critical Sections (High Priority) ⭐ PRIORITY
4. [ ] **Tabs section** (Mobile horizontal scroll + snap, touch targets)
5. [ ] **Forms/inputs** (iOS zoom fix, full-width buttons, label positioning)

### Phase 3: Content & Layouts (Medium Priority)
6. [ ] **Grids/cards** (Remove `!important`, use CSS vars, normalize heights)
7. [ ] **Calendar** (Touch targets, small screen grid/carousel)
8. [ ] **Typography/spacing** (Clamp functions everywhere)

### Phase 4: Polish & Performance (Low-Medium)
9. [ ] **Ticker improvements** (Touch pause, speed adjustment)
10. [ ] **Extra small screens** (`@media 480px`)
11. [ ] **Performance** (Lazy images, reduced motion, smooth scroll)

### Phase 5: Testing & Completion
12. [ ] **Mobile testing** (Chrome DevTools: iPhone 12, Galaxy S20)
13. [ ] **Lighthouse audit** 
14. [ ] **Final verification**
15. [ ] **attempt_completion**

## Next Action
**Proceed to Phase 1 Step 1: Core CSS variables & viewport**

**Status**: ✅ TODO.md Created | Next: edit_file index.html (Phase 1)

**Testing Command** (later): `npx lighthouse index.html --view --viewport=375,667`

