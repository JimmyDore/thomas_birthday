# Phase 6: Buy/Sell Mechanic - Context

**Gathered:** 2026-02-08
**Status:** Ready for planning

<domain>
## Phase Boundary

Two-act gameplay: Act 1 "Les Achats" where the player slashes cards to buy watches (building inventory), and Act 2 "La Revente" where buyer offer cards fly in and the player sells inventory for profit. Combined final score from both acts. The card rendering, physics, and sound systems already exist from prior phases.

</domain>

<decisions>
## Implementation Decisions

### Act 2 selling mechanic
- Every watch slashed in Act 1 goes into inventory (both real and fake) — all must be sellable in Act 2
- Buyer cards fly in showing the watch brand name + offer price — player sees which watch is being offered on
- Player judges offers against what they paid in Act 1 — good offer = profit, bad offer = loss
- Difficulty ramps via shrinking margins (offers get closer to purchase price), NOT via speed — keeps cards readable
- Fakes bought in Act 1 become a liability — stuck in inventory, harder to sell profitably
- Core interaction for Act 2 TBD — needs to feel different from Act 1's slash-to-buy (Claude to explore options)

### Inventory & transition screen
- Full inventory summary shown between acts — player sees all watches bought with brands and prices
- Fakes are revealed during transition ("Oops, 2 contrefacons dans le lot!") — dramatic "moment of truth"
- Player-paced: tap "Vendre !" button to start Act 2 (no auto-advance)

### Scoring & rating
- Final score = Act 2 sales revenue - Act 1 costs - unsold inventory value (three ways to lose money)
- Act 2 is timed like Act 1 — when timer runs out, remaining unsold inventory counts as a loss
- Vinted seller rating reflects both acts combined (buying smart AND selling smart)
- Game over screen shows full breakdown: Act 1 spending, Act 2 revenue, unsold losses, final profit

### Act 1 changes
- Act 1 keeps its current timer length — Act 2 adds extra time on top (longer total game)
- Economy stays identical to current: real +10, fake -15, miss -8
- Display reframed as spending: "Depense: X EUR" instead of profit
- "Acte 1: Les Achats" header shown during gameplay
- Running inventory counter displayed: "4 montres achetees"

### Claude's Discretion
- Act 2 core interaction design (must feel different from Act 1 slash — explore options during research/planning)
- Transition screen visual style (mini card grid vs text list vs hybrid)
- Act 2 timer duration relative to Act 1
- Act 2 economy values (offer ranges, margins, penalty for bad sales)
- How buyer offers map to inventory (random order, all watches get offers, etc.)

</decisions>

<specifics>
## Specific Ideas

- Unsold inventory as a loss creates triple pressure: buy smart, sell smart, sell everything
- Transition screen as a dramatic "moment of truth" where fakes are revealed
- Act 1 spending display + inventory counter reframes the existing game as "shopping"
- Difficulty via trickier margins (not speed) stays consistent with Phase 4.1 readability tuning

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 06-buy-sell-mechanic*
*Context gathered: 2026-02-08*
