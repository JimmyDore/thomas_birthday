# Phase 2: Complete Game - Research

**Researched:** 2026-02-07
**Domain:** Canvas 2D game state management, timed arcade rounds, difficulty ramping, UI screens, combo systems, floating feedback, Vinted-themed humor content
**Confidence:** HIGH

## Summary

Phase 2 transforms the existing 860-line `game.js` core slashing loop into a full timed arcade game with start screen, 60-second countdown, difficulty ramp, combo multiplier, live Vinted rating, floating feedback text, golden watch bonus, game over with score breakdown, birthday message, and replay. The codebase is vanilla JS + Canvas 2D with zero dependencies (locked decision from Phase 1).

The primary technical challenge is introducing a **game state machine** into the existing single-loop architecture. Currently the code runs a perpetual game loop with no concept of screens or game states. Phase 2 must add three states (START, PLAYING, GAME_OVER) that control which update/render logic runs. This is a well-understood pattern for Canvas games: a `gameState` variable checked in the game loop, with each state having its own update and render function. The existing `update(dt)` and `render()` functions become the PLAYING state handlers.

The secondary challenge is the **difficulty ramp** -- smoothly increasing spawn rate, watch speed, and fake ratio over 60 seconds. This is best done with a normalized time progress value (`t = elapsed / 60`) that feeds into lerp functions for each parameter. The existing `SPAWN_INTERVAL`, `GRAVITY`, and fake chance (0.4) become dynamic values driven by `t`. The combo system, golden watch, and live rating are straightforward additions to the existing slash handler and rendering pipeline.

**Primary recommendation:** Add a simple string-based game state machine (`gameState = 'start' | 'playing' | 'over'`) to the existing game loop. Drive all difficulty parameters from a single normalized `t = elapsed/ROUND_DURATION` progress value. Keep everything in the single `game.js` file.

## Standard Stack

This phase continues to use zero external libraries. Everything is native browser APIs (locked decision).

### Core

| Technology | Version | Purpose | Why Standard |
|------------|---------|---------|--------------|
| HTML5 Canvas 2D Context | Native | All rendering: screens, timer, rating, text feedback, golden watch | Already in use from Phase 1, stable, zero bytes |
| `ctx.fillText()` / `ctx.measureText()` | Native | All text rendering: screen titles, timer, rating labels, birthday message, floating feedback | Native Canvas text API, sufficient for this game's text needs |
| `performance.now()` | Native | High-resolution timer for 60-second countdown | Already in use for trail timing, microsecond precision |
| Pointer Events API | Native | Start button tap detection, replay button tap detection | Already in use from Phase 1 |

### Supporting

| Technology | Version | Purpose | When to Use |
|------------|---------|---------|-------------|
| `ctx.textAlign = 'center'` | Native | Center text on start/game-over screens | All screen text rendering |
| `ctx.globalAlpha` | Native | Fade effects on screen transitions, floating text | Screen overlays, text fade animations |
| Unicode characters | Native | Star rating display (U+2605 filled star, U+2606 empty star) | Vinted rating display -- simpler than drawing star paths |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| String state machine | Object-based state pattern with enter/exit methods | Overkill for 3 states in a single-file game. String comparison is clearer and matches existing code style. |
| Unicode stars | Canvas path-drawn stars | Unicode fillText is simpler, renders well at game sizes, avoids custom geometry code |
| Lerp-based difficulty | Step-based difficulty tiers | Lerp gives smooth, barely-noticeable ramp per context decision. Steps create jarring jumps. |
| Single file | Multiple JS modules | game.js is 860 lines and will grow to ~1200-1400. Still manageable in one file, avoids build tooling (locked decision: no build tools). |

**Installation:**
```bash
# Nothing to install. Zero dependencies. Zero build tools.
```

## Architecture Patterns

### Game State Machine

**What:** A simple string variable `gameState` controls which update/render logic runs in the game loop. Three states: `'start'`, `'playing'`, `'over'`.

**Why this pattern:** The existing code has a single `update(dt)` + `render()` cycle. Adding states requires the game loop to dispatch to different functions based on current state. This is the standard Canvas game pattern -- no framework needed.

**Structure:**
```javascript
var gameState = 'start'; // 'start' | 'playing' | 'over'

function gameLoop(timestamp) {
  if (paused) return;
  // ... delta time calculation (existing) ...

  if (gameState === 'start') {
    updateStart(dt);
    renderStart();
  } else if (gameState === 'playing') {
    update(dt);    // existing function
    render();      // existing function
  } else if (gameState === 'over') {
    renderGameOver(); // static screen, no physics update needed
  }

  requestAnimationFrame(gameLoop);
}
```

**State transitions:**
- `'start'` --> `'playing'`: Player taps "Jouer" button
- `'playing'` --> `'over'`: Timer reaches 0
- `'over'` --> `'start'` or `'playing'`: Player taps "Rejouer" button (can go straight to playing)

### Difficulty Ramp via Normalized Progress

**What:** A single normalized value `t = elapsed / ROUND_DURATION` (0.0 to 1.0) drives all difficulty parameters through lerp functions.

**Why this pattern:** The context decision specifies "smooth difficulty curve -- gradual increase, barely noticeable at first, frantic by the end." A continuous `t` value with per-parameter lerp achieves exactly this. Each parameter can have its own curve shape (linear, quadratic, etc.).

**Parameters driven by t:**

| Parameter | Start (t=0) | End (t=1) | Curve | Rationale |
|-----------|-------------|-----------|-------|-----------|
| Spawn interval | 1.2s | 0.4s | Quadratic ease-in (faster ramp late) | Barely noticeable early, frantic late |
| Watch launch speed | 1.0x | 1.4x | Linear | Gradual speed increase |
| Fake ratio | 0.15 | 0.55 | Linear | "Mostly real early, increasing fakes late" per context |
| Sneaky fake ratio | 0.1 | 0.5 | Linear | More sneaky fakes as game progresses |

**Example:**
```javascript
var ROUND_DURATION = 60; // seconds
var elapsed = 0;

function getDifficulty() {
  var t = Math.min(1, elapsed / ROUND_DURATION);
  // Quadratic ease-in: slow start, fast ramp at end
  var tEased = t * t;
  return {
    spawnInterval: 1.2 - tEased * 0.8,   // 1.2s -> 0.4s
    speedMultiplier: 1.0 + t * 0.4,       // 1.0x -> 1.4x
    fakeChance: 0.15 + t * 0.4,           // 15% -> 55%
    sneakyChance: 0.1 + t * 0.4,          // 10% -> 50% of fakes
    goldenChance: 0.03                     // constant 3%
  };
}
```

### Fake Name Progression (Key Comedy Beat)

**What:** Fake watch names progress from obviously ridiculous to nearly-correct over the round. The context decision states this is "a key comedy beat: the sneakiness of the misspellings IS the joke."

**Implementation:** An ordered array of fake names from obvious to subtle, selected based on `t` progress.

```javascript
// Ordered from obvious (early game) to subtle (late game)
var FAKE_NAMES_PROGRESSION = [
  // t = 0.0 - 0.3: Obviously ridiculous
  'Montagniak', 'Montignoque', 'Mortignac', 'Monticrap',
  // t = 0.3 - 0.6: Getting sneakier
  'Montignak', 'Montinyac', 'Montigniak',
  // t = 0.6 - 1.0: Near-misses (hard to spot!)
  'Montigac', 'Montiganc', 'Montignaq', 'Montignae'
];

function pickFakeName(t) {
  // Map t to a range in the array, with randomness within the tier
  var tierStart = Math.floor(t * FAKE_NAMES_PROGRESSION.length * 0.7);
  var tierEnd = Math.min(FAKE_NAMES_PROGRESSION.length,
    tierStart + 3);
  var idx = tierStart + Math.floor(Math.random() * (tierEnd - tierStart));
  return FAKE_NAMES_PROGRESSION[Math.min(idx, FAKE_NAMES_PROGRESSION.length - 1)];
}
```

### Combo System

**What:** Consecutive correct slashes (real Montignac slashed, or fake Montignac left alone -- though the "left alone" part is implicit) build a multiplier. Slashing a fake or missing a real resets the combo.

**Design decisions (Claude's discretion):**

| Parameter | Recommendation | Rationale |
|-----------|---------------|-----------|
| Multiplier cap | x5 | High enough to feel rewarding, low enough to prevent score explosion |
| Combo thresholds | 3 hits = x2, 6 = x3, 10 = x4, 15 = x5 | Escalating difficulty to maintain streak |
| Display | "x3" text near score pill, scales up briefly on increase | Visible but not distracting |
| Reset trigger | Slashing a fake watch OR missing a real watch | Both are mistakes per game logic |

```javascript
var combo = 0;
var comboMultiplier = 1;

function getMultiplier(combo) {
  if (combo >= 15) return 5;
  if (combo >= 10) return 4;
  if (combo >= 6) return 3;
  if (combo >= 3) return 2;
  return 1;
}

// In slashWatch():
if (!watch.isFake) {
  combo++;
  comboMultiplier = getMultiplier(combo);
  watch.value = 15 * comboMultiplier; // Apply multiplier to real watch value
} else {
  combo = 0;
  comboMultiplier = 1;
  // Fake watch penalty is NOT multiplied (just flat -8)
}
```

### Vinted Seller Rating (Live Display)

**What:** A 1-5 star rating displayed during gameplay that updates in real-time based on performance. Context specifies Vinted-flavored French labels.

**Rating tiers (Claude's discretion):**

| Stars | Score Threshold | French Label |
|-------|----------------|--------------|
| 1 | < 0 euros | Vendeur douteux |
| 2 | 0 - 49 euros | Vendeur debutant |
| 3 | 50 - 149 euros | Bon vendeur |
| 4 | 150 - 299 euros | Vendeur confirme |
| 5 | >= 300 euros | Roi du Vinted |

**Display:** Unicode filled stars (U+2605) and empty stars (U+2606) with the label text below. Position: top-right corner, mirroring the score pill in top-left.

```javascript
function getRating(score) {
  if (score >= 300) return { stars: 5, label: 'Roi du Vinted' };
  if (score >= 150) return { stars: 4, label: 'Vendeur confirme' };
  if (score >= 50)  return { stars: 3, label: 'Bon vendeur' };
  if (score >= 0)   return { stars: 2, label: 'Vendeur debutant' };
  return { stars: 1, label: 'Vendeur douteux' };
}

function renderRating() {
  var rating = getRating(score);
  var starStr = '';
  for (var i = 0; i < 5; i++) {
    starStr += (i < rating.stars) ? '\u2605' : '\u2606';
  }
  // Draw in top-right corner
  ctx.textAlign = 'right';
  ctx.font = 'bold 18px sans-serif';
  ctx.fillStyle = '#FFD700'; // gold for stars
  ctx.fillText(starStr, canvasWidth - 15, 28);
  ctx.font = '12px sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(rating.label, canvasWidth - 15, 44);
}
```

### Golden Watch

**What:** Rare random watch spawn with distinct golden appearance. Big bonus euros when slashed.

**Design decisions (Claude's discretion):**

| Parameter | Recommendation | Rationale |
|-----------|---------------|-----------|
| Spawn probability | 3% of all watches (~1-2 per round at increasing spawn rate) | Rare enough to be exciting, common enough to appear most rounds |
| Bonus value | +50 euros (before combo multiplier) | Significant but not game-breaking; ~3x normal watch |
| Visual distinction | Gold case color (#DAA520), gold particle burst, slightly larger (1.2x size) | Must be instantly recognizable amidst fast gameplay |
| Brand name | "Montignac" (always real, always correct name) | Golden watches are premium real watches |

```javascript
// In spawnWatch(), after determining isFake:
var isGolden = !isFake && Math.random() < 0.03;

if (isGolden) {
  watch.isGolden = true;
  watch.value = 50;
  watch.size = WATCH_SIZE * 1.2;
  watch.brand = 'Montignac';
}
```

The golden watch case color (#DAA520 goldenrod) must be handled in `drawWatch()` -- override the normal green case color when `watch.isGolden` is true.

### Timer Display

**Design decisions (Claude's discretion):**

| Parameter | Recommendation | Rationale |
|-----------|---------------|-----------|
| Position | Top center of screen | Standard arcade timer placement, between score (left) and rating (right) |
| Format | Seconds only, no minutes ("42") | 60-second round doesn't need minutes |
| Font | Bold, large (~28px) | Must be glanceable during fast gameplay |
| Warning | Text turns red + slightly larger at 10 seconds | Creates tension in final stretch |
| Final countdown | Pulse animation at 3-2-1 | Dramatic finish moment |

```javascript
function renderTimer() {
  var remaining = Math.max(0, Math.ceil(ROUND_DURATION - elapsed));
  var isWarning = remaining <= 10;
  var isFinal = remaining <= 3;

  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';

  if (isFinal) {
    // Pulse effect: scale based on fractional second
    var frac = (ROUND_DURATION - elapsed) % 1;
    var scale = 1 + (1 - frac) * 0.3; // pulse from 1.3x down to 1.0x
    ctx.font = 'bold ' + Math.round(28 * scale) + 'px sans-serif';
  } else {
    ctx.font = 'bold ' + (isWarning ? 32 : 28) + 'px sans-serif';
  }

  ctx.fillStyle = isWarning ? '#ff4444' : '#ffffff';
  ctx.fillText(remaining.toString(), canvasWidth / 2, 16);
}
```

### Floating Feedback Text (Enhanced)

**What:** The existing floating text system (Phase 1) needs enhancement per context decisions:
- Show "Bonne affaire!" for real watches slashed, "Arnaque!" for fake watches slashed
- Keep the euro amount text too
- Small, fades fast, doesn't block gameplay

**Design decisions (Claude's discretion):**

| Parameter | Recommendation | Rationale |
|-----------|---------------|-----------|
| Font size | 16px for text label, 22px for euro amount (existing) | "Small, doesn't block gameplay" per context |
| Fade duration | 0.8s (slightly shorter than current 1.0s) | "Fades fast" per context |
| Colors | Green (#4CAF50) for "Bonne affaire!", Red (#F44336) for "Arnaque!", Gold (#FFD700) for golden watch | Clear visual distinction |
| Positioning | Label text slightly above the euro amount | Two-line floating feedback |

Enhancement to existing `spawnFloatingText()`: add a `label` parameter for the French text, spawn two floating texts at slightly different Y offsets.

### Start Screen

**What:** Themed splash screen with Vinted-style branding, flying watches, and Thomas's name front and center.

**Composition (Claude's discretion):**

1. **Background:** Same teal gradient as gameplay (continuity)
2. **Title area:** "Thomas, bienvenue sur le Vinted des montres" -- large, centered, white text
3. **Decorative watches:** 4-6 watches slowly floating/rotating in background (reuse existing `drawWatch()` function) -- creates the "Vinted product listing gone wrong" feel
4. **Play button:** Large tappable area, "Jouer" text, styled as a Vinted-like button (rounded, white on teal or inverse)
5. **No complex animations needed:** Simple floating watches + text is sufficient for a birthday joke game

**Button tap detection:** Use the existing pointer event system. On pointerdown during 'start' state, check if tap is within the button's bounding rectangle.

```javascript
var startButton = { x: 0, y: 0, w: 200, h: 60 }; // recalculated on resize

function handleStartTap(px, py) {
  if (px >= startButton.x && px <= startButton.x + startButton.w &&
      py >= startButton.y && py <= startButton.y + startButton.h) {
    startGame();
  }
}
```

### Game Over Screen

**What:** Score breakdown + Vinted rating + birthday message + replay button.

**Layout (top to bottom):**

1. **"Temps ecoule !"** -- header text
2. **Score breakdown:**
   - "Montres vendues: X" (watches slashed correctly)
   - "Arnaques evitees: X" (fakes left alone -- but we don't track this, track fakes slashed instead: "Contrefacons tranchees: X")
   - "Profit final: +XX euros"
3. **Vinted rating:** Stars + label (same as in-game but larger)
4. **Birthday message:** "Joyeux anniversaire mon frere, longue vie aux montres et a Montignac" (exact text from context, with special characters)
5. **Replay button:** "Rejouer" -- same tap detection pattern as start button

**Stats tracking:** Need to add counters during gameplay:
```javascript
var stats = {
  realSlashed: 0,
  fakeSlashed: 0,
  goldenSlashed: 0,
  maxCombo: 0,
  totalWatches: 0
};
```

### Reset Function

**Critical pattern:** When transitioning from 'over' to 'playing' (replay), ALL game state must be reset. This includes score, elapsed time, combo, all entity arrays (watches, splitHalves, particles, floatingTexts), stats, and difficulty.

```javascript
function resetGame() {
  score = 0;
  elapsed = 0;
  combo = 0;
  comboMultiplier = 1;
  spawnTimer = 0;
  watches.length = 0;
  splitHalves.length = 0;
  particles.length = 0;
  floatingTexts.length = 0;
  stats = { realSlashed: 0, fakeSlashed: 0, goldenSlashed: 0, maxCombo: 0, totalWatches: 0 };
  lastTime = 0;
}
```

### Anti-Patterns to Avoid

- **State leak between rounds:** Forgetting to reset an array or counter leads to stale data on replay. The `resetGame()` function must clear EVERYTHING.
- **Branching difficulty with if/else tiers:** Use continuous lerp, not discrete step levels. Steps create noticeable jumps.
- **Blocking the game loop for screen transitions:** Never use `setTimeout` or `alert` for screen changes. The game loop keeps running, just dispatching to different render functions.
- **Drawing text every frame without caching font:** Setting `ctx.font` is relatively expensive. Set it once per text style group, not per-character.
- **Tap detection on touch-end instead of touch-start:** Use pointerdown for button taps (feels instant). pointerup adds perceived latency on mobile.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Star rating display | Custom star path geometry | Unicode characters (U+2605, U+2606) with fillText | Renders cleanly, zero code, scales with font size |
| Text centering | Manual width calculation | `ctx.textAlign = 'center'` with x at midpoint | Built-in Canvas feature, handles all fonts correctly |
| Easing functions | Complex math curves | Simple `t * t` (quadratic ease-in) for difficulty ramp | One line of code, mathematically correct, gives the "barely noticeable then frantic" feel |
| Button hit testing | Complex touch event handling | Rectangle bounds check on existing pointerdown events | Existing input system already provides coordinates |
| Timer display | Custom countdown widget | `Math.ceil(remaining)` + fillText | Native math + Canvas text is sufficient |
| Text wrapping for birthday message | Custom word-wrap algorithm | Pre-split message into lines manually | Birthday message is known at build time, no need for dynamic wrapping |

**Key insight:** This phase adds game DESIGN (states, screens, difficulty, feedback) not game TECHNOLOGY. All rendering uses the same Canvas 2D APIs already proven in Phase 1. The complexity is in game logic, not graphics.

## Common Pitfalls

### Pitfall 1: Incomplete Game State Reset on Replay
**What goes wrong:** Player finishes a round, taps "Rejouer," and residual watches/particles/combo from the previous round appear or affect scoring.
**Why it happens:** Forgetting to clear one of the many entity arrays or state variables.
**How to avoid:** Create a single `resetGame()` function that resets ALL state. Call it both on initial start AND on replay. List every mutable variable explicitly -- don't rely on "I think I got them all."
**Warning signs:** Second playthrough has different starting conditions than first.

### Pitfall 2: Timer Drift from Accumulated Float Errors
**What goes wrong:** The 60-second round doesn't end at exactly 60 seconds, or the displayed timer jumps from 2 to 0 skipping 1.
**Why it happens:** Accumulating `dt` floats introduces tiny errors over 60 seconds. Using `Math.floor` vs `Math.ceil` for display.
**How to avoid:** Use `Math.ceil()` for display (shows "1" until the last moment, then "0" triggers game over). End the game when `elapsed >= ROUND_DURATION`, not when display shows "0".
**Warning signs:** Timer display shows "0" briefly before game over screen appears.

### Pitfall 3: Difficulty Parameters Going Out of Bounds
**What goes wrong:** Spawn interval goes to 0 or negative, causing infinite spawns. Fake chance exceeds 1.0.
**Why it happens:** Lerp formula without clamping.
**How to avoid:** Always clamp difficulty values: `Math.max(0.3, spawnInterval)`, `Math.min(0.7, fakeChance)`. Set hard floors and ceilings.
**Warning signs:** Frame rate drops sharply in final seconds, or screen fills with watches.

### Pitfall 4: Button Tap Zones Not Scaling with Screen Size
**What goes wrong:** "Jouer" / "Rejouer" buttons work on one phone but not another because button position is hardcoded in pixels.
**Why it happens:** Hardcoded x/y/width/height instead of relative to canvasWidth/canvasHeight.
**How to avoid:** Calculate button bounds relative to canvas dimensions on every render (or on resize). Example: `startButton.x = canvasWidth / 2 - 100; startButton.y = canvasHeight * 0.65;`
**Warning signs:** Button doesn't respond to taps on a differently-sized screen.

### Pitfall 5: Pointer Events Firing on Wrong Game State
**What goes wrong:** Player swipes on the start screen and accidentally triggers slash detection, or taps during gameplay and accidentally triggers a "button press."
**Why it happens:** Input handlers don't check `gameState` before processing.
**How to avoid:** Gate ALL input handlers on `gameState`. During 'start', only check button taps. During 'playing', only process swipe/trail. During 'over', only check replay button.
**Warning signs:** Random score changes on start screen, or accidental state transitions during gameplay.

### Pitfall 6: Combo Counter Not Reset on Missed Watches
**What goes wrong:** Player misses a real watch (it falls off screen) but the combo keeps building.
**Why it happens:** Combo reset logic only exists in slashWatch() for fakes, not in the missed-watch cleanup code.
**How to avoid:** In `updateWatches()`, when a real unslashed watch exits the screen, reset combo to 0 in addition to applying the score penalty.
**Warning signs:** Combo multiplier stays high even when watches are missed.

### Pitfall 7: Golden Watch Not Visually Distinct Enough
**What goes wrong:** Players don't notice the golden watch amid fast gameplay because the color difference is too subtle.
**Why it happens:** Only changing the case color without other visual cues. Game moves fast, especially late in the round.
**How to avoid:** Multiple visual cues: gold case color (#DAA520), slightly larger size (1.2x), and optionally a subtle glow or shimmer effect. The size difference alone helps a lot.
**Warning signs:** Players report never seeing a golden watch even though spawn chance is reasonable.

## Code Examples

### Game State Machine Integration
```javascript
// Source: Standard Canvas game pattern (MDN Game Development, multiple sources)

var gameState = 'start';

// Modify existing game loop
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
    renderStart();
  } else if (gameState === 'playing') {
    update(dt);
    render();
  } else if (gameState === 'over') {
    renderGameOver();
  }

  requestAnimationFrame(gameLoop);
}
```

### Difficulty Ramp Integration with Existing Spawn Logic
```javascript
// Modifies existing update() function

function update(dt) {
  updateTrail();

  // Timer
  elapsed += dt;
  if (elapsed >= ROUND_DURATION) {
    gameState = 'over';
    return;
  }

  // Dynamic difficulty
  var diff = getDifficulty();

  // Watch spawning with dynamic interval
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
```

### Enhanced spawnWatch with Difficulty and Golden Watch
```javascript
function spawnWatch(diff) {
  var isFake = Math.random() < diff.fakeChance;
  var isGolden = !isFake && Math.random() < diff.goldenChance;

  var brand;
  if (isFake) {
    var t = Math.min(1, elapsed / ROUND_DURATION);
    brand = pickFakeName(t);
  } else {
    brand = 'Montignac';
  }

  var sneaky = isFake && Math.random() < diff.sneakyChance;
  var size = isGolden ? WATCH_SIZE * 1.2 : WATCH_SIZE;

  var baseVy = canvasHeight * 0.9 + 200;
  var speedMult = diff.speedMultiplier;

  watches.push({
    x: /* existing logic */,
    y: canvasHeight + 50,
    vx: /* existing logic */ * speedMult,
    vy: -(baseVy + Math.random() * canvasHeight * 0.25) * speedMult,
    size: size,
    rotation: 0,
    rotationSpeed: (Math.random() - 0.5) * 3,
    isFake: isFake,
    isGolden: isGolden,
    sneaky: sneaky,
    brand: brand,
    style: WATCH_STYLES[Math.floor(Math.random() * WATCH_STYLES.length)],
    slashed: false,
    value: isGolden ? 50 : (isFake ? -8 : 15)
  });

  stats.totalWatches++;
}
```

### Input Routing by Game State
```javascript
// Modify existing pointerdown handler
canvas.addEventListener('pointerdown', function(e) {
  e.preventDefault();
  var rect = canvas.getBoundingClientRect();
  var px = e.clientX - rect.left;
  var py = e.clientY - rect.top;

  if (gameState === 'start') {
    handleStartTap(px, py);
    return;
  }

  if (gameState === 'over') {
    handleReplayTap(px, py);
    return;
  }

  // gameState === 'playing' -- existing swipe logic
  isPointerDown = true;
  trailPoints.length = 0;
  trailPoints.push({ x: px, y: py, time: performance.now() });
});
```

### Vinted Brand Colors Reference
```javascript
// Vinted's primary brand color: Teal #007782
// Source: brandcolorcode.com/vinted (verified)
// The game already uses a close match: #009a9a to #006066 gradient
// For Vinted-style UI elements:
var VINTED_TEAL = '#007782';
var VINTED_TEAL_LIGHT = '#009a9a'; // already in use for background
var VINTED_TEAL_DARK = '#006066';  // already in use for background
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Touch Events API | Pointer Events API | ~2019 browser support | Already using Pointer Events (Phase 1 decision) |
| `setInterval` game loop | `requestAnimationFrame` | Widely adopted by 2013 | Already using rAF (Phase 1) |
| Image-based sprites | Canvas 2D drawing primitives | Project-specific decision | Already using drawing primitives (Phase 1 decision) |

**No technology changes needed for Phase 2.** All new features use the same APIs already proven in Phase 1.

## Vinted Branding Reference

For achieving the "Vinted product listing gone wrong" aesthetic:

| Element | Vinted Reference | Game Implementation |
|---------|-----------------|---------------------|
| Primary color | Teal #007782 | Background gradient already close (#009a9a - #006066) |
| Marketplace feel | Product cards, grid layout | Watches floating like product listings |
| Star ratings | 5-star seller rating system | Unicode stars with French labels |
| Typography | Clean, rounded, approachable | System sans-serif at appropriate sizes |
| Button style | Rounded corners, solid fill | Rounded rect buttons (existing `roundRect()` helper) |

## Open Questions

1. **Exact birthday message character encoding**
   - What we know: Text is "Joyeux anniversaire mon frere, longue vie aux montres et a Montignac"
   - What's unclear: Whether the source uses accented characters (frere vs frere, a vs a). HTML is already `charset="UTF-8"` so Canvas fillText will handle accents.
   - Recommendation: Use proper French accents: "Joyeux anniversaire mon fr\u00e8re, longue vie aux montres et \u00e0 Montignac". Canvas fillText handles UTF-8 natively.

2. **Score values with combo multiplier balance**
   - What we know: Real watch = 15 euros base, combo multiplier up to x5 = 75 euros per watch. Golden = 50 base, x5 = 250 euros.
   - What's unclear: Whether the 5-star rating thresholds (300 euros for "Roi du Vinted") are reachable in 60 seconds with this balance.
   - Recommendation: A rough estimate: ~40 watches in 60s, ~60% real, ~24 real slashed, average multiplier ~x2 = ~720 euros if playing perfectly. 300 euros is achievable for a good player. Adjust thresholds during testing if needed.

3. **File size growth**
   - What we know: game.js is 860 lines. Phase 2 adds ~400-600 lines (screens, state machine, difficulty, combo, rating, golden watch, enhanced feedback).
   - What's unclear: Whether 1200-1500 lines in a single file remains manageable.
   - Recommendation: Keep single file. This is a birthday joke game, not a production app. Navigation via function names and comments is sufficient. The locked decision is zero build tools, so module splitting would require manual script tag ordering.

## Sources

### Primary (HIGH confidence)
- MDN Canvas 2D API documentation (fillText, measureText, textAlign, globalAlpha) -- verified via WebFetch
- Existing game.js codebase (860 lines) -- read directly, all patterns verified
- Phase 1 RESEARCH.md and VERIFICATION.md -- architecture patterns confirmed working

### Secondary (MEDIUM confidence)
- [Vinted Brand Color Codes](https://www.brandcolorcode.com/vinted) -- primary teal #007782 verified via WebFetch
- [Game State Machine Canvas Example](https://dustinpfister.github.io/2020/01/28/canvas-example-state-machine/) -- state machine pattern confirmed
- [MDN Game Development tutorials](https://developer.mozilla.org/en-US/docs/Games/Tutorials/2D_Breakout_game_pure_JavaScript/Game_over) -- game over screen patterns
- [Game Programming Patterns](https://gameprogrammingpatterns.com/contents.html) -- state pattern reference
- [Scoring and Bonus Calculations - GameDev.net](https://www.gamedev.net/forums/topic/549170-scoring-and-bonus-calculations/) -- combo multiplier design

### Tertiary (LOW confidence)
- Difficulty ramp specific values (spawn intervals, fake ratios) -- derived from gameplay intuition, will need playtesting to tune
- Rating tier score thresholds -- estimated from scoring math, may need adjustment

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- same stack as Phase 1, no new technologies
- Architecture (state machine): HIGH -- well-established pattern, multiple sources confirm
- Architecture (difficulty ramp): HIGH for pattern, MEDIUM for specific values -- lerp pattern is proven, specific numbers need playtesting
- Pitfalls: HIGH -- derived from direct codebase analysis and standard Canvas game patterns
- Game balance (combo thresholds, rating tiers, golden watch probability): MEDIUM -- reasonable estimates from math, require playtesting

**Research date:** 2026-02-07
**Valid until:** 2026-03-07 (stable domain, no dependency versioning concerns)
