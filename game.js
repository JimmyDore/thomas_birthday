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
var act2SpawnTimer = 0;    // Spawn timer for Act 2 buyer offers
var allSoldEarly = false;  // True if all inventory sold before timer ran out

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
  if (s >= 100) return { stars: 5, label: 'Roi du Vinted' };
  if (s >= 40)  return { stars: 4, label: 'Vendeur confirm\u00e9' };
  if (s >= 0)   return { stars: 3, label: 'Bon vendeur' };
  if (s >= -50) return { stars: 2, label: 'Vendeur d\u00e9butant' };
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
  var cardW = isGolden ? CARD_WIDTH * 1.2 : CARD_WIDTH;
  var cardH = isGolden ? CARD_HEIGHT * 1.2 : CARD_HEIGHT;
  var price = isGolden ? (200 + Math.floor(Math.random() * 300)) : (10 + Math.floor(Math.random() * 90));
  // value derived from price: positive for reals/golden, negative for fakes
  var watchValue = isFake ? -price : price;

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
      if (w.isBuyerOffer) {
        // Buyer offer fell off -- release inventory item for future offers
        if (!w.slashed && w.targetIndex >= 0 && w.targetIndex < inventory.length) {
          inventory[w.targetIndex].offerPending = false;
        }
      } else if (!w.slashed && !w.isFake && gameState === 'act1') {
        // Missed penalty: real Montignac not slashed (Act 1 only)
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
      if (w.isBuyerOffer) {
        // Buyer offer flew off -- release inventory item for future offers
        if (!w.slashed && w.targetIndex >= 0 && w.targetIndex < inventory.length) {
          inventory[w.targetIndex].offerPending = false;
        }
      } else if (!w.slashed && !w.isFake && gameState === 'act1') {
        // Also penalize if real and unslashed (Act 1 only)
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

// --- Act 2: Swipe Direction Detection ---

function getSwipeDirection(points) {
  if (!points || points.length < 3) return null;

  var first = points[0];
  var last = points[points.length - 1];
  var dx = last.x - first.x;
  var dy = last.y - first.y;
  var absDx = Math.abs(dx);
  var absDy = Math.abs(dy);

  // Minimum 30px horizontal displacement
  if (absDx < 30) return null;

  // Horizontal component must be > 0.8x vertical component
  if (absDx <= absDy * 0.8) return null;

  return dx > 0 ? 'right' : 'left';
}

// --- Act 2: Collision Detection ---

function checkAct2Collisions() {
  if (trailPoints.length < 2) return;

  // Any slash = accept (same mechanic as Act 1; let card fall to skip)
  var start = Math.max(0, trailPoints.length - 6);
  for (var i = start + 1; i < trailPoints.length; i++) {
    var p0 = trailPoints[i - 1];
    var p1 = trailPoints[i];

    for (var j = watches.length - 1; j >= 0; j--) {
      var w = watches[j];
      if (w.slashed) continue;
      if (!w.isBuyerOffer) continue;

      var hitRadius = Math.max(w.width, w.height) / 2 * 1.1;
      if (lineSegmentIntersectsCircle(p0.x, p0.y, p1.x, p1.y, w.x, w.y, hitRadius)) {
        acceptOffer(w);
      }
    }
  }
}

// --- Act 2: Accept Offer ---

function acceptOffer(offerCard) {
  // Mark to prevent re-detection
  offerCard.slashed = true;

  // Update inventory
  var invItem = inventory[offerCard.targetIndex];
  invItem.sold = true;
  invItem.soldFor = offerCard.offerPrice;
  invItem.offerPending = false;

  // Add revenue
  act2Revenue += offerCard.offerPrice;

  // Calculate profit
  var profit = offerCard.offerPrice - invItem.cost;

  if (profit >= 0) {
    // Good deal: green floating text, coin sound, green particles
    spawnFloatingText(offerCard.x, offerCard.y + 10, profit, false, false);
    spawnLabelText(offerCard.x, offerCard.y - 15, 'Vendu !', '50, 180, 80', 16);
    spawnParticles(offerCard.x, offerCard.y, false, 12, offerCard.isGolden);
    SoundEngine.playCoin(0);
    if (offerCard.isGolden) {
      SoundEngine.playJackpot();
    }
  } else {
    // Bad deal: red floating text, penalty sound, red particles
    spawnFloatingText(offerCard.x, offerCard.y + 10, profit, true, false);
    spawnLabelText(offerCard.x, offerCard.y - 15, 'Mauvaise affaire !', '220, 50, 50', 14);
    spawnParticles(offerCard.x, offerCard.y, true, 12, false);
    SoundEngine.playPenalty();
  }

  // Haptic feedback
  hapticFeedback(30);

  // Create split halves for visual effect
  var slashAngle = 0; // horizontal split for accepted offers
  var halves = createSplitHalves(offerCard, slashAngle);
  for (var i = 0; i < halves.length; i++) {
    splitHalves.push(halves[i]);
  }

  // Remove from active array
  var idx = watches.indexOf(offerCard);
  if (idx !== -1) watches.splice(idx, 1);
}

// --- Act 2: Reject Offer ---

function rejectOffer(offerCard) {
  // Mark to prevent re-detection
  offerCard.slashed = true;

  // Release the inventory item for future offers
  inventory[offerCard.targetIndex].offerPending = false;

  // Fling card leftward
  offerCard.vx = -400;
  offerCard.vy = -150;

  // Show "Refuse" floating text
  spawnLabelText(offerCard.x, offerCard.y, 'Refus\u00e9', '255, 255, 255', 14);

  // No sound for rejects (silence = neutral action)
  // Do NOT remove from watches -- let it fly off and get cleaned up by updateWatches
}

// --- Slash Handler ---

function addToInventory(watch, purchaseCost) {
  inventory.push({
    brand: watch.brand,
    price: watch.price,
    isFake: watch.isFake,
    isGolden: watch.isGolden,
    cost: purchaseCost,
    sold: false,
    soldFor: 0,
    offerPending: false
  });
}

function slashWatch(watch, slashAngle) {
  // Mark immediately to prevent double-detection (Pitfall 5)
  watch.slashed = true;

  // Combo system: real watches build combo, fakes reset it
  // Compute combo BEFORE inventory recording so discount applies to cost
  if (!watch.isFake) {
    combo++;
    comboMultiplier = getMultiplier(combo);
    comboDisplayScale = 1.3; // brief pop animation
    stats.maxCombo = Math.max(stats.maxCombo, combo);
  } else {
    combo = 0;
    comboMultiplier = 1;
  }

  // Calculate purchase cost: combo gives a discount on real watches
  var purchaseCost = watch.isFake ? watch.price : Math.round(watch.price / comboMultiplier);

  // Inventory recording for Act 1
  if (gameState === 'act1') {
    addToInventory(watch, purchaseCost);
    act1Spending += purchaseCost;
  }

  // Stats tracking
  if (watch.isFake) {
    stats.fakeSlashed++;
  } else {
    stats.realSlashed++;
    if (watch.isGolden) stats.goldenSlashed++;
  }

  // Update score: fakes are a loss, reals are spending (positive cost)
  score += watch.isFake ? -purchaseCost : purchaseCost;

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

// --- Buyer Card Drawing (Act 2 offer cards) ---

function drawBuyerCardToCanvas(offCtx, ox, oy, card) {
  var w = card.width;
  var h = card.height;
  var cr = 8; // corner radius

  // Drop shadow (runs ONCE at sprite creation, not per frame)
  offCtx.save();
  offCtx.shadowColor = 'rgba(0,0,0,0.25)';
  offCtx.shadowBlur = 6;
  offCtx.shadowOffsetX = 0;
  offCtx.shadowOffsetY = 3;

  // Card body with blue/teal gradient
  offCtx.beginPath();
  offCtx.roundRect(ox, oy, w, h, cr);
  var grad = offCtx.createLinearGradient(ox, oy, ox, oy + h);
  grad.addColorStop(0, '#e8f4f8');
  grad.addColorStop(1, '#d0eef6');
  offCtx.fillStyle = grad;
  offCtx.fill();
  offCtx.restore(); // reset shadow

  // Reset shadow explicitly
  offCtx.shadowColor = 'transparent';

  // Thin border (blue/teal)
  offCtx.beginPath();
  offCtx.roundRect(ox, oy, w, h, cr);
  offCtx.strokeStyle = '#90cad8';
  offCtx.lineWidth = 1;
  offCtx.stroke();

  // "OFFRE" label at top (~12% height)
  offCtx.font = 'bold 10px sans-serif';
  offCtx.textAlign = 'center';
  offCtx.textBaseline = 'middle';
  offCtx.fillStyle = '#007782';
  offCtx.fillText('OFFRE', ox + w / 2, oy + h * 0.12);

  // Brand name centered at ~35% height
  var brandFontSize = Math.max(12, Math.min(16, w * 0.18));
  offCtx.font = 'bold ' + brandFontSize + 'px sans-serif';
  offCtx.fillStyle = '#333333';
  offCtx.fillText(card.brand, ox + w / 2, oy + h * 0.35);

  // Purchase cost at ~55% height (subtle gray, small)
  offCtx.font = '10px sans-serif';
  offCtx.fillStyle = '#999999';
  offCtx.fillText('Paye: ' + card.cost + ' EUR', ox + w / 2, oy + h * 0.55);

  // Offer price at ~73% height (neutral dark blue — no green/red hint)
  offCtx.font = 'bold 18px sans-serif';
  offCtx.fillStyle = '#1a5276';
  offCtx.fillText(card.offerPrice + ' EUR', ox + w / 2, oy + h * 0.73);
}

function createBuyerSprite(card) {
  var padding = 10; // shadow bleed room
  var spriteW = (card.width + padding * 2) * dpr;
  var spriteH = (card.height + padding * 2) * dpr;

  var offCanvas = document.createElement('canvas');
  offCanvas.width = spriteW;
  offCanvas.height = spriteH;
  var offCtx = offCanvas.getContext('2d');
  offCtx.scale(dpr, dpr);

  drawBuyerCardToCanvas(offCtx, padding, padding, card);

  card.sprite = offCanvas;
  card.spritePadding = padding;
}

function createBuyerOffer(inventoryItem, inventoryIndex, t) {
  // t = normalized Act 2 time (0 to 1) for difficulty ramp
  var offerPrice;
  var isGoodDeal;

  if (inventoryItem.isGolden) {
    // Golden watches: premium offers 150-400 EUR
    offerPrice = 150 + Math.floor(Math.random() * 251);
    isGoodDeal = offerPrice > inventoryItem.cost;
  } else if (inventoryItem.isFake) {
    // Fake watches: always low offers, 5-15 EUR
    offerPrice = 5 + Math.floor(Math.random() * 11);
    isGoodDeal = offerPrice > inventoryItem.cost;
  } else {
    // Real watches: margin shrinks over Act 2 time
    var badOfferRate = 0.15 + t * 0.35; // 15% early -> 50% late
    var isBadOffer = Math.random() < badOfferRate;

    if (isBadOffer) {
      // Bad offer: -10% to -50% below cost
      var discount = 0.10 + Math.random() * 0.40;
      offerPrice = Math.max(1, Math.round(inventoryItem.cost * (1 - discount)));
    } else {
      // Good offer: margin from generous to tight
      var minMarkup = 0.50 - t * 0.45; // 50% early -> 5% late
      var maxMarkup = 1.20 - t * 0.90; // 120% early -> 30% late
      minMarkup = Math.max(0.05, minMarkup);
      maxMarkup = Math.max(minMarkup + 0.05, maxMarkup);
      var markup = minMarkup + Math.random() * (maxMarkup - minMarkup);
      offerPrice = Math.round(inventoryItem.cost * (1 + markup));
    }
    isGoodDeal = offerPrice > inventoryItem.cost;
  }

  // Spawn physics (same pattern as spawnWatch)
  var fromLeft = Math.random() < 0.5;
  var x = fromLeft
    ? canvasWidth * (0.1 + Math.random() * 0.3)
    : canvasWidth * (0.6 + Math.random() * 0.3);

  var vx = fromLeft
    ? (20 + Math.random() * 60)
    : -(20 + Math.random() * 60);

  var baseVy = canvasHeight * 0.65 + 100;
  var vy = -(baseVy + Math.random() * canvasHeight * 0.15);

  var cardW = CARD_WIDTH;
  var cardH = CARD_HEIGHT;

  var card = {
    x: x,
    y: canvasHeight + 50, // start below visible area
    vx: vx,
    vy: vy,
    size: WATCH_SIZE,
    width: cardW,
    height: cardH,
    rotation: 0,
    rotationSpeed: (Math.random() - 0.5) * 0.5,
    brand: inventoryItem.brand,
    price: inventoryItem.price,
    offerPrice: offerPrice,
    cost: inventoryItem.cost,
    isFake: inventoryItem.isFake,
    isGolden: inventoryItem.isGolden,
    isGoodDeal: isGoodDeal,
    isBuyerOffer: true,
    targetIndex: inventoryIndex,
    slashed: false,
    value: offerPrice
  };

  // Mark inventory item as having a pending offer
  inventory[inventoryIndex].offerPending = true;

  createBuyerSprite(card);
  return card;
}

function findNextUnsoldItem() {
  var len = inventory.length;
  if (len === 0) return -1;

  for (var i = 0; i < len; i++) {
    var idx = (currentOfferIndex + i) % len;
    if (!inventory[idx].sold && !inventory[idx].offerPending) {
      currentOfferIndex = (idx + 1) % len;
      return idx;
    }
  }
  return -1; // all sold or pending
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

  var trailColor = TRAIL_COLOR;

  for (var i = 1; i < trailPoints.length; i++) {
    var p0 = trailPoints[i - 1];
    var p1 = trailPoints[i];

    // Alpha based on age of the newer point
    var age = (now - p1.time) / TRAIL_LIFETIME;
    var alpha = Math.max(0, 1 - age);

    // Width: thinner at tail (3px), thicker near finger (8px)
    var widthRatio = i / trailPoints.length;
    ctx.lineWidth = 3 + widthRatio * 5;

    ctx.strokeStyle = 'rgba(' + trailColor + ', ' + alpha + ')';
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
  var scoreText;
  var scoreColor;
  if (gameState === 'act1') {
    scoreText = 'D\u00e9pense: ' + act1Spending + ' EUR';
    scoreColor = '#ffffff';
  } else {
    var sign = score >= 0 ? '+' : '';
    scoreText = sign + score + '\u20AC';
    scoreColor = score < 0 ? '#ff6666' : '#ffffff';
  }
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
  ctx.fillStyle = scoreColor;
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
  renderTimerValue(remaining);
}

function renderTimerValue(remaining) {
  var isWarning = remaining <= 10;
  var isFinal = remaining <= 3;
  var fontSize = 28;

  if (isFinal && remaining > 0) {
    var totalDur = (gameState === 'act2') ? ACT2_DURATION : ROUND_DURATION;
    var el = (gameState === 'act2') ? act2Elapsed : elapsed;
    var frac = (totalDur - el) % 1;
    fontSize = Math.round(28 * (1 + (1 - frac) * 0.3));
  } else if (isWarning) {
    fontSize = 32;
  }

  ctx.font = 'bold ' + fontSize + 'px sans-serif';
  var timerText = remaining.toString() + 's';
  var timerW = ctx.measureText(timerText).width;
  var pillW = timerW + 20;

  // Timer pill on second row (below score/rating pills)
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.beginPath();
  roundRect(ctx, canvasWidth / 2 - pillW / 2, 52, pillW, 32, 8);
  ctx.fill();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = isWarning ? '#ff4444' : '#ffffff';
  ctx.fillText(timerText, canvasWidth / 2, 68);
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
  // Act header centered below timer
  ctx.save();
  ctx.font = 'bold 14px sans-serif';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Acte 1 : Les Achats', canvasWidth / 2, 92);

  // Inventory counter
  var countText = inventory.length + (inventory.length <= 1 ? ' montre achet\u00e9e' : ' montres achet\u00e9es');
  ctx.font = '14px sans-serif';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
  ctx.textAlign = 'left';
  ctx.fillText(countText, 14, 110);
  ctx.restore();
}

// --- Transition Screen ---

var vendreButton = { x: 0, y: 0, w: 200, h: 56 };

function renderTransition(dt) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  renderBackground();

  var cx = canvasWidth / 2;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  var isEmpty = inventory.length === 0;

  // Header (~8% height)
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 24px sans-serif';
  ctx.fillText('Acte 1 termin\u00e9 !', cx, canvasHeight * 0.08);

  // Spending total (~13% height)
  ctx.font = '18px sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.fillText('D\u00e9pense totale : ' + act1Spending + ' EUR', cx, canvasHeight * 0.13);

  if (isEmpty) {
    // Empty inventory message
    ctx.font = 'italic 18px sans-serif';
    ctx.fillStyle = '#ff6666';
    ctx.fillText('Aucune montre achet\u00e9e !', cx, canvasHeight * 0.3);
    ctx.fillText('Tu pars les mains vides...', cx, canvasHeight * 0.3 + 26);
  } else {
    // Inventory list (~20% height, compact)
    ctx.font = '16px sans-serif';
    var listStartY = canvasHeight * 0.20;
    var lineSpacing = 20;
    var maxVisible = 7;
    var showCount = Math.min(inventory.length, maxVisible);

    for (var i = 0; i < showCount; i++) {
      var item = inventory[i];
      if (item.isGolden) {
        ctx.fillStyle = '#FFD700';
      } else if (item.isFake) {
        ctx.fillStyle = '#ff6666';
      } else {
        ctx.fillStyle = '#ffffff';
      }
      ctx.fillText(item.brand + ' - ' + item.cost + ' EUR', cx, listStartY + i * lineSpacing);
    }

    if (inventory.length > maxVisible) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.font = 'italic 14px sans-serif';
      ctx.fillText('... et ' + (inventory.length - maxVisible) + ' autre(s)', cx, listStartY + showCount * lineSpacing);
    }

    // Fake reveal section (~70% height)
    var fakeCount = 0;
    for (var j = 0; j < inventory.length; j++) {
      if (inventory[j].isFake) fakeCount++;
    }

    if (fakeCount > 0) {
      ctx.font = 'bold 18px sans-serif';
      ctx.fillStyle = '#ff6666';
      ctx.fillText('Oups, ' + fakeCount + ' contrefacon(s) dans le lot !', cx, canvasHeight * 0.70);
    } else {
      ctx.font = 'bold 18px sans-serif';
      ctx.fillStyle = '#50e880';
      ctx.fillText('Aucune contrefacon, bien jou\u00e9 !', cx, canvasHeight * 0.70);
    }
  }

  // Button (~85% height)
  vendreButton.w = 200;
  vendreButton.h = 56;
  vendreButton.x = cx - vendreButton.w / 2;
  vendreButton.y = canvasHeight * 0.85 - vendreButton.h / 2;

  // Button background (white rounded rect)
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  roundRect(ctx, vendreButton.x, vendreButton.y, vendreButton.w, vendreButton.h, 12);
  ctx.fill();

  // Button text
  ctx.fillStyle = '#007782';
  ctx.font = 'bold 22px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(isEmpty ? 'R\u00e9sultats' : 'Vendre !', cx, vendreButton.y + vendreButton.h / 2);
}

function handleTransitionTap(px, py) {
  if (px >= vendreButton.x && px <= vendreButton.x + vendreButton.w &&
      py >= vendreButton.y && py <= vendreButton.y + vendreButton.h) {
    if (inventory.length === 0) {
      // No watches bought -- skip to game over
      isNewBest = saveBestScore(score);
      gameState = 'over';
    } else {
      // Advance to Act 2
      gameState = 'act2';
      act2Elapsed = 0;
      spawnTimer = 0;
      watches.length = 0;
      splitHalves.length = 0;
      particles.length = 0;
      floatingTexts.length = 0;
      trailPoints.length = 0;
      lastTime = 0;
      combo = 0;
      comboMultiplier = 1;
    }
  }
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

  // 1. Header (~8% height)
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 24px sans-serif';
  if (allSoldEarly) {
    ctx.fillText('Tout vendu ! Bravo !', cx, canvasHeight * 0.08);
  } else {
    ctx.fillText('Temps \u00e9coul\u00e9 !', cx, canvasHeight * 0.08);
  }

  // 2. Act 1 section (~16% height)
  ctx.font = 'bold 16px sans-serif';
  ctx.fillStyle = '#ff9999';
  ctx.fillText('Acte 1 - D\u00e9penses : -' + act1Spending + ' EUR', cx, canvasHeight * 0.16);

  // Count fakes in inventory
  var fakeCount = 0;
  for (var f = 0; f < inventory.length; f++) {
    if (inventory[f].isFake) fakeCount++;
  }
  ctx.font = '14px sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.fillText('Montres achet\u00e9es : ' + inventory.length + ' (dont ' + fakeCount + ' contrefacon(s))', cx, canvasHeight * 0.16 + 22);

  // 3. Act 2 section (~24% height)
  ctx.font = 'bold 16px sans-serif';
  ctx.fillStyle = '#99ff99';
  ctx.fillText('Acte 2 - Recettes : +' + act2Revenue + ' EUR', cx, canvasHeight * 0.26);

  // Count sold items
  var soldCount = 0;
  for (var s = 0; s < inventory.length; s++) {
    if (inventory[s].sold) soldCount++;
  }
  ctx.font = '14px sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.fillText('Montres vendues : ' + soldCount + ' / ' + inventory.length, cx, canvasHeight * 0.26 + 22);

  // 4. Unsold section (~34% height)
  var unsoldCount = 0;
  var unsoldLoss = 0;
  for (var u = 0; u < inventory.length; u++) {
    if (!inventory[u].sold) {
      unsoldCount++;
      unsoldLoss += inventory[u].cost;
    }
  }
  if (unsoldCount > 0) {
    ctx.font = 'bold 16px sans-serif';
    ctx.fillStyle = '#ff6666';
    ctx.fillText('Invendus (' + unsoldCount + ') : -' + unsoldLoss + ' EUR', cx, canvasHeight * 0.34);
  }

  // 5. Final profit (~42% height)
  var profitSign = score >= 0 ? '+' : '';
  ctx.font = 'bold 22px sans-serif';
  ctx.fillStyle = score >= 0 ? '#50e880' : '#ff6666';
  ctx.fillText('Profit final : ' + profitSign + score + ' EUR', cx, canvasHeight * 0.42);

  // Best score below profit
  var bestY = canvasHeight * 0.42 + 28;
  if (bestScore !== null) {
    ctx.font = 'bold 16px sans-serif';
    ctx.fillStyle = '#FFD700';
    ctx.fillText('Record : ' + (bestScore >= 0 ? '+' : '') + bestScore + ' EUR', cx, bestY);
    bestY += 20;
  }
  if (isNewBest) {
    ctx.font = 'bold 14px sans-serif';
    ctx.fillStyle = '#50e880';
    ctx.fillText('Nouveau record !', cx, bestY);
  }

  // 6. Vinted seller rating (~54% height)
  var rating = getRating(score);
  var starStr = '';
  for (var i = 0; i < 5; i++) {
    starStr += (i < rating.stars) ? '\u2605' : '\u2606';
  }

  ctx.font = 'bold 24px sans-serif';
  ctx.fillStyle = '#FFD700';
  ctx.fillText(starStr, cx, canvasHeight * 0.54);

  ctx.font = 'bold 16px sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(rating.label, cx, canvasHeight * 0.54 + 26);

  // 7. Birthday message (~66% height)
  // Decorative stars above message
  ctx.font = '14px sans-serif';
  ctx.fillStyle = '#FFD700';
  ctx.fillText('\u2605  \u2605  \u2605', cx, canvasHeight * 0.64);

  ctx.font = 'italic 16px sans-serif';
  ctx.fillStyle = '#ffe0a0';
  ctx.fillText('Joyeux anniversaire mon fr\u00e8re,', cx, canvasHeight * 0.68);
  ctx.fillText('longue vie aux montres', cx, canvasHeight * 0.68 + 22);
  ctx.fillText('et \u00e0 Montignac', cx, canvasHeight * 0.68 + 44);

  // Decorative stars below message
  ctx.font = '14px sans-serif';
  ctx.fillStyle = '#FFD700';
  ctx.fillText('\u2605  \u2605  \u2605', cx, canvasHeight * 0.68 + 64);

  // 8. Replay button (~87% height)
  replayButton.w = 200;
  replayButton.h = 56;
  replayButton.x = cx - replayButton.w / 2;
  replayButton.y = canvasHeight * 0.87 - replayButton.h / 2;

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
  act2SpawnTimer = 0;
  allSoldEarly = false;
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

// --- Act 2 Game Loop ---

function updateAct2(dt) {
  updateTrail();

  // Timer
  act2Elapsed += dt;

  // Check end conditions: timer expired or all inventory sold
  var allSold = inventory.length > 0 && inventory.every(function(item) { return item.sold; });
  if (act2Elapsed >= ACT2_DURATION || allSold) {
    endGame();
    return;
  }

  // Spawn buyer offers with difficulty-ramped interval
  var t = act2Elapsed / ACT2_DURATION;
  var spawnInterval = 1.5 - t * 0.7; // lerp from 1.5s (t=0) to 0.8s (t=1)
  act2SpawnTimer += dt;
  if (act2SpawnTimer >= spawnInterval) {
    act2SpawnTimer -= spawnInterval;
    var idx = findNextUnsoldItem();
    if (idx !== -1) {
      var offer = createBuyerOffer(inventory[idx], idx, t);
      watches.push(offer);
    }
  }

  // Collision detection (directional swipe accept/reject)
  checkAct2Collisions();

  updateWatches(dt);
  updateSplitHalves(dt);
  updateParticles(dt);
  updateFloatingTexts(dt);
}

function renderAct2(dt) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  renderBackground();

  // Draw buyer offer cards
  for (var i = 0; i < watches.length; i++) {
    drawWatch(ctx, watches[i]);
  }

  renderTrail();
  renderSplitHalves();
  renderParticles();
  renderFloatingTexts();

  // Act 2 HUD: header
  ctx.save();
  ctx.font = 'bold 14px sans-serif';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Acte 2 : La Revente', canvasWidth / 2, 92);
  ctx.restore();

  // Revenue display (replaces score pill for Act 2)
  var revenueText = 'Recettes: ' + act2Revenue + ' EUR';
  ctx.font = 'bold 20px sans-serif';
  var textW = ctx.measureText(revenueText).width;
  var pillW = Math.max(80, textW + 24);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.beginPath();
  roundRect(ctx, 10, 10, pillW, 36, 8);
  ctx.fill();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(revenueText, 10 + pillW / 2, 28);

  // Unsold count
  var unsoldCount = 0;
  for (var j = 0; j < inventory.length; j++) {
    if (!inventory[j].sold) unsoldCount++;
  }
  ctx.font = '14px sans-serif';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
  ctx.textAlign = 'left';
  ctx.fillText(unsoldCount + ' montre(s) a vendre', 14, 110);

  // Timer (reuse shared renderer)
  var remaining = Math.max(0, Math.ceil(ACT2_DURATION - act2Elapsed));
  renderTimerValue(remaining);

  // Vinted rating (top right)
  renderRating();
}

// --- End Game ---

function endGame() {
  // Calculate final breakdown from inventory
  var unsoldLoss = 0;
  for (var i = 0; i < inventory.length; i++) {
    if (!inventory[i].sold) unsoldLoss += inventory[i].cost;
  }

  var finalProfit = act2Revenue - act1Spending;

  // Set score for rating calculation and best score
  score = finalProfit;
  isNewBest = saveBestScore(score);

  // Check if all inventory was sold early
  allSoldEarly = inventory.length > 0 && inventory.every(function(item) { return item.sold; });

  gameState = 'over';
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
    updateAct2(dt);
    renderAct2(dt);
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
