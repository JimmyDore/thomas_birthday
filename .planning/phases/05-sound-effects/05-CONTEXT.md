# Phase 5: Sound Effects - Context

**Gathered:** 2026-02-08
**Status:** Ready for planning

<domain>
## Phase Boundary

Every slash, coin gain, penalty, and jackpot gets procedural audio feedback using Web Audio API with zero audio files. Sounds must work on mobile Chrome on first play with no silent-first-round issues. This phase adds audio only — no gameplay, UI, or mechanic changes.

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion

User gave full discretion on all sound design decisions. Claude should make choices that:

**Sound personality:**
- Match the Vinted/arcade theme — satisfying and fun, not overly serious
- Lean toward snappy and juicy (think Fruit Ninja / mobile arcade) rather than retro 8-bit
- Keep sounds short and punchy — nothing should outlast its visual counterpart

**Slash & impact feel:**
- Swoosh on every swipe (whether it hits or not — confirms input)
- Distinct impact layered on top when a card is actually hit
- Miss-swipes should feel lighter than hits (swoosh only vs swoosh + impact)

**Feedback clarity:**
- Good (real card) vs bad (fake card) must be instantly distinguishable by sound alone
- Coin/cha-ching for real, buzzer/penalty for fake — no ambiguity
- Golden jackpot gets a special celebratory sound that stands out from regular coins
- Combo streaks can escalate pitch or add layering — Claude's call on specifics

**Mobile audio unlock:**
- Unlock AudioContext on the start screen tap/button interaction (the game already has a start button)
- No separate "tap to enable audio" prompt — piggyback on existing first interaction
- If AudioContext is suspended, resume it on first user gesture

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches. User trusts Claude's judgment on all sound design choices. Priority is making the game feel alive and satisfying.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 05-sound-effects*
*Context gathered: 2026-02-08*
