# Requirements: Watch Ninja

**Defined:** 2026-02-07
**Core Value:** Make Thomas laugh instantly and give him a satisfying 2-minute arcade game to show his friends.

## v1.0 Requirements (Complete)

### Core Gameplay

- [x] **GAME-01**: Watches fly across the screen in parabolic arcs
- [x] **GAME-02**: Player swipes to slash watches with visible finger trail
- [x] **GAME-03**: Slashed watches split with satisfying animation
- [x] **GAME-04**: Real Montignac = earn money, fake watches = lose money
- [x] **GAME-05**: Running score displayed as profit in euros
- [x] **GAME-06**: Round lasts 60-90 seconds with countdown timer
- [x] **GAME-07**: Difficulty ramps up (more watches, faster spawns)
- [x] **GAME-08**: Game over screen with final score

### Content & Humor

- [x] **CONT-01**: Fake brand names (Montignak, Montinyac) that get sneakier over time
- [x] **CONT-02**: Feedback text on slash ("Bonne affaire!" / "Arnaque!")
- [x] **CONT-03**: Special rare golden watch worth big bonus money
- [x] **CONT-04**: Vinted seller rating on game over screen based on performance

### Personalization

- [x] **PERS-01**: Thomas's name on title screen and score screen
- [x] **PERS-02**: Birthday message

### Game Feel

- [x] **FEEL-01**: Swipe trail effect following finger
- [x] **FEEL-02**: Haptic vibration on slash (if device supports it)

### Infrastructure

- [x] **INFRA-01**: Static site hosted on VPS at coupe-des-montres.jimmydore.fr
- [x] **INFRA-02**: nginx serving the game
- [x] **INFRA-03**: GitHub Actions CI/CD -- auto-deploy on push to master
- [x] **INFRA-04**: SSL certificate and nginx configuration on VPS

### Platform

- [x] **PLAT-01**: Mobile-first design (Chrome on phone), touch-based swiping
- [x] **PLAT-02**: Entire UI in French
- [x] **PLAT-03**: No install needed -- plays in browser

## v1.1 Requirements

### Vinted Card Visuals

- [x] **CARD-01**: Watches displayed as white rounded Vinted-style listing cards
- [x] **CARD-02**: Brand name rendered clearly below watch illustration (14-16px bold on white background)
- [x] **CARD-03**: Cards fly and rotate using existing physics system
- [x] **CARD-04**: Slashed cards split into two tumbling halves
- [x] **CARD-05**: Fake cards look identical to real ones except for brand spelling
- [x] **CARD-06**: Golden card variant for jackpot watches

### Buy/Sell Mechanic

- [ ] **MECH-01**: Act 1 "Les Achats" -- player slashes cards to buy watches, avoiding fakes
- [ ] **MECH-02**: Inventory system tracks watches purchased during Act 1
- [ ] **MECH-03**: Transition screen between Act 1 and Act 2 showing inventory summary
- [ ] **MECH-04**: Act 2 "La Revente" -- buyer offer cards fly in, player slashes to accept deals
- [ ] **MECH-05**: Offer prices vary from lowball to great deals -- player judges which to accept
- [ ] **MECH-06**: Act 2 difficulty ramp -- offers get trickier over time
- [ ] **MECH-07**: Final score combines profit from both acts
- [ ] **MECH-08**: Vinted seller rating updated to reflect two-act performance

### Sound Effects

- [ ] **SFX-01**: Slash swoosh sound on swipe
- [ ] **SFX-02**: Impact sound on successful card hit
- [ ] **SFX-03**: Coin/cha-ching sound on good deal
- [ ] **SFX-04**: Penalty buzz sound on fake/bad deal
- [ ] **SFX-05**: Jackpot sound for golden watches
- [ ] **SFX-06**: All sounds generated via Web Audio API procedural synthesis (no audio files)

## Future Requirements

### Deferred to v2

- **V2-03**: Share score button
- **V2-04**: More watch brands and special items
- Heart icon on Vinted cards -- visual polish
- Price tag on Vinted cards -- visual polish

## Out of Scope

| Feature | Reason |
|---------|--------|
| Native app | Browser-only joke game |
| Multiplayer | Single player birthday joke |
| Backend/API | Fully static client-side game |
| Desktop optimization | Mobile-only, Chrome on phone |
| Game framework (Phaser, PixiJS) | Overkill -- vanilla JS + Canvas |
| Build tooling (webpack, vite) | Unnecessary complexity |
| Pre-recorded audio files | Procedural synthesis keeps zero-dependency constraint |
| Tutorial/onboarding | Fruit Ninja is universally understood |
| Leaderboard | Single player, localStorage sufficient |

## Traceability

### v1.0 (Complete)

| Requirement | Phase | Status |
|-------------|-------|--------|
| GAME-01 | Phase 1 | Complete |
| GAME-02 | Phase 1 | Complete |
| GAME-03 | Phase 1 | Complete |
| GAME-04 | Phase 1 | Complete |
| GAME-05 | Phase 1 | Complete |
| GAME-06 | Phase 2 | Complete |
| GAME-07 | Phase 2 | Complete |
| GAME-08 | Phase 2 | Complete |
| CONT-01 | Phase 2 | Complete |
| CONT-02 | Phase 2 | Complete |
| CONT-03 | Phase 2 | Complete |
| CONT-04 | Phase 2 | Complete |
| PERS-01 | Phase 2 | Complete |
| PERS-02 | Phase 2 | Complete |
| FEEL-01 | Phase 1 | Complete |
| FEEL-02 | Phase 1 | Complete |
| INFRA-01 | Phase 3 | Complete |
| INFRA-02 | Phase 3 | Complete |
| INFRA-03 | Phase 3 | Complete |
| INFRA-04 | Phase 3 | Complete |
| PLAT-01 | Phase 1 | Complete |
| PLAT-02 | Phase 1 | Complete |
| PLAT-03 | Phase 1 | Complete |

### v1.1

| Requirement | Phase | Status |
|-------------|-------|--------|
| CARD-01 | Phase 4 | Complete |
| CARD-02 | Phase 4 | Complete |
| CARD-03 | Phase 4 | Complete |
| CARD-04 | Phase 4 | Complete |
| CARD-05 | Phase 4 | Complete |
| CARD-06 | Phase 4 | Complete |
| SFX-01 | Phase 5 | Pending |
| SFX-02 | Phase 5 | Pending |
| SFX-03 | Phase 5 | Pending |
| SFX-04 | Phase 5 | Pending |
| SFX-05 | Phase 5 | Pending |
| SFX-06 | Phase 5 | Pending |
| MECH-01 | Phase 6 | Pending |
| MECH-02 | Phase 6 | Pending |
| MECH-03 | Phase 6 | Pending |
| MECH-04 | Phase 6 | Pending |
| MECH-05 | Phase 6 | Pending |
| MECH-06 | Phase 6 | Pending |
| MECH-07 | Phase 6 | Pending |
| MECH-08 | Phase 6 | Pending |

**Coverage:**
- v1.0 requirements: 23/23 mapped (all complete)
- v1.1 requirements: 20/20 mapped
- Unmapped: 0

---
*Requirements defined: 2026-02-07*
*Last updated: 2026-02-08 after v1.1 roadmap creation*
