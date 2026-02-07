# Technology Stack

**Project:** Watch Ninja (Fruit Ninja-style mobile browser game)
**Researched:** 2026-02-07
**Overall confidence:** MEDIUM-HIGH (training data only -- web search/npm registry unavailable for version verification)

---

## Recommendation: Vanilla JS + HTML5 Canvas 2D. No libraries.

For a joke birthday game that needs to ship in under a week, every dependency is a liability. HTML5 Canvas 2D provides everything this game needs natively. Adding a game framework would increase complexity, bundle size, and debugging surface -- all for features this game will never use.

---

## Recommended Stack

### Rendering: HTML5 Canvas 2D API

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| HTML5 Canvas 2D Context | Native (all browsers) | Render watches, slashes, particles, score | Zero dependencies. Universally supported on mobile Chrome. Perfect for simple 2D sprite rendering with `drawImage()`, bezier curves for slash trails, and basic particle effects. No build step. | HIGH |

**Why Canvas 2D and not alternatives:**

| Option | Verdict | Rationale |
|--------|---------|-----------|
| **Canvas 2D** | USE THIS | Native browser API, zero bytes to download, perfect for 2D sprite games, excellent mobile Chrome support, simple `requestAnimationFrame` game loop. Well-documented, stable for 10+ years. |
| **WebGL** | OVERKILL | Adds shader complexity for zero visual benefit in a 2D sprite game. Canvas 2D handles hundreds of sprites at 60fps on modern phones. WebGL only matters for particle-heavy or 3D games. |
| **DOM-based (CSS transforms)** | TOO SLOW | DOM manipulation triggers layout/reflow. Animating 10+ flying watches + slash trails + particles via DOM elements will drop frames. Canvas bypasses the DOM entirely. |
| **SVG** | WRONG TOOL | SVG is for vector graphics and documents, not real-time game loops. No `requestAnimationFrame` integration, awkward hit detection, poor performance with many animated elements. |

### Language: Vanilla JavaScript (ES2020+)

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Vanilla JS (ES2020+) | Native | All game logic, input handling, rendering | No build tools needed. Mobile Chrome supports all modern JS features (optional chaining, nullish coalescing, modules). Ship `.js` files directly. | HIGH |

**Why not TypeScript:** TypeScript needs a build step (tsc or bundler). For a < 1 week joke game with maybe 500 lines of code, type safety adds friction without proportional benefit. Just use JSDoc comments for IDE hints if desired.

### Touch Input: Native Touch Events API + Pointer Events API

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Pointer Events API | Native | Swipe detection, slash drawing | Unified API that handles touch, mouse, and pen. `pointerdown`, `pointermove`, `pointerup`. Works across all modern browsers. Simpler than Touch Events for single-finger swipe tracking. | HIGH |
| `touch-action: none` CSS | Native | Prevent browser scroll/zoom on game canvas | Critical. Without this, swipe gestures trigger page scroll instead of game input. One CSS property prevents all default touch behaviors on the canvas. | HIGH |

**Implementation pattern:**
```javascript
// In CSS: canvas { touch-action: none; }

canvas.addEventListener('pointerdown', (e) => {
  slashPoints = [{ x: e.clientX, y: e.clientY, t: Date.now() }];
});

canvas.addEventListener('pointermove', (e) => {
  if (slashPoints) {
    slashPoints.push({ x: e.clientX, y: e.clientY, t: Date.now() });
    // Draw slash trail, check intersections with watches
  }
});

canvas.addEventListener('pointerup', () => {
  slashPoints = null;
});
```

**Why Pointer Events over Touch Events:** Pointer Events are the modern standard, supported in all browsers since 2019+. They provide a single API for touch, mouse, and stylus. Touch Events still work but are legacy. Pointer Events also make desktop testing easy (mouse works the same as finger).

### Audio: Web Audio API (optional, HTML5 Audio fallback)

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| HTML5 `<audio>` elements | Native | Slash sounds, score sounds, background music | Simplest option. Preload a few `.mp3` files, call `.play()`. Good enough for a birthday game. | HIGH |
| Web Audio API | Native | Low-latency sound effects (optional upgrade) | If `<audio>` has noticeable delay on mobile, Web Audio API provides frame-accurate playback. More code, but zero dependencies. | MEDIUM |

**Recommendation:** Start with HTML5 `<audio>`. Only switch to Web Audio API if sound latency is noticeable during testing. For a joke game, audio is a nice-to-have, not a blocker.

**Mobile audio gotcha:** Mobile browsers require a user gesture before playing audio. Add a "Tap to Start" screen that calls `audioContext.resume()` or plays a silent audio clip to unlock audio playback.

### Hosting: Static files via nginx in Docker

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| nginx | latest (alpine) | Serve static files | The project spec already calls for Docker/nginx. Serve `index.html`, `game.js`, `style.css`, and image assets. No server-side logic needed. | HIGH |
| Docker | latest | Container for nginx | Already specified in project requirements. | HIGH |

### Asset Format

| Asset Type | Format | Why | Confidence |
|------------|--------|-----|------------|
| Watch images | PNG with transparency | Simple, universal, supports alpha channel for watch cutouts. Use ~200x200px sprites to keep file size small. | HIGH |
| Slash trail | Canvas 2D drawing (bezier curves) | Draw programmatically -- no asset needed. Quadratic bezier curves through pointer positions create a smooth slash effect. | HIGH |
| Particle effects | Canvas 2D drawing | Small colored rectangles/circles drawn with `fillRect`/`arc`. No sprite sheets needed for a simple juice effect. | HIGH |
| Background | CSS gradient or single PNG | Keep it simple. A solid color or subtle gradient works fine. | HIGH |
| Sounds (optional) | MP3 | Universal codec support on mobile Chrome. Keep files under 100KB each. | HIGH |

---

## Game Architecture (Vanilla JS)

No framework needed. The game is simple enough for a hand-rolled game loop:

```
index.html          -- Canvas element, viewport meta, load game.js
style.css           -- Full-screen canvas, touch-action: none
game.js             -- All game logic (or split into modules below)
assets/             -- Watch PNGs, optional sound files
```

If splitting `game.js` for clarity (recommended for maintainability even in a small game):

```
js/main.js          -- Game loop, state management, init
js/watch.js         -- Watch class (position, velocity, rotation, type)
js/slash.js         -- Slash trail rendering and collision detection
js/particles.js     -- Particle effects on slash hit
js/score.js         -- Score/money tracking and display
js/input.js         -- Pointer event handling
```

Use ES modules (`<script type="module">`) -- no bundler needed, mobile Chrome supports them natively.

---

## Libraries Considered and Rejected

### Game Frameworks

| Library | Latest Known Version | Verdict | Why Not |
|---------|---------------------|---------|---------|
| **Phaser** | ~3.80+ | REJECT | 1MB+ minified. Massive overkill for a single-screen swipe game. Brings physics engines, tilemap support, scene management -- none of which this game needs. Requires understanding Phaser's lifecycle, config objects, and scene system. More time learning Phaser than writing vanilla code. |
| **PixiJS** | ~8.x | REJECT | Excellent 2D renderer, but overkill. Uses WebGL by default (Canvas fallback). Adds a dependency, a learning curve, and ~500KB for features this game won't use (sprite batching, filters, mesh rendering). Canvas 2D handles 20 sprites at 60fps trivially. |
| **Kaplay** (formerly Kaboom.js) | ~3000.x | MAYBE | Lightweight, fun API, designed for simple games. If you want a library, this would be the one. But it still adds a dependency and API to learn. For a < 1 week timeline, vanilla JS is faster if you know Canvas. |
| **Konva** | ~9.x | REJECT | Canvas library designed for interactive UIs (drag/drop, charts), not games. No game loop, no collision detection. Wrong tool. |
| **Three.js** | ~0.170+ | REJECT | 3D library. This is a 2D game. |
| **p5.js** | ~1.11+ | REJECT | Creative coding library, not a game framework. Would work technically but adds 1MB+ for drawing helpers that Canvas 2D already provides natively. |

**Version note:** Versions listed above are from training data (cutoff: early 2025). They may be slightly outdated. For a game that uses zero external libraries, this is irrelevant.

### Utility Libraries

| Library | Verdict | Why Not |
|---------|---------|---------|
| **Howler.js** (audio) | REJECT | Nice API for cross-browser audio, but HTML5 `<audio>` works fine on mobile Chrome. Only one browser to support. |
| **Hammer.js** (touch gestures) | REJECT | Gesture recognition library -- detects swipe/pinch/rotate. But we need raw pointer positions to draw slash trails and check collision, not high-level gesture events. Hammer.js would abstract away the data we need. |
| **GSAP** (animation) | REJECT | Tweening library for DOM animations. We're drawing directly to Canvas; `requestAnimationFrame` + manual interpolation is simpler and has zero overhead. |

---

## Critical Viewport and Mobile Configuration

This is the most commonly missed piece in mobile Canvas games:

```html
<!-- index.html -->
<meta name="viewport" content="width=device-width, initial-scale=1.0,
  maximum-scale=1.0, user-scalable=no">
```

```css
/* style.css */
* { margin: 0; padding: 0; box-sizing: border-box; }

html, body {
  width: 100%;
  height: 100%;
  overflow: hidden;           /* Prevent scrollbars */
  position: fixed;            /* Prevent iOS bounce scroll */
}

canvas {
  display: block;
  width: 100%;
  height: 100%;
  touch-action: none;         /* CRITICAL: prevents browser swipe/scroll/zoom */
}
```

```javascript
// Canvas sizing (handle device pixel ratio for sharp rendering)
function resizeCanvas() {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  ctx.scale(dpr, dpr);
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();
```

**Why this matters:** Without `touch-action: none`, every swipe scrolls the page. Without DPR handling, sprites look blurry on high-density phone screens. Without `overflow: hidden` + `position: fixed`, the canvas bounces on iOS (and some Android Chrome configurations).

---

## What to Install

```bash
# Nothing. Zero npm install. Zero build tools.

# Project setup:
mkdir -p watch-ninja/assets
touch watch-ninja/index.html
touch watch-ninja/style.css
touch watch-ninja/game.js

# Docker setup:
# Simple Dockerfile with nginx:alpine serving the watch-ninja/ directory
```

### Dockerfile

```dockerfile
FROM nginx:alpine
COPY . /usr/share/nginx/html
EXPOSE 80
```

That's it. `docker build -t watch-ninja . && docker run -p 8080:80 watch-ninja`.

---

## Performance Budget

For a simple arcade game on mobile Chrome:

| Metric | Target | How |
|--------|--------|-----|
| Total asset size | < 2MB | Small PNG sprites (~50KB each), no video, optional small audio files |
| JS bundle size | < 50KB | Vanilla JS, no libraries. Likely under 10KB for this game. |
| Frame rate | 60fps | Canvas 2D handles 50+ sprites trivially. Use `requestAnimationFrame`. |
| Load time | < 1 second | Static files from nginx, no API calls, no dynamic imports |
| Time to interactive | Instant | No framework initialization, no hydration, no VDOM diffing |

---

## Summary Decision Matrix

| Decision | Choice | Confidence |
|----------|--------|------------|
| Rendering | HTML5 Canvas 2D | HIGH |
| Language | Vanilla JS (ES2020+, ES modules) | HIGH |
| Touch input | Pointer Events API | HIGH |
| Game framework | None (vanilla) | HIGH |
| Audio | HTML5 `<audio>`, Web Audio API if needed | HIGH |
| Build tools | None | HIGH |
| Asset format | PNG sprites, Canvas-drawn effects | HIGH |
| Hosting | nginx:alpine in Docker | HIGH |
| CSS framework | None (inline/minimal CSS) | HIGH |

---

## Sources and Confidence Notes

**Confidence rationale:** This recommendation carries HIGH confidence despite being based on training data rather than live verification because:

1. **HTML5 Canvas 2D API** has been stable and unchanged since 2015+. It is a W3C standard. No version to check.
2. **Pointer Events API** has been stable and supported in all major browsers since 2019+. It is a W3C standard.
3. **ES modules in browsers** have been supported in Chrome since 2017 (Chrome 61+).
4. **`touch-action` CSS property** has been supported in all major browsers since 2017+.
5. **None of the recommendations depend on a specific library version** -- the entire stack is built on native browser APIs that do not change.

The only area where version verification would matter is the "Libraries Rejected" section, and since the recommendation is to use zero libraries, version drift is irrelevant.

**What I could not verify (tools were restricted):**
- Exact latest versions of Phaser, PixiJS, Kaplay, and other libraries (listed approximate versions from training data)
- Whether any new lightweight game library has emerged in late 2025/early 2026
- Whether any browser API changes affect Canvas 2D performance on recent Chrome versions

**Assessment of risk from unverified items:** LOW. The native browser APIs recommended here have been stable for 5+ years. A new game library emerging would not change the recommendation -- for a < 1 week joke game, vanilla JS remains the right call regardless.
