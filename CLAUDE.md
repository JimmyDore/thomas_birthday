# CLAUDE.md

## Project

Watch Ninja ("La Coupe des Montres") - A birthday gift game for Thomas. Fruit Ninja-style watch trading sim: slash cards in Act 1 to buy watches, sell them in Act 2 for profit.

Single-file vanilla JS game (`game.js` + `index.html`), canvas-based, zero dependencies.

## Testing the Game with Playwright

The game is canvas-based with no DOM elements, so standard DOM testing doesn't apply. Use Playwright to simulate gameplay and inspect internal state via `page.evaluate()`.

### Setup

```bash
# Start local server
python3 -m http.server 8765 &

# Install playwright if needed
npm install playwright
npx playwright install
```

### Running the test

```bash
node test-game.mjs
```

This script:
1. Opens the game in a headless Chromium browser (390x844 iPhone viewport)
2. Clicks "Jouer" to start Act 1
3. Simulates swipes across multiple screen heights to slash watches
4. Waits for transition screen, extracts inventory data via `page.evaluate(() => inventory)`
5. Clicks "Vendre!" to enter Act 2
6. Simulates swipes to accept buyer offers
7. Waits for game over, extracts final results
8. Saves screenshots to `screenshots/` at key moments

### Key technique: reading canvas game state

Since the game renders to canvas, you can't query DOM. Instead inject JS to read game globals:

```javascript
const data = await page.evaluate(() => ({
  gameState,          // 'start' | 'act1' | 'transition' | 'act2' | 'over'
  inventory,          // [{brand, price, cost, isFake, isGolden, sold, soldFor}]
  act1Spending,       // total EUR spent in Act 1
  act2Revenue,        // total EUR earned in Act 2
  score,              // current score / final profit
  watches,            // active flying cards on screen
  combo,              // current combo count
}));
```

### Screenshots

Screenshots are saved to `screenshots/` with numbered prefixes:
- `01-start-screen.png` - Title screen
- `02-act1-start.png` - Beginning of Act 1
- `03-act1-mid.png` - Act 1 at ~10 seconds
- `04-act1-late.png` - Act 1 at ~50 seconds
- `05-transition.png` - Inventory summary between acts
- `06-act2-start.png` - Beginning of Act 2
- `07-act2-offers.png` - Act 2 with buyer cards visible
- `08-act2-mid.png` - Act 2 midway
- `09-game-over.png` - Final results screen

## Build & Deploy

- No build step. Static files served directly.
- Deployed to https://coupe-des-montres.jimmydore.fr
- Push to `master` triggers GitHub Actions deploy to VPS via SSH
