# Phase 06 Plan 01: State Machine and Transition Summary

Five-state game machine (start/act1/transition/act2/over) with inventory tracking, Act 1 HUD reframing as "Les Achats", and transition screen showing inventory + fake reveal + "Vendre !" button.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Refactor state machine, input handlers, and game loop for five states | aa536fa | game.js |
| 2 | Add Act 1 HUD reframing and transition screen | 2e16cab | game.js |

## What Was Built

### State Machine Refactor (Task 1)
- Game states expanded from 3 (`start/playing/over`) to 5 (`start/act1/transition/act2/over`)
- `update()` renamed to `updateAct1()`, `render()` renamed to `renderAct1()`
- Timer end now transitions to `'transition'` state instead of `'over'`
- Input handlers support `act1`, `act2`, and `transition` states
- `slashWatch` records inventory via `addToInventory()` when `gameState === 'act1'`
- `act1Spending` tracks absolute value of all slashed cards
- Miss penalty (score -8) only applies during Act 1
- `resetGame()` clears all new variables (inventory, act1Spending, act2Revenue, etc.)
- Act 2 stub renders placeholder text

### Act 1 HUD and Transition Screen (Task 2)
- `renderScore()` shows "Depense: X EUR" in white during Act 1 (not +/-score)
- `renderAct1HUD()` displays "Acte 1 : Les Achats" header and "N montre(s) achetee(s)" counter
- Full transition screen: header, spending total, inventory list (max 7 visible + overflow), fake reveal
- Brand colors: white for real, red (#ff6666) for fake, gold (#FFD700) for golden
- "Vendre !" button uses same visual style as start/replay buttons
- Empty inventory edge case: shows "Aucune montre achetee !" message, button says "Resultats", skips to game over
- `handleTransitionTap` clears watches/particles/trails before entering Act 2

## Deviations from Plan

None -- plan executed exactly as written.

## Decisions Made

- [06-01]: Five-state machine with explicit state names (no enum, just string comparison)
- [06-01]: Inventory cost captured BEFORE combo multiplier is applied (uses raw watch.value)
- [06-01]: Transition screen shows max 7 items with "... et N autre(s)" overflow

## Key Links Verified

- `slashWatch` -> `inventory.push` via `addToInventory` call when `gameState === 'act1'`
- `gameState === 'act1'` timer end -> `gameState = 'transition'` in `updateAct1`
- Transition screen tap -> `gameState = 'act2'` in `handleTransitionTap`

## Duration

~3 minutes
