# La Coupe des Montres

A Fruit Ninja-style mobile browser game where you slash watches flying across the screen. Built as a birthday gift for Thomas, celebrating his hobby as a Vinted watch reseller.

**Play it:** https://coupe-des-montres.jimmydore.fr

## How It Works

The game has two acts:

1. **Act 1 - Les Achats (35s):** Watches fly across the screen as Vinted-style listing cards. Slash real Montignac watches to buy them and build your inventory. Avoid fakes (Montignak, Montinyac...) or lose money.

2. **Act 2 - La Revente (35s):** Buyers appear with offer cards. Swipe right to accept good deals, swipe left to reject lowball offers. Your final score is the profit from reselling your inventory.

## Features

- Vinted-style card visuals with watch illustrations and price tags
- Combo multiplier system (up to 5x)
- Golden jackpot watches
- Procedural sound effects (zero audio files) via Web Audio API
- Difficulty ramp throughout each act
- Vinted seller rating based on final score
- High score persistence via localStorage

## Tech Stack

Zero dependencies. The entire game is a single `game.js` file (~2000 lines) and an `index.html`. No frameworks, no build tools, no npm.

| Component | Technology |
|-----------|-----------|
| Graphics | HTML5 Canvas 2D |
| Input | Pointer Events API (touch + mouse) |
| Animation | requestAnimationFrame with delta-time |
| Audio | Web Audio API with procedural synthesis |
| Hosting | Static site on nginx with HTTPS |
| CI/CD | GitHub Actions (auto-deploy on push to master) |

## Run Locally

```bash
python3 -m http.server 8000
# Open http://localhost:8000 on your phone or in Chrome DevTools mobile emulation
```

No install step required.

## Deploy

Pushing to `master` triggers automatic deployment via GitHub Actions to the VPS.

```bash
git push origin master
```
