# Quick Task 001: Remove Color Hints, Show Both Prices

## What Changed

- **Buyer cards** in Act 2 now show **two prices**:
  - "Achete: X EUR" (purchase cost) in subtle gray
  - Offer price in neutral dark blue (`#1a5276`)
- **Removed** the green/red conditional coloring (`isGoodDeal ? '#2a7d4f' : '#cc3333'`)
- **Added** `cost` property to buyer card objects (from `inventoryItem.cost`)
- **Adjusted** card vertical layout: brand at 35%, cost at 55%, offer at 73%

## Files Modified

| File | Lines | Change |
|------|-------|--------|
| game.js | 1153-1167 | Redesigned `drawBuyerCardToCanvas` layout with dual prices, neutral color |
| game.js | 1258 | Added `cost: inventoryItem.cost` to card object in `createBuyerOffer` |

## Commit

`de82d73` — feat: remove green/red color hints from Act 2 buyer cards, show both prices
