# Architecture: Vinted Cards, Buy/Sell, and Audio Integration

**Domain:** Extending existing Canvas 2D arcade game with new visuals, multi-phase gameplay, and sound
**Researched:** 2026-02-08
**Confidence:** HIGH (existing codebase fully analyzed, Canvas 2D and Web Audio API are stable platforms)

## Executive Summary

The existing game.js (1381 lines) is a well-structured single-file Canvas 2D game with clean separation of concerns via functions. The three new features (Vinted card rendering, two-act buy/sell state machine, audio) integrate at clearly identifiable points. The card rendering replaces draw functions. The state machine extends the existing string-based state variable with new states and a transition screen. Audio adds a new subsystem that hooks into existing event points (slash, score change, timer). No architectural overhaul is needed; this is additive evolution of a working codebase.

## Existing Architecture Map

```
game.js (1381 lines) -- Single file, no modules, no build tools

GLOBALS (lines 1-93)
  Canvas refs, game state string, score, combo, timer, watch constants

PERSISTENCE (lines 29-51)
  loadBestScore(), saveBestScore() via localStorage

DIFFICULTY (lines 200-211)
  getDifficulty() returns spawn interval, speed, fake chance based on elapsed time

ENTITY LIFECYCLE (lines 215-300)
  spawnWatch() -> watches[] flat array -> updateWatches() physics + cleanup

EFFECTS (lines 303-637)
  floatingTexts[], splitHalves[], particles[] -- each with spawn/update/render

COLLISION (lines 365-411)
  lineSegmentIntersectsCircle() + checkSlashCollisions() iterates trail x watches

SLASH HANDLER (lines 415-468)
  slashWatch() -- marks slashed, updates combo/score, creates halves+particles+text

DRAWING (lines 639-895)
  drawWatch() dispatches to drawRoundWatch/drawSquareWatch/drawSportWatch
  drawBrandLabel() renders text on dial
  Each style: band stubs, case shape, cream dial, hour markers, hands, crown, brand

INPUT (lines 146-192)
  Pointer Events: pointerdown/pointermove/pointerup on canvas
  State-aware dispatch: start->handleStartTap, playing->trail, over->handleReplayTap

TRAIL (lines 898-930)
  updateTrail() prunes old points, renderTrail() draws gold segments

HUD (lines 932-1054)
  renderScore(), renderTimer(), renderCombo(), renderRating()

SCREENS (lines 1056-1271)
  renderStart() with decorative watches, renderGameOver() with stats+rating+birthday

GAME LOOP (lines 1299-1381)
  update(dt) -> render(dt) dispatched by gameState string
  gameLoop() via requestAnimationFrame with delta-time capping at 50ms
```

## Integration Analysis

### Feature 1: Vinted Card Rendering

**What changes:** The watch drawing functions become card drawing functions. The entity shape changes from circle to rectangle.

#### Components to REPLACE

| Current | New | Lines Affected |
|---------|-----|----------------|
| `drawRoundWatch()` | REMOVE | 669-724 |
| `drawSquareWatch()` | REMOVE | 727-805 |
| `drawSportWatch()` | REMOVE | 808-870 |
| `drawBrandLabel()` | REMOVE (integrated into card) | 873-884 |
| `drawWatch()` | `drawCard()` -- single function, no style dispatch | 641-666 |

#### Components to MODIFY

| Current | Change | Reason |
|---------|--------|--------|
| `WATCH_STYLES` array | REMOVE -- cards have one style | No longer dispatching to 3 draw functions |
| `spawnWatch()` | Rename to `spawnCard()`, remove style property, add `width`/`height` instead of `size` | Cards are rectangular, not circular |
| `renderHalf()` | Update clip region for rectangular card | Current clips circle; needs to clip rounded rect |
| `lineSegmentIntersectsCircle()` | Keep AND add `lineSegmentIntersectsRect()` | Cards need rectangular hitbox |
| `checkSlashCollisions()` | Use rect-based collision with card dimensions | Currently uses `hitRadius = w.size / 2 * 1.2` |

#### Components UNCHANGED

| Component | Why Unchanged |
|-----------|---------------|
| `spawnWatch()` physics (x, y, vx, vy, gravity) | Cards follow same parabolic arcs |
| `updateWatches()` | Position/velocity update is shape-agnostic |
| Split halves physics | Same perpendicular push, gravity, fade |
| Particle system | Particles are independent of entity shape |
| Trail rendering | Trail is independent of entity shape |

#### Card Rendering Approach

**Canvas 2D card drawing (no images, no external assets):**

```
drawCard(ctx, card):
  ctx.save()
  ctx.translate(card.x, card.y)
  ctx.rotate(card.rotation)

  // Drop shadow
  ctx.shadowColor = 'rgba(0,0,0,0.3)'
  ctx.shadowBlur = 8
  ctx.shadowOffsetY = 3

  // White card body (rounded rectangle)
  ctx.beginPath()
  ctx.roundRect(-w/2, -h/2, w, h, 8)
  ctx.fillStyle = '#ffffff'
  ctx.fill()

  // Reset shadow for inner content
  ctx.shadowColor = 'transparent'

  // Watch illustration zone (top 60% of card)
  // Reuse simplified watch drawing (circle + hands) as illustration
  drawWatchIllustration(ctx, 0, -h*0.1, illustrationSize, card.caseColor)

  // Brand name (bottom 25% -- large, readable)
  ctx.font = 'bold ' + fontSize + 'px sans-serif'
  ctx.fillStyle = card.isFake ? '#cc3333' : '#2a7d4f'  // only for non-sneaky
  ctx.fillText(card.brand, 0, h*0.3)

  // Price tag (small, bottom)
  ctx.font = '10px sans-serif'
  ctx.fillText(card.price + ' EUR', 0, h*0.4)

  ctx.restore()
```

**Key design decisions:**
- Use native `ctx.roundRect()` -- Baseline Widely Available since April 2023, supported in Chrome 99+, Safari 16.4+, Firefox 112+. The existing codebase already has a manual `roundRect()` helper (line 965) as fallback.
- Use `ctx.shadowColor/shadowBlur/shadowOffsetY` for drop shadow -- native Canvas, no extra draw calls.
- Card dimensions: width ~80px, height ~110px (portrait card ratio ~0.73). Larger than current 60px diameter watches, which improves readability.
- Brand name moves from tiny text on watch dial to large text below watch illustration. This is the primary readability fix.

#### Collision Detection: Circle to Rectangle

The current collision uses `lineSegmentIntersectsCircle()`. Cards need rectangle collision.

**Recommended approach:** Line-segment-to-AABB (Axis-Aligned Bounding Box) test. Since cards rotate, we have two options:

**Option A: Oriented Bounding Box (accurate but complex)**
Transform trail points into card-local coordinates (undo rotation), then test against axis-aligned rect. Mathematically correct for rotated cards.

**Option B: Expanded circle approximation (simple, good enough)**
Use a circle whose radius is `Math.max(cardWidth, cardHeight) / 2 * 1.1`. Cards are not that much more rectangular than the current circular watches, and the existing 20% generous hitbox makes this work fine for gameplay.

**Recommendation: Option B.** The game already uses a generous 20% hitbox expansion (line 404: `hitRadius = w.size / 2 * 1.2`). Using `Math.max(card.width, card.height) / 2 * 1.1` as the hit radius keeps the existing circle-based collision code working without modification. The slight inaccuracy at card corners is a gameplay benefit (generous feel), not a bug. Only switch to Option A if playtesting reveals missed slashes on card edges.

#### Split Animation for Cards

Current split halves use a vertical clip dividing the entity in half:
```javascript
// line 548-552
if (half.clipSide === 'right') {
  ctx.rect(0, -large, large, large * 2);
} else {
  ctx.rect(-large, -large, large, large * 2);
}
```

This works identically for rectangular cards. The clip is a vertical line through the center, which splits any shape cleanly. The `renderHalf()` function calls the full draw function within the clip region. Changing from `drawWatch()` to `drawCard()` inside `renderHalf()` is the only change needed.

### Feature 2: Two-Act Buy/Sell State Machine

**What changes:** The game state expands from 3 states to 6-7 states. A new "inventory" data structure carries items between acts. Act 2 introduces a new entity type (buyer offers) alongside the existing slash mechanic.

#### Current State Machine

```
'start' --> 'playing' --> 'over'
   ^                        |
   +------------------------+
```

Controlled by `var gameState = 'start'` (line 13), dispatched in `gameLoop()` (line 1362-1369) and `setupInput()` (line 153-161).

#### New State Machine

```
'start' --> 'buying' --> 'buyEnd' --> 'selling' --> 'over'
   ^                                                  |
   +--------------------------------------------------+
```

| State | Purpose | Duration | What Happens |
|-------|---------|----------|--------------|
| `'start'` | Title screen | Until tap | Same as current, updated title text |
| `'buying'` | Act 1: buy watches | 30-40s timed | Cards fly up, slash real ones to buy, avoid fakes |
| `'buyEnd'` | Transition screen | 2-3s auto | Shows inventory summary, "Maintenant, revends !" |
| `'selling'` | Act 2: sell inventory | 30-40s timed | Buyer offers fly up, slash good offers, avoid lowballs |
| `'over'` | Final results | Until tap | Total profit, Vinted rating, birthday message |

#### Integration with Existing Game Loop

The `gameLoop()` function (line 1350) dispatches on `gameState`. The extension is straightforward:

```javascript
// Current (line 1362-1369):
if (gameState === 'start') { renderStart(dt); }
else if (gameState === 'playing') { update(dt); render(dt); }
else if (gameState === 'over') { renderGameOver(); }

// New:
if (gameState === 'start') { renderStart(dt); }
else if (gameState === 'buying') { updateBuying(dt); renderBuying(dt); }
else if (gameState === 'buyEnd') { updateBuyEnd(dt); renderBuyEnd(dt); }
else if (gameState === 'selling') { updateSelling(dt); renderSelling(dt); }
else if (gameState === 'over') { renderGameOver(); }
```

**Key insight:** `updateBuying()` is essentially the current `update()` function with different scoring semantics (slashed real watches go to inventory instead of just adding score). `updateSelling()` reuses the same physics/spawn/collision infrastructure but with different entity data and scoring logic.

#### Inventory Data Flow Between Acts

```
ACT 1 (buying)                    TRANSITION                ACT 2 (selling)

spawnCard() -->
  slash real --> inventory.push()  inventory[] passed        inventory[] displayed
  slash fake --> penalty           as-is to Act 2            as "your stock"
  miss real --> nothing
                                  buyEnd screen shows:       spawnOffer() -->
                                    inventory count            slash good offer --> sell item, profit
                                    total spent                slash lowball --> penalty
                                    "Revends !"                miss good offer --> nothing

                                                             When inventory empty OR timer ends:
                                                               gameState = 'over'
```

**Inventory data structure:**

```javascript
var inventory = [];  // populated during 'buying', consumed during 'selling'

// Each inventory item:
{
  brand: 'Montignac',    // always real (only real watches get inventoried)
  buyPrice: 10,          // what player "paid" (the card's value when slashed)
  isGolden: false        // golden items worth more in selling phase
}
```

**Where in code:** Add `var inventory = [];` near other game state globals (line 16 area). Reset in `resetGame()` (line 1281). Populated in `slashWatch()` during buying phase. Read during selling phase to determine available stock and potential sale prices.

#### Act 2: Selling Phase Entity Design

In Act 2, the entities are "buyer offers" instead of watch cards. They reuse the same physics system but have different visual treatment and scoring:

| Property | Act 1 (Card) | Act 2 (Offer) |
|----------|-------------|---------------|
| Visual | White Vinted card with watch illustration | Offer bubble/card with buyer avatar + price |
| Good slash | Real watch --> inventory + cost | Fair/good offer --> sell from inventory + profit |
| Bad slash | Fake watch --> penalty | Lowball offer --> sell at loss |
| Miss | No penalty (missed buy) | Missed good offer --> no penalty |

The `spawnOffer()` function parallels `spawnCard()`, creating entities with the same x/y/vx/vy/rotation physics but different rendering and value semantics.

**Reuse analysis for Act 2:**

| Component | Reusable? | Notes |
|-----------|-----------|-------|
| Entity physics (gravity, velocity, position) | 100% | Same array, same updateWatches() |
| Trail input + rendering | 100% | Same swipe mechanic |
| Collision detection | 100% | Same trail-to-hitbox check |
| Split animation | 100% | Same halves with different draw function |
| Particle system | 100% | Same particles, different colors |
| Floating text | 100% | Same system, different messages |
| Spawn timing + difficulty ramp | 90% | Same pattern, different parameters |
| Draw function | 0% | New `drawOffer()` needed |
| Scoring logic | 0% | New sell-profit logic needed |

#### Input Handling Changes

The input handler (lines 146-192) dispatches based on `gameState`. Currently:
- `'start'` -> `handleStartTap()`
- `'playing'` -> trail recording
- `'over'` -> `handleReplayTap()`

New dispatch:
- `'start'` -> `handleStartTap()`
- `'buying'` -> trail recording (same as current 'playing')
- `'buyEnd'` -> auto-advance (no input needed, or tap to skip)
- `'selling'` -> trail recording (same as current 'playing')
- `'over'` -> `handleReplayTap()`

The pointerdown handler (line 147) needs its `gameState` checks updated. The pointermove/pointerup handlers already guard on `gameState !== 'playing'`; this guard changes to `gameState !== 'buying' && gameState !== 'selling'`.

### Feature 3: Audio Integration

**What changes:** A new audio subsystem initializes an AudioContext, pre-loads sound buffers, and plays them on game events.

#### Audio Subsystem Design

```
AUDIO MODULE (new)

  audioCtx           -- single AudioContext, created once
  soundBuffers{}     -- pre-decoded AudioBuffers keyed by name
  audioUnlocked      -- boolean, set true after first user gesture

  initAudio()        -- create AudioContext (called at page load)
  unlockAudio()      -- resume AudioContext on user gesture
  loadSound(name, url) -- fetch + decodeAudioData
  playSound(name)    -- create BufferSource, connect, start
```

#### Mobile AudioContext Unlock

Critical constraint: Mobile browsers require user gesture before AudioContext.resume(). The game already has a perfect hook: the "Jouer" button tap on the start screen.

```javascript
// In handleStartTap() -- line 1142
function handleStartTap(px, py) {
  if (/* button hit */) {
    unlockAudio();  // <-- add this call
    startGame();
  }
}

function unlockAudio() {
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}
```

The `touchend` / `click` event that triggers `handleStartTap` is a valid user gesture for AudioContext unlock on both iOS Safari and Chrome Android.

#### Sound Effect Hook Points

| Event | Current Code Location | Sound |
|-------|----------------------|-------|
| Slash real watch | `slashWatch()` line 420, after `!watch.isFake` branch | "cha-ching" coin sound |
| Slash fake watch | `slashWatch()` line 427, else branch | Error/buzzer sound |
| Slash golden watch | `slashWatch()` line 453, `isGolden` check | Jackpot jingle |
| Combo milestone | `slashWatch()` line 422, when `comboMultiplier` increases | Combo power-up |
| Miss real watch | `updateWatches()` line 279, miss penalty | Sad trombone / whoosh |
| Timer warning (10s) | `renderTimer()` line 988, `isFinal` branch | Tick-tock |
| Act transition | New buyEnd state entry | Transition fanfare |
| Game over | State change to 'over' | Results jingle |
| Start game tap | `startGame()` | Button click |

All these are point events (not loops), so `playSound()` creates a one-shot `AudioBufferSourceNode` each time. No need for looping or gain management.

#### Sound Asset Strategy

**Option A: External audio files (mp3/ogg)**
- Requires loading step (fetch + decode)
- Adds asset management complexity
- Best quality
- Adds HTTP requests

**Option B: Procedurally generated sounds (Web Audio oscillators)**
- Zero external assets
- Instantly available, no loading
- Limited to synthetic tones
- Fits the game's handcrafted aesthetic

**Option C: Base64-encoded audio inline in JS**
- No extra HTTP requests
- Small sounds (< 5KB each) encode well
- Increases JS file size
- Decode once on load

**Recommendation: Option B (procedural) for most sounds, with Option A for 1-2 premium sounds if needed.**

The game is a joke birthday game with a handcrafted Canvas aesthetic. Procedural bleeps/boops fit the vibe perfectly. A simple `playTone(frequency, duration, type)` function using `OscillatorNode` + `GainNode` covers slash sounds, error buzzes, and coin chimes. If a specific sound (like a cash register "ka-ching") needs to sound realistic, load one small mp3 file.

Procedural sound example:
```javascript
function playTone(freq, duration, type) {
  if (!audioCtx || audioCtx.state !== 'running') return;
  var osc = audioCtx.createOscillator();
  var gain = audioCtx.createGain();
  osc.type = type || 'sine';  // 'sine', 'square', 'sawtooth', 'triangle'
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + duration);
}
```

## New Component Inventory

| Component | Type | Lines (est.) | Dependencies |
|-----------|------|-------------|--------------|
| `drawCard()` | Replace | ~40 | Canvas roundRect, shadowColor/Blur |
| `drawWatchIllustration()` | New | ~25 | Simplified version of current watch drawing |
| `drawOffer()` | New | ~35 | Similar to drawCard but for buyer offers |
| `lineSegmentIntersectsRect()` | New (maybe) | ~15 | Only if circle approximation fails playtesting |
| `inventory[]` global | New | 1 | - |
| `updateBuying()` | Refactored from `update()` | ~30 | Existing update logic + inventory push |
| `updateSelling()` | New | ~35 | Similar to updateBuying with sell semantics |
| `renderBuyEnd()` | New | ~40 | Transition screen between acts |
| `updateBuyEnd()` | New | ~10 | Auto-advance timer |
| `spawnOffer()` | New | ~25 | Parallels spawnCard with offer data |
| `initAudio()` | New | ~5 | AudioContext creation |
| `unlockAudio()` | New | ~5 | AudioContext.resume() |
| `playTone()` | New | ~15 | OscillatorNode + GainNode |
| Sound effect functions | New | ~40 | Wrappers calling playTone with specific params |

**Estimated total new/modified code: ~320 lines.** The file grows from ~1380 to ~1700 lines -- still manageable as a single file.

## Data Flow Changes

### Current Per-Frame Flow (Act 1 / Buying)

Same as current with one addition at slash:

```
[COLLISION HIT on real watch]
    |
    v
slashWatch() {
  // existing: mark slashed, score, combo, particles, floating text
  // NEW: inventory.push({ brand, buyPrice, isGolden })
}
```

### New: Act Transition Flow

```
[buying timer expires]
    |
    v
gameState = 'buyEnd'
    |
    v
[buyEnd screen renders for 2-3 seconds]
    |
    v
[auto-advance or tap]
    |
    v
gameState = 'selling'
initSellingPhase()  // resets watches[], spawns offers based on inventory
```

### New: Act 2 Per-Frame Flow

```
[SPAWN] spawnOffer() -- creates buyer offer entities
    |
    v
[PHYSICS] Same updateWatches() -- gravity, position, cleanup
    |
    v
[COLLISION] Same checkSlashCollisions() -- trail vs offer hitboxes
    |
    v
[HIT] slashOffer(offer) {
    if (offer.isGoodDeal) {
      // sell from inventory, add profit
      var item = inventory.pop()  // or pick matching item
      var profit = offer.price - item.buyPrice
      score += profit
    } else {
      // lowball accepted -- loss
      score -= penalty
    }
    // same: particles, floating text, split halves
}
    |
    v
[END CONDITION] inventory.length === 0 OR selling timer expires
    --> gameState = 'over'
```

### State Reset Flow

```
resetGame() {
  // existing resets (score, elapsed, combo, watches, particles, etc.)
  // NEW:
  inventory = []
  sellingElapsed = 0
  buyingElapsed = 0
}
```

## Suggested Build Order

Based on dependency analysis, the features should be built in this order:

### Step 1: Card Rendering (no gameplay changes)

Replace watch drawing with card drawing while keeping everything else identical. This is a pure visual swap with zero gameplay impact.

**Why first:** It is the highest-risk visual change (replacing 200+ lines of drawing code) and is completely independent of the state machine and audio. Test it in isolation.

**Specifically:**
1. Define card dimensions (width/height) replacing `WATCH_SIZE`
2. Write `drawCard()` with roundRect, shadow, watch illustration, brand text
3. Update `drawWatch()` to call `drawCard()` (or rename)
4. Update `renderHalf()` to use new draw function
5. Verify split animation works with rectangular cards
6. Adjust hitbox if needed (circle approximation vs rect collision)
7. Update `spawnWatch()` to set card-appropriate properties
8. Update decorative watches on start screen

### Step 2: Two-Act State Machine (core mechanic change)

Extend the state machine to support buying and selling phases. This is the biggest architectural change.

**Why second:** Depends on card rendering being stable. The state machine restructures `update()` and `render()` dispatch, and introduces inventory -- the central new data structure.

**Specifically:**
1. Rename 'playing' to 'buying' in gameState checks
2. Add `inventory[]` global, populate on real-watch slash
3. Add 'buyEnd' state with transition screen and auto-advance timer
4. Add 'selling' state with `spawnOffer()`, `updateSelling()`, `renderSelling()`
5. Write `drawOffer()` for buyer offer entities
6. Implement sell scoring logic (offer price vs buy price = profit)
7. Update end condition: selling timer expires OR inventory empty
8. Update `renderGameOver()` with two-act stats
9. Update `resetGame()` to clear all new state
10. Update input handler state checks

### Step 3: Audio (polish layer)

Add sound effects. This is purely additive and touches no existing logic except to insert `playSound()` calls at hook points.

**Why last:** Depends on nothing except the game working. Can be dropped entirely without affecting gameplay. Easiest to test (does it make the right sound at the right time?).

**Specifically:**
1. `initAudio()` -- create AudioContext
2. `unlockAudio()` -- hook into start button tap
3. `playTone()` -- procedural sound generator
4. Define sound effect wrappers: `sfxSlash()`, `sfxCoin()`, `sfxError()`, `sfxJackpot()`, `sfxCombo()`, `sfxMiss()`, `sfxTransition()`
5. Insert calls at all hook points (see table above)
6. Test on mobile (AudioContext unlock, volume, timing)

## Reuse vs Rewrite Summary

| Existing Code | Action | Rationale |
|---------------|--------|-----------|
| Game loop (`gameLoop`, `requestAnimationFrame`) | KEEP | Same loop, more states in dispatch |
| Canvas setup (`resize`, `initCanvas`) | KEEP | No changes needed |
| Input handling (`setupInput`) | MODIFY | Update gameState guards for new states |
| Watch physics (`updateWatches`) | KEEP | Cards have same physics as watches |
| Trail system | KEEP | Same swipe mechanic in both acts |
| Collision detection | KEEP | Circle approximation works for cards |
| Split halves system | MODIFY | Change draw call inside `renderHalf()` |
| Particle system | KEEP | Same particles, different colors per act |
| Floating text system | KEEP | Same system, different messages |
| Score display | KEEP | Same HUD, score semantics unchanged |
| Timer display | MODIFY | Show act-specific timer text |
| Combo display | KEEP | Combo works same way in both acts |
| Rating display | KEEP | Same rating, evaluated at game over |
| Start screen | MODIFY | Update title/subtitle for new game flow |
| Game over screen | MODIFY | Show two-act stats (bought, sold, profit) |
| Difficulty ramp | MODIFY | Separate ramp parameters per act |
| Watch drawing (3 styles) | REPLACE | New `drawCard()` replaces 3 functions |
| Brand label drawing | REPLACE | Integrated into card layout |
| Spawn function | MODIFY | Card properties instead of watch properties |

## Anti-Patterns to Avoid

### Anti-Pattern: Splitting into Multiple Files

**Temptation:** "This file is getting big, let's split into audio.js, cards.js, states.js"
**Why avoid:** The project constraint is zero build tools. Multiple script files require manual ordering in HTML, create global namespace pollution, and add no value for a 1700-line single-developer file. The existing single-file approach works. Keep it.

### Anti-Pattern: Abstract Entity System

**Temptation:** "Cards and Offers are both entities, let's create a base Entity class"
**Why avoid:** They share physics (which is just 4 lines of Euler integration) but differ in everything else (drawing, scoring, spawning). An inheritance hierarchy adds complexity without reducing code. Keep them as separate spawn/draw/slash functions that happen to use the same `watches[]` array and `updateWatches()` physics.

### Anti-Pattern: Audio Manager Class

**Temptation:** "Let's create a SoundManager with play queues, volume control, fade-in/out"
**Why avoid:** The game needs ~8 one-shot sound effects. A flat set of functions (`initAudio`, `unlockAudio`, `playTone`, and 6-8 sound wrappers) is all that is needed. No queuing, no looping, no volume management beyond the initial gain envelope.

### Anti-Pattern: Complex State Machine Library

**Temptation:** "Let's use a formal state machine library for transitions"
**Why avoid:** The current game uses a string variable and if/else. That pattern scales perfectly to 5 states. A library adds a dependency and learning curve for zero benefit. Keep the string-based approach.

## Performance Considerations

| Concern | Impact | Mitigation |
|---------|--------|------------|
| Card shadows (shadowBlur) | Moderate -- shadow rendering is expensive in Canvas 2D | Use small blur (4-8px). Set `shadowColor = 'transparent'` immediately after card body fill to avoid shadow on inner elements |
| More entity types in Act 2 | Low -- still <50 entities on screen | Same caps as current game |
| AudioContext creation | None -- created once | - |
| Sound effect playback | None -- OscillatorNode is lightweight | One-shot nodes auto-garbage-collect after stop() |
| roundRect() | None -- native Canvas method | Supported in all target browsers |

## Sources

- [CanvasRenderingContext2D.roundRect() -- MDN](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/roundRect) -- Baseline Widely Available since April 2023 (Chrome 99, Safari 16.4, Firefox 112)
- [Canvas shadow properties -- MDN](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/shadowColor) -- shadowColor, shadowBlur, shadowOffsetX/Y
- [Audio for Web Games -- MDN](https://developer.mozilla.org/en-US/docs/Games/Techniques/Audio_for_Web_Games) -- AudioContext unlock pattern, sound sprites, mobile autoplay policy
- [Web Audio API -- MDN](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API) -- OscillatorNode, GainNode, AudioBufferSourceNode
- [Unlock Web Audio in Safari -- Matt Montag](https://www.mattmontag.com/web/unlock-web-audio-in-safari-for-ios-and-macos) -- iOS-specific AudioContext resume pattern
- [Line/Rectangle Collision Detection -- Jeffrey Thompson](https://www.jeffreythompson.org/collision-detection/line-rect.php) -- Line-segment-to-rectangle intersection algorithm
- [2D Collision Detection -- MDN](https://developer.mozilla.org/en-US/docs/Games/Techniques/2D_collision_detection) -- AABB and circle collision patterns
- [State Pattern -- Game Programming Patterns](https://gameprogrammingpatterns.com/state.html) -- State machine architecture for games

---
*Architecture research for: Watch Ninja v1.1 (Vinted Cards, Buy/Sell, Audio)*
*Researched: 2026-02-08*
