# Feature Landscape

**Domain:** Vinted card visual redesign, two-act buy/sell mechanic, and sound effects for Fruit Ninja-style browser arcade game
**Researched:** 2026-02-08
**Milestone:** v1.1 -- Vinted Cards & Buy/Sell
**Confidence:** HIGH for Vinted card visuals and sound design patterns, MEDIUM for two-act mechanic (novel design, fewer direct precedents)

---

## Feature Dimension 1: Vinted Card Visual Redesign

### Context

Current watches are Canvas-drawn shapes (round, square, sport) with tiny brand text (~13px on a 60px sprite). The brand name -- the entire core mechanic -- is nearly unreadable on mobile. The redesign replaces watch drawings with Vinted-style listing cards where the brand name is the dominant visual element.

### Vinted Card Anatomy (What Users Recognize)

A Vinted listing card has these recognizable elements, ordered by visual prominence:

| Element | Visual Weight | Recognition Value | Implementation Notes |
|---------|--------------|-------------------|---------------------|
| **Product photo** | Dominant (70% of card area) | HIGH -- defines a Vinted listing | Watch illustration occupies the top portion of the card |
| **Price tag** | High | HIGH -- always visible, often in teal badge | Euro price, bottom-left or overlaid on photo |
| **Brand name** | Medium-High | HIGH -- crucial for watch identification | Below photo, bold text -- THIS IS THE CORE MECHANIC |
| **Heart/favorite icon** | Low | MEDIUM -- recognizable Vinted element | Top-right corner, empty heart outline |
| **Size / condition badge** | Low | LOW -- secondary info | Small text below brand, optional |
| **White card background** | Structural | HIGH -- distinguishes card from background | Rounded rectangle with subtle shadow |
| **Vinted teal color accent** | Accent | MEDIUM -- brand identity | Price badge, small UI elements |

**Vinted's brand colors:** Teal/dark cyan (#007782 -- already used in the game's background gradient!), white cards, dark text. The game is already accidentally on-brand.

**Confidence:** MEDIUM. Based on multiple Vinted redesign case studies and marketplace card UI conventions. I could not access Vinted's actual current app screenshots to verify exact current layout. The elements listed above are consistent across all sources and match what any Vinted user would recognize.

### Table Stakes for Vinted Card Feature

| Feature | Why Expected | Complexity | Dependencies |
|---------|--------------|------------|-------------|
| **White rounded-rectangle card** | Defines the card shape. Without this, it does not read as a Vinted listing. | Low | Existing `roundRect()` helper already in codebase |
| **Watch illustration on card** | The product image area. Can be a simplified version of current watch drawings, positioned in the upper portion of the card. | Low | Existing `drawRoundWatch/drawSquareWatch/drawSportWatch` functions, repositioned |
| **Large readable brand name** | THE most critical element. The brand name must be legible at game speed. Font size needs to be 16-20px minimum on mobile, not the current ~13px crammed inside the watch dial. | Low | Replaces current `drawBrandLabel()` -- move text below watch illustration, increase size |
| **Price tag** | Reinforces the Vinted marketplace theme. Shows the watch's value. | Low | New element, but simple Canvas text/rect |
| **Card splits in two halves on slash** | The split animation must work on cards, not just circles. The card tears in half satisfyingly. | Medium | Must adapt `createSplitHalves()` and `renderHalf()` to clip rectangular cards instead of circular watches |
| **Cards still readable while rotating/flying** | Cards must be large enough that brand text is legible even while tumbling through the air at speed. | Medium | Sizing and rotation speed tuning. May need to reduce rotation speed or increase card size |

### Differentiators for Vinted Card Feature

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Heart icon (top-right)** | Instantly recognizable Vinted detail. Pure visual polish. | Low | Simple outline heart drawn with Canvas bezier curves or Unicode character |
| **"Vinted" watermark/logo text** | Small "Vinted" text at top of card. Drives the parody home. | Low | Tiny text element, purely decorative |
| **Condition badge** | "Bon etat" / "Neuf" badge. Adds realism to the card. | Low | Small colored badge, text overlay |
| **Color-coded card border for fakes** | Sneaky fakes use identical green cards (like real). Non-sneaky fakes get red-tinted border. Keeps existing difficulty mechanic. | Low | Maps to existing `sneaky` property -- just change card border/accent color |
| **Card entrance animation** | Cards slide/fade in slightly as they launch upward, rather than appearing instantly. | Low | Brief alpha ramp from 0 to 1 during first 100ms of flight |
| **Drop shadow on cards** | Subtle shadow beneath each card for depth. Makes cards pop against the teal background. | Low | Canvas shadow or manual offset rectangle |

### Anti-Features for Vinted Card

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Actual product photos (images)** | Loading external images adds complexity (preloading, CORS, failure states). Canvas-drawn illustrations are instant and reliable. | Keep Canvas-drawn watch illustrations. Stylize them to look like product photos on the card. |
| **Horizontally scrolling card feed** | Vinted's browse UI scrolls through cards. This is a Fruit Ninja game, not a marketplace. Do not simulate Vinted's browse UI. | Cards fly through the air on parabolic arcs. The Vinted card shape is the reference, not the Vinted interaction model. |
| **Detailed item description** | Real Vinted cards have size, color, condition text. Too much text makes cards unreadable at game speed. | Only show: watch illustration + brand name + price. Three elements maximum on a flying card. |
| **Interactive card taps (view detail)** | The interaction is swipe-to-slash, not tap-to-view. Do not add a tap handler that opens card details. | Slash to buy/reject. The card IS the game object. |
| **Photo-realistic watch rendering** | Diminishing returns. The current stylized watches are charming and thematically appropriate for a joke game. | Keep simple Canvas-drawn watch shapes. Place them on the white card background. The contrast alone makes them more readable. |

### Recommended Card Layout (Canvas Coordinates)

```
+---------------------------+  <-- White rounded rect, 2px radius corners
|  [heart icon]        top  |  <-- Small heart outline, top-right
|                           |
|     [Watch Drawing]       |  <-- Existing watch art, centered, ~60% of card height
|     (round/square/sport)  |
|                           |
|  ~~~~~~~~~~~~~~~~~~~~~~~~ |  <-- Subtle divider line
|  Montignac               |  <-- Brand name, bold, 16-18px, LEFT-aligned
|  25EUR            [heart] |  <-- Price in teal, small heart bottom-right
+---------------------------+

Total card size: ~80w x 110h CSS pixels (larger than current 60px watch diameter)
```

**Rationale for size increase:** Current watches are 60px diameter. Cards need to be taller (to fit brand name below the watch illustration) and slightly wider. At 80x110px, the brand name can be 16-18px font -- legible even during flight. The hitbox stays circular (use the card's inscribed circle) so slash detection logic barely changes.

---

## Feature Dimension 2: Two-Act Buy/Sell Mechanic

### Context

The current game is a single 60-second round of "slash watches, spot fakes." The v1.1 goal is a two-act structure: Act 1 (buying) then Act 2 (selling). This adds depth and replayability while keeping the session short (120 seconds total).

### Domain Research: Two-Phase Game Patterns

Two-phase "collect then sell" gameplay exists in several established games:

**Recettear: An Item Shop's Tale** -- Dungeon phase (collect loot) feeds into shop phase (price items for customers, watch their reactions). The shop phase introduces haggling: price too high and customers refuse; price too low and you lose profit. Customer reactions provide the feedback loop.

**Moonlighter** -- Similar loop. The selling phase uses a **reaction-based pricing system** with five tiers: Cheap Sell (customer loves it, you lose money), Perfect Sell (ideal zone, Base Value +/-10%), Expensive (customer buys but popularity drops), Overpriced (customer refuses), Very Overpriced (customer leaves angry). Visual icons communicate each reaction instantly.

**Key insight from both games:** The sell phase works because it inverts the skill. Buying/collecting rewards speed and pattern recognition. Selling rewards judgment and restraint. Same genre, different brain engagement.

**Confidence:** HIGH for the pattern (well-documented games), MEDIUM for applying it to a Fruit Ninja-style arcade game (novel combination).

### Table Stakes for Buy/Sell Mechanic

| Feature | Why Expected | Complexity | Dependencies |
|---------|--------------|------------|-------------|
| **Clear act transition** | Player must know when Act 1 ends and Act 2 begins. Without a clear signal, the phase shift is confusing. | Low | Full-screen interstitial: "Les Achats terminés! Place à la Revente!" with 2-3 second auto-advance or tap-to-continue |
| **Act 1: Buying phase (30-40 sec)** | Slash watches to buy them. Real watches enter inventory, fakes cost money. This IS the current game, slightly shortened. | Low | Existing gameplay with a shorter timer. Track inventory of slashed real watches. |
| **Act 2: Selling phase (30-40 sec)** | Different feel from Act 1. Player sells their inventory. Must use the same slash mechanic (so no new input to learn) but with a twist. | Medium | New game mode that reuses slash mechanic with different objects and scoring |
| **Inventory carries between acts** | What you buy in Act 1 determines what you can sell in Act 2. This creates the connection between acts. | Low | Array of purchased watches passed from Act 1 to Act 2 |
| **Act-aware HUD** | Player needs to know which act they are in. Timer label changes ("Achats" vs "Revente"). | Low | Conditional text in existing HUD rendering |
| **Total score across both acts** | Final score combines buying profit/loss with selling profit/loss. | Low | Accumulate score variable across both acts |

### How Act 2 ("La Revente") Should Work

Several viable approaches, ranked by fit for this game:

#### Option A: Slash Offers (Recommended)

**Concept:** Buyer avatars fly in holding price offers. Player slashes GOOD offers (high price) and lets bad offers (low-ball) pass.

**How it works:**
- Cards fly in showing: buyer name + offer price (e.g., "Jean-Michel: 45EUR")
- Good offers (at or above watch value) should be slashed to accept
- Bad offers (below value) should be avoided -- slashing accepts a bad deal
- The skill inverts: in Act 1 you slash good watches and avoid fakes. In Act 2 you slash good offers and avoid low-balls.

**Why this works:**
- Reuses the exact same slash mechanic (no new input)
- Inverts the decision: Act 1 = identify quality, Act 2 = evaluate price
- Cards still fly on parabolic arcs (same physics)
- Intuitively "slashing an offer" = "accepting the deal" (hand-shake slash)
- Missing a good offer = lost sale (same penalty pattern as missing a real watch in Act 1)

**Complexity:** Medium. New card type (offer card instead of watch card), new scoring logic, but same physics/rendering/input.

#### Option B: Set Prices Then Watch

**Concept:** Player sets a price for each watch, then watches as buyers react (like Moonlighter).

**Problem:** This requires a fundamentally different input model (tap to set price, not swipe to slash). Breaks the "one mechanic" rule for casual games. Would need UI for pricing sliders or buttons.

**Verdict:** Reject. Too complex for a 2-minute joke game. Violates the "reuse slash mechanic" constraint.

#### Option C: Auction Frenzy

**Concept:** Multiple buyers compete. Prices tick up over time. Player slashes to "sell" at the current price (timing game).

**Problem:** Adds a timing mechanic on top of slash. Two simultaneous skills = confusion without tutorial.

**Verdict:** Possible but risky. Option A is simpler and more intuitive.

### Differentiators for Buy/Sell Mechanic

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Buyer character names** | French parody buyer names on offer cards: "Jean-Michel", "Brigitte", "Kevin-le-Kiffeur". Comedy value. | Low | String array, randomly assigned to offer cards |
| **Inventory display during transition** | Between acts, briefly show "Tes achats: 5 Montignac, 1 Golden" before selling phase. Player feels ownership of their haul. | Low | Transition screen overlay, counts from Act 1 stats |
| **Buyer reaction emojis/text** | When an offer is slashed (accepted) or missed, show a buyer reaction: "Merci!" (good deal) or "Tant pis..." (missed). | Low | Same floating text system as "Bonne affaire!" |
| **Difficulty ramp in Act 2** | Early offers are obvious (45EUR for a 25EUR watch = easy accept). Late offers are tricky (24EUR for a 25EUR watch = barely worth it? or 26EUR = small profit, is it worth the combo break?). | Low | Same progressive difficulty pattern as fake name progression |
| **Act 2 visual distinction** | Different background color or gradient for Act 2 (warm tones vs cool tones) so the phase shift is viscerally obvious. | Low | Change gradient colors in `renderBackground()` |
| **Combo system carries across acts** | Combo multiplier persists or resets at act transition. Carrying it rewards consistent play. | Low | Design decision: recommend RESET at act boundary to give each act a fresh start |

### Anti-Features for Buy/Sell Mechanic

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Complex inventory management** | No drag-and-drop, no item sorting, no equipment. This is a joke arcade game. | Inventory is just a count: "5 real watches, 1 golden watch" |
| **Persistent economy across sessions** | No save-game economy. Each play session is standalone. | Reset everything on new game |
| **Buyer negotiation / haggling** | Multi-step transactions break the arcade flow. Each interaction must resolve in one slash. | One slash = accept offer. Miss = reject. Done. |
| **Player sets prices** | Requires different input (tap buttons, not swipe). Breaks the core mechanic. | Buyers bring offers TO the player. Player just accepts/rejects via slash. |
| **More than 2 acts** | Three acts = game takes too long. Two acts is the sweet spot for variety without overstaying. | Exactly 2 acts. Total game time: ~90-120 seconds. |
| **Act 2 with entirely new mechanics** | Player learned "swipe to slash" in Act 1. Do not make them learn something new for Act 2. | Same swipe-to-slash input. Different objects (offer cards instead of watch cards). Different decision (price evaluation instead of quality identification). |

### Act Structure Recommendation

```
[Start Screen]
     |
     v
[Act 1: "Les Achats" -- 35 seconds]
  - Watches fly in on Vinted cards
  - Slash real watches to buy them (builds inventory)
  - Avoid fakes (costs money)
  - Golden watches still appear (jackpot)
  - Score = purchase profit/loss
     |
     v
[Transition: "Temps de revendre !" -- 3 seconds]
  - Shows inventory summary
  - Brief pause for mental reset
     |
     v
[Act 2: "La Revente" -- 35 seconds]
  - Offer cards fly in (buyer name + price)
  - Slash good offers to accept (earn money)
  - Let bad offers pass (they are low-balls)
  - Number of offer cards proportional to inventory size
  - Score = selling profit
     |
     v
[Game Over: Combined score]
  - Total profit from both acts
  - Stats for each act
  - Vinted seller rating (already exists)
  - Birthday message (already exists)
```

**Total game time:** ~75 seconds of play + ~5 seconds transition = ~80 seconds. Slightly longer than current 60 seconds but still under 2 minutes.

---

## Feature Dimension 3: Sound Effects

### Context

Sound effects were explicitly out of scope for v1.0 (noted as anti-feature in original FEATURES.md). For v1.1, they are in scope. The game currently has ZERO audio and relies entirely on visual feedback + haptic vibration.

### Sound Design Patterns for Slash/Arcade Games

Based on research into Fruit Ninja's sound categories and general arcade game audio design:

**Fruit Ninja's sound categories** (from The Sounds Resource archives and gameplay analysis):
- Slash/swoosh sounds (the swipe itself)
- Fruit splat sounds (impact on hit)
- Combo sounds (ascending pitch for combos)
- Bomb explosion (penalty sound)
- UI sounds (button taps, transitions)
- Background music (ambient loop)

**Arcade "juice" sound principles:**
- Every action should have clear audio feedback
- Sound intensity should match action significance
- Varied sounds prevent repetition fatigue
- Audio + visual + haptic layered together creates maximum satisfaction
- Sounds should be SHORT (50-200ms for actions, 500ms for rewards)

**Confidence:** HIGH. Fruit Ninja's sound design is 14 years established and extensively documented. Arcade sound patterns are well-understood game design.

### Table Stakes for Sound Effects

| Feature | Why Expected | Complexity | Dependencies |
|---------|--------------|------------|-------------|
| **Slash swoosh sound** | The swipe itself needs an audible whoosh. Without this, swiping feels hollow. Most important single sound in the game. | Low | Plays on pointerdown or during pointermove when trail is active |
| **Hit/impact sound** | When a card is slashed, a satisfying "thwack" or "chop" sound. Distinct from the swoosh. | Low | Plays in `slashWatch()` function |
| **Coin/cash register sound for real watches** | Positive feedback: "cha-ching!" when buying a real watch or accepting a good offer. Reinforces the money theme. | Low | Plays when `!watch.isFake` in `slashWatch()` |
| **Penalty/buzzer sound for fakes** | Negative feedback: sharp buzz or error tone when slashing a fake. Must feel distinctly "wrong" without being annoying. | Low | Plays when `watch.isFake` in `slashWatch()` |
| **Audio context initialization on first user interaction** | Mobile browsers block autoplay audio. Must create/resume AudioContext on the first tap (start button). Without this, no sounds play on mobile. | Medium | Must hook into `handleStartTap()` to create AudioContext. This is the #1 technical requirement. |
| **Volume appropriate for mobile** | Sounds must not be jarring at full phone volume. Default to moderate volume (gain 0.3-0.5). | Low | GainNode master volume |

### Implementation Approach: Synthesized vs Pre-recorded

Two viable approaches for this project:

#### Option A: Web Audio API Synthesis (Recommended)

**How:** Generate all sounds procedurally using oscillators, noise, and gain envelopes. Zero external audio files.

**Pros:**
- Zero file loading (no preload, no network requests, no CORS)
- Zero additional file size (no .mp3/.wav assets)
- Consistent with "zero dependencies" project philosophy
- Infinite variation possible (randomize pitch slightly per slash for variety)
- Full control over every parameter

**Cons:**
- Sounds are "retro/synth" in character, not realistic
- Requires understanding oscillator + gain envelope patterns
- Harder to get "exactly right" without audio design experience

**Sound synthesis recipes:**

| Sound | Technique | Duration |
|-------|-----------|----------|
| Slash swoosh | White noise burst with bandpass filter, quick decay | 80-150ms |
| Card hit/chop | Short sawtooth oscillator, rapid frequency drop (800Hz to 200Hz), fast decay | 50-100ms |
| Coin/cha-ching | Two sine tones in quick succession (523Hz then 784Hz, C5-G5), fast attack | 150-200ms |
| Penalty buzz | Square wave at low frequency (150Hz), moderate decay, slight distortion | 200-300ms |
| Golden jackpot | Ascending arpeggio (C5-E5-G5-C6), sine wave, each note 80ms | 300-400ms |
| Combo milestone | Higher pitched "ding" (frequency proportional to combo level) | 100ms |
| Timer warning | Short beep per second in final 5 seconds, ascending pitch | 50ms each |
| Act transition | Swooping tone (low to high), signaling change | 400ms |

#### Option B: Pre-recorded Audio Files

**How:** Source or create .mp3/.wav files, preload them, play with `Audio` element or Web Audio API `BufferSource`.

**Pros:**
- Sounds can be exactly what you want (record, download, or generate in DAW)
- More "realistic" character

**Cons:**
- File loading adds complexity (preload, error handling, progress)
- Adds to page weight (even compressed, 8-10 sounds = 50-200KB)
- Must handle loading failures gracefully
- More complex mobile autoplay handling (audio sprite technique needed)
- Sourcing royalty-free sounds takes time

**Verdict:** Option A (synthesis) is strongly recommended. It aligns with the project's zero-dependency philosophy, adds zero file weight, and avoids all loading/preloading complexity. The "retro synth" character fits an arcade joke game perfectly.

### Differentiators for Sound Effects

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Pitch variation per slash** | Randomize slash pitch +/-10% each time. Prevents repetition fatigue. Makes each slash feel unique. | Low | `oscillator.frequency.value = base * (0.9 + Math.random() * 0.2)` |
| **Combo pitch escalation** | Each consecutive combo hit plays at a slightly higher pitch. Musical ascending scale effect. Feels incredibly satisfying. | Low | Multiply base frequency by `1 + (combo * 0.05)` |
| **Golden watch special sound** | Distinctive "jackpot" jingle for the rare golden watch. Three-note ascending arpeggio. Player KNOWS they hit gold before reading the text. | Low | Three quick sine tones: C5 -> E5 -> G5 |
| **Act transition fanfare** | Brief musical motif when switching from Act 1 to Act 2. Signals the phase change aurally. | Low | Short ascending sweep or two-note motif |
| **"Bonne affaire" spoken word** | Instead of (or in addition to) synthesis, use SpeechSynthesis API to say "Bonne affaire!" or "Arnaque!" in French. | Medium | `speechSynthesis.speak()` -- but latency may be too high for game feel. Experimental. |
| **Haptic + audio sync** | Existing haptic feedback (navigator.vibrate) synced precisely with sound effects. Multi-sensory hit. | Low | Already have `hapticFeedback(30)` in `slashWatch()` -- just ensure sound plays in same call |

### Anti-Features for Sound Effects

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Background music loop** | Adds significant complexity (looping, cross-fading, mobile restrictions). Overkill for a 90-second game. Also distracting from the joke. | No background music. Let the action sounds be the entire soundscape. The silence between slashes creates tension. |
| **Volume settings UI** | No settings screen. No pause menu. Adding a volume slider requires UI that does not exist. | Set a sensible default volume (gain 0.3-0.5). If it is too loud, the player adjusts phone volume. |
| **Mute toggle button** | Adding a mute button means designing where it goes in the HUD, handling state, etc. Overengineering. | If absolutely needed later, a simple speaker icon in the corner. But defer -- it is a 90-second game. |
| **3D positional audio** | Web Audio API supports PannerNode for spatial audio. Completely unnecessary for a 2D mobile game. | Simple stereo output. No panning, no spatialization. |
| **Music/SFX separate volume channels** | No music = no need for separate channels. | Single master gain node for all sounds. |
| **Complex audio layering** | Multiple simultaneous sounds with mixing, ducking, sidechaining. Way beyond scope. | Simple: play one sound per event. If two events overlap, both sounds play at full volume (Web Audio handles mixing natively). |

### Mobile Audio Technical Requirements

This is the single biggest technical pitfall for sound in browser games:

| Requirement | Why | Implementation |
|-------------|-----|---------------|
| **Create AudioContext on user gesture** | iOS Safari and Chrome require AudioContext creation or resume inside a user-initiated event handler. Auto-playing audio on load is blocked. | Create AudioContext inside `handleStartTap()` when player taps "Jouer" |
| **Resume suspended AudioContext** | Even after creation, the context can be suspended. Must check and resume. | `if (audioCtx.state === 'suspended') audioCtx.resume();` |
| **Single AudioContext for lifetime** | Do not create a new AudioContext per sound. Reuse one global context. Browsers limit the number of contexts. | Global `var audioCtx = null;` initialized once on first tap |
| **Short sounds only** | Long sounds can be interrupted by phone calls, tab switches, etc. Keep all sounds under 500ms. | All synthesized sounds have explicit `oscillator.stop(audioCtx.currentTime + duration)` |
| **Handle visibility change** | When the page goes to background (tab switch), audio should stop. When it returns, context may need resuming. | Already have `visibilitychange` handler in codebase -- add audioCtx resume there |

**Confidence:** HIGH. MDN documentation on Audio for Web Games and Web Audio API explicitly covers all of these requirements. Mobile autoplay restrictions are well-documented by all major browser vendors.

---

## Feature Dependencies (v1.1 Specific)

```
[Vinted Card Rendering]
    |
    +---> Card shape (roundRect, white bg, shadow)
    |       |
    |       +---> Watch illustration repositioned inside card
    |       +---> Brand name text below illustration (large, readable)
    |       +---> Price tag element
    |       +---> Heart icon (decorative)
    |
    +---> Card split animation (adapts existing splitHalves to rect shape)
    |
    +---> Card hitbox (inscribed circle or rect-based collision)

[Two-Act Mechanic]
    |
    +---> Act 1 timer (shortened from 60s to ~35s)
    |       |
    |       +---> Inventory tracking (count real/golden watches bought)
    |
    +---> Act transition screen
    |       |
    |       +---> Inventory display
    |       +---> "La Revente" announcement
    |
    +---> Act 2 game logic
    |       |
    |       +---> Offer card type (buyer name + price)
    |       +---> Good vs bad offer scoring
    |       +---> Offer card rendering (variant of Vinted card)
    |       +---> Offer difficulty ramp
    |
    +---> Combined game over screen (both acts' stats)

[Sound Effects]
    |
    +---> AudioContext init (on first user tap)
    |       |
    |       +---> Master gain node
    |
    +---> Sound synthesis functions
    |       |
    |       +---> playSlash() -- swoosh on swipe
    |       +---> playHit() -- impact on card hit
    |       +---> playCoin() -- positive feedback
    |       +---> playBuzz() -- negative feedback
    |       +---> playJackpot() -- golden watch
    |       +---> playCombo() -- combo milestone
    |
    +---> Integration into existing game events
            |
            +---> slashWatch() calls playHit + playCoin/playBuzz
            +---> checkSlashCollisions() proximity triggers playSlash
            +---> Timer warning beeps in final 5 seconds
```

**Build order recommendation:**
1. Vinted card rendering FIRST (visual foundation for both acts)
2. Sound effects SECOND (independent of mechanic, enhances everything)
3. Two-act mechanic LAST (depends on card rendering being solid, benefits from sound being available)

---

## Cross-Feature Dependencies on Existing Code

| Existing Feature | How v1.1 Features Depend On It | Risk |
|-----------------|-------------------------------|------|
| `drawWatch()` / `drawRoundWatch()` etc. | Vinted card wraps these inside a card shape. Must not break existing rendering. | LOW -- additive change |
| `createSplitHalves()` / `renderHalf()` | Must adapt to clip rectangular cards instead of using circle-based clipping. | MEDIUM -- the clip region changes from `rect` halves to card-shaped halves |
| `checkSlashCollisions()` | Hitbox shape may need to change from circle to rectangle, or keep circular with adjusted radius. | LOW -- circular hitbox on rectangular card still works fine |
| `slashWatch()` | Sound effects hook into this function. Act 2 scoring logic differs. | LOW -- add sound calls, conditionally branch scoring by act |
| `spawnWatch()` | Act 2 needs a variant (`spawnOffer()`) with different card properties. | LOW -- new function, does not modify existing one |
| `getDifficulty()` | Must account for two shorter acts instead of one 60s round. | LOW -- parameterize by act duration |
| `gameState` | Currently `'start' / 'playing' / 'over'`. Needs `'transition'` and awareness of current act. | MEDIUM -- state machine gets more complex |
| `renderGameOver()` | Must show stats for both acts. | LOW -- additive change to existing screen |
| `ROUND_DURATION` / `elapsed` | Must reset or adjust between acts. | LOW -- reset elapsed at act boundary |
| `combo` / `comboMultiplier` | Design decision: reset at act boundary or carry over. | LOW -- either way, minimal code change |

---

## MVP Recommendation for v1.1

### Must Build (the three features work)

1. **Vinted card shape** -- white rounded rect with watch illustration and large brand name
2. **Card split animation** -- adapted for rectangular card shape
3. **Act 1 / Act 2 game flow** -- transition screen, shortened timers, inventory carry
4. **Act 2 offer cards** -- buyer name + price, slash to accept
5. **AudioContext initialization** on first tap (mobile-safe)
6. **Core sounds** -- slash swoosh, hit impact, coin cha-ching, penalty buzz (4 sounds minimum)

### Should Build (polish and delight)

7. Heart icon on cards
8. Price tag on cards
9. Golden watch jackpot sound
10. Combo pitch escalation
11. Act 2 background color change
12. Buyer character names (French parody)
13. Timer warning beeps
14. Pitch variation per slash

### Defer to v1.2+

- SpeechSynthesis "Bonne affaire!" voice
- Background music
- Mute toggle
- Multiple buyer personality types with different offer patterns
- Share button with score screenshot

---

## Sources

### Vinted Card UI
- [Vinted Redesign Case Study -- Lourdes Castillo Garcia](https://medium.com/@castillogarcialourdes/vinted-redesign-2cf32e0619a8) (MEDIUM confidence -- redesign proposal, not official Vinted documentation)
- [Vinted Redesign -- Marine BChenais](https://medium.com/@marinebchenais/redesigning-an-app-vinted-23d3a4840741) (MEDIUM confidence)
- [Vinted Visual Evolution -- Bianca Rosendo](https://biancarosendo.medium.com/how-can-we-redesign-an-app-a-second-hand-marketplace-called-vinted-d9035e7c9610) (MEDIUM confidence)
- [Vinted How It Works Guide](https://www.topbubbleindex.com/blog/vinted-how-it-works/) (HIGH confidence for listing element inventory)
- [Vinted Listing Optimization](https://www.topbubbleindex.com/blog/vinted-listing-optimization/) (MEDIUM confidence)
- [How to Sell on Vinted](https://www.remove.bg/b/how-to-sell-on-vinted) (MEDIUM confidence for listing best practices)

### Two-Act Buy/Sell Mechanic
- [Recettear Analysis -- Gamedeveloper.com](https://www.gamedeveloper.com/design/saving-the-world-through-profit--recettear-an-item-shop-s-tale-analysis-) (HIGH confidence -- detailed mechanic breakdown)
- [Moonlighter Selling and Reactions Wiki](https://moonlighter.fandom.com/wiki/Selling_and_Reactions) (HIGH confidence -- five-tier pricing reaction system documented)
- [Casual Game Design Fundamentals](https://gamedesignskills.com/game-design/casual/) (MEDIUM confidence)
- [14 Best Hyper-Casual Game Mechanics -- GameAnalytics](https://gameanalytics.com/blog/14-best-hyper-casual-gameplay-mechanics/) (MEDIUM confidence)
- [Six Games That Layer Meta Mechanics -- GameAnalytics](https://www.gameanalytics.com/blog/six-games-that-successfully-layer-in-meta-mechanics) (MEDIUM confidence)

### Sound Design
- [Audio for Web Games -- MDN](https://developer.mozilla.org/en-US/docs/Games/Techniques/Audio_for_Web_Games) (HIGH confidence -- authoritative browser documentation)
- [Web Audio API -- MDN](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API) (HIGH confidence)
- [Using Web Audio API -- MDN](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Using_Web_Audio_API) (HIGH confidence)
- [Creating Sound Effects for JS Games via Web Audio API](https://peerdh.com/blogs/programming-insights/creating-sound-effects-for-a-javascript-game-using-the-web-audio-api-1) (MEDIUM confidence)
- [Fruit Ninja Sound Effects -- The Sounds Resource](https://sounds.spriters-resource.com/mobile/fruitninja/) (HIGH confidence for sound category inventory)
- [Juice in Game Design -- Brad Woods](https://garden.bradwoods.io/notes/design/juice) (HIGH confidence for feedback principles)
- [Juice in Game Design -- Blood Moon Interactive](https://www.bloodmooninteractive.com/articles/juice.html) (HIGH confidence)
- [Game Feel -- Wikipedia](https://en.wikipedia.org/wiki/Game_feel) (HIGH confidence)
