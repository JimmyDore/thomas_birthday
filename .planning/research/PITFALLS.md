# Domain Pitfalls: v1.1 Milestone

**Domain:** Adding card-based visuals, two-act buy/sell mechanic, and sound effects to an existing Canvas 2D mobile game
**Researched:** 2026-02-08
**Confidence:** HIGH for card rendering and integration pitfalls (verified against codebase); HIGH for audio pitfalls (verified via MDN and Chrome developer docs); MEDIUM for multi-act state management (based on game state machine patterns and codebase analysis)

---

## Critical Pitfalls

Mistakes that cause rewrites, broken gameplay, or silent failures on mobile.

---

### Pitfall 1: Card Clipping Breaks Split-Half Animation

**What goes wrong:**
The existing split-half animation uses `ctx.clip()` with a vertical `rect()` to show left/right halves of the slashed watch. Currently this clips a circular/square watch shape, which looks natural because the clip line passes through the center of a symmetric shape. When the watch is replaced by a rectangular Vinted card (taller than wide, with text, image area, and colored border), the clip line still splits at the vertical center, but the card's internal layout is not symmetric. The left half shows a cut-off brand name, the right half shows the other cut-off half. It looks broken -- like a torn UI element rather than a satisfying slash.

**Why it happens:**
The current `renderHalf()` function (line 539-588 of game.js) creates a `tempWatch` object at origin and clips it with `ctx.rect(0, -large, large, large*2)` or `ctx.rect(-large, -large, large, large*2)`. This assumes the watch is symmetric and centered at (0,0). A rectangular card with text labels and an image zone is NOT symmetric around its vertical center in the same way. The brand name, price text, and card borders will be sliced mid-character, looking like a rendering bug rather than a slicing effect.

**Consequences:**
- Split animation looks glitchy instead of satisfying
- Players perceive visual bugs and lose trust in the game
- If text is rendered inside the card, clipped text is visually jarring

**Prevention:**
1. Before implementing the card renderer, design the split animation first. Decide: should cards split vertically (left/right) or horizontally (top/bottom)?
2. Consider using the slash angle to determine clip direction. The existing `slashAngle` is already passed to `createSplitHalves` -- use it.
3. For rectangular cards, horizontal splits (top/bottom) may look more natural since the card is taller than wide. A horizontal slash cutting a card into top-half (image) and bottom-half (text) looks intentional.
4. Alternative: render the card to a small offscreen canvas once, then use `drawImage()` with source-rect clipping for the split. This avoids complex clipping math in the animation loop.
5. Test the split with the actual card dimensions, not placeholders. The visual quality of the split IS the game feel.

**Detection:**
- Cards look "torn" rather than "sliced" when slashed
- Text characters visibly cut in half
- Split halves don't look like they belong to the same card

**Phase to address:** Card Visual Redesign phase -- split animation must be redesigned alongside the card renderer, not after.

---

### Pitfall 2: AudioContext Suspended on Mobile -- No Sound At All

**What goes wrong:**
You add sound effects, test in desktop Chrome (works perfectly), deploy to the phone, and hear nothing. No error in console, no crash, just silence. The Web Audio API's `AudioContext` starts in `"suspended"` state on mobile Chrome and will not produce any audio until explicitly resumed during a user gesture event.

**Why it happens:**
Chrome's autoplay policy (enforced since Chrome 71, still active) requires a user interaction -- specifically one of `touchend`, `click`, `dblclick`, `keydown`, or `keyup` -- before an `AudioContext` can transition from `"suspended"` to `"running"`. Creating the `AudioContext` on page load or even in `DOMContentLoaded` results in a suspended context. Calling `source.start()` on a suspended context is a silent no-op. Desktop Chrome may auto-allow audio on localhost, masking the problem.

**Consequences:**
- Zero audio on mobile -- the entire sound system is dead silent
- No error is thrown, so the developer believes audio is working
- Users hear nothing and assume the game has no sound

**Prevention:**
1. Create the `AudioContext` lazily -- NOT on page load, but on the first user tap (e.g., the "Jouer" button tap on the start screen).
2. If creating it earlier, call `audioCtx.resume()` inside the "Jouer" button's tap handler. The start screen tap is the natural unlock point.
3. Check `audioCtx.state === 'suspended'` and call `audioCtx.resume()` in every user gesture handler as a safety net.
4. Test audio on a REAL phone before considering sound "done." Desktop testing is not reliable for autoplay policy.

**Detection:**
- Audio plays on desktop but not on mobile
- `audioCtx.state` reads `"suspended"` after page load
- No errors in console despite no audio output

**Phase to address:** Sound Effects phase -- the very first thing to implement is AudioContext creation and unlock. All other sound work depends on this.

**Sources:** [Chrome Web Audio Autoplay Policy](https://developer.chrome.com/blog/web-audio-autoplay), [MDN Audio for Web Games](https://developer.mozilla.org/en-US/docs/Games/Techniques/Audio_for_Web_Games)

---

### Pitfall 3: State Machine Expansion Causes Impossible State Combinations

**What goes wrong:**
The current game has 3 states: `'start'`, `'playing'`, `'over'`. Adding a two-act mechanic requires at minimum: `'start'`, `'act1_playing'`, `'act1_over'`/`'transition'`, `'act2_playing'`, `'over'`. The developer adds these as new string values to the existing `gameState` variable. But the game loop, input handlers, and rendering functions all check `gameState` with simple `===` comparisons scattered across the file. Some code paths check `gameState === 'playing'` -- which no longer exists. The game freezes, buttons stop responding, or Act 1 mechanics leak into Act 2.

**Why it happens:**
The current codebase uses a flat string variable `gameState` (line 13) checked in the game loop (lines 1362-1369), input handlers (lines 153-163), and rendering. When expanding from 3 states to 5-6 states, every conditional must be found and updated. Missing even one creates a dead code path. The string-based approach offers no exhaustiveness checking -- there is no compiler or runtime that warns "you forgot to handle the 'transition' state in the input handler."

**Consequences:**
- Game freezes on transition screen (input handler doesn't recognize the new state)
- Act 1 mechanics run during Act 2 (spawner keeps running because it only checks `gameState === 'playing'`)
- Score/combo from Act 1 bleeds into Act 2 when it shouldn't (or resets when it shouldn't)
- Replay from game-over doesn't reset both acts properly

**Prevention:**
1. Before adding states, audit EVERY place `gameState` is read. In the current codebase: game loop (line 1362-1369), pointerdown handler (line 153-163), update function (line 1301), renderStart (line 1087), renderGameOver (line 1153). Document all check points.
2. Introduce a helper: `function isPlaying() { return gameState === 'act1' || gameState === 'act2'; }` rather than changing every `=== 'playing'` check. This is the lowest-risk refactor.
3. Group related state: use `gameState` for high-level flow (`'start'`, `'playing'`, `'transition'`, `'over'`) and a separate `currentAct` variable (`1` or `2`) for act tracking. This minimizes changes to existing code.
4. Test EVERY state transition: start -> act1, act1 -> transition, transition -> act2, act2 -> over, over -> start. Test replay from over. Test what happens if you tap during transition.

**Detection:**
- Game freezes at a state boundary (tapping does nothing)
- Act 2 spawns Act 1 entities
- Score carries over incorrectly between acts
- Replay doesn't start at Act 1

**Phase to address:** Buy/Sell Mechanic phase -- state machine expansion should be the FIRST thing built, before any Act 2 gameplay. Get the flow skeleton working with placeholder screens.

---

### Pitfall 4: Hit Detection Breaks When Hitbox Changes from Circle to Rectangle

**What goes wrong:**
The current collision detection (line 365-389) uses `lineSegmentIntersectsCircle()` -- it checks whether the swipe trail intersects a circle centered on the watch with a generous radius. Replacing circular watches with rectangular Vinted cards means the hitbox shape changes. If you keep the circle hitbox, cards can be "hit" by swiping through empty corners of the bounding circle. If you switch to rectangle hitbox, the math is different and the existing function doesn't work.

**Why it happens:**
The current hitbox is defined by `w.size / 2 * 1.2` (line 404) -- a radius. A rectangular card has width and height, not a single radius. The card is taller than it is wide (portrait aspect ratio for a Vinted listing), so a circle hitbox either makes the top/bottom too generous or the sides too tight.

**Consequences:**
- If circle hitbox is kept: slashes that clearly miss the card visual still register as hits (frustrating for fake detection)
- If naively switched to AABB: the hitbox doesn't rotate with the card, causing hits to miss rotating cards
- If the hitbox is too tight: the game feels unresponsive (fast swipes miss more than before)

**Prevention:**
1. Keep the circle hitbox but base the radius on the card's SHORTER dimension (width), not the diagonal. This makes the hitbox slightly smaller than the card visual, which feels fair because the player sees a "near miss" on the card edges.
2. Alternatively, use the card's diagonal / 2 as the radius (generous) -- better for game feel, slightly unfair on narrow misses.
3. Do NOT attempt rotated-rectangle collision detection. The math is complex and the game already feels good with circular hitboxes. The visual will read as correct to the player.
4. Test by swiping near card edges and corners. The feel should be that "close enough" hits register.

**Detection:**
- Swipes through the card center miss (hitbox too small)
- Swipes through empty space near the card hit (hitbox too large)
- Rotating cards become unhittable at certain angles

**Phase to address:** Card Visual Redesign phase -- adjust hitbox radius when card dimensions are finalized, not as an afterthought.

---

### Pitfall 5: Inventory State Lost or Corrupted During Act Transition

**What goes wrong:**
Act 1 builds an inventory of purchased watches. The transition screen shows this inventory. Act 2 uses this inventory as the set of watches to sell. If the inventory array is the same reference as the watches array (or built from it carelessly), mutations during Act 2 corrupt the original data. Watches "disappear" from inventory, prices change, or the transition screen shows different watches than what was slashed.

**Why it happens:**
The current `watches` array (line 63) is cleared on game reset (line 1288: `watches.length = 0`). If the inventory is built by pushing references to watch objects into a new array, those references point to objects that are later modified or recycled. JavaScript arrays hold references, not copies. A shallow copy (`inventory = [...watches]`) copies the references but the objects are still shared.

**Consequences:**
- Transition screen shows wrong watches or wrong count
- Act 2 has different watches than Act 1 collected
- Properties (brand name, value, isFake) change between acts
- Edge case: golden watches lose their golden status

**Prevention:**
1. When a watch is successfully slashed in Act 1, create a NEW plain object for inventory: `inventory.push({ brand: w.brand, value: w.value, isFake: w.isFake, isGolden: w.isGolden })`. Do NOT push the watch object itself.
2. Never mutate inventory objects after creation. Treat them as immutable records.
3. Clear the `watches` array when transitioning to Act 2, but NEVER touch `inventory`.
4. Add an inventory count assertion: after Act 1 ends, `inventory.length` should equal `stats.realSlashed`. If not, there is a bug.

**Detection:**
- Inventory count on transition screen does not match slashed count from Act 1
- Watch properties (brand, value) differ between Act 1 slash and Act 2 display
- Inventory is empty after transition

**Phase to address:** Buy/Sell Mechanic phase -- inventory data structure must be designed before Act 2 gameplay. This is a data modeling decision, not a gameplay decision.

---

## Moderate Pitfalls

Mistakes that cause delays, degraded experience, or technical debt.

---

### Pitfall 6: Card Brand Name Unreadable at Small Sizes or During Flight

**What goes wrong:**
The whole point of the Vinted card redesign is making the brand name readable. But Canvas `fillText()` renders text as rasterized pixels with no subpixel hinting at small sizes. A brand name like "Montignac" or "Montignak" (9-10 characters) needs to fit inside a card that's ~80-100px wide on screen. At font sizes below 12px, text becomes illegible on mobile, especially while the card is rotating and moving.

**Why it happens:**
The current brand label drawing (line 873-884) uses `Math.max(11, size * 0.22)` for font size -- this already produces borderline-readable text at WATCH_SIZE=60. A card is wider than a watch dial but the text area is constrained. If the card must also show a price, a small watch illustration, and a border, the text area shrinks further. Rotating cards make text even harder to read because the eye can't track angled text in motion.

**Consequences:**
- Core gameplay mechanic (reading the brand name) is broken
- Players can't distinguish "Montignac" from "Montignaq" at small sizes
- The redesign fails to solve the exact problem it was created to fix

**Prevention:**
1. Set a minimum font size of 14px for the brand name. If the card is too small to fit the name at 14px, make the card bigger.
2. Use bold weight and high-contrast colors (dark text on white card background).
3. Use `ctx.measureText(brand).width` to verify the text fits. If not, either truncate with ellipsis or reduce card padding.
4. Consider rendering the brand name WITHOUT rotation -- use `ctx.save()`, undo the card rotation, draw the text horizontally, `ctx.restore()`. Horizontal text is far more readable than rotated text.
5. Test readability by having someone who does NOT know the brand names play the game. If they can't read the names at full speed, the font is too small.

**Detection:**
- Players slash randomly because they cannot read names during flight
- Brand names are only readable when cards reach the apex of their arc (briefly stationary)
- Sneaky fake names ("Montignaq" vs "Montignac") are indistinguishable

**Phase to address:** Card Visual Redesign phase -- font size and readability must be validated with real card dimensions before finalizing layout.

---

### Pitfall 7: Audio Decode Lag Causes First-Play Silence or Stutter

**What goes wrong:**
Sound effects play perfectly after the first trigger but the FIRST time each sound plays, there is a noticeable delay (50-200ms) or the sound simply doesn't play. This is because the audio buffer hasn't been decoded yet when `start()` is called.

**Why it happens:**
If audio files are decoded lazily (on first play) using `decodeAudioData()`, the decode is asynchronous and takes time. The `start()` call fires before the buffer is ready. Alternatively, if using `<audio>` elements, the first `play()` triggers a network fetch on mobile (buffering is deferred until play). Either way, the first playback instance is delayed or silent.

**Consequences:**
- First slash of the game has no sound, all subsequent slashes have sound
- Creates a "broken then fixed" perception that feels buggy
- If using `<audio>` elements, each unique sound file has its own first-play delay

**Prevention:**
1. Use the Web Audio API (NOT `<audio>` elements) for sound effects. Web Audio buffers can be pre-decoded.
2. Pre-load and pre-decode ALL sound buffers during the start screen, before the game begins:
```javascript
async function loadSound(url) {
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  return audioCtx.decodeAudioData(arrayBuffer);
}
// Load all sounds while player is on start screen
const sounds = {
  slash: await loadSound('slash.mp3'),
  coin: await loadSound('coin.mp3'),
  penalty: await loadSound('penalty.mp3')
};
```
3. Keep audio files small (under 50KB each for short SFX). Short sounds decode in <10ms.
4. The "Jouer" button tap that starts the game is the perfect moment to both unlock AudioContext AND verify all buffers are decoded.

**Detection:**
- First slash has no sound, second slash does
- Sounds are delayed by 100-200ms on first play
- Audio works perfectly on desktop but has first-play issues on mobile

**Phase to address:** Sound Effects phase -- pre-loading buffers should be the second thing built after AudioContext unlock.

**Sources:** [MDN Web Audio API Best Practices](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices), [MDN Audio for Web Games](https://developer.mozilla.org/en-US/docs/Games/Techniques/Audio_for_Web_Games)

---

### Pitfall 8: Act 2 Pacing Feels Wrong Because It Reuses Act 1 Difficulty Curve

**What goes wrong:**
Act 2 (selling) is supposed to feel different from Act 1 (buying). But the developer reuses the same spawn timing, difficulty ramp, and 60-second timer from Act 1. The result: Act 2 feels like "more of the same" instead of a distinct gameplay phase. Or worse, the difficulty curve that makes sense for Act 1 (gradually harder) creates an Act 2 that starts too slow or too fast.

**Why it happens:**
The current difficulty system (line 202-211, `getDifficulty()`) is tuned for a single 60-second round with quadratic ease-in. The spawn interval drops from 1.2s to 0.3s over the round. If Act 2 reuses this, buyers appear at the same rate as watches in Act 1. But selling is a different mechanic -- the player needs time to evaluate offers, not just react to visual appearance. Reusing the curve makes Act 2 feel rushed or identical.

**Consequences:**
- Act 2 doesn't feel like a new phase -- players feel the game "just continues"
- If Act 2 is too fast, players can't evaluate offers and slash randomly
- If Act 2 is too slow (because difficulty resets), it feels boring after the frenetic Act 1 ending
- The two-act structure adds nothing to the game experience

**Prevention:**
1. Design Act 2 difficulty independently. Create `getAct2Difficulty()` with its own curve.
2. Act 2 should probably start at medium pace (not slow -- player is warmed up) and ramp differently.
3. Consider making Act 2 shorter (30-40 seconds) to maintain energy. Two 60-second rounds may be too long.
4. Playtest the transition: does the pacing shift feel intentional? Does it feel like a second act or just a restart?
5. The difficulty parameters to tune independently: spawn rate, offer timing, how quickly good/bad offers appear, timer duration.

**Detection:**
- Playtesters say "Act 2 felt the same as Act 1"
- Players stop paying attention during Act 2 (boredom)
- Players slash randomly during Act 2 (too fast to evaluate)
- Total game time (Act 1 + transition + Act 2) exceeds 2.5 minutes (attention drops)

**Phase to address:** Buy/Sell Mechanic phase -- Act 2 difficulty tuning must be a separate design task, not copied from Act 1.

---

### Pitfall 9: Card Rendering Performance Degrades With Complex Draw Calls

**What goes wrong:**
The current watch rendering uses simple Canvas primitives: `arc()`, `fillRect()`, `fillText()`, `stroke()`. Each watch is ~15-20 draw calls. Replacing with a Vinted card adds: rounded rectangle background, inner image area, brand text, price text, condition badge, border, possibly a shadow. Each card becomes 25-35 draw calls. With 4-6 cards on screen plus 2-4 split halves, that is 200+ draw calls per frame. On low-end Android phones, frame rate drops below 30fps.

**Why it happens:**
Canvas 2D rendering is CPU-bound. Each `fillRect()`, `fillText()`, `stroke()`, and especially `clip()` is a separate GPU command. `fillText()` with font changes is particularly expensive because the browser must re-parse the font string. The current watches already do 3 `fillText()` calls each (brand, hour markers are rects). Adding card-style layout doubles or triples this.

**Consequences:**
- Frame rate drops from 60fps to 30-40fps on mid-range phones
- Stuttering especially visible during high-density moments (late game, many cards)
- Split-half animation becomes choppy (each half re-renders the full card)

**Prevention:**
1. Render each card to an offscreen canvas ONCE when spawned, then use `ctx.drawImage(offscreenCanvas, x, y)` each frame. This collapses 25+ draw calls into 1 `drawImage()` call. This is the standard pattern for Canvas 2D performance.
2. For split halves, draw from the same offscreen canvas with source-rect clipping in `drawImage(canvas, sx, sy, sw, sh, dx, dy, dw, dh)` -- zero `clip()` calls needed.
3. Minimize font changes per frame. Set the font once, draw all text of that font, then change.
4. Avoid `ctx.shadow` and `ctx.filter` entirely. Pre-bake shadows into the card design.
5. Profile on a real mid-range Android phone (not desktop Chrome). Desktop is 10x faster.

**Detection:**
- FPS counter drops below 50 with 4+ cards on screen
- Visible stutter during slash animations
- Game feels sluggish compared to v1.0

**Phase to address:** Card Visual Redesign phase -- offscreen canvas caching should be the rendering strategy from the start, not a performance optimization applied later.

**Sources:** [MDN Optimizing Canvas](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Optimizing_canvas), [web.dev Canvas Performance](https://web.dev/canvas-performance/)

---

### Pitfall 10: Overlapping Sound Effects Create Auditory Chaos

**What goes wrong:**
During fast slashing (combo mode), the player slashes 3-4 watches within 500ms. Each slash triggers a sound effect. If the sounds overlap without management, the result is a cacophonous mess of layered identical sounds at higher combined volume. On mobile speakers, this clips and distorts.

**Why it happens:**
Web Audio API's `AudioBufferSourceNode` is fire-and-forget -- each `start()` call creates independent playback. There is no built-in limit on concurrent instances. Rapid slashing creates 3-4 simultaneous instances of the same slash sound, which constructively interfere (louder) and sound distorted.

**Consequences:**
- Audio clips and distorts during fast combos
- Sound becomes annoying instead of satisfying
- Players mute their phones, defeating the purpose of adding sound

**Prevention:**
1. Limit concurrent instances per sound type. For slash sounds, allow max 2-3 simultaneous playbacks.
2. Implement a simple sound pool: track active source nodes per sound type, stop the oldest if limit exceeded.
3. Use short sounds (under 300ms for slash, under 500ms for coin). Short sounds naturally overlap less.
4. Use a GainNode per sound type to control volume. Reduce volume when multiple instances play simultaneously.
5. Consider slightly varying pitch on each play (`source.playbackRate.value = 0.9 + Math.random() * 0.2`) to avoid constructive interference and make combos sound richer.

**Detection:**
- Audio distorts during fast combos
- Sounds are louder during combos than during single slashes (volume stacking)
- Testing with headphones reveals overlapping identical waveforms

**Phase to address:** Sound Effects phase -- sound pool pattern should be implemented alongside the basic playback system.

---

## Minor Pitfalls

Mistakes that cause annoyance but are fixable without rework.

---

### Pitfall 11: Card Dimensions Break Spawn Arc Tuning

**What goes wrong:**
Watches are currently ~60px diameter circles. Vinted cards are rectangular, perhaps ~80x110px (portrait). The larger visual footprint means cards overlap each other more during high-density moments. Cards also look too large at screen edges and too small at the arc apex. The spawn velocity and arc tuning that worked for 60px circles produces wrong visual density for larger rectangles.

**Prevention:**
1. After finalizing card dimensions, re-tune spawn parameters: spacing between spawns, max concurrent entities, and velocity.
2. Consider slightly reducing card size compared to initial design if cards look cramped with current spawn density.
3. Test with late-game difficulty (0.3s spawn interval, 1.8x speed) to see if cards pile up.

**Phase to address:** Card Visual Redesign phase -- after card dimensions are finalized, before declaring the phase done.

---

### Pitfall 12: Audio Files Bloat Mobile Load Time

**What goes wrong:**
Adding 5-8 sound effect files (slash, coin, penalty, golden, combo, transition, act-end, game-over) can add 200KB-1MB to the initial load if files are uncompressed WAV or high-bitrate MP3. On mobile 4G, this adds 1-3 seconds to first load.

**Prevention:**
1. Use MP3 or OGG format at 96-128kbps for sound effects. Most SFX are under 1 second and compress to 5-15KB each.
2. Total audio payload should stay under 100KB for all SFX combined.
3. Load audio files in parallel with or after the start screen renders, not blocking the initial display.
4. Consider using a single audio sprite (one file with all sounds concatenated) to reduce HTTP requests.

**Phase to address:** Sound Effects phase -- file format and size should be decided before creating/sourcing sound files.

---

### Pitfall 13: Transition Screen Blocks Gameplay Flow

**What goes wrong:**
The transition between Act 1 and Act 2 shows an inventory summary. If it requires a button tap to proceed, impatient players tap immediately without reading. If it auto-advances on a timer, slow readers miss the information. Either way, the transition disrupts the arcade flow.

**Prevention:**
1. Auto-advance after 3-4 seconds with a visible countdown, but also allow tap-to-skip.
2. Keep the transition screen information minimal: "X montres achetees -- A toi de vendre!" with the inventory count. Don't show individual items (too much to read in 3 seconds).
3. Use a brief animated transition (fade, slide) rather than an abrupt screen swap. Abrupt changes feel like bugs.
4. Never exceed 5 seconds for the transition. The game should feel continuous.

**Phase to address:** Buy/Sell Mechanic phase -- transition screen design.

---

### Pitfall 14: resetGame() Does Not Reset New State Variables

**What goes wrong:**
The current `resetGame()` function (lines 1281-1297) resets score, elapsed, combo, watches, particles, etc. When adding inventory, currentAct, act2-specific state, and audio state, developers forget to reset them in `resetGame()`. The replay from game-over starts Act 1 with Act 2's state still active, inventory from the previous game, or audio in a weird state.

**Prevention:**
1. When adding ANY new state variable, IMMEDIATELY add its reset to `resetGame()`.
2. Audit: after implementing all new features, read `resetGame()` line by line and verify every mutable global is reset.
3. Test: complete a full game (Act 1 -> Transition -> Act 2 -> Game Over), then tap Replay. Verify the game starts fresh from Act 1 with empty inventory and reset score.

**Detection:**
- Second playthrough starts with inventory from first playthrough
- Act indicator shows "Act 2" at the start of a new game
- Score from previous game carries over

**Phase to address:** Buy/Sell Mechanic phase -- every time a new state variable is added.

---

## Integration Pitfalls

Mistakes specific to adding features to the existing working v1.0 codebase.

---

### Pitfall 15: Refactoring Watch Drawing Breaks Existing Split Animation

**What goes wrong:**
Replacing the three watch drawing functions (`drawRoundWatch`, `drawSquareWatch`, `drawSportWatch`) with a single card renderer seems straightforward. But the `renderHalf()` function (line 539-588) calls these exact functions through a switch on `tempWatch.style`. If the card renderer has a different API (different parameters, different coordinate expectations), `renderHalf()` silently renders nothing or renders incorrectly. The existing satisfying split animation breaks.

**Why it happens:**
The split-half system creates a `tempWatch` at origin (line 557-566) and calls the watch drawing functions. It relies on those functions drawing centered at (0,0) with a known size parameter. If the new card renderer expects `(x, y, width, height)` instead of `(ctx, r, caseColor, brand, size)`, the split-half code passes wrong arguments. No runtime error -- just wrong visuals.

**Prevention:**
1. Keep the same function signature for the card renderer that the split-half system expects: draws centered at (0,0) with a known size.
2. Alternatively, update `renderHalf()` and `createSplitHalves()` at the SAME TIME as the card renderer. Never commit one without the other.
3. Test the split animation IMMEDIATELY after changing the renderer, not at the end of the card redesign.
4. The offscreen canvas approach (Pitfall 9) naturally solves this: `renderHalf()` uses `drawImage()` with source-rect clipping instead of calling the renderer directly.

**Detection:**
- Slashing a card produces blank or broken split halves
- Split halves show the old watch design while intact cards show the new card design
- Split halves are mispositioned or wrong size

**Phase to address:** Card Visual Redesign phase -- split animation and card renderer must be updated together as one atomic change.

---

### Pitfall 16: Adding Act 2 Input Handling Conflicts with Existing Swipe Logic

**What goes wrong:**
Act 2 (selling) likely has different input semantics than Act 1 (buying). In Act 1, you swipe to slash. In Act 2, you might swipe to accept/reject offers, or tap to select which watch to sell, or swipe through a different type of entity. If Act 2 input is layered onto the existing input handler without proper state gating, swipe detection from Act 1 fires during Act 2, causing unintended slashes or double-triggers.

**Why it happens:**
The current input handler (lines 146-192) uses `isPointerDown` and `trailPoints` which are global. If Act 2 reuses the same trail system for different purposes, or if the collision detection still runs during Act 2 checking against the wrong entity type, inputs cross-contaminate between acts.

**Prevention:**
1. Gate input handling on the current act. The simplest approach: keep the same swipe mechanic in both acts (consistency). Only change what gets slashed and the scoring logic.
2. If Act 2 uses different input, the input handler should check `currentAct` and route to different handling functions.
3. Clear `trailPoints` and `isPointerDown` during act transition (already done in `resetGame()` pattern).
4. Do NOT add new event listeners for Act 2. Reuse the existing ones with act-conditional logic.

**Detection:**
- Swiping in Act 2 triggers Act 1 scoring
- Trail rendering looks wrong in Act 2
- Tap-based Act 2 input conflicts with swipe detection

**Phase to address:** Buy/Sell Mechanic phase -- decide Act 2 input model before implementing it.

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Severity | Mitigation |
|-------------|---------------|----------|------------|
| Card Visual Redesign | Split animation breaks (P1, P15) | CRITICAL | Redesign split alongside card renderer; use offscreen canvas |
| Card Visual Redesign | Text readability at small sizes (P6) | MODERATE | Min 14px font, test with real player |
| Card Visual Redesign | Performance regression from complex cards (P9) | MODERATE | Offscreen canvas caching from day one |
| Card Visual Redesign | Hit detection shape mismatch (P4) | CRITICAL | Keep circle hitbox, tune radius to card width |
| Card Visual Redesign | Spawn arc tuning invalidated (P11) | MINOR | Re-tune after card dimensions finalized |
| Buy/Sell Mechanic | State machine impossible states (P3) | CRITICAL | Audit all gameState checks; use isPlaying() helper |
| Buy/Sell Mechanic | Inventory corruption (P5) | CRITICAL | Clone data into inventory; never share references |
| Buy/Sell Mechanic | Act 2 pacing identical to Act 1 (P8) | MODERATE | Independent difficulty curve for Act 2 |
| Buy/Sell Mechanic | resetGame() incomplete (P14) | MINOR | Audit after every new variable |
| Buy/Sell Mechanic | Transition screen flow (P13) | MINOR | 3-4s auto-advance with tap-to-skip |
| Buy/Sell Mechanic | Input conflict between acts (P16) | MODERATE | Same swipe mechanic, different scoring |
| Sound Effects | AudioContext suspended (P2) | CRITICAL | Unlock on "Jouer" tap; test on real phone |
| Sound Effects | First-play decode lag (P7) | MODERATE | Pre-decode all buffers during start screen |
| Sound Effects | Overlapping sounds distort (P10) | MODERATE | Sound pool with max 2-3 concurrent per type |
| Sound Effects | Audio file size bloat (P12) | MINOR | MP3 96kbps, total under 100KB |

## Recovery Strategies

When pitfalls occur despite prevention.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Split animation broken (P1) | MEDIUM | Implement offscreen canvas approach -- replaces clip-based splitting entirely. 1-2 hours. |
| AudioContext silent (P2) | LOW | Add `audioCtx.resume()` to tap handler. 10-minute fix once diagnosed. |
| State machine bugs (P3) | HIGH | Must audit every gameState check and test every transition. 2-4 hours if bugs have accumulated. |
| Hit detection wrong shape (P4) | LOW | Adjust hitbox radius. 10-minute parameter tweak. |
| Inventory corruption (P5) | MEDIUM | Rewrite inventory to use cloned objects. 30-60 minutes plus testing. |
| Text unreadable (P6) | LOW | Increase font size and card size. 15-minute tweak plus playtest. |
| Decode lag (P7) | LOW | Add pre-decode step. 20-minute fix. |
| Wrong pacing (P8) | MEDIUM | Create new difficulty function. 1-2 hours of tuning. |
| Performance regression (P9) | HIGH | Retrofit offscreen canvas caching. 2-3 hours to restructure rendering. |
| Sound distortion (P10) | LOW | Add sound pool limiter. 30-minute fix. |
| Spawn tuning (P11) | LOW | Adjust constants. 15-minute tweak. |
| Load time (P12) | LOW | Compress audio files. 15-minute fix. |
| Transition flow (P13) | LOW | Adjust timer and add skip. 15-minute fix. |
| Reset incomplete (P14) | LOW | Add missing resets. 10-minute fix once found. |
| Split/renderer mismatch (P15) | MEDIUM | Update both in lockstep. 1 hour. |
| Input conflict (P16) | MEDIUM | Add act-based gating. 30-60 minutes. |

## "Looks Done But Isn't" Checklist for v1.1

- [ ] **Card readability:** Cards render beautifully when stationary but brand names are unreadable during flight at full speed
- [ ] **Split animation:** Cards split in half but the halves look like torn UI rather than satisfying slices
- [ ] **Audio on mobile:** Sound effects work on desktop but are completely silent on mobile Chrome (AudioContext suspended)
- [ ] **First sound:** All sounds work except the very first one played in each session (decode lag)
- [ ] **Act transition:** Act 1 ends and Act 2 starts but score/inventory carries incorrectly
- [ ] **Replay after Act 2:** Game over -> Replay starts at Act 2 instead of Act 1
- [ ] **Combo sounds:** Single slashes sound great but fast combos produce distorted audio
- [ ] **Performance:** Cards look gorgeous in isolation but frame rate drops with 4+ on screen simultaneously
- [ ] **Hit detection:** Cards can be slashed but the hitbox feels "off" compared to the old circular watches

## Sources

- [Chrome Web Audio Autoplay Policy](https://developer.chrome.com/blog/web-audio-autoplay) -- AudioContext user gesture requirement
- [MDN Audio for Web Games](https://developer.mozilla.org/en-US/docs/Games/Techniques/Audio_for_Web_Games) -- Mobile audio strategies, audio sprites, buffer pre-loading
- [MDN Web Audio API Best Practices](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices) -- Buffer management, source node lifecycle
- [MDN Optimizing Canvas](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Optimizing_canvas) -- Offscreen canvas, draw call reduction
- [web.dev Canvas Performance](https://web.dev/canvas-performance/) -- Pre-rendering to offscreen canvas
- [MDN CanvasRenderingContext2D: clip()](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/clip) -- Clipping behavior and intersection semantics
- [MDN fillText()](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/fillText) -- Text rendering and maxWidth parameter
- [Game Programming Patterns: State](https://gameprogrammingpatterns.com/state.html) -- State machine patterns for game flow
- Codebase analysis: `/Users/jimmydore/Projets/thomas_birthday/game.js` (1381 lines, line references throughout)

---
*Pitfalls research for: Watch Ninja v1.1 (Vinted cards, buy/sell mechanic, sound effects)*
*Researched: 2026-02-08*
