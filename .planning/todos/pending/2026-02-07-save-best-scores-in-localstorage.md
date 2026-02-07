---
created: 2026-02-07T14:00
title: Save best scores in localStorage
area: general
files: []
---

## Problem

After a game session, the player's score is lost when the page is refreshed. Thomas (and his friends) would enjoy seeing their best scores persist across sessions — adds replayability and friendly competition on the same phone.

## Solution

Use `localStorage` to persist a high-score list (e.g., top 5 scores). Display best score on the start/game-over screen. No server needed — works fully offline on mobile browsers.
