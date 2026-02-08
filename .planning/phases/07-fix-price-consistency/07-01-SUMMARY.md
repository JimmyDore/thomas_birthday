# Phase 7 Plan 1: Unify Price/Cost System and Rescale Act 2 Offers Summary

**One-liner:** Unified display price as actual purchase cost throughout the game flow, with combo discount and percentage-based Act 2 offers scaled to realistic 10-99 EUR costs.

## What Was Built

### Task 1: Unify price and cost in spawn, inventory, and slash flow
- Removed fixed `watchValue` (10/-15/50) from `spawnWatch()`, derived `value` from `price` instead (`isFake ? -price : price`)
- Modified `addToInventory(watch, purchaseCost)` to accept a `purchaseCost` parameter instead of using `Math.abs(watch.value)`
- Reordered `slashWatch()` to compute combo BEFORE inventory recording so discount applies to cost
- Added `purchaseCost = watch.isFake ? watch.price : Math.round(watch.price / comboMultiplier)` -- combo gives real watches a discount
- Changed `act1Spending` to accumulate `purchaseCost` instead of fixed values
- Transition screen now displays `item.cost` (actual paid) instead of `item.price` (original card price)
- Score reflects purchase cost, not fixed 10/15/50 values

### Task 2: Rescale Act 2 offer generation for realistic costs
- Golden offers now use percentage margins relative to golden inventory cost (200-499 EUR): bad offers -5% to -30% below cost, good offers +10% to +60% early shrinking to +5% to +20% late
- Golden bad offer rate ramps with time (15% -> 50%) matching real watch difficulty curve
- Fake offers now 20-60% of cost (proportional loss, always negative)
- Real watch offer logic unchanged -- already percentage-based and scales naturally with higher costs

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| Combo gives purchase discount (price / multiplier) | Rewards streaks with cheaper buys, creates room for Act 2 profit |
| purchaseCost passed as parameter to addToInventory | Avoids mutating watch.price (card sprite already rendered with original) |
| Fake cost = full display price (no combo discount) | Fakes reset combo, so multiplier is always 1 when fakes are slashed |
| Transition shows item.cost not item.price | Cost is the actual amount paid (with combo discount), matches spending total |
| Golden offers use same time-ramped bad rate as reals | Consistent difficulty curve across all watch types |
| Fake offers 20-60% of cost | Always a loss, scaled to fake's cost rather than fixed 5-15 EUR |

## Deviations from Plan

None -- plan executed exactly as written.

## Verification Results

Full Playwright test (`node test-game.mjs`) completed successfully three times:

1. **Baseline (pre-fix):** Confirmed bug -- all costs fixed at 10/15/50 regardless of display price
2. **After Task 1:** Costs match display prices (with combo discounts). Real watches 5-94 EUR range, fakes match display price exactly
3. **After Task 2:** Golden watch (cost 455) sold for 646 EUR (+191 profit). Fake (cost 91) sold for 36 EUR (40% of cost). Full game loop completes without errors.

Key verifications:
- No JS errors in any test run
- Combo discount visible: Display 85 EUR -> Cost 43 EUR at x2 combo
- act1Spending = sum of all inventory costs (verified numerically)
- Act 2 offers proportional to costs (no more flat 6-21 EUR range)
- finalProfit = act2Revenue - act1Spending (correct calculation)
- No NaN values anywhere

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | cbe86d9 | feat(07-01): unify price and cost in spawn, inventory, and slash flow |
| 2 | 5646694 | feat(07-01): rescale Act 2 offer generation for realistic costs |

## Files Modified

| File | Changes |
|------|---------|
| game.js | Unified price/cost in spawnWatch, addToInventory, slashWatch; rescaled golden/fake offer generation in createBuyerOffer |

## Duration

~10 minutes (2026-02-08T18:04:13Z to 2026-02-08T18:14:15Z)
