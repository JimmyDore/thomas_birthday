# Phase 1: Core Slashing - Research

**Researched:** 2026-02-07
**Domain:** HTML5 Canvas 2D mobile arcade game -- emoji-style watch drawing, swipe trail, split animation, particle effects, scoring display, haptic feedback
**Confidence:** HIGH

## Summary

Phase 1 delivers the core slashing gameplay loop: emoji-style watches fly across a Vinted-teal screen in parabolic arcs, the player swipes to slash them with a colored fading trail, watches split into tumbling halves with colored particle bursts (green for real Montignac, red for fakes), and a running profit in euros tracks the score. Haptic feedback fires on each slash.

The technical domain is mature and well-understood. Every component uses native Canvas 2D APIs that have been stable for 5-10+ years. The emoji-style watch drawing uses `ctx.beginPath()`, `ctx.arc()`, `ctx.lineTo()`, and `ctx.fillText()` -- no image assets needed. The swipe trail stores recent touch points and draws fading line segments with decreasing alpha. The split animation uses `ctx.save()`/`ctx.clip()`/`ctx.restore()` to render two clipped halves of the original watch shape, each with independent physics. Particle effects are simple arrays of small circles with random velocities that fade out. Line-segment-to-circle collision detection catches fast swipes that point-in-rect would miss.

**Primary recommendation:** Build everything with Canvas 2D drawing primitives (no image assets). Use the stored-points trail approach (not the semi-transparent-overlay approach). Use `ctx.clip()` for splitting watches in half. Use line-segment-to-circle-center distance for slash detection.

## Standard Stack

This phase uses zero external libraries. Everything is native browser APIs.

### Core

| Technology | Version | Purpose | Why Standard |
|------------|---------|---------|--------------|
| HTML5 Canvas 2D Context | Native (all browsers) | All rendering: watches, trail, particles, score, background | W3C standard, zero bytes, universal mobile Chrome support, stable 10+ years |
| Pointer Events API | Native (all browsers since 2019) | Swipe capture and trail point collection | Unified API for touch/mouse/pen, simpler than Touch Events, enables desktop testing |
| requestAnimationFrame | Native (all browsers since 2012) | Game loop at display refresh rate | Standard for smooth 60fps, auto-pauses in background tab, provides timestamp for delta-time |
| navigator.vibrate() | Native (Chrome Android 32+) | Haptic feedback on slash | Simple boolean API, no permissions needed, fails silently on unsupported devices |

### Supporting

| Technology | Version | Purpose | When to Use |
|------------|---------|---------|-------------|
| CSS `touch-action: none` | Native | Prevent browser scroll/zoom on canvas | Always -- on the canvas element, from the first line of CSS |
| `devicePixelRatio` | Native | Sharp rendering on high-DPI mobile screens | Always -- during canvas initialization and resize |
| `document.visibilitychange` | Native | Pause game when tab loses focus | Always -- prevents delta-time spike on tab resume |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Canvas-drawn watches | PNG image assets | Images need preloading, add download size, harder to split in half with clip(). Canvas drawing is faster to iterate and costs zero bytes. |
| Stored-points trail | Semi-transparent overlay trail | Overlay approach (`fillRect` with low alpha each frame) is simpler but bleeds color and prevents clean background gradient. Stored-points approach gives precise control over trail length, color, and fade. |
| Line-segment-to-circle collision | Point-in-rect collision | Point-in-rect misses fast swipes where touch samples skip over the watch. Line-segment catches all intersections. Slightly more math but critical for game feel. |
| Pointer Events | Touch Events | Pointer Events are the modern standard. Touch Events still work but are legacy. Pointer Events also work with mouse for desktop testing. |

**Installation:**
```bash
# Nothing to install. Zero dependencies. Zero build tools.
```

## Architecture Patterns

### Recommended Project Structure

```
/
+-- index.html          # HTML shell + viewport meta + CSS + <canvas>
+-- game.js             # All game logic (single file unless > 500 lines)
+-- Dockerfile          # Phase 3 (not needed yet)
+-- nginx.conf          # Phase 3 (not needed yet)
```

For Phase 1, a single `index.html` with inline `<script>` is the fastest approach. Split to `game.js` if the file exceeds 500 lines. No `src/` folder, no modules, no build step.

### Pattern 1: Emoji-Style Watch Drawing with Canvas Primitives

**What:** Draw watch shapes using Canvas 2D path commands -- arcs for the case, lines for lugs, a small circle for the crown, and `fillText()` for the brand name. No image assets.

**When to use:** For all watch rendering in this phase. The CONTEXT.md decision locks this as "emoji-style drawn watch shapes."

**Confidence:** HIGH -- Canvas 2D path APIs are fundamental and stable.

**Example -- Round Watch Silhouette:**
```javascript
function drawWatch(ctx, x, y, size, brand, isFake, style) {
  ctx.save();
  ctx.translate(x, y);

  const r = size / 2;

  // Watch case (circle)
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fillStyle = isFake ? '#cc3333' : '#2a7d4f'; // red for fake, green for real
  ctx.fill();
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Watch face (inner circle)
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.75, 0, Math.PI * 2);
  ctx.fillStyle = '#f5f0e8'; // cream dial
  ctx.fill();

  // Hour markers (12, 3, 6, 9)
  ctx.fillStyle = '#333';
  for (let i = 0; i < 4; i++) {
    const angle = (i * Math.PI) / 2 - Math.PI / 2;
    const mx = Math.cos(angle) * r * 0.6;
    const my = Math.sin(angle) * r * 0.6;
    ctx.fillRect(mx - 2, my - 2, 4, 4);
  }

  // Watch hands
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, -r * 0.5); // hour hand
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(r * 0.3, -r * 0.3); // minute hand
  ctx.stroke();

  // Crown (small bump on right side)
  ctx.beginPath();
  ctx.arc(r + 4, 0, 4, 0, Math.PI * 2);
  ctx.fillStyle = '#888';
  ctx.fill();

  // Lugs (top and bottom)
  ctx.fillStyle = '#666';
  ctx.fillRect(-6, -r - 10, 12, 10); // top lug
  ctx.fillRect(-6, r, 12, 10);       // bottom lug

  // Band stubs
  ctx.fillStyle = '#8B4513';
  ctx.fillRect(-8, -r - 18, 16, 10); // top band
  ctx.fillRect(-8, r + 8, 16, 10);   // bottom band

  // Brand name label
  ctx.fillStyle = '#333';
  ctx.font = `bold ${Math.max(8, size * 0.18)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(brand, 0, r * 0.3);

  ctx.restore();
}
```

**Watch Silhouette Variations (3 styles):**

1. **Round Classic** -- circular case, standard lugs, leather band stubs. The default above.
2. **Square/Cushion** -- rounded rectangle case (`ctx.roundRect()` or manual path), wider lugs. Suggests a dressier style.
3. **Sport/Diver** -- thicker bezel ring (double circle), larger crown, rubber band stubs. Suggests a dive watch.

Each style uses the same function signature but varies the path commands for the case shape. Brand name placement stays consistent.

### Pattern 2: Colored Swipe Trail with Fade (Stored Points Approach)

**What:** Store recent touch points with timestamps. Each frame, draw line segments connecting the points with decreasing alpha (oldest = transparent, newest = opaque). Remove points older than a threshold (e.g., 150ms). The result is a bright colored trail that fades behind the finger.

**When to use:** For all swipe trail rendering. The CONTEXT.md decision locks this as "colored swipe trail (bright, not white) that fades behind the finger."

**Confidence:** HIGH -- verified with multiple tutorial sources.

**Example:**
```javascript
const TRAIL_LIFETIME = 150; // ms before points fade completely
const TRAIL_COLOR = '255, 200, 50'; // gold RGB (Claude's discretion)

function updateTrail() {
  const now = performance.now();
  // Remove old points
  while (trailPoints.length > 0 && now - trailPoints[0].time > TRAIL_LIFETIME) {
    trailPoints.shift();
  }
}

function renderTrail(ctx) {
  if (trailPoints.length < 2) return;

  const now = performance.now();

  for (let i = 1; i < trailPoints.length; i++) {
    const p0 = trailPoints[i - 1];
    const p1 = trailPoints[i];

    // Alpha based on age (newest = 1.0, oldest = 0.0)
    const age = (now - p1.time) / TRAIL_LIFETIME;
    const alpha = Math.max(0, 1 - age);

    // Line width: thicker near the finger, thinner at the tail
    const widthRatio = (i / trailPoints.length);

    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y);
    ctx.lineTo(p1.x, p1.y);
    ctx.strokeStyle = `rgba(${TRAIL_COLOR}, ${alpha})`;
    ctx.lineWidth = 3 + widthRatio * 5; // 3px to 8px
    ctx.lineCap = 'round';
    ctx.stroke();
  }
}
```

**Why stored-points over semi-transparent overlay:** The semi-transparent overlay technique (`ctx.fillRect(0, 0, w, h)` with low alpha each frame) is simpler but has two problems: (1) it bleeds into the background gradient, making the teal color muddy over time; (2) it fades everything on screen, not just the trail. The stored-points approach gives precise control and works cleanly over the gradient background.

### Pattern 3: Watch Split Animation with Canvas Clipping

**What:** When a watch is slashed, replace the single watch entity with two "half" entities. Each half renders the original watch shape clipped to its half, with physics for tumbling away (outward velocity + rotation + gravity).

**When to use:** On every successful slash. The CONTEXT.md decision locks this as "watch splits into two tumbling halves."

**Confidence:** HIGH -- `ctx.save()`/`ctx.clip()`/`ctx.restore()` is a fundamental Canvas 2D pattern.

**Example:**
```javascript
function createSplitHalves(watch, slashAngle) {
  const perpAngle = slashAngle + Math.PI / 2;
  const pushSpeed = 80;

  return [
    { // Left half
      x: watch.x, y: watch.y,
      vx: watch.vx + Math.cos(perpAngle) * pushSpeed,
      vy: watch.vy + Math.sin(perpAngle) * pushSpeed,
      rotation: watch.rotation,
      rotationSpeed: -3 - Math.random() * 4,
      size: watch.size,
      brand: watch.brand,
      isFake: watch.isFake,
      style: watch.style,
      clipSide: 'left',
      clipAngle: slashAngle,
      alpha: 1.0,
      life: 1.0, // fades over time
    },
    { // Right half
      x: watch.x, y: watch.y,
      vx: watch.vx - Math.cos(perpAngle) * pushSpeed,
      vy: watch.vy - Math.sin(perpAngle) * pushSpeed,
      rotation: watch.rotation,
      rotationSpeed: 3 + Math.random() * 4,
      size: watch.size,
      brand: watch.brand,
      isFake: watch.isFake,
      style: watch.style,
      clipSide: 'right',
      clipAngle: slashAngle,
      alpha: 1.0,
      life: 1.0,
    },
  ];
}

function renderHalf(ctx, half) {
  ctx.save();
  ctx.translate(half.x, half.y);
  ctx.rotate(half.rotation);
  ctx.globalAlpha = half.alpha;

  // Clip to one side of a line through the center
  ctx.beginPath();
  const clipDir = half.clipSide === 'left' ? -1 : 1;
  const large = half.size * 2;
  // Create a rectangle covering one half
  ctx.rect(clipDir > 0 ? 0 : -large, -large, large, large * 2);
  ctx.clip();

  // Draw the full watch (only the clipped half will show)
  drawWatch(ctx, 0, 0, half.size, half.brand, half.isFake, half.style);

  ctx.restore();
}
```

### Pattern 4: Particle Burst on Slash

**What:** When a watch is slashed, spawn 8-15 small circles at the slash point. Each particle has random velocity, gravity, and fading alpha. Green particles for real Montignac, red for fakes.

**When to use:** On every successful slash. The CONTEXT.md decision locks green for real, red for fake.

**Confidence:** HIGH -- standard Canvas particle pattern, verified across multiple sources.

**Example:**
```javascript
function spawnParticles(x, y, isFake, count) {
  const color = isFake ? '220, 50, 50' : '50, 180, 80'; // red or green
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 50 + Math.random() * 150;
    particles.push({
      x: x,
      y: y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 50, // slight upward bias
      radius: 2 + Math.random() * 4,
      color: color,
      alpha: 1.0,
      life: 0.4 + Math.random() * 0.3, // 400-700ms lifetime
      age: 0,
    });
  }
}

function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.vx *= 0.98; // slight drag
    p.vy += 400 * dt; // gravity
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.age += dt;
    p.alpha = Math.max(0, 1 - p.age / p.life);
    if (p.age >= p.life) {
      particles.splice(i, 1);
    }
  }
}

function renderParticles(ctx) {
  for (const p of particles) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${p.color}, ${p.alpha})`;
    ctx.fill();
  }
}
```

### Pattern 5: Line-Segment to Circle Collision Detection

**What:** For each consecutive pair of touch points in the swipe trail, check if the line segment between them intersects any watch's circular hitbox. This catches fast swipes where individual touch samples skip over the watch.

**When to use:** Every frame during gameplay for slash detection.

**Confidence:** HIGH -- standard computational geometry, verified via mattdesl/line-circle-collision source.

**Example:**
```javascript
function lineSegmentIntersectsCircle(ax, ay, bx, by, cx, cy, r) {
  // Vector from A to B
  const dx = bx - ax;
  const dy = by - ay;
  // Vector from A to circle center
  const fx = ax - cx;
  const fy = ay - cy;

  const segLenSq = dx * dx + dy * dy;
  if (segLenSq === 0) {
    // Degenerate segment (single point)
    return (fx * fx + fy * fy) <= r * r;
  }

  // Project circle center onto line, clamped to segment
  let t = -(fx * dx + fy * dy) / segLenSq;
  t = Math.max(0, Math.min(1, t));

  // Nearest point on segment to circle center
  const nearestX = ax + t * dx;
  const nearestY = ay + t * dy;

  // Distance from nearest point to circle center
  const distX = nearestX - cx;
  const distY = nearestY - cy;

  return (distX * distX + distY * distY) <= r * r;
}

function checkSlashCollisions() {
  if (trailPoints.length < 2) return;

  // Only check recent trail segments (last 5-6 points)
  const start = Math.max(0, trailPoints.length - 6);
  for (let i = start + 1; i < trailPoints.length; i++) {
    const p0 = trailPoints[i - 1];
    const p1 = trailPoints[i];

    for (let j = watches.length - 1; j >= 0; j--) {
      const w = watches[j];
      if (w.slashed) continue;

      const hitRadius = w.size / 2 * 1.2; // 20% generous hitbox
      if (lineSegmentIntersectsCircle(p0.x, p0.y, p1.x, p1.y, w.x, w.y, hitRadius)) {
        slashWatch(w, i);
      }
    }
  }
}
```

### Pattern 6: Floating Score Text Animation

**What:** When a watch is slashed, spawn a floating text entity at the slash point showing "+15EUR" (green) or "-8EUR" (red). The text floats upward and fades out over ~1 second.

**When to use:** On every slash event. The CONTEXT.md decision locks this as "floating numbers appear at the slash point and float up."

**Confidence:** HIGH -- trivial Canvas `fillText()` with animation.

**Example:**
```javascript
function spawnFloatingText(x, y, amount, isFake) {
  floatingTexts.push({
    x: x,
    y: y,
    text: (amount >= 0 ? '+' : '') + amount + '\u20AC', // euro sign
    color: isFake ? '220, 50, 50' : '50, 180, 80',
    alpha: 1.0,
    vy: -60, // float upward
    age: 0,
    life: 1.0, // 1 second
  });
}

function updateFloatingTexts(dt) {
  for (let i = floatingTexts.length - 1; i >= 0; i--) {
    const ft = floatingTexts[i];
    ft.y += ft.vy * dt;
    ft.age += dt;
    ft.alpha = Math.max(0, 1 - ft.age / ft.life);
    if (ft.age >= ft.life) {
      floatingTexts.splice(i, 1);
    }
  }
}

function renderFloatingTexts(ctx) {
  for (const ft of floatingTexts) {
    ctx.save();
    ctx.globalAlpha = ft.alpha;
    ctx.fillStyle = `rgba(${ft.color}, ${ft.alpha})`;
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(ft.text, ft.x, ft.y);
    ctx.restore();
  }
}
```

### Pattern 7: Haptic Feedback with navigator.vibrate()

**What:** Call `navigator.vibrate(30)` on each successful slash for a short haptic pulse.

**When to use:** On every slash event. The CONTEXT.md decision locks this as "haptic vibration on each slash (if device supports navigator.vibrate)."

**Confidence:** HIGH -- verified via MDN documentation.

**Example:**
```javascript
function hapticFeedback(durationMs) {
  if (navigator.vibrate) {
    navigator.vibrate(durationMs);
  }
  // Silently does nothing if not supported (iOS, desktop)
}

// On slash:
hapticFeedback(30); // short pulse for satisfying feedback
```

**Critical notes:**
- `navigator.vibrate()` requires prior user interaction (sticky activation). The first touch on the game canvas satisfies this.
- Works on Chrome Android 32+. Does NOT work on iOS Safari (fails silently -- no error).
- Takes milliseconds as parameter. 20-50ms is a good range for a game "hit" feel.
- Can pass an array for patterns: `navigator.vibrate([30, 20, 30])` for a double-tap feel.

### Anti-Patterns to Avoid

- **Loading PNG image assets for emoji-style watches:** The CONTEXT.md decision says "emoji-style drawn watch shapes (not image assets)." Drawing with Canvas primitives is faster to iterate, costs zero bytes, and avoids image preloading complexity.
- **Using the semi-transparent overlay technique for the trail:** This technique (`fillRect` with low alpha) works for simple backgrounds but bleeds into the Vinted teal gradient, causing visual artifacts. Use the stored-points approach.
- **Point-in-rect collision detection:** Fast swipes skip over watches. Always use line-segment-to-circle.
- **Creating new objects every frame:** Pre-allocate particle and floating-text arrays. Use `splice()` for removal, not `filter()` which creates new arrays.
- **Unbounded arrays:** Cap `trailPoints` at 100, `particles` at 200, `floatingTexts` at 20. Old entries are removed by age, but hard caps prevent edge-case leaks.

## Don't Hand-Roll

Problems that look simple but have existing solutions or established patterns:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Line-segment-to-circle collision | Custom distance calculation | The projection-clamping algorithm above | Edge cases around segment endpoints are easy to get wrong. The clamped-t algorithm handles them correctly. |
| Smooth trail rendering | Drawing raw line segments | Rounded line caps (`ctx.lineCap = 'round'`) + varying width | Without round caps, trail segments have visible square joints. One CSS property fixes it. |
| High-DPI canvas | Setting width/height to window size | `canvas.width = clientWidth * devicePixelRatio` + `ctx.scale(dpr, dpr)` | Forgetting DPR makes everything blurry on phones. The two-line fix must happen at init and resize. |
| Touch coordinate mapping | Using `event.clientX/Y` directly | `clientX - canvas.getBoundingClientRect().left` | Direct clientX only works if canvas is at (0,0). The rect offset works universally. |
| Frame-rate independence | Per-frame position increments | `position += velocity * dt` everywhere | Without dt, physics runs faster on 120Hz phones and slower on lagging phones. |

**Key insight:** None of these need external libraries. They are all 2-10 line patterns that must be implemented correctly from the start. Getting them wrong creates subtle bugs that are hard to diagnose later.

## Common Pitfalls

### Pitfall 1: Semi-Transparent Trail Bleeds into Background Gradient

**What goes wrong:** Using `ctx.fillRect(0, 0, w, h)` with low alpha each frame to create a fading trail causes the teal gradient background to accumulate opacity artifacts. After 5-10 seconds, the background looks washed out or muddy.

**Why it happens:** The semi-transparent overlay technique works by never fully clearing the canvas. Each frame adds a translucent layer. This is fine for solid backgrounds but interacts badly with gradients -- the overlay darkens some areas more than others.

**How to avoid:** Use the stored-points trail approach. Clear the canvas fully each frame (`clearRect`), redraw the background gradient, then draw the trail from the stored points with explicit alpha per segment.

**Warning signs:** Background color shifts after 10+ seconds of play. Trail leaves permanent ghosting.

### Pitfall 2: Watch Brand Text Unreadable at Game Speed

**What goes wrong:** The brand name label (Montignac, Montignak, etc.) is rendered too small or too fast for the player to read. The "name reading" mechanic becomes impossible, forcing players to rely only on color.

**Why it happens:** Font size is set proportionally to watch size without considering mobile screen density and the speed at which watches move. Text that looks fine in a static screenshot is illegible when the watch is tumbling through the air.

**How to avoid:**
1. Set minimum font size of 10px for brand name regardless of watch size.
2. Use `bold` weight for better readability at small sizes.
3. Ensure brand text contrasts against the watch face background (dark text on light face).
4. The watch should spend 1.5-2.5 seconds in the playable area -- enough time to read a short word.
5. Test readability on a real phone, not just desktop DevTools.

**Warning signs:** Playtesters say they can only tell real from fake by color, never by name.

### Pitfall 3: Canvas Clip() State Leak in Split Animation

**What goes wrong:** Clipping regions from split-half rendering leak into subsequent draw calls. Other watches, the trail, or the score render incorrectly (partially invisible or clipped to wrong regions).

**Why it happens:** `ctx.clip()` modifies the canvas state permanently until restored. If `ctx.restore()` is missing or called in the wrong order, subsequent draw calls inherit the clip region.

**How to avoid:** ALWAYS wrap clip operations in `save()`/`restore()` pairs. Never call `clip()` without a preceding `save()`. Structure the render function so clip operations are self-contained.

**Warning signs:** Random visual glitches. Objects disappearing. Score text partially invisible.

### Pitfall 4: Particle Array Grows Unbounded During Intense Gameplay

**What goes wrong:** Rapid slashing spawns 10-15 particles per slash. With 3-4 watches slashed per second during intense gameplay, the particle array grows to 500+ entries. GC pauses cause micro-stutters.

**Why it happens:** Particles are spawned on every slash but only removed when their lifetime expires. During intense bursts, spawn rate exceeds expiration rate temporarily.

**How to avoid:**
1. Hard-cap the particle array at 200 entries.
2. When spawning would exceed the cap, skip spawning or remove the oldest particles first.
3. Keep particle lifetimes short (400-700ms).
4. Use backward iteration with `splice()` for removal -- it's faster than `filter()` because it avoids creating a new array.

**Warning signs:** Frame drops after 30+ seconds of continuous play. Performance profile shows GC spikes.

### Pitfall 5: Slash Detection Fires Multiple Times per Watch

**What goes wrong:** A single swipe across a watch triggers multiple slash events because multiple consecutive trail segments all intersect the same watch hitbox.

**Why it happens:** The collision check runs every frame, and a swipe typically crosses a watch over 2-4 frames. Each frame, 2-3 trail segments may intersect the watch.

**How to avoid:** Mark a watch as `slashed = true` immediately on the first hit. Skip slashed watches in collision checks. The example in Pattern 5 already includes `if (w.slashed) continue`.

**Warning signs:** Score jumps by multiples of the expected amount. Multiple particle bursts from a single slash.

### Pitfall 6: Missing Real Watch Penalty Not Tracked

**What goes wrong:** The CONTEXT.md decision says "missing a real Montignac (falls off screen) costs money." Without explicit tracking, watches that fall off-screen are just silently removed from the array with no score consequence.

**Why it happens:** The entity cleanup typically removes off-screen watches without checking their type. Real watches that were never slashed should trigger a penalty.

**How to avoid:** In the entity cleanup loop, before removing an off-screen watch, check: `if (!watch.slashed && !watch.isFake) { score -= missedPenalty; spawnFloatingText(...); }`. Show a floating text at the bottom of the screen where it fell.

**Warning signs:** Score never decreases from inaction. No pressure to slash real watches before they fall.

## Code Examples

Verified patterns from the research:

### Complete Watch Spawning with Parabolic Arc Physics

```javascript
// Source: Architecture research + standard game physics patterns
const GRAVITY = 600; // pixels/sec^2 (CSS pixels)

function spawnWatch(canvasWidth, canvasHeight) {
  // Launch from bottom, left or right third
  const fromLeft = Math.random() < 0.5;
  const x = fromLeft
    ? canvasWidth * (0.1 + Math.random() * 0.3)
    : canvasWidth * (0.6 + Math.random() * 0.3);

  // Horizontal velocity: toward center
  const vx = fromLeft
    ? 30 + Math.random() * 80
    : -(30 + Math.random() * 80);

  // Vertical velocity: strong upward launch
  const vy = -(450 + Math.random() * 200);

  const isFake = Math.random() < 0.4; // 40% fake
  const names = isFake
    ? ['Montignak', 'Montinyac', 'Montiganc', 'Montigniak', 'Montignaq']
    : ['Montignac'];
  const styles = ['round', 'square', 'sport'];

  watches.push({
    x: x,
    y: canvasHeight + 50, // start below screen
    vx: vx,
    vy: vy,
    size: 60, // diameter in CSS pixels
    rotation: 0,
    rotationSpeed: (Math.random() - 0.5) * 3,
    isFake: isFake,
    brand: names[Math.floor(Math.random() * names.length)],
    style: styles[Math.floor(Math.random() * styles.length)],
    slashed: false,
    value: isFake ? -8 : 15, // euros
  });
}
```

### Complete Canvas Initialization with DPR and Mobile Setup

```javascript
// Source: Stack research + Pitfalls research
function initCanvas() {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');

  function resize() {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    ctx.scale(dpr, dpr);
  }

  window.addEventListener('resize', resize);
  resize();

  return { canvas, ctx };
}
```

### Complete Pointer Event Handling with Trail

```javascript
// Source: Stack research (Pointer Events API recommendation)
function setupInput(canvas) {
  let isDown = false;

  canvas.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    isDown = true;
    trailPoints.length = 0; // clear previous trail
    const rect = canvas.getBoundingClientRect();
    trailPoints.push({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      time: performance.now(),
    });
  });

  canvas.addEventListener('pointermove', (e) => {
    if (!isDown) return;
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    trailPoints.push({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      time: performance.now(),
    });
    // Hard cap
    if (trailPoints.length > 100) trailPoints.shift();
  });

  canvas.addEventListener('pointerup', () => {
    isDown = false;
  });

  canvas.addEventListener('pointercancel', () => {
    isDown = false;
  });
}
```

### Vinted-Inspired Background Gradient

```javascript
// Source: Vinted brand color research -- official teal #007782
function renderBackground(ctx, width, height) {
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, '#009a9a');   // lighter teal at top
  gradient.addColorStop(1, '#006066');   // darker teal at bottom
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
}
```

### Score Display (Running Profit in Top Corner)

```javascript
// Source: CONTEXT.md decision -- "top corner, clean and small"
function renderScore(ctx, score) {
  ctx.save();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.fillRect(10, 10, 120, 36);
  ctx.fillStyle = score >= 0 ? '#ffffff' : '#ff6666';
  ctx.font = 'bold 20px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText((score >= 0 ? '+' : '') + score + '\u20AC', 18, 18);
  ctx.restore();
}
```

### Game Loop with Delta Time

```javascript
// Source: Architecture research -- variable timestep pattern
let lastTime = 0;

function gameLoop(timestamp) {
  const dt = Math.min((timestamp - lastTime) / 1000, 0.05); // cap at 50ms
  lastTime = timestamp;

  update(dt);
  render();

  requestAnimationFrame(gameLoop);
}

// Start the loop
requestAnimationFrame(gameLoop);
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Touch Events API (`touchstart`, `touchmove`) | Pointer Events API (`pointerdown`, `pointermove`) | 2019 (universal browser support) | Pointer Events unify touch/mouse/pen. Simpler code, easier desktop testing. Touch Events still work but are legacy. |
| `setInterval(fn, 16)` game loops | `requestAnimationFrame` with delta-time | 2012+ (universal) | Smooth 60fps, battery efficient, auto-pauses in background tabs. |
| Image-based sprites for simple shapes | Canvas drawing primitives | Always an option, but relevant for "emoji-style" decision | Zero download, instant iteration, easier to split with clip(). Trade-off: more drawing code vs fewer assets. |

**Deprecated/outdated:**
- `canvas.width = canvas.width` for clearing: Still works but resets ALL canvas state (transforms, styles). Use `clearRect()` instead.
- Touch Events API: Not deprecated but superseded by Pointer Events for new code.

## Discretion Recommendations

These are Claude's recommendations for the areas marked as "Claude's Discretion" in CONTEXT.md.

### Trail Color: Gold (#FFD700 base)

**Recommendation:** Use a warm gold trail (`rgba(255, 200, 50, alpha)`).

**Rationale:** Gold contrasts well against the teal background, feels premium (matches the luxury watch theme), and is easily distinguishable from the green (real) and red (fake) particle colors. Neon options (cyan, magenta) would clash with the teal background or the particle colors.

### Watch Shape Designs (3 silhouette styles)

**Recommendation:**
1. **Round Classic** -- circular case, thin lugs, leather band stubs, cream dial. The "default" watch.
2. **Square Cushion** -- rounded-rectangle case, slightly wider lugs, metal bracelet stubs. Dressier appearance.
3. **Sport Diver** -- circular case with a thicker bezel ring (concentric circles), chunky crown, rubber band stubs. Sportier look.

All three use the same brand label placement (center of dial, lower half) and the same color-coding scheme (case/bezel color indicates real vs fake).

### Particle Effect Details

**Recommendation:**
- **Count:** 10-12 particles per slash (balances visual impact vs performance).
- **Size:** 2-5px radius, random per particle.
- **Lifetime:** 400-700ms with linear alpha fade.
- **Velocity:** 50-200px/sec in random radial direction, slight upward bias (-50 on vy).
- **Gravity:** Same as watch gravity (600px/sec^2) so particles feel physically grounded.
- **Drag:** 2% per frame (`vx *= 0.98`) for natural deceleration.

### Money Values

**Recommendation:**
- **Real Montignac slashed:** +15EUR (satisfying but not too generous)
- **Fake watch slashed:** -8EUR (punishing but recoverable)
- **Real Montignac missed (falls off screen):** -5EUR (pressure to act, but less than slashing a fake)

**Rationale:** The asymmetry (+15 vs -8) means the player trends positive if they're somewhat accurate, making the game feel rewarding. The missed penalty (-5) is less than the fake penalty (-8) because missing is passive failure while slashing a fake is active failure. Going negative requires consistently poor play, which makes "-47EUR" scores genuinely funny.

### Physics Tuning

**Recommendation (portrait mobile, ~390x844 CSS pixels):**
- **Gravity:** 600 px/sec^2 (objects spend ~1.8-2.5 seconds in the playable area)
- **Launch vertical velocity:** -450 to -650 px/sec (reaches 60-80% of screen height at apex)
- **Launch horizontal velocity:** +/- 30-110 px/sec (mild lateral drift, not aggressive horizontal movement)
- **Rotation speed:** -4 to +4 radians/sec (visible tumble without being distracting)
- **Spawn interval:** 1.2 seconds at start (Phase 1 has no difficulty ramp -- that is Phase 2)
- **Spawn position:** Bottom third of screen, random X within the middle 80% (avoid edge spawns that exit immediately)

These values ensure watches arc into the playable area, hang in the air long enough to read the brand name (~1.5 seconds near the apex), and fall off screen naturally. Tuning should happen on a real phone.

### Missed Watch Penalty

**Recommendation:** -5EUR per missed real Montignac.

Show a floating "-5EUR" text at the bottom of the screen where the watch fell, with a brief red flash or a subtle color overlay to indicate the miss. This is less visually dramatic than a slash (no particles, no split) but enough to communicate the penalty.

## Open Questions

Things that could not be fully resolved during research:

1. **Exact readability of brand names at game speed on real mobile devices**
   - What we know: Font size of `max(8, size * 0.18)px` with bold weight should be readable for a word like "Montignac" on a 60px watch at close range.
   - What is unclear: Whether text is legible during the 0.3-second window when the watch passes through the player's natural thumb zone while rotating.
   - Recommendation: Test on a real phone during the first implementation pass. If text is unreadable, increase watch size from 60 to 70-80px diameter, or slow rotation near the apex.

2. **Color-coding scheme for real vs fake distinction**
   - What we know: Real = green-tinted case, Fake = red-tinted case (locked in CONTEXT.md). Some fakes have "same color but misspelled name" (sneaky fakes).
   - What is unclear: What exact color the "sneaky" fakes should be. Same green as real ones? A slightly different shade?
   - Recommendation: Sneaky fakes should use the same green as real watches. The only difference is the misspelled name. This creates the "double-take" moment the user described.

3. **Performance of clip()-based split rendering on lower-end Android phones**
   - What we know: `ctx.clip()` is a standard operation but involves rasterization cost. With 2-3 split halves on screen simultaneously, this should be trivially fast.
   - What is unclear: Whether very low-end Android devices have Canvas 2D performance issues with clip paths.
   - Recommendation: Proceed with clip-based approach. If performance issues surface on testing, fall back to a simpler approach (just fade out the watch and spawn particles only, no visible halves).

## Sources

### Primary (HIGH confidence)
- [MDN: Navigator.vibrate()](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/vibrate) -- API documentation, browser compatibility, usage notes
- [MDN: Vibration API](https://developer.mozilla.org/en-US/docs/Web/API/Vibration_API) -- Overview and patterns
- [MDN: CanvasRenderingContext2D.clip()](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/clip) -- Clip region mechanics
- [BrandColorCode: Vinted](https://www.brandcolorcode.com/vinted) -- Official Vinted teal hex code #007782
- [mattdesl/line-circle-collision](https://github.com/mattdesl/line-circle-collision) -- Line-segment-to-circle collision algorithm reference
- Architecture research (training data) -- Canvas 2D game architecture, game loop, entity patterns
- Pitfalls research (training data) -- Mobile Canvas game pitfalls and prevention
- Stack research (training data) -- Technology stack recommendation (vanilla JS + Canvas 2D)

### Secondary (MEDIUM confidence)
- [Growing with the Web: Trail Effect](https://www.growingwiththeweb.com/2012/10/creating-trail-effect-with-canvas.html) -- Semi-transparent overlay trail technique (used as counter-example)
- [Kirupa: Creating Motion Trails](https://www.kirupa.com/canvas/creating_motion_trails.htm) -- Stored-points trail approach
- [Chris Courses: Particle Explosion on Hit](https://chriscourses.com/courses/javascript-games/videos/create-particle-explosion-on-hit) -- Canvas particle burst patterns
- [Google Chrome Vibration API Sample](https://googlechrome.github.io/samples/vibration/) -- Working vibration example

### Tertiary (LOW confidence)
- [GitHub: dk731/JSFruitNinja](https://github.com/dk731/JSFruitNinja) -- p5.js Fruit Ninja clone (structure reference only, could not inspect source)
- [GitHub: pctroll/webninja](https://github.com/pctroll/webninja) -- Enchant.js Fruit Ninja clone (structure reference only)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all native browser APIs, stable 5-10+ years, zero dependencies
- Architecture: HIGH -- Canvas 2D game patterns are foundational knowledge, verified via prior project research
- Emoji-style watch drawing: HIGH -- uses only standard Canvas 2D path APIs (arc, lineTo, fillText)
- Swipe trail rendering: HIGH -- stored-points approach verified via multiple tutorial sources
- Split animation with clip(): HIGH -- standard Canvas 2D clipping pattern per MDN docs
- Particle effects: HIGH -- simple array of circles with physics, well-documented pattern
- Line-segment collision: HIGH -- standard computational geometry, verified algorithm
- Haptic feedback: HIGH -- navigator.vibrate() verified via MDN, Chrome Android 32+ support confirmed
- Floating score text: HIGH -- trivial Canvas fillText with position animation
- Physics tuning: MEDIUM -- values are educated estimates, must be validated on real device
- Color and visual design: MEDIUM -- recommendations based on contrast analysis and theme consistency, subject to taste

**Research date:** 2026-02-07
**Valid until:** Indefinitely for API/pattern knowledge. Physics tuning values need validation during implementation.
