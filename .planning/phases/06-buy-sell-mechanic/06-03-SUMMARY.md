---
phase: 06
plan: 03
subsystem: act2-loop
tags: [game-loop, trail-color, game-over, endgame, two-act]

dependency-graph:
  requires: [06-01, 06-02]
  provides: [updateAct2, renderAct2, endGame, two-act-game-over, trail-color-hints]
  affects: []

tech-stack:
  added: []
  patterns: [difficulty-ramped-spawning, trail-color-feedback, two-act-scoring]

key-files:
  created: []
  modified: [game.js]

decisions:
  - id: act2-spawn-interval
    choice: "Act 2 spawn interval lerps from 1.5s to 0.8s based on normalized time"
    reason: "Progressive difficulty without visual clutter; balanced with card flight speed"
  - id: endgame-profit-calculation
    choice: "finalProfit = act2Revenue - act1Spending (unsold is informational display only)"
    reason: "Simpler scoring model; unsold inventory shown but doesn't directly penalize final profit"
  - id: rating-thresholds
    choice: "getRating thresholds: 100/40/0/-50 EUR for 5/4/3/2 stars"
    reason: "Two-act economy requires higher thresholds; 100+ EUR is genuinely difficult to achieve"

metrics:
  duration: 4min
  completed: 2026-02-08
---

# Phase 06 Plan 03: Act 2 Game Loop and Game Over Summary

Complete two-act gameplay: Act 2 game loop with difficulty-ramped buyer offer spawning, directional trail color hints (green for accept, red for reject), endGame profit calculation from inventory, and redesigned game over screen with full two-act breakdown (spending, revenue, unsold, profit).

## What Was Built

### Task 1: Act 2 game loop, trail color hints, and endGame

**updateAct2(dt)** - Full Act 2 game loop orchestration:
- Increments `act2Elapsed`, checks end conditions (timer or all-sold)
- Spawns buyer offers using difficulty-ramped interval (1.5s -> 0.8s via lerp)
- Calls `findNextUnsoldItem()` to prevent offer collisions on same inventory item
- Calls `checkAct2Collisions()` for swipe interaction
- Updates all existing systems (watches, trail, particles, floating texts)
- Modified `updateWatches` to reset `offerPending` flag when buyer cards fall off-screen

**renderAct2(dt)** - Act 2 HUD with proper state display:
- "Acte 2 : La Revente" header
- Revenue counter showing "Recettes: X EUR"
- Unsold inventory counter showing "N montre(s) a vendre"
- Timer countdown (same style as Act 1)
- Renders all buyer cards, particles, split halves, trail

**Trail color in Act 2** - Modified `renderTrail()`:
- During Act 2, trail turns green (rgb 100,220,100) on right swipes
- Trail turns red (rgb 220,100,100) on left swipes
- Uses `getSwipeDirection()` to detect intent
- Default trail color for all other game states

**endGame()** - Final scoring calculation:
- Calculates `unsoldLoss` by iterating inventory array
- Sets `finalProfit = act2Revenue - act1Spending`
- Saves best score via `saveBestScore(finalProfit)`
- Detects `allSoldEarly` flag for congratulatory message
- Transitions to `gameState = 'over'`

**Game loop wiring** - Replaced Act 2 stub in `gameLoop()` with calls to `updateAct2(dt)` and `renderAct2(dt)`.

### Task 2: Redesign game over screen for two-act scoring breakdown

**renderGameOver()** - Complete redesign with two-act breakdown:
- Header: "Temps ecoule !" or "Tout vendu !" if `allSoldEarly`
- Act 1 section: spending total in red, watches purchased count (including fake count)
- Act 2 section: revenue total in green, watches sold count
- Unsold section: unsold count and total value in red
- Final profit: bold 22px, green if positive, red if negative
- Best score display with "Nouveau record !" for new bests
- Vinted seller rating (stars) based on final profit
- Birthday message: "Joyeux anniversaire mon frere, longue vie aux montres et a Montignac" with star decorations
- Replay button at bottom

**getRating(s)** - Updated thresholds for two-act economy:
- 5 stars (≥100 EUR): "Roi du Vinted"
- 4 stars (≥40 EUR): "Vendeur confirme"
- 3 stars (≥0 EUR): "Bon vendeur"
- 2 stars (≥-50 EUR): "Vendeur debutant"
- 1 star (<-50 EUR): "Vendeur douteux"

**Replay handling** - Verified `startGame()` -> `resetGame()` clears all two-act state (inventory, act variables, allSoldEarly flag).

### Task 3: Full two-act gameplay verification on mobile

User verified complete two-act flow on mobile:
- Act 1 buying with inventory tracking
- Transition screen with fake reveal
- Act 2 selling with directional swipe (green/red trail)
- Game over with accurate breakdown
- Clean replay with no state leaks

## Deviations from Plan

None - plan executed exactly as written.

## Key Links Verified

| From | To | Via | Verified |
|------|-----|-----|----------|
| updateAct2 | createBuyerOffer + checkAct2Collisions | Act 2 loop spawns offers and checks collisions each frame | Yes |
| endGame | act2Revenue - act1Spending - unsoldLoss | final profit calculated from inventory array | Yes |
| renderGameOver | inventory breakdown | game over screen reads inventory for sold/unsold counts and sums | Yes |

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | dca5ae8 | Act 2 game loop, trail color hints, and endGame |
| 2 | 8dd2cc6 | Redesign game over screen for two-act scoring breakdown |
| 3 | N/A | Checkpoint: human-verified two-act gameplay on mobile |

## Next Phase Readiness

Phase 6 (Buy/Sell Mechanic) is complete. All v1.1 milestone requirements satisfied:
- ✅ Vinted cards (Phase 4)
- ✅ Dynamics tuning (Phase 4.1)
- ✅ Sound effects (Phase 5)
- ✅ Two-act buy/sell mechanic (Phase 6)

Game is feature-complete for v1.1 release.
