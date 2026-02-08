# Phase 7: Fix Price Consistency - Research

**Researched:** 2026-02-08
**Domain:** Codebase investigation -- price data flow in single-file vanilla JS game
**Confidence:** HIGH (all findings from direct source code reading)

## Summary

This phase fixes a fundamental data inconsistency in the game's price system. Act 1 cards display decorative random prices (e.g., "47 EUR") but store a fixed gameplay value (10/15/50) as the actual `cost` in inventory. This causes three visible problems: (1) the transition screen inventory list shows decorative prices but the spending total shows the sum of fixed values, (2) Act 2 buyer cards show "Paye: 10 EUR" even though the player saw "47 EUR" on the Act 1 card, and (3) Act 2 offers cluster around 6-21 EUR because they're calculated from a cost of 10, making the buy/sell mechanic feel flat.

The fix requires making the displayed price BE the actual cost: unifying `price` and `value`/`cost` into a single source of truth. The combo multiplier must be accounted for -- currently `addToInventory` runs before combo is applied, which means inventory cost captures the raw value. Once prices become the real costs, combo should either reduce the price paid (discount on purchase) or be removed from the cost equation entirely.

**Primary recommendation:** Make `watch.price` the single source of truth for cost. Set `cost = watch.price` in `addToInventory`, use `watch.price` for `act1Spending`, and scale Act 2 offer generation to work with realistic purchase costs (10-99 EUR normal, 200-499 EUR golden).

## Standard Stack

Not applicable -- this is a bug fix phase within an existing zero-dependency vanilla JS + Canvas 2D codebase. No new libraries needed.

## Architecture Patterns

### Current Price Data Flow (THE BUG)

There are two independent price systems that never connect:

```
SYSTEM A: Display Price (decorative)
  spawnWatch() → watch.price = random(10-99) or random(200-499 golden)
  drawCardToCanvas() → renders watch.price + ' EUR' on card face
  addToInventory() → copies watch.price to inventory[].price
  renderTransition() → displays inventory[].price in item list

SYSTEM B: Gameplay Value (actual cost)
  spawnWatch() → watch.value = 10 (real) | -15 (fake) | 50 (golden)
  addToInventory() → inventory[].cost = Math.abs(watch.value) = 10|15|50
  act1Spending += Math.abs(watch.value) = 10|15|50
  createBuyerOffer() → margins calculated from inventory[].cost (10|15|50)
  drawBuyerCardToCanvas() → shows 'Paye: ' + card.cost (10|15|50)
  acceptOffer() → profit = offerPrice - invItem.cost (10|15|50)
```

### Where Each Variable Lives

| Variable | Set at | Value | Used by |
|----------|--------|-------|---------|
| `watch.price` | `spawnWatch()` L441 | 10-99 (normal), 200-499 (golden) | Card sprite rendering (L1065), transition list (L1523), buyer card display (L1239) |
| `watch.value` | `spawnWatch()` L438 | 10 (real), -15 (fake), 50 (golden) | `addToInventory` cost (L746), `act1Spending` (L760), `score` accumulation (L785) |
| `inventory[].price` | `addToInventory()` L743 | Copy of `watch.price` | Transition screen list (L1523) |
| `inventory[].cost` | `addToInventory()` L746 | `Math.abs(watch.value)` = 10/15/50 | Buyer card "Paye:" display (L1153), offer margin calc (L1199-1207), profit calc (L684) |
| `act1Spending` | `slashWatch()` L760 | Sum of `Math.abs(watch.value)` | Transition "Depense totale" (L1498), game over (L1716), `endGame` profit (L2021) |

### Combo Multiplier Flow (THE SECOND BUG)

```
slashWatch(watch):
  1. watch.slashed = true                    // L755
  2. addToInventory(watch)                   // L759 -- cost = Math.abs(watch.value) = 10
  3. act1Spending += Math.abs(watch.value)   // L760 -- adds 10
  4. combo++                                 // L766
  5. comboMultiplier = getMultiplier(combo)  // L767
  6. watch.value = watch.value * comboMultiplier  // L770 -- value becomes 20/30/40/50
  7. score += watch.value                    // L785 -- score gets multiplied value
```

The combo multiplier affects `score` but NOT `inventory.cost` or `act1Spending`. The success criteria says "combo multiplier is properly reflected in inventory cost (applied before addToInventory, not after)" -- but this needs careful thought. If combo reduces purchase cost, the player gets cheaper watches at high combos (a reward). If combo increases cost, it punishes good play. The current behavior (combo only affects score display, not cost) might actually be intentional but just needs to be transparent.

### Pattern: Unified Price (the fix)

**What:** Replace the dual price/value system with a single price that serves as both display and cost.

**Key changes needed:**

1. **`spawnWatch()`**: Remove `watch.value`. Use `watch.price` as the source of truth.
   - Normal real: 10-99 EUR (already the range)
   - Golden: 200-499 EUR (already the range)
   - Fake: 10-99 EUR (same range as real, since fakes look identical)

2. **`addToInventory(watch)`**: Set `cost = watch.price` instead of `Math.abs(watch.value)`

3. **`act1Spending`**: Accumulate `watch.price` instead of `Math.abs(watch.value)`

4. **`slashWatch()`**: Score change = `watch.price` for reals, `-watch.price` for fakes (player pays either way but fakes are losses)

5. **`createBuyerOffer()`**: Margins already work as percentages of `inventoryItem.cost` -- once cost is 10-99 instead of always 10, offers will naturally scale (a 50% markup on 47 EUR = 70 EUR, much more interesting than 50% on 10 = 15)

6. **Buyer card display**: Already shows `card.cost` -- will automatically show correct value once cost is unified

### Anti-Patterns to Avoid

- **Keeping two price fields:** Do NOT maintain both `price` and `value` with a mapping between them. This is what caused the bug. Use one field.
- **Changing offer generation logic unnecessarily:** The percentage-based margin system in `createBuyerOffer` already works correctly -- it just needs larger base costs to produce interesting numbers. Don't rewrite the offer algorithm.
- **Breaking the score display:** Currently `score` accumulates during Act 1 for the HUD, but `endGame` recalculates `finalProfit = act2Revenue - act1Spending`. The Act 1 score display is cosmetic during gameplay. Keep this separation.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Price rounding | Custom rounding logic | `Math.round()` already used in offer calc | Offers already round correctly at L1199/L1207 |
| Fake watch pricing | Separate pricing system for fakes | Same random price range as reals | Fakes must look identical to reals per design decision [04-02] |

**Key insight:** The fix is mostly about removing complexity (the dual system), not adding it. The existing percentage-based offer generation will produce good numbers automatically once costs are realistic.

## Common Pitfalls

### Pitfall 1: Score vs. Profit Confusion
**What goes wrong:** The `score` variable is used during Act 1 for the combo-multiplied running total, but `endGame` recalculates profit as `act2Revenue - act1Spending`. These are different numbers serving different purposes.
**Why it happens:** `score` was originally the only metric (pre-buy/sell). Now it's repurposed.
**How to avoid:** During Act 1, `score` can show running spending total (already does: "Depense: X EUR"). Don't try to make Act 1 `score` equal the final profit. Let `endGame` compute the true profit from `act2Revenue - act1Spending`.
**Warning signs:** If Act 1 HUD shows a different total than the transition screen.

### Pitfall 2: Combo Multiplier Double-Counting
**What goes wrong:** If combo multiplier reduces purchase cost, then both `inventory.cost` and `act1Spending` reflect the discount. But if the combo also boosts score separately, the discount is counted twice.
**Why it happens:** The combo system was designed for a single-score game, not a buy/sell spread game.
**How to avoid:** Choose ONE meaning for combo in the buy/sell context:
  - **Option A (recommended):** Combo gives a DISCOUNT on purchase price. `cost = Math.round(watch.price / comboMultiplier)`. Player pays less, more room for profit. Simple, rewarding.
  - **Option B:** Combo is removed from Act 1 entirely. Just buy at listed price. Simplest but removes a fun mechanic.
  - **Option C:** Combo does NOT affect cost but adds a bonus label. Keep combo as cosmetic feedback only.
**Warning signs:** Player's total spending doesn't match the sum of individual item costs on the transition screen.

### Pitfall 3: Fake Watch Penalty Asymmetry
**What goes wrong:** If fakes cost 10-99 EUR (matching their display price) and can never be sold profitably in Act 2, the penalty for slashing a fake becomes much harsher (losing 47 EUR vs. 15 EUR).
**Why it happens:** Old system used a fixed -15 penalty. New system uses the displayed price.
**How to avoid:** This is actually DESIRABLE -- it makes avoiding fakes more important, which adds tension. But verify the game is still winnable. Fake offers in Act 2 are already 5-15 EUR (line 1189), so the loss is `offerPrice - cost` which would be heavily negative. Consider whether fakes should even appear as sellable in Act 2, or if they should just count as pure losses.
**Warning signs:** Scores are overwhelmingly negative in playtesting.

### Pitfall 4: Golden Watch Offer Range
**What goes wrong:** Golden watches cost 200-499 EUR. The current golden offer range is 150-400 EUR (line 1185). With high-cost goldens, most golden offers would be bad deals.
**Why it happens:** The offer range was designed for cost=50, not cost=200-499.
**How to avoid:** Scale golden offers to the new cost range. Something like `cost * (0.8 + Math.random() * 1.2)` to give 80%-200% of cost, ensuring some good deals.
**Warning signs:** Golden watches always lose money in Act 2.

### Pitfall 5: Transition Screen Display vs. Total Mismatch
**What goes wrong:** After the fix, `item.price` in the inventory list should now equal `item.cost`. But if they diverge again (e.g., combo discount reduces cost but not display), the mismatch returns.
**Why it happens:** Having `price` and `cost` as separate fields.
**How to avoid:** After the fix, ensure `inventory[].cost` is the ONLY field used for display on both the transition screen and buyer cards. Remove or ignore `inventory[].price` entirely if possible, or set `price = cost` in `addToInventory`.
**Warning signs:** Transition screen item list total != "Depense totale" value.

### Pitfall 6: Sprite Cache Stale After Price Change
**What goes wrong:** Card sprites are pre-rendered at spawn time via `createCardSprite()`. The price is baked into the sprite. If price changes after sprite creation (e.g., combo discount), the displayed price on the card won't match.
**Why it happens:** Sprite caching bakes visual state at creation time.
**How to avoid:** If combo affects price, calculate the final price BEFORE calling `createCardSprite()`. Since `createCardSprite` runs at `spawnWatch()` time and combo applies at `slashWatch()` time, this means either: (a) don't let combo affect the displayed price, or (b) accept that the card shows the pre-discount price and only the inventory/transition shows the discounted cost.
**Warning signs:** Card shows "47 EUR" but inventory shows "24 EUR" due to combo discount.

## Code Examples

### Current spawnWatch price assignment (lines 438-441)
```javascript
// CURRENT: Two independent systems
var watchValue = isGolden ? 50 : (isFake ? -15 : 10);
var price = isGolden ? (200 + Math.floor(Math.random() * 300)) : (10 + Math.floor(Math.random() * 90));
```

### Current addToInventory (lines 740-751)
```javascript
// CURRENT: cost uses value (10/15/50), price is decorative
function addToInventory(watch) {
  inventory.push({
    brand: watch.brand,
    price: watch.price,       // decorative: 10-99 or 200-499
    isFake: watch.isFake,
    isGolden: watch.isGolden,
    cost: Math.abs(watch.value),  // gameplay: 10, 15, or 50
    sold: false,
    soldFor: 0,
    offerPending: false
  });
}
```

### Current slashWatch spending accumulation (lines 758-760)
```javascript
// CURRENT: uses watch.value (10/15/50), not watch.price
if (gameState === 'act1') {
  addToInventory(watch);
  act1Spending += Math.abs(watch.value);
}
```

### Current buyer card "Paye:" display (line 1153)
```javascript
// CURRENT: shows cost (10/15/50), not the price the player saw
offCtx.fillText('Paye: ' + card.cost + ' EUR', ox + w / 2, oy + h * 0.55);
```

### Current offer generation for real watches (lines 1191-1209)
```javascript
// CURRENT: margins calculated from inventoryItem.cost (always 10 for reals)
// This produces offers in ~5-22 EUR range
var minMarkup = 0.50 - t * 0.45; // 50% early -> 5% late
var maxMarkup = 1.20 - t * 0.90; // 120% early -> 30% late
// With cost=10: good offers are 15-22 EUR early, 10-13 EUR late
// With cost=47: good offers would be 70-103 EUR early, 49-61 EUR late
```

### Fix: Unified price in spawnWatch
```javascript
// FIX: price IS the cost, value derived from price
var price = isGolden ? (200 + Math.floor(Math.random() * 300))
                     : (10 + Math.floor(Math.random() * 90));
var watchValue = isFake ? -price : price;  // fakes are negative (penalty)
```

### Fix: Unified addToInventory
```javascript
// FIX: cost = price (what the player saw on the card)
function addToInventory(watch) {
  inventory.push({
    brand: watch.brand,
    price: watch.price,
    isFake: watch.isFake,
    isGolden: watch.isGolden,
    cost: watch.price,          // UNIFIED: cost = displayed price
    sold: false,
    soldFor: 0,
    offerPending: false
  });
}
```

### Fix: Spending accumulation uses price
```javascript
// FIX: accumulate the displayed price, not a hidden value
if (gameState === 'act1') {
  addToInventory(watch);
  act1Spending += watch.price;  // same value player saw on the card
}
```

### Fix: Golden offer range scaled to new costs
```javascript
// FIX: scale golden offers to work with 200-499 cost range
if (inventoryItem.isGolden) {
  // 80% to 200% of cost, so some are losses, some are big wins
  var mult = 0.8 + Math.random() * 1.2;
  offerPrice = Math.round(inventoryItem.cost * mult);
  isGoodDeal = offerPrice > inventoryItem.cost;
}
```

### Fix: Fake offer range scaled
```javascript
// FIX: fake offers should be far below fake cost to make the loss obvious
if (inventoryItem.isFake) {
  // Fakes sell for 5-30% of what was paid (big loss)
  offerPrice = Math.max(1, Math.round(inventoryItem.cost * (0.05 + Math.random() * 0.25)));
  isGoodDeal = false; // always a loss
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Decorative price + fixed gameplay value | Price IS the cost | Phase 7 (this fix) | Prices coherent across all screens |
| Fixed cost (10/15/50) for all watches | Random realistic cost (10-99/200-499) | Phase 7 (this fix) | Act 2 offers become interesting (15-130 EUR range) |
| Combo affects hidden score only | Combo either discounts cost or is cosmetic | Phase 7 (this fix) | Combo has clear meaning in buy/sell context |

## Complete Line Reference

All locations in game.js that touch price/value/cost and must be reviewed:

| Line(s) | Function | What it does | Needs change? |
|---------|----------|-------------|---------------|
| 438 | `spawnWatch` | Sets `watchValue` (10/-15/50) | YES: derive from price |
| 441 | `spawnWatch` | Sets `price` (decorative random) | NO: keep as-is, this becomes the real cost |
| 458 | `spawnWatch` | Sets `value: watchValue` on watch object | YES: set to price or -price |
| 740-751 | `addToInventory` | Sets `cost: Math.abs(watch.value)` | YES: set `cost: watch.price` |
| 759 | `slashWatch` | Calls `addToInventory(watch)` | NO: keep order |
| 760 | `slashWatch` | `act1Spending += Math.abs(watch.value)` | YES: use `watch.price` |
| 770 | `slashWatch` | `watch.value = watch.value * comboMultiplier` | DECIDE: does combo affect cost? |
| 785 | `slashWatch` | `score += watch.value` | REVIEW: Act 1 score meaning |
| 1065 | `drawCardToCanvas` | Renders `card.price + ' EUR'` | NO: already shows price |
| 1153 | `drawBuyerCardToCanvas` | Shows `'Paye: ' + card.cost` | NO: will auto-fix once cost=price |
| 1158 | `drawBuyerCardToCanvas` | Shows `card.offerPrice + ' EUR'` | NO: already correct |
| 1183-1209 | `createBuyerOffer` | Calculates offer margins from cost | REVIEW: golden and fake ranges |
| 1239 | `createBuyerOffer` | Copies `price: inventoryItem.price` | NO: already copies |
| 1240 | `createBuyerOffer` | Sets `cost: inventoryItem.cost` | NO: will auto-fix |
| 1325 | `renderScore` | Shows `'Depense: ' + act1Spending + ' EUR'` | NO: will auto-fix once act1Spending uses price |
| 1498 | `renderTransition` | Shows `'Depense totale : ' + act1Spending + ' EUR'` | NO: will auto-fix |
| 1523 | `renderTransition` | Shows `item.price + ' EUR'` in item list | REVIEW: should use item.cost if they differ |
| 1684 | `acceptOffer` | `profit = offerPrice - invItem.cost` | NO: will auto-fix |
| 2021 | `endGame` | `finalProfit = act2Revenue - act1Spending` | NO: will auto-fix |

## Open Questions

1. **What should combo do in the buy/sell context?**
   - What we know: Combo currently multiplies `watch.value` AFTER `addToInventory` and `act1Spending`, so it only affects the running `score` display. It has zero effect on actual cost or profit.
   - What's unclear: Should combo give a discount on purchase price (rewarding streaks with cheaper buys)? Or should it be purely cosmetic feedback?
   - Recommendation: **Option A -- combo discount.** After slashing, compute `discountedCost = Math.round(watch.price / comboMultiplier)`. Use this for `inventory.cost` and `act1Spending`. The card still SHOWS the full price, but the player effectively pays less. Show a floating text like "x2 -50%" to communicate the discount. This makes combos tangibly rewarding in the profit calculation.

2. **Are the current difficulty curves still balanced with higher costs?**
   - What we know: Bad offer rate ramps 15% to 50%. Markup ramps 50-120% down to 5-30%. These percentages will work at any cost scale.
   - What's unclear: Whether the absolute numbers feel right (e.g., losing 30 EUR on a bad fake deal vs. old 15 EUR).
   - Recommendation: Playtest after implementation. The percentages are scale-invariant so they SHOULD work, but the psychological impact of larger numbers may need tuning.

3. **Should `miss penalty` (-8 EUR for missing a real watch) be scaled to the card's price?**
   - What we know: Currently a flat -8 EUR penalty (line 485). With prices of 10-99 EUR, -8 is small relative to a 99 EUR purchase.
   - What's unclear: Whether the miss penalty should scale with the missed card's price.
   - Recommendation: Keep flat -8 for now. Scaling would complicate things and the miss penalty is a minor mechanic. Can be addressed in a future tuning phase.

## Sources

### Primary (HIGH confidence)
- `game.js` direct source code reading -- all line numbers verified against current file
- `.planning/STATE.md` -- accumulated decisions from previous phases
- `.planning/ROADMAP.md` -- phase definition and success criteria

## Metadata

**Confidence breakdown:**
- Price flow analysis: HIGH -- direct source code reading with line-by-line verification
- Fix approach: HIGH -- straightforward variable unification, no architectural unknowns
- Pitfalls: HIGH -- derived from actual code structure and identified edge cases
- Combo multiplier decision: MEDIUM -- multiple valid approaches, recommendation is sound but untested

**Research date:** 2026-02-08
**Valid until:** Indefinite (codebase-specific research, not library-dependent)
