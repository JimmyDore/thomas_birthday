# Architecture Research

**Domain:** HTML5 Canvas arcade game (Fruit Ninja-style)
**Researched:** 2026-02-07
**Confidence:** HIGH

HTML5 Canvas game architecture is a mature, stable domain. The patterns described below have been the standard for 10+ years and are universally used in browser-based 2D games. No external verification needed -- these are fundamental computer science / game development patterns.

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        GAME SHELL                               │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                      │
│  │  Splash  │  │  Playing  │  │  Game    │                      │
│  │  Screen  │→ │  State   │→ │  Over    │                      │
│  └──────────┘  └──────────┘  └──────────┘                      │
├─────────────────────────────────────────────────────────────────┤
│                        GAME LOOP                                │
│         requestAnimationFrame → update → render → repeat        │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │  Input   │  │  Physics │  │  Game    │  │ Renderer │       │
│  │  Handler │→ │  Engine  │→ │  Logic   │→ │ (Canvas) │       │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘       │
├─────────────────────────────────────────────────────────────────┤
│                        GAME STATE                               │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐                   │
│  │  Entities │  │  Score /  │  │  Config  │                   │
│  │  (watches)│  │  Timer   │  │  (tuning)│                   │
│  └───────────┘  └───────────┘  └───────────┘                   │
└─────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| **Game Loop** | Drives the entire game tick by tick at ~60fps | `requestAnimationFrame` callback with delta-time calculation |
| **Input Handler** | Captures and normalizes touch/swipe events | `touchstart`/`touchmove`/`touchend` listeners on canvas, stores swipe trail |
| **Physics Engine** | Moves entities along arcs, applies gravity | Simple Euler integration: `vy += gravity * dt; y += vy * dt` |
| **Game Logic** | Spawns watches, detects slashes, scores points | Collision detection between swipe trail and entity hitboxes |
| **Renderer** | Draws everything to the canvas each frame | `ctx.clearRect()` then draw background, entities, effects, UI overlay |
| **Game State** | Holds all mutable data (entities, score, timer) | Plain JS object or a few top-level variables |
| **Scene Manager** | Transitions between splash / playing / game-over | State machine with 3 states, each with its own update/render |

## Recommended Project Structure

For a simple birthday joke game with no build tooling, a single-file or minimal-file approach is ideal.

### Option A: Single File (Recommended)

```
/
├── index.html          # Everything: HTML + CSS + JS in one file
├── Dockerfile          # nginx static serve
├── nginx.conf          # SSL + domain config
└── .github/
    └── workflows/
        └── deploy.yml  # CI/CD
```

### Option B: Minimal Split (If file gets too long)

```
/
├── index.html          # HTML shell + CSS
├── game.js             # All game logic
├── assets/             # Optional: watch images if not drawn with Canvas
│   ├── montignac.png
│   └── fake.png
├── Dockerfile
├── nginx.conf
└── .github/
    └── workflows/
        └── deploy.yml
```

### Structure Rationale

- **Single file:** For a joke game with a 1-week deadline, splitting into modules adds zero value. One file means no module loading, no CORS issues, no build step. Open `index.html` in browser and it works.
- **Minimal split:** Only if `index.html` exceeds ~500 lines and becomes hard to navigate. A single `game.js` keeps things manageable without over-engineering.
- **No `src/` folder:** This is not an enterprise app. The game IS the project.

## Architectural Patterns

### Pattern 1: Fixed-Timestep Game Loop with requestAnimationFrame

**What:** The heartbeat of the game. `requestAnimationFrame` provides smooth 60fps rendering, while a fixed timestep ensures physics behaves consistently regardless of frame rate.

**When to use:** Every game. This is not optional.

**Trade-offs:** A fixed-timestep loop is slightly more complex than a naive "update with raw delta," but prevents physics bugs where objects tunnel through each other on slow frames. For this simple game, a simpler variable-timestep is acceptable since there is no rigid body collision that would break.

**Recommendation for Watch Ninja:** Use a simple variable-timestep loop. The physics (parabolic arcs) is forgiving enough that frame-rate variations will not cause visible bugs.

**Example:**
```javascript
let lastTime = 0;

function gameLoop(timestamp) {
  const dt = Math.min((timestamp - lastTime) / 1000, 0.05); // cap at 50ms to prevent spiral of death
  lastTime = timestamp;

  update(dt);
  render();

  requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);
```

### Pattern 2: Entity List with Spawn/Despawn

**What:** All game objects (watches) live in a flat array. Each frame, the update loop iterates the array, updates positions, and removes off-screen entities. A spawner adds new entities on a timer.

**When to use:** Any game with multiple similar objects appearing and disappearing.

**Trade-offs:** Simple and fast for <100 entities. No need for spatial partitioning, ECS frameworks, or object pools at this scale.

**Example:**
```javascript
const entities = [];

function spawnWatch() {
  entities.push({
    x: Math.random() * canvas.width,
    y: canvas.height + 50,
    vx: (Math.random() - 0.5) * 200,
    vy: -(400 + Math.random() * 200),  // launch upward
    radius: 40,
    isFake: Math.random() < 0.4,
    name: pickWatchName(),
    slashed: false,
    rotation: 0,
    rotationSpeed: (Math.random() - 0.5) * 5,
  });
}

function update(dt) {
  for (const e of entities) {
    e.vy += GRAVITY * dt;
    e.x += e.vx * dt;
    e.y += e.vy * dt;
    e.rotation += e.rotationSpeed * dt;
  }
  // Remove entities that fell off screen
  entities = entities.filter(e => e.y < canvas.height + 100);
}
```

### Pattern 3: Swipe Trail as Line Segments

**What:** Touch input is captured as a series of (x, y, timestamp) points. During update, each line segment between consecutive points is tested for intersection with entity hitboxes (circles). This is how Fruit Ninja detects slashes.

**When to use:** Any swipe-to-slash mechanic.

**Trade-offs:** Simple circle-line-segment intersection is O(entities * segments) per frame, which is trivially fast for <50 entities and <20 trail points.

**Example:**
```javascript
let swipeTrail = [];

canvas.addEventListener('touchmove', (e) => {
  e.preventDefault();
  const touch = e.touches[0];
  const rect = canvas.getBoundingClientRect();
  swipeTrail.push({
    x: (touch.clientX - rect.left) * (canvas.width / rect.width),
    y: (touch.clientY - rect.top) * (canvas.height / rect.height),
    time: performance.now(),
  });
});

canvas.addEventListener('touchend', () => {
  swipeTrail = [];
});
```

### Pattern 4: State Machine for Screens

**What:** The game has 3 screens (splash, playing, game over). A simple state machine controls which screen's update/render runs.

**When to use:** Any game with multiple screens. Even for 3 screens, this is cleaner than tangled conditionals.

**Trade-offs:** Slight overhead for a game this simple, but prevents spaghetti code as screens grow.

**Example:**
```javascript
const STATES = { SPLASH: 'splash', PLAYING: 'playing', GAME_OVER: 'gameOver' };
let currentState = STATES.SPLASH;

function update(dt) {
  switch (currentState) {
    case STATES.SPLASH:   updateSplash(dt); break;
    case STATES.PLAYING:  updatePlaying(dt); break;
    case STATES.GAME_OVER: updateGameOver(dt); break;
  }
}

function render() {
  switch (currentState) {
    case STATES.SPLASH:   renderSplash(); break;
    case STATES.PLAYING:  renderPlaying(); break;
    case STATES.GAME_OVER: renderGameOver(); break;
  }
}
```

## Data Flow

### Per-Frame Data Flow

```
requestAnimationFrame(timestamp)
    |
    v
[Calculate delta time]
    |
    v
[INPUT] Read swipe trail from touch event buffer
    |
    v
[SPAWN] Timer check → maybe spawn new watch entity
    |
    v
[PHYSICS] For each entity: apply gravity, update position, rotation
    |
    v
[COLLISION] For each swipe segment x entity: check intersection
    |    |
    |    v (hit detected)
    |    [GAME LOGIC] Mark entity slashed, update score, spawn slash effect
    |
    v
[CLEANUP] Remove off-screen entities, expired effects, old trail points
    |
    v
[RENDER] Clear canvas → draw background → draw entities → draw slash trail
         → draw slash effects → draw UI (score, timer) → draw overlay text
    |
    v
requestAnimationFrame(gameLoop)  // schedule next frame
```

### State Transitions

```
[SPLASH]
    | (tap anywhere)
    v
[PLAYING]
    | (timer runs out OR 3 missed real watches)
    v
[GAME OVER]
    | (tap to restart)
    v
[SPLASH] or [PLAYING]
```

### Key Data Flows

1. **Touch to slash:** `touchmove` event -> push to trail array -> collision check on next update -> mark entity as slashed -> score update -> visual effect spawn -> render slash animation
2. **Watch lifecycle:** Spawn timer fires -> create entity with random position/velocity/type -> physics updates each frame -> either slashed (triggers score) or falls off-screen (triggers miss penalty if real watch) -> removed from array
3. **Score flow:** Slash detected -> check `isFake` -> if real: `score += watchValue` -> if fake: `score -= penalty` -> UI re-renders score each frame

## Build Order (Dependency Graph)

This is the critical output for roadmap creation. Components have clear dependencies:

```
Phase 1: Foundation (nothing depends on, everything depends on this)
  ├── HTML/Canvas setup
  ├── Game loop (requestAnimationFrame + dt)
  └── Responsive canvas sizing

Phase 2: Core Mechanics (depends on Phase 1)
  ├── Entity spawning (watches appearing)
  ├── Physics (gravity, arcs) — depends on game loop
  ├── Rendering entities — depends on entities + canvas
  └── Touch input capture — depends on canvas

Phase 3: Gameplay (depends on Phase 2)
  ├── Swipe-to-slash collision detection — depends on input + entities
  ├── Score system (real vs fake) — depends on collision
  ├── Slash visual effects — depends on collision
  └── Game timer — depends on game loop

Phase 4: Game Flow (depends on Phase 3)
  ├── Splash screen — depends on state machine
  ├── Game over screen — depends on score + timer
  ├── State transitions — depends on all screens
  └── Difficulty ramping — depends on spawn + timer

Phase 5: Polish (depends on Phase 4)
  ├── Watch visuals (names, designs)
  ├── Birthday personalization
  ├── Animations (entry, slash, score popups)
  └── Juice (screen shake, particles)
```

### Why This Order

- **Canvas + game loop first** because literally everything else draws to the canvas and runs inside the loop. You cannot test anything without this.
- **Physics + entities before input** because you want to see watches flying before you add slashing. Visual feedback keeps development on track.
- **Input before scoring** because collision detection requires both entities and swipe trail to exist.
- **Game flow last** because splash/game-over screens are just conditional rendering once the core works. They don't affect core mechanics.
- **Polish is genuinely last** because it is pure visual refinement. The game is playable without it.

## Scaling Considerations

This is a single-player joke game. Scaling is a non-concern, but for completeness:

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 1 player on 1 phone | Current architecture. No changes needed. |
| Party of 10 passing phone around | Ensure game resets cleanly (no memory leaks from accumulated entities/effects) |
| Shared on social media, 100+ concurrent | Static file hosting handles this trivially. No server-side game state. |

### Performance Priorities

1. **First bottleneck:** Too many entities on screen at once (>50). Fix: cap spawn rate, ensure off-screen entities are cleaned up.
2. **Second bottleneck:** Canvas draw calls. Fix: avoid `drawImage` with rotation per entity if possible -- use `arc()` and `fillText()` for simple rendering. If using images, keep sprite count low.
3. **Not a bottleneck:** Touch events. Modern mobile browsers handle touch at 60-120hz easily.

## Anti-Patterns

### Anti-Pattern 1: Framework Overhead

**What people do:** Reach for Phaser, PixiJS, or Three.js for a simple 2D game.
**Why it's wrong:** For a game with <50 entities, simple physics, and 2D rendering, a framework adds 200KB-2MB of download, learning curve, and abstraction layers that slow development. The raw Canvas API is 20 lines to set up.
**Do this instead:** Use raw `<canvas>` with `getContext('2d')`. The Canvas 2D API provides everything needed: `fillRect`, `arc`, `drawImage`, `fillText`, transforms, gradients.

### Anti-Pattern 2: Premature Abstraction

**What people do:** Create `Entity`, `Component`, `System` classes, an event bus, a scene graph, an asset loader pipeline -- for a game with one entity type and three screens.
**Why it's wrong:** Adds days of architecture work for zero gameplay benefit. The game has watches. Just use an array of objects.
**Do this instead:** Plain objects in an array. Functions, not classes. If a function gets too long, extract a helper. No inheritance, no design patterns for their own sake.

### Anti-Pattern 3: Pixel-Perfect Canvas Sizing

**What people do:** Set canvas CSS size and forget about the `width`/`height` attributes, resulting in blurry rendering on high-DPI screens.
**Why it's wrong:** Canvas has a backing store resolution (the `width`/`height` attributes) separate from its CSS display size. If these don't account for `devicePixelRatio`, everything looks fuzzy on phones.
**Do this instead:**
```javascript
function resizeCanvas() {
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();
```

### Anti-Pattern 4: Forgetting Touch Event preventDefault

**What people do:** Add touch listeners but don't call `preventDefault()`, causing the browser to scroll, zoom, or trigger back-navigation on swipe.
**Why it's wrong:** The game becomes unplayable -- swiping triggers browser gestures instead of slashing.
**Do this instead:** Call `e.preventDefault()` in all touch handlers. Set `touch-action: none` in CSS on the canvas element. Use `<meta name="viewport" content="...user-scalable=no">` to prevent pinch zoom.

### Anti-Pattern 5: Time-Based Spawning Without Frame Independence

**What people do:** Spawn a watch every N frames instead of every N seconds.
**Why it's wrong:** On a 120hz phone, watches spawn twice as fast. On a lagging phone, they spawn half as fast. Gameplay varies wildly by device.
**Do this instead:** Track spawn with a real-time accumulator: `spawnTimer -= dt; if (spawnTimer <= 0) { spawn(); spawnTimer = spawnInterval; }`

## Integration Points

### External Services

None. This is a fully static, client-side game with zero external dependencies.

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| None | N/A | Fully self-contained static files |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Touch events -> Game state | Event listeners push to swipe trail array, game loop reads it | One-directional: DOM events write, game loop reads and clears |
| Game state -> Renderer | Renderer reads entity array + score + state each frame | Read-only: renderer never mutates game state |
| Game logic -> State machine | Game logic sets `currentState` on timer end or game over condition | Simple variable assignment, no event system needed |
| Spawner -> Entity array | Spawner pushes new objects into the entity array on timer | Direct array push, no abstraction needed |

## Sources

- Canvas 2D API: Stable W3C specification, universally supported across all modern browsers. No version concerns.
- `requestAnimationFrame`: Standard browser API since 2012. Universal support.
- Touch Events API: Standard browser API. Universal mobile support.
- Game loop patterns: Foundational game development knowledge (cf. "Game Programming Patterns" by Robert Nystrom, freely available at gameprogrammingpatterns.com). These patterns have been unchanged for decades.

**Confidence note:** All patterns described here are foundational, stable, and well-established. HTML5 Canvas game architecture has not meaningfully changed since 2015. No verification against current sources is needed -- this is equivalent to recommending "use a for-loop to iterate an array."

---
*Architecture research for: Watch Ninja (HTML5 Canvas arcade game)*
*Researched: 2026-02-07*
