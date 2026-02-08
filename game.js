// Watch Ninja - La Coupe des Montres
// Phase 01: Foundation + Gameplay | Phase 02: Game flow, timer, difficulty, screens
// Deployed to https://coupe-des-montres.jimmydore.fr

// --- Canvas & Display ---
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
let canvasWidth = 0;
let canvasHeight = 0;
let dpr = 1;

// --- Game State ---
var gameState = 'start'; // 'start' | 'act1' | 'transition' | 'act2' | 'over'
var ROUND_DURATION = 60;  // seconds
var elapsed = 0;
var stats = { realSlashed: 0, fakeSlashed: 0, goldenSlashed: 0, maxCombo: 0, totalWatches: 0 };
let score = 0;
var combo = 0;
var comboMultiplier = 1;
var comboDisplayScale = 1.0; // for brief scale-up animation
let paused = false;
let lastTime = 0;

// --- Buy/Sell Mechanic State ---
var inventory = [];        // [{brand, price, isFake, isGolden, cost, sold, soldFor}]
var act1Spending = 0;      // Total EUR spent in Act 1 (absolute values)
var act2Revenue = 0;       // Total EUR earned in Act 2
var ACT2_DURATION = 45;    // seconds
var act2Elapsed = 0;
var currentOfferIndex = 0; // Round-robin index for buyer offers

// --- High Score Persistence ---
var STORAGE_KEY = 'watchNinja_bestScore';
var bestScore = null;
var isNewBest = false;

function loadBestScore() {
  try {
    var stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== null) {
      var parsed = JSON.parse(stored);
      if (typeof parsed === 'number' && isFinite(parsed)) {
        return parsed;
      }
    }
  } catch (e) { /* localStorage unavailable or corrupted -- fail silently */ }
  return null;
}

function saveBestScore(newScore) {
  try {
    if (bestScore === null || newScore > bestScore) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newScore));
      bestScore = newScore;
      return true;
    }
  } catch (e) { /* localStorage unavailable -- fail silently */ }
  return false;
}

// --- Sound Engine (Procedural Web Audio API) ---

var SoundEngine = (function() {
  var audioCtx = null;
  var noiseBuffer = null;

  function init() {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)({
      latencyHint: 'interactive'
    });
    // Pre-generate reusable 2-second white noise buffer
    var bufferSize = audioCtx.sampleRate * 2;
    noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    var data = noiseBuffer.getChannelData(0);
    for (var i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
  }

  function unlock() {
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  }

  // SFX-01: Filtered white noise burst, 120ms
  function playSwipe() {
    if (!audioCtx || audioCtx.state !== 'running') return;
    var now = audioCtx.currentTime;
    var duration = 0.12;

    var noise = audioCtx.createBufferSource();
    noise.buffer = noiseBuffer;

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

  // SFX-02: Low sine thud + noise transient crack
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

    var hipass = audioCtx.createBiquadFilter();
    hipass.type = 'highpass';
    hipass.frequency.setValueAtTime(4000, now);

    var noiseGain = audioCtx.createGain();
    noiseGain.gain.setValueAtTime(0.2, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

    noise.connect(hipass);
    hipass.connect(noiseGain);
    noiseGain.connect(audioCtx.destination);
    noise.start(now);
    noise.stop(now + 0.05);
  }

  // SFX-03: Two-tone square wave arpeggio with combo pitch escalation
  function playCoin(comboCount) {
    if (!audioCtx || audioCtx.state !== 'running') return;
    var now = audioCtx.currentTime;
    var baseFreq = 800;
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

  // SFX-04: Detuned sawtooth buzz through lowpass filter
  function playPenalty() {
    if (!audioCtx || audioCtx.state !== 'running') return;
    var now = audioCtx.currentTime;
    var duration = 0.25;

    for (var i = 0; i < 2; i++) {
      var osc = audioCtx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(i === 0 ? 120 : 127, now);

      var gain = audioCtx.createGain();
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.linearRampToValueAtTime(0.15, now + 0.02);
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

  // SFX-05: Triangle wave arpeggio C5-E5-G5-C6
  function playJackpot() {
    if (!audioCtx || audioCtx.state !== 'running') return;
    var now = audioCtx.currentTime;
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

  return { init: init, unlock: unlock, playSwipe: playSwipe, playImpact: playImpact, playCoin: playCoin, playPenalty: playPenalty, playJackpot: playJackpot };
})();

SoundEngine.init();

// --- Decorative Watches (start screen) ---
var decorWatches = [];

// --- Trail State ---
const trailPoints = [];
const TRAIL_LIFETIME = 150; // ms before points fade completely
const TRAIL_COLOR = '255, 200, 50'; // gold RGB
let isPointerDown = false;

// --- Watch State ---
const watches = [];
const splitHalves = [];
const particles = [];
const floatingTexts = [];
let spawnTimer = 0;

// --- Watch Constants ---
var SPAWN_INTERVAL = 1.2; // seconds between spawns (fixed for Phase 1)
var GRAVITY = 400;        // pixels/sec^2
var WATCH_SIZE = 60;      // diameter in CSS pixels
var FAKE_NAMES = ['Montignak', 'Montinyac', 'Montiganc', 'Montigniak', 'Montignaq'];

// Ordered from obviously ridiculous (early game) to near-miss misspellings (late game)
var FAKE_NAMES_PROGRESSION = [
  // t = 0.0-0.3: Obviously ridiculous (easy to spot, gets laughs)
  'Montagniak', 'Montignoque', 'Mortignac', 'Monticrap', 'Montignul',
  // t = 0.3-0.6: Getting sneakier
  'Montignak', 'Montinyac', 'Montigniak', 'Montigrac',
  // t = 0.6-1.0: Near-misses (hard to spot under time pressure!)
  'Montigac', 'Montiganc', 'Montignaq', 'Montignae'
];

function pickFakeName(t) {
  var len = FAKE_NAMES_PROGRESSION.length;
  var tierStart = Math.floor(t * len * 0.7);
  tierStart = Math.min(tierStart, len - 1);
  var tierEnd = Math.min(len, tierStart + 3);
  var idx = tierStart + Math.floor(Math.random() * (tierEnd - tierStart));
  return FAKE_NAMES_PROGRESSION[Math.min(idx, len - 1)];
}
var CARD_WIDTH = 80;
var CARD_HEIGHT = 110;

// --- Combo Multiplier ---

function getMultiplier(c) {
  if (c >= 15) return 5;
  if (c >= 10) return 4;
  if (c >= 6) return 3;
  if (c >= 3) return 2;
  return 1;
}

// --- Vinted Seller Rating ---

function getRating(s) {
  if (s >= 300) return { stars: 5, label: 'Roi du Vinted' };
  if (s >= 150) return { stars: 4, label: 'Vendeur confirm\u00e9' };
  if (s >= 50)  return { stars: 3, label: 'Bon vendeur' };
  if (s >= 0)   return { stars: 2, label: 'Vendeur d\u00e9butant' };
  return { stars: 1, label: 'Vendeur douteux' };
}

// --- Canvas Initialization ---

function resize() {
  dpr = window.devicePixelRatio || 1;
  canvasWidth = window.innerWidth;
  canvasHeight = window.innerHeight;
  canvas.width = canvasWidth * dpr;
  canvas.height = canvasHeight * dpr;
  canvas.style.width = canvasWidth + 'px';
  canvas.style.height = canvasHeight + 'px';
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.scale(dpr, dpr);
}

function initCanvas() {
  resize();
  window.addEventListener('resize', resize);

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
      paused = true;
    } else {
      paused = false;
      lastTime = 0; // Reset to avoid delta-time spike on resume
      requestAnimationFrame(gameLoop);
    }
  });
}

// --- Input Handling ---

function setupInput() {
  canvas.addEventListener('pointerdown', function (e) {
    e.preventDefault();
    var rect = canvas.getBoundingClientRect();
    var px = e.clientX - rect.left;
    var py = e.clientY - rect.top;

    if (gameState === 'start') {
      handleStartTap(px, py);
      return;
    }

    if (gameState === 'over') {
      handleReplayTap(px, py);
      return;
    }

    if (gameState === 'transition') {
      handleTransitionTap(px, py);
      return;
    }

    // gameState === 'act1' or 'act2' -- swipe logic
    if (gameState !== 'act1' && gameState !== 'act2') return;
    isPointerDown = true;
    SoundEngine.playSwipe();
    trailPoints.length = 0; // Clear old trail on new swipe
    trailPoints.push({ x: px, y: py, time: performance.now() });
  });

  canvas.addEventListener('pointermove', function (e) {
    e.preventDefault();
    if (gameState !== 'act1' && gameState !== 'act2') return;
    if (!isPointerDown) return;
    var rect = canvas.getBoundingClientRect();
    trailPoints.push({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      time: performance.now()
    });
    // Hard cap to prevent memory issues on long swipes
    if (trailPoints.length > 100) trailPoints.shift();
  });

  canvas.addEventListener('pointerup', function (e) {
    e.preventDefault();
    isPointerDown = false;
  });

  canvas.addEventListener('pointercancel', function (e) {
    e.preventDefault();
    isPointerDown = false;
  });
}

// --- Haptic Feedback ---

function hapticFeedback(ms) {
  if (navigator.vibrate) navigator.vibrate(ms);
}

// --- Difficulty Ramp ---

function getDifficulty() {
  var t = Math.min(1, elapsed / ROUND_DURATION);
  var tEased = t * t; // quadratic ease-in: slow start, frantic end
  return {
    spawnInterval: Math.max(0.5, 1.4 - tEased * 0.9),  // 1.4s -> 0.5s
    speedMultiplier: 1.0 + t * 0.4,                      // 1.0x -> 1.4x
    fakeChance: 0.20 + t * 0.45                             // 20% -> 65%
  };
}

// --- Watch Spawning ---

function spawnWatch(diff) {
  var speedMult = diff ? diff.speedMultiplier : 1.0;
  var fakeChance = diff ? diff.fakeChance : 0.4;
  var fromLeft = Math.random() < 0.5;
  var x = fromLeft
    ? canvasWidth * (0.1 + Math.random() * 0.3)
    : canvasWidth * (0.6 + Math.random() * 0.3);

  var vx = fromLeft
    ? (20 + Math.random() * 60) * speedMult
    : -(20 + Math.random() * 60) * speedMult;

  // Scale launch velocity with screen height so watches reach upper third
  var baseVy = canvasHeight * 0.65 + 100;
  var vy = -(baseVy + Math.random() * canvasHeight * 0.15) * speedMult;

  var isFake = Math.random() < fakeChance;
  var isGolden = !isFake && Math.random() < 0.03; // 3% of real watches
  var brand = isFake
    ? pickFakeName(Math.min(1, elapsed / ROUND_DURATION))
    : 'Montignac';

  var watchSize = isGolden ? WATCH_SIZE * 1.2 : WATCH_SIZE;
  var watchValue = isGolden ? 50 : (isFake ? -15 : 10);
  var cardW = isGolden ? CARD_WIDTH * 1.2 : CARD_WIDTH;
  var cardH = isGolden ? CARD_HEIGHT * 1.2 : CARD_HEIGHT;
  var price = isGolden ? (200 + Math.floor(Math.random() * 300)) : (10 + Math.floor(Math.random() * 90));

  var watch = {
    x: x,
    y: canvasHeight + 50, // start below visible area
    vx: vx,
    vy: vy,
    size: watchSize,
    width: cardW,
    height: cardH,
    rotation: 0,
    rotationSpeed: (Math.random() - 0.5) * 0.5,
    isFake: isFake,
    isGolden: isGolden,
    brand: brand,
    price: price,
    slashed: false,
    value: watchValue
  };
  createCardSprite(watch);
  watches.push(watch);

  stats.totalWatches++;
}

// --- Watch Physics ---

function updateWatches(dt) {
  for (var i = watches.length - 1; i >= 0; i--) {
    var w = watches[i];
    w.vy += GRAVITY * dt;
    w.x += w.vx * dt;
    w.y += w.vy * dt;
    w.rotation += w.rotationSpeed * dt;

    // Off-screen cleanup: fell below bottom
    if (w.y > canvasHeight + 100 && w.vy > 0) {
      // Missed penalty: real Montignac not slashed (Act 1 only)
      if (!w.slashed && !w.isFake && gameState === 'act1') {
        score -= 8;
        combo = 0;
        comboMultiplier = 1;
        spawnFloatingText(w.x, canvasHeight - 30, -8, false, true);
      }
      watches.splice(i, 1);
      continue;
    }

    // Off-screen cleanup: too far left or right
    if (w.x < -200 || w.x > canvasWidth + 200) {
      // Also penalize if real and unslashed (Act 1 only)
      if (!w.slashed && !w.isFake && gameState === 'act1') {
        score -= 8;
        combo = 0;
        comboMultiplier = 1;
        spawnFloatingText(w.x < -200 ? 30 : canvasWidth - 30, canvasHeight - 30, -8, false, true);
      }
      watches.splice(i, 1);
    }
  }
}

// --- Floating Text ---

function spawnFloatingText(x, y, amount, isFake, isMissed) {
  var color = (isFake || isMissed) ? '220, 50, 50' : '50, 180, 80';
  floatingTexts.push({
    x: x,
    y: y,
    text: (amount >= 0 ? '+' : '') + amount + '\u20AC',
    color: color,
    fontSize: 22,
    alpha: 1.0,
    vy: -60,
    age: 0,
    life: 1.0
  });
  // Hard cap
  if (floatingTexts.length > 30) floatingTexts.shift();
}

function spawnLabelText(x, y, label, colorStr, fontSize) {
  floatingTexts.push({
    x: x,
    y: y,
    text: label,
    color: colorStr,
    fontSize: fontSize || 16,
    alpha: 1.0,
    vy: -60,
    age: 0,
    life: 1.0
  });
  if (floatingTexts.length > 30) floatingTexts.shift();
}

function updateFloatingTexts(dt) {
  for (var i = floatingTexts.length - 1; i >= 0; i--) {
    var ft = floatingTexts[i];
    ft.y += ft.vy * dt;
    ft.age += dt;
    ft.alpha = Math.max(0, 1 - ft.age / ft.life);
    if (ft.age >= ft.life) {
      floatingTexts.splice(i, 1);
    }
  }
}

function renderFloatingTexts() {
  for (var i = 0; i < floatingTexts.length; i++) {
    var ft = floatingTexts[i];
    ctx.save();
    ctx.globalAlpha = ft.alpha;
    ctx.fillStyle = 'rgba(' + ft.color + ', ' + ft.alpha + ')';
    ctx.font = 'bold ' + (ft.fontSize || 22) + 'px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(ft.text, ft.x, ft.y);
    ctx.restore();
  }
}

// --- Collision Detection ---

function lineSegmentIntersectsCircle(ax, ay, bx, by, cx, cy, r) {
  var dx = bx - ax;
  var dy = by - ay;
  var fx = ax - cx;
  var fy = ay - cy;

  var segLenSq = dx * dx + dy * dy;
  if (segLenSq === 0) {
    // Degenerate segment (single point)
    return (fx * fx + fy * fy) <= r * r;
  }

  // Project circle center onto line, clamped to segment
  var t = -(fx * dx + fy * dy) / segLenSq;
  t = Math.max(0, Math.min(1, t));

  // Nearest point on segment to circle center
  var nearestX = ax + t * dx;
  var nearestY = ay + t * dy;

  var distX = nearestX - cx;
  var distY = nearestY - cy;

  return (distX * distX + distY * distY) <= r * r;
}

function checkSlashCollisions() {
  if (trailPoints.length < 2) return;

  // Only check recent trail segments (last 5-6 points)
  var start = Math.max(0, trailPoints.length - 6);
  for (var i = start + 1; i < trailPoints.length; i++) {
    var p0 = trailPoints[i - 1];
    var p1 = trailPoints[i];

    for (var j = watches.length - 1; j >= 0; j--) {
      var w = watches[j];
      if (w.slashed) continue;

      var hitRadius = Math.max(w.width, w.height) / 2 * 1.1; // card-sized hitbox
      if (lineSegmentIntersectsCircle(p0.x, p0.y, p1.x, p1.y, w.x, w.y, hitRadius)) {
        var slashAngle = Math.atan2(p1.y - p0.y, p1.x - p0.x);
        slashWatch(w, slashAngle);
      }
    }
  }
}

// --- Slash Handler ---

function addToInventory(watch) {
  inventory.push({
    brand: watch.brand,
    price: watch.price,
    isFake: watch.isFake,
    isGolden: watch.isGolden,
    cost: Math.abs(watch.value),
    sold: false,
    soldFor: 0
  });
}

function slashWatch(watch, slashAngle) {
  // Mark immediately to prevent double-detection (Pitfall 5)
  watch.slashed = true;

  // Inventory recording for Act 1
  if (gameState === 'act1') {
    addToInventory(watch);
    act1Spending += Math.abs(watch.value);
  }

  // Combo system: real watches build combo, fakes reset it
  if (!watch.isFake) {
    combo++;
    comboMultiplier = getMultiplier(combo);
    comboDisplayScale = 1.3; // brief pop animation
    stats.maxCombo = Math.max(stats.maxCombo, combo);
    // Apply combo multiplier to value
    watch.value = watch.value * comboMultiplier;
  } else {
    combo = 0;
    comboMultiplier = 1;
  }

  // Stats tracking
  if (watch.isFake) {
    stats.fakeSlashed++;
  } else {
    stats.realSlashed++;
    if (watch.isGolden) stats.goldenSlashed++;
  }

  // Update score
  score += watch.value;

  // Create split halves
  var halves = createSplitHalves(watch, slashAngle);
  for (var i = 0; i < halves.length; i++) {
    splitHalves.push(halves[i]);
  }

  // Spawn particles (golden gets gold-colored particles)
  spawnParticles(watch.x, watch.y, watch.isFake, 12, watch.isGolden);

  // Spawn floating label text + euro amount
  if (watch.isGolden) {
    spawnLabelText(watch.x, watch.y - 15, 'JACKPOT !', '255, 215, 0', 18);
  } else if (watch.isFake) {
    spawnLabelText(watch.x, watch.y - 15, 'Arnaque !', '220, 50, 50', 16);
  } else {
    spawnLabelText(watch.x, watch.y - 15, 'Bonne affaire !', '50, 180, 80', 16);
  }
  spawnFloatingText(watch.x, watch.y + 10, watch.value, watch.isFake, false);

  // Haptic feedback
  hapticFeedback(30);

  // Sound feedback
  SoundEngine.playImpact(watch.isGolden);
  if (watch.isGolden) {
    SoundEngine.playJackpot();
  } else if (watch.isFake) {
    SoundEngine.playPenalty();
  } else {
    SoundEngine.playCoin(combo);
  }

  // Remove the watch from active array
  var idx = watches.indexOf(watch);
  if (idx !== -1) watches.splice(idx, 1);
}

// --- Split Halves ---

function createSplitHalves(watch, slashAngle) {
  var perpAngle = slashAngle + Math.PI / 2;
  var pushSpeed = 80;

  return [
    { // Left half
      x: watch.x,
      y: watch.y,
      vx: watch.vx + Math.cos(perpAngle) * pushSpeed,
      vy: watch.vy + Math.sin(perpAngle) * pushSpeed,
      rotation: watch.rotation,
      rotationSpeed: -(3 + Math.random() * 4),
      size: watch.size,
      width: watch.width,
      height: watch.height,
      brand: watch.brand,
      isFake: watch.isFake,
      isGolden: watch.isGolden,
      price: watch.price,
      sprite: watch.sprite,
      spritePadding: watch.spritePadding,
      clipSide: 'left',
      alpha: 1.0,
      life: 1.0,
      age: 0
    },
    { // Right half
      x: watch.x,
      y: watch.y,
      vx: watch.vx - Math.cos(perpAngle) * pushSpeed,
      vy: watch.vy - Math.sin(perpAngle) * pushSpeed,
      rotation: watch.rotation,
      rotationSpeed: 3 + Math.random() * 4,
      size: watch.size,
      width: watch.width,
      height: watch.height,
      brand: watch.brand,
      isFake: watch.isFake,
      isGolden: watch.isGolden,
      price: watch.price,
      sprite: watch.sprite,
      spritePadding: watch.spritePadding,
      clipSide: 'right',
      alpha: 1.0,
      life: 1.0,
      age: 0
    }
  ];
}

function updateSplitHalves(dt) {
  for (var i = splitHalves.length - 1; i >= 0; i--) {
    var h = splitHalves[i];
    h.vy += GRAVITY * dt;
    h.x += h.vx * dt;
    h.y += h.vy * dt;
    h.rotation += h.rotationSpeed * dt;
    h.age += dt;
    h.alpha = Math.max(0, 1 - h.age / h.life);

    // Remove when expired or off-screen
    if (h.age >= h.life || h.y > canvasHeight + 200) {
      splitHalves.splice(i, 1);
    }
  }
}

function renderSplitHalves() {
  for (var i = 0; i < splitHalves.length; i++) {
    renderHalf(ctx, splitHalves[i]);
  }
}

function renderHalf(ctx, half) {
  ctx.save();
  ctx.translate(half.x, half.y);
  ctx.rotate(half.rotation);
  ctx.globalAlpha = half.alpha;

  // Clip to one side
  var large = Math.max(half.width, half.height) * 2;
  ctx.beginPath();
  if (half.clipSide === 'right') {
    ctx.rect(0, -large, large, large * 2);
  } else {
    ctx.rect(-large, -large, large, large * 2);
  }
  ctx.clip();

  // Blit cached card sprite at origin (already translated/rotated)
  if (half.sprite) {
    var pad = half.spritePadding || 10;
    var destW = half.width + pad * 2;
    var destH = half.height + pad * 2;
    ctx.drawImage(half.sprite, 0, 0, half.sprite.width, half.sprite.height,
      -destW / 2, -destH / 2, destW, destH);
  }

  ctx.restore(); // CRITICAL: restores clip state
}

// --- Particle System ---

function spawnParticles(x, y, isFake, count, isGolden) {
  // Hard cap to prevent unbounded growth (Pitfall 4)
  if (particles.length > 200) return;

  var color = isGolden ? '255, 215, 0' : (isFake ? '220, 50, 50' : '50, 180, 80');
  for (var i = 0; i < count; i++) {
    var angle = Math.random() * Math.PI * 2;
    var speed = 50 + Math.random() * 150;
    particles.push({
      x: x,
      y: y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 50, // slight upward bias
      radius: 2 + Math.random() * 3,
      color: color,
      alpha: 1.0,
      life: 0.4 + Math.random() * 0.3,
      age: 0
    });
  }
}

function updateParticles(dt) {
  for (var i = particles.length - 1; i >= 0; i--) {
    var p = particles[i];
    p.vx *= 0.98; // slight drag
    p.vy += 400 * dt; // gravity (lighter than watches)
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.age += dt;
    p.alpha = Math.max(0, 1 - p.age / p.life);
    if (p.age >= p.life) {
      particles.splice(i, 1);
    }
  }
}

function renderParticles() {
  for (var i = 0; i < particles.length; i++) {
    var p = particles[i];
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(' + p.color + ', ' + p.alpha + ')';
    ctx.fill();
  }
}

// --- Card Drawing (Vinted-style listing cards) ---

function drawWatchIcon(ctx, cx, cy, r, isGolden) {
  // Case circle
  var caseColor = isGolden ? '#B8860B' : '#2a7d4f';
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = caseColor;
  ctx.fill();
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Cream dial
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.75, 0, Math.PI * 2);
  ctx.fillStyle = '#f5f0e8';
  ctx.fill();

  // Hour markers at 12 and 6 only (simplified)
  ctx.fillStyle = '#333';
  ctx.fillRect(cx - 1.5, cy - r * 0.6, 3, 5);
  ctx.fillRect(cx - 1.5, cy + r * 0.6 - 5, 3, 5);

  // Hands: hour and minute
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx, cy - r * 0.45);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + r * 0.3, cy - r * 0.2);
  ctx.stroke();
}

function drawCardToCanvas(offCtx, ox, oy, card) {
  var w = card.width;
  var h = card.height;
  var isGolden = card.isGolden;
  var cr = 8; // corner radius

  // Drop shadow (OK -- runs ONCE at spawn, not per frame)
  offCtx.save();
  offCtx.shadowColor = 'rgba(0,0,0,0.25)';
  offCtx.shadowBlur = 6;
  offCtx.shadowOffsetX = 0;
  offCtx.shadowOffsetY = 3;

  // Card body
  offCtx.beginPath();
  offCtx.roundRect(ox, oy, w, h, cr);
  if (isGolden) {
    var grad = offCtx.createLinearGradient(ox, oy, ox, oy + h);
    grad.addColorStop(0, '#DAA520');
    grad.addColorStop(1, '#FFD700');
    offCtx.fillStyle = grad;
  } else {
    offCtx.fillStyle = '#ffffff';
  }
  offCtx.fill();
  offCtx.restore(); // reset shadow

  // Reset shadow explicitly
  offCtx.shadowColor = 'transparent';

  // Thin border
  offCtx.beginPath();
  offCtx.roundRect(ox, oy, w, h, cr);
  offCtx.strokeStyle = isGolden ? '#B8860B' : '#e0e0e0';
  offCtx.lineWidth = 1;
  offCtx.stroke();

  // Watch icon centered in top 60% of card
  var iconCx = ox + w / 2;
  var iconCy = oy + h * 0.32;
  var iconR = Math.min(w, h * 0.6) * 0.28;
  drawWatchIcon(offCtx, iconCx, iconCy, iconR, isGolden);

  // Brand name at 75% height
  var brandFontSize = Math.max(12, Math.min(16, w * 0.18));
  offCtx.font = 'bold ' + brandFontSize + 'px sans-serif';
  offCtx.textAlign = 'center';
  offCtx.textBaseline = 'middle';
  offCtx.fillStyle = isGolden ? '#5D4037' : '#333333';
  offCtx.fillText(card.brand, ox + w / 2, oy + h * 0.75);

  // Price tag at 90% height
  offCtx.font = '10px sans-serif';
  offCtx.fillStyle = isGolden ? '#8B6914' : '#007782';
  offCtx.fillText(card.price + ' EUR', ox + w / 2, oy + h * 0.9);
}

function createCardSprite(card) {
  var padding = 10; // shadow bleed room
  var spriteW = (card.width + padding * 2) * dpr;
  var spriteH = (card.height + padding * 2) * dpr;

  var offCanvas = document.createElement('canvas');
  offCanvas.width = spriteW;
  offCanvas.height = spriteH;
  var offCtx = offCanvas.getContext('2d');
  offCtx.scale(dpr, dpr);

  drawCardToCanvas(offCtx, padding, padding, card);

  card.sprite = offCanvas;
  card.spritePadding = padding;
}

function drawCard(ctx, card) {
  ctx.save();
  ctx.translate(card.x, card.y);
  ctx.rotate(card.rotation);

  var pad = card.spritePadding || 10;
  var destW = card.width + pad * 2;
  var destH = card.height + pad * 2;
  ctx.drawImage(card.sprite, 0, 0, card.sprite.width, card.sprite.height,
    -destW / 2, -destH / 2, destW, destH);

  ctx.restore();
}

function drawWatch(ctx, watch) {
  drawCard(ctx, watch);
}

// --- Trail Update & Rendering ---

function updateTrail() {
  var now = performance.now();
  while (trailPoints.length > 0 && now - trailPoints[0].time > TRAIL_LIFETIME) {
    trailPoints.shift();
  }
}

function renderTrail() {
  if (trailPoints.length < 2) return;

  var now = performance.now();
  ctx.lineCap = 'round';

  for (var i = 1; i < trailPoints.length; i++) {
    var p0 = trailPoints[i - 1];
    var p1 = trailPoints[i];

    // Alpha based on age of the newer point
    var age = (now - p1.time) / TRAIL_LIFETIME;
    var alpha = Math.max(0, 1 - age);

    // Width: thinner at tail (3px), thicker near finger (8px)
    var widthRatio = i / trailPoints.length;
    ctx.lineWidth = 3 + widthRatio * 5;

    ctx.strokeStyle = 'rgba(' + TRAIL_COLOR + ', ' + alpha + ')';
    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y);
    ctx.lineTo(p1.x, p1.y);
    ctx.stroke();
  }
}

// --- Background Rendering ---

function renderBackground() {
  var gradient = ctx.createLinearGradient(0, 0, 0, canvasHeight);
  gradient.addColorStop(0, '#009a9a');
  gradient.addColorStop(1, '#006066');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);
}

// --- Score Display ---

function renderScore() {
  var sign = score >= 0 ? '+' : '';
  var scoreText = sign + score + '\u20AC';
  ctx.font = 'bold 20px sans-serif';
  var textW = ctx.measureText(scoreText).width;
  var pillW = Math.max(80, textW + 24);

  // Semi-transparent dark pill background
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.beginPath();
  roundRect(ctx, 10, 10, pillW, 36, 8);
  ctx.fill();

  // Score text (centered in pill)
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = score < 0 ? '#ff6666' : '#ffffff';
  ctx.fillText(scoreText, 10 + pillW / 2, 28);
}

// Rounded rectangle helper
function roundRect(ctx, x, y, w, h, r) {
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// --- Timer Display ---

function renderTimer() {
  var remaining = Math.max(0, Math.ceil(ROUND_DURATION - elapsed));
  var isWarning = remaining <= 10;
  var isFinal = remaining <= 3;

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  if (isFinal && remaining > 0) {
    // Pulse effect: scale based on fractional second
    var frac = (ROUND_DURATION - elapsed) % 1;
    var scale = 1 + (1 - frac) * 0.3; // pulse from 1.3x down to 1.0x
    ctx.font = 'bold ' + Math.round(28 * scale) + 'px sans-serif';
  } else {
    ctx.font = 'bold ' + (isWarning ? 32 : 28) + 'px sans-serif';
  }

  ctx.fillStyle = isWarning ? '#ff4444' : '#ffffff';
  ctx.fillText(remaining.toString(), canvasWidth / 2, 28);
}

// --- Combo Display ---

function renderCombo(dt) {
  if (comboMultiplier <= 1) return;

  // Animate scale-up when combo increases
  if (comboDisplayScale > 1.0) {
    comboDisplayScale = Math.max(1.0, comboDisplayScale - dt * 1.5);
  }

  ctx.save();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  var fontSize = Math.round(20 * comboDisplayScale);
  ctx.font = 'bold ' + fontSize + 'px sans-serif';
  ctx.fillStyle = '#FFD700';
  ctx.fillText('x' + comboMultiplier, 14, 60);
  ctx.restore();
}

// --- Vinted Rating Display ---

function renderRating() {
  var rating = getRating(score);
  var starStr = '';
  for (var i = 0; i < 5; i++) {
    starStr += (i < rating.stars) ? '\u2605' : '\u2606';
  }

  // Measure to size pill dynamically
  ctx.font = 'bold 14px sans-serif';
  var starsW = ctx.measureText(starStr).width;
  ctx.font = '11px sans-serif';
  var labelW = ctx.measureText(rating.label).width;
  var pillW = Math.max(starsW, labelW) + 24;

  // Semi-transparent dark pill background (mirroring score pill)
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.beginPath();
  roundRect(ctx, canvasWidth - pillW - 10, 10, pillW, 36, 8);
  ctx.fill();

  // Stars (upper half of pill)
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 14px sans-serif';
  ctx.fillStyle = '#FFD700';
  ctx.fillText(starStr, canvasWidth - 10 - pillW / 2, 22);

  // Label (lower half of pill)
  ctx.font = '11px sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(rating.label, canvasWidth - 10 - pillW / 2, 38);
}

// --- Act 1 HUD ---

function renderAct1HUD() {
  // Stub -- Task 2 fills this in
}

// --- Transition Screen ---

var vendreButton = { x: 0, y: 0, w: 200, h: 56 };

function renderTransition(dt) {
  // Stub -- Task 2 fills this in
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  renderBackground();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 24px sans-serif';
  ctx.fillText('Transition...', canvasWidth / 2, canvasHeight / 2);
}

function handleTransitionTap(px, py) {
  // Stub -- Task 2 fills this in
}

// --- Start Screen ---

var startButton = { x: 0, y: 0, w: 200, h: 56 };

function initDecorWatches() {
  decorWatches = [];
  var positions = [
    { xr: 0.15, yr: 0.3 },
    { xr: 0.82, yr: 0.25 },
    { xr: 0.25, yr: 0.72 },
    { xr: 0.75, yr: 0.68 },
    { xr: 0.5, yr: 0.15 },
    { xr: 0.6, yr: 0.85 }
  ];
  for (var i = 0; i < positions.length; i++) {
    var p = positions[i];
    var isFake = Math.random() < 0.4;
    var dw = {
      x: 0, y: 0, // will be set relative to canvas size each frame
      xr: p.xr, yr: p.yr,
      size: WATCH_SIZE * (0.8 + Math.random() * 0.4),
      width: CARD_WIDTH,
      height: CARD_HEIGHT,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.5,
      isFake: isFake,
      isGolden: false,
      brand: isFake ? FAKE_NAMES[Math.floor(Math.random() * FAKE_NAMES.length)] : 'Montignac',
      price: 10 + Math.floor(Math.random() * 90),
      slashed: false
    };
    createCardSprite(dw);
    decorWatches.push(dw);
  }
}

function renderStart(dt) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  renderBackground();

  // Update and draw decorative watches
  for (var i = 0; i < decorWatches.length; i++) {
    var dw = decorWatches[i];
    dw.x = canvasWidth * dw.xr;
    dw.y = canvasHeight * dw.yr;
    if (dt) dw.rotation += dw.rotationSpeed * dt;
    ctx.save();
    ctx.globalAlpha = 0.25;
    drawWatch(ctx, dw);
    ctx.restore();
  }

  // Title
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 28px sans-serif';
  ctx.fillText('Le Vinted des Montres', canvasWidth / 2, canvasHeight * 0.25);

  // Subtitle with Thomas's name
  ctx.font = '18px sans-serif';
  ctx.fillText('Thomas, prouve que tu es le roi !', canvasWidth / 2, canvasHeight * 0.25 + 40);

  // Best score on start screen
  if (bestScore !== null) {
    ctx.font = 'bold 16px sans-serif';
    ctx.fillStyle = '#FFD700';
    ctx.textAlign = 'center';
    ctx.fillText('Meilleur score : ' + (bestScore >= 0 ? '+' : '') + bestScore + '\u20AC', canvasWidth / 2, canvasHeight * 0.25 + 70);
  }

  // Play button (recalculate position each frame for responsiveness)
  startButton.w = 200;
  startButton.h = 56;
  startButton.x = canvasWidth / 2 - startButton.w / 2;
  startButton.y = canvasHeight * 0.6 - startButton.h / 2;

  // Button background (white rounded rect)
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  roundRect(ctx, startButton.x, startButton.y, startButton.w, startButton.h, 12);
  ctx.fill();

  // Button text
  ctx.fillStyle = '#007782';
  ctx.font = 'bold 22px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Jouer', canvasWidth / 2, startButton.y + startButton.h / 2);
}

function handleStartTap(px, py) {
  if (px >= startButton.x && px <= startButton.x + startButton.w &&
      py >= startButton.y && py <= startButton.y + startButton.h) {
    SoundEngine.unlock();
    startGame();
  }
}

// --- Game Over Screen ---

var replayButton = { x: 0, y: 0, w: 200, h: 56 };

function renderGameOver() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  renderBackground();

  var cx = canvasWidth / 2;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // 1. Header (~12% height)
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 28px sans-serif';
  ctx.fillText('Temps \u00e9coul\u00e9 !', cx, canvasHeight * 0.12);

  // 2. Stats block (~25% height)
  ctx.font = '18px sans-serif';
  ctx.fillStyle = '#ffffff';
  var lineY = canvasHeight * 0.22;
  var lineGap = 26;

  ctx.fillText('Montres vendues : ' + stats.realSlashed, cx, lineY);
  lineY += lineGap;
  ctx.fillText('Contrefa\u00e7ons tranch\u00e9es : ' + stats.fakeSlashed, cx, lineY);
  lineY += lineGap;

  // Final profit with sign
  var profitSign = score >= 0 ? '+' : '';
  ctx.font = 'bold 22px sans-serif';
  ctx.fillStyle = score >= 0 ? '#50e880' : '#ff6666';
  ctx.fillText('Profit final : ' + profitSign + score + '\u20AC', cx, lineY);
  lineY += lineGap;

  // Optional: golden watches slashed
  ctx.font = '18px sans-serif';
  ctx.fillStyle = '#ffffff';
  if (stats.goldenSlashed > 0) {
    ctx.fillStyle = '#FFD700';
    ctx.fillText('Montres en or : ' + stats.goldenSlashed, cx, lineY);
    lineY += lineGap;
    ctx.fillStyle = '#ffffff';
  }

  // Optional: max combo
  if (stats.maxCombo >= 3) {
    ctx.fillText('Meilleur combo : x' + getMultiplier(stats.maxCombo), cx, lineY);
    lineY += lineGap;
  }

  // Best score display
  if (bestScore !== null) {
    ctx.font = 'bold 18px sans-serif';
    ctx.fillStyle = '#FFD700';
    ctx.fillText('Record : ' + (bestScore >= 0 ? '+' : '') + bestScore + '\u20AC', cx, lineY);
    lineY += lineGap;
  }
  if (isNewBest) {
    ctx.font = 'bold 16px sans-serif';
    ctx.fillStyle = '#50e880';
    ctx.fillText('Nouveau record !', cx, lineY);
    lineY += lineGap;
  }

  // 3. Vinted rating verdict (~50% height, large and prominent)
  var rating = getRating(score);
  var starStr = '';
  for (var i = 0; i < 5; i++) {
    starStr += (i < rating.stars) ? '\u2605' : '\u2606';
  }

  ctx.font = 'bold 24px sans-serif';
  ctx.fillStyle = '#FFD700';
  ctx.fillText(starStr, cx, canvasHeight * 0.52);

  ctx.font = 'bold 18px sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(rating.label, cx, canvasHeight * 0.52 + 28);

  // 4. Birthday message (~62% height)
  // Decorative stars above message
  ctx.font = '14px sans-serif';
  ctx.fillStyle = '#FFD700';
  ctx.fillText('\u2605  \u2605  \u2605', cx, canvasHeight * 0.63);

  ctx.font = 'italic 18px sans-serif';
  ctx.fillStyle = '#ffe0a0';
  ctx.fillText('Joyeux anniversaire mon fr\u00e8re,', cx, canvasHeight * 0.67);
  ctx.fillText('longue vie aux montres', cx, canvasHeight * 0.67 + 24);
  ctx.fillText('et \u00e0 Montignac', cx, canvasHeight * 0.67 + 48);

  // Decorative stars below message
  ctx.font = '14px sans-serif';
  ctx.fillStyle = '#FFD700';
  ctx.fillText('\u2605  \u2605  \u2605', cx, canvasHeight * 0.67 + 72);

  // 5. Replay button (~85% height)
  replayButton.w = 200;
  replayButton.h = 56;
  replayButton.x = cx - replayButton.w / 2;
  replayButton.y = canvasHeight * 0.85 - replayButton.h / 2;

  // Button background (white rounded rect)
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  roundRect(ctx, replayButton.x, replayButton.y, replayButton.w, replayButton.h, 12);
  ctx.fill();

  // Button text
  ctx.fillStyle = '#007782';
  ctx.font = 'bold 22px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Rejouer', cx, replayButton.y + replayButton.h / 2);
}

function handleReplayTap(px, py) {
  if (px >= replayButton.x && px <= replayButton.x + replayButton.w &&
      py >= replayButton.y && py <= replayButton.y + replayButton.h) {
    SoundEngine.unlock();
    startGame();
  }
}

// --- Game Start & Reset ---

function startGame() {
  resetGame();
  gameState = 'act1';
  lastTime = 0;
}

function resetGame() {
  score = 0;
  elapsed = 0;
  combo = 0;
  comboMultiplier = 1;
  comboDisplayScale = 1.0;
  spawnTimer = 0;
  watches.length = 0;
  splitHalves.length = 0;
  particles.length = 0;
  floatingTexts.length = 0;
  trailPoints.length = 0;
  isPointerDown = false;
  isNewBest = false;
  stats = { realSlashed: 0, fakeSlashed: 0, goldenSlashed: 0, maxCombo: 0, totalWatches: 0 };
  lastTime = 0;
  inventory.length = 0;
  act1Spending = 0;
  act2Revenue = 0;
  act2Elapsed = 0;
  currentOfferIndex = 0;
}

// --- Game Loop ---

function updateAct1(dt) {
  updateTrail();

  // Timer
  elapsed += dt;
  if (elapsed >= ROUND_DURATION) {
    gameState = 'transition';
    return;
  }

  // Dynamic difficulty
  var diff = getDifficulty();

  // Watch spawning with dynamic interval
  spawnTimer += dt;
  if (spawnTimer >= diff.spawnInterval) {
    spawnTimer -= diff.spawnInterval;
    spawnWatch(diff);
  }

  // Slash detection BEFORE physics update (check current positions)
  checkSlashCollisions();

  updateWatches(dt);
  updateSplitHalves(dt);
  updateParticles(dt);
  updateFloatingTexts(dt);
}

function renderAct1(dt) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  renderBackground();

  // Draw watches (below trail)
  for (var i = 0; i < watches.length; i++) {
    drawWatch(ctx, watches[i]);
  }

  renderTrail();
  renderSplitHalves();
  renderParticles();
  renderFloatingTexts();
  renderScore();
  renderTimer();
  renderCombo(dt);
  renderRating();
  renderAct1HUD();
}

function gameLoop(timestamp) {
  if (paused) return;

  if (lastTime === 0) {
    lastTime = timestamp;
    requestAnimationFrame(gameLoop);
    return;
  }

  var dt = Math.min((timestamp - lastTime) / 1000, 0.05);
  lastTime = timestamp;

  if (gameState === 'start') {
    renderStart(dt);
  } else if (gameState === 'act1') {
    updateAct1(dt);
    renderAct1(dt);
  } else if (gameState === 'transition') {
    renderTransition(dt);
  } else if (gameState === 'act2') {
    // Act 2 stub -- Plan 02 fills this in
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    renderBackground();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText('Acte 2 : Les Ventes', canvasWidth / 2, canvasHeight / 2 - 20);
    ctx.font = '16px sans-serif';
    ctx.fillText('A venir...', canvasWidth / 2, canvasHeight / 2 + 20);
  } else if (gameState === 'over') {
    renderGameOver();
  }

  requestAnimationFrame(gameLoop);
}

// --- Start ---

initCanvas();
bestScore = loadBestScore();
setupInput();
initDecorWatches();
requestAnimationFrame(gameLoop);
