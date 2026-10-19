/* =========================================
   Engineering Optics Simulation Lab
   Shared Utility - Canvas Drawing Helpers
   ========================================= */

const SimUtil = (function () {
  // HiDPI canvas setup
  function setupCanvas(canvas) {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const w = Math.max(1, rect.width || canvas.clientWidth || 1);
    const h = Math.max(1, rect.height || canvas.clientHeight || 1);
    const pixelW = Math.max(1, Math.round(w * dpr));
    const pixelH = Math.max(1, Math.round(h * dpr));
    if (canvas.width !== pixelW || canvas.height !== pixelH) {
      canvas.width = pixelW;
      canvas.height = pixelH;
    }
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx, w, h, dpr };
  }

  // Re-render when the actual chart box changes, not only when the window changes.
  // This matters when a responsive grid changes the canvas width without a full
  // page reload, and keeps the bitmap and its CSS box aligned.
  function observeCanvas(canvas, render) {
    let frame = 0;
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(render);
    };
    const observer = typeof ResizeObserver !== "undefined"
      ? new ResizeObserver(schedule)
      : null;
    if (observer) observer.observe(canvas);
    window.addEventListener("resize", schedule);
    schedule();
    return () => {
      cancelAnimationFrame(frame);
      if (observer) observer.disconnect();
      window.removeEventListener("resize", schedule);
    };
  }

  // Keep range inputs and their readouts in sync after reset/preset changes.
  function syncRangeControls(root, params, options = {}) {
    if (!root) return;
    const digits = options.digits || {};
    root.querySelectorAll('input[type="range"]').forEach((input) => {
      const key = input.dataset.key;
      if (!(key in params)) return;
      input.value = params[key];
      const valueEl = root.querySelector("#val-" + key);
      if (!valueEl) return;
      const precision = digits[key] ?? (input.dataset.digits !== undefined ? Number(input.dataset.digits) : 2);
      const unit = input.dataset.unit ? " " + input.dataset.unit : "";
      valueEl.textContent = fmt(params[key], precision) + unit;
    });
  }

  // Advance time-like sliders without letting the value drift outside their
  // visible range while the animation keeps running.
  function syncAnimatedTime(root, params, key, max, digits = 2) {
    const value = ((params[key] % max) + max) % max;
    params[key] = value;
    const input = root?.querySelector(`input[type="range"][data-key="${key}"]`);
    if (input) input.value = value;
    const valueEl = root?.querySelector("#val-" + key);
    if (valueEl) valueEl.textContent = fmt(value, digits) + (input?.dataset.unit ? " " + input.dataset.unit : "");
    return value;
  }

  // Draw coordinate grid
  function drawGrid(ctx, w, h, opts = {}) {
    const {
      xMin = -10,
      xMax = 10,
      yMin = -2,
      yMax = 2,
      color = "rgba(255,255,255,0.06)",
      majorColor = "rgba(255,255,255,0.1)",
      axisColor = "rgba(255,255,255,0.35)",
      labelColor = "#6b7a93",
      showLabels = true,
      padding = 40,
    } = opts;

    const plotW = w - padding * 2;
    const plotH = h - padding * 2;

    const xToPx = (x) => padding + ((x - xMin) / (xMax - xMin)) * plotW;
    const yToPx = (y) => padding + (1 - (y - yMin) / (yMax - yMin)) * plotH;

    // Draw grid
    const xStep = (xMax - xMin) / 10;
    const yStep = (yMax - yMin) / 6;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = xMin; x <= xMax; x += xStep) {
      const px = xToPx(x);
      ctx.moveTo(px, padding);
      ctx.lineTo(px, padding + plotH);
    }
    for (let y = yMin; y <= yMax; y += yStep) {
      const py = yToPx(y);
      ctx.moveTo(padding, py);
      ctx.lineTo(padding + plotW, py);
    }
    ctx.stroke();

    // Major grid every 5 small
    ctx.strokeStyle = majorColor;
    ctx.beginPath();
    for (let x = xMin; x <= xMax; x += xStep * 5) {
      const px = xToPx(x);
      ctx.moveTo(px, padding);
      ctx.lineTo(px, padding + plotH);
    }
    for (let y = yMin; y <= yMax; y += yStep * 2) {
      const py = yToPx(y);
      ctx.moveTo(padding, py);
      ctx.lineTo(padding + plotW, py);
    }
    ctx.stroke();

    // Axis
    ctx.strokeStyle = axisColor;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(padding, yToPx(0));
    ctx.lineTo(padding + plotW, yToPx(0));
    ctx.moveTo(xToPx(0), padding);
    ctx.lineTo(xToPx(0), padding + plotH);
    ctx.stroke();

    // Labels
    if (showLabels) {
      ctx.fillStyle = labelColor;
      ctx.font = "10px 'JetBrains Mono', monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      for (let x = xMin; x <= xMax; x += xStep * 5) {
        if (Math.abs(x) < 0.001) continue;
        ctx.fillText(x.toFixed(0), xToPx(x), padding + plotH + 6);
      }
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      for (let y = yMin; y <= yMax; y += yStep * 2) {
        if (Math.abs(y) < 0.001) continue;
        ctx.fillText(y.toFixed(1), padding - 6, yToPx(y));
      }
    }

    return { xToPx, yToPx, padding, plotW, plotH, xMin, xMax, yMin, yMax };
  }

  // Draw a function curve
  function drawCurve(ctx, fn, transform, color, width = 2) {
    const { xToPx, yToPx, padding, plotW } = transform;
    const steps = Math.max(200, Math.floor(plotW));
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    for (let i = 0; i <= steps; i++) {
      const x = transform.xMin + (transform.xMax - transform.xMin) * (i / steps);
      const y = fn(x);
      if (Math.abs(y) > 1e6) continue;
      const px = xToPx(x);
      const py = yToPx(y);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
  }

  // Draw a moving dot/marker on a curve at position x
  function drawMarker(ctx, x, y, transform, color, label) {
    const px = transform.xToPx(x);
    const py = transform.yToPx(y);
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(px, py, 4, 0, Math.PI * 2);
    ctx.fill();
    if (label) {
      ctx.fillStyle = color;
      ctx.font = "11px sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(label, px + 8, py - 8);
    }
  }

  // Draw a vertical reference line
  function drawVLine(ctx, x, transform, color, label) {
    const px = transform.xToPx(x);
    const { padding, plotH } = transform;
    ctx.strokeStyle = color;
    ctx.setLineDash([4, 4]);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(px, padding);
    ctx.lineTo(px, padding + plotH);
    ctx.stroke();
    ctx.setLineDash([]);
    if (label) {
      ctx.fillStyle = color;
      ctx.font = "10px sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(label, px + 4, padding + 12);
    }
  }

  // Format a number with units
  function fmt(value, digits = 2) {
    if (typeof value !== "number") return value;
    if (!Number.isFinite(value)) return value < 0 ? "−∞" : "∞";
    if (Math.abs(value) < 0.01 && value !== 0) return value.toExponential(digits);
    return value.toFixed(digits);
  }

  // Linear interpolation
  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  return {
    setupCanvas,
    observeCanvas,
    syncRangeControls,
    syncAnimatedTime,
    drawGrid,
    drawCurve,
    drawMarker,
    drawVLine,
    fmt,
    lerp,
  };
})();

// A reusable Animation loop wrapper
class SimLoop {
  constructor(updateFn, renderFn, fps = 60) {
    this.updateFn = updateFn;
    this.renderFn = renderFn;
    this.running = false;
    this.lastTime = 0;
    this.fps = fps;
    this.accum = 0;
    this.frameInterval = 1000 / fps;
    this._loop = this._loop.bind(this);
  }
  start() {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    requestAnimationFrame(this._loop);
  }
  stop() {
    this.running = false;
  }
  _loop(now) {
    if (!this.running) return;
    const dt = now - this.lastTime;
    this.lastTime = now;
    this.accum += dt;
    while (this.accum >= this.frameInterval) {
      this.updateFn(this.frameInterval / 1000);
      this.accum -= this.frameInterval;
    }
    if (this.renderFn) this.renderFn();
    requestAnimationFrame(this._loop);
  }
}

// Window-level state bus
window.Sim = { SimUtil, SimLoop };
