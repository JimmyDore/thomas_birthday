# Technology Stack

**Project:** Watch Ninja v1.1 -- Vinted Cards, Buy/Sell, Sound Effects
**Researched:** 2026-02-08
**Scope:** Stack additions for v1.1 features only (v1.0 stack validated and unchanged)

---

## Baseline Stack (Unchanged from v1.0)

These are validated and deployed. DO NOT re-evaluate:

| Technology | Status |
|------------|--------|
| Vanilla JS (ES2020+, single `game.js` file) | Deployed, working |
| HTML5 Canvas 2D with DPR-aware sizing | Deployed, working |
| Pointer Events API for touch input | Deployed, working |
| `requestAnimationFrame` game loop with delta-time | Deployed, working |
| nginx:alpine Docker deployment | Deployed, working |
| GitHub Actions CI/CD | Deployed, working |
| Zero dependencies, zero build tools | Validated constraint |

---

## New Stack Additions for v1.1

### 1. Vinted Card Rendering on Canvas 2D

**Recommendation:** Use the existing Canvas 2D API with pre-rendered offscreen canvases for card caching. No new dependencies.

#### Canvas 2D `roundRect()` -- Use the Native API

| Technique | Confidence | Why |
|-----------|------------|-----|
| `ctx.roundRect(x, y, w, h, radii)` | HIGH | Baseline Widely Available since April 2023. Chrome 99+, Safari 16+, Firefox 112+, Edge 99+. 94.74% global support per caniuse. Target is mobile Chrome only -- fully supported. |

The codebase already has a manual `roundRect()` helper (line 965 of `game.js`) using `quadraticCurveTo`. For v1.1, **replace with the native `ctx.roundRect()`** method for cleaner code. The native method accepts per-corner radii and integrates with `fill()`/`stroke()` natively.

**Current code (v1.0):**
```javascript
// Manual helper -- 10 lines of quadraticCurveTo paths
function roundRect(ctx, x, y, w, h, r) {
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  // ... 6 more lines
}
```

**v1.1 replacement:**
```javascript
// Native API -- 1 line
ctx.beginPath();
ctx.roundRect(x, y, w, h, radius);
ctx.fill();
```

**Source:** [MDN CanvasRenderingContext2D.roundRect()](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/roundRect), [Can I Use roundRect](https://caniuse.com/mdn-api_canvasrenderingcontext2d_roundrect) -- HIGH confidence.

#### Card Shadow -- Use `shadowOffsetY` with Minimal `shadowBlur`

| Approach | Recommendation |
|----------|---------------|
| `ctx.shadowBlur` on every frame | AVOID -- expensive on mobile, causes frame drops |
| Pre-render card with shadow to offscreen canvas | USE THIS -- draw once, `drawImage()` per frame |

Canvas shadows are computationally expensive. MDN explicitly warns: "Avoid the shadowBlur property whenever possible" for performance. Since Vinted cards are drawn every frame for 10-20 flying objects, **pre-render the card template once to an offscreen canvas** and stamp it with `drawImage()` each frame.

**Pattern -- Offscreen card cache:**
```javascript
function createCardCache(width, height, radius) {
  var padding = 10; // extra space for shadow
  var offscreen = document.createElement('canvas');
  offscreen.width = (width + padding * 2) * dpr;
  offscreen.height = (height + padding * 2) * dpr;
  var offCtx = offscreen.getContext('2d');
  offCtx.scale(dpr, dpr);

  // Draw shadow ONCE (expensive, but only done once)
  offCtx.shadowColor = 'rgba(0, 0, 0, 0.15)';
  offCtx.shadowBlur = 8;
  offCtx.shadowOffsetY = 2;

  // White card background
  offCtx.fillStyle = '#ffffff';
  offCtx.beginPath();
  offCtx.roundRect(padding, padding, width, height, radius);
  offCtx.fill();

  // Reset shadow for subsequent drawing
  offCtx.shadowColor = 'transparent';
  offCtx.shadowBlur = 0;

  return offscreen;
}
```

**Key insight:** The offscreen canvas should be snugly sized around the card content. MDN warns that "the performance gain of off-screen rendering is counterweighted by the performance loss of copying one large canvas onto another."

**Source:** [MDN Optimizing Canvas](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Optimizing_canvas), [web.dev Canvas Performance](https://web.dev/articles/canvas-performance) -- HIGH confidence.

#### Card Text Layout -- `measureText()` + Manual Line Positioning

Canvas 2D has no text wrapping. Use `ctx.measureText()` for width measurement and manually position each line.

**Vinted card text layout:**
```javascript
// Brand name -- large, bold, below watch illustration
ctx.font = 'bold 14px sans-serif';
ctx.textAlign = 'center';
ctx.fillStyle = '#171717'; // Vinted dark text
ctx.fillText(brand, cardCenterX, textY);

// Price tag
ctx.font = '13px sans-serif';
ctx.fillStyle = '#007782'; // Vinted teal
ctx.fillText(price, cardCenterX, textY + 18);
```

The brand name is now rendered at 14px on a white background, dramatically more readable than the current 11px text on a rotating watch dial at 0.25 opacity.

**Confidence:** HIGH -- `measureText()` and text rendering are stable Canvas 2D APIs.

#### Card Watch Illustration -- Simplified Inline Drawing

Keep drawing the watch illustration with Canvas primitives (the existing `drawRoundWatch`/`drawSquareWatch`/`drawSportWatch` functions), but scaled down to fit inside the card's top section. This maintains the existing visual style and avoids needing image assets.

**Structure of a Vinted card:**
```
+-------------------+
|  [watch drawing]  |  <- top 60%, existing draw functions at smaller scale
|                   |
|-------------------|
|   Montignac       |  <- brand name, bold, 14px, dark
|     25 EUR        |  <- price, teal, 13px
+-------------------+
```

**Card dimensions recommendation:** ~90px wide x ~120px tall (CSS pixels). This is larger than the current 60px watch diameter, giving significantly more space for readable text. Cards rotate and fly with the same physics as before.

#### Summary of Card Rendering Stack

| Component | Technique | New API? | Confidence |
|-----------|-----------|----------|------------|
| Card shape | `ctx.roundRect()` native | Yes (replaces manual helper) | HIGH |
| Card shadow | Pre-render to offscreen canvas | No (existing API, new pattern) | HIGH |
| Card text | `ctx.font`, `ctx.fillText`, `ctx.measureText` | No | HIGH |
| Watch illustration | Existing `drawRoundWatch` etc., scaled | No | HIGH |
| Per-frame stamping | `ctx.drawImage(offscreenCanvas, ...)` | No | HIGH |

---

### 2. Sound Effects -- Web Audio API

**Recommendation:** Web Audio API with procedural sound generation. No audio files needed.

#### Why Web Audio API, Not HTML5 `<audio>` Elements

| Factor | HTML5 `<audio>` | Web Audio API | Winner |
|--------|-----------------|---------------|--------|
| Overlapping sounds | One playback per element; need multiple `<audio>` for overlap | Create new `AudioBufferSourceNode` per play, unlimited overlapping | Web Audio |
| Latency | Variable, often 50-100ms delay on mobile | Near-zero latency, frame-accurate | Web Audio |
| Mobile restrictions | Volume control often disabled; limited to 1 channel on iOS | Full programmatic volume; unlimited simultaneous sources | Web Audio |
| File dependency | Needs .mp3/.wav files served by nginx | Can generate sounds procedurally with oscillators -- zero files | Web Audio |
| Complexity | Simple `.play()` API | More code for AudioContext setup | HTML5 Audio |

**Verdict:** For game sound effects that must play simultaneously (slash + coin on same frame), with low latency, and ideally without external audio files -- **Web Audio API is the clear choice.**

The v1.0 STACK.md recommended "start with HTML5 Audio, switch if needed." After deeper research, I recommend going directly to Web Audio API because:
1. Game SFX require overlapping playback (slash two watches in quick succession)
2. Mobile Chrome throttles HTML5 Audio for overlapping plays
3. Procedural generation means zero audio files to manage or deploy
4. The code is only ~50 lines per sound effect

**Source:** [MDN Audio for Web Games](https://developer.mozilla.org/en-US/docs/Games/Techniques/Audio_for_Web_Games), [Chrome Web Audio Autoplay Policy](https://developer.chrome.com/blog/web-audio-autoplay) -- HIGH confidence.

#### AudioContext Initialization -- User Gesture Required

Mobile Chrome requires a user gesture before audio plays. The game already has a "Jouer" button on the start screen -- **create or resume the AudioContext in the `handleStartTap` handler.**

```javascript
var audioCtx = null;

function initAudio() {
  if (audioCtx) return;
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
}

function handleStartTap(px, py) {
  if (/* hit test */) {
    initAudio(); // User gesture -- AudioContext starts in 'running' state
    startGame();
  }
}
```

If `AudioContext` is created before a user gesture, it starts in `'suspended'` state and must be explicitly resumed with `audioCtx.resume()`. Creating it ON the gesture avoids this entirely.

**Source:** [MDN Web Audio API Best Practices](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices), [Chrome Autoplay Policy](https://developer.chrome.com/blog/autoplay) -- HIGH confidence.

#### Procedural Sound Generation -- Zero Audio Files

Generate all three sound effects with oscillators + gain envelopes. This keeps the project at zero external dependencies and zero additional files.

**Slash sound** (quick frequency sweep down, ~100ms):
```javascript
function playSlash() {
  if (!audioCtx) return;
  var osc = audioCtx.createOscillator();
  var gain = audioCtx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(800, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(200, audioCtx.currentTime + 0.1);
  gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.1);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.1);
}
```

**Coin sound** (two-tone ascending ping, ~200ms):
```javascript
function playCoin() {
  if (!audioCtx) return;
  var t = audioCtx.currentTime;
  // First ping
  var osc1 = audioCtx.createOscillator();
  var gain1 = audioCtx.createGain();
  osc1.type = 'sine';
  osc1.frequency.setValueAtTime(880, t);
  gain1.gain.setValueAtTime(0.3, t);
  gain1.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
  osc1.connect(gain1);
  gain1.connect(audioCtx.destination);
  osc1.start(t);
  osc1.stop(t + 0.1);
  // Second ping (higher)
  var osc2 = audioCtx.createOscillator();
  var gain2 = audioCtx.createGain();
  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(1320, t + 0.08);
  gain2.gain.setValueAtTime(0.3, t + 0.08);
  gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
  osc2.connect(gain2);
  gain2.connect(audioCtx.destination);
  osc2.start(t + 0.08);
  osc2.stop(t + 0.2);
}
```

**Penalty sound** (low buzz, ~200ms):
```javascript
function playPenalty() {
  if (!audioCtx) return;
  var osc = audioCtx.createOscillator();
  var gain = audioCtx.createGain();
  osc.type = 'square';
  osc.frequency.setValueAtTime(150, audioCtx.currentTime);
  gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.2);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.2);
}
```

Each `AudioBufferSourceNode` / `OscillatorNode` is a one-shot: create it, start it, it gets garbage collected after stopping. No pooling needed -- the Web Audio API handles thousands of simultaneous sources without issue.

**Source:** [MDN OscillatorNode](https://developer.mozilla.org/en-US/docs/Web/API/OscillatorNode), [MDN Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API) -- HIGH confidence.

#### Alternative: Pre-recorded Audio Files

If procedural sounds feel too "synthy" during testing, switch to tiny .mp3 files loaded via `fetch()` + `decodeAudioData()`:

```javascript
var slashBuffer = null;

async function loadSound(url) {
  var response = await fetch(url);
  var arrayBuffer = await response.arrayBuffer();
  return audioCtx.decodeAudioData(arrayBuffer);
}

function playBuffer(buffer) {
  if (!audioCtx || !buffer) return;
  var source = audioCtx.createBufferSource();
  source.buffer = buffer;
  source.connect(audioCtx.destination);
  source.start();
}

// Load after AudioContext init:
slashBuffer = await loadSound('sounds/slash.mp3');
```

**Free sound sources (if needed):** [Freesound.org](https://freesound.org/) (CC0), [Mixkit](https://mixkit.co/free-sound-effects/) (free license), [Pixabay Sound Effects](https://pixabay.com/sound-effects/) (royalty-free).

**Recommendation:** Start with procedural generation. It matches the game's arcade aesthetic and avoids file management. Switch to pre-recorded only if the sounds feel wrong during playtesting.

#### Summary of Audio Stack

| Component | Technique | New API? | Files Needed | Confidence |
|-----------|-----------|----------|-------------|------------|
| Audio engine | Web Audio API (`AudioContext`) | Yes -- new for v1.1 | 0 | HIGH |
| AudioContext init | Create on first user tap | Yes | 0 | HIGH |
| Slash sound | Sawtooth oscillator, freq sweep 800->200Hz | Yes | 0 | HIGH |
| Coin sound | Two sine oscillator pings, 880Hz + 1320Hz | Yes | 0 | HIGH |
| Penalty sound | Square oscillator, low 150Hz buzz | Yes | 0 | HIGH |
| Fallback | Pre-recorded .mp3 via `decodeAudioData` | Optional | 3 small .mp3 | HIGH |

---

### 3. Two-Act Game State Machine

**Recommendation:** Extend the existing `gameState` string variable to cover new states. No state machine library needed.

#### Current State Machine (v1.0)

```
'start' --[tap Jouer]--> 'playing' --[timer expires]--> 'over'
   ^                                                       |
   +------------------[tap Rejouer]------------------------+
```

The current implementation uses a simple string variable `gameState` (line 13 of `game.js`) checked in the game loop:

```javascript
if (gameState === 'start') { renderStart(dt); }
else if (gameState === 'playing') { update(dt); render(dt); }
else if (gameState === 'over') { renderGameOver(); }
```

#### v1.1 Extended State Machine

```
'start' --[tap]--> 'buying' --[timer]--> 'transition' --[auto]--> 'selling' --[timer]--> 'over'
   ^                                                                                        |
   +-----------------------------------[tap Rejouer]---------------------------------------+
```

**New states:**
| State | Replaces | Purpose | Duration |
|-------|----------|---------|----------|
| `'buying'` | `'playing'` | Act 1: Buy watches, avoid fakes (existing gameplay) | ~40s |
| `'transition'` | (new) | Brief screen showing inventory tally before Act 2 | ~3s auto-advance |
| `'selling'` | (new) | Act 2: Judge buyer offers on your inventory | ~30s |

**Implementation pattern -- extend the existing if/else chain:**

```javascript
var gameState = 'start'; // 'start' | 'buying' | 'transition' | 'selling' | 'over'
var act = 1; // Track which act for shared logic

function gameLoop(timestamp) {
  // ... existing dt calculation ...
  if (gameState === 'start') { renderStart(dt); }
  else if (gameState === 'buying') { updateBuying(dt); renderBuying(dt); }
  else if (gameState === 'transition') { updateTransition(dt); renderTransition(dt); }
  else if (gameState === 'selling') { updateSelling(dt); renderSelling(dt); }
  else if (gameState === 'over') { renderGameOver(); }
  requestAnimationFrame(gameLoop);
}
```

#### Why NOT Use a State Machine Library

| Library | Verdict | Rationale |
|---------|---------|-----------|
| XState | REJECT | 40KB+ minified. Designed for complex concurrent state charts. This game has 5 sequential states with no concurrency. |
| javascript-state-machine | REJECT | 8KB+. Adds event-driven transitions, callbacks, lifecycle hooks. Overkill for 5 states controlled by timers. |
| Machina.js | REJECT | Similar -- formal FSM for complex state management. Wrong scale. |

The existing if/else pattern in `gameLoop` is the right abstraction for 5 states. Adding a library would require learning its API, adapting the existing code, and adding a dependency -- all for zero benefit.

#### State Transition Data Flow

The key architectural question is: **what data passes from Act 1 (buying) to Act 2 (selling)?**

```javascript
var inventory = []; // Watches bought in Act 1, carried to Act 2

// During 'buying' phase, slashing a real watch adds it:
function slashWatch(watch) {
  if (!watch.isFake) {
    inventory.push({
      brand: watch.brand,
      style: watch.style,
      value: watch.value,
      isGolden: watch.isGolden
    });
  }
  // ... existing slash logic
}

// During 'transition', display inventory count
// During 'selling', use inventory to generate buyer offer scenarios
```

**Confidence:** HIGH -- this is a straightforward extension of existing patterns in the codebase.

#### Timer Architecture for Two Acts

The existing `elapsed` and `ROUND_DURATION` variables handle one timer. For two acts, **reset the timer between acts:**

```javascript
var ACT1_DURATION = 40; // seconds
var TRANSITION_DURATION = 3;
var ACT2_DURATION = 30;

function updateBuying(dt) {
  elapsed += dt;
  if (elapsed >= ACT1_DURATION) {
    gameState = 'transition';
    elapsed = 0; // Reset for transition timer
  }
  // ... existing update logic
}

function updateTransition(dt) {
  elapsed += dt;
  if (elapsed >= TRANSITION_DURATION) {
    gameState = 'selling';
    elapsed = 0; // Reset for Act 2 timer
  }
}
```

---

## What NOT to Add (and Why)

| Temptation | Why Resist |
|------------|-----------|
| Phaser or PixiJS for "card rendering" | Canvas 2D `roundRect()` + offscreen cache handles cards perfectly. A framework adds 500KB-1MB for a feature that takes 20 lines of vanilla code. |
| Howler.js for audio | Web Audio API is native, zero-dependency, and supports everything this game needs. Howler.js would be the first npm dependency. |
| XState for state machine | 5 sequential states. An if/else chain is clearer and has zero learning curve. |
| ES modules / file splitting | The game is 1381 lines in one file. Adding 3 sound functions, card rendering, and new states will bring it to ~1800-2000 lines. Still manageable in one file. Split only if it crosses ~2500 lines. |
| Image sprites for cards | Canvas-drawn cards match the existing aesthetic (v1.0 watches are all Canvas primitives). Loading PNGs would add assets to deploy and break the visual consistency. |
| Audio sprite sheet (.mp3 with multiple sounds) | Procedural generation is simpler and more flexible than managing a single audio file with timestamp offsets. |
| npm / webpack / vite | Still a single `game.js` file. Build tools add complexity for zero benefit at this scale. |

---

## Integration Points with Existing Codebase

| v1.1 Feature | Touches These Existing Functions | Integration Approach |
|--------------|--------------------------------|---------------------|
| Vinted cards | `drawWatch()`, `drawRoundWatch()`, `drawSquareWatch()`, `drawSportWatch()`, `drawBrandLabel()`, `renderHalf()` | Replace `drawWatch()` with `drawCard()`. Keep old draw functions for the mini-illustration inside the card. Update `renderHalf()` to clip cards instead of circles. |
| Sound effects | `slashWatch()`, `spawnWatch()` (miss penalty), `update()` (game over) | Add `playSlash()` call in `slashWatch()`. Add `playCoin()` on positive score. Add `playPenalty()` on fake slash or miss. |
| AudioContext init | `handleStartTap()`, `handleReplayTap()` | Add `initAudio()` call at the top of both handlers. |
| Buy/sell states | `gameState` variable, `gameLoop()`, `update()`, `startGame()`, `resetGame()` | Rename `'playing'` to `'buying'`. Add `'transition'` and `'selling'` states. Split `update()` into `updateBuying()` / `updateSelling()`. |
| Inventory | `slashWatch()` | Push to `inventory[]` array when slashing real watches during buying phase. |
| Transition screen | (new function) | New `renderTransition()` function, similar to `renderStart()` layout. |
| Sell phase gameplay | (new functions) | New `updateSelling()` and `renderSelling()` functions with different mechanics. |

---

## Performance Impact Assessment

| Addition | CPU Cost | Memory Cost | Frame Budget Impact |
|----------|----------|-------------|-------------------|
| Offscreen card cache | One-time ~2ms per card variant | ~6 small canvases (~50KB total) | Reduces per-frame cost vs. drawing cards from scratch |
| `drawImage()` per card | ~0.1ms per card | Negligible | 20 cards = 2ms, well within 16ms budget |
| Web Audio oscillators | Negligible (native audio thread) | ~1KB per active sound | Zero impact on render thread |
| Extra game states | Negligible (one string comparison) | ~100 bytes for inventory array | Zero impact |
| Brand text on white card | Less expensive than current (no stroke outline needed) | None | Slight improvement over v1.0 |

**Total v1.1 performance impact:** Neutral to slightly positive. Pre-rendering cards to offscreen canvas may actually improve frame times compared to the current per-frame watch drawing.

---

## Sources

| Source | Confidence | Used For |
|--------|------------|----------|
| [MDN CanvasRenderingContext2D.roundRect()](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/roundRect) | HIGH | Native roundRect API, browser support |
| [Can I Use roundRect](https://caniuse.com/mdn-api_canvasrenderingcontext2d_roundrect) | HIGH | Browser version numbers, 94.74% global support |
| [MDN Optimizing Canvas](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Optimizing_canvas) | HIGH | Offscreen canvas caching, shadowBlur perf warning |
| [web.dev Canvas Performance](https://web.dev/articles/canvas-performance) | HIGH | Pre-rendering patterns, batch drawing |
| [MDN Audio for Web Games](https://developer.mozilla.org/en-US/docs/Games/Techniques/Audio_for_Web_Games) | HIGH | Web Audio vs HTML5 Audio comparison, mobile restrictions |
| [Chrome Web Audio Autoplay Policy](https://developer.chrome.com/blog/web-audio-autoplay) | HIGH | User gesture requirement, AudioContext.resume() |
| [MDN Web Audio API Best Practices](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices) | HIGH | AudioContext creation timing |
| [MDN OscillatorNode](https://developer.mozilla.org/en-US/docs/Web/API/OscillatorNode) | HIGH | Procedural sound generation API |
| [web.dev Developing Game Audio](https://web.dev/webaudio-games/) | HIGH | Game audio architecture patterns |
| [Chrome Autoplay Policy](https://developer.chrome.com/blog/autoplay) | HIGH | Mobile autoplay restrictions |
| Existing `game.js` source (1381 lines) | HIGH | Integration points, current patterns |

---

## Summary Decision Matrix

| Decision | Choice | New Dependency? | Confidence |
|----------|--------|----------------|------------|
| Card rendering | Canvas 2D `roundRect()` + offscreen cache | No (native API) | HIGH |
| Card shadows | Pre-rendered to offscreen canvas | No (native API, perf pattern) | HIGH |
| Card text | `ctx.fillText()` on white background | No (existing API) | HIGH |
| Watch illustration in cards | Existing Canvas draw functions, scaled | No | HIGH |
| Audio engine | Web Audio API (`AudioContext`) | No (native API) | HIGH |
| Sound generation | Procedural (oscillators + gain envelopes) | No (native API) | HIGH |
| AudioContext init | On first user tap (start/replay button) | No | HIGH |
| State machine | Extend `gameState` string with new states | No | HIGH |
| State machine library | None (if/else chain for 5 states) | No | HIGH |
| Audio files | None (procedural first, .mp3 fallback if needed) | Optional | HIGH |
| New npm packages | Zero | No | HIGH |

**v1.1 adds zero dependencies. All features use native browser APIs.**
