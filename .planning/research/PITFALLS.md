# Pitfalls Research

**Domain:** Mobile browser arcade game (Fruit Ninja-style, HTML5 Canvas, touch input)
**Researched:** 2026-02-07
**Confidence:** HIGH (well-documented domain with extensive community knowledge; based on training data -- web search unavailable for live verification)

## Critical Pitfalls

### Pitfall 1: Touch Events Trigger Scroll, Zoom, and Browser Chrome

**What goes wrong:**
On mobile Chrome, touch events are intercepted by the browser for scrolling, pinch-to-zoom, pull-to-refresh, and swipe-to-navigate. A swipe gesture intended to "slash" a watch instead scrolls the page, triggers back-navigation, or causes the page to bounce. The game feels broken on first touch.

**Why it happens:**
Mobile browsers use touch events for native gestures. Without explicit prevention, the browser handles touches before your game code does. Developers test in desktop DevTools where these gestures don't exist, so the problem only surfaces on a real device.

**How to avoid:**
1. Call `event.preventDefault()` on `touchstart`, `touchmove`, and `touchend` events on the canvas element.
2. Set `touch-action: none` on the canvas element via CSS -- this tells the browser not to handle any touch gestures on that element.
3. Use `overflow: hidden` on `html` and `body` to prevent scroll bounce.
4. Add `<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">` to prevent pinch-to-zoom.
5. Make the canvas fill the full viewport so there's nothing to scroll to.

**Warning signs:**
- Game works perfectly in Chrome DevTools mobile simulation but behaves erratically on real phone
- Occasional "jumps" or screen movements during swipe
- Pull-to-refresh appearing at top of screen during upward swipes

**Phase to address:**
Phase 1 (Foundation / Canvas Setup) -- this must be solved from the very first touch handler. Retrofitting is trivial but testing without it wastes time.

---

### Pitfall 2: Game Loop Tied to setInterval Instead of requestAnimationFrame

**What goes wrong:**
Using `setInterval` or `setTimeout` for the game loop causes inconsistent frame timing, stuttery animations, and battery drain. The game runs at unpredictable speeds -- too fast on powerful phones, too slow on weaker ones. When the tab loses focus, `setInterval` may still fire (wasting resources) or fire in bursts when focus returns (causing objects to teleport).

**Why it happens:**
`setInterval(fn, 16)` seems like "60fps" but the browser doesn't synchronize it with display refresh. Timers are deprioritized when the tab is background, then fire rapidly on resume. Game logic without delta-time makes speed hardware-dependent.

**How to avoid:**
1. Use `requestAnimationFrame` exclusively for the game loop.
2. Calculate `deltaTime` between frames: `const dt = (timestamp - lastTimestamp) / 1000`.
3. Make ALL movement physics-based: `position += velocity * dt`, not `position += 5`.
4. Cap `deltaTime` to a maximum (e.g., 100ms) to prevent objects teleporting after a tab-resume pause.
5. Pause the game when `document.visibilitychange` fires with `hidden`.

**Warning signs:**
- Watches move faster on newer phones than older ones
- Animations stutter periodically (not smooth 60fps)
- Alt-tabbing away and back causes watches to jump across the screen

**Phase to address:**
Phase 1 (Foundation / Game Loop) -- the game loop is the first thing built. Delta-time must be baked in from the start, not retrofitted.

---

### Pitfall 3: Canvas Not Sized for Device Pixel Ratio (Blurry Rendering)

**What goes wrong:**
The canvas renders blurry text and objects on high-DPI mobile screens (which is nearly all modern phones). Watch images look fuzzy, score text looks bad, slash trails look pixelated. The game looks amateur despite correct logic.

**Why it happens:**
CSS pixels and physical pixels differ on high-DPI screens. A `300x600` CSS-sized canvas on a 3x device actually renders at 300x600 physical pixels stretched over 900x1800 physical pixels. The browser upscales, causing blur.

**How to avoid:**
```javascript
const dpr = window.devicePixelRatio || 1;
canvas.width = canvas.clientWidth * dpr;
canvas.height = canvas.clientHeight * dpr;
ctx.scale(dpr, dpr);
// Continue using CSS pixel coordinates in all draw calls
```
Apply this on initialization AND on resize. All game logic uses CSS coordinates; the scaling is transparent.

**Warning signs:**
- Text on canvas looks blurry compared to DOM text
- Fine details in watch images look soft or smeared
- Game looks fine on desktop but bad on phone

**Phase to address:**
Phase 1 (Foundation / Canvas Setup) -- must be set up when canvas is initialized. Easy fix if caught early, annoying to debug later because everything "works" except it looks bad.

---

### Pitfall 4: Touch Coordinate Mapping Ignores Canvas Offset and Scale

**What goes wrong:**
Touch coordinates from `event.touches[0].clientX/Y` are viewport coordinates, not canvas-local coordinates. If the canvas has any CSS offset, margin, padding, or is not positioned at (0,0), slashes register in the wrong position. Watches appear to dodge the player's finger.

**Why it happens:**
Developers use `clientX/Y` directly as canvas coordinates. This works when the canvas fills the entire viewport at (0,0), but breaks with any layout offset. Combined with DPR scaling, the mismatch doubles.

**How to avoid:**
```javascript
function getCanvasPosition(touch) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: touch.clientX - rect.left,
    y: touch.clientY - rect.top
  };
}
```
Do NOT multiply by `devicePixelRatio` here if you already called `ctx.scale(dpr, dpr)` -- that handled the coordinate space. Only apply DPR if you skipped the `ctx.scale` approach.

**Warning signs:**
- Slashes appear offset from where the finger actually touched
- Hit detection misses watches that the finger clearly crossed
- Problem gets worse near screen edges

**Phase to address:**
Phase 1 (Foundation / Touch Input) -- coordinate mapping is foundational. Every touch interaction depends on it.

---

### Pitfall 5: No Swipe Trail -- Game Feels Unresponsive

**What goes wrong:**
The player swipes across the screen but sees no visual feedback. Without a visible slash trail, there's no confirmation that the input was registered. The game feels laggy even if hit detection works perfectly. Users will instinctively swipe harder and faster, making the experience worse.

**Why it happens:**
Developers focus on game logic (did the swipe hit a watch?) before visual feedback (show the swipe path). The Fruit Ninja "feel" is 50% visual feedback. Without it, technically correct hit detection still feels broken.

**How to avoid:**
1. Store recent touch points from `touchmove` events (last 8-12 points).
2. Draw a fading trail connecting these points each frame.
3. Use `ctx.lineWidth` decreasing and `ctx.globalAlpha` fading for the "blade" effect.
4. Clear old points by time, not by count, to handle varying swipe speeds.
5. Implement this BEFORE hit detection -- visual feedback is more important for perceived responsiveness.

**Warning signs:**
- Testers say the game "feels laggy" despite good frame rate
- Users swipe multiple times on the same watch
- Confusion about whether touch input is working

**Phase to address:**
Phase 2 (Core Gameplay / Slash Mechanic) -- immediately after basic touch input works, before watch hit detection.

---

### Pitfall 6: Hit Detection Uses Bounding Box Instead of Swipe Path Intersection

**What goes wrong:**
Hit detection checks if a touch point falls inside a watch's bounding rectangle. This means the player must tap ON the watch, not swipe THROUGH it. Slow, deliberate swipes work but fast slashes miss because no single `touchmove` sample landed inside the watch hitbox. The game punishes the natural Fruit Ninja fast-slash gesture.

**Why it happens:**
Point-in-rectangle is the simplest collision check. Developers test with slow deliberate touches, which work. Fast swipes produce touch samples every 10-30ms, meaning the finger may "jump" 50+ pixels between samples, skipping over a watch entirely.

**How to avoid:**
1. Store consecutive touch points and check LINE SEGMENT to CIRCLE/RECTANGLE intersection, not point-in-rect.
2. Between consecutive `touchmove` events at `(x1,y1)` and `(x2,y2)`, check if the line segment intersects the watch hitbox.
3. Use a generous hitbox (circle slightly larger than the watch visual).
4. Algorithm: find the closest point on the line segment to the circle center. If that distance is less than the radius, it's a hit.

**Warning signs:**
- Fast swipes miss watches that slow taps can hit
- Players resort to "poking" watches instead of slashing
- Hit rate feels too low despite accurate-looking swipes

**Phase to address:**
Phase 2 (Core Gameplay / Hit Detection) -- must be built this way from the start. Point-in-rect hit detection should never be implemented, not even as a placeholder, because it teaches wrong testing habits.

---

### Pitfall 7: Spawning Objects Without Considering Mobile Viewport Proportions

**What goes wrong:**
Watches spawn and fly in patterns designed for landscape or desktop aspect ratios. On a tall, narrow mobile phone (typical 9:19.5 ratio), watches either cluster in a narrow band, fly off-screen before the player can react, or spawn in unreachable corners. The game feels unfair or boring.

**Why it happens:**
Developers design spawn patterns on a desktop browser window (roughly 16:9 landscape), then test on phone (roughly 9:19.5 portrait). X-axis is now very narrow; Y-axis is very tall. Horizontal throws that worked on desktop leave the tiny mobile X-range too quickly.

**How to avoid:**
1. Design spawn logic for PORTRAIT mobile from the start (tall and narrow).
2. Watches should primarily arc upward from the bottom (like Fruit Ninja), not fly horizontally.
3. Define spawn zones as percentages of viewport, not absolute pixels.
4. Tune velocity and arc so watches spend 1.5-2.5 seconds in the playable area.
5. Test on a real phone (or a correctly proportioned Chrome DevTools device) from day one.

**Warning signs:**
- Watches frequently fly off-screen too fast to slash
- Some watches are unreachable (spawn in a corner and exit before player can swipe there)
- Dead zones on screen where watches never appear

**Phase to address:**
Phase 2 (Core Gameplay / Watch Spawning) -- spawn logic must be designed for mobile proportions from the start. Retrofitting spawn patterns is a full rewrite of the spawn system.

---

### Pitfall 8: Memory Leaks from Unbounded Object Arrays

**What goes wrong:**
Watch objects, particle effects, and slash trail points accumulate in arrays without cleanup. After 2-3 minutes of gameplay, the arrays contain thousands of dead objects. Garbage collection pauses cause periodic frame drops (stutters every 5-10 seconds). On low-end phones, the game eventually crashes.

**Why it happens:**
Objects are added to arrays when spawned but only flagged as "inactive" when slashed or off-screen, never removed. Or they're removed with `splice()` in a loop, which is O(n) per removal. Developers test for 30 seconds, not 3 minutes, so they never see the degradation.

**How to avoid:**
1. Use object pooling: pre-allocate a fixed array of watch objects and recycle them.
2. For a simple game, 20-30 watch objects in a pool is more than enough.
3. Slash particles: use a ring buffer (fixed-size array with wrapping index).
4. Trail points: hard-cap at 100 points, remove oldest when adding new.
5. NEVER use `array.push()` without a corresponding cleanup strategy.

**Warning signs:**
- Frame rate degrades after 1-2 minutes of play
- Periodic micro-stutters (GC pauses)
- Browser dev tools show increasing memory usage over time

**Phase to address:**
Phase 2 (Core Gameplay) -- object pooling should be the pattern from the first spawned watch. Simple to implement upfront, painful to retrofit.

---

### Pitfall 9: 300ms Touch Delay on Older Mobile Browsers

**What goes wrong:**
Some mobile browsers add a 300ms delay to touch events to distinguish taps from double-taps. The game feels sluggish -- there's a visible delay between touching the screen and the slash appearing.

**Why it happens:**
Historically, mobile browsers needed to wait 300ms after a tap to see if a second tap followed (double-tap to zoom). Modern Chrome has largely eliminated this when `<meta name="viewport">` is set properly, but the delay can still occur if the viewport meta tag is missing or if `touch-action` CSS is not set.

**How to avoid:**
1. Include proper viewport meta tag: `<meta name="viewport" content="width=device-width">` (this alone eliminates the delay in modern Chrome).
2. Set `touch-action: none` on the canvas (belt-and-suspenders).
3. Listen for `touchstart`/`touchmove`/`touchend`, NOT `click`/`mousedown` events.
4. Since the project targets Mobile Chrome only, this is largely solved by the viewport tag, but verify on a real device.

**Warning signs:**
- Noticeable delay between finger touching screen and visual response
- Game feels "behind" the finger
- Tapping feels sluggish but long-presses work normally

**Phase to address:**
Phase 1 (Foundation / HTML Setup) -- viewport meta tag is in the HTML boilerplate. Nearly zero effort but critical to not forget.

---

### Pitfall 10: Canvas Clearing Strategy Causes Flicker or Ghost Trails

**What goes wrong:**
Either the canvas is not cleared each frame (causing ghost trails of old watch positions), or it's cleared incorrectly causing visible flicker. Sometimes developers clear the canvas, draw, and the clear happens slightly before the display refresh, causing a flash of blank screen.

**Why it happens:**
Missing `ctx.clearRect(0, 0, width, height)` at the start of each frame. Or clearing with a translucent fill (for trail effects) that accumulates opacity. Or drawing in the wrong order (clear, draw background, draw objects is correct; draw objects, clear is wrong).

**How to avoid:**
1. Every frame begins with `ctx.clearRect(0, 0, canvas.width, canvas.height)` (using actual canvas dimensions, not CSS dimensions).
2. If using DPR scaling, remember `canvas.width` is already scaled, so `clearRect` needs the scaled values OR use `ctx.clearRect(0, 0, cssWidth, cssHeight)` if you used `ctx.scale()`.
3. Draw order: clear -> background -> objects (back to front) -> UI (score, etc.) -> slash trail (on top).
4. Never use `canvas.width = canvas.width` as a clear trick -- it resets ALL canvas state including transforms.

**Warning signs:**
- Watch afterimages visible on screen
- Visible flicker/flash between frames
- Random visual corruption

**Phase to address:**
Phase 1 (Foundation / Game Loop Rendering) -- render pipeline order is established in the very first frame draw.

---

### Pitfall 11: Image Loading Race Condition on Game Start

**What goes wrong:**
Watch images are loaded with `new Image()` and drawn immediately. On slow connections (mobile 4G), images haven't loaded when the first frame draws, so watches appear as blank rectangles or the game crashes with "image not loaded" errors. Or worse, some watches load and others don't, creating an inconsistent experience.

**Why it happens:**
`new Image(); img.src = 'watch.png'` is asynchronous. The `onload` callback fires later. Developers on fast connections (localhost) never see the delay. On a phone loading from a VPS, images can take 200ms-2s to load.

**How to avoid:**
1. Create a preloader that loads ALL images before starting the game.
2. Simple pattern:
```javascript
function loadImages(sources) {
  return Promise.all(sources.map(src => new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  })));
}
// Wait for all images, THEN start game loop
loadImages(['watch1.png', 'watch2.png']).then(startGame);
```
3. Show a simple loading screen (even just "Chargement...") while images load.
4. Keep total asset size small (under 500KB) for fast mobile loading.

**Warning signs:**
- Watches occasionally render as blank/broken on first play
- Game works on reload but not on first visit
- Inconsistent behavior on different network speeds

**Phase to address:**
Phase 1 (Foundation / Asset Loading) -- preloader must exist before any images are drawn. A 3-line loading screen prevents a category of bugs.

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Hardcoded canvas dimensions (e.g., 375x812) | Quick setup, no resize logic | Breaks on any other screen size, orientation change | Never -- percentage-based sizing from the start |
| Inline styles instead of CSS classes | Faster to write | Hard to adjust for different screens, no media queries | Never for layout; acceptable for dynamic canvas-drawn elements |
| All game state in global variables | No module system needed | Impossible to add features like restart, pause, game-over screen | Acceptable for MVP if variables are grouped in a single `gameState` object |
| Drawing text with Canvas `fillText` for UI | No DOM/CSS needed | Poor readability, no line wrapping, manual positioning | Acceptable for in-game score; use DOM overlay for menus, messages, game-over |
| Skipping the preloader | One less thing to build | Broken first-load on slow connections | Never -- even a 5-line preloader prevents this |
| Using PNG for every watch variant | Simple to create | Large download size if many variants | Acceptable if total assets stay under 500KB; consider sprite sheet if more |

## Integration Gotchas

Common mistakes when connecting to external services.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| VPS hosting (nginx) | Not setting correct MIME types for `.js` and `.json` files | Ensure nginx config has `types { application/javascript js; application/json json; }` or use `include mime.types` |
| Docker | Multi-stage build copies node_modules to production image | For a static site, the Docker image only needs nginx + static files. No Node.js in production. |
| GitHub Actions | Building on push but not caching layers | For a static site, builds are fast enough that caching is unnecessary. Keep the pipeline simple. |
| SSL (Let's Encrypt) | Certificate renewal not automated | Use certbot with auto-renewal cron, or a Docker setup with automatic HTTPS (e.g., caddy) |
| Custom domain | DNS not propagated before testing HTTPS | Set up DNS record first, wait for propagation, then configure SSL |

## Performance Traps

Patterns that work at small scale but fail as usage grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Creating new objects every frame (`new Image()`, `new Path2D()`) | GC pauses, micro-stutters every few seconds | Create objects once, reuse. Pre-allocate in setup. | After 30-60 seconds of play |
| Drawing text with `ctx.fillText` every frame with font changes | Slow font parsing, inconsistent rendering | Cache text as images or minimize font changes per frame | With 10+ text draws per frame |
| Unoptimized image sizes (2000x2000px watch PNGs) | Slow loading, excessive GPU memory, compositing lag | Resize images to actual display size (max 200x200px for a watch) | Immediately on low-end phones |
| Complex `ctx.shadow` or `ctx.filter` on every draw call | Drastic frame rate drop, especially on Android | Avoid real-time shadows/filters; pre-bake effects into images or use simple opacity tricks | Immediately with 5+ objects |
| Full-canvas redraw when only a small area changed | Unnecessary GPU work | For a simple game with moving objects, full redraw is actually fine (dirty-rect tracking adds complexity for little gain in this case) | Not a real issue for this project -- full clear + redraw is the right pattern here |

## Security Mistakes

Domain-specific security issues beyond general web security.

| Mistake | Risk | Prevention |
|---------|------|------------|
| Score stored in client-side JavaScript variable | Trivially cheat-able via console | For a joke birthday game, this is totally fine. No server-side validation needed. If Thomas cheats his own birthday game, that's on him. |
| Sensitive assets (e.g., real Montignac watch photos with IP concerns) | Copyright issues if using official product photos | Use simple drawn/stylized watch graphics or clearly fair-use illustrations |
| Hosting on a subdomain with cookies from the parent domain | Cookie leakage across subdomains | Use a dedicated subdomain with no shared auth; for a static game, no cookies needed at all |

Note: Security is minimal concern for a static, single-player joke game with no backend, no auth, and no real money involved.

## UX Pitfalls

Common user experience mistakes in this domain.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| No visual/haptic feedback on successful slash | Slash feels weightless, unsatisfying | Add: (1) watch splits in two halves, (2) score popup "+5 EUR" flies up, (3) brief particle burst |
| Score text too small or positioned where thumb covers it | Player can't see their score while playing | Place score at top-center of screen, large font, with subtle background for readability |
| No distinction between real and fake watches until too late | Player can't make strategic decisions, feels random | Real watches should look visibly different (color, style, label placement). Not a "trick" game -- player should be able to learn the difference |
| Game starts immediately on page load | Player is confused, misses the first watches | Show a simple start screen with instructions: "Glisse pour trancher les montres!" and a "Jouer" button |
| No game-over state or replay option | After time runs out, nothing happens | Clear game-over screen: final profit in euros, personal message for Thomas, "Rejouer" button |
| Too many watches on screen at once | Overwhelming, can't distinguish real from fake | Start with 1-2 watches, gradually increase. Peak at 3-4 simultaneous watches. |
| Watches too small to read the brand name | Can't distinguish Montignac from Montignak | Make watches large enough that the brand text is readable at a glance (at least 80x80px tap target) |
| No pause when screen is touched accidentally (pocket, notification pull) | Game continues while player isn't looking | Pause on `visibilitychange` event. Optional: pause on touch outside game area. |

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **Touch handling:** Works in DevTools but not tested on real phone -- verify on actual mobile Chrome
- [ ] **Canvas sizing:** Looks fine on one phone but not verified across screen sizes -- test on at least 2 different phones (or DevTools device presets)
- [ ] **Game start:** Game starts but no loading screen for assets -- verify on slow 3G throttle in DevTools
- [ ] **Hit detection:** Works with slow taps but not tested with fast swipes -- test by swiping quickly through watches
- [ ] **Score display:** Shows numbers but doesn't show euro sign or "profit" framing -- verify the scoring presentation matches the joke concept
- [ ] **Brand names:** Watches appear but brand names aren't readable at game speed -- verify text is legible while watches are in motion
- [ ] **Game end:** Timer ends but no game-over screen, restart, or birthday message -- this IS the punchline, don't skip it
- [ ] **Orientation:** Works in portrait but breaks if phone rotates to landscape -- lock to portrait or handle both
- [ ] **URL sharing:** Game works when you type the URL but the link preview (og:tags) is missing or generic -- add og:title, og:description, og:image for a nice share preview
- [ ] **First-load experience:** Works after caching but first load on cellular is slow or broken -- test with cache disabled

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Touch scroll/zoom not prevented | LOW | Add `touch-action: none` CSS + `preventDefault()` calls. 5-minute fix. |
| setInterval game loop | MEDIUM | Replace with rAF loop + delta time. Requires updating all movement code to use dt. 1-2 hours. |
| Blurry canvas (no DPR handling) | LOW | Add DPR scaling code. 10-minute fix, but test all coordinates after. |
| Wrong touch coordinates | LOW | Add `getBoundingClientRect()` offset correction. 10-minute fix. |
| Point-based hit detection (misses fast swipes) | MEDIUM | Rewrite to line-segment intersection. 1-2 hours, but conceptually different approach. |
| Desktop-proportioned spawn patterns | HIGH | Redesign spawn zones, velocities, and arcs for portrait. May require extensive retuning. 2-4 hours. |
| Memory leaks from unbounded arrays | MEDIUM | Implement object pooling and ring buffers. 1-2 hours to retrofit if game logic is clean. |
| Missing image preloader | LOW | Wrap image loads in Promise.all, add loading screen. 30-minute fix. |
| No game-over screen | LOW | Add DOM overlay with final score and restart button. 30-60 minutes. |

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Touch scroll/zoom interference | Phase 1: Foundation (HTML + CSS setup) | Swipe on real phone -- page must not scroll, zoom, or bounce |
| setInterval game loop | Phase 1: Foundation (game loop) | Log delta-time values; they should be ~16ms, not erratic |
| Blurry canvas rendering | Phase 1: Foundation (canvas init) | Compare canvas text sharpness to DOM text on a real phone |
| Touch coordinate mapping | Phase 1: Foundation (input handling) | Tap canvas corners -- drawn dot should appear exactly under finger |
| 300ms touch delay | Phase 1: Foundation (HTML meta tags) | Touch response should feel instant, no perceptible delay |
| Canvas clearing / render order | Phase 1: Foundation (render loop) | No ghost trails, no flicker, objects render back-to-front |
| Image loading race condition | Phase 1: Foundation (asset pipeline) | Throttle to Slow 3G in DevTools, reload -- game should show loading then start clean |
| No swipe trail | Phase 2: Core Gameplay (slash mechanic) | Swipe across screen -- visible fading trail follows finger |
| Swipe-through hit detection | Phase 2: Core Gameplay (hit detection) | Fast-swipe through a watch -- should register as hit |
| Mobile viewport spawn proportions | Phase 2: Core Gameplay (watch spawning) | All watches reachable and on-screen long enough to react on a real phone |
| Memory leaks / GC pauses | Phase 2: Core Gameplay (object management) | Play for 3+ minutes -- frame rate must remain stable |
| UX feedback (slash effects, score popups) | Phase 3: Polish (juice and feel) | Each slash feels satisfying with visual confirmation |
| Game-over screen and birthday message | Phase 3: Polish (game flow) | Timer ends, birthday message appears, replay works |
| Orientation handling | Phase 3: Polish (edge cases) | Rotate phone -- game adapts or stays locked to portrait |
| OG meta tags for URL sharing | Phase 3: Polish (deployment) | Share URL on WhatsApp/iMessage -- preview shows game title and description |

## Sources

- Training data from HTML5 game development community (MDN Canvas docs, HTML5 game development tutorials, mobile browser compatibility documentation)
- Known patterns from Fruit Ninja HTML5 clones and touch-based Canvas games
- Mobile Chrome touch event handling documentation patterns
- Canvas performance optimization best practices

**Note:** Web search was unavailable during this research session. All findings are based on training data (cutoff: May 2025). The pitfalls documented here are well-established, widely documented patterns in the HTML5 Canvas game development community. Confidence is HIGH because these are fundamental browser behaviors and Canvas API characteristics that are unlikely to have changed. However, verify specific Chrome behavior on the target device.

---
*Pitfalls research for: Watch Ninja (mobile browser arcade game)*
*Researched: 2026-02-07*
