---
phase: 02-complete-game
plan: 01
subsystem: ui, gameplay
tags: [canvas, game-state-machine, timer, difficulty-ramp, arcade]

# Dependency graph
requires:
  - phase: 01-core-slashing
    provides: "Canvas rendering, watch spawning, slash detection, score system, split halves, particles, floating text"
provides:
  - "Game state machine (start/playing/over)"
  - "Start screen with Thomas's name and Jouer button"
  - "60-second countdown timer with visual warnings"
  - "Smooth difficulty ramp (spawn interval, speed, fake ratio)"
  - "Game over screen with stats breakdown and Rejouer button"
  - "Full state reset for replay"
  - "Stats tracking (realSlashed, fakeSlashed, totalWatches)"
affects: [02-02-PLAN, 03-deploy]

# Tech tracking
tech-stack:
  added: []
  patterns: ["String-based game state machine with dispatch in game loop", "Normalized time progress (t=elapsed/duration) for difficulty ramping", "Responsive button positioning recalculated each render frame"]

key-files:
  created: []
  modified: ["game.js"]

key-decisions:
  - "Quadratic ease-in (t*t) for difficulty ramp -- slow start, frantic end matches context vision"
  - "Difficulty drives spawn interval (1.2s->0.4s), speed (1x->1.4x), fake ratio (15%->55%), sneaky ratio (10%->50%)"
  - "Decorative watches on start screen rendered at 25% opacity with slow rotation for atmosphere"
  - "Button positions computed from canvasWidth/canvasHeight each frame (not cached) for resize safety"
  - "Placeholder game over screen in Task 1 replaced with full version in Task 2 for atomic commits"

patterns-established:
  - "gameState string dispatch: all rendering/update/input gated on 'start'|'playing'|'over'"
  - "getDifficulty() returns a diff object consumed by update() and spawnWatch(diff)"
  - "resetGame() explicitly zeroes every mutable variable for clean replay"

# Metrics
duration: 4min
completed: 2026-02-07
---

# Phase 2 Plan 01: Game Flow Summary

**Game state machine with start screen, 60-second timer, quadratic difficulty ramp, game over stats, and replay cycle in vanilla Canvas**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-07T12:33:14Z
- **Completed:** 2026-02-07T12:36:52Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments
- Game starts on a start screen with "Le Vinted des Montres" title and Thomas's name, not instant gameplay
- 60-second countdown timer with white text, red at 10s, pulse animation at 3-2-1
- Smooth difficulty ramp: spawn interval 1.2s to 0.4s (quadratic), speed 1x to 1.4x, fake ratio 15% to 55%
- Game over screen shows "Montres vendues", "Contrefacons tranchees", and profit with color-coded sign
- Replay via "Rejouer" button fully resets all state (score, timer, arrays, stats)
- All input gated on gameState -- no swipe trails on start/over screens, no button taps during gameplay

## Task Commits

Each task was committed atomically:

1. **Task 1: Game state machine, input routing, start screen, and timer** - `f6cd310` (feat)
2. **Task 2: Difficulty ramp, game over screen, and replay** - `d09f2bf` (feat)

## Files Created/Modified
- `game.js` - Added game state machine, start/game-over screens, timer, difficulty ramp, replay (860 -> 1110 lines)

## Decisions Made
- Quadratic ease-in (`t*t`) for difficulty ramp gives the "barely noticeable then frantic" feel specified in context
- Decorative watches on start screen use 25% opacity and slow rotation (0.5 rad/s max) for subtle atmosphere
- Button bounds recalculated from canvas dimensions every frame rather than on resize only, ensuring correct tap detection on any screen
- spawnWatch accepts optional diff parameter with fallback defaults, keeping backward compatibility

## Deviations from Plan

None -- plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Game flow complete: start -> play -> over -> replay cycle works
- Ready for Plan 02-02 to layer humor content (combo system, Vinted rating, golden watch, fake name progression, birthday message)
- All Phase 1 mechanics (slashing, scoring, split halves, particles, floating text) preserved and working within the new state machine

---
*Phase: 02-complete-game*
*Completed: 2026-02-07*
