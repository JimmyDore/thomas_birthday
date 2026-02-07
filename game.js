// Watch Ninja - Core Slashing Game
// Phase 01: Foundation + Gameplay (canvas, game loop, input, watches, slashing, scoring)

// --- Canvas & Display ---
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
let canvasWidth = 0;
let canvasHeight = 0;
let dpr = 1;

// --- Game State ---
let score = 0;
let paused = false;
let lastTime = 0;

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
    isPointerDown = true;
    trailPoints.length = 0; // Clear old trail on new swipe
    var rect = canvas.getBoundingClientRect();
    trailPoints.push({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      time: performance.now()
    });
  });

  canvas.addEventListener('pointermove', function (e) {
    e.preventDefault();
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

  var vy = -(450 + Math.random() * 200);

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

// --- Game Loop ---

function update(dt) {
  updateTrail();

  // Watch spawning
  spawnTimer += dt;
  if (spawnTimer >= SPAWN_INTERVAL) {
    spawnTimer -= SPAWN_INTERVAL;
    spawnWatch();
  }

  updateWatches(dt);
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
  renderFloatingTexts();
  renderScore();
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

  update(dt);
  render();

  requestAnimationFrame(gameLoop);
}

// --- Start ---

initCanvas();
setupInput();
requestAnimationFrame(gameLoop);
