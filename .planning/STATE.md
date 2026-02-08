# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-08)

**Core value:** Make Thomas laugh instantly and give him a satisfying 2-minute arcade game to show his friends.
**Current focus:** Milestone v1.1 -- Phase 6: Buy/Sell Mechanic

## Current Position

Phase: 6 of 6 (Buy/Sell Mechanic)
Plan: 1 of 3 in current phase
Status: In progress
Last activity: 2026-02-08 -- Completed 06-01-PLAN.md

Progress: [============] 100% (12/12 total plans across v1.0+v1.1)

## Performance Metrics

**v1.0 Stats:**
- Total plans completed: 7
- Average duration: 3min
- Total execution time: 22min

**v1.1 Stats:**
- Plans completed: 5
- 04-01: 2min
- 04-02: 2min
- 04.1-01: 2min
- 05-01: 2min
- 06-01: 3min

## Accumulated Context

### Decisions

Decisions from v1.0 (still relevant):
- [Roadmap]: Zero dependencies -- vanilla JS + Canvas 2D + nginx, no build tools
- [01-01]: DPR-aware canvas with explicit style sizing for guaranteed sharpness
- [01-01]: Pointer Events API for unified touch/mouse input
- [01-02]: Split halves reuse full drawWatch + clip rather than custom half-draw functions
- [02-01]: Quadratic ease-in (t*t) for difficulty ramp
- [02.1-01]: Economy: real +10, fake -15, miss -8, fakes 20-65%

New v1.1 decisions:
- [Milestone]: Vinted listing cards replace bare watch drawings for readability
- [Milestone]: Two-act gameplay (buy then sell) adds depth
- [Milestone]: Procedural Web Audio API sounds (no audio files)
- [Roadmap]: Cards first, sound second, buy/sell last (risk isolation)
- [04-01]: Offscreen canvas sprite caching -- shadowBlur only at spawn, not per frame
- [04-01]: Single drawCardToCanvas handles both white and golden cards via isGolden flag
- [04-01]: Cards carry decorative price property (10-99 EUR normal, 200-499 EUR golden)
- [04-02]: All fakes visually identical to reals -- readability and fake detection relies on brand text spelling
- [04.1-01]: Speed multiplier capped at 1.4x -- difficulty via spawn rate and fakes, not raw speed
- [04.1-01]: Spawn floor raised 0.3s->0.5s to prevent visual clutter with slower cards
- [05-01]: SoundEngine IIFE owns single AudioContext + pre-generated noise buffer
- [05-01]: Combo pitch escalation via semitone multiplier, capped at 12 steps
- [06-01]: Five-state machine with explicit state names (no enum, just string comparison)
- [06-01]: Inventory cost captured BEFORE combo multiplier is applied (uses raw watch.value)
- [06-01]: Transition screen shows max 7 items with "... et N autre(s)" overflow

### Roadmap Evolution

- Phase 4.1 inserted after Phase 4: Dynamics tuning -- card flight speed too fast for comfortable brand reading (URGENT)

### Pending Todos

None.

### Blockers/Concerns

None.

## Session Continuity

Last session: 2026-02-08
Stopped at: Completed 06-01-PLAN.md (State Machine and Transition)
Resume file: None
