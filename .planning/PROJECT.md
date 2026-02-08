# Watch Ninja

## What This Is

A Fruit Ninja-style mobile browser game where watches fly across the screen and Thomas swipes to slash them. Real Montignac watches earn money, fakes (Montignak, Montinyac, etc.) cost money. The score is his profit in euros. It's a personalized birthday joke for Thomas, themed around his Vinted watch-flipping hobby.

## Core Value

Make Thomas laugh instantly and give him a satisfying 2-minute arcade game to show his friends.

## Current Milestone: v1.1 Vinted Cards & Buy/Sell

**Goal:** Redesign watches as Vinted listing cards for readability, add a two-act buy/sell game mechanic, and bring sound effects.

**Target features:**
- Vinted card visual redesign (white card, watch illustration, readable brand name below)
- Two-act gameplay: Act 1 "Les Achats" (buy watches, avoid fakes), Act 2 "La Revente" (sell inventory to buyers)
- Sound effects (slash sounds, coin sounds, penalty sounds)

## Requirements

### Validated

- ✓ Fruit Ninja-style gameplay — watches fly across the screen, swipe to slash (v1.0)
- ✓ Real Montignac watches = earn money, fake watches = lose money (v1.0)
- ✓ Score displayed as profit in euros (v1.0)
- ✓ Fake watch names (Montignak, Montinyac, variations) that get sneakier (v1.0)
- ✓ Mobile-first (Chrome on phone), touch-based swiping (v1.0)
- ✓ Entire UI in French (v1.0)
- ✓ Personalized for Thomas (name, birthday message) (v1.0)
- ✓ Hosted at coupe-des-montres.jimmydore.fr (v1.0)
- ✓ GitHub Actions CI/CD auto-deploy on push to master (v1.0)
- ✓ SSL certificate and nginx on VPS (v1.0)
- ✓ 60-second timed round with difficulty ramp (v1.0)
- ✓ Combo multiplier system (v1.0)
- ✓ Golden watch jackpot (v1.0)
- ✓ Vinted seller rating on game over (v1.0)
- ✓ localStorage high scores (v1.0)

### Active

- [ ] Vinted card redesign — watches displayed as Vinted listing cards
- [ ] Two-act gameplay — buy phase + sell phase
- [ ] Sound effects — slash, coin, penalty sounds

### Out of Scope

- Native app — browser only
- Multiplayer — single player joke
- Backend/API — fully static client-side
- Desktop optimization — mobile-only
- Share button — deferred to v2
- Multiple game modes beyond buy/sell — keep it focused

## Context

- Thomas is becoming a serious watch collector, buys Montignac watches on Vinted and resells
- The humor is affectionate — celebrating the hobby, not mean-spirited
- Game is already live and playable — v1.1 improves the experience
- Current watches are Canvas-drawn circles/squares with tiny brand text — hard to read
- The Vinted card redesign solves readability AND reinforces the theme
- Buy/sell mechanic adds depth: buying stock (avoid fakes) then selling for profit (judge offers)

## Constraints

- **Platform**: Mobile Chrome only — touch-based swiping
- **Language**: Entire UI in French
- **Complexity**: Still vanilla JS + Canvas 2D — no frameworks
- **Hosting**: Same VPS, same CI/CD pipeline
- **Compatibility**: Must not break existing game feel (swipe trail, split animation, combo system)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Fruit Ninja-style over simulator | User wanted simple, dynamic arcade feel — not a complex Vinted simulator | ✓ Good |
| Money-based scoring | Ties directly to Thomas's Vinted flipping hobby — profit in euros | ✓ Good |
| Client-side only (HTML/CSS/JS) | No server needed for a joke game, simplest to host | ✓ Good |
| Zero dependencies — vanilla JS + Canvas 2D | No build tools, no frameworks — kept delivery fast | ✓ Good |
| Vinted listing cards over bare watches | Current watch drawings have unreadable brand text — cards solve readability + reinforce theme | — Pending |
| Two-act buy/sell mechanic | Adds depth: Act 1 = spot fakes, Act 2 = judge offers. Two different skills | — Pending |

---
*Last updated: 2026-02-08 after milestone v1.1 start*
