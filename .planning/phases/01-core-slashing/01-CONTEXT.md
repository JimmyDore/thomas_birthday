# Phase 1: Core Slashing - Context

**Gathered:** 2026-02-07
**Status:** Ready for planning

<domain>
## Phase Boundary

Core slashing gameplay on mobile: watches fly across the screen in arcs, player swipes to slash them, watches split on hit, score tracks profit in euros. Real Montignac = earn, fakes = lose. Swipe trail, haptic feedback, French UI. No timer, no game flow screens, no humor content — those are Phase 2.

</domain>

<decisions>
## Implementation Decisions

### Watch Visuals
- Emoji-style drawn watch shapes (not plain circles, not image assets)
- 2-3 different watch silhouette styles for visual variety
- Brand name label displayed on each watch
- Medium size — balanced between easy to hit and challenging
- Real vs fake identification: mix of color-coding AND name reading
  - Some fakes are obvious (wrong color)
  - Some fakes are sneaky (same color, but name is misspelled)

### Slash Feel
- Colored swipe trail (bright, not white) that fades behind the finger
- Satisfying pop on hit: watch splits into two tumbling halves with small particle burst
- Different visual feedback for real vs fake:
  - Green particles for slashing a real Montignac
  - Red particles for slashing a fake
- Haptic vibration on each slash (if device supports navigator.vibrate)

### Scoring Display
- Running profit displayed in top corner, clean and small — doesn't distract
- Floating "+15€" or "-8€" numbers appear at the slash point and float up
- Score starts at 0€
- Score CAN go negative — going into debt is part of the joke
- Missing a real Montignac (falls off screen) costs money — adds pressure

### Game Background
- Vinted-inspired teal/turquoise gradient background
- Plain gradient, no texture or distracting details — focus stays on the watches

### Claude's Discretion
- Exact trail color choice (gold, neon, etc.)
- Watch shape designs (the 2-3 silhouette styles)
- Particle effect details
- Exact money values for each watch type
- Physics tuning (gravity, arc height, speed)
- How much money is lost when a real watch is missed

</decisions>

<specifics>
## Specific Ideas

- The Vinted teal gradient ties directly to Thomas's Vinted hobby — he'll recognize the color scheme immediately
- Color-coding real vs fake + name reading creates two layers of challenge: fast players can use color, careful players read names
- Going negative on the score is funnier than flooring at zero — Thomas ending with "-47€" is a great joke

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-core-slashing*
*Context gathered: 2026-02-07*
