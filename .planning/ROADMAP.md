# Roadmap: Watch Ninja

## Overview

Watch Ninja ships in three phases: build the core slashing mechanics first so the game feels satisfying on mobile, then add game structure and all the Thomas-specific humor that makes it a birthday joke, then deploy to roi-du-vinted.jimmydore.fr. The entire project is a vanilla JS + Canvas static game targeting mobile Chrome.

## Phases

- [x] **Phase 1: Core Slashing** - Watches fly, player swipes to slash, score tracks profit in euros
- [ ] **Phase 2: Complete Game** - Timer, difficulty ramp, start/end screens, humor content, birthday personalization
- [ ] **Phase 3: Ship It** - Docker + nginx + SSL + CI/CD to roi-du-vinted.jimmydore.fr

## Phase Details

### Phase 1: Core Slashing
**Goal**: Player can swipe to slash watches on a mobile phone and see their profit change in euros
**Depends on**: Nothing (first phase)
**Requirements**: GAME-01, GAME-02, GAME-03, GAME-04, GAME-05, FEEL-01, FEEL-02, PLAT-01, PLAT-02, PLAT-03
**Success Criteria** (what must be TRUE):
  1. Opening index.html on mobile Chrome shows a canvas that fills the screen with no scroll, zoom, or browser interference on touch
  2. Watches launch from the bottom of the screen in parabolic arcs and fall off-screen with gravity
  3. Swiping a finger across the screen draws a visible fading trail and slashing a watch splits it into two tumbling halves
  4. Real Montignac watches add euros to the score, fake watches subtract euros, and the running profit is displayed on screen
  5. The entire UI text is in French
**Plans**: 2 plans

Plans:
- [x] 01-01-PLAN.md -- Canvas foundation, game loop, touch input, swipe trail, and mobile setup
- [x] 01-02-PLAN.md -- Watch spawning, physics, slash detection, split animation, particles, and scoring

### Phase 2: Complete Game
**Goal**: Thomas can play a full timed round with increasing difficulty, see his Vinted seller rating, and read his birthday message
**Depends on**: Phase 1
**Requirements**: GAME-06, GAME-07, GAME-08, CONT-01, CONT-02, CONT-03, CONT-04, PERS-01, PERS-02
**Success Criteria** (what must be TRUE):
  1. A start screen shows the game title with Thomas's name and a play button
  2. The game runs for a fixed countdown timer with difficulty ramping up (more watches, faster spawns) as time passes
  3. Fake watch brand names get progressively sneakier over the round (Montignak early, subtler misspellings later)
  4. Slashing a watch shows floating feedback text ("Bonne affaire!" or "Arnaque!") and a rare golden watch appears for big bonus money
  5. Game over screen shows final profit, a Vinted seller rating based on performance, Thomas's birthday message, and a replay button
**Plans**: TBD

Plans:
- [ ] 02-01: Start screen, timer, difficulty ramp, game over flow
- [ ] 02-02: Humor content -- fake names progression, feedback text, golden watch, Vinted rating, birthday message

### Phase 3: Ship It
**Goal**: The game is live at roi-du-vinted.jimmydore.fr with HTTPS and auto-deploys on push
**Depends on**: Phase 2
**Requirements**: INFRA-01, INFRA-02, INFRA-03, INFRA-04
**Success Criteria** (what must be TRUE):
  1. Visiting https://roi-du-vinted.jimmydore.fr on mobile Chrome loads and plays the game
  2. Pushing to main on GitHub triggers an automated deployment that updates the live site
  3. The site serves over HTTPS with a valid SSL certificate
**Plans**: TBD

Plans:
- [ ] 03-01: Dockerfile, nginx config, GitHub Actions CI/CD, SSL setup, DNS

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Core Slashing | 2/2 | Complete | 2026-02-07 |
| 2. Complete Game | 0/2 | Not started | - |
| 3. Ship It | 0/1 | Not started | - |
