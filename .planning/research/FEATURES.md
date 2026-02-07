# Feature Landscape

**Domain:** Fruit Ninja-style browser arcade game (birthday joke, watch theme)
**Researched:** 2026-02-07
**Confidence:** HIGH for core mechanics (Fruit Ninja is a stable, well-documented design since 2010), MEDIUM for browser-specific implementation details

## Table Stakes

Features the player expects. Missing any of these = the game does not feel like Fruit Ninja.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Objects flying across screen** | Core visual identity of the genre. Objects (watches) launch from bottom, arc upward, fall with gravity. | Medium | Requires physics-like parabolic arcs. Random launch angles, speeds, positions. This IS the game. |
| **Swipe-to-slash gesture** | The defining interaction. Touch/drag across an object to "cut" it. Must feel responsive and immediate. | Medium | Touch event handling (touchstart/touchmove/touchend). The slash trail must visually connect to the finger. |
| **Slash trail visual** | The white/colored trail that follows the player's finger. Without this, swiping feels disconnected and unsatisfying. | Low | Canvas line or series of fading segments along touch path. Fades out after ~300ms. Critical for game feel. |
| **Object split animation** | When slashed, the object breaks into two halves that tumble away with physics. This is the core satisfaction payoff. | Medium | Each watch sprite splits into two halves, each with rotation and gravity. Particle juice (sparks, color burst) amplifies satisfaction. |
| **Score display** | Running score visible during play. For Watch Ninja: profit in euros, prominently displayed. | Low | HUD overlay. Updates on each slash. For this project: format as euro amount with sign (+15 EUR / -20 EUR per slash). |
| **Game timer or life system** | Something that ends the game. Fruit Ninja Classic uses 3 lives (miss 3 fruits = game over). Zen mode uses a timer. | Low | For a 2-minute joke game, a **countdown timer** (60-90 seconds) is simpler and more predictable than a life system. Timer guarantees everyone gets the full experience. |
| **Game over screen with final score** | Summary of performance. In Fruit Ninja: final score + best combo. For Watch Ninja: total profit in euros. | Low | Full-screen overlay. Shows final profit, maybe best combo, and a restart button. This is where the birthday message goes. |
| **Start screen** | A way to begin the game. Fruit Ninja has a title screen with a swipe-to-start fruit. | Low | Title screen with "Watch Ninja" branding, Thomas's name, and a big "Jouer" button or swipe-to-start watch. |
| **Increasing difficulty over time** | Objects come faster, more frequently, with harder trajectories as time progresses. Without this, the game feels flat. | Low | Ramp spawn rate and speed linearly over the round duration. Start easy (1-2 objects), end hectic (4-6 simultaneous). |
| **Bomb/penalty mechanic** | Something you must NOT slash. Creates tension and decision-making. Without this, the game is mindless swiping. | Low | Fake watches ARE the bombs. Slashing a Montignak/Montinyac costs money. This is already built into the concept -- no separate bomb needed. The watch theme naturally solves this design requirement. |

### Table Stakes Summary

The minimum loop is: objects fly up, player swipes to slash, objects split satisfyingly, score changes, difficulty ramps, timer ends, game over shows score. All 10 features above are required for the game to feel like Fruit Ninja.

## Differentiators

Watch-theme-specific features that make this uniquely funny for Thomas. Not expected by genre convention, but high value for the birthday joke.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Real vs fake watch identification** | Core humor mechanic. Player must quickly read the watch name and decide: slash the real Montignac, avoid the Montignak. Creates actual gameplay depth beyond mindless swiping. | Low | Different text/label on each watch sprite. Real watches are rare and valuable (+50 EUR). Fakes are common and costly (-20 EUR). Difficulty = more fakes, faster speed, subtler name variations. |
| **Euro profit scoring** | Score as "Profit: +145 EUR" instead of abstract points. Ties directly to Thomas's Vinted flipping. Instantly funny because it mirrors his real hobby. | Low | Just a display format change. But it reframes the entire experience around his world. |
| **Progressively sneakier fake names** | Early: obvious fakes (Montignak). Mid: trickier (Montinyac). Late: near-identical (Montiganc, Montignae). Creates natural difficulty curve through the humor itself. | Low | Just a data table of fake names ordered by difficulty tier. Swap in harder fakes as time progresses. |
| **Personalized birthday message** | Game over screen says "Joyeux anniversaire Thomas!" with a personal message. The game IS the card. | Low | Static text on game over screen. Could include a short personal message from Jimmy. |
| **"Bonne affaire!" / "Arnaque!" slash feedback** | When slashing a real watch: "+50 EUR - Bonne affaire!" flies up. When slashing a fake: "-20 EUR - Arnaque!" in red. Immediate, funny feedback per slash. | Low | Floating text that pops up at slash location and fades out. Very satisfying game juice. Reinforces the watch-flipping theme every single slash. |
| **Combo system for consecutive real watches** | "Combo x3 - Thomas est en feu!" Slashing multiple real watches in quick succession multiplies the bonus. | Medium | Requires combo timer (resets after ~1.5s without a real watch slash). Visual feedback for combos. Fun but not essential for MVP. |
| **Watch images/sprites with brand labels** | Instead of generic circles, actual watch-shaped sprites with the brand name visible. Even crude watch drawings are funnier than abstract shapes. | Medium | Need to create or source simple watch graphics. At minimum: a watch silhouette with text overlay for the brand name. |
| **Special "Rolex" or luxury watch** | Rare golden watch worth huge bonus (+200 EUR). Appears once or twice per round. High-excitement moment. | Low | Just another entry in the watch type table with a golden sprite variant and higher value. Easy to implement once the base system works. |
| **End screen "Vinted seller rating"** | Instead of just showing score, show a fake Vinted-style seller rating based on performance. "Thomas - Vendeur Pro" for high scores, "Thomas - Arnaqueur" for low scores. | Low | Conditional text on game over screen. Pure humor, almost zero implementation cost. |

### Differentiators Priority

Must-have differentiators (they ARE the joke): Real vs fake identification, euro scoring, fake names, birthday message, slash feedback text.

Nice-to-have differentiators: Combo system, watch sprites, special watches, Vinted rating.

## Anti-Features

Features to deliberately NOT build. Common in Fruit Ninja or game dev, but wrong for a birthday joke game.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Persistent progression / unlockables** | This is a joke game for one person. No one is grinding for unlocks. Building progression systems wastes days of dev time for zero value. | Single arcade mode. Play, laugh, show friends, done. |
| **Leaderboard / high score persistence** | No online infrastructure. No other players. localStorage high score is the maximum -- and even that is optional. | Show score on game over. Maybe remember best score in localStorage. That is enough. |
| **Multiple game modes** | Fruit Ninja has Classic, Zen, and Arcade modes. For a joke game, one mode is correct. Multiple modes dilute the joke and triple the dev work. | One mode: timed round (60-90 seconds). Everyone gets the same experience. |
| **Sound effects and music** | PROJECT.md already marks this as out of scope. Sound requires asset sourcing, audio API handling, mobile autoplay restrictions, and user permission flows. High effort for a visual joke game. | No sound. The humor is visual and textual. Haptic feedback (navigator.vibrate) is simpler and more satisfying on mobile if desired. |
| **Tutorial or onboarding** | Everyone knows how Fruit Ninja works. A tutorial for a joke game kills the punchline. | At most: "Tranche les vraies Montignac!" as subtitle on start screen. The game teaches itself in 3 seconds. |
| **Pause menu / settings** | Over-engineering. No settings to configure. A 60-90 second game does not need pause. | No pause. No settings. Just play and game over. |
| **Responsive desktop layout** | PROJECT.md says mobile-only. Do not waste time making it work on desktop. | Lock to portrait mobile viewport. If someone opens on desktop, show a "Ouvre sur ton telephone!" message. |
| **Complex physics engine** | Do not import a physics library (Matter.js, etc.) for parabolic arcs and split halves. The math is simple enough to hand-code in 20 lines. | Manual physics: position += velocity; velocity.y += gravity. That is literally it. |
| **Internationalization** | It is in French for Thomas. One language. Zero i18n infrastructure. | Hardcode all strings in French directly in the code. |
| **Analytics or telemetry** | It is a birthday joke. Do not track anything. | No analytics. No cookies. No GDPR concerns. |
| **PWA / offline support** | Unnecessary complexity. Thomas will open the link once with internet. | Plain static HTML/JS/CSS. No service worker, no manifest. |
| **Fancy asset pipeline** | No Webpack, no Vite, no build step unless the framework demands it. One HTML file with inline or linked JS/CSS is ideal. | Keep it dead simple. Fewer files = faster to ship. |

## Feature Dependencies

```
Start Screen
    |
    v
Game Loop (CORE - everything depends on this)
    |
    +---> Object Spawning (parabolic arcs, random timing)
    |         |
    |         +---> Watch Types (real vs fake, name labels)
    |         |         |
    |         |         +---> Difficulty Ramp (sneakier fakes, faster spawns)
    |         |         +---> Special Watches (golden Rolex bonus)
    |         |
    |         +---> Watch Sprites / Visuals
    |
    +---> Swipe Detection (touch events)
    |         |
    |         +---> Slash Trail (visual feedback)
    |         +---> Hit Detection (slash intersects object)
    |                   |
    |                   +---> Split Animation (two halves tumble away)
    |                   +---> Slash Feedback Text ("Bonne affaire!" / "Arnaque!")
    |                   +---> Score Update
    |                         |
    |                         +---> Combo System (consecutive real watch bonus)
    |
    +---> Timer (countdown)
    |         |
    |         +---> Game Over Screen
    |                   |
    |                   +---> Final Score (profit in EUR)
    |                   +---> Vinted Seller Rating
    |                   +---> Birthday Message
    |                   +---> Restart Button
```

### Critical Path (build in this order)

1. **Canvas + game loop** -- requestAnimationFrame loop, canvas drawing
2. **Object spawning with arcs** -- watches fly up and fall with gravity
3. **Swipe detection + hit testing** -- touch events, collision with objects
4. **Split animation** -- objects break in half on slash (this is where satisfaction lives)
5. **Score system** -- euro profit, real vs fake watch types
6. **Timer + game over** -- countdown, end screen with score
7. **Slash trail** -- visual trail following the finger
8. **Difficulty ramp** -- spawn rate and fake name trickiness increase
9. **Polish** -- birthday message, feedback text, Vinted rating, special watches

## MVP Recommendation

For MVP (a fun 2-minute game Thomas can play on his birthday):

**Must build (Phase 1 -- the game works):**
1. Canvas game loop with object spawning (parabolic arcs)
2. Swipe-to-slash with hit detection
3. Object split animation (two halves tumble -- this is the satisfaction)
4. Slash trail following the finger
5. Real vs fake watch identification (Montignac vs Montignak etc.)
6. Euro profit scoring with HUD display
7. Countdown timer (60-90 seconds)
8. Game over screen with final profit and birthday message
9. Start screen with title and play button

**Should build (Phase 2 -- the game is funny and polished):**
1. "Bonne affaire!" / "Arnaque!" floating text feedback
2. Progressively sneakier fake names
3. Increasing difficulty ramp
4. Vinted seller rating on game over
5. Watch-shaped sprites (vs plain circles)
6. Special golden watch (rare, high value)

**Defer or skip entirely:**
- Combo system (fun but not essential for a joke game)
- Sound effects (out of scope per PROJECT.md)
- Any form of progression, persistence, or multiple modes

### Time Estimate

Phase 1 (playable game): ~1-2 days of focused development
Phase 2 (polished joke): ~0.5-1 day additional
Total to shippable birthday game: 2-3 days

This fits comfortably within the < 1 week constraint.

## Game Feel Notes (What Makes Fruit Ninja Satisfying)

These are the details that separate a "working" game from a "fun" game. Prioritize these during implementation.

| Element | Why It Matters | Implementation |
|---------|----------------|----------------|
| **Instant slash response** | Any perceptible delay between swipe and split kills satisfaction. Must feel like the finger IS a blade. | Process touch events in the same frame. No animation delay before split. |
| **Generous hit detection** | Slightly larger hitbox than the visual sprite. Missing a slash you thought should hit feels terrible. | Expand collision radius by ~20% beyond visual bounds. |
| **Split halves have physics** | The two halves must tumble away with rotation and gravity. Static disappearance is deeply unsatisfying. | Each half gets: inherited velocity + outward push + random rotation speed + gravity. |
| **Particle burst on slash** | Small colored particles (juice droplets in Fruit Ninja) explode from the slash point. Even 5-10 particles make a huge difference. | Spawn 8-12 small circles at slash point with random velocities. Fade over 500ms. Use watch-theme colors (gold for real, red for fake). |
| **Screen shake on penalty** | When player slashes a fake watch, a brief screen shake (2-3 frames, 3-5px offset) communicates "mistake!" viscerally. | Offset canvas transform briefly. Very cheap, very effective. |
| **Objects at the right speed** | Too fast = frustrating. Too slow = boring. The sweet spot is "I can react but I have to be quick." | Start at ~60-70% of screen height per second arc peak. Increase to ~85% by end of round. Playtest to tune. |
| **Multiple objects create urgency** | Single objects are boring. The fun is prioritizing: "two watches, one real, one fake, which do I slash?" | Spawn in bursts of 2-4 objects with slight time offsets. Never more than 6 on screen (overwhelming). |

## Sources

- Fruit Ninja game design analysis (training data, HIGH confidence -- Fruit Ninja's mechanics have been stable and extensively documented since 2010, this is settled game design knowledge)
- HTML5 Canvas touch game patterns (training data, HIGH confidence -- standard browser APIs and patterns)
- Project context from `.planning/PROJECT.md`
- Web search was unavailable; all findings are from training data. For this specific domain (a 14-year-old casual game with unchanging mechanics), training data is highly reliable.
