# Phase 2: Complete Game - Context

**Gathered:** 2026-02-07
**Status:** Ready for planning

<domain>
## Phase Boundary

Turn the core slashing mechanic into a full timed arcade round with Thomas-specific birthday humor. Adds start screen, 60-second countdown timer, difficulty ramp, humor content (fake name progression, floating feedback, golden watch), combo system, live Vinted rating, game over with score breakdown and birthday message, and replay. Does NOT add new game mechanics, social features, or deployment.

</domain>

<decisions>
## Implementation Decisions

### Start & end screens
- Themed splash start screen with Vinted-style branding and watches flying
- Thomas's name front and center on start screen — he sees "Thomas" immediately (e.g. "Thomas, bienvenue sur le Vinted des montres")
- Game over shows score breakdown: watches slashed, fakes caught, profit — then birthday message below
- Replay button only ("Rejouer") — no share feature

### Difficulty ramp
- 60-second rounds — quick and intense, easy to replay
- Smooth difficulty curve — gradual increase, barely noticeable at first, frantic by the end
- Both quantity AND speed ramp up over the 60 seconds
- Fake/real ratio shifts: mostly real watches early, increasing fake ratio as time passes — forces attention late

### In-game feedback
- Quick pop-up floating text at slash point ("Bonne affaire!" / "Arnaque!") — small, fades fast, doesn't block gameplay
- Golden watch: rare random spawn, low chance any watch is golden, big bonus euros when slashed
- Combo system: consecutive correct slashes build a multiplier (x2, x3...), resets on fake slash or miss
- Vinted seller rating displayed live during gameplay, updating in real-time as Thomas plays

### Humor & tone
- Fake watch names progress from obvious to subtle: ridiculous fakes early ("Montagniak", "Montignoque"), near-misses late ("Montignak")
- Absurd / over-the-top comedic vibe — everything exaggerated, dramatic reactions, ridiculous fake names, the whole thing is silly
- Vinted-style star ratings (1-5★) with Vinted-flavored French labels: "Vendeur douteux" (1★) to "Roi du Vinted" (5★)
- Birthday message written by user (exact text below)

### Claude's Discretion
- Start screen visual composition and animation
- Exact combo multiplier caps and display style
- Rating tier thresholds and intermediate labels (between "Vendeur douteux" and "Roi du Vinted")
- Floating text colors, font size, fade timing
- Golden watch visual distinction and spawn probability
- Timer display style and countdown warnings

</decisions>

<specifics>
## Specific Ideas

- Birthday message (exact text): "Joyeux anniversaire mon frère, longue vie aux montres et à Montignac"
- Start screen should feel like a Vinted product listing gone wrong — watches everywhere, Thomas's name prominent
- Fake name progression is a key comedy beat: the sneakiness of the misspellings IS the joke
- Live rating creates a "reputation at stake" tension during gameplay

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 02-complete-game*
*Context gathered: 2026-02-07*
