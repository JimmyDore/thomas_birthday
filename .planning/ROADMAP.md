# Roadmap: Watch Ninja

## Milestones

- v1.0 MVP - Phases 1-3 (shipped 2026-02-07)
- v1.1 Vinted Cards & Buy/Sell - Phases 4-6 (in progress)

## Phases

<details>
<summary>v1.0 MVP (Phases 1-3) - SHIPPED 2026-02-07</summary>

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
**Plans**: 2 plans

Plans:
- [x] 02-01-PLAN.md -- Game state machine, start screen, timer, difficulty ramp, game over screen, replay
- [x] 02-02-PLAN.md -- Fake name progression, floating feedback, golden watch, combo system, Vinted rating, birthday message

### Phase 2.1: Gameplay Polish (INSERTED)
**Goal**: Watch brands are clearly readable, difficulty is brutal enough that positive score feels like a real achievement, and best scores persist in localStorage
**Depends on**: Phase 2
**Success Criteria** (what must be TRUE):
  1. Watch brand names (THOMAS vs fakes) are clearly legible on mobile during gameplay
  2. Finishing with a positive score is extremely difficult -- most players end negative
  3. Best scores are saved in localStorage and displayed on start/game over screens
**Plans**: 1 plan

Plans:
- [x] 02.1-01-PLAN.md -- Brand visibility, difficulty rebalance, localStorage high scores

### Phase 3: Ship It
**Goal**: The game is live at coupe-des-montres.jimmydore.fr with HTTPS and auto-deploys on push
**Depends on**: Phase 2
**Requirements**: INFRA-01, INFRA-02, INFRA-03, INFRA-04
**Success Criteria** (what must be TRUE):
  1. Visiting https://coupe-des-montres.jimmydore.fr on mobile Chrome loads and plays the game
  2. Pushing to master on GitHub triggers an automated deployment that updates the live site
  3. The site serves over HTTPS with a valid SSL certificate
**Plans**: 2 plans

Plans:
- [x] 03-01-PLAN.md -- Local deployment assets (OG tags, favicon, GitHub Actions workflow, repo + secrets setup)
- [x] 03-02-PLAN.md -- VPS setup (git clone, nginx config, SSL) and end-to-end verification

</details>

### v1.1 Vinted Cards & Buy/Sell (In Progress)

**Milestone Goal:** Redesign watches as Vinted listing cards for readability, add a two-act buy/sell game mechanic, and bring sound effects to the game feel.

- [x] **Phase 4: Vinted Cards** - Watches become readable Vinted-style listing cards with proper split animation
- [ ] **Phase 4.1: Dynamics Tuning** - Tune card flight speed, arcs, and rotation for comfortable brand readability
- [ ] **Phase 5: Sound Effects** - Procedural audio feedback for every slash, coin, and penalty
- [ ] **Phase 6: Buy/Sell Mechanic** - Two-act gameplay: buy watches in Act 1, sell inventory in Act 2

## Phase Details

### Phase 4: Vinted Cards
**Goal**: Watches are displayed as white Vinted listing cards with clearly readable brand names, and slashing them feels as satisfying as the original circles
**Depends on**: Phase 3 (v1.0 complete)
**Requirements**: CARD-01, CARD-02, CARD-03, CARD-04, CARD-05, CARD-06
**Success Criteria** (what must be TRUE):
  1. Each watch flies across the screen as a white rounded-rectangle card with a watch illustration and brand name clearly readable at a glance (no squinting, no guessing)
  2. Slashing a card splits it into two tumbling halves that fall off-screen with the same satisfying feel as the current watch split
  3. Fake cards are visually identical to real cards -- only the brand spelling reveals the difference
  4. Golden jackpot cards are visually distinct (gold color treatment) and still trigger the jackpot bonus
  5. Cards fly, rotate, and respond to the existing physics system without framerate drops or visual glitches on mobile
**Plans**: 2 plans

Plans:
- [x] 04-01-PLAN.md -- Card rendering system: drawCardToCanvas, drawWatchIcon, createCardSprite, drawCard (replace 3 watch styles)
- [x] 04-02-PLAN.md -- Integration: wire cards into spawning, collision, split halves, decorative watches, and verify

### Phase 4.1: Dynamics Tuning (INSERTED)
**Goal**: Cards fly slowly enough that brand names are comfortably readable on mobile, with tuned launch speeds, arc heights, and rotation rates that balance readability with satisfying gameplay feel
**Depends on**: Phase 4 (cards render correctly)
**Success Criteria** (what must be TRUE):
  1. Brand names on cards are comfortably readable during flight on mobile -- no squinting or lucky timing needed
  2. Cards still feel satisfying to slash -- not floaty or boring despite slower speeds
  3. Difficulty ramp still works -- later spawns feel harder than early spawns
**Plans**: 1 plan

Plans:
- [ ] 04.1-01-PLAN.md -- Tune 6 physics parameters (gravity, velocity, speed ramp, spawn rate) for readable card flight

### Phase 5: Sound Effects
**Goal**: Every slash, coin gain, and penalty has audio feedback that makes the game feel alive, using procedural synthesis with no audio files
**Depends on**: Phase 4.1 (cards tuned for readability)
**Requirements**: SFX-01, SFX-02, SFX-03, SFX-04, SFX-05, SFX-06
**Success Criteria** (what must be TRUE):
  1. Swiping produces an audible swoosh sound on every swipe, and hitting a card adds a distinct impact sound
  2. Slashing a real card plays a coin/cha-ching sound, slashing a fake plays a penalty buzz -- the player can distinguish good from bad by sound alone
  3. Golden jackpot cards play a special celebratory sound that feels different from regular coin sounds
  4. All sounds work on mobile Chrome on first play (no silent first round, no tap-to-enable-audio prompt)
**Plans**: TBD

Plans:
- [ ] 05-01: TBD

### Phase 6: Buy/Sell Mechanic
**Goal**: The game has two acts -- Act 1 "Les Achats" where the player buys watches and Act 2 "La Revente" where the player sells inventory to buyers -- with a combined final score
**Depends on**: Phase 4 (card rendering), Phase 5 (audio feedback for Act 2 interactions)
**Requirements**: MECH-01, MECH-02, MECH-03, MECH-04, MECH-05, MECH-06, MECH-07, MECH-08
**Success Criteria** (what must be TRUE):
  1. Act 1 plays as "Les Achats" -- the player slashes cards to buy watches and avoids fakes, building an inventory of purchased watches
  2. A transition screen appears between acts showing the player's inventory summary before Act 2 begins
  3. Act 2 plays as "La Revente" -- buyer offer cards fly in with varying prices, and the player slashes to accept deals (good offers = profit, lowball offers = penalty)
  4. Act 2 gets trickier over time -- offers become harder to evaluate as the selling phase progresses
  5. The game over screen shows the combined profit from both acts and a Vinted seller rating reflecting two-act performance
**Plans**: TBD

Plans:
- [ ] 06-01: TBD
- [ ] 06-02: TBD

## Progress

**Execution Order:** Phases execute in numeric order: 4 -> 4.1 -> 5 -> 6

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Core Slashing | v1.0 | 2/2 | Complete | 2026-02-07 |
| 2. Complete Game | v1.0 | 2/2 | Complete | 2026-02-07 |
| 2.1 Gameplay Polish | v1.0 | 1/1 | Complete | 2026-02-07 |
| 3. Ship It | v1.0 | 2/2 | Complete | 2026-02-07 |
| 4. Vinted Cards | v1.1 | 2/2 | Complete | 2026-02-08 |
| 4.1 Dynamics Tuning | v1.1 | 0/1 | Not started | - |
| 5. Sound Effects | v1.1 | 0/1 | Not started | - |
| 6. Buy/Sell Mechanic | v1.1 | 0/2 | Not started | - |
