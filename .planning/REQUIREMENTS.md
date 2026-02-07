# Requirements: Watch Ninja

**Defined:** 2026-02-07
**Core Value:** Make Thomas laugh instantly and give him a satisfying 2-minute arcade game to show his friends.

## v1 Requirements

### Core Gameplay

- [ ] **GAME-01**: Watches fly across the screen in parabolic arcs
- [ ] **GAME-02**: Player swipes to slash watches with visible finger trail
- [ ] **GAME-03**: Slashed watches split with satisfying animation
- [ ] **GAME-04**: Real Montignac = earn money, fake watches = lose money
- [ ] **GAME-05**: Running score displayed as profit in euros
- [ ] **GAME-06**: Round lasts 60-90 seconds with countdown timer
- [ ] **GAME-07**: Difficulty ramps up (more watches, faster spawns)
- [ ] **GAME-08**: Game over screen with final score

### Content & Humor

- [ ] **CONT-01**: Fake brand names (Montignak, Montinyac) that get sneakier over time
- [ ] **CONT-02**: Feedback text on slash ("Bonne affaire!" / "Arnaque!")
- [ ] **CONT-03**: Special rare golden watch worth big bonus money
- [ ] **CONT-04**: Vinted seller rating on game over screen based on performance

### Personalization

- [ ] **PERS-01**: Thomas's name on title screen and score screen
- [ ] **PERS-02**: Birthday message

### Game Feel

- [ ] **FEEL-01**: Swipe trail effect following finger
- [ ] **FEEL-02**: Haptic vibration on slash (if device supports it)

### Infrastructure

- [ ] **INFRA-01**: Static site hosted on VPS at roi-du-vinted.jimmydore.fr
- [ ] **INFRA-02**: Docker container with nginx serving the game
- [ ] **INFRA-03**: GitHub Actions CI/CD — auto-deploy on push to main
- [ ] **INFRA-04**: SSL certificate and nginx configuration on VPS

### Platform

- [ ] **PLAT-01**: Mobile-first design (Chrome on phone), touch-based swiping
- [ ] **PLAT-02**: Entire UI in French
- [ ] **PLAT-03**: No install needed — plays in browser

## v2 Requirements

### Nice-to-Have

- **V2-01**: Sound effects (slash sound, coin sound on good buy)
- **V2-02**: High score persistence (localStorage)
- **V2-03**: Share score button
- **V2-04**: More watch brands and special items
- **V2-05**: Combo multiplier for consecutive good slashes

## Out of Scope

| Feature | Reason |
|---------|--------|
| Native app | Browser-only joke game |
| Multiplayer | Single player birthday joke |
| Backend/API | Fully static client-side game |
| Desktop optimization | Mobile-only, Chrome on phone |
| Game framework (Phaser, PixiJS) | Overkill for a simple arcade game — vanilla JS + Canvas |
| Build tooling (webpack, vite) | Unnecessary complexity for static files |
| Multiple game modes | One mode is enough for a joke game |
| Tutorial/onboarding | Fruit Ninja is universally understood |
| Leaderboard | Single player, no persistence needed |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| GAME-01 | Phase 1 | Pending |
| GAME-02 | Phase 1 | Pending |
| GAME-03 | Phase 1 | Pending |
| GAME-04 | Phase 1 | Pending |
| GAME-05 | Phase 1 | Pending |
| GAME-06 | Phase 2 | Pending |
| GAME-07 | Phase 2 | Pending |
| GAME-08 | Phase 2 | Pending |
| CONT-01 | Phase 2 | Pending |
| CONT-02 | Phase 2 | Pending |
| CONT-03 | Phase 2 | Pending |
| CONT-04 | Phase 2 | Pending |
| PERS-01 | Phase 2 | Pending |
| PERS-02 | Phase 2 | Pending |
| FEEL-01 | Phase 1 | Pending |
| FEEL-02 | Phase 1 | Pending |
| INFRA-01 | Phase 3 | Pending |
| INFRA-02 | Phase 3 | Pending |
| INFRA-03 | Phase 3 | Pending |
| INFRA-04 | Phase 3 | Pending |
| PLAT-01 | Phase 1 | Pending |
| PLAT-02 | Phase 1 | Pending |
| PLAT-03 | Phase 1 | Pending |

**Coverage:**
- v1 requirements: 23 total
- Mapped to phases: 23
- Unmapped: 0

---
*Requirements defined: 2026-02-07*
*Last updated: 2026-02-07 after roadmap creation*
