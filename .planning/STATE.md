# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-08)

**Core value:** Make Thomas laugh instantly and give him a satisfying 2-minute arcade game to show his friends.
**Current focus:** Milestone v1.1 — Vinted Cards & Buy/Sell

## Current Position

Phase: Not started (defining requirements)
Plan: —
Status: Defining requirements
Last activity: 2026-02-08 — Milestone v1.1 started

Progress: [░░░░░░░░░░] 0%

## Performance Metrics

**v1.0 Stats:**
- Total plans completed: 7
- Average duration: 3min
- Total execution time: 22min

## Accumulated Context

### Decisions

Decisions from v1.0 (still relevant):
- [Roadmap]: Zero dependencies — vanilla JS + Canvas 2D + nginx, no build tools
- [01-01]: DPR-aware canvas with explicit style sizing for guaranteed sharpness
- [01-01]: Gold trail (255, 200, 50) with 150ms lifetime for snappy feel
- [01-01]: Pointer Events API for unified touch/mouse input
- [01-02]: Sneaky fakes use identical green as real — only misspelled name distinguishes them
- [01-02]: Split halves reuse full drawWatch + clip rather than custom half-draw functions
- [02-01]: Quadratic ease-in (t*t) for difficulty ramp — slow start, frantic end
- [02-01]: Button positions recalculated from canvas dimensions every render frame
- [02-02]: FAKE_NAMES_PROGRESSION with pickFakeName(t) using 0.7x bias
- [02-02]: Combo thresholds: 3=x2, 6=x3, 10=x4, 15=x5
- [02-02]: Rating tiers: <0=1star, 0+=2star, 50+=3star, 150+=4star, 300+=5star
- [02.1-01]: Economy: real +10, fake -15, miss -8, fakes 20-65%

New v1.1 decisions:
- [Milestone]: Vinted listing cards replace bare watch drawings for readability
- [Milestone]: Two-act gameplay (buy then sell) adds depth
- [Milestone]: Sound effects added to game feel

### Pending Todos

None yet.

### Blockers/Concerns

None.

## Session Continuity

Last session: 2026-02-08
Stopped at: Defining v1.1 requirements
Resume file: None
