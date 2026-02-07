# Project Research Summary

**Project:** Watch Ninja (Fruit Ninja-style birthday game)
**Domain:** HTML5 Canvas mobile browser arcade game
**Researched:** 2026-02-07
**Confidence:** HIGH

## Executive Summary

Watch Ninja is a Fruit Ninja-style arcade game for mobile browsers, themed around Thomas's Vinted watch-flipping hobby. Research shows this should be built as a **pure vanilla JavaScript project with HTML5 Canvas 2D** — zero dependencies, zero build tools. The game's scope (single 60-90 second round, birthday joke for one person) means every library is overhead that slows delivery without proportional benefit.

The recommended approach is dead simple: HTML5 Canvas for rendering, Pointer Events API for touch input, `requestAnimationFrame` for the game loop, and nginx in Docker for deployment. Total development time: 2-3 days to a polished, shippable birthday game. The architecture follows standard Canvas game patterns that have been stable for a decade: entity list with spawn/despawn, swipe trail as line segments, state machine for screens, and line-to-circle hit detection.

The critical risks are all mobile-specific pitfalls: preventing touch scroll/zoom interference, handling device pixel ratio for sharp rendering, and using line-segment intersection (not point-in-rect) for slash detection. All are easily avoided if addressed from the start in Phase 1 foundation work. The biggest UX risk is missing the "game feel" details — slash trails, split animations, feedback text — that make Fruit Ninja satisfying. These belong in Phase 2 core gameplay, not deferred to polish.

## Key Findings

### Recommended Stack

**Zero dependencies. Vanilla JS + Canvas 2D + nginx.**

For a birthday joke game that ships in under a week, every library is a liability. HTML5 Canvas 2D provides all rendering needs natively (sprites, bezier curves, particles). Mobile Chrome supports all modern ES2020+ features without transpilation. The entire stack is browser APIs that have been stable for 5+ years.

**Core technologies:**
- **HTML5 Canvas 2D Context (native):** Render watches, slashes, particles, score — zero dependencies, universal mobile Chrome support, perfect for 2D sprite games
- **Vanilla JS ES2020+ (native):** All game logic and input handling — ship `.js` files directly, no build tools, no transpilation
- **Pointer Events API (native):** Unified touch/mouse API for swipe detection — simpler than Touch Events, works across devices, makes desktop testing easy
- **nginx:alpine in Docker:** Serve static files — already specified in project requirements, no server-side logic needed
- **HTML5 `<audio>` elements (optional):** Sound effects if desired — simplest option, though PROJECT.md marks audio as out of scope

**Critical mobile configuration (often missed):**
- Viewport meta tag: `width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no`
- Canvas CSS: `touch-action: none` to prevent scroll/zoom on swipes
- Body CSS: `overflow: hidden; position: fixed` to prevent iOS bounce scroll
- Canvas sizing: Handle `devicePixelRatio` for sharp rendering on high-DPI screens

**Rejected alternatives:**
- Game frameworks (Phaser, PixiJS, Kaplay) — 200KB-2MB overhead for features this game never uses
- TypeScript — adds build step for minimal type safety benefit in a 500-line joke game
- WebGL — overkill for 2D sprites; Canvas 2D handles 50+ sprites at 60fps trivially
- Build tools (Webpack, Vite) — unnecessary when shipping native ES modules

### Expected Features

**Table stakes (must have — these 10 features define Fruit Ninja):**
- Objects flying across screen in parabolic arcs (random launch from bottom)
- Swipe-to-slash gesture with touch input
- Slash trail visual following finger (fades after 300ms)
- Object split animation (halves tumble with physics and rotation)
- Score display (for Watch Ninja: profit in euros, prominently shown)
- Game timer (60-90 seconds) or life system (timer is simpler for a joke game)
- Game over screen with final score and birthday message
- Start screen with title and play button
- Increasing difficulty over time (spawn rate and speed ramp up)
- Bomb/penalty mechanic (for Watch Ninja: fake watches you must NOT slash)

**Differentiators (watch-theme humor — these ARE the joke):**
- Real vs fake watch identification (Montignac vs Montignak/Montinyac)
- Euro profit scoring ("+50 EUR — Bonne affaire!" / "-20 EUR — Arnaque!")
- Progressively sneakier fake names (difficulty curve through the humor itself)
- Personalized birthday message on game over ("Joyeux anniversaire Thomas!")
- "Bonne affaire!" / "Arnaque!" slash feedback text (flies up on each slash)
- Watch images/sprites with readable brand labels
- Special golden watch (rare Rolex bonus worth +200 EUR)
- Vinted seller rating on game over (humor: "Thomas — Vendeur Pro" or "Arnaqueur")

**Anti-features (deliberately NOT building):**
- Persistent progression / unlockables — no one grinds a birthday joke game
- Leaderboard / online high scores — single-player, at most localStorage
- Multiple game modes — one timed mode is correct for a joke
- Sound effects and music — marked out of scope in PROJECT.md
- Tutorial / onboarding — everyone knows how Fruit Ninja works
- Pause menu / settings — 60-90 seconds needs no pause
- Responsive desktop layout — mobile-only per PROJECT.md
- Complex physics engine (Matter.js, etc.) — hand-code gravity in 20 lines
- Internationalization — hardcode French strings for Thomas
- Analytics / telemetry — it's a birthday joke, not a SaaS product

**MVP timeline:**
- Phase 1 (playable game): 1-2 days
- Phase 2 (polished joke): 0.5-1 day
- Total to shippable: 2-3 days

### Architecture Approach

**Standard HTML5 Canvas game architecture with minimal structure.**

For a birthday joke game, single-file or minimal-file structure is ideal. The game is simple enough for hand-rolled vanilla patterns without framework overhead. Use `requestAnimationFrame` game loop with delta-time, entity list with spawn/despawn, swipe trail as line segments, and state machine for three screens (splash, playing, game-over).

**Major components:**
1. **Game Loop** — `requestAnimationFrame` callback drives everything at ~60fps with delta-time calculation for frame-rate independence
2. **Input Handler** — Pointer Events API captures swipe as series of (x, y, timestamp) points for collision detection
3. **Physics Engine** — Simple Euler integration for gravity and parabolic arcs (`vy += gravity * dt; y += vy * dt`)
4. **Game Logic** — Spawns watches on timer, detects line-segment-to-circle collisions between swipe trail and watch hitboxes, updates score
5. **Renderer** — Each frame: clear canvas, draw background, entities (back-to-front), slash trail, UI overlay
6. **State Machine** — Three states (SPLASH, PLAYING, GAME_OVER) with separate update/render for each
7. **Entity List** — Flat array of watch objects with spawn/despawn lifecycle, cleanup for off-screen entities

**Architectural patterns:**
- **Fixed (variable) timestep game loop:** Simple variable-timestep is acceptable for forgiving parabolic physics (no rigid body collision)
- **Entity spawning:** Plain array of objects, add on timer, remove when off-screen or slashed
- **Swipe trail as line segments:** Check intersection between consecutive points and entity circles (not point-in-rect)
- **State machine:** Prevents spaghetti code as screens grow, even for 3 screens

**Project structure (recommended):**
```
/
├── index.html          # HTML + CSS + JS in one file (or split if >500 lines)
├── game.js             # (optional split) All game logic
├── assets/             # (optional) Watch PNGs if not drawn with Canvas
├── Dockerfile          # nginx:alpine static serve
├── nginx.conf          # SSL + domain config
└── .github/workflows/  # CI/CD
```

**File organization rationale:** Single file is fastest to ship. Only split if `index.html` exceeds 500 lines. No `src/` folder, no build step, no module bundler. Open `index.html` and it works.

### Critical Pitfalls

Research identified 11 critical pitfalls. Top 5 by impact:

1. **Touch events trigger scroll/zoom/browser chrome** — Swipes scroll the page instead of slashing watches. The game feels broken on first touch on a real phone despite working in DevTools. **Prevention:** `touch-action: none` CSS, `event.preventDefault()` in touch handlers, proper viewport meta tag, `overflow: hidden` on body. **Phase:** Foundation (Phase 1).

2. **Canvas not sized for device pixel ratio** — Text and sprites render blurry on high-DPI mobile screens (all modern phones). Looks amateur despite correct logic. **Prevention:** Set `canvas.width/height = cssSize * devicePixelRatio`, call `ctx.scale(dpr, dpr)`. **Phase:** Foundation (Phase 1).

3. **Hit detection uses point-in-rect instead of swipe path intersection** — Fast swipes miss watches because no single touch sample lands inside the hitbox. Game punishes natural Fruit Ninja fast-slash gesture. **Prevention:** Check LINE SEGMENT to CIRCLE intersection between consecutive touch points, not point-in-rect. **Phase:** Core Gameplay (Phase 2).

4. **No swipe trail visual** — Player sees no feedback that input was registered. Game feels laggy even if hit detection works. **Prevention:** Draw fading trail connecting recent touch points each frame. Implement BEFORE hit detection — visual feedback is more important than accuracy. **Phase:** Core Gameplay (Phase 2).

5. **Game loop tied to setInterval instead of requestAnimationFrame** — Inconsistent frame timing, stuttery animations, battery drain. Game runs at unpredictable speeds. **Prevention:** Use `requestAnimationFrame` exclusively, calculate delta-time, make all movement use `velocity * dt`. **Phase:** Foundation (Phase 1).

**Other critical pitfalls:**
- Touch coordinate mapping ignores canvas offset (Phase 1)
- Spawning objects without considering mobile portrait proportions (Phase 2)
- Memory leaks from unbounded object arrays (Phase 2)
- 300ms touch delay on older mobile browsers (Phase 1 — solved by viewport meta tag)
- Canvas clearing strategy causes flicker or ghost trails (Phase 1)
- Image loading race condition on game start (Phase 1 — needs simple preloader)

**UX pitfalls (game works but feels bad):**
- No visual feedback on successful slash (add split halves, score popup, particles)
- Score text positioned where thumb covers it (place at top-center)
- No distinction between real and fake watches (make them visibly different)
- Game starts immediately on page load (needs start screen)
- No game-over state or replay option (this IS the punchline — don't skip it)

## Implications for Roadmap

Based on architecture dependencies and pitfall prevention, suggested phase structure:

### Phase 1: Foundation & Game Loop
**Rationale:** Everything depends on canvas setup and game loop. Cannot test any gameplay until this exists. Critical mobile pitfalls (touch scroll, DPR, coordinate mapping) must be solved upfront or they waste time during development.

**Delivers:**
- HTML/CSS boilerplate with proper viewport meta, touch-action CSS, responsive canvas
- Canvas setup with devicePixelRatio handling (sharp rendering)
- `requestAnimationFrame` game loop with delta-time calculation
- Touch input capture with proper coordinate mapping and preventDefault
- State machine scaffold (SPLASH, PLAYING, GAME_OVER states)
- Image preloader (even if using simple graphics — prevents race conditions)

**Addresses features:**
- Foundation for all table stakes
- Prevents touch scroll/zoom interference (Pitfall 1)
- Prevents blurry rendering (Pitfall 2)
- Prevents setInterval timing issues (Pitfall 5)
- Prevents touch coordinate bugs (Pitfall 6)
- Prevents image loading race (Pitfall 11)

**Avoids pitfalls:**
- All Phase 1 pitfalls from PITFALLS.md
- Sets up proper patterns before bad habits form

**Time estimate:** 0.5-1 day

---

### Phase 2: Core Gameplay Mechanics
**Rationale:** With foundation in place, build the satisfying Fruit Ninja loop: watches fly, player swipes, watches split. This is where "game feel" lives. Slash trail and split animation are NOT polish — they're core satisfaction mechanics that must be tuned before moving to game flow.

**Delivers:**
- Entity spawning system (watches launch from bottom in parabolic arcs)
- Physics update (gravity, velocity, rotation)
- Rendering watches (circles, simple graphics, or PNGs)
- Swipe trail rendering (fading line following finger) — MUST come before hit detection
- Line-segment-to-circle collision detection (slash intersects watch)
- Watch split animation (two halves tumble with rotation and outward velocity)
- Real vs fake watch types (Montignac vs Montignak, euro values)
- Score system (profit in euros, updates on slash)
- Particle effects on slash (small burst for juice)

**Addresses features:**
- Objects flying across screen (table stakes)
- Swipe-to-slash gesture (table stakes)
- Slash trail visual (table stakes)
- Object split animation (table stakes — this IS the satisfaction)
- Score display (table stakes)
- Real vs fake watch identification (differentiator)
- Euro profit scoring (differentiator)

**Avoids pitfalls:**
- No swipe trail = feels unresponsive (Pitfall 5)
- Point-in-rect hit detection = fast swipes miss (Pitfall 3)
- Mobile portrait spawn proportions (Pitfall 7)
- Memory leaks from unbounded arrays (Pitfall 8)

**Uses stack:**
- Canvas 2D drawing (arcs, lines, bezier curves for trail)
- Pointer Events API (swipe capture)
- Simple physics (no library needed)

**Time estimate:** 1-1.5 days

---

### Phase 3: Game Flow & Timer
**Rationale:** With satisfying core mechanics, add the structure that makes it a complete game: start screen, timer countdown, difficulty ramp, game over. These are conditional rendering and state transitions — straightforward once core loop works.

**Delivers:**
- Start screen (title, "Jouer" button, maybe swipe-to-start watch)
- Countdown timer (60-90 seconds displayed on HUD)
- Difficulty ramping (spawn rate and speed increase over time)
- Game over detection (timer expires)
- Game over screen with final profit, birthday message, restart button
- Screen transitions (SPLASH → PLAYING → GAME_OVER)

**Addresses features:**
- Game timer (table stakes)
- Start screen (table stakes)
- Game over screen with final score (table stakes)
- Increasing difficulty over time (table stakes)
- Birthday message (differentiator — this IS the punchline)

**Implements architecture:**
- State machine transitions
- Timer-based game logic

**Time estimate:** 0.5 day

---

### Phase 4: Polish & Humor
**Rationale:** The game is now playable. Add the watch-theme-specific humor and visual polish that make it personal for Thomas. These are quick wins that maximize the joke impact.

**Delivers:**
- Progressively sneakier fake watch names (Montignak → Montinyac → Montiganc)
- "Bonne affaire!" / "Arnaque!" floating text on slash
- Watch sprites with readable brand labels (vs plain circles)
- Special golden Rolex watch (rare, high value bonus)
- Vinted seller rating on game over screen
- Screen shake on penalty slash
- Generous hit detection tuning (slightly larger hitboxes)
- Final birthday message polish

**Addresses features:**
- Progressively sneakier fake names (differentiator)
- Slash feedback text (differentiator)
- Watch images with labels (differentiator)
- Special watches (differentiator)
- Vinted rating (differentiator)

**Time estimate:** 0.5-1 day

---

### Phase 5: Deployment
**Rationale:** Game is complete and tested. Ship it to VPS with HTTPS on custom domain.

**Delivers:**
- Dockerfile with nginx:alpine
- nginx.conf with SSL
- GitHub Actions CI/CD pipeline
- Custom domain DNS + Let's Encrypt SSL
- OG meta tags for nice link preview when sharing

**Uses stack:**
- nginx, Docker (per PROJECT.md requirements)

**Time estimate:** 0.5 day (could be parallel with Phase 4)

---

### Phase Ordering Rationale

**Why this order:**
1. **Foundation first** because everything draws to canvas and runs in the loop. No testing possible without this.
2. **Core gameplay before game flow** because you need to see watches flying and slashing working before wrapping it in menus. Visual feedback keeps development on track.
3. **Slash trail before hit detection** because perceived responsiveness (visual feedback) matters more than accuracy. A visible trail makes imperfect collision feel good; perfect collision without trail feels broken.
4. **Polish genuinely last** because it's pure refinement. The game is playable without golden watches and Vinted ratings.
5. **Deployment after game works** to avoid premature infrastructure work.

**Dependency flow:**
```
Phase 1 (Foundation)
    ├── Canvas, game loop, touch input
    └── ENABLES →
        Phase 2 (Core Gameplay)
            ├── Spawning, physics, collision, split animation
            └── ENABLES →
                Phase 3 (Game Flow)
                    ├── Start, timer, game over, difficulty
                    └── ENABLES →
                        Phase 4 (Polish)
                            └── Humor details, feedback text, special watches
```

**How this avoids pitfalls:**
- Phase 1 solves all foundational mobile pitfalls before they can waste time
- Phase 2 uses line-segment collision and swipe trail from the start (not retrofitted)
- Phase 3 waits until core loop is fun (no point in menus for an unsatisfying game)
- Phase 4 is safe to iterate on because core mechanics are locked

### Research Flags

**Phases with standard patterns (skip deep research):**
- **Phase 1:** Foundation patterns are well-documented, stable for 10+ years. Use Canvas 2D API docs from MDN if needed.
- **Phase 2:** Fruit Ninja clone tutorials are abundant. Line-circle intersection is basic geometry. No research needed.
- **Phase 3:** State machine and timer are trivial patterns.
- **Phase 4:** Pure content/asset work, no technical unknowns.
- **Phase 5:** Standard Docker/nginx/SSL setup. Use existing deployment docs.

**Phases unlikely to need `/gsd:research-phase`:** All phases. This project uses only mature, stable browser APIs and common game patterns. No niche integrations, no bleeding-edge tech, no complex algorithms.

**If research IS needed during planning:**
- Phase 2 might benefit from refreshing on line-segment-to-circle intersection math (but this is basic geometry, not deep research)
- Phase 5 might need quick reference for nginx SSL config if unfamiliar

**Overall:** This is a well-trodden path. Research-phase would be overkill for any phase. The current research provides everything needed.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | **HIGH** | HTML5 Canvas 2D, Pointer Events, requestAnimationFrame are stable W3C standards unchanged since 2015-2019. No library versions to verify. |
| Features | **HIGH** | Fruit Ninja mechanics are well-documented and stable since 2010. This is settled game design knowledge. |
| Architecture | **HIGH** | Canvas game loop patterns are foundational CS/game-dev knowledge, stable for decades. |
| Pitfalls | **HIGH** | Mobile Canvas game pitfalls are well-documented in the community. These are common, avoidable mistakes with known solutions. |

**Overall confidence:** **HIGH**

### Gaps to Address

**No significant gaps.** All findings are based on mature, stable technologies and well-documented patterns.

**Minor areas that need validation during implementation:**
- **Exact watch sprite art style:** Research suggests simple readable graphics. Actual visual design (hand-drawn vs PNG photos vs stylized icons) is a creative decision to make during Phase 4. Test readability of brand names at game speed.
- **Optimal spawn rate tuning:** Research suggests 1-2 watches early, 3-4 peak. Exact timing curves need playtesting on real device during Phase 2.
- **Timer duration (60 vs 90 seconds):** Research suggests 60-90 seconds. Pick 60 for faster testing loops; extend to 90 if playtesting shows it's too short.
- **Fake name difficulty progression:** Research lists example fake names. The full list and when to introduce trickier names needs design during Phase 4.

**How to handle gaps:**
- All gaps are tuning/creative decisions, not technical unknowns
- Playtest on real mobile Chrome device starting in Phase 2
- Iterate on spawn rate, timer, and fake names based on feel
- Default to simpler/faster for MVP, add complexity if time allows

## Sources

### Primary (HIGH confidence)
- **HTML5 Canvas 2D API:** W3C standard, stable since 2015, universally supported. Training data documentation is current.
- **Pointer Events API:** W3C standard, supported in all browsers since 2019. Training data documentation is current.
- **Fruit Ninja game design:** 14-year-old game with unchanging core mechanics, extensively documented in game dev community.
- **Canvas game architecture patterns:** Foundational game programming knowledge (cf. "Game Programming Patterns" by Robert Nystrom). Stable for decades.
- **PROJECT.md context:** Project specification from `.planning/PROJECT.md`.

### Research Limitations
- **Web search unavailable:** All findings based on training data (cutoff: January 2025).
- **NPM registry unavailable:** Could not verify exact latest versions of Phaser, PixiJS, etc. (irrelevant since recommendation is zero libraries).
- **Live Chrome version testing unavailable:** Could not verify behavior on latest mobile Chrome. However, Canvas 2D API and Pointer Events are stable standards unlikely to have changed.

### Assessment of Risk from Limitations
**LOW risk.** The recommended stack uses only native browser APIs standardized 5-10 years ago. No cutting-edge features, no library version drift concerns. The patterns described are fundamentals that do not change.

**Verification recommended during Phase 1:** Test on actual mobile Chrome device to confirm touch-action CSS, preventDefault, and DPR handling work as expected. This is standard QA, not research.

---

*Research completed: 2026-02-07*
*Ready for roadmap: yes*
*Next step: Roadmap creation with phase structure from "Implications for Roadmap" section*
