// Watch Ninja - Game Shell
// Phase 01 Plan 01: Foundation (canvas, game loop, background, score, input, trail)

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
  // Will be filled by Task 2 (trail) and Plan 02 (watches, physics)
}

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  renderBackground();
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
requestAnimationFrame(gameLoop);
