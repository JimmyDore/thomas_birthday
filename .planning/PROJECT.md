# Thomas Watch Flipper

## What This Is

A fast-paced mobile browser game (Chrome only) where Thomas plays a Vinted-style watch flipper. Listings pop up, he taps the good deals, but the game tricks him with price changes, fake brands, and escalating absurdity. It's a personalized birthday joke — starts feeling real, ends in total chaos.

## Core Value

Make Thomas laugh the second he opens it, and keep him playing for a couple of minutes.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Mobile browser game (Chrome), no app install
- [ ] Entirely in French
- [ ] Personalized for Thomas (his name, references to his Vinted watch-flipping hobby)
- [ ] Fast-paced reflex gameplay — listings appear, player taps good deals
- [ ] Montignac brand as the recurring "good" watch
- [ ] Trick mechanics — prices change before tap, fake brand names appear
- [ ] Escalating absurdity — starts normal, ramps to insane (potato watches, sundials, absurd descriptions)
- [ ] Profit/loss scoring — good buys earn money, bad buys lose money
- [ ] Playable in 2-3 minutes per round
- [ ] Instant laugh — the joke lands within seconds of opening

### Out of Scope

- Native app — browser only, no install
- Multiplayer — single player joke game
- Backend/server — fully client-side, static hosting
- Persistence/accounts — no login, no saved data needed
- Complex animations/3D — keep it simple, ship fast
- Sound/music — nice-to-have only, not required

## Context

- Thomas is becoming a serious watch collector, buys on Vinted and flips for profit
- Montignac is his go-to brand
- The humor is affectionate, not mean — celebrating the hobby with absurd exaggeration
- Birthday is within a week — must ship fast
- Game will be shared via a link (static HTML/JS, can host on GitHub Pages or similar)
- Target device: Thomas's phone, Chrome browser

## Constraints

- **Timeline**: < 1 week — must be ready for Thomas's birthday
- **Platform**: Mobile Chrome only — no need for cross-browser or desktop optimization
- **Language**: Entire UI and content in French
- **Complexity**: Minimal — single HTML file or small static bundle, no build tooling needed
- **Hosting**: Static files only — no server, no database

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Client-side only (HTML/CSS/JS) | No server needed for a joke game, simplest to host and share | — Pending |
| Vinted-style listing feed as game mechanic | Directly references Thomas's actual hobby | — Pending |
| Escalating absurdity curve | "Starts normal, goes insane" — best comedy pacing | — Pending |

---
*Last updated: 2026-02-07 after initialization*
