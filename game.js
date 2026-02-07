// Watch Ninja - Le Vinted des Montres
// Phase 01: Foundation + Gameplay | Phase 02: Game flow, timer, difficulty, screens

// --- Canvas & Display ---
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
let canvasWidth = 0;
let canvasHeight = 0;
let dpr = 1;

// --- Game State ---
var gameState = 'start'; // 'start' | 'playing' | 'over'
var ROUND_DURATION = 60;  // seconds
var elapsed = 0;
var stats = { realSlashed: 0, fakeSlashed: 0, goldenSlashed: 0, maxCombo: 0, totalWatches: 0 };
let score = 0;
let paused = false;
let lastTime = 0;

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
var GRAVITY = 600;        // pixels/sec^2
var WATCH_SIZE = 60;      // diameter in CSS pixels
var FAKE_NAMES = ['Montignak', 'Montinyac', 'Montiganc', 'Montigniak', 'Montignaq'];
var WATCH_STYLES = ['round', 'square', 'sport'];

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

    // gameState === 'playing' -- swipe logic
    isPointerDown = true;
    trailPoints.length = 0; // Clear old trail on new swipe
    trailPoints.push({ x: px, y: py, time: performance.now() });
  });

  canvas.addEventListener('pointermove', function (e) {
    e.preventDefault();
    if (gameState !== 'playing') return;
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

// --- Watch Spawning ---

function spawnWatch() {
  var fromLeft = Math.random() < 0.5;
  var x = fromLeft
    ? canvasWidth * (0.1 + Math.random() * 0.3)
    : canvasWidth * (0.6 + Math.random() * 0.3);

  var vx = fromLeft
    ? 30 + Math.random() * 80
    : -(30 + Math.random() * 80);

  // Scale launch velocity with screen height so watches reach upper third
  var baseVy = canvasHeight * 0.9 + 200;
  var vy = -(baseVy + Math.random() * canvasHeight * 0.25);

  var isFake = Math.random() < 0.4;
  var brand = isFake
    ? FAKE_NAMES[Math.floor(Math.random() * FAKE_NAMES.length)]
    : 'Montignac';
  var style = WATCH_STYLES[Math.floor(Math.random() * WATCH_STYLES.length)];

  // ~30% of fakes are sneaky (same green color as real, only name differs)
  var sneaky = isFake && Math.random() < 0.3;

  watches.push({
    x: x,
    y: canvasHeight + 50, // start below visible area
    vx: vx,
    vy: vy,
    size: WATCH_SIZE,
    rotation: 0,
    rotationSpeed: (Math.random() - 0.5) * 3,
    isFake: isFake,
    sneaky: sneaky,
    brand: brand,
    style: style,
    slashed: false,
    value: isFake ? -8 : 15
  });

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
      // Missed penalty: real Montignac not slashed
      if (!w.slashed && !w.isFake) {
        score -= 5;
        spawnFloatingText(w.x, canvasHeight - 30, -5, false, true);
      }
      watches.splice(i, 1);
      continue;
    }

    // Off-screen cleanup: too far left or right
    if (w.x < -200 || w.x > canvasWidth + 200) {
      // Also penalize if real and unslashed
      if (!w.slashed && !w.isFake) {
        score -= 5;
        spawnFloatingText(w.x < -200 ? 30 : canvasWidth - 30, canvasHeight - 30, -5, false, true);
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
    alpha: 1.0,
    vy: -60,
    age: 0,
    life: 1.0
  });
  // Hard cap
  if (floatingTexts.length > 20) floatingTexts.shift();
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
    ctx.font = 'bold 22px sans-serif';
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

      var hitRadius = w.size / 2 * 1.2; // 20% generous hitbox
      if (lineSegmentIntersectsCircle(p0.x, p0.y, p1.x, p1.y, w.x, w.y, hitRadius)) {
        var slashAngle = Math.atan2(p1.y - p0.y, p1.x - p0.x);
        slashWatch(w, slashAngle);
      }
    }
  }
}

// --- Slash Handler ---

function slashWatch(watch, slashAngle) {
  // Mark immediately to prevent double-detection (Pitfall 5)
  watch.slashed = true;

  // Stats tracking
  if (watch.isFake) {
    stats.fakeSlashed++;
  } else {
    stats.realSlashed++;
  }

  // Update score
  score += watch.value;

  // Create split halves
  var halves = createSplitHalves(watch, slashAngle);
  for (var i = 0; i < halves.length; i++) {
    splitHalves.push(halves[i]);
  }

  // Spawn particles
  spawnParticles(watch.x, watch.y, watch.isFake, 12);

  // Spawn floating text
  spawnFloatingText(watch.x, watch.y, watch.value, watch.isFake, false);

  // Haptic feedback
  hapticFeedback(30);

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
      brand: watch.brand,
      isFake: watch.isFake,
      sneaky: watch.sneaky,
      style: watch.style,
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
      brand: watch.brand,
      isFake: watch.isFake,
      sneaky: watch.sneaky,
      style: watch.style,
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
  var large = half.size * 2;
  ctx.beginPath();
  if (half.clipSide === 'right') {
    ctx.rect(0, -large, large, large * 2);
  } else {
    ctx.rect(-large, -large, large, large * 2);
  }
  ctx.clip();

  // Draw the full watch at origin (already translated/rotated)
  // Create a temporary watch-like object at (0,0) with no rotation
  var tempWatch = {
    x: 0,
    y: 0,
    size: half.size,
    rotation: 0,
    isFake: half.isFake,
    sneaky: half.sneaky,
    brand: half.brand,
    style: half.style
  };

  // Determine case color
  var caseColor;
  if (tempWatch.isFake && !tempWatch.sneaky) {
    caseColor = '#cc3333';
  } else {
    caseColor = '#2a7d4f';
  }

  var r = tempWatch.size / 2;
  if (tempWatch.style === 'round') {
    drawRoundWatch(ctx, r, caseColor, tempWatch.brand, tempWatch.size);
  } else if (tempWatch.style === 'square') {
    drawSquareWatch(ctx, r, caseColor, tempWatch.brand, tempWatch.size);
  } else {
    drawSportWatch(ctx, r, caseColor, tempWatch.brand, tempWatch.size);
  }

  ctx.restore(); // CRITICAL: restores clip state
}

// --- Particle System ---

function spawnParticles(x, y, isFake, count) {
  // Hard cap to prevent unbounded growth (Pitfall 4)
  if (particles.length > 200) return;

  var color = isFake ? '220, 50, 50' : '50, 180, 80';
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

// --- Watch Drawing (3 styles) ---

function drawWatch(ctx, watch) {
  var r = watch.size / 2;
  // Determine case color: real = green, non-sneaky fakes = red, sneaky fakes = same green
  var caseColor;
  if (watch.isFake && !watch.sneaky) {
    caseColor = '#cc3333';
  } else {
    caseColor = '#2a7d4f';
  }

  ctx.save();
  ctx.translate(watch.x, watch.y);
  ctx.rotate(watch.rotation);

  if (watch.style === 'round') {
    drawRoundWatch(ctx, r, caseColor, watch.brand, watch.size);
  } else if (watch.style === 'square') {
    drawSquareWatch(ctx, r, caseColor, watch.brand, watch.size);
  } else {
    drawSportWatch(ctx, r, caseColor, watch.brand, watch.size);
  }

  ctx.restore();
}

// -- Round Classic style --
function drawRoundWatch(ctx, r, caseColor, brand, size) {
  // Band stubs (brown leather)
  ctx.fillStyle = '#8B4513';
  ctx.fillRect(-8, -r - 18, 16, 10);
  ctx.fillRect(-8, r + 8, 16, 10);

  // Lugs
  ctx.fillStyle = '#666';
  ctx.fillRect(-6, -r - 10, 12, 10);
  ctx.fillRect(-6, r, 12, 10);

  // Case
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fillStyle = caseColor;
  ctx.fill();
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Cream dial
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.75, 0, Math.PI * 2);
  ctx.fillStyle = '#f5f0e8';
  ctx.fill();

  // Hour markers at 12, 3, 6, 9
  ctx.fillStyle = '#333';
  for (var i = 0; i < 4; i++) {
    var angle = (i * Math.PI) / 2 - Math.PI / 2;
    var mx = Math.cos(angle) * r * 0.6;
    var my = Math.sin(angle) * r * 0.6;
    ctx.fillRect(mx - 2, my - 2, 4, 4);
  }

  // Watch hands
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, -r * 0.5);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(r * 0.3, -r * 0.3);
  ctx.stroke();

  // Crown
  ctx.beginPath();
  ctx.arc(r + 4, 0, 4, 0, Math.PI * 2);
  ctx.fillStyle = '#888';
  ctx.fill();

  // Brand name
  drawBrandLabel(ctx, brand, r, size);
}

// -- Square Cushion style --
function drawSquareWatch(ctx, r, caseColor, brand, size) {
  var s = r * 0.85; // half-side of the square

  // Band stubs (metal bracelet)
  ctx.fillStyle = '#aaa';
  ctx.fillRect(-10, -r - 16, 20, 10);
  ctx.fillRect(-10, r + 6, 20, 10);

  // Wider lugs
  ctx.fillStyle = '#666';
  ctx.fillRect(-8, -r - 8, 16, 10);
  ctx.fillRect(-8, r - 2, 16, 10);

  // Square case with rounded corners (manual path)
  var cr = r * 0.2; // corner radius
  ctx.beginPath();
  ctx.moveTo(-s + cr, -s);
  ctx.lineTo(s - cr, -s);
  ctx.quadraticCurveTo(s, -s, s, -s + cr);
  ctx.lineTo(s, s - cr);
  ctx.quadraticCurveTo(s, s, s - cr, s);
  ctx.lineTo(-s + cr, s);
  ctx.quadraticCurveTo(-s, s, -s, s - cr);
  ctx.lineTo(-s, -s + cr);
  ctx.quadraticCurveTo(-s, -s, -s + cr, -s);
  ctx.closePath();
  ctx.fillStyle = caseColor;
  ctx.fill();
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Cream dial (slightly smaller square)
  var ds = s * 0.8;
  var dcr = cr * 0.6;
  ctx.beginPath();
  ctx.moveTo(-ds + dcr, -ds);
  ctx.lineTo(ds - dcr, -ds);
  ctx.quadraticCurveTo(ds, -ds, ds, -ds + dcr);
  ctx.lineTo(ds, ds - dcr);
  ctx.quadraticCurveTo(ds, ds, ds - dcr, ds);
  ctx.lineTo(-ds + dcr, ds);
  ctx.quadraticCurveTo(-ds, ds, -ds, ds - dcr);
  ctx.lineTo(-ds, -ds + dcr);
  ctx.quadraticCurveTo(-ds, -ds, -ds + dcr, -ds);
  ctx.closePath();
  ctx.fillStyle = '#f5f0e8';
  ctx.fill();

  // Hour markers
  ctx.fillStyle = '#333';
  for (var i = 0; i < 4; i++) {
    var angle = (i * Math.PI) / 2 - Math.PI / 2;
    var mx = Math.cos(angle) * ds * 0.7;
    var my = Math.sin(angle) * ds * 0.7;
    ctx.fillRect(mx - 2, my - 2, 4, 4);
  }

  // Watch hands
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, -ds * 0.6);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(ds * 0.4, -ds * 0.3);
  ctx.stroke();

  // Crown
  ctx.beginPath();
  ctx.arc(s + 4, 0, 3.5, 0, Math.PI * 2);
  ctx.fillStyle = '#888';
  ctx.fill();

  // Brand name
  drawBrandLabel(ctx, brand, r, size);
}

// -- Sport Diver style --
function drawSportWatch(ctx, r, caseColor, brand, size) {
  // Band stubs (chunky rubber)
  ctx.fillStyle = '#333';
  ctx.fillRect(-10, -r - 20, 20, 12);
  ctx.fillRect(-10, r + 8, 20, 12);

  // Lugs
  ctx.fillStyle = '#555';
  ctx.fillRect(-7, -r - 10, 14, 12);
  ctx.fillRect(-7, r - 2, 14, 12);

  // Outer bezel ring (thicker, slightly darker)
  ctx.beginPath();
  ctx.arc(0, 0, r + 3, 0, Math.PI * 2);
  var darkerCase = darkenColor(caseColor, 0.7);
  ctx.fillStyle = darkerCase;
  ctx.fill();
  ctx.strokeStyle = '#222';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Inner case
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fillStyle = caseColor;
  ctx.fill();

  // Cream dial
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.75, 0, Math.PI * 2);
  ctx.fillStyle = '#f5f0e8';
  ctx.fill();

  // Hour markers
  ctx.fillStyle = '#333';
  for (var i = 0; i < 4; i++) {
    var angle = (i * Math.PI) / 2 - Math.PI / 2;
    var mx = Math.cos(angle) * r * 0.6;
    var my = Math.sin(angle) * r * 0.6;
    ctx.fillRect(mx - 2, my - 2, 4, 4);
  }

  // Watch hands
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, -r * 0.5);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(r * 0.3, -r * 0.3);
  ctx.stroke();

  // Larger crown
  ctx.beginPath();
  ctx.arc(r + 6, 0, 5, 0, Math.PI * 2);
  ctx.fillStyle = '#888';
  ctx.fill();

  // Brand name
  drawBrandLabel(ctx, brand, r, size);
}

// -- Shared brand label drawing --
function drawBrandLabel(ctx, brand, r, size) {
  ctx.fillStyle = '#333';
  ctx.font = 'bold ' + Math.max(10, size * 0.18) + 'px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(brand, 0, r * 0.3);
}

// -- Darken a hex color --
function darkenColor(hex, factor) {
  var r = parseInt(hex.slice(1, 3), 16);
  var g = parseInt(hex.slice(3, 5), 16);
  var b = parseInt(hex.slice(5, 7), 16);
  r = Math.floor(r * factor);
  g = Math.floor(g * factor);
  b = Math.floor(b * factor);
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
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
  // Semi-transparent dark pill background
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.beginPath();
  roundRect(ctx, 10, 10, 120, 36, 8);
  ctx.fill();

  // Score text
  ctx.font = 'bold 20px sans-serif';
  ctx.textBaseline = 'top';
  ctx.fillStyle = score < 0 ? '#ff6666' : '#ffffff';
  var sign = score >= 0 ? '+' : '';
  ctx.fillText(sign + score + '\u20AC', 18, 18);
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
  ctx.textBaseline = 'top';

  if (isFinal && remaining > 0) {
    // Pulse effect: scale based on fractional second
    var frac = (ROUND_DURATION - elapsed) % 1;
    var scale = 1 + (1 - frac) * 0.3; // pulse from 1.3x down to 1.0x
    ctx.font = 'bold ' + Math.round(28 * scale) + 'px sans-serif';
  } else {
    ctx.font = 'bold ' + (isWarning ? 32 : 28) + 'px sans-serif';
  }

  ctx.fillStyle = isWarning ? '#ff4444' : '#ffffff';
  ctx.fillText(remaining.toString(), canvasWidth / 2, 16);
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
    decorWatches.push({
      x: 0, y: 0, // will be set relative to canvas size each frame
      xr: p.xr, yr: p.yr,
      size: WATCH_SIZE * (0.8 + Math.random() * 0.4),
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.5,
      isFake: Math.random() < 0.4,
      sneaky: false,
      brand: Math.random() < 0.4 ? FAKE_NAMES[Math.floor(Math.random() * FAKE_NAMES.length)] : 'Montignac',
      style: WATCH_STYLES[Math.floor(Math.random() * WATCH_STYLES.length)],
      slashed: false
    });
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
    startGame();
  }
}

// --- Game Over Screen (placeholder for Task 2) ---

var replayButton = { x: 0, y: 0, w: 200, h: 56 };

function renderGameOver() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  renderBackground();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 28px sans-serif';
  ctx.fillText('Temps \u00e9coul\u00e9 !', canvasWidth / 2, canvasHeight * 0.3);

  ctx.font = '20px sans-serif';
  ctx.fillText('Score: ' + score + '\u20AC', canvasWidth / 2, canvasHeight * 0.45);
}

function handleReplayTap(px, py) {
  // Placeholder -- full replay button added in Task 2
}

// --- Game Start & Reset ---

function startGame() {
  resetGame();
  gameState = 'playing';
  lastTime = 0;
}

function resetGame() {
  score = 0;
  elapsed = 0;
  spawnTimer = 0;
  watches.length = 0;
  splitHalves.length = 0;
  particles.length = 0;
  floatingTexts.length = 0;
  trailPoints.length = 0;
  isPointerDown = false;
  stats = { realSlashed: 0, fakeSlashed: 0, goldenSlashed: 0, maxCombo: 0, totalWatches: 0 };
  lastTime = 0;
}

// --- Game Loop ---

function update(dt) {
  updateTrail();

  // Timer
  elapsed += dt;
  if (elapsed >= ROUND_DURATION) {
    gameState = 'over';
    return;
  }

  // Watch spawning
  spawnTimer += dt;
  if (spawnTimer >= SPAWN_INTERVAL) {
    spawnTimer -= SPAWN_INTERVAL;
    spawnWatch();
  }

  // Slash detection BEFORE physics update (check current positions)
  checkSlashCollisions();

  updateWatches(dt);
  updateSplitHalves(dt);
  updateParticles(dt);
  updateFloatingTexts(dt);
}

function render() {
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
  } else if (gameState === 'playing') {
    update(dt);
    render();
  } else if (gameState === 'over') {
    renderGameOver();
  }

  requestAnimationFrame(gameLoop);
}

// --- Start ---

initCanvas();
setupInput();
initDecorWatches();
requestAnimationFrame(gameLoop);
