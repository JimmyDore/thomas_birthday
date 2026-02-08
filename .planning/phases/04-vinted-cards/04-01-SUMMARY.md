---
phase: 04-vinted-cards
plan: 01
subsystem: rendering
tags: [canvas, sprites, offscreen-canvas, card-ui, vinted]
requires:
  - 01-01 (DPR-aware canvas, resize system)
provides:
  - drawCardToCanvas, drawWatchIcon, createCardSprite, drawCard functions
  - CARD_WIDTH/CARD_HEIGHT constants
  - Pre-rendered sprite caching pattern
affects:
  - 04-02 (spawn/collision/split updates will use card dimensions and sprites)
  - 05 (sound hooks on slash events unchanged)
  - 06 (buy/sell UI builds on card visual identity)
tech-stack:
  added: []
  patterns: [offscreen-canvas-sprite-caching, dpr-aware-prerendering]
key-files:
  created: []
  modified: [game.js]
key-decisions:
  - Single drawCardToCanvas handles both white and golden cards via isGolden flag
  - shadowBlur restricted to offscreen render only (zero per-frame shadow cost)
  - Watch icon is simplified (2 markers, 2 hands, no crown/band) since it renders small inside card
  - Cards carry price property for decorative display (10-99 EUR normal, 200-499 EUR golden)
  - Sprites cached on card object at spawn time, blitted per frame via drawImage
duration: 2min
completed: 2026-02-08
---

# Phase 04 Plan 01: Card Rendering Functions Summary

Replaced three watch drawing styles (round/square/sport) with a Vinted-style listing card sprite system using offscreen canvas pre-rendering at spawn time.

## Performance

- **Duration:** 2 minutes
- **Tasks:** 1/1 completed
- **Deviations:** 0

## Accomplishments

1. **Removed old watch rendering system** -- deleted 6 functions/constants (WATCH_STYLES, drawRoundWatch, drawSquareWatch, drawSportWatch, drawBrandLabel, darkenColor) totaling ~230 lines
2. **Added card sprite system** -- 4 new functions (drawWatchIcon, drawCardToCanvas, createCardSprite, drawCard) totaling ~130 lines
3. **Eliminated per-frame shadow rendering** -- shadowBlur now only runs once at spawn in offscreen canvas, not 60x/sec in render loop
4. **Updated all consumers** -- spawnWatch, initDecorWatches, renderHalf, and drawWatch all use the new card system
5. **Added card properties** -- watches now carry width, height, price, sprite, spritePadding for the card layout

## Task Commits

| Task | Name | Commit | Key Changes |
|------|------|--------|-------------|
| 1 | Add card rendering functions and remove old watch styles | 4b8d6f5 | game.js: -267/+136 lines |

## Files Modified

- **game.js** -- Replaced watch drawing system with card sprite system

## Decisions Made

1. **Single function for both card types:** drawCardToCanvas uses card.isGolden to switch between white background and gold gradient, rather than separate functions
2. **Simplified watch icon:** Only 2 hour markers (12 and 6) and 2 hands -- the icon is small inside the card so detail would be wasted
3. **Price as decorative element:** Cards display a random price (10-99 EUR for normal, 200-499 EUR for golden) as visual flavor matching Vinted listings
4. **Sprite includes padding:** 10px padding on offscreen canvas accommodates shadow bleed without clipping

## Deviations from Plan

None -- plan executed exactly as written.

## Issues Encountered

None.

## Next Phase Readiness

- Card rendering functions are ready for Plan 02 (spawn, collision, and split logic updates)
- The `drawWatch` function still exists as a thin wrapper around `drawCard` for backward compatibility with render loop and renderHalf
- Split halves now carry sprite reference, so renderHalf can blit the cached card directly
- Card dimensions (CARD_WIDTH=80, CARD_HEIGHT=110) are defined as tunable constants for Plan 02 collision box updates
