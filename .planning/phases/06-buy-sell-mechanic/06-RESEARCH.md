# Phase 6: Buy/Sell Mechanic - Research

**Researched:** 2026-02-08
**Domain:** Vanilla JS game state management, two-act gameplay, inventory systems, Canvas 2D UI
**Confidence:** HIGH

## Summary

This phase transforms the existing single-round slashing game into a two-act experience: Act 1 "Les Achats" (buying, largely the existing game with reframing) and Act 2 "La Revente" (selling inventory to buyers). The primary technical challenges are: (1) refactoring the current flat game state (`'start' | 'playing' | 'over'`) into a multi-phase state machine (`'start' | 'act1' | 'transition' | 'act2' | 'over'`), (2) building an inventory system that records Act 1 purchases and drives Act 2 buyer offers, (3) designing a distinct Act 2 interaction that reuses the existing card physics/rendering but feels different from slashing, and (4) creating a transition screen with dramatic fake reveal and a game-over screen with full breakdown.

The codebase is a single `game.js` file (~1435 lines) with no modules, no build tools, and no dependencies. All state lives in top-level `var` declarations. The existing card rendering (`drawCardToCanvas`, `createCardSprite`), physics (gravity, velocity), trail/particle systems, sound engine, and input handling are all reusable. The key architectural insight is that the existing code already supports the core patterns needed -- the refactoring is about adding states and data flow, not rebuilding systems.

For Act 2's interaction (a Claude's Discretion area), the recommended approach is **swipe-direction-based accept/reject**: swipe RIGHT to accept an offer (sell the watch), swipe LEFT to reject (let the buyer card fly away). This is visually distinct from Act 1's omnidirectional slash-to-buy, reuses the existing trail/swipe detection infrastructure, and creates a satisfying decision-making feel reminiscent of Tinder-style accept/reject patterns that are immediately intuitive on mobile.

**Primary recommendation:** Extend the existing `gameState` string enum to five states (`start`, `act1`, `transition`, `act2`, `over`), keep all game logic in the same `game.js` file, and use a simple `inventory[]` array to bridge Act 1 purchases to Act 2 offers.

## Standard Stack

### Core

| Component | Version | Purpose | Why Standard |
|-----------|---------|---------|--------------|
| Vanilla JS (ES5-compatible) | N/A | All game logic | Project constraint: zero dependencies |
| Canvas 2D API | W3C standard | All rendering (cards, UI, transitions) | Already in use; no alternative needed |
| Pointer Events API | W3C standard | Touch/mouse input for swipe direction | Already in use from Phase 1 |
| Web Audio API (SoundEngine) | W3C standard | Audio feedback for Act 2 events | Already implemented in Phase 5 |

### Supporting

| Component | Purpose | When to Use |
|-----------|---------|-------------|
| `localStorage` | Best score persistence (existing) | Already in use; extend for two-act best score |
| `requestAnimationFrame` | Game loop (existing) | Already the render driver; no changes needed |
| `performance.now()` | Trail point timestamps (existing) | Already in use for swipe detection |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| String enum state machine | State classes/objects | Overkill for 5 states in a single file; string enum matches existing pattern |
| Single `game.js` file | ES6 modules | Requires build tools or module-supporting server; violates project constraints |
| Array inventory | Map/Object inventory | Array is simpler, sufficient for small inventory (<50 items), easier to iterate for rendering |

**Installation:** None. Zero dependencies.

## Architecture Patterns

### Recommended State Flow

```
'start' --> 'act1' --> 'transition' --> 'act2' --> 'over'
                                                     |
                                                     v
                                                  'start' (replay)
```

### Extended Game State Variables

```javascript
// Extend existing gameState to support five phases
var gameState = 'start'; // 'start' | 'act1' | 'transition' | 'act2' | 'over'

// Act tracking
var currentAct = 1;

// Inventory (built during Act 1, consumed during Act 2)
var inventory = [];        // [{brand, price, isFake, isGolden, soldFor, sold}]
var act1Spending = 0;      // Total EUR spent in Act 1
var act2Revenue = 0;       // Total EUR earned in Act 2
var unsoldCount = 0;       // Watches remaining at end of Act 2
var unsoldValue = 0;       // EUR value of unsold inventory

// Act 2 specific
var ACT2_DURATION = 45;    // seconds (recommendation: shorter than Act 1)
var act2Elapsed = 0;
var currentOfferIndex = 0; // Which inventory item the current offer targets
```

### Pattern 1: Extended State Machine (String Enum)

**What:** Extend the existing `gameState` string variable from 3 to 5 states, with conditional branches in the game loop.
**When to use:** This exact game. The existing pattern works; do not over-engineer.

```javascript
// Source: Existing game.js pattern (line 1417-1424), extended
function gameLoop(timestamp) {
  if (paused) return;

  if (lastTime === 0) {
    lastTime = timestamp;
    requestAnimationFrame(gameLoop);
    return;
  }

  var dt = Math.min((timestamp - lastTime) / 1000, 0.05);
  lastTime = timestamp;

  if (gameState === 'start') {
    renderStart(dt);
  } else if (gameState === 'act1') {
    updateAct1(dt);
    renderAct1(dt);
  } else if (gameState === 'transition') {
    renderTransition(dt);
  } else if (gameState === 'act2') {
    updateAct2(dt);
    renderAct2(dt);
  } else if (gameState === 'over') {
    renderGameOver();
  }

  requestAnimationFrame(gameLoop);
}
```

### Pattern 2: Inventory as Bridge Between Acts

**What:** Each slashed watch in Act 1 pushes an entry to `inventory[]`. Act 2 generates buyer offers referencing inventory items.
**When to use:** Core data structure linking the two acts.

```javascript
// In slashWatch() during Act 1, after scoring:
function addToInventory(watch) {
  inventory.push({
    brand: watch.brand,
    price: watch.price,       // What player "paid" (the card's display price)
    isFake: watch.isFake,
    isGolden: watch.isGolden,
    cost: Math.abs(watch.value), // Actual game-economy cost
    sold: false,               // Set true when sold in Act 2
    soldFor: 0                 // Revenue from sale
  });
}
```

### Pattern 3: Act 2 Buyer Offer Cards

**What:** Buyer cards fly in like Act 1 cards but display a watch brand name + offer price. The card visual indicates which inventory item is being bid on.
**When to use:** Act 2 card spawning.

```javascript
// Buyer offer card data structure
function createBuyerOffer(inventoryItem, t) {
  // t = 0..1 normalized Act 2 time for difficulty ramp
  var baseCost = inventoryItem.cost;

  // Early game: generous margins (50-120% markup)
  // Late game: tight margins (5-30% markup), some lowball offers below cost
  var marginRange = lerp(0.5, 0.05, t);    // Shrinking margin floor
  var marginCeil = lerp(1.2, 0.30, t);     // Shrinking margin ceiling
  var margin = marginRange + Math.random() * (marginCeil - marginRange);

  // Some offers are deliberately bad (below cost)
  var isBadOffer = Math.random() < (0.15 + t * 0.35); // 15%->50% bad offers
  if (isBadOffer) {
    margin = -(0.1 + Math.random() * 0.4); // -10% to -50% of cost
  }

  var offerPrice = Math.round(baseCost * (1 + margin));
  offerPrice = Math.max(1, offerPrice); // Floor at 1 EUR

  return {
    targetIndex: inventory.indexOf(inventoryItem),
    brand: inventoryItem.brand,
    offerPrice: offerPrice,
    isFake: inventoryItem.isFake,
    isGoodDeal: offerPrice > baseCost
    // ... plus all the physics properties from spawnWatch()
  };
}
```

### Pattern 4: Swipe Direction Detection for Accept/Reject

**What:** Track the net horizontal movement of the swipe. Right-dominant swipe = accept offer. Left-dominant swipe = reject offer.
**When to use:** Act 2 interaction only. Act 1 keeps omnidirectional slash.

```javascript
// Detect swipe direction from trail points
function getSwipeDirection(trailPoints) {
  if (trailPoints.length < 3) return null;
  var first = trailPoints[0];
  var last = trailPoints[trailPoints.length - 1];
  var dx = last.x - first.x;
  var dy = last.y - first.y;

  // Only count as directional if horizontal component dominates
  if (Math.abs(dx) < 30) return null; // Too short, not a clear swipe
  if (Math.abs(dx) < Math.abs(dy) * 0.8) return null; // Too vertical

  return dx > 0 ? 'right' : 'left';
}
```

### Pattern 5: Transition Screen as Static Render

**What:** The transition screen is NOT animated cards. It is a static (or gently animated) full-screen overlay rendered in the game loop when `gameState === 'transition'`. Player taps "Vendre !" to advance.
**When to use:** Between Act 1 and Act 2.

```javascript
// Transition screen: inventory summary + fake reveal
function renderTransition(dt) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  renderBackground();

  var cx = canvasWidth / 2;

  // "Acte 1 Termine!" header
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 24px sans-serif';
  ctx.fillText('Acte 1 termin\u00e9 !', cx, canvasHeight * 0.08);

  // Spending summary
  ctx.font = '18px sans-serif';
  ctx.fillText('D\u00e9pense totale : ' + act1Spending + ' EUR', cx, canvasHeight * 0.14);

  // Inventory list (scrollable mini-cards or text list)
  renderInventoryList(cx, canvasHeight * 0.20, dt);

  // Fake reveal (dramatic)
  var fakeCount = inventory.filter(function(item) { return item.isFake; }).length;
  if (fakeCount > 0) {
    ctx.font = 'bold 18px sans-serif';
    ctx.fillStyle = '#ff6666';
    ctx.fillText('Oops, ' + fakeCount + ' contrefa\u00e7on' + (fakeCount > 1 ? 's' : '') +
      ' dans le lot !', cx, canvasHeight * 0.72);
  }

  // "Vendre !" button
  renderButton(vendreButton, 'Vendre !', canvasHeight * 0.85);
}
```

### Anti-Patterns to Avoid

- **Separate files or modules:** The project is a single `game.js` file. Do NOT split into modules -- it would require a build tool or ES module server support, violating project constraints.
- **Deep state nesting:** Do NOT create nested state machines (e.g., sub-states within Act 2). The game is simple enough for a flat 5-state enum.
- **Rebuilding card rendering for Act 2:** Reuse `drawCardToCanvas` and `createCardSprite` with minor modifications (different text layout for buyer offers). Do NOT create a separate rendering pipeline.
- **Complex inventory data structures:** A simple array with object entries is sufficient. Do NOT use Maps, linked lists, or database-like patterns for ~10-30 items.
- **Auto-advancing from transition:** The user decided on player-paced transition. Do NOT add a timer that auto-starts Act 2.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Card physics for Act 2 | New physics system | Existing `spawnWatch()` + `updateWatches()` | Same gravity, velocity, rotation already works; just change card content |
| Card rendering for buyer offers | New draw function | Existing `drawCardToCanvas()` with modified text | Change brand/price text, keep same card frame, shadow, rounded corners |
| Sound effects for Act 2 | New sounds | Existing `SoundEngine.playCoin()`, `playPenalty()` | Accept = coin sound, reject = no sound, bad deal accepted = penalty |
| Trail rendering | New trail for swipe direction | Existing `renderTrail()` | Trail already visualizes the swipe; add color hint (green right, red left) |
| Button hit testing | New button system | Existing `startButton`/`replayButton` pattern | Same `{x, y, w, h}` object + tap hit test |
| Timer display | New timer for Act 2 | Existing `renderTimer()` with `act2Elapsed` | Same countdown logic, just different elapsed variable |

**Key insight:** Phase 6 is 80% refactoring existing systems and 20% new code. The card rendering, physics, sound, input, and UI patterns all exist. The new work is: state machine extension, inventory array, buyer offer generation logic, swipe direction detection, transition screen layout, and game-over screen redesign.

## Common Pitfalls

### Pitfall 1: Breaking Act 1 While Adding Act 2

**What goes wrong:** Modifying `slashWatch()`, `updateWatches()`, or `spawnWatch()` to support Act 2 introduces bugs in Act 1.
**Why it happens:** These functions are battle-tested. Adding Act 2 conditionals without care breaks the existing flow.
**How to avoid:** Use `currentAct` checks at the top of functions that diverge, but keep the core physics/rendering path shared. Create separate `updateAct1()` and `updateAct2()` wrappers that call shared functions with act-specific parameters.
**Warning signs:** Act 1 economy changes, cards behave differently, score calculations break.

### Pitfall 2: Inventory Not Recording All Slashed Cards

**What goes wrong:** Some slashed watches don't appear in inventory for Act 2.
**Why it happens:** The `addToInventory()` call is placed in the wrong branch of `slashWatch()`, or golden watches are handled separately and missed.
**How to avoid:** Add `addToInventory()` at the very top of `slashWatch()`, BEFORE any branching on `isFake`/`isGolden`. Every slashed card in Act 1 goes to inventory, period (as per user decision).
**Warning signs:** Inventory count doesn't match `stats.realSlashed + stats.fakeSlashed`.

### Pitfall 3: Timer Conflict Between Acts

**What goes wrong:** Act 2 timer starts from Act 1's elapsed time, or Act 1 timer variable bleeds into Act 2.
**Why it happens:** Both acts share the `elapsed` variable without resetting it.
**How to avoid:** Use `act2Elapsed` as a separate variable, reset at transition. Or reset `elapsed` when entering Act 2 and use a separate `ACT2_DURATION` constant.
**Warning signs:** Act 2 starts with 5 seconds remaining, or timer shows wrong duration.

### Pitfall 4: Swipe Direction Detection Too Sensitive or Too Forgiving

**What goes wrong:** Taps register as swipes, or clear horizontal swipes are ignored.
**Why it happens:** Threshold for horizontal movement is too low (taps register) or too high (short swipes fail).
**How to avoid:** Require minimum 30px horizontal displacement AND horizontal component > 0.8x vertical component. Test on actual mobile device with thumb swipes.
**Warning signs:** Player taps a card and it registers as accept/reject. Or player swipes clearly right but nothing happens.

### Pitfall 5: Offer Generation Not Connected to Actual Inventory

**What goes wrong:** Buyer offers reference watches the player never bought, or the same watch gets multiple offers simultaneously.
**Why it happens:** Offers are generated randomly without checking inventory state.
**How to avoid:** When spawning a buyer offer, pick a random UNSOLD item from `inventory[]`. Mark it as "offer pending" to prevent duplicate offers. When an offer is rejected or expires, mark it available again.
**Warning signs:** Offer shows a brand not in inventory, or player sells more watches than they bought.

### Pitfall 6: Score Calculation Mismatch on Game Over Screen

**What goes wrong:** The breakdown numbers (spending, revenue, unsold losses) don't add up to the final profit.
**Why it happens:** Score is tracked incrementally during gameplay but the breakdown is calculated separately at game-over, using different logic.
**How to avoid:** Calculate the final breakdown FROM the inventory array at game-over time, not from running totals. This is the single source of truth: `profit = sum(soldFor) - sum(cost) - sum(unsoldCost)`.
**Warning signs:** Player sees "+45 EUR profit" but the breakdown shows spending=100, revenue=120, unsold=30, which is -10.

### Pitfall 7: Transition Screen Not Handling Empty Inventory

**What goes wrong:** Player buys zero watches in Act 1 (misses everything or only hits fakes). Transition screen is blank.
**Why it happens:** No edge case handling for empty inventory.
**How to avoid:** Check `inventory.length === 0` and show a special message: "Aucune montre achet\u00e9e ! Tu pars les mains vides..." followed by going straight to game-over (no Act 2 needed).
**Warning signs:** Blank transition screen, Act 2 with nothing to sell.

### Pitfall 8: Performance Degradation from Inventory Rendering

**What goes wrong:** Drawing 20+ mini-cards on the transition screen causes frame drops.
**Why it happens:** Each mini-card uses `drawCardToCanvas()` with shadow, rounded corners, text -- expensive per frame.
**How to avoid:** Either (a) render the transition screen once to an offscreen canvas and blit it each frame, or (b) use simple text list instead of mini-cards. The transition is a static screen -- it does not need per-frame card rendering.
**Warning signs:** Visible lag when transition screen appears with many inventory items.

## Code Examples

### Act 1 Modifications (Minimal Changes)

```javascript
// Rename update() to updateAct1(), add inventory tracking to slashWatch()
// Source: Extending existing game.js patterns

function updateAct1(dt) {
  updateTrail();

  elapsed += dt;
  if (elapsed >= ROUND_DURATION) {
    // Act 1 ends: transition to inventory screen
    gameState = 'transition';
    return;
  }

  var diff = getDifficulty();
  spawnTimer += dt;
  if (spawnTimer >= diff.spawnInterval) {
    spawnTimer -= diff.spawnInterval;
    spawnWatch(diff);
  }

  checkSlashCollisions();
  updateWatches(dt);
  updateSplitHalves(dt);
  updateParticles(dt);
  updateFloatingTexts(dt);
}

// Modify slashWatch() to add inventory in Act 1
// Add this AFTER the watch is processed but BEFORE removing from array:
//   if (gameState === 'act1') {
//     addToInventory(watch);
//     act1Spending += Math.abs(watch.value);
//   }
```

### Act 1 HUD (Reframed Display)

```javascript
// Source: Extending existing renderScore() pattern
function renderAct1HUD() {
  // "Acte 1: Les Achats" header
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.font = 'bold 14px sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.fillText('Acte 1 : Les Achats', canvasWidth / 2, 50);

  // Spending display (replaces score pill during Act 1)
  var spendText = 'D\u00e9pense: ' + act1Spending + ' EUR';
  ctx.font = 'bold 20px sans-serif';
  var textW = ctx.measureText(spendText).width;
  var pillW = Math.max(80, textW + 24);

  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.beginPath();
  roundRect(ctx, 10, 10, pillW, 36, 8);
  ctx.fill();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(spendText, 10 + pillW / 2, 28);

  // Inventory counter
  ctx.textAlign = 'left';
  ctx.font = '14px sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.fillText(inventory.length + ' montre' + (inventory.length !== 1 ? 's' : '') +
    ' achet\u00e9e' + (inventory.length !== 1 ? 's' : ''), 14, 80);
}
```

### Act 2 Buyer Card Rendering

```javascript
// Source: Extending existing drawCardToCanvas() with buyer offer layout
function drawBuyerCardToCanvas(offCtx, ox, oy, card) {
  var w = card.width;
  var h = card.height;
  var cr = 8;

  // Card body -- buyer cards use a distinct blue/teal tint
  offCtx.save();
  offCtx.shadowColor = 'rgba(0,0,0,0.25)';
  offCtx.shadowBlur = 6;
  offCtx.shadowOffsetY = 3;

  offCtx.beginPath();
  offCtx.roundRect(ox, oy, w, h, cr);
  var grad = offCtx.createLinearGradient(ox, oy, ox, oy + h);
  grad.addColorStop(0, '#e8f4f8');
  grad.addColorStop(1, '#d0eef6');
  offCtx.fillStyle = grad;
  offCtx.fill();
  offCtx.restore();
  offCtx.shadowColor = 'transparent';

  // Border
  offCtx.beginPath();
  offCtx.roundRect(ox, oy, w, h, cr);
  offCtx.strokeStyle = '#90cad8';
  offCtx.lineWidth = 1;
  offCtx.stroke();

  // "OFFRE" label at top
  offCtx.font = 'bold 10px sans-serif';
  offCtx.textAlign = 'center';
  offCtx.fillStyle = '#007782';
  offCtx.fillText('OFFRE', ox + w / 2, oy + h * 0.12);

  // Brand name in middle
  var brandFontSize = Math.max(12, Math.min(16, w * 0.18));
  offCtx.font = 'bold ' + brandFontSize + 'px sans-serif';
  offCtx.fillStyle = '#333333';
  offCtx.fillText(card.brand, ox + w / 2, oy + h * 0.45);

  // Offer price (large, prominent)
  offCtx.font = 'bold 18px sans-serif';
  offCtx.fillStyle = card.isGoodDeal ? '#2a7d4f' : '#cc3333';
  offCtx.fillText(card.offerPrice + ' EUR', ox + w / 2, oy + h * 0.70);

  // Subtle directional hints
  offCtx.font = '9px sans-serif';
  offCtx.fillStyle = 'rgba(0,0,0,0.3)';
  offCtx.textAlign = 'left';
  offCtx.fillText('\u2190 non', ox + 6, oy + h * 0.92);
  offCtx.textAlign = 'right';
  offCtx.fillText('oui \u2192', ox + w - 6, oy + h * 0.92);
}
```

### Swipe Direction Detection for Act 2

```javascript
// Source: Extending existing checkSlashCollisions() pattern
function checkAct2Collisions() {
  if (trailPoints.length < 3) return;

  var direction = getSwipeDirection(trailPoints);
  if (!direction) return; // Not a clear directional swipe

  var start = Math.max(0, trailPoints.length - 6);
  for (var i = start + 1; i < trailPoints.length; i++) {
    var p0 = trailPoints[i - 1];
    var p1 = trailPoints[i];

    for (var j = watches.length - 1; j >= 0; j--) {
      var w = watches[j];
      if (w.slashed) continue;

      var hitRadius = Math.max(w.width, w.height) / 2 * 1.1;
      if (lineSegmentIntersectsCircle(p0.x, p0.y, p1.x, p1.y, w.x, w.y, hitRadius)) {
        if (direction === 'right') {
          acceptOffer(w);
        } else {
          rejectOffer(w);
        }
      }
    }
  }
}

function acceptOffer(offerCard) {
  offerCard.slashed = true;

  var invItem = inventory[offerCard.targetIndex];
  invItem.sold = true;
  invItem.soldFor = offerCard.offerPrice;
  act2Revenue += offerCard.offerPrice;

  // Visual + audio feedback
  var profit = offerCard.offerPrice - invItem.cost;
  if (profit >= 0) {
    spawnFloatingText(offerCard.x, offerCard.y, '+' + offerCard.offerPrice, false, false);
    SoundEngine.playCoin(0);
  } else {
    spawnFloatingText(offerCard.x, offerCard.y, '+' + offerCard.offerPrice, true, false);
    spawnLabelText(offerCard.x, offerCard.y - 15, 'Mauvaise affaire !', '220, 50, 50', 16);
    SoundEngine.playPenalty();
  }

  // Split animation (reuse existing)
  var slashAngle = 0; // Horizontal split for rightward swipe
  var halves = createSplitHalves(offerCard, slashAngle);
  for (var i = 0; i < halves.length; i++) {
    splitHalves.push(halves[i]);
  }

  spawnParticles(offerCard.x, offerCard.y, profit < 0, 12, false);

  var idx = watches.indexOf(offerCard);
  if (idx !== -1) watches.splice(idx, 1);
}

function rejectOffer(offerCard) {
  offerCard.slashed = true;
  // Rejected: mark inventory item as available for future offers
  // Fling the card off to the left
  offerCard.vx = -300;
  offerCard.vy = -100;

  spawnLabelText(offerCard.x, offerCard.y, 'Refus\u00e9', '255, 255, 255', 14);

  var idx = watches.indexOf(offerCard);
  if (idx !== -1) watches.splice(idx, 1);
}
```

### Game Over Screen with Full Breakdown

```javascript
// Source: Extending existing renderGameOver() pattern
function renderTwoActGameOver() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  renderBackground();

  var cx = canvasWidth / 2;
  ctx.textAlign = 'center';

  // Header
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 28px sans-serif';
  ctx.fillText('Temps \u00e9coul\u00e9 !', cx, canvasHeight * 0.08);

  // Breakdown
  var lineY = canvasHeight * 0.16;
  var gap = 24;

  // Act 1 spending
  ctx.font = '16px sans-serif';
  ctx.fillStyle = '#ff9999';
  ctx.fillText('Acte 1 - D\u00e9penses : -' + act1Spending + ' EUR', cx, lineY);
  lineY += gap;

  // Act 2 revenue
  ctx.fillStyle = '#99ff99';
  ctx.fillText('Acte 2 - Recettes : +' + act2Revenue + ' EUR', cx, lineY);
  lineY += gap;

  // Unsold losses
  var unsoldItems = inventory.filter(function(i) { return !i.sold; });
  var unsoldLoss = 0;
  for (var i = 0; i < unsoldItems.length; i++) {
    unsoldLoss += unsoldItems[i].cost;
  }
  ctx.fillStyle = '#ff6666';
  ctx.fillText('Invendus (' + unsoldItems.length + ') : -' + unsoldLoss + ' EUR', cx, lineY);
  lineY += gap + 8;

  // Final profit
  var finalProfit = act2Revenue - act1Spending - unsoldLoss;
  var sign = finalProfit >= 0 ? '+' : '';
  ctx.font = 'bold 22px sans-serif';
  ctx.fillStyle = finalProfit >= 0 ? '#50e880' : '#ff6666';
  ctx.fillText('Profit final : ' + sign + finalProfit + ' EUR', cx, lineY);
  lineY += gap + 4;

  // ... rating, birthday message, replay button (reuse existing patterns)
}
```

## Act 2 Interaction Design (Claude's Discretion)

### Recommendation: Swipe Direction Accept/Reject

**Why this approach:**

1. **Feels different from Act 1:** Act 1 is "slash anything to grab it" (omnidirectional). Act 2 is "evaluate and decide" (directional left/right). The interaction shift mirrors the gameplay shift from impulsive buying to deliberate selling.

2. **Reuses existing infrastructure:** The trail system, pointer events, and collision detection already exist. Only the interpretation changes: instead of "any intersection = slash," we check horizontal direction of the swipe.

3. **Intuitive on mobile:** Left/right swiping for reject/accept is a deeply ingrained mobile pattern (Tinder, app review UIs, card-based games). No tutorial needed.

4. **Visual feedback is natural:** Right-swiped cards fly off to the right with green particles (sold!). Left-swiped cards fly off left with no fanfare (declined). The asymmetry reinforces the decision feel.

5. **Compatible with difficulty ramp:** As margins shrink, the decision becomes harder, but the interaction stays the same. Players don't need to learn new mechanics -- they just need to think faster.

### Alternative Considered and Rejected: Tap to Accept, Let Fall to Reject

This would be simpler but (a) feels identical to Act 1's slash-to-interact, (b) removes the active rejection gesture, and (c) penalizes players who can't reach cards in time rather than rewarding good judgment. The swipe direction approach keeps both accept and reject as active choices.

### Act 2 Timer Duration: 45 seconds

**Rationale:** Act 2 should be shorter than Act 1 (60s) because:
- The player already has a fixed-size inventory; longer time with few items = boredom
- Selling pressure comes from limited time, not unlimited supply
- Total game length (60s + transition + 45s) stays under 2 minutes of active play
- If inventory is small (3-5 items), 45s is plenty; if large (15+), it creates meaningful pressure

### Act 2 Economy Values

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| Good offer margin (early) | +50% to +120% of cost | Generous early, so first few sales feel rewarding |
| Good offer margin (late) | +5% to +30% of cost | Tight margins force careful reading |
| Bad offer rate (early) | 15% of offers | Few traps at start |
| Bad offer rate (late) | 50% of offers | Half the offers are losers |
| Bad offer margin | -10% to -50% of cost | Clearly below purchase price |
| Fake watch offers | Random low prices | Fakes have no real value, so any sale is "good" but prices are low (5-15 EUR) |

### Buyer Offer Mapping to Inventory

**Recommended approach:** Round-robin through unsold inventory items. Each buyer card targets a specific unsold watch. When a watch receives an offer, it cannot get another simultaneous offer. When the offer is rejected or expires (falls off screen), the watch becomes available for future offers.

**Why round-robin over random:** Ensures every inventory item gets at least one chance to be sold. Random selection could repeatedly target the same item while others go unsold.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Single `gameState` with 3 values | Extended to 5 values | This phase | Minimal refactoring; same pattern scaled up |
| Score as single running total | Separate act1Spending + act2Revenue | This phase | Enables breakdown on game-over screen |
| `resetGame()` clears everything | `resetGame()` clears everything + inventory/act variables | This phase | Must ensure all new variables are reset |

**No deprecated technology concerns.** All code uses Canvas 2D, Pointer Events, and Web Audio API -- stable browser standards.

## Open Questions

1. **Fake watch selling mechanics**
   - What we know: Fakes bought in Act 1 become "a liability -- stuck in inventory, harder to sell profitably"
   - What's unclear: Should fakes be completely unsellable (guaranteed loss), or should they be sellable at very low prices (buyer doesn't know it's fake)?
   - Recommendation: Make fakes sellable at very low prices (5-15 EUR) to give the player a chance to recover some cost. Completely unsellable items feel punitive and unfun. The loss comes from the differential: paid the fake penalty (-15 in Act 1 economy) and can only recover 5-15 EUR in Act 2.

2. **Golden watch offers in Act 2**
   - What we know: Golden watches are rare (+50 points in Act 1). They should be high-value in Act 2.
   - What's unclear: How much premium golden offers should carry.
   - Recommendation: Golden watch offers range 150-400 EUR (2-8x the normal range), making them the "jackpot" moment of Act 2 as well. Use the jackpot sound when a golden offer is accepted.

3. **What happens when all inventory is sold before timer ends?**
   - What we know: Act 2 has a timer. If all watches are sold early, the timer is meaningless.
   - What's unclear: Should Act 2 end early when inventory is empty?
   - Recommendation: End Act 2 immediately when inventory is fully sold, with a congratulatory message ("Tout vendu !"). Waiting out a timer with nothing to do is bad UX.

4. **Trail color hint during Act 2 swipe**
   - What we know: Act 1 trail is gold (#FFD700). Act 2 could benefit from directional color.
   - What's unclear: Whether changing trail color mid-swipe is worth the complexity.
   - Recommendation: Use green trail for rightward swipe (accept), red trail for leftward swipe (reject). Change `TRAIL_COLOR` dynamically based on `getSwipeDirection()` in Act 2. Simple and effective visual feedback.

## Sources

### Primary (HIGH confidence)
- Existing `game.js` codebase (1435 lines) -- all patterns, data structures, rendering, and physics examined directly
- [Game Programming Patterns: State](https://gameprogrammingpatterns.com/state.html) -- FSM patterns for game state management, string enum vs state objects tradeoffs
- [JavaScript State Stack Engine](https://idiallo.com/blog/javascript-game-state-stack-engine) -- Multi-state game architecture in vanilla JS

### Secondary (MEDIUM confidence)
- [Swipe interaction patterns](https://www.ics.com/blog/tap-tinder-and-touchscreens-how-swipe-can-improve-user-experience) -- Swipe right/left as accept/reject is deeply ingrained mobile UX pattern
- [Game state management patterns](https://garden.bradwoods.io/notes/game-dev-journal/02-code-patterns) -- State management patterns for JavaScript games
- [Canvas game state transitions](http://dev.bennage.com/blog/2013/01/11/game-dev-02/) -- Start screen, playing, game-over state flow in canvas games

### Tertiary (LOW confidence)
- Act 2 economy values (margin ranges, bad offer rates) are design estimates based on game balance principles. They will need playtesting to tune.
- Act 2 timer duration (45s) is an estimate. May need adjustment based on typical inventory size and game feel.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- All components are already in the codebase; no new technology
- Architecture: HIGH -- Extending proven patterns from the existing codebase; string enum state machine is battle-tested here
- Act 2 interaction design: MEDIUM -- Swipe direction is well-established mobile UX but hasn't been tested in this specific game context
- Economy values: LOW -- All numerical parameters are design estimates needing playtest validation
- Pitfalls: HIGH -- All pitfalls derived from direct analysis of the existing codebase's structure and data flow

**Research date:** 2026-02-08
**Valid until:** 2026-03-10 (No external dependencies; validity tied to codebase stability)
