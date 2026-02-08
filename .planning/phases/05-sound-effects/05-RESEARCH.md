# Phase 5: Sound Effects - Research

**Researched:** 2026-02-08
**Domain:** Web Audio API procedural sound synthesis for browser game SFX
**Confidence:** HIGH

## Summary

This phase adds procedural audio feedback to a Fruit-Ninja-style card slashing game using the Web Audio API with zero audio files. The game is vanilla JS + Canvas 2D running on mobile Chrome, so all sounds must be synthesized in real-time using OscillatorNode, GainNode, BiquadFilterNode, and AudioBuffer noise generation.

The Web Audio API is mature (baseline since July 2015), well-documented on MDN, and fully supports procedural synthesis. The main technical challenge is not the API itself but two specific concerns: (1) mobile Chrome's autoplay policy requiring AudioContext to be resumed on a user gesture, and (2) designing short, distinctive procedural sounds that feel "Fruit Ninja juicy" rather than retro 8-bit.

The architecture is straightforward: a single AudioContext initialized on page load, resumed in the existing `handleStartTap()` flow, with a `SoundEngine` module exposing fire-and-forget functions like `playSwipe()`, `playImpact(isGolden)`, `playCoin(comboCount)`, `playPenalty()`, `playJackpot()`. Each function creates short-lived OscillatorNodes and GainNodes that self-dispose after playback (this is the designed pattern -- Web Audio nodes are meant to be single-use and are garbage collected automatically).

**Primary recommendation:** Create a single `SoundEngine` object at the top of game.js that owns one AudioContext, resumes it on the start button tap, and exposes one function per sound effect. Each function creates fresh nodes, schedules them with `audioCtx.currentTime`, and lets them self-dispose. No libraries, no audio files, no npm.

## Standard Stack

### Core

| Component | Version | Purpose | Why Standard |
|-----------|---------|---------|--------------|
| Web Audio API (AudioContext) | W3C spec, baseline since 2015 | Audio graph container, timing clock | The only browser-native API for procedural synthesis; no alternatives |
| OscillatorNode | Part of Web Audio API | Generate tonal sounds (swoosh, coin, buzz) | Built-in, zero-cost creation, four waveform types + custom |
| GainNode | Part of Web Audio API | Volume envelopes (ADSR), fading | Essential for shaping every sound; "essentially free" per Mozilla perf docs |
| BiquadFilterNode | Part of Web Audio API | Shape noise into swooshes, soften tones | Built-in filter types: lowpass, highpass, bandpass |
| AudioBuffer + AudioBufferSourceNode | Part of Web Audio API | White noise generation for swoosh/impact | Fill buffer with random samples, play as noise burst |

### Supporting

| Component | Purpose | When to Use |
|-----------|---------|-------------|
| `audioCtx.currentTime` | Precise scheduling | Every sound -- use for all `setValueAtTime` / `rampToValue` calls |
| `AudioParam.linearRampToValueAtTime()` | Smooth gain/frequency transitions | Attack/release envelopes, frequency sweeps |
| `AudioParam.exponentialRampToValueAtTime()` | Natural-sounding decay | Coin resonance decay, buzz fade-out |
| `AudioParam.setValueAtTime()` | Set initial parameter values | Must be called before any ramp method |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Raw Web Audio API | Tone.js | Adds 150KB+ dependency; project constraint is zero npm/dependencies |
| Raw Web Audio API | Howler.js | Designed for audio file playback, not procedural synthesis |
| Raw Web Audio API | jsfxr library | Cool for 8-bit sounds but user wants "Fruit Ninja juicy", not retro |
| Hand-crafted synthesis | Pre-recorded .mp3/.wav files | Project constraint: zero audio files, procedural only |

**Installation:** None. Web Audio API is built into all modern browsers. No npm, no build tools, no external files.

## Architecture Patterns

### Recommended Code Structure

```
game.js (existing file -- add sound code at top, before game logic)
├── SoundEngine object         # Owns AudioContext, exposes play functions
│   ├── init()                 # Create AudioContext (call on page load)
│   ├── unlock()               # Resume AudioContext (call on user gesture)
│   ├── playSwipe()            # SFX-01: swoosh on every swipe
│   ├── playImpact(isGolden)   # SFX-02: impact thud on card hit
│   ├── playCoin(combo)        # SFX-03: cha-ching with combo pitch escalation
│   ├── playPenalty()          # SFX-04: buzzer for fake card
│   └── playJackpot()          # SFX-05: celebratory multi-tone
└── Integration points         # Calls into existing game functions
    ├── handleStartTap()       # Add SoundEngine.unlock()
    ├── pointerdown handler    # Add SoundEngine.playSwipe()
    ├── slashWatch()           # Add appropriate sound call
    └── (missed penalty)       # Optionally add miss sound
```

### Pattern 1: Fire-and-Forget Node Creation

**What:** Each sound effect creates fresh OscillatorNode/GainNode instances, schedules them with `start()`/`stop()`, and abandons them. The browser garbage collects them after playback ends.
**When to use:** Every sound effect in this game.
**Why:** OscillatorNodes and AudioBufferSourceNodes are single-use by design -- you cannot call `start()` twice. This is not a limitation; it is the intended usage pattern. Nodes are very cheap to create.

```javascript
// Source: MDN Web Audio API Best Practices + Advanced Techniques
function playTone(freq, duration) {
  var now = audioCtx.currentTime;
  var osc = audioCtx.createOscillator();
  var gain = audioCtx.createGain();

  osc.frequency.setValueAtTime(freq, now);
  gain.gain.setValueAtTime(0.3, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start(now);
  osc.stop(now + duration);
  // No cleanup needed -- nodes are GC'd after stop
}
```

### Pattern 2: AudioContext Unlock on User Gesture

**What:** Create AudioContext eagerly on page load, then call `resume()` inside the existing start button tap handler.
**When to use:** Mandatory for mobile Chrome (autoplay policy since Chrome 71).

```javascript
// Source: MDN Best Practices + Chrome Autoplay Policy blog
var audioCtx = new AudioContext({ latencyHint: 'interactive' });

function handleStartTap(px, py) {
  // Existing button hit test...
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  startGame();
}
```

### Pattern 3: White Noise Buffer for Swoosh/Impact

**What:** Pre-generate a reusable white noise AudioBuffer at init time. For each swoosh, create a new AudioBufferSourceNode pointing to the same buffer, shape it with a bandpass filter and gain envelope.
**When to use:** Swoosh and impact sounds (noise-based textures).

```javascript
// Source: MDN Advanced Techniques
var noiseBuffer = null;

function createNoiseBuffer() {
  var bufferSize = audioCtx.sampleRate * 2; // 2 seconds of noise
  noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  var data = noiseBuffer.getChannelData(0);
  for (var i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
}
```

### Pattern 4: Combo Pitch Escalation

**What:** For consecutive successful hits, increase the base frequency of the coin sound by a musical interval (e.g., +2 semitones per combo step). Reset to base pitch when combo breaks.
**When to use:** SFX-03 coin sound with combo system.

```javascript
// Semitone multiplier: multiply frequency by 2^(semitones/12)
function comboFreq(baseFreq, comboCount) {
  var semitones = Math.min(comboCount, 12) * 2; // cap at +24 semitones (2 octaves)
  return baseFreq * Math.pow(2, semitones / 12);
}
```

### Anti-Patterns to Avoid

- **Reusing OscillatorNodes:** Cannot call `start()` twice on the same node. Always create new nodes per sound.
- **Setting `.value` directly when scheduling:** Use `setValueAtTime()` before ramp methods. Direct `.value` assignment can conflict with scheduled automation.
- **Creating AudioContext inside game loop:** Create exactly once at page load. Creating multiple AudioContexts wastes resources and may hit browser limits.
- **Storing references to spent nodes:** Let them be garbage collected. Do not push them into arrays or hold references.
- **Using `setTimeout` for audio timing:** Use `audioCtx.currentTime` for all scheduling. `setTimeout` is not sample-accurate and will drift.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| White noise generation | Custom ScriptProcessorNode | AudioBuffer filled with Math.random() * 2 - 1 | ScriptProcessorNode is deprecated; AudioBuffer approach is standard and performant |
| Volume envelopes | Manual gain changes in game loop | GainNode with setValueAtTime + linearRampToValueAtTime | Web Audio scheduling is sample-accurate; game loop timing is frame-dependent |
| Audio timing | setTimeout/setInterval | audioCtx.currentTime + offset | setTimeout has 4-16ms jitter; Web Audio clock is sample-accurate |
| Mobile audio unlock | Custom silence-playing hack | audioCtx.resume() on user gesture | Browser-standard approach; silence hacks are fragile and unnecessary |
| Frequency calculations | Manual Hz math | `baseFreq * Math.pow(2, semitones/12)` formula | Standard equal temperament formula, well-established |

**Key insight:** The Web Audio API already provides the scheduling, enveloping, and synthesis primitives needed. The game loop should never directly manipulate audio parameters per-frame -- instead, schedule everything at the moment a sound is triggered using `audioCtx.currentTime` and let the audio thread handle it.

## Common Pitfalls

### Pitfall 1: Silent Audio on Mobile (AudioContext Suspended)

**What goes wrong:** Game starts, player swipes, no sound plays. First round is completely silent.
**Why it happens:** Chrome (since v71) creates AudioContext in `suspended` state if created before user gesture. All `start()` calls silently fail.
**How to avoid:** Call `audioCtx.resume()` inside `handleStartTap()` before `startGame()`. This is the existing start button handler -- the user MUST tap it to play, so this is guaranteed to fire before any sounds are needed.
**Warning signs:** `audioCtx.state === 'suspended'` after game starts. Test on actual mobile device, not just desktop Chrome DevTools mobile emulation.
**Verification:** After wiring up unlock, add `console.log('AudioContext state:', audioCtx.state)` in `startGame()` to confirm it reads `'running'`.

### Pitfall 2: OscillatorNode Cannot Be Restarted

**What goes wrong:** Developer creates one OscillatorNode and tries to call `start()` again for the next sound. Throws `InvalidStateError`.
**Why it happens:** OscillatorNode and AudioBufferSourceNode are single-use by W3C spec design.
**How to avoid:** Create a fresh node for every sound trigger. This is the intended pattern -- nodes are lightweight.
**Warning signs:** Error in console: "Failed to execute 'start' on 'AudioScheduledSourceNode': cannot call start more than once."

### Pitfall 3: Click/Pop Artifacts at Sound Start/End

**What goes wrong:** Sounds have audible clicks or pops at their beginning or end.
**Why it happens:** Abruptly starting or stopping a waveform at non-zero amplitude creates a discontinuity.
**How to avoid:** Always ramp gain from 0 to target (attack) and from target to near-zero (release) before `stop()`. Use `linearRampToValueAtTime` for attack (1-5ms) and `exponentialRampToValueAtTime` for release. Note: `exponentialRampToValueAtTime` cannot target exactly 0 -- use 0.001 as the floor.
**Warning signs:** Audible pops/clicks, especially on short sounds.

### Pitfall 4: exponentialRampToValueAtTime Cannot Target Zero

**What goes wrong:** Code calls `gain.exponentialRampToValueAtTime(0, time)` and gets an error or unexpected behavior.
**Why it happens:** Exponential curves are undefined at zero. The Web Audio spec requires a positive target value.
**How to avoid:** Use 0.001 (or 0.0001) as the minimum value instead of 0.
**Warning signs:** `RangeError` or sound that never fully fades out.

### Pitfall 5: setValueAtTime Must Precede Ramps

**What goes wrong:** `linearRampToValueAtTime` or `exponentialRampToValueAtTime` behaves unexpectedly or snaps instantly.
**Why it happens:** Ramp methods need a starting anchor point. Without a preceding `setValueAtTime`, the ramp has no defined start.
**How to avoid:** Always call `setValueAtTime(startValue, startTime)` before any ramp method on the same AudioParam.
**Warning signs:** Sound jumps to final value instantly instead of ramping smoothly.

### Pitfall 6: Too Many Simultaneous Nodes on Rapid Slashing

**What goes wrong:** Performance degrades during frantic gameplay when many sounds overlap.
**Why it happens:** Rapid slashing can trigger 5-10 sounds per second; each creates multiple nodes.
**How to avoid:** (a) Keep sounds very short (50-200ms). (b) Cap concurrent sounds -- if more than ~8 sounds are active, skip the new one or cut the oldest. (c) GainNode with fixed gain is "essentially free" per Mozilla perf research.
**Warning signs:** Audio glitches, frame drops during intense gameplay sections.

### Pitfall 7: Variable Scope -- Nodes Garbage Collected Too Early

**What goes wrong:** A sound cuts off unexpectedly before its scheduled stop time.
**Why it happens:** If nodes are only referenced by local variables in a function that returns, the browser may GC them before playback completes.
**How to avoid:** The `osc.connect(gain).connect(destination)` chain keeps nodes alive because connected nodes maintain references through the audio graph. As long as the node is connected to the destination (directly or indirectly), it stays alive until `stop()` fires. Do not disconnect nodes before their scheduled stop time.
**Warning signs:** Sounds randomly cut short, especially short sounds on slower devices.

## Code Examples

### SFX-01: Swoosh Sound (Swipe Feedback)

Filtered white noise burst with a quick fade-out. Plays on every `pointerdown` during gameplay.

```javascript
// Source: MDN Advanced Techniques (noise buffer pattern) + performance notes
function playSwipe() {
  if (!audioCtx || audioCtx.state !== 'running') return;
  var now = audioCtx.currentTime;
  var duration = 0.12;

  var noise = audioCtx.createBufferSource();
  noise.buffer = noiseBuffer; // pre-generated white noise buffer

  var bandpass = audioCtx.createBiquadFilter();
  bandpass.type = 'bandpass';
  bandpass.frequency.setValueAtTime(2500, now);
  bandpass.frequency.linearRampToValueAtTime(1000, now + duration);
  bandpass.Q.setValueAtTime(0.8, now);

  var gain = audioCtx.createGain();
  gain.gain.setValueAtTime(0.15, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

  noise.connect(bandpass);
  bandpass.connect(gain);
  gain.connect(audioCtx.destination);
  noise.start(now);
  noise.stop(now + duration);
}
```

### SFX-02: Impact Sound (Card Hit)

Short thud combining a low-frequency oscillator decay with a noise transient.

```javascript
// Source: Sonoport drum synthesis patterns adapted for impact
function playImpact(isGolden) {
  if (!audioCtx || audioCtx.state !== 'running') return;
  var now = audioCtx.currentTime;
  var duration = 0.15;

  // Low thud oscillator
  var osc = audioCtx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(isGolden ? 200 : 150, now);
  osc.frequency.exponentialRampToValueAtTime(40, now + duration);

  var oscGain = audioCtx.createGain();
  oscGain.gain.setValueAtTime(0.4, now);
  oscGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

  osc.connect(oscGain);
  oscGain.connect(audioCtx.destination);
  osc.start(now);
  osc.stop(now + duration);

  // Noise transient layer (short crack)
  var noise = audioCtx.createBufferSource();
  noise.buffer = noiseBuffer;
  var noiseGain = audioCtx.createGain();
  noiseGain.gain.setValueAtTime(0.2, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

  var hipass = audioCtx.createBiquadFilter();
  hipass.type = 'highpass';
  hipass.frequency.setValueAtTime(4000, now);

  noise.connect(hipass);
  hipass.connect(noiseGain);
  noiseGain.connect(audioCtx.destination);
  noise.start(now);
  noise.stop(now + 0.05);
}
```

### SFX-03: Coin/Cha-Ching Sound (Good Deal)

Two-tone ascending arpeggio with metallic character. Pitch escalates with combo.

```javascript
// Source: Standard synthesis pattern -- two stacked oscillators for "cha-ching"
function playCoin(comboCount) {
  if (!audioCtx || audioCtx.state !== 'running') return;
  var now = audioCtx.currentTime;
  var baseFreq = 800;
  // Pitch escalation: +2 semitones per combo step, capped at 12 steps
  var pitchMult = Math.pow(2, Math.min(comboCount || 0, 12) * 2 / 12);
  var freq = baseFreq * pitchMult;

  // First tone (cha-)
  var osc1 = audioCtx.createOscillator();
  osc1.type = 'square';
  osc1.frequency.setValueAtTime(freq, now);
  var gain1 = audioCtx.createGain();
  gain1.gain.setValueAtTime(0.15, now);
  gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
  osc1.connect(gain1);
  gain1.connect(audioCtx.destination);
  osc1.start(now);
  osc1.stop(now + 0.12);

  // Second tone (-ching) slightly higher, delayed
  var osc2 = audioCtx.createOscillator();
  osc2.type = 'square';
  osc2.frequency.setValueAtTime(freq * 1.5, now + 0.07);
  var gain2 = audioCtx.createGain();
  gain2.gain.setValueAtTime(0.001, now);
  gain2.gain.linearRampToValueAtTime(0.15, now + 0.07);
  gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
  osc2.connect(gain2);
  gain2.connect(audioCtx.destination);
  osc2.start(now);
  osc2.stop(now + 0.2);
}
```

### SFX-04: Penalty Buzz (Fake Card)

Low harsh buzz using detuned sawtooth oscillators.

```javascript
// Source: Standard synthesis -- detuned sawtooth for harsh buzzer
function playPenalty() {
  if (!audioCtx || audioCtx.state !== 'running') return;
  var now = audioCtx.currentTime;
  var duration = 0.25;

  // Two detuned sawtooth oscillators for harsh buzzer
  for (var i = 0; i < 2; i++) {
    var osc = audioCtx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(i === 0 ? 120 : 127, now); // slight detune
    var gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.linearRampToValueAtTime(0.15, now + 0.02); // quick attack
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    var lowpass = audioCtx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.setValueAtTime(600, now);

    osc.connect(lowpass);
    lowpass.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + duration);
  }
}
```

### SFX-05: Jackpot Celebration (Golden Watch)

Multi-tone ascending fanfare with shimmer.

```javascript
// Source: Standard synthesis -- ascending major arpeggio
function playJackpot() {
  if (!audioCtx || audioCtx.state !== 'running') return;
  var now = audioCtx.currentTime;
  // C5-E5-G5-C6 arpeggio (major chord)
  var freqs = [523, 659, 784, 1047];
  var noteLen = 0.1;

  for (var i = 0; i < freqs.length; i++) {
    var startTime = now + i * 0.08;
    var osc = audioCtx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freqs[i], startTime);

    var gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.2, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + noteLen + 0.15);

    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(startTime);
    osc.stop(startTime + noteLen + 0.15);
  }
}
```

### AudioContext Initialization and Unlock

```javascript
// Source: MDN Best Practices + Chrome Autoplay Policy
var audioCtx = null;
var noiseBuffer = null;

function initAudio() {
  audioCtx = new (window.AudioContext || window.webkitAudioContext)({
    latencyHint: 'interactive'
  });
  // Pre-generate reusable noise buffer
  var bufferSize = audioCtx.sampleRate * 2;
  noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  var data = noiseBuffer.getChannelData(0);
  for (var i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
}

function unlockAudio() {
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}
```

## Integration Points with Existing Code

The existing game.js has clear insertion points for sound triggers:

| Game Event | Existing Function | Sound to Add | Line Reference |
|------------|-------------------|-------------|----------------|
| Game start tap | `handleStartTap()` (line 1001) | `unlockAudio()` | Before `startGame()` call |
| Swipe begins | `pointerdown` handler (line 164-167) | `playSwipe()` | After `isPointerDown = true` |
| Card slashed (real) | `slashWatch()` (line 415) | `playImpact()` + `playCoin(combo)` | After score update |
| Card slashed (fake) | `slashWatch()` (line 415) | `playImpact()` + `playPenalty()` | After score update |
| Card slashed (golden) | `slashWatch()` (line 415) | `playImpact()` + `playJackpot()` | After JACKPOT label |
| Replay tap | `handleReplayTap()` (line 1125) | `unlockAudio()` | Before `startGame()` call |

**Critical integration detail:** The `slashWatch()` function already branches on `watch.isFake` and `watch.isGolden` (lines 420-438), making it the natural place to add sound dispatch with the same conditional logic.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `webkitAudioContext` prefix | Standard `AudioContext` | 2015+ | Still include webkit fallback for safety: `window.AudioContext \|\| window.webkitAudioContext` |
| ScriptProcessorNode for custom audio | AudioWorklet | 2018+ | Not needed for this project -- we only use standard nodes |
| No autoplay restriction | AudioContext suspended until user gesture | Chrome 71 (Dec 2018) | Must call `resume()` on first tap -- critical for mobile |
| `createOscillator()` factory method | `new OscillatorNode()` constructor | 2016+ | Both work; factory method has broader legacy compatibility |

**Deprecated/outdated:**
- `ScriptProcessorNode`: Replaced by AudioWorklet. Not needed here since we use built-in nodes only.
- `webkitAudioContext`: Still needed as fallback for very old mobile browsers. Use `window.AudioContext || window.webkitAudioContext`.
- Direct `.value` assignment on AudioParam during automation: Use `setValueAtTime()` instead to avoid conflicts with scheduled ramps.

## Sound Design Recommendations (Claude's Discretion)

Based on the context decision giving full discretion on sound personality:

### Design Philosophy
- **Snappy and juicy** over retro 8-bit: Use sine/triangle waves for pleasant tones, filtered noise for texture. Avoid pure square waves for everything (too chiptuney).
- **Short durations:** Swoosh 80-120ms, impact 100-150ms, coin 150-200ms, penalty 200-250ms, jackpot 400-500ms (the only "longer" sound, justified by its rarity).
- **Layered sounds:** Swoosh (noise) + Impact (oscillator + noise) feel richer than single-source sounds.
- **Volume hierarchy:** Swoosh quietest (0.1-0.15), coin/penalty mid (0.15-0.2), jackpot loudest (0.2-0.25). Nothing above 0.3 to avoid clipping on mobile speakers.

### Waveform Choices
| Sound | Waveform | Why |
|-------|----------|-----|
| Swoosh | Filtered white noise | Noise is the natural sound of air movement |
| Impact | Sine (low thud) + noise (crack) | Sine gives weight, noise gives transient snap |
| Coin | Square wave (metallic) | Square harmonics sound bell-like/metallic at high frequencies |
| Penalty | Detuned sawtooth (harsh) | Dissonant and grating -- instantly signals "bad" |
| Jackpot | Triangle (pure/celebratory) | Triangle is warm but clear -- perfect for ascending fanfare |

### Combo Escalation Strategy
- Increase coin sound pitch by 2 semitones per combo step (multiply frequency by `2^(2/12)` per step)
- Cap at 12 steps (+24 semitones = 2 octaves) to prevent ultrasonic frequencies
- Reset to base pitch when combo breaks
- This creates a satisfying "rising scale" effect during combo streaks

## Open Questions

1. **Master volume control**
   - What we know: All sounds should play at moderate volume. Mobile device speakers vary wildly.
   - What's unclear: Whether a master GainNode between all sounds and destination is worth adding now, or if per-sound gain values are sufficient.
   - Recommendation: Add a master GainNode (simple, free performance cost). This future-proofs adding a mute button later without touching individual sounds.

2. **Sound on missed watch (falling off screen)**
   - What we know: The game currently penalizes -8 points when a real watch falls off-screen (lines 278-286). No sound is specified in requirements.
   - What's unclear: Whether adding a subtle "miss" sound would improve feedback.
   - Recommendation: Skip for now -- not in requirements. Can be added trivially later if desired.

3. **Exact parameter tuning**
   - What we know: The frequency, duration, and gain values in code examples are starting points.
   - What's unclear: Exact values that feel best on mobile speakers vs headphones.
   - Recommendation: Implement with the example values first, then tune by ear on an actual mobile device. The code structure makes parameter tweaking trivial.

## Sources

### Primary (HIGH confidence)
- [MDN: Web Audio API Best Practices](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices) -- AudioContext lifecycle, autoplay policy, node management
- [MDN: Advanced Techniques (Creating and Sequencing Audio)](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Advanced_techniques) -- Sweep effects, noise buffers, gain envelopes, scheduling patterns
- [MDN: OscillatorNode](https://developer.mozilla.org/en-US/docs/Web/API/OscillatorNode) -- Waveform types, frequency/detune, single-use constraint
- [MDN: AudioContext constructor](https://developer.mozilla.org/en-US/docs/Web/API/AudioContext/AudioContext) -- latencyHint options, sampleRate
- [MDN: Audio for Web Games](https://developer.mozilla.org/en-US/docs/Games/Techniques/Audio_for_Web_Games) -- Mobile unlock patterns, game audio techniques
- [Chrome Autoplay Policy Blog](https://developer.chrome.com/blog/autoplay) -- Suspended state, user gesture requirements, Chrome 71+

### Secondary (MEDIUM confidence)
- [Mozilla Web Audio Perf Notes (Paul Adenot)](https://padenot.github.io/web-audio-perf/) -- GainNode cost, node creation overhead, latency on different OS
- [Sonoport: Synthesising Sounds with Web Audio API](https://sonoport.github.io/synthesising-sounds-webaudio.html) -- Kick/snare/hi-hat synthesis patterns (adapted for impact sounds)
- [Web Audio API lessons learned (Szynalski)](https://blog.szynalski.com/2014/04/web-audio-api/) -- Node lifecycle, scope-based GC, single-use nodes
- [DEV Community: Procedural Audio Effects](https://dev.to/hexshift/how-to-create-procedural-audio-effects-in-javascript-with-web-audio-api-199e) -- ADSR envelope, noise generation, filter usage

### Tertiary (LOW confidence)
- Sound parameter values (frequencies, durations, gains) are informed estimates based on synthesis principles. They will need empirical tuning on actual devices.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- Web Audio API is a stable W3C standard with extensive MDN documentation
- Architecture: HIGH -- Fire-and-forget node pattern is explicitly recommended by MDN and multiple authoritative sources
- Mobile unlock: HIGH -- Chrome autoplay policy is well-documented by both MDN and Google
- Sound design parameters: MEDIUM -- Synthesis recipes are based on established patterns (drum synthesis, sound design fundamentals) but exact values need empirical tuning
- Pitfalls: HIGH -- Each pitfall is documented in official sources or confirmed by multiple credible references

**Research date:** 2026-02-08
**Valid until:** 2026-03-10 (Web Audio API is stable; no breaking changes expected)
