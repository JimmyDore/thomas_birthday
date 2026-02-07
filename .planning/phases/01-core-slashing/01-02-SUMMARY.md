---
phase: 01-core-slashing
plan: 02
subsystem: gameplay-mechanics
tags: [canvas, physics, collision-detection, particle-system, split-animation, scoring, haptic]

requires:
  - phase: 01-core-slashing
    provides: "Canvas foundation, game loop, pointer input, swipe trail, score display (Plan 01)"
provides:
  - "Watch spawning with parabolic arc physics"
  - "3 distinct watch drawing styles (round, square, sport)"
  - "Line-segment-to-circle slash collision detection"
  - "Split-half animation with canvas clipping"
  - "Colored particle burst system (green/red)"
  - "Floating score text (+15, -8, -5 euros)"
  - "Haptic feedback on slash"
  - "Complete scoring: real (+15), fake (-8), missed (-5)"
affects:
  - "Phase 2: timer, difficulty ramp, game flow screens layer on top of this gameplay loop"
  - "Phase 2: sneaky fake progression can adjust spawn parameters"
  - "Phase 2: golden watch bonus uses same slash/particle/text systems"

tech-stack:
  added: []
  patterns:
    - "Entity arrays with backward-iteration splice for cleanup"
    - "Projection-clamping line-segment-to-circle collision"
    - "Canvas clip() wrapped in save/restore for split-half rendering"
    - "Hard-capped particle array (200 max) to prevent GC pressure"
    - "Spawn timer accumulator pattern for consistent entity spawning"

key-files:
  created: []
  modified:
    - "game.js"

key-decisions:
  - "Floating text system fully implemented in Task 1 (not stubbed) to support missed penalty display"
  - "Sneaky fakes use identical green (#2a7d4f) as real watches -- only misspelled name distinguishes them"
  - "Split halves draw the full watch then clip, rather than drawing half-shapes"
  - "Collision detection runs before physics update to check current-frame positions"
  - "Side-exit watches (left/right) also trigger missed penalty for real unslashed watches"

duration: 4min
completed: 2026-02-07
---

# Phase 1 Plan 2: Gameplay Mechanics Summary

**Complete Fruit Ninja slashing loop: watches arc across screen in 3 styles, line-segment collision detects swipes, watches split into tumbling clipped halves with green/red particle bursts, score tracks profit with floating euro text, haptic vibration fires on slash.**

## Performance
- **Duration:** 4 minutes
- **Started:** 2026-02-07T11:43:23Z
- **Completed:** 2026-02-07T11:47:03Z
- **Tasks:** 2 of 3 (checkpoint pending for Task 3: human-verify)
- **Files modified:** 1 (game.js: 207 -> 857 lines, +650 lines)

## Accomplishments
- Watches spawn every 1.2 seconds from below the screen, launching in parabolic arcs
- Three visually distinct watch styles: round classic (leather bands), square cushion (metal bracelet), sport diver (thick bezel, rubber bands)
- Each watch displays a brand name label on the cream dial face (min 10px font for readability)
- 60% real Montignac (green), 28% obvious fakes (red), 12% sneaky fakes (green with misspelled name)
- Gravity-driven physics with rotation and off-screen entity cleanup
- Line-segment-to-circle collision detection catches fast swipes across watch hitboxes (20% generous radius)
- Slashing a watch immediately marks it to prevent double-detection
- Split animation: two clipped halves tumble apart with perpendicular push velocity and fade over 1 second
- Particle burst: 12 particles per slash, colored green (real) or red (fake), with gravity and drag
- Floating text: "+15 euros" (green), "-8 euros" (red), "-5 euros" (red for missed) floats upward and fades
- Score updates in real time, can go negative, display turns red when negative
- Haptic vibration (30ms) fires on Chrome Android for each slash
- Missed real Montignac penalty: -5 euros when real watch exits screen unslashed
- Hard caps prevent memory issues: particles (200), floating texts (20), trail points (100)

## Task Commits
1. **Task 1: Watch spawning, drawing (3 styles), physics, and entity cleanup** - `b9da007` (feat)
2. **Task 2: Slash detection, split animation, particles, and scoring** - `586ca22` (feat)

## Files Created/Modified
- `game.js` - 857 lines: added watch spawning, 3 drawing styles, physics, collision detection, slash handler, split halves, particles, floating text, scoring, haptic feedback

## Decisions Made
- Floating text system implemented fully in Task 1 rather than stubbed, because the missed penalty (-5 euros) needs visible feedback to verify Task 1 correctness
- Sneaky fakes use identical green color (#2a7d4f) as real watches -- the ONLY distinction is the misspelled brand name, creating the "double-take" moment described in CONTEXT.md
- Split half rendering draws the full watch shape then clips to one side (rather than drawing half-shapes), which reuses the existing drawWatch functions cleanly
- Collision detection runs BEFORE physics update each frame to check current-frame positions, not post-movement positions
- Watches exiting left/right (not just bottom) also trigger missed penalty for real unslashed watches, ensuring no penalty-free escapes

## Deviations from Plan
### Auto-added
**1. [Rule 2 - Missing Critical] Full floating text system in Task 1**
- **Found during:** Task 1
- **Issue:** The plan placed spawnFloatingText as a "stub for Task 1, full implementation in Task 2," but the missed penalty logic in updateWatches calls spawnFloatingText and needs the text to actually render for verification
- **Fix:** Implemented updateFloatingTexts and renderFloatingTexts fully in Task 1 alongside the stub
- **Files modified:** game.js
- **Commit:** b9da007

## Issues Encountered
None.

## Next Phase Readiness
- Core slashing gameplay loop is fully functional and ready for Phase 2
- Phase 2 Plan 01 (timer, difficulty ramp, game flow) can: adjust SPAWN_INTERVAL over time, add start/end screens that pause/resume the loop, add a countdown timer overlay
- Phase 2 Plan 02 (humor content) can: add progressive fake name difficulty, add feedback text ("Bonne affaire!"), add golden watch type using same spawn/slash/particle systems
- All entity systems (watches, splitHalves, particles, floatingTexts) are array-based and easy to extend
- The drawWatch function supports new styles by adding another branch
