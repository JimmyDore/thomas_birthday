# Project Research Summary

**Project:** Watch Ninja v1.1 — Vinted Cards, Buy/Sell, Sound Effects
**Domain:** Canvas 2D arcade game enhancement (visual redesign + multi-phase gameplay + audio)
**Researched:** 2026-02-08
**Confidence:** HIGH

## Executive Summary

Watch Ninja v1.1 adds three independent features to a deployed, working Canvas 2D mobile game: replacing circular watches with Vinted-style listing cards for readability, extending the single-round gameplay into a two-act buy-then-sell structure, and adding procedurally-generated sound effects. Research shows these features integrate cleanly into the existing 1381-line vanilla JavaScript architecture without requiring new dependencies or architectural changes.

The recommended approach leverages native browser APIs exclusively: Canvas 2D `roundRect()` with offscreen canvas caching for card rendering (eliminating the expensive shadow/text rendering on every frame), Web Audio API with procedural oscillator-based sound generation (zero audio files needed), and extension of the existing string-based state machine from 3 states to 5 states. The card redesign solves the core readability problem by moving brand names from 11px text on rotating watch dials to 14-16px bold text on white card backgrounds. The two-act structure reuses the existing physics, collision detection, and slash mechanics with different entity types and scoring semantics in Act 2.

Key risks are mobile-specific: AudioContext requires explicit user-gesture unlock (the "Jouer" button tap is the perfect hook point), card rendering performance requires offscreen canvas pre-rendering (not per-frame drawing), and the state machine expansion requires careful auditing of every `gameState` check to avoid impossible states. All three features can be built independently and tested in isolation before integration, minimizing compound risk.

## Key Findings

### Recommended Stack

All three features use native browser APIs with no new dependencies. The existing "zero dependencies, zero build tools" constraint is maintained.

**Core technologies:**
- **Canvas 2D `roundRect()`**: Native API for card shape (94.74% global support, Chrome 99+, Safari 16+) — replaces manual bezier helper with one-line native method
- **Offscreen canvas caching**: Pre-render cards once to offscreen canvas, stamp with `drawImage()` per frame — reduces 25+ draw calls per card to 1 `drawImage()` call
- **Web Audio API with procedural synthesis**: Generate all sound effects with oscillators + gain envelopes — zero audio files, zero loading complexity, consistent with project's handcrafted aesthetic
- **Extended string-based state machine**: Add `'buying'`, `'transition'`, `'selling'` states to existing `gameState` variable — scales cleanly from 3 to 5 states without introducing state library

**Critical version requirements:** None. All APIs are baseline available in mobile Chrome (target browser).

See [STACK.md](./STACK.md) for implementation patterns and code examples.

### Expected Features

The card redesign, two-act mechanic, and sound effects are well-defined feature sets with clear precedents.

**Must have (table stakes):**
- **White rounded-rectangle Vinted cards** — defines the visual identity, without this it doesn't read as a Vinted listing
- **Large readable brand name on cards** — THE critical readability fix, minimum 14-16px font on white background
- **Card splits in half on slash** — existing animation must adapt to rectangular cards (vertical or horizontal clip)
- **Clear act transition screen** — player must know when Act 1 ends and Act 2 begins (2-3 second interstitial)
- **Slash swoosh + hit/coin/penalty sounds** — core audio feedback for every slash action
- **AudioContext unlock on first user tap** — mobile browsers block autoplay, "Jouer" button tap unlocks audio

**Should have (competitive):**
- **Offscreen card caching** — performance requirement for 4-6 cards on screen simultaneously
- **Procedural sound generation** — avoids file loading complexity, fits arcade aesthetic
- **Act 2 independent difficulty curve** — selling phase needs different pacing than buying phase
- **Buyer character names in Act 2** — French parody names add comedy value ("Jean-Michel", "Kevin-le-Kiffeur")
- **Combo pitch escalation** — each consecutive slash plays at slightly higher pitch (musical satisfaction)

**Defer (v2+):**
- **Heart icon or Vinted watermark on cards** — purely decorative polish
- **Background music loop** — adds significant complexity for a 90-second game
- **Volume settings UI** — no settings screen exists, defer unless needed
- **Pre-recorded audio files** — procedural first, only switch if sounds feel wrong in playtesting

See [FEATURES.md](./FEATURES.md) for detailed feature analysis and Vinted card layout specifications.

### Architecture Approach

The existing single-file architecture (1381 lines, zero modules) supports all three features through additive extension. Card rendering replaces draw functions. State machine adds states. Audio adds a new subsystem that hooks into existing event points.

**Major components:**

1. **Card rendering system** — replaces `drawRoundWatch/drawSquareWatch/drawSportWatch` (200+ lines) with single `drawCard()` function; pre-renders to offscreen canvas on spawn; uses `drawImage()` for per-frame stamping; adapts `renderHalf()` to clip rectangular cards

2. **Two-act state machine** — extends `gameState` from `'start' -> 'playing' -> 'over'` to `'start' -> 'buying' -> 'transition' -> 'selling' -> 'over'`; adds `inventory[]` array to carry watches from Act 1 to Act 2; reuses physics/collision/trail for Act 2 with new entity type (buyer offers) and scoring logic

3. **Audio subsystem** — creates `AudioContext` on first user tap; generates sounds procedurally with `OscillatorNode` + `GainNode`; hooks into 8-10 game events (slash, coin, penalty, jackpot, combo, transition); no file loading, no audio sprites

**Key architectural insights:**
- Act 1 (`'buying'`) IS the current game, just renamed and shortened to ~35 seconds
- Act 2 (`'selling'`) reuses 100% of physics, trail, collision, particles — only entity draw function and scoring logic differ
- Audio is purely additive — can be dropped entirely without affecting gameplay
- Estimated new code: ~320 lines, bringing file to ~1700 lines (still single-file viable)

See [ARCHITECTURE.md](./ARCHITECTURE.md) for integration points, data flow, and reuse analysis.

### Critical Pitfalls

Research identified 16 domain pitfalls. Top 5 most critical:

1. **AudioContext suspended on mobile** — Chrome requires explicit `audioCtx.resume()` inside user gesture event handler; create AudioContext inside "Jouer" button tap handler or game has zero audio on mobile with no error message

2. **Card split animation looks broken** — current vertical clip assumes symmetric circular watches; rectangular cards with text/image layout split mid-character looking like torn UI; must redesign split alongside card renderer (horizontal clip or offscreen canvas + source-rect approach)

3. **State machine expansion creates impossible states** — extending from 3 to 5 states requires auditing EVERY `gameState` check in game loop, input handlers, rendering; missing one creates dead code paths; use `isPlaying()` helper instead of changing every `=== 'playing'` check

4. **Inventory corruption during act transition** — pushing watch object references into inventory array means Act 2 mutations corrupt Act 1 data; must clone data: `inventory.push({ brand: w.brand, value: w.value, isGolden: w.isGolden })`

5. **Card rendering performance regression** — 25+ draw calls per card (roundRect, shadow, text, illustrations) multiplied by 6 cards = 150+ calls per frame; pre-render to offscreen canvas ONCE on spawn, stamp with `drawImage()` each frame (1 call per card)

See [PITFALLS.md](./PITFALLS.md) for all 16 pitfalls with detection criteria and recovery strategies.

## Implications for Roadmap

Based on research, suggested phase structure reflects feature independence and risk isolation:

### Phase 1: Card Visual Redesign
**Rationale:** Pure visual change with zero gameplay impact — can be tested in isolation before touching state machine or audio. Highest-risk rendering change (replacing 200+ lines of drawing code) should be validated early.

**Delivers:**
- Vinted card shape with `roundRect()`, shadow, white background
- Watch illustration repositioned inside card top section
- Large readable brand name (14-16px) below illustration
- Price tag display
- Offscreen canvas caching for performance
- Updated split-half animation for rectangular cards
- Adjusted hitbox (circular approximation or rect collision)

**Addresses:**
- Card rendering from FEATURES.md (white card, brand name, price tag, split animation)
- Performance requirement (offscreen caching pattern from STACK.md)

**Avoids:**
- Pitfall 1 (split animation breaks) — redesign split alongside card renderer
- Pitfall 4 (hit detection shape mismatch) — tune hitbox radius with card dimensions
- Pitfall 6 (text unreadable) — validate 14-16px minimum font size
- Pitfall 9 (performance regression) — offscreen canvas from day one

**Research flag:** Standard Canvas 2D patterns — skip phase research. MDN docs + existing codebase sufficient.

---

### Phase 2: Sound Effects
**Rationale:** Independent of visual and gameplay changes — can be built and tested without touching card rendering or state machine. Second because it enhances Phase 1 results immediately (cards now slash with audio feedback).

**Delivers:**
- AudioContext initialization with mobile-safe user gesture unlock
- Procedural sound generation functions (oscillator + gain envelope)
- Core sounds: slash swoosh, hit impact, coin cha-ching, penalty buzz
- Optional premium sounds: golden jackpot jingle, combo milestone ding
- Integration hooks in `slashWatch()`, `updateWatches()`, state transitions
- Sound pool limiter (max 2-3 concurrent per sound type)

**Uses:**
- Web Audio API (AudioContext, OscillatorNode, GainNode) from STACK.md
- Procedural synthesis patterns from STACK.md (sawtooth for slash, sine for coin, square for penalty)

**Avoids:**
- Pitfall 2 (AudioContext suspended) — unlock in "Jouer" button tap handler
- Pitfall 7 (decode lag) — procedural generation has zero decode time
- Pitfall 10 (overlapping sounds distort) — sound pool with concurrent instance limit

**Research flag:** Standard Web Audio patterns — skip phase research. MDN docs cover all use cases.

---

### Phase 3: Two-Act Buy/Sell Mechanic
**Rationale:** Most complex feature — requires state machine expansion, inventory data structure, Act 2 entity type, transition screen, and independent difficulty tuning. Last because it depends on card rendering being stable (Act 2 renders offer cards) and benefits from sound being available (Act 2 interactions have audio feedback).

**Delivers:**
- Extended state machine: `'buying'`, `'transition'`, `'selling'` states
- Inventory array populated during Act 1, consumed during Act 2
- Act 1 timer shortened to ~35 seconds (existing gameplay, renamed)
- Transition screen (2-3 second auto-advance, shows inventory count)
- Act 2 entity type: buyer offers (name + price on card-like layout)
- Act 2 scoring: slash good offers (profit), avoid lowballs (penalty)
- Independent Act 2 difficulty curve
- Combined game-over screen with two-act stats
- Updated `resetGame()` to clear all new state

**Implements:**
- State machine extension from ARCHITECTURE.md
- Inventory data flow from ARCHITECTURE.md
- Offer card rendering (variant of Phase 1 card renderer)
- Act 2 physics reuse (same updateWatches, collision, trail)

**Avoids:**
- Pitfall 3 (impossible states) — audit all gameState checks, use isPlaying() helper
- Pitfall 5 (inventory corruption) — clone data into inventory, never share references
- Pitfall 8 (Act 2 pacing identical) — independent difficulty function for Act 2
- Pitfall 14 (resetGame incomplete) — audit resets after every new variable

**Research flag:** Novel game mechanic combination (Fruit Ninja + Recettear) — consider `/gsd:research-phase` for Act 2 scoring/pacing if design feels unclear during planning. State machine extension and inventory are standard patterns.

---

### Phase Ordering Rationale

- **Cards first** because visual change is highest-risk (200+ line replacement) and completely independent — must validate early
- **Sound second** because it's also independent but enhances cards immediately — adding audio to slashed cards creates satisfying feedback loop
- **Buy/sell last** because it's the most complex integration — depends on cards being stable (Act 2 renders offer cards) and benefits from sound existing (Act 2 has audio feedback)
- **Dependencies:** Phase 3 reads Phase 1's card dimensions for offer card rendering. Phase 3 benefits from Phase 2's audio hooks being available. Phases 1 and 2 are independent of each other.

This ordering isolates risk: if cards break, state machine and audio are untouched. If audio has issues, gameplay still works. Only Phase 3 integrates everything.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 3 (Act 2 scoring/pacing):** Novel mechanic (slash-to-accept offers) has fewer direct precedents than Phase 1 (card rendering) or Phase 2 (game audio). If scoring logic feels unclear during planning, use `/gsd:research-phase` to research buyer offer patterns from shop management games (Recettear, Moonlighter reaction systems).

Phases with standard patterns (skip research):
- **Phase 1 (Card rendering):** Well-documented Canvas 2D patterns (roundRect, offscreen canvas, drawImage). MDN docs + STACK.md sufficient.
- **Phase 2 (Sound effects):** Well-documented Web Audio API patterns (OscillatorNode, GainNode, mobile unlock). MDN docs + STACK.md sufficient.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All APIs verified in MDN, baseline available, zero new dependencies validated |
| Features | HIGH | Vinted card UI researched from multiple case studies; game audio patterns from MDN + Fruit Ninja analysis; buy/sell from Recettear/Moonlighter precedents |
| Architecture | HIGH | Existing codebase fully analyzed (1381 lines); integration points identified; reuse vs new code quantified (~320 new lines) |
| Pitfalls | HIGH | 16 pitfalls extracted from MDN warnings, codebase analysis, mobile browser restrictions, Canvas performance docs |

**Overall confidence:** HIGH

### Gaps to Address

Research was comprehensive with high-quality sources. Minor gaps to validate during implementation:

- **Act 2 difficulty tuning:** Research identified that Act 2 needs independent difficulty curve (not Act 1's curve), but exact spawn rate, offer timing, and duration require playtesting. Plan to allocate tuning time in Phase 3.

- **Card dimensions vs spawn density:** Research recommends ~80x110px cards (larger than current 60px watches). Spawn arc tuning from v1.0 may need adjustment for larger visual footprint. Plan to re-tune spawn parameters after finalizing card dimensions in Phase 1.

- **Split animation direction:** Research flags that vertical clip (current approach) may not work well for rectangular portrait cards. Horizontal clip or offscreen-canvas-with-source-rect are alternatives. Design decision needed in Phase 1 — test both approaches.

- **Procedural sound quality:** Research strongly recommends procedural synthesis (zero files, instant availability, arcade aesthetic). If sounds feel "too synthy" during Phase 2 playtesting, fallback to 3-4 small pre-recorded MP3s (slash, coin, penalty, jackpot). Keep procedural as first implementation.

All gaps are "validate during implementation" rather than "research incomplete." No additional research phase needed before roadmap creation.

## Sources

### Primary (HIGH confidence)
- [MDN CanvasRenderingContext2D.roundRect()](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/roundRect) — Native roundRect API, browser support
- [MDN Optimizing Canvas](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Optimizing_canvas) — Offscreen canvas caching, shadowBlur perf warning
- [MDN Audio for Web Games](https://developer.mozilla.org/en-US/docs/Games/Techniques/Audio_for_Web_Games) — Web Audio vs HTML5 Audio, mobile restrictions
- [MDN Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API) — OscillatorNode, GainNode, AudioContext
- [MDN Web Audio API Best Practices](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices) — AudioContext creation timing
- [Chrome Web Audio Autoplay Policy](https://developer.chrome.com/blog/web-audio-autoplay) — User gesture requirement, suspended state
- [web.dev Canvas Performance](https://web.dev/articles/canvas-performance) — Pre-rendering patterns, batch drawing
- [Can I Use roundRect](https://caniuse.com/mdn-api_canvasrenderingcontext2d_roundrect) — 94.74% global support, version numbers
- Existing codebase: `/Users/jimmydore/Projets/thomas_birthday/game.js` (1381 lines) — Integration points, current patterns

### Secondary (MEDIUM confidence)
- [Vinted Redesign Case Studies](https://medium.com/@castillogarcialourdes/vinted-redesign-2cf32e0619a8) — Card UI element inventory (white card, brand name, price tag, heart icon)
- [Recettear Analysis](https://www.gamedeveloper.com/design/saving-the-world-through-profit--recettear-an-item-shop-s-tale-analysis-) — Two-phase collect/sell mechanic patterns
- [Moonlighter Wiki: Selling and Reactions](https://moonlighter.fandom.com/wiki/Selling_and_Reactions) — Five-tier pricing reaction system
- [Fruit Ninja Sound Effects](https://sounds.spriters-resource.com/mobile/fruitninja/) — Sound category inventory (slash, impact, combo, penalty)
- [Juice in Game Design](https://garden.bradwoods.io/notes/design/juice) — Feedback principles (audio + visual + haptic layering)

### Tertiary (LOW confidence)
- None — all research findings verified with multiple sources or official documentation

---
*Research completed: 2026-02-08*
*Ready for roadmap: yes*
