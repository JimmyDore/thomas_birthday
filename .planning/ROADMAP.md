# Roadmap: Thomas Watch Flipper

## Overview

Three phases take this from zero to a playable birthday joke: first a deployable Vinted-parody shell, then the full gameplay loop with escalating absurdity, then the personal touches that make Thomas laugh. The entire game ships as static HTML/CSS/JS behind a Docker container on the VPS.

## Phases

- [ ] **Phase 1: Deployable Shell** - Vinted-parody UI skeleton live on VPS, mobile-first, all French
- [ ] **Phase 2: Gameplay Loop** - Playable game with listings, tapping, tricks, scoring, and escalating absurdity
- [ ] **Phase 3: Birthday Payoff** - Thomas's name, birthday message, and final polish

## Phase Details

### Phase 1: Deployable Shell
**Goal**: A mobile-first Vinted-parody page is live at roi-du-vinted.jimmydore.fr, served via Docker, auto-deployed from GitHub
**Depends on**: Nothing (first phase)
**Requirements**: INFRA-01, INFRA-02, INFRA-03, INFRA-04, PLAT-01, PLAT-02, PLAT-03, PERS-03
**Success Criteria** (what must be TRUE):
  1. Visiting roi-du-vinted.jimmydore.fr on mobile Chrome shows a Vinted-style parody page in French
  2. The page is served over HTTPS with a valid SSL certificate
  3. Pushing to main on GitHub triggers an automatic deployment that updates the live site
  4. The page looks and feels like a mobile app (no horizontal scroll, touch-friendly layout)
**Plans**: TBD

Plans:
- [ ] 01-01: Static site scaffold and Vinted parody UI
- [ ] 01-02: Docker, nginx, CI/CD, and VPS deployment

### Phase 2: Gameplay Loop
**Goal**: The game is fully playable -- listings scroll, player taps deals, tricks mess with them, absurdity escalates, and score tracks profit/loss
**Depends on**: Phase 1
**Requirements**: GAME-01, GAME-02, GAME-03, GAME-04, GAME-05, CONT-01, CONT-02, CONT-03, CONT-04
**Success Criteria** (what must be TRUE):
  1. Watch listings appear in a scrolling feed and the player can tap to buy them
  2. Some listings trick the player -- prices or brand names change right before a tap lands
  3. A running profit/loss score is visible during gameplay and updates on each buy
  4. The game starts with normal-looking watches and escalates to absurd items (potato watches, sundials) with fake brand names (Montignak, Montinyac) and funny French descriptions
  5. A round lasts 2-3 minutes with increasing speed, then ends with a final score
**Plans**: TBD

Plans:
- [ ] 02-01: Core game engine (listings feed, tapping, scoring, round timer)
- [ ] 02-02: Content and tricks (absurd items, fake brands, price traps, escalation curve)

### Phase 3: Birthday Payoff
**Goal**: The game feels like a personal birthday gift for Thomas, not a generic joke
**Depends on**: Phase 2
**Requirements**: PERS-01, PERS-02
**Success Criteria** (what must be TRUE):
  1. Thomas's name appears on the title screen and the end-of-game score screen
  2. A birthday message or screen is shown (either before the game starts or after the round ends)
**Plans**: TBD

Plans:
- [ ] 03-01: Title screen, birthday message, and personalized score screen

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Deployable Shell | 0/2 | Not started | - |
| 2. Gameplay Loop | 0/2 | Not started | - |
| 3. Birthday Payoff | 0/1 | Not started | - |
