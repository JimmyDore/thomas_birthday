---
phase: 04-vinted-cards
plan: 02
subsystem: integration
tags: [game-logic, collision, spawning, split-animation, cleanup]
requires:
  - 04-01 (card rendering functions and sprite system)
provides:
  - Complete card integration into spawn/collision/split logic
  - Removal of sneaky visual distinction (all fakes look identical to reals)
  - Gentle rotation speed for brand name readability
affects:
  - 05 (sound phase will work with unified card visuals)
  - 06 (buy/sell UI builds on pure brand-based fake detection)
tech-stack:
  added: []
  patterns: [sprite-based-collision-detection]
key-files:
  created: []
  modified: [game.js]
key-decisions:
  - All fakes visually identical to reals -- detection solely via brand text spelling
  - Rotation speed reduced to 0.5x for comfortable brand name reading
  - Collision hitRadius uses Math.max(card.width, card.height) / 2 * 1.1 for card dimensions
  - Removed sneaky concept entirely (7 occurrences) since cards make visual distinction obsolete
duration: 2min
completed: 2026-02-08
---

# Phase 04 Plan 02: Card Integration Summary

Completed card integration into spawning, collision detection, and split halves; removed sneaky visual distinction since Vinted-style cards make brand text the primary differentiator.

## Performance

- **Duration:** 2 minutes
- **Tasks:** 2/2 completed (1 auto, 1 checkpoint)
- **Deviations:** 1 (acknowledged Plan 04-01 already handled most integration work)

## Accomplishments

1. **Removed sneaky concept** -- Deleted 7 occurrences of sneaky references since Vinted cards make fakes visually identical to reals
2. **Reduced rotation speed** -- Changed from `* 3` to `* 0.5` for gentle wobble that allows brand name reading
3. **Updated collision detection** -- hitRadius now uses `Math.max(w.width, w.height) / 2 * 1.1` to account for rectangular card dimensions
4. **Removed unused style property** -- Cleaned up references to old watch style system
5. **Visual design checkpoint approved** -- User validated that card visuals work well in gameplay

## Task Commits

| Task | Name | Commit | Key Changes |
|------|------|--------|-------------|
| 1 | Integrate cards into spawning, collision, split halves, and decorative watches | ad14838 | game.js: -13/+3 lines |
| 2 | Human verification checkpoint | approved | Visual design validated, speed issue deferred |

## Files Modified

- **game.js** -- Removed sneaky logic, tuned rotation speed, updated collision hitRadius

## Decisions Made

1. **Visual parity for fakes:** All fake watches now look identical to real watches -- only the brand text spelling differs (e.g., "Roliex" vs "Rolex")
2. **Rotation speed tuning:** Reduced to 0.5x multiplier for gentle wobble that preserves brand name readability
3. **Card-aware collision:** Switched from circular watch assumption to rectangular card dimensions using Math.max(width, height)
4. **Speed issue deferred:** User noted cards fly too fast for comfortable reading -- will be addressed in dedicated dynamics tuning phase (not this plan's scope)

## Deviations from Plan

### Auto-acknowledged Context

**[Rule 2 - Context Awareness] Plan 04-01 already did most integration work**

- **Found during:** Task 1 execution
- **Issue:** Plan 04-02 expected to integrate card sprites into spawnWatch, renderHalf, and drawWatch, but Plan 04-01 had already completed that work
- **Action:** Focused this plan on cleanup work: removed sneaky concept (7 occurrences), tuned rotation speed, and updated collision hitRadius for card dimensions
- **Files modified:** game.js
- **Commit:** ad14838

## Issues Encountered

**Card flight speed too fast for brand name readability**

- **Found during:** Checkpoint 2 (human verification)
- **User feedback:** Cards fly too fast to comfortably read brand names like "Rolex" vs "Roliex"
- **Impact:** Affects gameplay readability and fake detection difficulty
- **Resolution:** Deferred to dedicated dynamics tuning phase (outside this plan's scope)
- **Blocker status:** Not blocking -- gameplay is functional, this is a polish issue

## Next Phase Readiness

- **Phase 05 (Sound):** Ready -- card visuals are complete and stable for sound hook integration
- **Phase 06 (Buy/Sell):** Ready -- pure brand-based fake detection is established (no visual tricks)
- **Dynamics tuning needed:** Card flight speed should be reduced in a future phase for comfortable brand name reading
- **All integration complete:** Cards fully integrated into spawn, collision, split, and decorative rendering
