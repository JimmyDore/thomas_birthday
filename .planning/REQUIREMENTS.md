# Requirements: Thomas Watch Flipper

**Defined:** 2026-02-07
**Core Value:** Make Thomas laugh the second he opens it, and keep him playing for a couple of minutes.

## v1 Requirements

### Gameplay

- [ ] **GAME-01**: Watch listings appear in a scrolling feed, player taps to buy
- [ ] **GAME-02**: Trick mechanics — prices/brands change just before player taps
- [ ] **GAME-03**: Running profit/loss score tracker visible during gameplay
- [ ] **GAME-04**: Game round lasts 2-3 minutes with increasing speed
- [ ] **GAME-05**: Good buy = profit, bad buy = loss, missed deal = gone

### Content

- [ ] **CONT-01**: Escalating absurdity — normal watches first, then potato watches, sundials, absurd items
- [ ] **CONT-02**: Fake brand names — Montignak, Montinyac, variations of Montignac
- [ ] **CONT-03**: Funny listing descriptions in French
- [ ] **CONT-04**: Price traps — listings that switch to insane prices before tap

### Personalization

- [ ] **PERS-01**: Thomas's name featured in game (title screen, score screen)
- [ ] **PERS-02**: Birthday message/screen
- [ ] **PERS-03**: Vinted-style parody UI

### Infrastructure

- [ ] **INFRA-01**: Static site hosted on VPS at roi-du-vinted.jimmydore.fr
- [ ] **INFRA-02**: Docker container serving the game (nginx)
- [ ] **INFRA-03**: GitHub Actions CI/CD — auto-deploy on push to main
- [ ] **INFRA-04**: SSL certificate and nginx configuration on VPS

### Platform

- [ ] **PLAT-01**: Mobile-first design (Chrome on phone)
- [ ] **PLAT-02**: Entire UI in French
- [ ] **PLAT-03**: No install needed — plays in browser

## v2 Requirements

### Nice-to-Have

- **V2-01**: Sound effects (coin sound on good buy, buzzer on bad buy)
- **V2-02**: High score persistence (localStorage)
- **V2-03**: Share score button ("J'ai fait X€ de profit!")
- **V2-04**: More absurd content packs (different themes per replay)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Native mobile app | Browser-only joke game, no app store needed |
| Multiplayer | Single player birthday joke |
| Backend/API | Fully static client-side game |
| User accounts/login | No persistence needed for a joke game |
| Desktop optimization | Thomas will play on his phone |
| Cross-browser support | Chrome only, as specified |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| GAME-01 | Phase 2 | Pending |
| GAME-02 | Phase 2 | Pending |
| GAME-03 | Phase 2 | Pending |
| GAME-04 | Phase 2 | Pending |
| GAME-05 | Phase 2 | Pending |
| CONT-01 | Phase 2 | Pending |
| CONT-02 | Phase 2 | Pending |
| CONT-03 | Phase 2 | Pending |
| CONT-04 | Phase 2 | Pending |
| PERS-01 | Phase 3 | Pending |
| PERS-02 | Phase 3 | Pending |
| PERS-03 | Phase 1 | Pending |
| INFRA-01 | Phase 1 | Pending |
| INFRA-02 | Phase 1 | Pending |
| INFRA-03 | Phase 1 | Pending |
| INFRA-04 | Phase 1 | Pending |
| PLAT-01 | Phase 1 | Pending |
| PLAT-02 | Phase 1 | Pending |
| PLAT-03 | Phase 1 | Pending |

**Coverage:**
- v1 requirements: 19 total
- Mapped to phases: 19
- Unmapped: 0

---
*Requirements defined: 2026-02-07*
*Last updated: 2026-02-07 after roadmap creation*
