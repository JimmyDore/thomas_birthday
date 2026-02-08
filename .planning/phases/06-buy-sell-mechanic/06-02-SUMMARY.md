---
phase: 06
plan: 02
subsystem: act2-primitives
tags: [buyer-cards, offer-generation, swipe-direction, accept-reject]

dependency-graph:
  requires: [06-01]
  provides: [drawBuyerCardToCanvas, createBuyerSprite, createBuyerOffer, findNextUnsoldItem, getSwipeDirection, checkAct2Collisions, acceptOffer, rejectOffer]
  affects: [06-03]

tech-stack:
  added: []
  patterns: [sprite-caching-for-buyer-cards, round-robin-inventory-mapping, directional-swipe-detection]

key-files:
  created: []
  modified: [game.js]

decisions:
  - id: buyer-card-gradient
    choice: "Blue/teal gradient (#e8f4f8 to #d0eef6) with #90cad8 border for buyer cards"
    reason: "Visually distinct from white seller cards in Act 1; calming palette for buying context"
  - id: difficulty-ramp-margins
    choice: "Margins shrink from 50-120% markup to 5-30% over Act 2 time; bad offer rate 15% to 50%"
    reason: "Progressive difficulty without speed changes; player must read prices more carefully late game"
  - id: swipe-direction-thresholds
    choice: "30px minimum horizontal displacement, horizontal > 0.8x vertical"
    reason: "Filters accidental vertical swipes while remaining responsive to intentional left/right gestures"
  - id: reject-fling-not-remove
    choice: "Rejected cards fling left (vx=-400) and get cleaned up by updateWatches"
    reason: "Visual feedback of rejection; simpler than immediate removal"

metrics:
  duration: 2min
  completed: 2026-02-08
---

# Phase 06 Plan 02: Buyer Card Primitives Summary

Act 2 interaction building blocks: blue/teal buyer card rendering with sprite caching, difficulty-ramped offer generation with round-robin inventory mapping, directional swipe detection (left=reject, right=accept), and accept/reject handlers with full visual/audio feedback.

## What Was Built

### Task 1: Buyer card rendering, sprite caching, and offer generation

**drawBuyerCardToCanvas** - Renders blue/teal buyer cards with gradient body, "OFFRE" label, brand name, price (green if good deal, red if not), and directional hints at bottom.

**createBuyerSprite** - Offscreen canvas caching identical pattern to existing createCardSprite but calling drawBuyerCardToCanvas.

**createBuyerOffer** - Generates offer objects with full physics properties plus offer-specific data. Difficulty ramp:
- Real watches: markup shrinks from 50-120% (early) to 5-30% (late); bad offer rate 15% to 50%
- Fake watches: always 5-15 EUR offers
- Golden watches: premium 150-400 EUR offers
- Returns object with isBuyerOffer:true, targetIndex, brand, offerPrice, isGoodDeal

**findNextUnsoldItem** - Round-robin iterator over inventory array, skipping sold and offerPending items. Wraps around using currentOfferIndex.

**addToInventory** - Extended with offerPending:false field.

### Task 2: Swipe direction detection, collision handling, accept/reject

**getSwipeDirection** - Analyzes trail points array to determine left/right/null. Requires 3+ points, 30px horizontal minimum, horizontal dominance over vertical.

**checkAct2Collisions** - Same segment-circle intersection as checkSlashCollisions but filters by isBuyerOffer and routes by swipe direction.

**acceptOffer** - Marks inventory item sold, records soldFor, adds to act2Revenue. Positive profit: green text + coin sound + particles (+ jackpot for golden). Negative profit: red text + penalty sound + "Mauvaise affaire !" label. Creates split halves and removes card.

**rejectOffer** - Marks slashed, releases offerPending on inventory item, flings card leftward (vx=-400, vy=-150), shows "Refuse" floating text. No sound. Card gets cleaned up by existing updateWatches off-screen logic.

## Deviations from Plan

None - plan executed exactly as written.

## Key Links Verified

| From | To | Via | Verified |
|------|-----|-----|----------|
| createBuyerOffer | inventory[targetIndex] | round-robin picks unsold inventory item | Yes (line 1245) |
| getSwipeDirection | checkAct2Collisions | direction determines accept vs reject | Yes (lines 613, 634) |
| acceptOffer | inventory[].sold = true | marks inventory item as sold and records soldFor | Yes (line 671) |

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | 5b924cf | Buyer card rendering, sprite caching, and offer generation |
| 2 | 581ea4c | Swipe direction detection, Act 2 collision handling, accept/reject |

## Next Phase Readiness

Plan 06-03 can now wire these primitives into the Act 2 game loop:
- updateAct2 calls createBuyerOffer + findNextUnsoldItem for spawning
- updateAct2 calls checkAct2Collisions for interaction
- renderAct2 calls drawCard (which already handles buyer sprites) for rendering
- All functions are standalone with no game loop dependencies
