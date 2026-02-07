---
phase: 01-core-slashing
plan: 01
subsystem: rendering-input
tags: [canvas, game-loop, pointer-events, swipe-trail, mobile, dpr]

requires:
  - phase: none
    provides: "First plan in project"
provides:
  - "Full-screen mobile canvas with DPR-aware rendering"
  - "Game loop with requestAnimationFrame and delta time"
  - "Pointer event input system with coordinate mapping"
  - "Gold fading swipe trail"
  - "Score display stub (0 euros)"
  - "Haptic feedback helper function"
affects:
  - "01-02: watches, physics, and scoring depend on this canvas, loop, and input system"
  - "Phase 2: game flow screens overlay this foundation"

tech-stack:
  added: []
  patterns:
    - "Vanilla JS with module-level state variables (no classes, no modules)"
    - "DPR-aware canvas: physical pixels for sharp rendering, CSS pixels for game logic"
    - "Pointer Events API (unified touch/mouse) with getBoundingClientRect coordinate mapping"
    - "requestAnimationFrame game loop with capped delta time (50ms max)"
    - "Visibility change pause/resume to prevent dt spikes"

key-files:
  created:
    - "index.html"
    - "game.js"
  modified: []

key-decisions:
  - "Used canvas.style.width/height for explicit CSS sizing alongside DPR scaling for guaranteed sharpness"
  - "Trail lifetime set to 150ms for snappy responsive feel"
  - "Gold trail color (255, 200, 50) chosen per research recommendation"
  - "Rounded rectangle pill for score display (8px radius) for polished look"
  - "Trail renders between background and score for correct visual layering"

duration: 2min
completed: 2026-02-07
---

# Phase 1 Plan 1: Game Shell & Swipe Trail Summary

**Full-screen mobile canvas with teal gradient, 60fps game loop with delta time, gold fading swipe trail via Pointer Events, and score display stub showing 0 euros.**

## Performance
- **Duration:** 2 minutes
- **Started:** 2026-02-07T11:37:41Z
- **Completed:** 2026-02-07T11:39:34Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Full-screen canvas fills viewport with no scrollbars, zoom, or browser gesture interference
- Teal gradient background (#009a9a to #006066) renders correctly as Vinted-inspired theme
- DPR-aware canvas sizing produces sharp rendering on Retina/high-DPI mobile screens
- Game loop runs at 60fps with frame-rate-independent delta time capped at 50ms
- Visibility change handler pauses loop on tab defocus, resumes cleanly without physics spike
- Pointer events (down/move/up/cancel) track finger position with correct coordinate mapping
- Gold swipe trail (rgba 255,200,50) follows finger with 150ms fade lifetime
- Trail width varies from 3px (tail) to 8px (finger) with smooth alpha fade
- Score display shows "+0 euros" in white on semi-transparent dark pill, turns red when negative
- Haptic feedback helper ready for slash events in Plan 02

## Task Commits
1. **Task 1: Create HTML shell and Canvas initialization** - `eb84d06` (feat)
2. **Task 2: Add pointer event input and swipe trail rendering** - `8a4684d` (feat)

## Files Created/Modified
- `index.html` - HTML shell with viewport meta, CSS reset, touch-action:none, canvas element, script tag
- `game.js` - 207 lines: canvas init, game loop, background, score display, pointer events, trail rendering, haptic helper

## Decisions Made
- Used explicit `canvas.style.width/height` alongside DPR scaling to guarantee correct sizing across all browsers
- Set trail lifetime to 150ms (matches plan spec) for a snappy, responsive trail feel
- Chose gold trail color (255, 200, 50) from research recommendations
- Added rounded rectangle helper for score pill (8px border radius) for polished UI
- Trail renders between background and score layers (background -> trail -> score) for correct z-ordering
- Used `ctx.setTransform` reset before `ctx.scale(dpr, dpr)` in resize to prevent transform stacking

## Deviations from Plan
None - plan executed exactly as written.

## Issues Encountered
None.

## Next Phase Readiness
- Canvas, game loop, and input system are fully operational for Plan 02
- Plan 02 can add watch entities, physics, collision detection, and scoring by hooking into the existing `update(dt)` and `render()` functions
- The `score` variable and `renderScore()` are ready to display real game scores
- The `hapticFeedback(ms)` function is ready to be called on slash events
- Trail points array and pointer state are accessible for slash collision detection
