# Watch Ninja

## What This Is

A Fruit Ninja-style mobile browser game where watches fly across the screen and Thomas swipes to slash them. Real Montignac watches earn money, fakes (Montignak, Montinyac, etc.) cost money. The score is his profit in euros. It's a personalized birthday joke for Thomas, themed around his Vinted watch-flipping hobby.

## Core Value

Make Thomas laugh instantly and give him a satisfying 2-minute arcade game to show his friends.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Fruit Ninja-style gameplay — watches fly across the screen, swipe to slash
- [ ] Real Montignac watches = earn money, fake watches = lose money
- [ ] Score displayed as profit in euros
- [ ] Fake watch names (Montignak, Montinyac, variations)
- [ ] Mobile-first (Chrome on phone), touch-based swiping
- [ ] Entire UI in French
- [ ] Personalized for Thomas (name, birthday message)
- [ ] Hosted at roi-du-vinted.jimmydore.fr
- [ ] Docker container + GitHub Actions CI/CD auto-deploy on push to main
- [ ] SSL certificate and nginx on VPS

### Out of Scope

- Native app — browser only
- Multiplayer — single player joke
- Backend/API — fully static client-side
- Desktop optimization — mobile-only
- Complex progression/levels — simple arcade loop
- Sound/music — nice-to-have, not required

## Context

- Thomas is becoming a serious watch collector, buys Montignac watches on Vinted and resells
- The humor is affectionate — celebrating the hobby, not mean-spirited
- Birthday is within a week — must ship fast
- Game shared via URL link
- Classic arcade simplicity — like casse-briques or pong, not a complex simulator

## Constraints

- **Timeline**: < 1 week — birthday deadline
- **Platform**: Mobile Chrome only — touch-based swiping
- **Language**: Entire UI in French
- **Complexity**: Simple arcade game — single HTML/CSS/JS or small static bundle
- **Hosting**: Static files on VPS, Docker + nginx, GitHub Actions deploy

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Fruit Ninja-style over simulator | User wanted simple, dynamic arcade feel — not a complex Vinted simulator | — Pending |
| Money-based scoring | Ties directly to Thomas's Vinted flipping hobby — profit in euros | — Pending |
| Client-side only (HTML/CSS/JS) | No server needed for a joke game, simplest to host | — Pending |

---
*Last updated: 2026-02-07 after initialization*
