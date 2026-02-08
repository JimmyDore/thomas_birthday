# Phase 04: Vinted Cards - Research

**Researched:** 2026-02-08
**Domain:** Canvas 2D card rendering, rectangular collision detection, split animation for non-circular shapes
**Confidence:** HIGH

## Summary

Phase 04 replaces the existing circular watch sprites with white Vinted-style listing cards. The primary challenge is visual -- transitioning from three watch drawing styles (~200 lines) to a single card drawing function while preserving the satisfying slash/split feel. The technical risks are well-understood: Canvas 2D shadow performance, rectangular collision detection on rotated entities, and clipping rectangular cards for split halves.

The standard approach is: (1) pre-render card sprites to offscreen canvases to avoid per-frame shadow computation, (2) keep circle-based collision with expanded radius rather than implementing rotated rectangle intersection, and (3) adapt the existing vertical clip technique for card splitting with minimal changes.

**Primary recommendation:** Pre-render each unique card variant (white, golden) to offscreen canvases at spawn time, then blit with `drawImage()` each frame. This eliminates the expensive `shadowBlur` from the game loop entirely and actually improves performance over the current watch rendering.

## Standard Stack

### Core

No new libraries. This phase is pure Canvas 2D API work within the existing vanilla JS + Canvas architecture.

| API | Status | Purpose | Why Standard |
|-----|--------|---------|--------------|
| `ctx.roundRect()` | Baseline Widely Available (Oct 2025) | Draw rounded rectangle card body | Native Canvas method, Chrome 99+, Safari 16.4+, Firefox 112+ |
| `ctx.shadowColor/shadowBlur/shadowOffsetY` | Stable (all browsers) | Card drop shadow on offscreen canvas | Native Canvas shadow properties |
| `document.createElement('canvas')` | Stable | Offscreen sprite caching | Standard DOM API for pre-rendering |
| `ctx.drawImage(offscreenCanvas, ...)` | Stable | Blit pre-rendered card sprites | Standard Canvas blit operation |

### Supporting

The codebase already has a manual `roundRect()` helper (game.js line 965-976) used for UI pill backgrounds. The native `ctx.roundRect()` method should be used instead for card rendering, but the existing helper serves as a fallback for any edge cases.

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Native `ctx.roundRect()` | Existing manual `roundRect()` helper | Manual helper works but is a path helper, not the native method. Native is cleaner and slightly faster. Use native. |
| Offscreen canvas caching | Direct per-frame drawing with shadow | 10-30x slower shadow rendering per frame on mobile. Always pre-render. |
| Rotated rect collision | Circle approximation with `Math.max(w,h)/2` | Circle approximation is simpler and more generous. The 20% hitbox expansion already in the code compensates for corner inaccuracy. |

## Architecture Patterns

### Recommended Code Structure Changes

```
game.js modifications:

REMOVE (replace entirely):
  drawRoundWatch()      ~56 lines (669-724)
  drawSquareWatch()     ~78 lines (727-805)
  drawSportWatch()      ~62 lines (808-870)
  drawBrandLabel()      ~12 lines (873-884)
  WATCH_STYLES array    (line 93)

ADD (new functions):
  drawCardToCanvas()    ~50 lines  -- renders card to an offscreen canvas
  createCardSprite()    ~15 lines  -- creates + caches offscreen canvas for a card
  drawCard()            ~10 lines  -- blits cached sprite with translate/rotate
  drawWatchIcon()       ~25 lines  -- simplified watch illustration (circle + hands)

MODIFY:
  spawnWatch()          -- add width/height, remove style, create sprite cache
  drawWatch()           -- replace style dispatch with single drawCard() call
  renderHalf()          -- update clip rect dimensions for card aspect ratio
  checkSlashCollisions() -- update hitRadius calc for rectangular dimensions
  decorative watches    -- update start screen to use card sprites
```

### Pattern 1: Offscreen Canvas Sprite Caching

**What:** Pre-render each card to a small offscreen canvas at spawn time. Each frame, blit the cached canvas instead of re-executing all draw operations.

**When to use:** Any time a sprite has expensive rendering (shadows, gradients, complex paths) that does not change frame-to-frame.

**Example:**

```javascript
// Source: MDN Canvas optimization guide + web.dev canvas performance
function createCardSprite(card) {
  var padding = 10; // space for shadow to render into
  var spriteW = card.width + padding * 2;
  var spriteH = card.height + padding * 2;

  var offCanvas = document.createElement('canvas');
  offCanvas.width = spriteW * dpr;
  offCanvas.height = spriteH * dpr;
  var offCtx = offCanvas.getContext('2d');
  offCtx.scale(dpr, dpr);

  // Draw card centered in offscreen canvas (with padding for shadow)
  drawCardToCanvas(offCtx, padding, padding, card);

  card.sprite = offCanvas;
  card.spritePadding = padding;
}

function drawCard(ctx, card) {
  if (!card.sprite) return;
  ctx.save();
  ctx.translate(card.x, card.y);
  ctx.rotate(card.rotation);
  // Blit pre-rendered sprite centered on card position
  var p = card.spritePadding;
  ctx.drawImage(card.sprite,
    0, 0, card.sprite.width, card.sprite.height,
    -card.width / 2 - p, -card.height / 2 - p,
    card.width + p * 2, card.height + p * 2
  );
  ctx.restore();
}
```

### Pattern 2: Card Visual Layout

**What:** White rounded rectangle with watch icon in upper area and bold brand name below, mimicking Vinted listing card aesthetics.

**Layout specification:**

```
+---------------------------+
|        (shadow)           |
|  +---------------------+  |
|  |                     |  |
|  |   [Watch Icon]      |  |  <- top 60%: watch illustration
|  |      (circle +      |  |     simple circle, dial, hands
|  |       hands)         |  |
|  |                     |  |
|  |---------------------|  |
|  |   Montignac         |  |  <- bottom 30%: brand name
|  |   12 EUR            |  |  <- price (small, decorative)
|  +---------------------+  |
|                           |
+---------------------------+
```

**Card dimensions:**
- Width: 80px, Height: 110px (aspect ratio ~0.73, portrait)
- Corner radius: 8px
- These are larger than the current 60px circle, improving readability
- Golden card: same dimensions, gold background instead of white

### Pattern 3: Golden Card Treatment

**What:** Golden cards use a gold gradient background instead of white, with a subtle shimmer effect.

**Approach:** The offscreen sprite for golden cards uses a linear gradient fill (`#DAA520` to `#FFD700`) for the card body instead of white. The watch icon uses darker gold for contrast. Brand name rendered in dark brown (#5D4037) on gold background for readability.

**Visually distinct but not distracting:** The gold color is obvious at a glance (success criteria #4) without adding animation complexity. No shimmer animation needed -- the color difference alone provides instant recognition, matching how the current golden watches (gold circle vs green/red) work.

### Anti-Patterns to Avoid

- **Per-frame shadow rendering:** NEVER call `shadowBlur` in the main render loop. Always pre-render shadows to offscreen canvas. Shadow computation is the single biggest Canvas 2D performance killer on mobile.
- **Multiple draw functions for card variants:** Do NOT create separate `drawWhiteCard()`, `drawGoldenCard()`, `drawFakeCard()` functions. Use a single `drawCardToCanvas()` that accepts color parameters. The only visual difference between real/fake is the brand text; the only difference for golden is background color.
- **Oriented Bounding Box collision:** Do NOT implement full OBB collision detection. The circle approximation with the existing generous hitbox is sufficient and avoids complex matrix transforms in the collision loop.
- **Splitting into multiple files:** Keep everything in game.js. The project constraint is zero build tools.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Rounded rectangles | Manual bezier curve paths | `ctx.roundRect()` native method | Baseline Widely Available since Oct 2025. The existing manual helper (line 965) can serve as fallback but prefer native. |
| Card drop shadows | Per-frame `shadowBlur` | Pre-rendered offscreen canvas sprites | shadowBlur is documented as "very expensive" by MDN. Pre-render once, blit every frame. |
| Rotated rectangle collision | 4x line-line intersection + coordinate transforms | Circle approximation `Math.max(w,h)/2 * 1.1` | Existing circle collision code works unchanged. The generous hitbox masks corner inaccuracy. Only rebuild if playtesting reveals missed slashes. |
| DPR-aware offscreen canvas | Separate DPR logic | Copy existing `resize()` pattern (line 117-127) | The game already handles DPR correctly. Apply same `dpr` scaling to offscreen canvases. |

**Key insight:** The most tempting hand-roll trap is per-frame shadow rendering. It looks like "just one more draw call" but shadowBlur triggers a Gaussian blur kernel on every fill operation. With 10-15 cards on screen, that is 10-15 blur operations per frame. Pre-rendering eliminates all of them.

## Common Pitfalls

### Pitfall 1: Shadow Bleeding Outside Offscreen Canvas

**What goes wrong:** The offscreen canvas is sized exactly to the card dimensions, but `shadowBlur` extends pixels beyond the card edges. The shadow gets clipped at the canvas boundary, producing a flat-edged shadow instead of a soft glow.
**Why it happens:** `shadowBlur` extends the rendered area by approximately `shadowBlur` pixels in all directions.
**How to avoid:** Add padding to the offscreen canvas equal to `shadowBlur + shadowOffsetY + 2`. Size the offscreen canvas as `(cardWidth + padding*2) x (cardHeight + padding*2)`.
**Warning signs:** Shadow appears cut off on one or more sides of the card.

### Pitfall 2: Blurry Cards on High-DPR Screens

**What goes wrong:** Offscreen canvas is created at CSS pixel dimensions (80x110) but rendered on a 2x or 3x DPR screen. The card looks blurry when blitted to the main canvas.
**Why it happens:** The offscreen canvas has fewer physical pixels than the destination area on the main canvas.
**How to avoid:** Create offscreen canvas at `width * dpr` x `height * dpr`, apply `ctx.scale(dpr, dpr)` to the offscreen context, then blit using CSS-pixel destination coordinates. This matches the existing DPR pattern in the game's `resize()` function.
**Warning signs:** Cards look sharp on desktop but blurry on mobile phones.

### Pitfall 3: Split Halves Show Seam or Gap

**What goes wrong:** When a card is slashed and split into two halves, a 1px gap or overlap appears at the cut line because the clip rectangle does not perfectly bisect the card.
**Why it happens:** The current clip uses `ctx.rect(0, -large, large, large*2)` which clips at x=0. This works for circle center but may need adjustment for the card sprite coordinate system.
**How to avoid:** When rendering split halves, blit the full card sprite and clip at the card's local center (x=0 after translate). The existing clip approach works if the sprite is drawn centered at (0,0). Verify the offscreen sprite is drawn symmetrically.
**Warning signs:** Visible line artifact at the center of split cards, especially noticeable on white cards against the teal background.

### Pitfall 4: Offscreen Canvas Not Garbage Collected

**What goes wrong:** Every spawned card creates an offscreen canvas. If cards are spawned faster than they are removed, offscreen canvases accumulate in memory.
**Why it happens:** Card sprites are attached to the card object. When the card is spliced from the array, the sprite should be eligible for GC, but if split halves hold a reference, the sprite persists longer.
**How to avoid:** Split halves should reference the same sprite as the original card (no copy). When the half is removed, the last reference is dropped and GC reclaims the offscreen canvas. Verify with DevTools memory timeline that canvas count stabilizes.
**Warning signs:** Gradually increasing memory usage over a 60-second round.

### Pitfall 5: Brand Name Unreadable at Small Card Size

**What goes wrong:** The brand name ("Montignac" / "Montignaq") is too small to distinguish at a glance on mobile, defeating the primary purpose of the card redesign.
**Why it happens:** Card dimensions are too small or font size is not large enough relative to card width.
**How to avoid:** Use 14-16px bold sans-serif for brand name (CARD-02 requirement). At 80px card width, a 14px font fills ~70% of the width for "Montignac" which is readable. Test on actual mobile device early. If needed, increase card width to 90px.
**Warning signs:** Players still squint at brand names, or playtesters report they cannot tell real from fake at gameplay speed.

### Pitfall 6: Card Rotation Makes Text Unreadable

**What goes wrong:** Cards rotate during flight (existing `rotationSpeed`), and at certain angles the brand name becomes upside-down or sideways, making it impossible to read.
**Why it happens:** The current watches rotate freely because brand text was always hard to read anyway. Cards are specifically designed for readability, so rotation fights the purpose.
**How to avoid:** Limit rotation speed for cards to a gentle wobble (e.g., `rotationSpeed` range reduced from `(-1.5, 1.5)` to `(-0.3, 0.3)`) so cards tilt but never go fully sideways. Alternatively, cap rotation angle to +/-15 degrees. The card should always be "mostly upright" so the brand name stays readable.
**Warning signs:** During playtesting, cards frequently appear sideways or upside-down, making the brand unreadable.

## Code Examples

### Example 1: Complete Card Sprite Pre-Rendering

```javascript
// Source: MDN Canvas optimization + verified against existing codebase patterns

function drawCardToCanvas(offCtx, ox, oy, card) {
  var w = card.width;
  var h = card.height;
  var cr = 8; // corner radius

  // Drop shadow (only rendered once, on offscreen canvas)
  offCtx.shadowColor = 'rgba(0, 0, 0, 0.25)';
  offCtx.shadowBlur = 6;
  offCtx.shadowOffsetX = 0;
  offCtx.shadowOffsetY = 3;

  // Card body
  offCtx.fillStyle = card.isGolden ? '#DAA520' : '#ffffff';
  offCtx.beginPath();
  offCtx.roundRect(ox, oy, w, h, cr);
  offCtx.fill();

  // Reset shadow for inner content
  offCtx.shadowColor = 'transparent';

  // Thin border
  offCtx.strokeStyle = card.isGolden ? '#B8860B' : '#e0e0e0';
  offCtx.lineWidth = 1;
  offCtx.beginPath();
  offCtx.roundRect(ox, oy, w, h, cr);
  offCtx.stroke();

  // Watch illustration (top 60% of card)
  var iconCx = ox + w / 2;
  var iconCy = oy + h * 0.35;
  var iconR = Math.min(w, h * 0.6) * 0.35;
  drawWatchIcon(offCtx, iconCx, iconCy, iconR, card.isGolden);

  // Brand name (bottom area, large and bold)
  var fontSize = Math.max(12, Math.min(16, w * 0.18));
  offCtx.font = 'bold ' + fontSize + 'px sans-serif';
  offCtx.textAlign = 'center';
  offCtx.textBaseline = 'middle';
  offCtx.fillStyle = card.isGolden ? '#5D4037' : '#333333';
  offCtx.fillText(card.brand, ox + w / 2, oy + h * 0.75);

  // Price tag (small, decorative)
  offCtx.font = '10px sans-serif';
  offCtx.fillStyle = card.isGolden ? '#8B6914' : '#007782';
  offCtx.fillText(card.price + ' EUR', ox + w / 2, oy + h * 0.9);
}
```

### Example 2: Simplified Watch Icon

```javascript
// Source: Simplified from existing drawRoundWatch() (game.js lines 669-724)

function drawWatchIcon(ctx, cx, cy, r, isGolden) {
  // Case circle
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = isGolden ? '#B8860B' : '#2a7d4f';
  ctx.fill();

  // Cream dial
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.75, 0, Math.PI * 2);
  ctx.fillStyle = '#f5f0e8';
  ctx.fill();

  // Hour markers (just 12 and 6)
  ctx.fillStyle = '#333';
  ctx.fillRect(cx - 1.5, cy - r * 0.65, 3, 5);
  ctx.fillRect(cx - 1.5, cy + r * 0.6, 3, 5);

  // Hands
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx, cy - r * 0.5);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + r * 0.3, cy - r * 0.2);
  ctx.stroke();
}
```

### Example 3: Card Split Half Rendering

```javascript
// Source: Adapted from existing renderHalf() (game.js lines 539-588)

function renderHalf(ctx, half) {
  ctx.save();
  ctx.translate(half.x, half.y);
  ctx.rotate(half.rotation);
  ctx.globalAlpha = half.alpha;

  // Clip to one side (same vertical split as current)
  var clipW = half.width + half.spritePadding * 2;
  var clipH = half.height + half.spritePadding * 2;
  ctx.beginPath();
  if (half.clipSide === 'right') {
    ctx.rect(0, -clipH, clipW, clipH * 2);
  } else {
    ctx.rect(-clipW, -clipH, clipW, clipH * 2);
  }
  ctx.clip();

  // Blit full card sprite (clipping will show only one half)
  var p = half.spritePadding;
  ctx.drawImage(half.sprite,
    0, 0, half.sprite.width, half.sprite.height,
    -half.width / 2 - p, -half.height / 2 - p,
    half.width + p * 2, half.height + p * 2
  );

  ctx.restore();
}
```

### Example 4: Collision Detection with Card Dimensions

```javascript
// Source: Existing collision code (game.js lines 400-410), adapted for card size

// In checkSlashCollisions():
// Replace:  var hitRadius = w.size / 2 * 1.2;
// With:
var hitRadius = Math.max(w.width, w.height) / 2 * 1.1;
// The circle approximation covers the full card rectangle.
// The 10% expansion makes corners feel reachable.
```

### Example 5: Reduced Rotation for Readability

```javascript
// Source: New constraint for card readability (Pitfall 6)

// In spawnWatch() (or spawnCard()):
// Replace:  rotationSpeed: (Math.random() - 0.5) * 3
// With:
rotationSpeed: (Math.random() - 0.5) * 0.5  // gentle wobble, max ~15 deg/sec
```

## State of the Art

| Old Approach (v1.0) | New Approach (v1.1 Phase 04) | Why Changed | Impact |
|---------------------|------------------------------|-------------|--------|
| 3 watch drawing styles (round/square/sport) | 1 card drawing function | Cards replace watches for readability. Style variety was cosmetic, not gameplay-relevant. | ~200 lines removed, ~100 lines added. Net code reduction. |
| Brand text on tiny watch dial | Brand text on white card background, 14-16px bold | Primary readability improvement. This is the core reason for the phase. | Players can distinguish real/fake at a glance. |
| Circle collision hitbox | Circle approximation of rectangle | Cards are rectangular but circle collision still works with generous hitbox. | Zero collision code changes needed. |
| Per-frame watch drawing (~20 Canvas calls per watch) | Pre-rendered sprite blit (~1 drawImage per card) | Eliminates expensive per-frame shadow + path + text rendering. | Significant performance improvement on mobile. |
| Free rotation (watches spin freely) | Constrained wobble (cards tilt gently) | Readability requires text to stay mostly upright. | Rotation range reduced from full to ~+/-15 degrees. |

**Deprecated/outdated:**
- The three watch styles (round, square, sport) are removed entirely. Cards have one universal layout.
- The `drawBrandLabel()` function is removed. Brand name rendering is integrated into the card layout.
- The `WATCH_STYLES` array is removed.

## Open Questions

1. **Exact card dimensions for optimal mobile readability**
   - What we know: 80x110px is a reasonable starting point based on the current 60px watch diameter and Vinted's ~1:1.5 card ratio. The font size of 14-16px bold should be readable.
   - What's unclear: Whether this is large enough on all mobile screen sizes. A 5" phone vs a 6.7" phone have different effective sizes.
   - Recommendation: Start with 80x110px. If playtesting on the target device shows readability issues, scale up to 90x120px. The card dimensions should be a tunable constant, not hardcoded throughout.

2. **Whether to include a price tag on cards**
   - What we know: Vinted cards show prices. Adding a small price gives visual flavor and makes cards look more like real listings. The REQUIREMENTS.md defers "Price tag on Vinted cards" to v2 but the CONTEXT.md grants Claude discretion on this.
   - What's unclear: Whether the price tag adds visual clutter that hurts readability of the brand name (the critical element).
   - Recommendation: Include a small decorative price (e.g., "12 EUR" in 10px) below the brand name. Keep it visually subordinate. It adds authenticity without competing with the brand name.

3. **Whether the existing manual `roundRect` helper should be replaced or kept as fallback**
   - What we know: Native `ctx.roundRect()` is Baseline Widely Available since October 2025. The game targets mobile Chrome which has supported it since Chrome 99 (March 2022).
   - What's unclear: Whether any edge-case browsers in the target audience lack support.
   - Recommendation: Use native `ctx.roundRect()` for card rendering. Keep the manual helper for UI elements (score pill, buttons) where it is already used -- no reason to change working code.

## Sources

### Primary (HIGH confidence)
- [MDN: CanvasRenderingContext2D.roundRect()](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/roundRect) -- API documentation, browser compatibility, Baseline Widely Available since Oct 2025
- [MDN: Optimizing canvas](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Optimizing_canvas) -- Pre-rendering, shadowBlur avoidance, integer coordinates, batch operations
- [MDN: shadowBlur property](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/shadowBlur) -- Performance warning: "very expensive"
- [web.dev: Improving HTML5 Canvas Performance](https://web.dev/articles/canvas-performance) -- Pre-rendering offscreen, batching, state management, mobile limitations
- [BrandColorCode: Vinted](https://www.brandcolorcode.com/vinted) -- Vinted primary brand color: #007782 (Teal)
- Existing game.js (1381 lines) -- Full codebase analysis of current drawing, collision, split, and physics systems

### Secondary (MEDIUM confidence)
- [Jeffrey Thompson: Line/Rectangle Collision](https://www.jeffreythompson.org/collision-detection/line-rect.php) -- Line-segment-to-rectangle algorithm (used to evaluate option, decided against it)
- [Can I Use: roundRect](https://caniuse.com/mdn-api_canvasrenderingcontext2d_roundrect) -- Browser support data cross-referenced with MDN
- [Vinted.fr homepage](https://www.vinted.fr) -- Vinted card layout: 1:1.5 portrait ratio, borderRadius 6, product image top with text below

### Tertiary (LOW confidence)
- [Dribbble: Vinted designs](https://dribbble.com/tags/vinted) -- Design inspiration (not official Vinted specifications)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- Pure Canvas 2D API, no external dependencies, all methods Baseline Widely Available
- Architecture: HIGH -- Existing codebase fully analyzed, integration points clearly identified, patterns verified with MDN docs
- Pitfalls: HIGH -- Shadow performance, DPR handling, and split animation pitfalls identified from MDN optimization guide and existing codebase patterns
- Card visual design: MEDIUM -- Based on Vinted homepage analysis and Canvas 2D best practices, but exact readability on target device requires playtesting

**Research date:** 2026-02-08
**Valid until:** 2026-03-08 (stable platform, no fast-moving dependencies)
