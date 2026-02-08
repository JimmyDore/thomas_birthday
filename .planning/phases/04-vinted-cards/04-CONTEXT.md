# Phase 4: Vinted Cards - Context

**Gathered:** 2026-02-08
**Status:** Ready for planning

<domain>
## Phase Boundary

Replace circular watch sprites with white Vinted-style listing cards. Each card shows a watch illustration and brand name, clearly readable at a glance. Slashing cards splits them with the same satisfying feel as v1.0 circles. Golden jackpot cards remain visually distinct. Same physics system, new visual layer.

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion

User granted full discretion on all implementation areas. Claude decides:

**Card visual design:**
- Card dimensions, aspect ratio, and corner radius
- White card styling (shadow, border, background)
- How closely to mimic real Vinted listing aesthetics
- Card rotation and orientation during flight

**Card content & readability:**
- Watch illustration style (simple line art, icon, or detailed drawing)
- Brand name typography (font size, weight, placement)
- Whether to include a price tag element for visual flavor
- How fake brands are visually presented (identical layout, only spelling differs)

**Slash & split feel:**
- How rectangular cards split (horizontal cut, diagonal cut, etc.)
- Particle/debris effects on card destruction
- How to preserve v1.0's satisfying slash feedback with the new shape
- Half-card tumbling physics and fade-out

**Golden card treatment:**
- Gold color treatment (border, full background, gradient, shimmer)
- How visually distinct from white cards (subtle vs obvious)
- Whether golden cards have any animation before being slashed

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches. User trusts Claude's judgment on all visual and interaction design decisions.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 04-vinted-cards*
*Context gathered: 2026-02-08*
