---
phase: quick
plan: 001
type: execute
wave: 1
depends_on: []
files_modified: [game.js]
autonomous: true

must_haves:
  truths:
    - "Offer price on buyer cards is a single neutral color (no green/red hint)"
    - "Buyer cards display the purchase cost alongside the offer price"
    - "Player must mentally compare the two prices to decide accept/reject"
    - "Accept/reject feedback (floating text, sounds) still works unchanged"
  artifacts:
    - path: "game.js"
      provides: "Updated drawBuyerCardToCanvas and createBuyerOffer"
      contains: "Achet"
  key_links:
    - from: "createBuyerOffer"
      to: "drawBuyerCardToCanvas"
      via: "card.cost property"
      pattern: "cost.*inventoryItem\\.cost"
---

<objective>
Remove the green/red color hint from buyer card offer prices and show both the purchase cost and offer price, forcing the player to do mental math.

Purpose: Act 2 is currently trivially easy because the color coding tells the player exactly which offers are profitable. Removing the hint and showing both prices creates a genuine decision moment.
Output: Updated `drawBuyerCardToCanvas` in game.js with neutral-color dual-price layout.
</objective>

<execution_context>
@/Users/jimmydore/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jimmydore/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@game.js (lines 1114-1267: drawBuyerCardToCanvas, createBuyerSprite, createBuyerOffer)
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add cost to buyer card object and redesign card layout with dual prices</name>
  <files>game.js</files>
  <action>
Two changes in game.js:

**A. In `createBuyerOffer` (~line 1240-1260):**
Add `cost: inventoryItem.cost` to the card object literal. Place it after the `offerPrice` property (around line 1252). The `isGoodDeal` property can remain on the object -- it is still used by `acceptOffer` for feedback text/sounds. Do NOT remove `isGoodDeal` from the object or from the calculation logic.

**B. In `drawBuyerCardToCanvas` (~lines 1114-1171):**
Redesign the vertical layout to fit two prices instead of one. The card dimensions stay the same (CARD_WIDTH x CARD_HEIGHT). New layout from top to bottom:

1. "OFFRE" label at ~10% height -- keep as-is (bold 10px, #007782)
2. Brand name at ~35% height -- keep as-is (bold dynamic-size, #333333)
3. Purchase cost at ~58% height -- NEW line:
   - Font: `'13px sans-serif'` (lighter weight than offer price)
   - Color: `'#777777'` (subtle gray)
   - Text: `'Achete: ' + card.cost + ' EUR'` (no accent on e -- canvas font rendering is inconsistent with accents at small sizes; keep it simple)
4. Offer price at ~73% height -- MODIFIED:
   - Font: keep `'bold 18px sans-serif'`
   - Color: change from `card.isGoodDeal ? '#2a7d4f' : '#cc3333'` to a single neutral color `'#1a5276'` (dark blue, fits the blue/teal card theme)
   - Text: keep `card.offerPrice + ' EUR'`
5. Directional hints at ~92% height -- keep as-is

The key change on the offer price line (line 1161) is replacing:
```js
offCtx.fillStyle = card.isGoodDeal ? '#2a7d4f' : '#cc3333';
```
with:
```js
offCtx.fillStyle = '#1a5276';
```

And inserting the purchase cost lines BEFORE the offer price block.
  </action>
  <verify>
Open the game in browser, play through Act 1 to collect some watches, then enter Act 2. Verify:
1. Buyer cards show "Achete: X EUR" in gray above the offer price
2. Offer price is always dark blue -- no green or red coloring
3. Both prices are legible and not overlapping
4. Swiping right (accept) and left (reject) still works with correct feedback
5. Game over screen still shows correct profit calculation
  </verify>
  <done>Buyer cards display purchase cost in gray and offer price in neutral dark blue. No color hints reveal whether an offer is profitable. Player must compare the two numbers mentally. All accept/reject logic, floating text feedback, and sounds remain unchanged.</done>
</task>

</tasks>

<verification>
- Visual: Buyer cards show two price lines, both legible, no overlap
- Visual: Offer price is always the same dark blue color regardless of deal quality
- Functional: Accept good deal still shows positive feedback, accept bad deal still shows negative feedback (feedback happens AFTER the decision, which is correct)
- Functional: Game over profit calculation unchanged
- No regressions in Act 1 card rendering
</verification>

<success_criteria>
- Offer price uses single neutral color '#1a5276' (no conditional coloring)
- Purchase cost line ("Achete: X EUR") visible on every buyer card
- Card layout fits both prices without visual clutter
- Accept/reject mechanics and feedback completely unchanged
</success_criteria>

<output>
After completion, create `.planning/quick/001-remove-color-hints-show-both-prices/001-SUMMARY.md`
</output>
