/*
 * 几何光学仿真组件
 * 覆盖第 1、2、3 章：基本定律、厚透镜、平面系统和双光楔。
 * 所有模型都使用教材中采用的近轴/几何光学公式，Canvas 只负责可视化。
 */

const GeoDraw = (() => {
  const TAU = Math.PI * 2;

  function clear(ctx, w, h) {
    ctx.fillStyle = "#050810";
    ctx.fillRect(0, 0, w, h);
  }

  function line(ctx, a, b, color = "#a3b1c6", width = 1.5, dash = null) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    if (dash) ctx.setLineDash(dash);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    ctx.restore();
  }

  function arrow(ctx, a, b, color = "#4a9eff", width = 2) {
    const angle = Math.atan2(b.y - a.y, b.x - a.x);
    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(b.x, b.y);
    ctx.lineTo(b.x - 10 * Math.cos(angle - 0.45), b.y - 10 * Math.sin(angle - 0.45));
    ctx.lineTo(b.x - 10 * Math.cos(angle + 0.45), b.y - 10 * Math.sin(angle + 0.45));
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  function label(ctx, text, x, y, color = "#a3b1c6", align = "left", size = 11) {
    ctx.save();
    ctx.fillStyle = color;
    ctx.font = `${size}px 'JetBrains Mono', 'Consolas', monospace`;
    ctx.textAlign = align;
    ctx.textBaseline = "middle";
    ctx.fillText(text, x, y);
    ctx.restore();
  }

  function panel(ctx, x, y, width, height, lines, accent = "#22d3ee") {
    ctx.save();
    ctx.fillStyle = "rgba(10,14,26,0.88)";
    ctx.strokeStyle = "rgba(255,255,255,0.16)";
    ctx.lineWidth = 1;
    ctx.fillRect(x, y, width, height);
    ctx.strokeRect(x, y, width, height);
    lines.forEach((item, index) => label(ctx, item, x + 10, y + 13 + index * 17, index === 0 ? accent : "#a3b1c6", "left", 11));
    ctx.restore();
  }

  function grid(ctx, x, y, width, height, cols = 8, rows = 5) {
    ctx.save();
    ctx.strokeStyle = "rgba(255,255,255,0.055)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i <= cols; i += 1) {
      const px = x + width * i / cols;
      ctx.moveTo(px, y); ctx.lineTo(px, y + height);
    }
    for (let i = 0; i <= rows; i += 1) {
      const py = y + height * i / rows;
      ctx.moveTo(x, py); ctx.lineTo(x + width, py);
    }
    ctx.stroke();
    ctx.restore();
  }

  function axes(ctx, rect, xMin, xMax, yMin, yMax, xLabel, yLabel) {
    const { x, y, width, height } = rect;
    const xToPx = (value) => x + (value - xMin) / (xMax - xMin) * width;
    const yToPx = (value) => y + (1 - (value - yMin) / (yMax - yMin)) * height;
    grid(ctx, x, y, width, height, 8, 5);
    ctx.save();
    ctx.strokeStyle = "rgba(255,255,255,0.28)";
    ctx.lineWidth = 1;
    if (yMin <= 0 && yMax >= 0) {
      ctx.beginPath(); ctx.moveTo(x, yToPx(0)); ctx.lineTo(x + width, yToPx(0)); ctx.stroke();
    }
    ctx.fillStyle = "#6b7a93";
    ctx.font = "10px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(xLabel, x + width / 2, y + height + 22);
    ctx.save();
    ctx.translate(x - 25, y + height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(yLabel, 0, 0);
    ctx.restore();
    ctx.restore();
    return { xToPx, yToPx };
  }

  function curve(ctx, rect, xMin, xMax, fn, yToPx, color, width = 2, dash = null) {
    const xToPx = (v) => rect.x + (v - xMin) / (xMax - xMin) * rect.width;
    const steps = Math.max(180, Math.floor(rect.width));
    ctx.save();
    ctx.beginPath();
    ctx.rect(rect.x, rect.y, rect.width, rect.height);
    ctx.clip();
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    if (dash) ctx.setLineDash(dash);
    ctx.beginPath();
    let started = false;
    for (let i = 0; i <= steps; i += 1) {
      const xv = xMin + (xMax - xMin) * i / steps;
      const yv = fn(xv);
      if (!Number.isFinite(yv)) { started = false; continue; }
      const px = xToPx(xv); const py = yToPx(yv);
      if (!started) { ctx.moveTo(px, py); started = true; }
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.restore();
  }

  function angleArc(ctx, center, radius, start, end, color = "#fbbf24", text = "") {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(center.x, center.y, radius, start, end); ctx.stroke();
    if (text) {
      let sweep = (end - start) % TAU;
      if (sweep < 0) sweep += TAU;
      const mid = start + sweep / 2;
      label(ctx, text, center.x + (radius + 15) * Math.cos(mid), center.y + (radius + 15) * Math.sin(mid), color, "center", 11);
    }
    ctx.restore();
  }

  function rotate(v, angle) {
    return { x: v.x * Math.cos(angle) - v.y * Math.sin(angle), y: v.x * Math.sin(angle) + v.y * Math.cos(angle) };
  }

  function add(a, b) { return { x: a.x + b.x, y: a.y + b.y }; }
  function mul(v, s) { return { x: v.x * s, y: v.y * s }; }
  function dot(a, b) { return a.x * b.x + a.y * b.y; }

  function drawLens(ctx, x, y, height, type = "convex", color = "#22d3ee") {
    const half = height / 2;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = "rgba(34,211,238,0.08)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    if (type === "concave") {
      ctx.moveTo(x - 8, y - half);
      ctx.quadraticCurveTo(x + 28, y, x - 8, y + half);
      ctx.quadraticCurveTo(x - 28, y, x - 8, y - half);
    } else if (type === "diverging") {
      ctx.moveTo(x - 18, y - half);
      ctx.lineTo(x + 18, y + half);
      ctx.lineTo(x + 18, y - half);
      ctx.closePath();
    } else {
      ctx.moveTo(x - 7, y - half);
      ctx.quadraticCurveTo(x + 30, y, x - 7, y + half);
      ctx.quadraticCurveTo(x - 30, y, x - 7, y - half);
    }
    ctx.fill(); ctx.stroke();
    ctx.restore();
  }

  function drawArrowObject(ctx, x, base, height, color = "#fbbf24", name = "物") {
    line(ctx, { x, y: base }, { x, y: base - height }, color, 2);
    arrow(ctx, { x, y: base }, { x, y: base - height }, color, 2);
    label(ctx, name, x, base + 15, color, "center", 11);
  }

  function drawPrism(ctx, cx, top, base, halfBase, color = "#a78bfa") {
    ctx.save();
    ctx.fillStyle = "rgba(167,139,250,0.10)";
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx, top);
    ctx.lineTo(cx - halfBase, base);
    ctx.lineTo(cx + halfBase, base);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.restore();
  }

  function rightAngle(ctx, pt, v, t, size = 8, color = "#fbbf24") {
    const lenV = Math.hypot(v.x, v.y) || 1;
    const lenT = Math.hypot(t.x, t.y) || 1;
    const uv = { x: (v.x / lenV) * size, y: (v.y / lenV) * size };
    const ut = { x: (t.x / lenT) * size, y: (t.y / lenT) * size };
    const p1 = { x: pt.x + uv.x, y: pt.y + uv.y };
    const p2 = { x: pt.x + uv.x + ut.x, y: pt.y + uv.y + ut.y };
    const p3 = { x: pt.x + ut.x, y: pt.y + ut.y };
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.lineTo(p3.x, p3.y);
    ctx.stroke();
    ctx.restore();
  }

  return { TAU, clear, line, arrow, label, panel, grid, axes, curve, angleArc, rotate, add, mul, dot, drawLens, drawArrowObject, drawPrism, rightAngle };
})();

class GeometricSim {
  constructor(canvasId, controlsId, mode = "straight") {
    this.canvas = document.getElementById(canvasId);
    this.controlsRoot = document.getElementById(controlsId);
    this.mode = mode || "straight";
    this.configs = {
      straight: {
        defaults: { n: 1.00, fan: 22, source: 0, t: 0, play: true },
        controls: [
          { key: "n", label: "均匀介质折射率 n", min: 1, max: 2.2, step: 0.01, digits: 2 },
          { key: "fan", label: "光束展开角 2θ", min: 4, max: 55, step: 1, unit: "°", digits: 0 },
          { key: "source", label: "光源高度 y", min: -80, max: 80, step: 1, unit: "mm", digits: 0 },
        ],
      },
      reflection: {
        defaults: { incidence: 35, mirror: 0, t: 0, play: true },
        controls: [
          { key: "incidence", label: "入射光方向 i₀", min: 0, max: 70, step: 1, unit: "°", digits: 0 },
          { key: "mirror", label: "镜面转角 θ", min: -25, max: 25, step: 0.1, unit: "°", digits: 1 },
        ],
      },
      refraction: {
        defaults: { n1: 1.50, n2: 1.00, incidence: 35, t: 0, play: true },
        controls: [
          { key: "n1", label: "介质 1 折射率 n₁", min: 1, max: 2.4, step: 0.01, digits: 2 },
          { key: "n2", label: "介质 2 折射率 n₂", min: 1, max: 2.4, step: 0.01, digits: 2 },
          { key: "incidence", label: "入射角 i", min: 0, max: 89, step: 1, unit: "°", digits: 0 },
        ],
      },
      fermat: {
        defaults: { sourceOffset: 0.2, hit: 0.5, t: 0, play: true },
        controls: [
          { key: "sourceOffset", label: "接收点高度差", min: -0.45, max: 0.45, step: 0.01, unit: "归一化", digits: 2 },
          { key: "hit", label: "当前反射点位置", min: 0.03, max: 0.97, step: 0.001, digits: 3 },
        ],
      },
      malus: {
        defaults: { waveType: "plane", n1: 1.00, n2: 1.52, incidence: 35, sourceDist: 150, fanAngle: 28, t: 0, play: true },
        controls: [
          { key: "n1", label: "入射介质折射率 n₁", min: 1, max: 2.4, step: 0.01, digits: 2 },
          { key: "n2", label: "出射介质折射率 n₂", min: 1, max: 2.4, step: 0.01, digits: 2 },
          { key: "incidence", label: "入射角 i", min: 0, max: 80, step: 1, unit: "°", digits: 0 },
        ],
        sphereControls: [
          { key: "n1", label: "入射介质折射率 n₁", min: 1, max: 2.4, step: 0.01, digits: 2 },
          { key: "n2", label: "出射介质折射率 n₂", min: 1, max: 2.4, step: 0.01, digits: 2 },
          { key: "sourceDist", label: "光源距界面 d", min: 80, max: 240, step: 5, unit: "px", digits: 0 },
          { key: "fanAngle", label: "光束半发散角 α", min: 10, max: 42, step: 1, unit: "°", digits: 0 },
        ],
      },
      "plane-mirror-rotation": {
        defaults: { rotation: 8, t: 0, play: true },
        controls: [{ key: "rotation", label: "平面镜转角 θ", min: -20, max: 20, step: 0.1, unit: "°", digits: 1 }],
      },
      "mirror-measurement": {
        defaults: { focal: 1000, arm: 10, displacement: 0.02, t: 0, play: true },
        controls: [
          { key: "focal", label: "等效焦距 f′", min: 100, max: 2000, step: 10, unit: "mm", digits: 0 },
          { key: "arm", label: "测杆支点距光轴 a", min: 2, max: 50, step: 0.5, unit: "mm", digits: 1 },
          { key: "displacement", label: "测杆微小位移 x", min: -1, max: 1, step: 0.001, unit: "mm", digits: 3 },
        ],
      },
      "parallel-plate": {
        defaults: { n: 1.50, thickness: 10, incidence: 35, t: 0, play: true },
        controls: [
          { key: "n", label: "平板折射率 n", min: 1.1, max: 2.2, step: 0.01, digits: 2 },
          { key: "thickness", label: "平板厚度 d", min: 1, max: 40, step: 0.5, unit: "mm", digits: 1 },
          { key: "incidence", label: "入射角 I₁", min: 0, max: 75, step: 1, unit: "°", digits: 0 },
        ],
      },
      prism: {
        defaults: { n: 1.52, apex: 40, incidence: 35, t: 0, play: true },
        controls: [
          { key: "n", label: "棱镜折射率 n", min: 1.1, max: 2.2, step: 0.01, digits: 2 },
          { key: "apex", label: "顶角 α", min: 5, max: 70, step: 1, unit: "°", digits: 0 },
          { key: "incidence", label: "第一面入射角 I₁", min: 0, max: 80, step: 1, unit: "°", digits: 0 },
        ],
      },
      "double-wedge": {
        defaults: { n: 1.52, alpha: 1.2, phi: 35, translation: 2, t: 0, play: true },
        controls: [
          { key: "n", label: "光楔折射率 n", min: 1.1, max: 2.2, step: 0.01, digits: 2 },
          { key: "alpha", label: "单光楔楔角 α", min: 0.1, max: 5, step: 0.1, unit: "°", digits: 1 },
          { key: "phi", label: "两光楔相对转角 φ", min: 0, max: 180, step: 1, unit: "°", digits: 0 },
          { key: "translation", label: "轴向相对位移 Δz", min: 0, max: 10, step: 0.1, unit: "mm", digits: 1 },
        ],
      },
      "sphere-paraxial": {
        defaults: { surfaceType: "refraction", r: 100, l: -300, n1: 1.00, n2: 1.50, h: 20, y: 30, t: 0, play: false },
        controls: [
          { key: "r", label: "曲率半径 r", min: -300, max: 300, step: 5, unit: "mm", digits: 0 },
          { key: "l", label: "物距 l", min: -500, max: 500, step: 5, unit: "mm", digits: 0 },
          { key: "n1", label: "物方折射率 n", min: 1.00, max: 2.40, step: 0.01, digits: 2 },
          { key: "n2", label: "像方折射率 n′", min: 1.00, max: 2.40, step: 0.01, digits: 2 },
          { key: "h", label: "近轴孔径高 h", min: 5, max: 50, step: 1, unit: "mm", digits: 0 },
          { key: "y", label: "物高 y", min: -60, max: 60, step: 1, unit: "mm", digits: 0 },
        ],
        reflectControls: [
          { key: "r", label: "曲率半径 r (负:凹面 正:凸面)", min: -300, max: 300, step: 5, unit: "mm", digits: 0 },
          { key: "l", label: "物距 l", min: -500, max: 500, step: 5, unit: "mm", digits: 0 },
          { key: "n1", label: "环境介质折射率 n", min: 1.00, max: 2.40, step: 0.01, digits: 2 },
          { key: "h", label: "近轴孔径高 h", min: 5, max: 50, step: 1, unit: "mm", digits: 0 },
          { key: "y", label: "物高 y", min: -60, max: 60, step: 1, unit: "mm", digits: 0 },
        ],
      },
      "sphere-exact": {
        defaults: { surfaceType: "refraction", r: 100, L: -300, n1: 1.00, n2: 1.50, U: 8, y: 30, t: 0, play: false },
        controls: [
          { key: "r", label: "曲率半径 r", min: -300, max: 300, step: 5, unit: "mm", digits: 0 },
          { key: "L", label: "物方截距 L", min: -500, max: 500, step: 5, unit: "mm", digits: 0 },
          { key: "n1", label: "物方折射率 n", min: 1.00, max: 2.40, step: 0.01, digits: 2 },
          { key: "n2", label: "像方折射率 n′", min: 1.00, max: 2.40, step: 0.01, digits: 2 },
          { key: "U", label: "物方孔径角 U", min: 0.5, max: 35, step: 0.5, unit: "°", digits: 1 },
          { key: "y", label: "物高 y", min: -60, max: 60, step: 1, unit: "mm", digits: 0 },
        ],
        reflectControls: [
          { key: "r", label: "曲率半径 r (负:凹面 正:凸面)", min: -300, max: 300, step: 5, unit: "mm", digits: 0 },
          { key: "L", label: "物方截距 L", min: -500, max: 500, step: 5, unit: "mm", digits: 0 },
          { key: "n1", label: "环境介质折射率 n", min: 1.00, max: 2.40, step: 0.01, digits: 2 },
          { key: "U", label: "物方孔径角 U", min: 0.5, max: 35, step: 0.5, unit: "°", digits: 1 },
          { key: "y", label: "物高 y", min: -60, max: 60, step: 1, unit: "mm", digits: 0 },
        ],
      },
      "perfect-imaging": {
        defaults: {
          condition: "all",
          systemType: "ideal",
          l: -220,
          lPrime: 220,
          fan: 24,
          rays: 7,
          t: 0,
          play: true,
        },
        controls: [
          { key: "l", label: "物距 l", min: -350, max: -100, step: 5, unit: "mm", digits: 0 },
          { key: "lPrime", label: "像距 l′", min: 100, max: 350, step: 5, unit: "mm", digits: 0 },
          { key: "fan", label: "物方孔径角 2U", min: 8, max: 40, step: 1, unit: "°", digits: 0 },
          { key: "rays", label: "光线采样数", min: 5, max: 11, step: 2, digits: 0 },
        ],
      },
    };
    this.config = this.configs[mode] || this.configs.straight;
    this.params = Object.assign({}, this.config.defaults);
    this.render = this.render.bind(this);
    this._setupControls();
    this._unobserveResize = Sim.SimUtil.observeCanvas(this.canvas, this.render);
    this.loop = new Sim.SimLoop((dt) => this.update(dt), () => this.render(), 45);
    this._renderUI();
    this.loop.start();
  }

  destroy() { this.loop.stop(); this._unobserveResize?.(); }

  reset() {
    const prevWaveType = this.params.waveType;
    const prevSurfaceType = this.params.surfaceType;
    const prevCondition = this.params.condition;
    const prevSystemType = this.params.systemType;
    Object.assign(this.params, this.config.defaults);
    if (this.mode === "malus" && prevWaveType) {
      this.params.waveType = prevWaveType;
    }
    if ((this.mode === "sphere-paraxial" || this.mode === "sphere-exact") && prevSurfaceType) {
      this.params.surfaceType = prevSurfaceType;
    }
    if (this.mode === "perfect-imaging") {
      if (prevCondition) this.params.condition = prevCondition;
      if (prevSystemType) this.params.systemType = prevSystemType;
    }
    this._setupControls();
    this._renderUI();
  }

  togglePlay(button) {
    this.params.play = !this.params.play;
    button.textContent = this.params.play ? "⏸ 暂停" : "▶ 播放";
  }

  snapshot() {
    const a = document.createElement("a");
    a.download = `geometric-${this.mode}-${Date.now()}.png`;
    a.href = this.canvas.toDataURL("image/png");
    a.click();
  }

  update(dt) {
    if (!this.params.play) return;
    this.params.t = (this.params.t + dt) % 1000;
    if (this.mode === "fermat") this.params.hit = 0.5 + 0.44 * Math.sin(this.params.t * 0.45);
    if (this.mode === "sphere-paraxial") {
      this.params.l = -200 + 90 * Math.sin(this.params.t * 0.5);
      this._renderUI();
    }
    if (this.mode === "sphere-exact") {
      this.params.U = 12 + 7 * Math.sin(this.params.t * 0.6);
      this._renderUI();
    }
    if (this.mode === "perfect-imaging") {
      this.params.t = (this.params.t + dt * 0.8) % 1000;
    }
  }

  _setupControls() {
    let html = "";
    if (this.mode === "malus") {
      const isPlane = this.params.waveType !== "sphere";
      html += `
        <div class="control-group mb-3">
          <div class="control-row"><span class="control-label" style="font-weight:600;color:var(--accent-cyan);">波面形态选择</span></div>
          <div class="btn-group w-full" id="malus-wave-type">
            <button type="button" class="btn ${isPlane ? 'active' : ''}" data-type="plane" style="flex:1;">平面波 (平行光)</button>
            <button type="button" class="btn ${!isPlane ? 'active' : ''}" data-type="sphere" style="flex:1;">球面波 (点光源)</button>
          </div>
        </div>
      `;
    } else if (this.mode === "sphere-paraxial" || this.mode === "sphere-exact") {
      const isRefract = this.params.surfaceType !== "reflection";
      html += `
        <div class="control-group mb-3">
          <div class="control-row"><span class="control-label" style="font-weight:600;color:var(--accent-cyan);">面型 / 作用类型</span></div>
          <div class="btn-group w-full" id="sphere-surface-type">
            <button type="button" class="btn ${isRefract ? 'active' : ''}" data-type="refraction" style="flex:1;">折射球面</button>
            <button type="button" class="btn ${!isRefract ? 'active' : ''}" data-type="reflection" style="flex:1;">反射球面镜</button>
          </div>
        </div>
      `;
    } else if (this.mode === "perfect-imaging") {
      const cond = this.params.condition || "all";
      const sys = this.params.systemType || "ideal";
      html += `
        <div class="control-group mb-3">
          <div class="control-row"><span class="control-label" style="font-weight:600;color:var(--accent-cyan);">等价条件视角选择 (教材P2)</span></div>
          <div class="btn-group w-full" id="perfect-condition-group" style="display:grid;grid-template-columns:1fr 1fr;gap:4px;">
            <button type="button" class="btn ${cond === 'all' ? 'active' : ''}" data-cond="all">综合三等价</button>
            <button type="button" class="btn ${cond === 'wavefront' ? 'active' : ''}" data-cond="wavefront">① 球面波面</button>
            <button type="button" class="btn ${cond === 'homocentric' ? 'active' : ''}" data-cond="homocentric">② 同心光束</button>
            <button type="button" class="btn ${cond === 'opl' ? 'active' : ''}" data-cond="opl">③ 任意光路等光程</button>
          </div>
        </div>
        <div class="control-group mb-3">
          <div class="control-row"><span class="control-label" style="font-weight:600;color:var(--accent-cyan);">光学系统类型对比</span></div>
          <div class="btn-group w-full" id="perfect-system-group">
            <button type="button" class="btn ${sys === 'ideal' ? 'active' : ''}" data-sys="ideal" style="flex:1;">完善成像系统 (无像差)</button>
            <button type="button" class="btn ${sys === 'aberrated' ? 'active' : ''}" data-sys="aberrated" style="flex:1;">非完善系统 (产生球差)</button>
          </div>
        </div>
      `;
    }

    const isSphereReflection = (this.mode === "sphere-paraxial" || this.mode === "sphere-exact") && this.params.surfaceType === "reflection";
    const controlsList = (this.mode === "malus" && this.params.waveType === "sphere")
      ? (this.config.sphereControls || this.config.controls)
      : (isSphereReflection ? (this.config.reflectControls || this.config.controls) : this.config.controls);

    html += controlsList.map((g) => {
      const digits = g.digits ?? 2;
      return `<div class="control-group"><div class="control-row"><span class="control-label">${g.label}</span><span class="control-value" id="val-${g.key}">${Sim.SimUtil.fmt(this.params[g.key], digits)}${g.unit ? ` ${g.unit}` : ""}</span></div><input type="range" min="${g.min}" max="${g.max}" step="${g.step}" value="${this.params[g.key]}" data-key="${g.key}" data-unit="${g.unit || ""}" data-digits="${digits}" /></div>`;
    }).join("");

    this.controlsRoot.innerHTML = html;

    if (this.mode === "malus") {
      this.controlsRoot.querySelectorAll("#malus-wave-type .btn").forEach((btn) => {
        btn.addEventListener("click", () => {
          this.params.waveType = btn.dataset.type;
          this._setupControls();
          this._renderUI();
        });
      });
    }

    if (this.mode === "sphere-paraxial" || this.mode === "sphere-exact") {
      this.controlsRoot.querySelectorAll("#sphere-surface-type .btn").forEach((btn) => {
        btn.addEventListener("click", () => {
          this.params.surfaceType = btn.dataset.type;
          if (this.params.surfaceType === "reflection" && this.params.r > 0) {
            this.params.r = -Math.abs(this.params.r);
          }
          this._setupControls();
          this._renderUI();
        });
      });
    }

    if (this.mode === "perfect-imaging") {
      this.controlsRoot.querySelectorAll("#perfect-condition-group .btn").forEach((btn) => {
        btn.addEventListener("click", () => {
          this.params.condition = btn.dataset.cond;
          this._setupControls();
          this._renderUI();
        });
      });
      this.controlsRoot.querySelectorAll("#perfect-system-group .btn").forEach((btn) => {
        btn.addEventListener("click", () => {
          this.params.systemType = btn.dataset.sys;
          this._setupControls();
          this._renderUI();
        });
      });
    }

    this.controlsRoot.querySelectorAll('input[type="range"]').forEach((input) => input.addEventListener("input", (event) => {
      this.params[input.dataset.key] = parseFloat(event.target.value);
      this._renderUI();
    }));
  }

  _renderUI() {
    const digits = {};
    const isSphereReflection = (this.mode === "sphere-paraxial" || this.mode === "sphere-exact") && this.params.surfaceType === "reflection";
    const controlsList = (this.mode === "malus" && this.params.waveType === "sphere")
      ? (this.config.sphereControls || this.config.controls)
      : (isSphereReflection ? (this.config.reflectControls || this.config.controls) : this.config.controls);
    controlsList.forEach((g) => { digits[g.key] = g.digits ?? 2; });
    Sim.SimUtil.syncRangeControls(this.controlsRoot, this.params, { digits });
    this._renderReadouts();
    this.render();
  }

  _setReadouts(items) {
    const root = document.getElementById("readouts");
    if (!root) return;
    root.innerHTML = items.map((item) => `<div class="card"><div class="text-muted" style="font-size:11px;margin-bottom:4px;">${item.label}</div><div class="text-mono" style="font-size:18px;color:${item.color || "var(--accent-cyan)"};">${item.value}</div></div>`).join("");
  }

  _renderReadouts() {
    const p = this.params;
    const deg = (v) => v * 180 / Math.PI;
    if (this.mode === "straight") {
      const yVal = Math.round(p.source || 0);
      const yStr = yVal === 0 ? "0 mm" : `${yVal > 0 ? "+" : ""}${yVal} mm`;
      this._setReadouts([
        { label: "传播介质", value: `n = ${p.n.toFixed(2)}` },
        { label: "光源高度 y", value: yStr, color: "var(--accent-cyan)" },
        { label: "光束展开角", value: `${p.fan.toFixed(0)}°` },
        { label: "路径结论", value: "直线传播 (dθ/dx = 0)", color: "var(--accent-green)" },
        { label: "介质中光速", value: `${(1 / p.n).toFixed(3)} c` },
      ]);
    } else if (this.mode === "reflection") {
      const fixedNorm = { x: 0, y: -1 };
      const fromHit = GeoDraw.rotate(fixedNorm, -p.incidence * Math.PI / 180);
      const incoming = GeoDraw.mul(fromHit, -1);
      const theta = p.mirror * Math.PI / 180;
      const normal = { x: Math.sin(theta), y: -Math.cos(theta) };
      const dot = GeoDraw.dot(incoming, normal);
      const valid = dot < 0;
      const actualI = valid ? Math.acos(Math.max(-1, Math.min(1, -dot))) * 180 / Math.PI : NaN;
      this._setReadouts([
        { label: "当前入射角 i", value: valid ? `${actualI.toFixed(1)}°` : "—" },
        { label: "当前反射角 r", value: valid ? `${actualI.toFixed(1)}°` : "—", color: "var(--accent-green)" },
        { label: "反射光转角 2θ", value: `${(2 * p.mirror).toFixed(1)}°`, color: "var(--accent-cyan)" },
        { label: "镜面转角 θ", value: `${p.mirror.toFixed(1)}°` },
      ]);
    } else if (this.mode === "refraction") {
      const s = p.n1 * Math.sin(p.incidence * Math.PI / 180) / p.n2;
      const tir = Math.abs(s) > 1;
      const critical = p.n1 > p.n2 ? deg(Math.asin(Math.min(1, p.n2 / p.n1))) : NaN;
      this._setReadouts([
        { label: "折射角 r", value: tir ? "全反射" : `${deg(Math.asin(s)).toFixed(2)}°`, color: tir ? "var(--accent-red)" : "var(--accent-green)" },
        { label: "临界角", value: Number.isFinite(critical) ? `${critical.toFixed(2)}°` : "不存在" },
        { label: "Snell 残差", value: tir ? "—" : (p.n1 * Math.sin(p.incidence * Math.PI / 180) - p.n2 * Math.sin(Math.asin(s))).toExponential(2) },
      ]);
    } else if (this.mode === "fermat") {
      const p0 = this._fermatGeometry(640, 420);
      const current = p0.path(p.hit);
      const best = p0.best;
      this._setReadouts([
        { label: "当前光程", value: current.toFixed(2) },
        { label: "最小光程", value: best.toFixed(2), color: "var(--accent-green)" },
        { label: "偏离最小值", value: (current - best).toFixed(3) },
      ]);
    } else if (this.mode === "malus") {
      if (p.waveType === "sphere") {
        const nRel = p.n2 / p.n1;
        const tirCritical = p.n1 > p.n2 ? deg(Math.asin(Math.min(1, p.n2 / p.n1))) : null;
        const maxI = p.fanAngle || 28;
        const hasTIR = tirCritical !== null && maxI >= tirCritical;
        this._setReadouts([
          { label: "波面形态", value: "球面波 (点光源)", color: "var(--accent-cyan)" },
          { label: "光线与波面夹角", value: "90.00°", color: "var(--accent-green)" },
          { label: "正交性残差", value: "0.00°", color: "var(--accent-green)" },
          { label: "等光程性验证", value: "ΔOPL ≡ 0", color: "var(--accent-blue)" },
          { label: "相对折射率 n₂/n₁", value: nRel.toFixed(2) },
          { label: hasTIR ? "边缘全反射临界角" : "全反射状态", value: hasTIR ? `${tirCritical.toFixed(1)}° (边缘发生)` : (tirCritical ? `${tirCritical.toFixed(1)}° (未发生)` : "无全反射"), color: hasTIR ? "var(--accent-orange)" : "var(--text-secondary)" },
        ]);
      } else {
        const s = p.n1 * Math.sin(p.incidence * Math.PI / 180) / p.n2;
        const tir = Math.abs(s) > 1;
        const angle = tir ? p.incidence : deg(Math.asin(s));
        this._setReadouts([
          { label: "波面形态", value: "平面波 (平行光)", color: "var(--accent-cyan)" },
          { label: tir ? "反射角" : "折射角", value: `${angle.toFixed(2)}°`, color: tir ? "var(--accent-orange)" : "var(--accent-green)" },
          { label: "光线与波面夹角", value: "90.00°", color: "var(--accent-green)" },
          { label: "正交性残差", value: "0.00°", color: "var(--accent-green)" },
        ]);
      }
    } else if (this.mode === "plane-mirror-rotation") {
      this._setReadouts([
        { label: "平面镜转角 θ", value: `${p.rotation.toFixed(2)}°` },
        { label: "反射光偏转角 2θ", value: `${(2 * p.rotation).toFixed(2)}°`, color: "var(--accent-green)" },
        { label: "物像对称性", value: "AA′⟂面, BB′⟂面 (d=d′)", color: "var(--accent-cyan)" },
        { label: "像旋转与大小", value: `虚像随动 2θ (等大反向)` },
      ]);
    } else if (this.mode === "mirror-measurement") {
      const theta = p.displacement / p.arm;
      const imageShift = 2 * p.focal * theta;
      const thetaDeg = theta * 180 / Math.PI;
      const thetaMrad = theta * 1000;
      this._setReadouts([
        { label: "平面镜转角 θ≈x/a", value: `${thetaDeg.toFixed(3)}° (${thetaMrad.toFixed(2)} mrad)`, color: "var(--accent-cyan)" },
        { label: "反射光偏角 2θ", value: `${(2 * thetaDeg).toFixed(3)}° (${(2 * thetaMrad).toFixed(2)} mrad)`, color: "var(--accent-orange)" },
        { label: "测杆微小位移 x", value: `${p.displacement.toFixed(3)} mm` },
        { label: "焦点位移 FF₁", value: `${imageShift.toFixed(3)} mm`, color: "var(--accent-green)" },
        { label: "光学放大比 2f′/a", value: `${(2 * p.focal / p.arm).toFixed(1)} 倍` },
      ]);
    } else if (this.mode === "parallel-plate") {
      const i = p.incidence * Math.PI / 180;
      const r = Math.asin(Math.sin(i) / p.n);
      const lateral = p.thickness * Math.sin(i - r) / Math.cos(r);
      const axial = p.thickness * (1 - Math.tan(r) / Math.max(1e-9, Math.tan(i || 1e-9)));
      this._setReadouts([
        { label: "折射角 I₁′", value: `${(r * 180 / Math.PI).toFixed(2)}°` },
        { label: "侧向位移 ΔT", value: `${lateral.toFixed(3)} mm`, color: "var(--accent-green)" },
        { label: "近轴轴向位移", value: `${axial.toFixed(3)} mm` },
      ]);
    } else if (this.mode === "prism") {
      const result = this._prismValues();
      this._setReadouts([
        { label: "出射角 I₂′", value: result.valid ? `${result.exitDeg.toFixed(2)}°` : "出射全反射", color: result.valid ? "var(--accent-green)" : "var(--accent-red)" },
        { label: "偏向角 δ", value: result.valid ? `${result.deviationDeg.toFixed(2)}°` : "—" },
        { label: "最小偏向角 δₘ", value: Number.isFinite(result.minDeviation) ? `${result.minDeviation.toFixed(2)}°` : "—" },
      ]);
    } else if (this.mode === "double-wedge") {
      const a = p.alpha * Math.PI / 180;
      const delta = 2 * a * (p.n - 1) * Math.cos(p.phi * Math.PI / 180);
      const dy = a * (p.n - 1) * p.translation;
      this._setReadouts([
        { label: "总偏向角 δ", value: `${(delta * 1000).toFixed(3)} mrad`, color: "var(--accent-green)" },
        { label: "垂轴位移 Δy", value: `${dy.toFixed(3)} mm` },
        { label: "测微关系", value: "Δy = α(n−1)Δz" },
      ]);
    } else if (this.mode === "sphere-paraxial") {
      const res = this._sphereParaxialCalc();
      const formatNum = (v, d = 3) => Number.isFinite(v) ? v.toFixed(d) : "∞";
      const isReal = res.isReflection ? (res.lPrime < 0) : (res.lPrime > 0);
      const isUpright = res.beta > 0;
      const nature = Number.isFinite(res.lPrime) ? `${isUpright ? "正立" : "倒立"}${Math.abs(res.beta) > 1 ? "放大" : "缩小"}${isReal ? "实像" : "虚像"}` : "成像于无穷远";
      const surfaceName = res.isReflection ? (res.r < 0 ? "凹面反射镜" : "凸面反射镜") : "折射球面";
      const focalStr = res.isReflection
        ? `f = f′ = ${formatNum(res.f, 1)} mm`
        : `f = ${formatNum(res.f, 1)} / f′ = ${formatNum(res.fPrime, 1)} mm`;
      this._setReadouts([
        { label: "光学面型", value: surfaceName, color: "var(--accent-cyan)" },
        { label: "① 垂轴放大率 β", value: formatNum(res.beta, 3), color: "var(--accent-green)" },
        { label: "② 轴向放大率 α", value: formatNum(res.alpha, 3), color: "var(--accent-cyan)" },
        { label: "③ 角放大率 γ", value: formatNum(res.gamma, 3), color: "var(--accent-purple)" },
        { label: "④ 面积放大率 S", value: formatNum(res.S, 3), color: "var(--accent-orange)" },
        { label: "像距 l′ / 像高 y′", value: `${formatNum(res.lPrime, 1)} mm / ${formatNum(res.yPrime, 1)} mm` },
        { label: "主焦距 (f / f′)", value: focalStr },
        { label: "孔径角 u / 像方角 u′", value: `${(res.u * 180 / Math.PI).toFixed(1)}° / ${(Math.abs(res.uPrime) * 180 / Math.PI).toFixed(1)}°` },
        { label: "放大率关系 (α·γ=β)", value: `残差 ${res.residual.toExponential(2)}`, color: "var(--accent-green)" },
        { label: "成像性质判断", value: nature, color: isReal ? "var(--accent-green)" : "var(--accent-orange)" },
      ]);
    } else if (this.mode === "sphere-exact") {
      const res = this._sphereExactCalc();
      const formatNum = (v, d = 3) => Number.isFinite(v) ? v.toFixed(d) : "—";
      let statusText = res.isReflection ? "正常反射" : "正常折射";
      let statusColor = "var(--accent-green)";
      if (res.missed) { statusText = "光线未交截球面"; statusColor = "var(--accent-red)"; }
      else if (res.tir) { statusText = "发生全反射 (TIR)"; statusColor = "var(--accent-orange)"; }

      const surfaceName = res.isReflection ? (res.r < 0 ? "凹面反射镜" : "凸面反射镜") : "折射球面";
      this._setReadouts([
        { label: "光学面型", value: surfaceName, color: "var(--accent-cyan)" },
        { label: "实际像方截距 L′", value: formatNum(res.LPrime, 2) + (Number.isFinite(res.LPrime) ? " mm" : ""), color: "var(--accent-green)" },
        { label: "物高 y / 像高 y′", value: `${p.y.toFixed(1)} mm / ${formatNum(res.yPrimeExact, 2)} mm` },
        { label: "纵向球差 δL′ (L′−l′)", value: formatNum(res.deltaLPrime, 3) + (Number.isFinite(res.deltaLPrime) ? " mm" : ""), color: Math.abs(res.deltaLPrime) > 1 ? "var(--accent-orange)" : "var(--accent-green)" },
        { label: res.isReflection ? "入射角 / 反射角" : "折射角 I / I′", value: res.missed ? "—" : `${res.Ideg.toFixed(2)}° / ${res.tir ? "全反射" : res.IPrimeDeg.toFixed(2) + "°"}` },
        { label: "像方孔径角 U′", value: res.tir || res.missed ? "—" : `${res.UPrimeDeg.toFixed(2)}°` },
        { label: "实际垂轴放大率 β_real", value: formatNum(res.betaExact, 3), color: "var(--accent-cyan)" },
        { label: "实际角放大率 γ_real", value: formatNum(res.gammaExact, 3) },
        { label: "近轴基准 l′ / β_paraxial", value: `${formatNum(res.lPrime, 1)} mm / ${formatNum(res.betaParaxial, 3)}` },
        { label: "光路追迹状态", value: statusText, color: statusColor },
      ]);
    } else if (this.mode === "perfect-imaging") {
      const res = this._perfectImagingCalc();
      const isIdeal = p.systemType !== "aberrated";
      this._setReadouts([
        { label: "完善成像状态", value: isIdeal ? "完善成像 (Stigmatic)" : "非完善系统 (像差)", color: isIdeal ? "var(--accent-green)" : "var(--accent-orange)" },
        { label: "① 波面对应条件", value: isIdeal ? "出射仍为同心球面波 Σ₂" : "出射波面非球畸变", color: isIdeal ? "var(--accent-green)" : "var(--accent-orange)" },
        { label: "② 光束对应条件", value: isIdeal ? "出射仍为同心光束 (汇于 A′)" : "光线分离 (形成弥散斑)", color: isIdeal ? "var(--accent-green)" : "var(--accent-orange)" },
        { label: "③ 任意光路光程差", value: isIdeal ? "ΔOPL ≡ 0.000 λ (等光程)" : `ΔOPL = ${res.maxDeltaOPL.toFixed(3)} λ`, color: isIdeal ? "var(--accent-green)" : "var(--accent-orange)" },
        { label: "像点弥散斑大小", value: isIdeal ? "0.00 μm (理想点像)" : `${res.spotSizeUm.toFixed(2)} μm`, color: isIdeal ? "var(--accent-cyan)" : "var(--accent-red)" },
        { label: "马吕斯定理验证", value: "光线 ⟂ 等光程波面 (处处正交)", color: "var(--accent-purple)" },
      ]);
    }
  }

  render() {
    if (!this.canvas) return;
    const { ctx, w, h } = Sim.SimUtil.setupCanvas(this.canvas);
    GeoDraw.clear(ctx, w, h);
    const renderer = this[`_render_${this.mode.replaceAll("-", "_")}`];
    if (renderer) renderer.call(this, ctx, w, h);
  }

  _render_straight(ctx, w, h) {
    const base = Math.round(h * 0.52);
    GeoDraw.grid(ctx, 32, 42, w - 64, h - 90, 10, 6);
    // Optical axis / reference baseline
    GeoDraw.line(ctx, { x: 32, y: base }, { x: w - 32, y: base }, "rgba(255,255,255,0.22)", 1, [6, 5]);
    GeoDraw.label(ctx, "光轴 / 基准线", w - 38, base - 8, "#6b7a93", "right", 11);

    // Light source position: source.y translates strictly with this.params.source (height)
    const xS = 72;
    const sourceHeight = this.params.source || 0;
    const yS = base - sourceHeight;
    const source = { x: xS, y: yS };

    // If source is offset from optical axis, draw vertical height dimension indicator
    if (Math.abs(sourceHeight) >= 1) {
      GeoDraw.line(ctx, { x: xS, y: base }, { x: xS, y: yS }, "#fbbf24", 1.2, [3, 3]);
      const sign = sourceHeight > 0 ? "+" : "";
      GeoDraw.label(ctx, `y=${sign}${Math.round(sourceHeight)}mm`, xS - 8, (base + yS) / 2, "#fbbf24", "right", 11);
    }

    // Draw point source S
    ctx.fillStyle = "rgba(251, 191, 36, 0.22)";
    ctx.beginPath();
    ctx.arc(source.x, source.y, 10, 0, GeoDraw.TAU);
    ctx.fill();
    ctx.fillStyle = "#fbbf24";
    ctx.beginPath();
    ctx.arc(source.x, source.y, 5, 0, GeoDraw.TAU);
    ctx.fill();
    GeoDraw.label(ctx, "点光源 S", source.x, source.y - 14, "#fbbf24", "center", 12);

    // Beam divergence angle and straight rays
    const halfFanRad = (this.params.fan * Math.PI) / 360; // fan / 2 in radians
    const xEnd = w - 58;
    const deltaX = xEnd - source.x;

    for (let j = -3; j <= 3; j += 1) {
      const theta_j = (j / 3) * halfFanRad;
      const end = { x: xEnd, y: source.y + deltaX * Math.tan(theta_j) };
      const start = source;
      GeoDraw.arrow(ctx, start, end, j === 0 ? "#fbbf24" : "#4a9eff", 1.8);

      // Photons moving along the straight ray
      const u = ((this.params.t * (0.12 + 0.02 * this.params.n) + j * 0.13) % 1 + 1) % 1;
      const particle = { x: start.x + (end.x - start.x) * u, y: start.y + (end.y - start.y) * u };
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, 2.5, 0, GeoDraw.TAU);
      ctx.fill();
    }

    // Divergence angle arc at the source
    if (this.params.fan >= 6) {
      GeoDraw.angleArc(ctx, source, 38, -halfFanRad, halfFanRad, "#38bdf8", `2θ=${Math.round(this.params.fan)}°`);
    }

    GeoDraw.panel(ctx, 48, 55, 215, 68, ["直线传播定律", "各向同性介质中 dθ/ds = 0", `介质光速 v = c / ${this.params.n.toFixed(2)}`], "#4a9eff");
    GeoDraw.label(ctx, "点光源发出的光线在均匀介质中沿严格直线前进，互不干扰", w / 2, h - 30, "#a3b1c6", "center", 12);
  }

  _render_reflection(ctx, w, h) {
    const center = { x: w * 0.56, y: h * 0.60 };
    // Fixed incident ray: independent of mirror rotation
    const fixedNormal = { x: 0, y: -1 };
    const i0 = this.params.incidence * Math.PI / 180;
    const fromHit = GeoDraw.rotate(fixedNormal, -i0);
    const incoming = GeoDraw.mul(fromHit, -1);
    const source = GeoDraw.add(center, GeoDraw.mul(fromHit, 215));

    // Rotating mirror and normal
    const tangentAngle = this.params.mirror * Math.PI / 180;
    const tangent = { x: Math.cos(tangentAngle), y: Math.sin(tangentAngle) };
    const normal = { x: Math.sin(tangentAngle), y: -Math.cos(tangentAngle) };

    const dot = GeoDraw.dot(incoming, normal);
    const valid = dot < 0;
    const reflected = valid
      ? GeoDraw.add(incoming, GeoDraw.mul(normal, -2 * dot))
      : { x: 0, y: 0 };
    const end = GeoDraw.add(center, GeoDraw.mul(reflected, 240));

    // Reference reflected ray when mirror = 0
    const reflected0 = GeoDraw.add(incoming, GeoDraw.mul(fixedNormal, -2 * GeoDraw.dot(incoming, fixedNormal)));

    // Mirror surface line and back hatching
    GeoDraw.line(ctx, GeoDraw.add(center, GeoDraw.mul(tangent, -230)), GeoDraw.add(center, GeoDraw.mul(tangent, 230)), "#e6edf7", 5);
    for (let k = -220; k <= 220; k += 20) {
      const p1 = GeoDraw.add(center, GeoDraw.mul(tangent, k));
      const p2 = GeoDraw.add(p1, GeoDraw.add(GeoDraw.mul(tangent, -6), GeoDraw.mul(normal, -12)));
      GeoDraw.line(ctx, p1, p2, "#6b7a93", 1.2);
    }
    const normEnd = GeoDraw.add(center, GeoDraw.mul(normal, 110));
    GeoDraw.line(ctx, center, normEnd, "#fbbf24", 1.3, [5, 5]);
    GeoDraw.label(ctx, "法线", normEnd.x + normal.x * 12, normEnd.y + normal.y * 12, "#fbbf24", "center", 11);

    // Fixed incident ray (does not move when mirror rotates)
    GeoDraw.arrow(ctx, source, center, "#4a9eff", 2.5);

    // Reference reflected ray at theta=0 (dashed green line)
    if (Math.abs(this.params.mirror) > 0.1) {
      const end0 = GeoDraw.add(center, GeoDraw.mul(reflected0, 240));
      GeoDraw.line(ctx, center, end0, "rgba(74,222,128,0.45)", 1.3, [6, 5]);
      GeoDraw.label(ctx, "初始反射光(θ=0°)", end0.x + 8, end0.y - 12, "rgba(74,222,128,0.75)", "left", 11);
    }

    // Current reflected ray
    if (valid) {
      GeoDraw.arrow(ctx, center, end, "#4ade80", 2.5);
      const reflLabel = Math.abs(this.params.mirror) > 0.1 ? "当前反射光" : "反射光";
      GeoDraw.label(ctx, reflLabel, end.x + 8, end.y - 12, "#4ade80", "left", 11);
    }

    // Angle arcs for actual i, r, and relative rotation 2θ
    if (valid) {
      const aFrom = Math.atan2(fromHit.y, fromHit.x);
      const aNorm = Math.atan2(normal.y, normal.x);
      const aRefl = Math.atan2(reflected.y, reflected.x);
      const sweep = (aNorm - aFrom + GeoDraw.TAU) % GeoDraw.TAU;
      const isFromToNorm = sweep <= Math.PI;

      if (isFromToNorm) {
        GeoDraw.angleArc(ctx, center, 45, aFrom, aNorm, "#4a9eff", "i");
        GeoDraw.angleArc(ctx, center, 58, aNorm, aRefl, "#4ade80", "r");
      } else {
        GeoDraw.angleArc(ctx, center, 45, aNorm, aFrom, "#4a9eff", "i");
        GeoDraw.angleArc(ctx, center, 58, aRefl, aNorm, "#4ade80", "r");
      }

      // Angle arc between initial reflected ray (θ=0) and current reflected ray
      if (Math.abs(this.params.mirror) >= 0.5) {
        const aRefl0 = Math.atan2(reflected0.y, reflected0.x);
        const sweep0 = (aRefl - aRefl0 + GeoDraw.TAU) % GeoDraw.TAU;
        const isClockwise = sweep0 <= Math.PI;
        const arcStart = isClockwise ? aRefl0 : aRefl;
        const arcEnd = isClockwise ? aRefl : aRefl0;
        const deltaDeg = Math.abs(2 * this.params.mirror).toFixed(1);
        GeoDraw.angleArc(ctx, center, 86, arcStart, arcEnd, "#22d3ee", `2θ=${deltaDeg}°`);
      }
    }

    GeoDraw.label(ctx, "固定入射光", source.x - 8, source.y - 12, "#4a9eff", "right");
    GeoDraw.label(ctx, `镜面转角 θ=${this.params.mirror.toFixed(1)}°`, center.x, center.y + 24, "#fbbf24", "center");
    GeoDraw.panel(ctx, 45, 48, 205, 70, ["反射定律", "i = r", `反射光转角 2θ = ${(2 * this.params.mirror).toFixed(1)}°`], "#4ade80");
  }

  _render_refraction(ctx, w, h) {
    const interfaceY = h * 0.52;
    const hit = { x: w * 0.53, y: interfaceY };
    const normal = { x: 0, y: -1 };
    const i = this.params.incidence * Math.PI / 180;
    const fromHit = GeoDraw.rotate(normal, -i);
    const source = GeoDraw.add(hit, GeoDraw.mul(fromHit, 220));
    const reflected = GeoDraw.add(GeoDraw.mul(fromHit, -1), GeoDraw.mul(normal, -2 * GeoDraw.dot(GeoDraw.mul(fromHit, -1), normal)));
    const ratio = this.params.n1 * Math.sin(i) / this.params.n2;
    const tir = Math.abs(ratio) > 1;
    const r = tir ? i : Math.asin(ratio);
    const transmitted = { x: Math.sin(r), y: Math.cos(r) };
    GeoDraw.line(ctx, { x: 28, y: interfaceY }, { x: w - 28, y: interfaceY }, "#e6edf7", 2);
    GeoDraw.line(ctx, hit, { x: hit.x, y: hit.y - 120 }, "#fbbf24", 1.2, [5, 5]);
    GeoDraw.label(ctx, "法线", hit.x, hit.y - 132, "#fbbf24", "center", 11);
    GeoDraw.arrow(ctx, source, hit, "#4a9eff", 2.5);
    GeoDraw.arrow(ctx, hit, GeoDraw.add(hit, GeoDraw.mul(reflected, 180)), "#fb923c", 2);
    if (!tir) GeoDraw.arrow(ctx, hit, GeoDraw.add(hit, GeoDraw.mul(transmitted, 210)), "#4ade80", 2.5);
    GeoDraw.angleArc(ctx, hit, 43, Math.atan2(fromHit.y, fromHit.x), -Math.PI / 2, "#4a9eff", "i");
    if (!tir) GeoDraw.angleArc(ctx, hit, 47, Math.atan2(transmitted.y, transmitted.x), Math.PI / 2, "#4ade80", "r");
    GeoDraw.label(ctx, `n₁ = ${this.params.n1.toFixed(2)}`, 44, interfaceY - 38, "#4a9eff");
    GeoDraw.label(ctx, `n₂ = ${this.params.n2.toFixed(2)}`, 44, interfaceY + 38, "#4ade80");
    GeoDraw.panel(ctx, 45, 47, 205, 70, ["折射 / 全反射", "n₁ sin i = n₂ sin r", tir ? "i ≥ i_c：只剩反射光" : "透射光与反射光同时存在"], tir ? "#f87171" : "#22d3ee");
    if (tir) GeoDraw.label(ctx, "全反射", w * 0.68, h * 0.32, "#f87171", "center", 16);
  }

  _fermatGeometry(w, h) {
    const mirrorY = h * 0.42;
    const A = { x: 72, y: mirrorY - h * 0.20 };
    const B = { x: w - 72, y: mirrorY - h * (0.20 - this.params.sourceOffset * 0.45) };
    const xmin = 48; const xmax = w - 48;
    const path = (u) => {
      const x = xmin + (xmax - xmin) * u;
      return Math.hypot(x - A.x, mirrorY - A.y) + Math.hypot(B.x - x, mirrorY - B.y);
    };
    let bestU = 0.5; let best = Infinity;
    for (let i = 0; i <= 600; i += 1) { const u = i / 600; const value = path(u); if (value < best) { best = value; bestU = u; } }
    return { mirrorY, A, B, xmin, xmax, path, best, bestU };
  }

  _render_fermat(ctx, w, h) {
    const g = this._fermatGeometry(w, h);
    const hit = { x: g.xmin + (g.xmax - g.xmin) * this.params.hit, y: g.mirrorY };
    GeoDraw.line(ctx, { x: 35, y: g.mirrorY }, { x: w - 35, y: g.mirrorY }, "#e6edf7", 3);
    GeoDraw.arrow(ctx, g.A, hit, "#4a9eff", 2.4);
    GeoDraw.arrow(ctx, hit, g.B, "#4ade80", 2.4);
    GeoDraw.line(ctx, { x: hit.x, y: hit.y }, { x: hit.x, y: hit.y - 80 }, "#fbbf24", 1, [5, 5]);
    GeoDraw.label(ctx, "A", g.A.x - 12, g.A.y, "#4a9eff", "right");
    GeoDraw.label(ctx, "B", g.B.x + 12, g.B.y, "#4ade80", "left");
    GeoDraw.label(ctx, "可变反射点", hit.x, hit.y + 18, "#fbbf24", "center");
    const rect = { x: 55, y: h * 0.58, width: w - 110, height: h * 0.28 };
    const vals = Array.from({ length: 300 }, (_, i) => g.path(i / 299));
    const min = Math.min(...vals); const max = Math.max(...vals); const pad = Math.max(1, (max - min) * 0.08);
    const tr = GeoDraw.axes(ctx, rect, 0, 1, min - pad, max + pad, "反射点位置 x", "光程 L");
    GeoDraw.curve(ctx, rect, 0, 1, g.path, tr.yToPx, "#a78bfa", 2.3);
    const px = tr.xToPx(this.params.hit); const py = tr.yToPx(g.path(this.params.hit));
    ctx.fillStyle = "#fbbf24"; ctx.beginPath(); ctx.arc(px, py, 5, 0, GeoDraw.TAU); ctx.fill();
    GeoDraw.line(ctx, { x: tr.xToPx(g.bestU), y: rect.y }, { x: tr.xToPx(g.bestU), y: rect.y + rect.height }, "#4ade80", 1, [4, 4]);
    GeoDraw.panel(ctx, 48, 50, 215, 68, ["费马原理", "光程取极值（此处为最小）", `理论最优点 x=${g.bestU.toFixed(3)}`], "#a78bfa");
  }

  _render_malus(ctx, w, h) {
    if (this.params.waveType === "sphere") {
      this._render_malus_sphere(ctx, w, h);
      return;
    }

    const p = this.params; const i = p.incidence * Math.PI / 180;
    const s = p.n1 * Math.sin(i) / p.n2; const tir = Math.abs(s) > 1;
    const r = tir ? i : Math.asin(s); const cx = w * 0.50; const cy = h * 0.48;
    const d1 = { x: Math.cos(i), y: Math.sin(i) };
    const d2 = tir ? { x: -Math.cos(i), y: Math.sin(i) } : { x: Math.cos(r), y: Math.sin(r) };
    const wavefront = (center, direction, length, color, dash = null) => {
      const tangent = { x: -direction.y, y: direction.x };
      GeoDraw.line(ctx, GeoDraw.add(center, GeoDraw.mul(tangent, -length / 2)), GeoDraw.add(center, GeoDraw.mul(tangent, length / 2)), color, 1.6, dash);
      GeoDraw.rightAngle(ctx, center, GeoDraw.mul(direction, -1), tangent, 7, color);
    };
    ctx.fillStyle = "rgba(74,158,255,0.045)"; ctx.fillRect(0, 0, cx, h);
    ctx.fillStyle = tir ? "rgba(251,146,60,0.025)" : "rgba(74,222,128,0.035)"; ctx.fillRect(cx, 0, w - cx, h);
    GeoDraw.line(ctx, { x: cx, y: 35 }, { x: cx, y: h - 35 }, "#e6edf7", 3);
    GeoDraw.line(ctx, { x: cx - 75, y: cy }, { x: cx + 75, y: cy }, "#fbbf24", 1, [5, 5]);
    [-54, 0, 54].forEach((offset) => {
      const hit = { x: cx, y: cy + offset };
      GeoDraw.arrow(ctx, GeoDraw.add(hit, GeoDraw.mul(d1, -230)), hit, "#4a9eff", 2);
      GeoDraw.arrow(ctx, hit, GeoDraw.add(hit, GeoDraw.mul(d2, 230)), tir ? "#fb923c" : "#4ade80", 2);
    });
    [-170, -105].forEach((distance) => wavefront(GeoDraw.add({ x: cx, y: cy }, GeoDraw.mul(d1, distance)), d1, 150, "#60a5fa"));
    [85, 155].forEach((distance) => wavefront(GeoDraw.add({ x: cx, y: cy }, GeoDraw.mul(d2, distance)), d2, 150, tir ? "#fb923c" : "#4ade80"));
    GeoDraw.angleArc(ctx, { x: cx, y: cy }, 42, Math.PI, Math.PI + i, "#4a9eff", `i=${p.incidence.toFixed(0)}°`);
    GeoDraw.label(ctx, `n₁=${p.n1.toFixed(2)}`, cx - 95, 58, "#60a5fa", "center", 13);
    GeoDraw.label(ctx, `n₂=${p.n2.toFixed(2)}`, cx + 95, 58, tir ? "#fb923c" : "#4ade80", "center", 13);
    GeoDraw.panel(ctx, 42, h - 105, 285, 68, ["马吕斯–杜潘定理 (平面波)", tir ? "全反射后：光线仍 ⟂ 反射波面" : "折射后：光线仍 ⟂ 折射波面", "本章不是 I = I₀ cos²θ"], tir ? "#fb923c" : "#4ade80");
  }

  _render_malus_sphere(ctx, w, h) {
    const p = this.params;
    const cx = Math.round(w * 0.42);
    const cy = Math.round(h * 0.50);
    const dS = Math.max(60, Math.min(cx - 35, p.sourceDist || 150));
    const S = { x: cx - dS, y: cy };
    const maxAlphaRad = Math.max(8, Math.min(42, p.fanAngle || 28)) * Math.PI / 180;
    const n1 = Math.max(1.0, p.n1);
    const n2 = Math.max(1.0, p.n2);

    // 1. Medium background shading
    ctx.fillStyle = "rgba(74, 158, 255, 0.05)";
    ctx.fillRect(0, 0, cx, h);
    ctx.fillStyle = "rgba(74, 222, 128, 0.04)";
    ctx.fillRect(cx, 0, w - cx, h);

    // 2. Optical axis & Interface
    GeoDraw.line(ctx, { x: 25, y: cy }, { x: w - 25, y: cy }, "rgba(255,255,255,0.14)", 1, [5, 5]);
    GeoDraw.line(ctx, { x: cx, y: 28 }, { x: cx, y: h - 28 }, "#e6edf7", 2.5);
    GeoDraw.label(ctx, "介质分界面", cx, 18, "#e2e8f0", "center", 12);
    GeoDraw.label(ctx, `介质 1 (n₁ = ${n1.toFixed(2)})`, cx - 85, 46, "#60a5fa", "center", 13);
    GeoDraw.label(ctx, `介质 2 (n₂ = ${n2.toFixed(2)})`, cx + 85, 46, "#4ade80", "center", 13);

    // 3. Ray calculations
    const rayCount = 9;
    const rays = [];
    for (let i = 0; i < rayCount; i++) {
      const frac = rayCount > 1 ? (i / (rayCount - 1)) * 2 - 1 : 0;
      const theta = frac * maxAlphaRad;
      const u = { x: Math.cos(theta), y: Math.sin(theta) };
      const yHit = cy + dS * Math.tan(theta);
      const hit = { x: cx, y: yHit };
      const s1 = dS / Math.cos(theta);
      const opl1 = n1 * s1;

      const sinI = Math.sin(theta);
      const sinR = (n1 / n2) * sinI;
      const isTIR = Math.abs(sinR) > 1.0;

      let v;
      let r = 0;
      if (!isTIR) {
        r = Math.asin(Math.max(-1, Math.min(1, sinR)));
        v = { x: Math.cos(r), y: Math.sin(r) };
      } else {
        v = { x: -Math.cos(theta), y: Math.sin(theta) };
      }

      rays.push({
        index: i,
        theta,
        u,
        hit,
        s1,
        opl1,
        isTIR,
        r,
        v,
        isCentral: i === Math.floor(rayCount / 2),
      });
    }

    // 4. Draw Incident Rays (Blue)
    rays.forEach((ray) => {
      GeoDraw.arrow(ctx, S, ray.hit, "#4a9eff", 1.8);
    });

    // 5. Draw Transmitted / Reflected Rays
    rays.forEach((ray) => {
      if (!ray.isTIR) {
        const rayLen = (w - cx - 15) / Math.max(0.2, ray.v.x);
        const endPt = GeoDraw.add(ray.hit, GeoDraw.mul(ray.v, Math.min(rayLen, 380)));
        GeoDraw.arrow(ctx, ray.hit, endPt, "#4ade80", 1.8);
      } else {
        const reflLen = (cx - 20) / Math.max(0.2, -ray.v.x);
        const endPt = GeoDraw.add(ray.hit, GeoDraw.mul(ray.v, Math.min(reflLen, 200)));
        GeoDraw.arrow(ctx, ray.hit, endPt, "#fb923c", 1.8);
      }
    });

    // 6. Draw Spherical Wavefronts in Medium 1 (Concentric circular arcs from S)
    const baseOPLStep = 55;
    const animOffset = p.play ? (((p.t * 35) % baseOPLStep + baseOPLStep) % baseOPLStep) : (baseOPLStep * 0.4);
    const numWavefronts = 7;

    ctx.save();
    ctx.strokeStyle = "rgba(96, 165, 250, 0.75)";
    ctx.lineWidth = 1.6;

    for (let k = 1; k <= numWavefronts; k++) {
      const opl = k * baseOPLStep + animOffset;
      const r1 = opl / n1;
      if (r1 <= 12) continue;

      const maxAngleForR1 = r1 > dS ? Math.acos(dS / r1) : Math.PI;
      const arcHalf = Math.min(maxAlphaRad + 0.06, maxAngleForR1);
      if (arcHalf > 0.03) {
        ctx.beginPath();
        ctx.arc(S.x, S.y, r1, -arcHalf, arcHalf);
        ctx.stroke();

        // Right-angle marker on an angled ray for the 2nd wavefront
        if (k === 2 && r1 < dS * 0.9) {
          const testRay = rays[2];
          const pt = GeoDraw.add(S, GeoDraw.mul(testRay.u, r1));
          const dirU = testRay.u;
          const dirT = { x: -dirU.y, y: dirU.x };
          GeoDraw.rightAngle(ctx, pt, GeoDraw.mul(dirU, -1), dirT, 7, "#60a5fa");
        }
      }
    }
    ctx.restore();
    GeoDraw.label(ctx, "入射球面波面 Σ₁", S.x + dS * 0.45, cy - dS * Math.tan(maxAlphaRad) * 0.60 - 18, "#60a5fa", "center", 11);

    // 7. Draw Transmitted Wavefronts in Medium 2 (Iso-OPL Wavefronts Σ₂)
    // OPL = n1 * s1 + n2 * s2 = const
    const fineSamples = 60;
    for (let k = 1; k <= numWavefronts; k++) {
      const oplTarget = k * baseOPLStep + animOffset;
      const ptsTrans = [];
      const ptsTir = [];

      for (let s = 0; s <= fineSamples; s++) {
        const frac = (s / fineSamples) * 2 - 1;
        const theta = frac * maxAlphaRad;
        const s1 = dS / Math.cos(theta);
        const opl1 = n1 * s1;
        if (oplTarget < opl1) continue;

        const remainingOPL = oplTarget - opl1;
        const sinI = Math.sin(theta);
        const sinR = (n1 / n2) * sinI;

        if (Math.abs(sinR) <= 1.0) {
          const s2 = remainingOPL / n2;
          const r = Math.asin(sinR);
          const v = { x: Math.cos(r), y: Math.sin(r) };
          const hit = { x: cx, y: cy + dS * Math.tan(theta) };
          const Q = GeoDraw.add(hit, GeoDraw.mul(v, s2));
          if (Q.x <= w - 10 && Q.y >= 20 && Q.y <= h - 20) {
            ptsTrans.push(Q);
          }
        } else {
          const s2 = remainingOPL / n1;
          const v = { x: -Math.cos(theta), y: Math.sin(theta) };
          const hit = { x: cx, y: cy + dS * Math.tan(theta) };
          const Q = GeoDraw.add(hit, GeoDraw.mul(v, s2));
          if (Q.x >= 20 && Q.y >= 20 && Q.y <= h - 20) {
            ptsTir.push(Q);
          }
        }
      }

      // Draw transmitted wavefront curve
      if (ptsTrans.length > 1) {
        ctx.save();
        ctx.strokeStyle = "rgba(74, 222, 128, 0.85)";
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(ptsTrans[0].x, ptsTrans[0].y);
        for (let j = 1; j < ptsTrans.length; j++) {
          ctx.lineTo(ptsTrans[j].x, ptsTrans[j].y);
        }
        ctx.stroke();
        ctx.restore();

        // On prominent wavefront (e.g. k=4), draw right-angle markers at ray intersections
        if (k === 4 && ptsTrans.length > 8) {
          [rays[2], rays[Math.floor(rayCount / 2)]].forEach((pRay) => {
            if (!pRay.isTIR && oplTarget > pRay.opl1) {
              const s2 = (oplTarget - pRay.opl1) / n2;
              const Q = GeoDraw.add(pRay.hit, GeoDraw.mul(pRay.v, s2));
              if (Q.x < w - 40 && Q.y > 30 && Q.y < h - 30) {
                const tDir = { x: -pRay.v.y, y: pRay.v.x };
                GeoDraw.rightAngle(ctx, Q, GeoDraw.mul(pRay.v, -1), tDir, 8, "#fbbf24");
                const tangA = GeoDraw.add(Q, GeoDraw.mul(tDir, -16));
                const tangB = GeoDraw.add(Q, GeoDraw.mul(tDir, 16));
                GeoDraw.line(ctx, tangA, tangB, "rgba(251, 191, 36, 0.6)", 1, [3, 3]);

                if (pRay.index === 2) {
                  GeoDraw.label(ctx, "90° (处处正交)", Q.x + 10, Q.y - 12, "#fbbf24", "left", 11);
                }
              }
            }
          });
        }
      }

      // Draw TIR reflected wavefront curve if any
      if (ptsTir.length > 1) {
        ctx.save();
        ctx.strokeStyle = "rgba(251, 146, 60, 0.85)";
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(ptsTir[0].x, ptsTir[0].y);
        for (let j = 1; j < ptsTir.length; j++) {
          ctx.lineTo(ptsTir[j].x, ptsTir[j].y);
        }
        ctx.stroke();
        ctx.restore();
      }
    }

    // Label for Transmitted Wavefront
    GeoDraw.label(ctx, "折射等光程波面 Σ₂", cx + 110, cy - 135, "#4ade80", "center", 12);
    GeoDraw.label(ctx, "OPL = n₁s₁ + n₂s₂ = 常数", cx + 110, cy - 117, "rgba(74, 222, 128, 0.75)", "center", 11);

    // 8. Draw Point Source S
    ctx.fillStyle = "rgba(251, 191, 36, 0.25)";
    ctx.beginPath();
    ctx.arc(S.x, S.y, 9, 0, GeoDraw.TAU);
    ctx.fill();
    ctx.fillStyle = "#fbbf24";
    ctx.beginPath();
    ctx.arc(S.x, S.y, 5, 0, GeoDraw.TAU);
    ctx.fill();
    GeoDraw.label(ctx, "点光源 S", S.x, S.y - 14, "#fbbf24", "center", 12);

    // 9. Info Panel
    GeoDraw.panel(
      ctx,
      35,
      h - 96,
      335,
      68,
      [
        "马吕斯–杜潘定理 (球面波)",
        "• 点光源发射同心球面波面 Σ₁（光线天然正交）",
        "• 折射后各光线仍与出射等光程波面 Σ₂ 严格正交",
        "• 等光程面方程：OPL = n₁s₁ + n₂s₂ = 常数",
      ],
      "#4ade80"
    );
  }

  _render_plane_mirror_rotation(ctx, w, h) {
    const p = this.params;
    const thetaDeg = p.rotation || 0;
    const thetaRad = (thetaDeg * Math.PI) / 180;
    const pivot = { x: w * 0.54, y: h * 0.50 };

    // Initial normal (pointing left towards object space)
    const normal0 = { x: -1, y: 0 };
    // Current normal rotated clockwise by thetaRad:
    const normal = { x: -Math.cos(thetaRad), y: -Math.sin(thetaRad) };
    // Mirror tangent perpendicular to normal (pointing downwards):
    const tangent = { x: -Math.sin(thetaRad), y: Math.cos(thetaRad) };

    // Draw initial mirror reference at theta = 0 (dashed)
    GeoDraw.line(ctx, { x: pivot.x, y: pivot.y - 190 }, { x: pivot.x, y: pivot.y + 190 }, "rgba(148,163,184,0.30)", 1.5, [5, 5]);
    GeoDraw.line(ctx, pivot, { x: pivot.x - 120, y: pivot.y }, "rgba(148,163,184,0.30)", 1.2, [4, 4]);

    // Draw current mirror
    const mTop = GeoDraw.add(pivot, GeoDraw.mul(tangent, -190));
    const mBottom = GeoDraw.add(pivot, GeoDraw.mul(tangent, 190));
    GeoDraw.line(ctx, mTop, mBottom, "#e2e8f0", 5);

    // Hatch marks on back of mirror (opposite to normal)
    for (let k = -180; k <= 180; k += 18) {
      const p1 = GeoDraw.add(pivot, GeoDraw.mul(tangent, k));
      const p2 = GeoDraw.add(p1, GeoDraw.add(GeoDraw.mul(tangent, -6), GeoDraw.mul(normal, -12)));
      GeoDraw.line(ctx, p1, p2, "#64748b", 1.2);
    }

    // Pivot O
    ctx.fillStyle = "#38bdf8";
    ctx.beginPath();
    ctx.arc(pivot.x, pivot.y, 4.5, 0, GeoDraw.TAU);
    ctx.fill();
    GeoDraw.label(ctx, "O (转轴)", pivot.x + 12, pivot.y + 16, "#38bdf8", "left", 11);

    // Current normal
    const normEnd = GeoDraw.add(pivot, GeoDraw.mul(normal, 110));
    GeoDraw.line(ctx, pivot, normEnd, "#fbbf24", 1.5, [5, 4]);
    GeoDraw.label(ctx, "法线 N₁", normEnd.x + normal.x * 12, normEnd.y + normal.y * 12, "#fbbf24", "center", 11);

    // Mirror angle theta arc
    if (Math.abs(thetaDeg) >= 0.3) {
      const aNorm0 = Math.PI;
      const aNorm = Math.atan2(normal.y, normal.x);
      const sweep = (aNorm - aNorm0 + GeoDraw.TAU) % GeoDraw.TAU;
      const isCw = sweep <= Math.PI;
      const arcStart = isCw ? aNorm0 : aNorm;
      const arcEnd = isCw ? aNorm : aNorm0;
      GeoDraw.angleArc(ctx, pivot, 75, arcStart, arcEnd, "#fbbf24", `θ=${Math.abs(thetaDeg).toFixed(1)}°`);

      // Top mirror tilt arc
      const aTop0 = -Math.PI / 2;
      const aTop = Math.atan2(tangent.y * -1, tangent.x * -1);
      const sweepTop = (aTop - aTop0 + GeoDraw.TAU) % GeoDraw.TAU;
      const isCwTop = sweepTop <= Math.PI;
      GeoDraw.angleArc(ctx, pivot, 140, isCwTop ? aTop0 : aTop, isCwTop ? aTop : aTop0, "#38bdf8", `θ`);
    }

    // Object points A (base) and B (tip)
    const A = { x: pivot.x - 170, y: pivot.y + 60 };
    const B = { x: pivot.x - 170, y: pivot.y - 60 };

    // Function to calculate exact mirror reflection and foot of perpendicular
    function reflectAcrossMirror(P) {
      const v = { x: P.x - pivot.x, y: P.y - pivot.y };
      const d = v.x * normal.x + v.y * normal.y; // distance along normal
      const M = { x: P.x - d * normal.x, y: P.y - d * normal.y }; // foot on mirror
      const P_prime = { x: P.x - 2 * d * normal.x, y: P.y - 2 * d * normal.y }; // reflected point
      return { P_prime, M, d: Math.abs(d) };
    }

    const refA = reflectAcrossMirror(A);
    const refB = reflectAcrossMirror(B);
    const A_prime = refA.P_prime;
    const B_prime = refB.P_prime;
    const M_A = refA.M;
    const M_B = refB.M;

    // 1. Perpendicular connecting lines AA' and BB' (strictly perpendicular to mirror)
    GeoDraw.line(ctx, A, A_prime, "rgba(148,163,184,0.70)", 1.2, [4, 4]);
    GeoDraw.line(ctx, B, B_prime, "rgba(148,163,184,0.70)", 1.2, [4, 4]);

    // Right angle symbols at foot of perpendiculars
    GeoDraw.rightAngle(ctx, M_A, tangent, normal, 9, "#38bdf8");
    GeoDraw.rightAngle(ctx, M_B, tangent, normal, 9, "#38bdf8");

    // Equal distance indicators
    const midAM = { x: (A.x + M_A.x) / 2, y: (A.y + M_A.y) / 2 };
    const midMA = { x: (M_A.x + A_prime.x) / 2, y: (M_A.y + A_prime.y) / 2 };
    const midBM = { x: (B.x + M_B.x) / 2, y: (B.y + M_B.y) / 2 };
    const midMB = { x: (M_B.x + B_prime.x) / 2, y: (M_B.y + B_prime.y) / 2 };

    function drawTick(center, normDir, length, count) {
      const spacing = 4;
      const perp = { x: -normDir.y, y: normDir.x };
      for (let i = 0; i < count; i++) {
        const offset = (i - (count - 1) / 2) * spacing;
        const p0 = { x: center.x + normDir.x * offset, y: center.y + normDir.y * offset };
        GeoDraw.line(ctx,
          { x: p0.x - perp.x * length / 2, y: p0.y - perp.y * length / 2 },
          { x: p0.x + perp.x * length / 2, y: p0.y + perp.y * length / 2 },
          "#38bdf8", 1.5
        );
      }
    }
    drawTick(midAM, normal, 10, 1);
    drawTick(midMA, normal, 10, 1);
    drawTick(midBM, normal, 10, 2);
    drawTick(midMB, normal, 10, 2);

    // Distance labels
    GeoDraw.label(ctx, `d_A=${refA.d.toFixed(0)}`, midAM.x, midAM.y + 14, "#38bdf8", "center", 10);
    GeoDraw.label(ctx, `d_A′=${refA.d.toFixed(0)}`, midMA.x, midMA.y + 14, "#38bdf8", "center", 10);
    GeoDraw.label(ctx, `d_B=${refB.d.toFixed(0)}`, midBM.x, midBM.y - 12, "#38bdf8", "center", 10);
    GeoDraw.label(ctx, `d_B′=${refB.d.toFixed(0)}`, midMB.x, midMB.y - 12, "#38bdf8", "center", 10);

    // 2. Ray tracing:
    // Ray 1: from object tip B to mirror pivot O
    const vBO = { x: pivot.x - B.x, y: pivot.y - B.y };
    const lenBO = Math.hypot(vBO.x, vBO.y);
    const uIn = { x: vBO.x / lenBO, y: vBO.y / lenBO };
    const inDotN = uIn.x * normal.x + uIn.y * normal.y;
    const uRefl = { x: uIn.x - 2 * inDotN * normal.x, y: uIn.y - 2 * inDotN * normal.y };

    // Incident ray (blue)
    GeoDraw.arrow(ctx, B, pivot, "#4a9eff", 2.2);

    // Reflected ray (green)
    const reflEnd = GeoDraw.add(pivot, GeoDraw.mul(uRefl, 230));
    GeoDraw.arrow(ctx, pivot, reflEnd, "#4ade80", 2.4);

    // Virtual extension backward from O to B' (purple dashed)
    GeoDraw.line(ctx, pivot, B_prime, "#c084fc", 1.4, [5, 4]);

    // Reflected ray at theta = 0 for comparison
    const inDotN0 = uIn.x * normal0.x + uIn.y * normal0.y;
    const uRefl0 = { x: uIn.x - 2 * inDotN0 * normal0.x, y: uIn.y - 2 * inDotN0 * normal0.y };
    GeoDraw.line(ctx, pivot, GeoDraw.add(pivot, GeoDraw.mul(uRefl0, 210)), "rgba(74,222,128,0.30)", 1.2, [5, 5]);

    // Reflected ray angle 2*theta arc
    if (Math.abs(thetaDeg) >= 0.3) {
      const aRefl0 = Math.atan2(uRefl0.y, uRefl0.x);
      const aRefl = Math.atan2(uRefl.y, uRefl.x);
      const sweepRefl = (aRefl - aRefl0 + GeoDraw.TAU) % GeoDraw.TAU;
      const isCwRefl = sweepRefl <= Math.PI;
      const arcStartR = isCwRefl ? aRefl0 : aRefl;
      const arcEndR = isCwRefl ? aRefl : aRefl0;
      const deltaDeg = (2 * Math.abs(thetaDeg)).toFixed(1);
      GeoDraw.angleArc(ctx, pivot, 95, arcStartR, arcEndR, "#22d3ee", `2θ=${deltaDeg}°`);
    }

    // 3. Draw Object Arrow AB (gold solid)
    GeoDraw.arrow(ctx, A, B, "#fbbf24", 3.2);
    ctx.fillStyle = "#fbbf24";
    ctx.beginPath();
    ctx.arc(A.x, A.y, 4, 0, GeoDraw.TAU);
    ctx.fill();
    GeoDraw.label(ctx, "A (物底)", A.x - 10, A.y + 14, "#fbbf24", "right", 12);
    GeoDraw.label(ctx, "B (物顶)", B.x - 10, B.y - 10, "#fbbf24", "right", 12);
    GeoDraw.label(ctx, "实物 AB", (A.x + B.x) / 2 - 14, (A.y + B.y) / 2, "#fbbf24", "right", 13);

    // 4. Draw Image Arrow A'B' (purple dashed, strictly rotated by 2*theta)
    ctx.save();
    ctx.strokeStyle = "#c084fc";
    ctx.lineWidth = 3.2;
    ctx.setLineDash([7, 4]);
    ctx.beginPath();
    ctx.moveTo(A_prime.x, A_prime.y);
    ctx.lineTo(B_prime.x, B_prime.y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    // Arrowhead at B'
    const imgDir = { x: B_prime.x - A_prime.x, y: B_prime.y - A_prime.y };
    const imgLen = Math.hypot(imgDir.x, imgDir.y);
    if (imgLen > 1e-4) {
      const uImg = { x: imgDir.x / imgLen, y: imgDir.y / imgLen };
      const perpImg = { x: -uImg.y, y: uImg.x };
      const headLen = 12, headWidth = 6;
      ctx.fillStyle = "#c084fc";
      ctx.beginPath();
      ctx.moveTo(B_prime.x, B_prime.y);
      ctx.lineTo(B_prime.x - uImg.x * headLen + perpImg.x * headWidth, B_prime.y - uImg.y * headLen + perpImg.y * headWidth);
      ctx.lineTo(B_prime.x - uImg.x * headLen - perpImg.x * headWidth, B_prime.y - uImg.y * headLen - perpImg.y * headWidth);
      ctx.closePath();
      ctx.fill();
    }
    // Base circle at A'
    ctx.strokeStyle = "#c084fc";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(A_prime.x, A_prime.y, 4, 0, GeoDraw.TAU);
    ctx.stroke();

    GeoDraw.label(ctx, "A′ (像底)", A_prime.x + 10, A_prime.y + 14, "#c084fc", "left", 12);
    GeoDraw.label(ctx, "B′ (像顶)", B_prime.x + 10, B_prime.y - 10, "#c084fc", "left", 12);
    GeoDraw.label(ctx, "虚像 A′B′", (A_prime.x + B_prime.x) / 2 + 14, (A_prime.y + B_prime.y) / 2, "#c084fc", "left", 13);

    // 5. Panel
    GeoDraw.panel(
      ctx, 35, 38, 275, 88,
      [
        "平面镜转动与成像性质 (图3-1)",
        `• 镜面转角 θ = ${thetaDeg.toFixed(1)}° → 反射光偏转 2θ = ${(2 * thetaDeg).toFixed(1)}°`,
        "• 严格镜像对称：AA′ ⟂ 镜面，BB′ ⟂ 镜面",
        "• 等距性：d_A = d_A′，d_B = d_B′",
        "• 虚像与物等大，随镜面转动 2θ"
      ],
      "#c084fc"
    );
  }

  _render_mirror_measurement(ctx, w, h) {
    const p = this.params;
    const thetaPhys = p.displacement / p.arm; // rad
    const thetaPhysDeg = thetaPhys * 180 / Math.PI;
    const thetaPhysMrad = thetaPhys * 1000;
    const shiftPhys = 2 * p.focal * thetaPhys; // mm (FF1 = 2f' * theta)

    const axisY = h * 0.50;
    const focalX = w * 0.18;
    const lensX = w * 0.52;
    const fScreen = lensX - focalX;
    // d_LM must be less than fScreen so that the reflected ray, rising from the mirror,
    // continues rising all the way to F1 on the focal plane (matching Fig 3-2 and physics).
    const mirrorX = lensX + fScreen * 0.56;

    const visualScale = 2.2;
    const displayShift = Math.max(-95, Math.min(95, shiftPhys * visualScale));

    // Reflected beam angle on screen to converge exactly at F1:
    // In canvas, y grows downward. If p.displacement > 0, probe pushes bottom left,
    // mirror normal tilts UP-LEFT, beam reflects UP-LEFT, and F1 moves UPWARD (axisY - displayShift).
    const alphaDraw = Math.atan2(displayShift, fScreen); // angle 2*theta
    const thetaDraw = alphaDraw / 2; // mirror tilt theta

    // Optical Axis
    GeoDraw.line(ctx, { x: 25, y: axisY }, { x: w - 25, y: axisY }, "rgba(255,255,255,0.25)", 1, [6, 5]);

    // Collimating Objective Lens L - Increased height (300px) so beam easily fits
    const lensHeight = Math.min(300, h * 0.72);
    GeoDraw.drawLens(ctx, lensX, axisY, lensHeight, "convex", "#22d3ee");
    GeoDraw.label(ctx, "准直物镜 L", lensX, axisY - lensHeight / 2 - 14, "#22d3ee", "center", 12);
    GeoDraw.label(ctx, `f′=${p.focal.toFixed(0)} mm`, lensX, axisY + lensHeight / 2 + 16, "#94a3b8", "center", 11);

    // Focal Plane Reticle
    const reticleH = lensHeight / 2 + 18;
    GeoDraw.line(ctx, { x: focalX, y: axisY - reticleH }, { x: focalX, y: axisY + reticleH }, "#a78bfa", 2);
    for (let sy = -120; sy <= 120; sy += 10) {
      if (Math.abs(sy) > reticleH) continue;
      const tickLen = sy % 50 === 0 ? 8 : (sy % 20 === 0 ? 5 : 3);
      GeoDraw.line(ctx, { x: focalX - tickLen, y: axisY + sy }, { x: focalX, y: axisY + sy }, "#a78bfa", 1);
    }
    GeoDraw.label(ctx, "焦平面分划板", focalX - 10, axisY - reticleH - 6, "#a78bfa", "right", 12);

    // Mirror geometry (Textbook Fig 3-2: bottom is pushed left by probe, top tilts right)
    const mLen = 110;
    const mTop = { x: mirrorX + mLen * Math.sin(thetaDraw), y: axisY - mLen * Math.cos(thetaDraw) };
    const mBottom = { x: mirrorX - mLen * Math.sin(thetaDraw), y: axisY + mLen * Math.cos(thetaDraw) };

    // Draw vertical reference line at mirror pivot (dashed)
    GeoDraw.line(ctx, { x: mirrorX, y: axisY - 120 }, { x: mirrorX, y: axisY + 120 }, "rgba(148,163,184,0.35)", 1.2, [4, 4]);

    // Draw Mirror surface
    GeoDraw.line(ctx, mTop, mBottom, "#fbbf24", 5);

    // Mirror back hatch (facing right-down)
    const mTan = { x: -Math.sin(thetaDraw), y: Math.cos(thetaDraw) };
    const mNorm = { x: Math.cos(thetaDraw), y: Math.sin(thetaDraw) };
    for (let k = -mLen + 10; k <= mLen - 10; k += 16) {
      const p1 = { x: mirrorX + mTan.x * k, y: axisY + mTan.y * k };
      const p2 = { x: p1.x + mNorm.x * 10 - mTan.x * 4, y: p1.y + mNorm.y * 10 - mTan.y * 4 };
      GeoDraw.line(ctx, p1, p2, "#64748b", 1.2);
    }

    // Mirror Pivot O
    ctx.fillStyle = "#38bdf8";
    ctx.beginPath();
    ctx.arc(mirrorX, axisY, 5, 0, GeoDraw.TAU);
    ctx.fill();
    GeoDraw.label(ctx, "O (支点)", mirrorX + 12, axisY - 12, "#38bdf8", "left", 11);

    // Plane mirror rotation angle theta annotation:
    if (Math.abs(thetaDraw) >= 0.003) {
      const aVertTop = -Math.PI / 2;
      const aMirrorTop = Math.atan2(mTop.y - axisY, mTop.x - mirrorX);
      const isCw = thetaDraw > 0;
      const arcStart = isCw ? aVertTop : aMirrorTop;
      const arcEnd = isCw ? aMirrorTop : aVertTop;
      GeoDraw.angleArc(ctx, { x: mirrorX, y: axisY }, 80, arcStart, arcEnd, "#fbbf24", `θ=${thetaPhysDeg.toFixed(2)}°`);
    } else {
      GeoDraw.label(ctx, `θ=0.00°`, mirrorX + 25, axisY - 70, "#fbbf24", "left", 11);
    }

    // Lever arm and probe displacement (Textbook Fig 3-2: probe at distance a below axis pushes left)
    const armScreenLen = 135;
    const probeY = axisY + armScreenLen;
    const probeX = mirrorX - armScreenLen * Math.tan(thetaDraw);
    GeoDraw.line(ctx, { x: mirrorX, y: axisY }, { x: probeX, y: probeY }, "#94a3b8", 3);

    // Dimension line for arm length a
    GeoDraw.line(ctx, { x: mirrorX + 45, y: axisY }, { x: mirrorX + 45, y: probeY }, "#38bdf8", 1.2);
    GeoDraw.arrow(ctx, { x: mirrorX + 45, y: axisY + 20 }, { x: mirrorX + 45, y: axisY }, "#38bdf8", 1.2);
    GeoDraw.arrow(ctx, { x: mirrorX + 45, y: probeY - 20 }, { x: mirrorX + 45, y: probeY }, "#38bdf8", 1.2);
    GeoDraw.label(ctx, `支点距 a=${p.arm.toFixed(1)} mm`, mirrorX + 52, (axisY + probeY) / 2, "#38bdf8", "left", 11);

    // Probe plunger and displacement x (Fig 3-2)
    GeoDraw.line(ctx, { x: mirrorX, y: probeY - 12 }, { x: mirrorX, y: probeY + 12 }, "rgba(148,163,184,0.40)", 1, [3, 3]);
    ctx.fillStyle = "#fbbf24";
    ctx.fillRect(probeX - 4, probeY - 5, 8, 10);
    GeoDraw.line(ctx, { x: probeX, y: probeY }, { x: probeX + 40, y: probeY }, "#fbbf24", 2);
    if (Math.abs(p.displacement) >= 0.001) {
      GeoDraw.arrow(ctx, { x: mirrorX, y: probeY + 16 }, { x: probeX, y: probeY + 16 }, "#fbbf24", 1.5);
      GeoDraw.label(ctx, `x=${p.displacement.toFixed(3)} mm`, (mirrorX + probeX) / 2, probeY + 28, "#fbbf24", "center", 11);
    } else {
      GeoDraw.label(ctx, `x=0.000 mm`, mirrorX, probeY + 28, "#fbbf24", "center", 11);
    }

    // Ray tracing (ZERO penetration, continuous smooth convergence to F1)
    const offsets = [-55, -28, 0, 28, 55];
    offsets.forEach((offset) => {
      // 1. Emitted from F to lens
      GeoDraw.arrow(ctx, { x: focalX, y: axisY }, { x: lensX, y: axisY + offset }, "#4a9eff", 1.5);
      // 2. Collimated horizontal ray to mirror
      const hitX = mirrorX - offset * Math.tan(thetaDraw);
      const hitY = axisY + offset;
      GeoDraw.arrow(ctx, { x: lensX, y: hitY }, { x: hitX, y: hitY }, "#4a9eff", 1.8);
      // 3. Reflected ray towards lens at angle 2*theta
      // Slope is -tan(alphaDraw) going up-left:
      const yLensReturn = hitY - (hitX - lensX) * Math.tan(alphaDraw);
      GeoDraw.arrow(ctx, { x: hitX, y: hitY }, { x: lensX, y: yLensReturn }, "#4ade80", 1.8);
      // 4. Lens focuses to F1 (continues smoothly in the same upward direction)
      GeoDraw.arrow(ctx, { x: lensX, y: yLensReturn }, { x: focalX, y: axisY - displayShift }, "#4ade80", 1.5);
    });

    // Angle 2*theta annotation on central reflected ray
    if (Math.abs(alphaDraw) >= 0.006) {
      const aAxisLeft = Math.PI;
      const aReflCentral = Math.atan2(-Math.tan(alphaDraw), -1);
      const isCwRefl = alphaDraw > 0;
      const arcStartR = isCwRefl ? aAxisLeft : aReflCentral;
      const arcEndR = isCwRefl ? aReflCentral : aAxisLeft;
      GeoDraw.angleArc(ctx, { x: mirrorX, y: axisY }, 120, arcStartR, arcEndR, "#22d3ee", `2θ=${(2 * thetaPhysDeg).toFixed(2)}°`);
    }

    // Focal Points F and F1
    const yF1 = axisY - displayShift;
    ctx.fillStyle = "#4a9eff";
    ctx.beginPath();
    ctx.arc(focalX, axisY, 5, 0, GeoDraw.TAU);
    ctx.fill();

    ctx.fillStyle = "#4ade80";
    ctx.beginPath();
    ctx.arc(focalX, yF1, 5, 0, GeoDraw.TAU);
    ctx.fill();

    GeoDraw.label(ctx, "F (零位)", focalX - 12, axisY, "#4a9eff", "right", 12);
    GeoDraw.label(ctx, "F₁ (像点)", focalX - 12, yF1, "#4ade80", "right", 12);

    // Dimension bracket FF1
    if (Math.abs(displayShift) >= 3) {
      GeoDraw.line(ctx, { x: focalX + 18, y: axisY }, { x: focalX + 18, y: yF1 }, "#a78bfa", 2.5);
      GeoDraw.arrow(ctx, { x: focalX + 18, y: (axisY + yF1) / 2 + (displayShift > 0 ? -8 : 8) }, { x: focalX + 18, y: yF1 }, "#a78bfa", 1.2);
      GeoDraw.arrow(ctx, { x: focalX + 18, y: (axisY + yF1) / 2 + (displayShift > 0 ? 8 : -8) }, { x: focalX + 18, y: axisY }, "#a78bfa", 1.2);
      GeoDraw.label(ctx, `FF₁=${shiftPhys.toFixed(3)} mm`, focalX + 26, (axisY + yF1) / 2, "#a78bfa", "left", 12);
    }

    const K = (2 * p.focal / p.arm).toFixed(1);
    GeoDraw.panel(
      ctx, 35, 38, 290, 88,
      [
        "自准直微小位移测角 (图3-2)",
        `• 镜面转角 θ ≈ x/a = ${thetaPhysMrad.toFixed(2)} mrad (${thetaPhysDeg.toFixed(3)}°)`,
        `• 反射光转角 2θ = ${(2 * thetaPhysMrad).toFixed(2)} mrad (${(2 * thetaPhysDeg).toFixed(3)}°)`,
        `• 像点位移 FF₁ = (2f′/a)·x = ${shiftPhys.toFixed(3)} mm`,
        `• 光学杠杆放大比 K = 2f′/a = ${K} 倍`
      ],
      "#fbbf24"
    );

    GeoDraw.label(ctx, `FF₁ = f′·tan(2θ) ≈ 2f′θ = (2f′/a)·x   [f′=${p.focal.toFixed(0)} mm, a=${p.arm.toFixed(1)} mm, x=${p.displacement.toFixed(3)} mm]`, w * 0.50, h - 18, "#94a3b8", "center", 11);
  }

  _render_parallel_plate(ctx, w, h) {
    const p = this.params; const i = p.incidence * Math.PI / 180; const r = Math.asin(Math.sin(i) / p.n);
    const plateWidth = 28 + (p.thickness - 1) / 39 * Math.min(165, w * 0.25);
    const x1 = w * 0.42; const x2 = x1 + plateWidth; const base = h * 0.46;
    const start = { x: x1 - 180, y: base - Math.tan(i) * 180 };
    const h1 = { x: x1, y: base }; const h2 = { x: x2, y: base + Math.tan(r) * (x2 - x1) };
    const end = { x: w - 40, y: h2.y + Math.tan(i) * (w - 40 - x2) };
    const ideal = { x: w - 40, y: base + Math.tan(i) * (w - 40 - x1) };
    ctx.fillStyle = "rgba(34,211,238,0.08)"; ctx.strokeStyle = "#22d3ee"; ctx.lineWidth = 2;
    ctx.fillRect(x1, h * 0.18, plateWidth, h * 0.60); ctx.strokeRect(x1, h * 0.18, plateWidth, h * 0.60);
    GeoDraw.arrow(ctx, start, h1, "#4a9eff", 2.4); GeoDraw.arrow(ctx, h1, h2, "#a78bfa", 2.4); GeoDraw.arrow(ctx, h2, end, "#4ade80", 2.4);
    GeoDraw.line(ctx, h1, ideal, "#fbbf24", 1.3, [5, 5]);
    GeoDraw.line(ctx, ideal, end, "#fbbf24", 2, [5, 5]);
    GeoDraw.line(ctx, { x: x1 - 3, y: h1.y - 85 }, { x: x1 - 3, y: h1.y + 85 }, "#fbbf24", 1, [4, 4]);
    GeoDraw.line(ctx, { x: x2 + 3, y: h2.y - 85 }, { x: x2 + 3, y: h2.y + 85 }, "#fbbf24", 1, [4, 4]);
    GeoDraw.label(ctx, `平行平板 n=${p.n.toFixed(2)}`, (x1 + x2) / 2, h * 0.25, "#22d3ee", "center", 13);
    GeoDraw.line(ctx, { x: x1, y: h * 0.82 }, { x: x2, y: h * 0.82 }, "#22d3ee", 1.5);
    GeoDraw.line(ctx, { x: x1, y: h * 0.80 }, { x: x1, y: h * 0.84 }, "#22d3ee", 1.5);
    GeoDraw.line(ctx, { x: x2, y: h * 0.80 }, { x: x2, y: h * 0.84 }, "#22d3ee", 1.5);
    GeoDraw.label(ctx, `厚度 d=${p.thickness.toFixed(1)} mm`, (x1 + x2) / 2, h * 0.87, "#22d3ee", "center", 12);
    const lateral = p.thickness * Math.sin(i - r) / Math.cos(r);
    const axial = p.thickness * (1 - Math.tan(r) / Math.max(1e-9, Math.tan(i || 1e-9)));
    GeoDraw.panel(ctx, 45, 45, 240, 72, ["平行平板", "出射光 ∥ 入射光", `ΔT = ${lateral.toFixed(2)} mm · ΔL′ = ${axial.toFixed(2)} mm`], "#22d3ee");
    GeoDraw.label(ctx, "侧向位移 ΔT", w * 0.80, (ideal.y + end.y) / 2, "#fbbf24", "center");
  }

  _prismValues() {
    const n = this.params.n; const a = this.params.apex * Math.PI / 180; const i = this.params.incidence * Math.PI / 180;
    const r1s = Math.sin(i) / n;
    if (Math.abs(r1s) > 1) return { valid: false, minDeviation: NaN };
    const r1 = Math.asin(r1s); const r2 = a - r1; const exitS = n * Math.sin(r2);
    const valid = Math.abs(exitS) <= 1 && r2 >= -Math.PI / 2;
    const exit = valid ? Math.asin(exitS) : NaN;
    let minDeviation = NaN;
    const minR = a / 2; const minI = Math.asin(Math.min(1, n * Math.sin(minR)));
    const minE = minI; if (Number.isFinite(minI)) minDeviation = (2 * minI - a) * 180 / Math.PI;
    return { valid, r1, r2, exit, exitDeg: valid ? exit * 180 / Math.PI : NaN, deviationDeg: valid ? (i + exit - a) * 180 / Math.PI : NaN, minDeviation };
  }

  _render_prism(ctx, w, h) {
    const result = this._prismValues(); const cx = w * 0.54; const top = 52; const base = h * 0.43;
    const prismHeight = base - top;
    const half = Math.max(10, Math.min(w * 0.20, prismHeight * Math.tan(this.params.apex * Math.PI / 360)));
    GeoDraw.drawPrism(ctx, cx, top, base, half, "#a78bfa");
    const B = { x: cx - half * 0.53, y: top + (base - top) * 0.48 }; const D = { x: cx + half * 0.53, y: top + (base - top) * 0.48 };
    const i = this.params.incidence * Math.PI / 180; const delta = result.valid ? result.deviationDeg * Math.PI / 180 : 0;
    const incoming = { x: Math.cos(i), y: -Math.sin(i) * 0.45 };
    const exit = { x: Math.cos(delta), y: Math.sin(delta) * 0.45 };
    GeoDraw.arrow(ctx, GeoDraw.add(B, GeoDraw.mul(incoming, -190)), B, "#4a9eff", 2.4);
    GeoDraw.arrow(ctx, B, D, "#a78bfa", 2.4);
    if (result.valid) GeoDraw.arrow(ctx, D, GeoDraw.add(D, GeoDraw.mul(exit, 190)), "#4ade80", 2.4);
    GeoDraw.label(ctx, `顶角 α=${this.params.apex.toFixed(0)}°`, cx, base + 20, "#a78bfa", "center");
    GeoDraw.label(ctx, result.valid ? `偏向角 δ=${result.deviationDeg.toFixed(2)}°` : "出射面全反射", cx, base + 42, result.valid ? "#4ade80" : "#f87171", "center", 13);
    const rect = { x: 65, y: h * 0.58, width: w - 125, height: h * 0.24 };
    const maxI = 80;
    const vals = [];
    for (let k = 0; k <= 220; k += 1) { const deg = maxI * k / 220; const rad = deg * Math.PI / 180; const r1 = Math.asin(Math.min(0.9999, Math.sin(rad) / this.params.n)); const r2 = this.params.apex * Math.PI / 180 - r1; const s = this.params.n * Math.sin(r2); if (Math.abs(s) <= 1) vals.push({ x: deg, y: (rad + Math.asin(s) - this.params.apex * Math.PI / 180) * 180 / Math.PI }); }
    const yMin = Math.min(...vals.map((v) => v.y), 0); const yMax = Math.max(...vals.map((v) => v.y), 1); const tr = GeoDraw.axes(ctx, rect, 0, maxI, yMin - 2, yMax + 2, "入射角 I₁", "偏向角 δ");
    GeoDraw.curve(ctx, rect, 0, maxI, (x) => { const rad = x * Math.PI / 180; const r1 = Math.asin(Math.min(0.9999, Math.sin(rad) / this.params.n)); const r2 = this.params.apex * Math.PI / 180 - r1; const s = this.params.n * Math.sin(r2); return Math.abs(s) <= 1 ? (rad + Math.asin(s) - this.params.apex * Math.PI / 180) * 180 / Math.PI : NaN; }, tr.yToPx, "#fbbf24", 2);
    if (result.valid) { const px = tr.xToPx(this.params.incidence); const py = tr.yToPx(result.deviationDeg); ctx.fillStyle = "#4ade80"; ctx.beginPath(); ctx.arc(px, py, 5, 0, GeoDraw.TAU); ctx.fill(); }
    GeoDraw.panel(ctx, 32, 35, 205, 68, ["折射棱镜", "δ = I₁ + I₂′ − α", "下图：δ 随 I₁ 的独立曲线"], "#a78bfa");
  }

  _render_double_wedge(ctx, w, h) {
    const p = this.params;
    const alpha = p.alpha * Math.PI / 180;
    const phi = p.phi * Math.PI / 180;
    // Textbook Eq (3-9): delta = 2 * alpha * (n - 1) * cos(phi)
    // Physical single wedge deflection: delta_0 = alpha * (n - 1)
    const delta0 = alpha * (p.n - 1);
    const delta = 2 * delta0 * Math.cos(phi);
    // Textbook Eq (3-10): Delta y = Delta z * delta_0 = alpha * (n - 1) * Delta z
    const dy = delta0 * p.translation;

    const mid = w * 0.50;
    const topY = h * 0.30;

    // --- Left side: Rotating Dual Wedges (Textbook Fig 3-15) ---
    GeoDraw.label(ctx, "旋转测微：偏向矢量合成（图 3-15）", w * 0.25, 30, "#22d3ee", "center", 13);
    const vc = { x: w * 0.25, y: topY };
    const vectorLength = Math.min(72, w * 0.105);
    ctx.save();
    ctx.strokeStyle = "rgba(255,255,255,0.18)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(vc.x, vc.y, vectorLength, 0, GeoDraw.TAU);
    ctx.stroke();
    ctx.restore();

    GeoDraw.line(ctx, { x: vc.x - vectorLength - 18, y: vc.y }, { x: vc.x + vectorLength + 18, y: vc.y }, "rgba(255,255,255,0.15)", 1, [4, 4]);
    GeoDraw.line(ctx, { x: vc.x, y: vc.y - vectorLength - 12 }, { x: vc.x, y: vc.y + vectorLength + 12 }, "rgba(255,255,255,0.15)", 1, [4, 4]);

    const v1 = { x: vc.x + vectorLength * Math.cos(phi), y: vc.y - vectorLength * Math.sin(phi) };
    const v2 = { x: vc.x + vectorLength * Math.cos(phi), y: vc.y + vectorLength * Math.sin(phi) };
    const resultantScale = vectorLength * 0.92;
    const vr = { x: vc.x + 2 * resultantScale * Math.cos(phi), y: vc.y };

    GeoDraw.arrow(ctx, vc, v1, "#4a9eff", 2.2);
    GeoDraw.arrow(ctx, vc, v2, "#f472b6", 2.2);
    GeoDraw.arrow(ctx, vc, vr, "#4ade80", 3);
    GeoDraw.label(ctx, "δ₁", v1.x, v1.y - 12, "#4a9eff", "center");
    GeoDraw.label(ctx, "δ₂", v2.x, v2.y + 12, "#f472b6", "center");
    GeoDraw.label(ctx, `两偏向角夹角 2φ=${(2 * p.phi).toFixed(0)}°`, vc.x, topY + vectorLength + 24, "#a3b1c6", "center");
    GeoDraw.label(ctx, `合偏向 δ=${(delta * 1000).toFixed(2)} mrad`, vc.x, topY + vectorLength + 42, "#4ade80", "center");

    // --- Right side: Translating Dual Wedges (Textbook Fig 3-16) ---
    GeoDraw.line(ctx, { x: mid, y: 22 }, { x: mid, y: h * 0.55 }, "rgba(255,255,255,0.12)", 1);
    GeoDraw.label(ctx, "移动测微：两楔反向平行放置（图 3-16）", w * 0.75, 30, "#f472b6", "center", 13);

    const rayY = topY + 15;
    const wedgeH = 120;
    const wedgeW = 28;

    // Visual angle of deflection inside the gap depends ONLY on alpha and n!
    // It is completely independent of translation Delta z!
    const visualSlopeAngle = Math.max(0.04, Math.min(0.20, delta0 * 3.8));

    const xA = mid + 65;
    // Separation distance between wedges: base offset + scaled physical translation
    const gapDistance = 25 + p.translation * Math.min(9.5, w * 0.013);
    const xB = xA + wedgeW + gapDistance;

    // Wedge 1: Left face vertical, right face inclined (thick bottom, thin top)
    // Ray enters normally at xA, deflects UPWARDS at exit face by visualSlopeAngle
    const drawWedge1 = (x) => {
      ctx.save();
      ctx.strokeStyle = "#4a9eff";
      ctx.fillStyle = "rgba(74,158,255,0.12)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x - wedgeW / 2, rayY - wedgeH / 2);
      ctx.lineTo(x - wedgeW / 2, rayY + wedgeH / 2);
      ctx.lineTo(x + wedgeW / 2, rayY + wedgeH / 2);
      ctx.lineTo(x - wedgeW / 2 + 6, rayY - wedgeH / 2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
      GeoDraw.label(ctx, "光楔 1", x, rayY + wedgeH / 2 + 18, "#4a9eff", "center", 11);
    };

    // Wedge 2: Left face inclined (parallel to Wedge 1 exit face), right face vertical
    // Thin bottom, thick top
    const drawWedge2 = (x) => {
      ctx.save();
      ctx.strokeStyle = "#f472b6";
      ctx.fillStyle = "rgba(244,114,182,0.12)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x + wedgeW / 2 - 6, rayY + wedgeH / 2);
      ctx.lineTo(x - wedgeW / 2, rayY - wedgeH / 2);
      ctx.lineTo(x + wedgeW / 2, rayY - wedgeH / 2);
      ctx.lineTo(x + wedgeW / 2, rayY + wedgeH / 2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
      GeoDraw.label(ctx, "光楔 2", x, rayY + wedgeH / 2 + 18, "#f472b6", "center", 11);
    };

    drawWedge1(xA);
    drawWedge2(xB);

    // Incident ray: travels horizontally into Wedge 1
    const xInWedge1 = xA - wedgeW / 2;
    const xExit1 = xA + 6;
    GeoDraw.arrow(ctx, { x: mid + 15, y: rayY }, { x: xInWedge1, y: rayY }, "#fbbf24", 2.2);
    GeoDraw.line(ctx, { x: xInWedge1, y: rayY }, { x: xExit1, y: rayY }, "#4a9eff", 2.0);

    // Ray in air gap: FIXED angle UPWARDS!
    // The slope is -tan(visualSlopeAngle), STRICTLY independent of translation!
    const xEnter2 = xB - wedgeW / 2 + 6;
    const airGapDx = xEnter2 - xExit1;
    const airGapDy = airGapDx * Math.tan(visualSlopeAngle);
    const yEnter2 = rayY - airGapDy; // UPWARDS (smaller y in canvas)

    GeoDraw.arrow(ctx, { x: xExit1, y: rayY }, { x: xEnter2, y: yEnter2 }, "#4ade80", 2.2);

    // Inside Wedge 2 and outgoing: refracts back to HORIZONTAL!
    const xOutWedge2 = xB + wedgeW / 2;
    GeoDraw.line(ctx, { x: xEnter2, y: yEnter2 }, { x: xOutWedge2, y: yEnter2 }, "#f472b6", 2.0);
    GeoDraw.arrow(ctx, { x: xOutWedge2, y: yEnter2 }, { x: w - 25, y: yEnter2 }, "#4ade80", 2.2);

    // Dashed horizontal reference line
    GeoDraw.line(ctx, { x: xExit1, y: rayY }, { x: w - 25, y: rayY }, "rgba(251,191,36,0.35)", 1, [5, 4]);

    // Deflection angle arc in gap
    if (airGapDx >= 30) {
      GeoDraw.angleArc(ctx, { x: xExit1, y: rayY }, 32, -visualSlopeAngle, 0, "#22d3ee", `δ`);
    }

    // Dimension line for Delta z between wedges
    const dimZY = rayY + wedgeH / 2 + 35;
    GeoDraw.line(ctx, { x: xA, y: dimZY }, { x: xB, y: dimZY }, "#a78bfa", 1.5);
    GeoDraw.arrow(ctx, { x: (xA + xB) / 2 - 15, y: dimZY }, { x: xA, y: dimZY }, "#a78bfa", 1.2);
    GeoDraw.arrow(ctx, { x: (xA + xB) / 2 + 15, y: dimZY }, { x: xB, y: dimZY }, "#a78bfa", 1.2);
    GeoDraw.label(ctx, `轴向位移 Δz=${p.translation.toFixed(1)} mm`, (xA + xB) / 2, dimZY + 16, "#a78bfa", "center", 11);

    // Dimension line for lateral shift Delta y at outgoing ray
    const dimYx = w - 45;
    if (airGapDy >= 3) {
      GeoDraw.line(ctx, { x: dimYx, y: rayY }, { x: dimYx, y: yEnter2 }, "#4ade80", 2);
      GeoDraw.arrow(ctx, { x: dimYx, y: (rayY + yEnter2) / 2 + 6 }, { x: dimYx, y: yEnter2 }, "#4ade80", 1.2);
      GeoDraw.arrow(ctx, { x: dimYx, y: (rayY + yEnter2) / 2 - 6 }, { x: dimYx, y: rayY }, "#4ade80", 1.2);
      GeoDraw.label(ctx, `Δy=${dy.toFixed(3)} mm`, dimYx - 8, (rayY + yEnter2) / 2, "#4ade80", "right", 11);
    }
    GeoDraw.label(ctx, `出射平行无偏折 · 垂轴位移 Δy = α(n−1)Δz`, w * 0.75, rayY - wedgeH / 2 - 12, "#4ade80", "center", 12);

    // Curves at bottom
    const rect1 = { x: 48, y: h * 0.63, width: w * 0.36, height: h * 0.20 };
    const amplitude = Math.max(1, 2000 * alpha * (p.n - 1) * 1.15);
    const tr1 = GeoDraw.axes(ctx, rect1, 0, 180, -amplitude, amplitude, "相对转角 φ (°)", "δ (mrad)");
    GeoDraw.curve(ctx, rect1, 0, 180, (x) => 2000 * alpha * (p.n - 1) * Math.cos(x * Math.PI / 180), tr1.yToPx, "#22d3ee", 2);
    const px1 = tr1.xToPx(p.phi);
    const py1 = tr1.yToPx(delta * 1000);
    ctx.fillStyle = "#fbbf24";
    ctx.beginPath();
    ctx.arc(px1, py1, 5, 0, GeoDraw.TAU);
    ctx.fill();

    const rect2 = { x: w * 0.57, y: h * 0.63, width: w * 0.36, height: h * 0.20 };
    const maxZ = 10;
    const tr2 = GeoDraw.axes(ctx, rect2, 0, maxZ, 0, Math.max(0.1, alpha * (p.n - 1) * maxZ * 1.15), "轴向位移 Δz (mm)", "Δy (mm)");
    GeoDraw.curve(ctx, rect2, 0, maxZ, (z) => alpha * (p.n - 1) * z, tr2.yToPx, "#f472b6", 2);
    const px2 = tr2.xToPx(p.translation);
    const py2 = tr2.yToPx(dy);
    ctx.fillStyle = "#fbbf24";
    ctx.beginPath();
    ctx.arc(px2, py2, 5, 0, GeoDraw.TAU);
    ctx.fill();

    GeoDraw.label(ctx, "δ = 2α(n−1)cosφ", w * 0.24, h - 18, "#22d3ee", "center", 11);
    GeoDraw.label(ctx, "Δy = α(n−1)Δz", w * 0.76, h - 18, "#f472b6", "center", 11);
  }
  _sphereParaxialCalc() {
    const p = this.params;
    const isReflection = p.surfaceType === "reflection";
    const r = Math.abs(p.r) < 1e-4 ? (p.r >= 0 ? 1e-4 : -1e-4) : p.r;
    const l = Math.abs(p.l) < 1e-4 ? (p.l >= 0 ? -1e-4 : 1e-4) : p.l;
    const n1 = p.n1;
    const n2 = isReflection ? -n1 : p.n2;
    const h = p.h;
    const y = p.y;

    const deltaN = n2 - n1;
    const power = deltaN / r;
    const f = Math.abs(deltaN) > 1e-7 ? -n1 * r / deltaN : -Infinity;
    const fPrime = Math.abs(deltaN) > 1e-7 ? n2 * r / deltaN : Infinity;

    // Gauss formula: n2/l' - n1/l = (n2 - n1)/r
    const rhs = n1 / l + deltaN / r;
    const lPrime = Math.abs(rhs) > 1e-9 ? n2 / rhs : (rhs >= 0 ? 1e6 : -1e6);

    // 1. 垂轴放大率 beta = y'/y = n1*l' / (n2*l) = (l' - r) / (l - r)
    let beta = 0;
    if (Math.abs(l) < 1e-4) beta = 1;
    else if (Math.abs(rhs) <= 1e-9) beta = Infinity;
    else beta = (n1 * lPrime) / (n2 * l);

    // 2. 轴向放大率 alpha = dl'/dl = (n2/n1) * beta^2
    const alpha = (n2 / n1) * (beta ** 2);

    // 3. 角放大率 gamma = u'/u = n1 / (n2 * beta) = l / l'
    let gamma = 0;
    if (Math.abs(beta) > 1e-9 && Number.isFinite(beta)) {
      gamma = n1 / (n2 * beta);
    } else if (Number.isFinite(lPrime) && Math.abs(lPrime) > 1e-4) {
      gamma = l / lPrime;
    }

    // 4. 面积放大率 S = beta^2
    const S = beta ** 2;
    const V = Math.abs(alpha * S);
    const residual = Math.abs(alpha * gamma - beta);
    const yPrime = Number.isFinite(beta) ? beta * y : (y >= 0 ? 1e4 : -1e4);

    const u = Math.atan2(h, Math.abs(l));
    const i = ((l - r) / r) * u;
    const iPrime = (n1 / n2) * i;
    const uPrime = u + i - iPrime;
    const J = n1 * y * u;

    return {
      isReflection, r, l, n1, n2, h, y, power, f, fPrime, lPrime, beta, alpha, gamma, S, V,
      residual, yPrime, u, i, iPrime, uPrime, J
    };
  }

  _sphereExactCalc() {
    const p = this.params;
    const isReflection = p.surfaceType === "reflection";
    const r = Math.abs(p.r) < 1e-4 ? (p.r >= 0 ? 1e-4 : -1e-4) : p.r;
    const L = Math.abs(p.L) < 1e-4 ? (p.L >= 0 ? -1e-4 : 1e-4) : p.L;
    const n1 = p.n1;
    const n2 = isReflection ? -n1 : p.n2;
    const U = p.U;
    const y = p.y;

    const Urad = U * Math.PI / 180;
    // (1-1) sin I = (L - r) * sin U / r
    const sinI = ((L - r) / r) * Math.sin(Urad);
    const missed = Math.abs(sinI) > 1.0;

    let I = NaN, Ideg = NaN, sinIPrime = NaN, IPrime = NaN, IPrimeDeg = NaN;
    let UPrime = NaN, UPrimeDeg = NaN, LPrime = NaN, tir = false;

    if (!missed) {
      I = Math.asin(sinI);
      Ideg = I * 180 / Math.PI;
      // (1-2) sin I' = (n1 / n2) * sin I
      sinIPrime = (n1 / n2) * sinI;
      if (!isReflection && Math.abs(sinIPrime) > 1.0) {
        tir = true;
      } else {
        IPrime = isReflection ? -I : Math.asin(sinIPrime);
        IPrimeDeg = IPrime * 180 / Math.PI;
        // (1-3) U' = U + I - I'
        UPrime = Urad + I - IPrime;
        UPrimeDeg = UPrime * 180 / Math.PI;
        // (1-4) L' = r * (1 + sin I' / sin U')
        if (Math.abs(Math.sin(UPrime)) > 1e-7) {
          LPrime = r * (1 + sinIPrime / Math.sin(UPrime));
        } else {
          LPrime = Infinity;
        }
      }
    }

    // Paraxial reference
    const deltaN = n2 - n1;
    const rhs = n1 / L + deltaN / r;
    const lPrime = Math.abs(rhs) > 1e-9 ? n2 / rhs : Infinity;
    const deltaLPrime = (Number.isFinite(LPrime) && Number.isFinite(lPrime)) ? (LPrime - lPrime) : NaN;

    let betaExact = NaN;
    if (Number.isFinite(LPrime) && Math.abs(L - r) > 1e-4) {
      betaExact = (LPrime - r) / (L - r);
    }
    const yPrimeExact = Number.isFinite(betaExact) ? betaExact * y : NaN;

    const betaParaxial = (Number.isFinite(lPrime) && Math.abs(L) > 1e-4) ? (n1 * lPrime) / (n2 * L) : NaN;
    const alphaParaxial = (n2 / n1) * (betaParaxial ** 2);
    const gammaParaxial = Math.abs(betaParaxial) > 1e-9 ? (n1 / (n2 * betaParaxial)) : NaN;
    const gammaExact = (!tir && !missed && Math.abs(Math.tan(Urad)) > 1e-7) ? Math.tan(UPrime) / Math.tan(Urad) : NaN;

    return {
      isReflection, r, L, n1, n2, U, y, Urad, missed, tir, sinI, Ideg, sinIPrime, IPrimeDeg,
      UPrimeDeg, UPrime, LPrime, lPrime, deltaLPrime, betaExact, yPrimeExact,
      betaParaxial, alphaParaxial, gammaParaxial, gammaExact
    };
  }

  _render_sphere_paraxial(ctx, w, h) {
    const p = this.params;
    const res = this._sphereParaxialCalc();
    const Y0 = h * 0.48;

    GeoDraw.grid(ctx, 25, 25, w - 50, h - 50, 10, 6);

    const xVals = [p.l, 0, p.r, res.f, res.fPrime, Number.isFinite(res.lPrime) ? res.lPrime : 0].filter(Number.isFinite);
    const xMin = Math.min(...xVals, -220);
    const xMax = Math.max(...xVals, 220);
    const span = Math.max(260, xMax - xMin);
    const Sx = Math.max(0.32, Math.min(1.05, (w - 180) / (span + 40)));
    const X0 = Math.max(w * 0.26, Math.min(w * 0.68, w * 0.46 - ((xMin + xMax) / 2) * Sx * 0.35));
    const Sy = Math.min(1.65, (h * 0.26) / Math.max(35, Math.abs(p.y), Math.abs(res.yPrime || 0), p.h || 20));

    // Medium backgrounds
    if (res.isReflection) {
      ctx.fillStyle = "rgba(74,158,255,0.045)";
      ctx.fillRect(25, 25, Math.max(0, X0 - 25), h - 50);
      ctx.fillStyle = "rgba(15,23,42,0.40)";
      ctx.fillRect(X0, 25, Math.max(0, w - 25 - X0), h - 50);

      GeoDraw.label(ctx, `环境介质 n = ${p.n1.toFixed(2)}`, 40, 45, "#60a5fa", "left", 12);
      GeoDraw.label(ctx, `球面反射镜 (${p.r < 0 ? "凹面镜" : "凸面镜"}) · n′ = −n`, w - 40, 45, "#fbbf24", "right", 12);
    } else {
      ctx.fillStyle = "rgba(74,158,255,0.045)";
      ctx.fillRect(25, 25, Math.max(0, X0 - 25), h - 50);
      ctx.fillStyle = "rgba(34,211,238,0.075)";
      ctx.fillRect(X0, 25, Math.max(0, w - 25 - X0), h - 50);

      GeoDraw.label(ctx, `物方介质 n = ${p.n1.toFixed(2)}`, 40, 45, "#60a5fa", "left", 12);
      GeoDraw.label(ctx, `像方介质 n′ = ${p.n2.toFixed(2)}`, w - 40, 45, "#22d3ee", "right", 12);
    }

    // Spherical surface interface
    const Cx = X0 + p.r * Sx;
    const Rpx = Math.abs(p.r) * Sx;
    const Hap = Math.min(h * 0.38, 155);
    const theta0 = Math.asin(Math.min(0.92, Hap / Math.max(Rpx, Hap + 8)));

    ctx.save();
    ctx.strokeStyle = res.isReflection ? "#fbbf24" : "#22d3ee";
    ctx.lineWidth = res.isReflection ? 3.0 : 2.8;
    ctx.beginPath();
    if (p.r > 0) {
      ctx.arc(Cx, Y0, Rpx, Math.PI - theta0, Math.PI + theta0);
    } else {
      ctx.arc(Cx, Y0, Rpx, -theta0, theta0);
    }
    ctx.stroke();

    // Mirror hatching on back of mirror
    if (res.isReflection) {
      ctx.strokeStyle = "rgba(163, 177, 198, 0.55)";
      ctx.lineWidth = 1.3;
      const hatchCount = 18;
      for (let k = 0; k <= hatchCount; k++) {
        const frac = k / hatchCount;
        let th, nx, ny;
        if (p.r > 0) {
          th = (Math.PI - theta0) + frac * (2 * theta0);
          nx = -Math.cos(th);
          ny = -Math.sin(th);
        } else {
          th = -theta0 + frac * (2 * theta0);
          nx = Math.cos(th);
          ny = Math.sin(th);
        }
        const px = Cx + Rpx * Math.cos(th);
        const py = Y0 + Rpx * Math.sin(th);
        const hx = px + 10 * nx - 6 * ny;
        const hy = py + 10 * ny + 6 * nx;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(hx, hy);
        ctx.stroke();
      }
    }
    ctx.restore();

    // Optical Axis
    GeoDraw.line(ctx, { x: 25, y: Y0 }, { x: w - 25, y: Y0 }, "rgba(255,255,255,0.30)", 1.2, [6, 4]);

    // Cardinal Points
    ctx.fillStyle = "#ffffff"; ctx.beginPath(); ctx.arc(X0, Y0, 4, 0, GeoDraw.TAU); ctx.fill();
    GeoDraw.label(ctx, "O", X0, Y0 + 16, "#ffffff", "center", 11);

    if (Number.isFinite(Cx) && Cx >= 30 && Cx <= w - 30) {
      ctx.fillStyle = "#fb923c"; ctx.beginPath(); ctx.arc(Cx, Y0, 4, 0, GeoDraw.TAU); ctx.fill();
      GeoDraw.label(ctx, `C (r=${p.r})`, Cx, Y0 + 16, "#fb923c", "center", 11);
    }

    if (res.isReflection) {
      if (Number.isFinite(res.f)) {
        const Fx = X0 + res.f * Sx;
        if (Fx >= 30 && Fx <= w - 30) {
          ctx.fillStyle = "#60a5fa"; ctx.beginPath(); ctx.arc(Fx, Y0, 4, 0, GeoDraw.TAU); ctx.fill();
          GeoDraw.label(ctx, `F(f=${res.f.toFixed(0)})`, Fx, Y0 + 16, "#60a5fa", "center", 11);
        }
      }
    } else {
      if (Number.isFinite(res.f)) {
        const Fx = X0 + res.f * Sx;
        if (Fx >= 30 && Fx <= w - 30) {
          ctx.fillStyle = "#60a5fa"; ctx.beginPath(); ctx.arc(Fx, Y0, 4, 0, GeoDraw.TAU); ctx.fill();
          GeoDraw.label(ctx, "F", Fx, Y0 + 16, "#60a5fa", "center", 11);
        }
      }
      if (Number.isFinite(res.fPrime)) {
        const Fpx = X0 + res.fPrime * Sx;
        if (Fpx >= 30 && Fpx <= w - 30) {
          ctx.fillStyle = "#4ade80"; ctx.beginPath(); ctx.arc(Fpx, Y0, 4, 0, GeoDraw.TAU); ctx.fill();
          GeoDraw.label(ctx, "F′", Fpx, Y0 + 16, "#4ade80", "center", 11);
        }
      }
    }

    // Object Arrow
    const Xobj = X0 + p.l * Sx;
    const Yobj = Y0 - p.y * Sy;
    GeoDraw.drawArrowObject(ctx, Xobj, Y0, p.y * Sy, "#fbbf24", `物 A (l=${p.l.toFixed(0)})`);

    // Image Arrow & Ray Tracing
    if (Number.isFinite(res.lPrime)) {
      const Ximg = X0 + res.lPrime * Sx;
      const Yimg = Y0 - res.yPrime * Sy;

      if (res.isReflection) {
        // Reflection: Real image if l' < 0 (in front of mirror), Virtual image if l' > 0 (behind mirror)
        const isReal = res.lPrime < 0;
        const color = isReal ? "#4ade80" : "#a78bfa";
        if (isReal) {
          GeoDraw.drawArrowObject(ctx, Ximg, Y0, res.yPrime * Sy, color, `实像 A′ (l′=${res.lPrime.toFixed(1)})`);
        } else {
          GeoDraw.line(ctx, { x: Ximg, y: Y0 }, { x: Ximg, y: Yimg }, color, 2, [5, 4]);
          GeoDraw.label(ctx, `虚像 A′ (l′=${res.lPrime.toFixed(1)})`, Ximg, Y0 + 26, color, "center", 11);
        }

        const Fx = X0 + res.f * Sx;

        // Ray 1: Parallel to axis -> reflects through F (or away from F)
        GeoDraw.arrow(ctx, { x: Xobj, y: Yobj }, { x: X0, y: Yobj }, "#60a5fa", 1.8);
        if (isReal) {
          const m1 = (Yimg - Yobj) / (Ximg - X0);
          const xEnd1 = Math.max(30, Math.min(Ximg - 40, X0 - 80));
          const yEnd1 = Yobj + m1 * (xEnd1 - X0);
          GeoDraw.arrow(ctx, { x: X0, y: Yobj }, { x: xEnd1, y: yEnd1 }, "#4ade80", 1.8);
        } else {
          const m1 = (Yimg - Yobj) / (Ximg - X0);
          const xEnd1 = Math.max(30, X0 - 180);
          const yEnd1 = Yobj + m1 * (xEnd1 - X0);
          GeoDraw.arrow(ctx, { x: X0, y: Yobj }, { x: xEnd1, y: yEnd1 }, "#4ade80", 1.8);
          GeoDraw.line(ctx, { x: X0, y: Yobj }, { x: Ximg, y: Yimg }, "#a78bfa", 1.2, [4, 4]);
          if (Fx > X0 && Fx <= w - 20) {
            GeoDraw.line(ctx, { x: X0, y: Yobj }, { x: Fx, y: Y0 }, "#60a5fa", 1, [3, 3]);
          }
        }

        // Ray 2: Through Center C -> strikes normal to surface and reflects back
        if (Number.isFinite(Cx)) {
          if (isReal) {
            GeoDraw.arrow(ctx, { x: Xobj, y: Yobj }, { x: Ximg, y: Yimg }, "#fbbf24", 1.8);
            if (Cx < Ximg) {
              GeoDraw.line(ctx, { x: Ximg, y: Yimg }, { x: Cx, y: Y0 }, "#fbbf24", 1.2, [3, 3]);
            }
          } else {
            const m2 = (Y0 - Yobj) / (Cx - Xobj);
            const xHit2 = X0;
            const yHit2 = Yobj + m2 * (xHit2 - Xobj);
            GeoDraw.arrow(ctx, { x: Xobj, y: Yobj }, { x: xHit2, y: yHit2 }, "#fbbf24", 1.8);
            GeoDraw.arrow(ctx, { x: xHit2, y: yHit2 }, { x: Math.max(30, Xobj - 40), y: Yobj + m2 * (Math.max(30, Xobj - 40) - Xobj) }, "#fbbf24", 1.5);
            GeoDraw.line(ctx, { x: xHit2, y: yHit2 }, { x: Ximg, y: Yimg }, "#a78bfa", 1.2, [4, 4]);
          }
        }

        // Ray 3: To Vertex O -> reflects symmetrically
        GeoDraw.arrow(ctx, { x: Xobj, y: Yobj }, { x: X0, y: Y0 }, "#38bdf8", 1.5);
        if (isReal) {
          GeoDraw.arrow(ctx, { x: X0, y: Y0 }, { x: Ximg, y: Yimg }, "#4ade80", 1.5);
        } else {
          const m3 = (Yimg - Y0) / (Ximg - X0);
          const xEnd3 = Math.max(30, X0 - 160);
          const yEnd3 = Y0 + m3 * (xEnd3 - X0);
          GeoDraw.arrow(ctx, { x: X0, y: Y0 }, { x: xEnd3, y: yEnd3 }, "#4ade80", 1.5);
          GeoDraw.line(ctx, { x: X0, y: Y0 }, { x: Ximg, y: Yimg }, "#a78bfa", 1.2, [4, 4]);
        }
      } else {
        // Refraction: Real image if l' > 0, Virtual if l' < 0
        const isReal = res.lPrime > 0;
        const color = isReal ? "#4ade80" : "#a78bfa";
        if (isReal) {
          GeoDraw.drawArrowObject(ctx, Ximg, Y0, res.yPrime * Sy, color, `像 A′ (l′=${res.lPrime.toFixed(1)})`);
        } else {
          GeoDraw.line(ctx, { x: Ximg, y: Y0 }, { x: Ximg, y: Yimg }, color, 2, [5, 4]);
          GeoDraw.label(ctx, `虚像 A′ (l′=${res.lPrime.toFixed(1)})`, Ximg, Y0 + 26, color, "center", 11);
        }

        // Ray 1: Parallel to axis -> passes through F'
        if (Number.isFinite(res.fPrime)) {
          const Fpx = X0 + res.fPrime * Sx;
          GeoDraw.arrow(ctx, { x: Xobj, y: Yobj }, { x: X0, y: Yobj }, "#60a5fa", 1.8);
          if (isReal && Number.isFinite(Ximg) && Number.isFinite(Yimg)) {
            GeoDraw.arrow(ctx, { x: X0, y: Yobj }, { x: Ximg, y: Yimg }, "#4ade80", 1.8);
          } else if (Math.abs(X0 - Fpx) > 1e-3) {
            const m1 = (Yobj - Y0) / (X0 - Fpx);
            const yEnd1 = Yobj + m1 * (w - 30 - X0);
            if (Number.isFinite(yEnd1)) {
              GeoDraw.arrow(ctx, { x: X0, y: Yobj }, { x: w - 30, y: yEnd1 }, "#4ade80", 1.8);
            }
            if (Number.isFinite(Ximg) && Number.isFinite(Yimg)) {
              GeoDraw.line(ctx, { x: X0, y: Yobj }, { x: Ximg, y: Yimg }, "#a78bfa", 1.2, [4, 4]);
            }
          }
        }

        // Ray 2: Through Center C
        if (Number.isFinite(Cx)) {
          if (isReal && Number.isFinite(Ximg) && Number.isFinite(Yimg)) {
            GeoDraw.arrow(ctx, { x: Xobj, y: Yobj }, { x: Ximg, y: Yimg }, "#fbbf24", 1.8);
          } else if (Math.abs(Cx - Xobj) > 1e-3) {
            const m2 = (Y0 - Yobj) / (Cx - Xobj);
            const yEnd2 = Yobj + m2 * (w - 30 - Xobj);
            if (Number.isFinite(yEnd2)) {
              GeoDraw.arrow(ctx, { x: Xobj, y: Yobj }, { x: w - 30, y: yEnd2 }, "#fbbf24", 1.8);
            }
            if (Number.isFinite(Ximg) && Number.isFinite(Yimg)) {
              GeoDraw.line(ctx, { x: X0, y: Y0 - (Y0 - Yobj) * (X0 - Cx) / (Xobj - Cx) }, { x: Ximg, y: Yimg }, "#a78bfa", 1.2, [4, 4]);
            }
          }
        }

        // Ray 3: Through Front Focus F -> becomes parallel to axis
        if (Number.isFinite(res.f) && Math.abs(res.f) < 2000 && Number.isFinite(Yimg)) {
          const Yhit = Yimg;
          GeoDraw.arrow(ctx, { x: Xobj, y: Yobj }, { x: X0, y: Yhit }, "#38bdf8", 1.5);
          if (isReal && Number.isFinite(Ximg)) {
            GeoDraw.arrow(ctx, { x: X0, y: Yhit }, { x: Ximg, y: Yimg }, "#4ade80", 1.5);
          } else {
            GeoDraw.arrow(ctx, { x: X0, y: Yhit }, { x: w - 30, y: Yhit }, "#4ade80", 1.5);
            if (Number.isFinite(Ximg)) {
              GeoDraw.line(ctx, { x: X0, y: Yhit }, { x: Ximg, y: Yimg }, "#a78bfa", 1.2, [4, 4]);
            }
          }
        }
      }
    }

    // --- PARAXIAL APERTURE RAY at height h (近轴孔径光线) ---
    const Hpy = Math.max(8, p.h * Sy);
    const YhitH = Y0 - Hpy;
    let XhitH = X0;
    if (Hpy < Rpx * 0.95) {
      const dXh = p.r > 0 ? (Rpx - Math.sqrt(Rpx * Rpx - Hpy * Hpy)) : (-Rpx + Math.sqrt(Rpx * Rpx - Hpy * Hpy));
      XhitH = X0 + dXh;
    }

    // Aperture dimension bracket at X0
    GeoDraw.line(ctx, { x: X0, y: Y0 }, { x: X0, y: YhitH }, "#38bdf8", 1.8, [3, 3]);
    GeoDraw.line(ctx, { x: X0 - 5, y: YhitH }, { x: X0 + 5, y: YhitH }, "#38bdf8", 1.8);
    GeoDraw.line(ctx, { x: X0 - 5, y: Y0 }, { x: X0 + 5, y: Y0 }, "#38bdf8", 1.8);
    const labelX = X0 + (p.r > 0 ? -12 : 12);
    GeoDraw.label(ctx, `h=${p.h.toFixed(0)}mm`, labelX, (Y0 + YhitH) / 2, "#38bdf8", p.r > 0 ? "right" : "left", 11);

    // Incident Paraxial Aperture Ray from axial object point A(Xobj, Y0) to (XhitH, YhitH)
    GeoDraw.arrow(ctx, { x: Xobj, y: Y0 }, { x: XhitH, y: YhitH }, "#38bdf8", 2.2);
    GeoDraw.angleArc(ctx, { x: Xobj, y: Y0 }, 32, -res.u, 0, "#38bdf8", `u=${(res.u * 180 / Math.PI).toFixed(1)}°`);

    // Surface normal line from C to (XhitH, YhitH)
    if (Number.isFinite(Cx)) {
      const normLen = Math.hypot(XhitH - Cx, YhitH - Y0) || 1;
      const nNx = (XhitH - Cx) / normLen;
      const nNy = (YhitH - Y0) / normLen;
      GeoDraw.line(ctx, { x: Cx, y: Y0 }, { x: XhitH + nNx * 45, y: YhitH + nNy * 45 }, "rgba(251, 191, 36, 0.55)", 1.2, [4, 4]);
    }

    // Refracted/Reflected Paraxial Aperture Ray to axial image point A'(Ximg, Y0)
    if (Number.isFinite(res.lPrime)) {
      const Ximg = X0 + res.lPrime * Sx;
      if (res.isReflection) {
        if (res.lPrime < 0) {
          // Real image in front of mirror
          GeoDraw.arrow(ctx, { x: XhitH, y: YhitH }, { x: Ximg, y: Y0 }, "#4ade80", 2.2);
          ctx.fillStyle = "#4ade80"; ctx.beginPath(); ctx.arc(Ximg, Y0, 4, 0, GeoDraw.TAU); ctx.fill();
          GeoDraw.angleArc(ctx, { x: Ximg, y: Y0 }, 28, -Math.PI + Math.min(Math.PI, Math.abs(res.uPrime)), -Math.PI, "#4ade80", `u′=${(Math.abs(res.uPrime) * 180 / Math.PI).toFixed(1)}°`);
        } else {
          // Virtual image behind mirror
          const mH = (Y0 - YhitH) / (Ximg - XhitH);
          const xEndH = Math.max(30, XhitH - 180);
          const yEndH = YhitH + mH * (xEndH - XhitH);
          GeoDraw.arrow(ctx, { x: XhitH, y: YhitH }, { x: xEndH, y: yEndH }, "#4ade80", 2.2);
          GeoDraw.line(ctx, { x: XhitH, y: YhitH }, { x: Ximg, y: Y0 }, "#a78bfa", 1.5, [4, 4]);
          ctx.fillStyle = "#a78bfa"; ctx.beginPath(); ctx.arc(Ximg, Y0, 4, 0, GeoDraw.TAU); ctx.fill();
        }
      } else {
        if (res.lPrime > 0) {
          // Real image to the right
          GeoDraw.arrow(ctx, { x: XhitH, y: YhitH }, { x: Ximg, y: Y0 }, "#4ade80", 2.2);
          ctx.fillStyle = "#4ade80"; ctx.beginPath(); ctx.arc(Ximg, Y0, 4, 0, GeoDraw.TAU); ctx.fill();
          GeoDraw.angleArc(ctx, { x: Ximg, y: Y0 }, 28, Math.PI, Math.PI - Math.min(Math.PI, Math.abs(res.uPrime)), "#4ade80", `u′=${(Math.abs(res.uPrime) * 180 / Math.PI).toFixed(1)}°`);
        } else {
          // Virtual image to the left
          const mH = (Y0 - YhitH) / (Ximg - XhitH);
          const xEndH = Math.min(w - 30, XhitH + 180);
          const yEndH = YhitH + mH * (xEndH - XhitH);
          GeoDraw.arrow(ctx, { x: XhitH, y: YhitH }, { x: xEndH, y: yEndH }, "#4ade80", 2.2);
          GeoDraw.line(ctx, { x: XhitH, y: YhitH }, { x: Ximg, y: Y0 }, "#a78bfa", 1.5, [4, 4]);
          ctx.fillStyle = "#a78bfa"; ctx.beginPath(); ctx.arc(Ximg, Y0, 4, 0, GeoDraw.TAU); ctx.fill();
        }
      }
    }

    // Panel Overlay
    if (res.isReflection) {
      GeoDraw.panel(ctx, 35, h - 105, 385, 82, [
        `单个球面反射镜 · 近轴光路与放大率 (${p.r < 0 ? "凹面镜 (会聚)" : "凸面镜 (发散)"})`,
        `反射物像公式: 1/l′ + 1/l = 2/r = 1/f ⇛ f=${res.f.toFixed(1)} mm · l′=${Number.isFinite(res.lPrime) ? res.lPrime.toFixed(1) + " mm (" + (res.lPrime < 0 ? "实像" : "虚像") + ")" : "∞"}`,
        `① 垂轴 β=${res.beta.toFixed(3)}  ② 轴向 α=${res.alpha.toFixed(3)}  ③ 角 γ=${res.gamma.toFixed(3)}  ④ 面积 S=${res.S.toFixed(3)}`,
        `放大率关系: α·γ = β · 近轴孔径高 h=${p.h.toFixed(0)} mm (孔径角 u=${(res.u * 180 / Math.PI).toFixed(1)}° · 拉赫 J=${res.J.toFixed(1)})`
      ], "#fbbf24");
    } else {
      GeoDraw.panel(ctx, 35, h - 105, 385, 82, [
        "单个折射球面 · 近轴光路与四个放大率 (PDF p10)",
        `高斯公式: n′/l′ − n/l = (n′−n)/r ⇛ l′=${Number.isFinite(res.lPrime) ? res.lPrime.toFixed(1) + " mm (" + (res.lPrime > 0 ? "实像" : "虚像") + ")" : "∞"}`,
        `① 垂轴 β=${res.beta.toFixed(3)}  ② 轴向 α=${res.alpha.toFixed(3)}  ③ 角 γ=${res.gamma.toFixed(3)}  ④ 面积 S=${res.S.toFixed(3)}`,
        `放大率关系: α·γ = β · 近轴孔径高 h=${p.h.toFixed(0)} mm (孔径角 u=${(res.u * 180 / Math.PI).toFixed(1)}° · 残差: ${res.residual.toExponential(2)})`
      ], "#22d3ee");
    }
  }

  _render_sphere_exact(ctx, w, h) {
    const p = this.params;
    const res = this._sphereExactCalc();
    const Y0 = h * 0.48;

    GeoDraw.grid(ctx, 25, 25, w - 50, h - 50, 10, 6);

    const xVals = [p.L, 0, p.r, Number.isFinite(res.LPrime) ? res.LPrime : 0, Number.isFinite(res.lPrime) ? res.lPrime : 0].filter(Number.isFinite);
    const xMin = Math.min(...xVals, -220);
    const xMax = Math.max(...xVals, 220);
    const span = Math.max(260, xMax - xMin);
    const Sx = Math.max(0.32, Math.min(1.05, (w - 180) / (span + 40)));
    const X0 = Math.max(w * 0.26, Math.min(w * 0.68, w * 0.46 - ((xMin + xMax) / 2) * Sx * 0.35));
    const Sy = Math.min(1.65, (h * 0.26) / Math.max(35, Math.abs(p.y || 0), Math.abs(res.yPrimeExact || 0)));

    // Medium backgrounds
    if (res.isReflection) {
      ctx.fillStyle = "rgba(74,158,255,0.045)";
      ctx.fillRect(25, 25, Math.max(0, X0 - 25), h - 50);
      ctx.fillStyle = "rgba(15,23,42,0.40)";
      ctx.fillRect(X0, 25, Math.max(0, w - 25 - X0), h - 50);

      GeoDraw.label(ctx, `环境介质 n = ${p.n1.toFixed(2)}`, 40, 45, "#60a5fa", "left", 12);
      GeoDraw.label(ctx, `球面反射镜 (${p.r < 0 ? "凹面镜" : "凸面镜"}) · n′ = −n`, w - 40, 45, "#fbbf24", "right", 12);
    } else {
      ctx.fillStyle = "rgba(74,158,255,0.045)";
      ctx.fillRect(25, 25, Math.max(0, X0 - 25), h - 50);
      ctx.fillStyle = "rgba(34,211,238,0.075)";
      ctx.fillRect(X0, 25, Math.max(0, w - 25 - X0), h - 50);

      GeoDraw.label(ctx, `物方介质 n = ${p.n1.toFixed(2)}`, 40, 45, "#60a5fa", "left", 12);
      GeoDraw.label(ctx, `像方介质 n′ = ${p.n2.toFixed(2)}`, w - 40, 45, "#22d3ee", "right", 12);
    }

    // Exact Spherical surface interface
    const Cx = X0 + p.r * Sx;
    const Rpx = Math.abs(p.r) * Sx;
    const Hap = Math.min(h * 0.40, 160);
    const theta0 = Math.asin(Math.min(0.92, Hap / Math.max(Rpx, Hap + 8)));

    ctx.save();
    ctx.strokeStyle = res.isReflection ? "#fbbf24" : "#22d3ee";
    ctx.lineWidth = res.isReflection ? 3.0 : 2.8;
    ctx.beginPath();
    if (p.r > 0) {
      ctx.arc(Cx, Y0, Rpx, Math.PI - theta0, Math.PI + theta0);
    } else {
      ctx.arc(Cx, Y0, Rpx, -theta0, theta0);
    }
    ctx.stroke();

    // Mirror hatching on back of mirror
    if (res.isReflection) {
      ctx.strokeStyle = "rgba(163, 177, 198, 0.55)";
      ctx.lineWidth = 1.3;
      const hatchCount = 18;
      for (let k = 0; k <= hatchCount; k++) {
        const frac = k / hatchCount;
        let th, nx, ny;
        if (p.r > 0) {
          th = (Math.PI - theta0) + frac * (2 * theta0);
          nx = -Math.cos(th);
          ny = -Math.sin(th);
        } else {
          th = -theta0 + frac * (2 * theta0);
          nx = Math.cos(th);
          ny = Math.sin(th);
        }
        const px = Cx + Rpx * Math.cos(th);
        const py = Y0 + Rpx * Math.sin(th);
        const hx = px + 10 * nx - 6 * ny;
        const hy = py + 10 * ny + 6 * nx;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(hx, hy);
        ctx.stroke();
      }
    }
    ctx.restore();

    // Optical Axis
    GeoDraw.line(ctx, { x: 25, y: Y0 }, { x: w - 25, y: Y0 }, "rgba(255,255,255,0.30)", 1.2, [6, 4]);

    // Cardinal Points
    ctx.fillStyle = "#ffffff"; ctx.beginPath(); ctx.arc(X0, Y0, 4, 0, GeoDraw.TAU); ctx.fill();
    GeoDraw.label(ctx, "O", X0, Y0 + 16, "#ffffff", "center", 11);

    if (Number.isFinite(Cx) && Cx >= 30 && Cx <= w - 30) {
      ctx.fillStyle = "#fb923c"; ctx.beginPath(); ctx.arc(Cx, Y0, 4, 0, GeoDraw.TAU); ctx.fill();
      GeoDraw.label(ctx, `C (r=${p.r})`, Cx, Y0 + 16, "#fb923c", "center", 11);
    }

    const XA = X0 + p.L * Sx;
    if (Math.abs(p.y) > 0.5) {
      GeoDraw.drawArrowObject(ctx, XA, Y0, p.y * Sy, "#fbbf24", `物 A (L=${p.L.toFixed(0)}, y=${p.y.toFixed(0)})`);
    } else {
      ctx.fillStyle = "#fbbf24"; ctx.beginPath(); ctx.arc(XA, Y0, 5, 0, GeoDraw.TAU); ctx.fill();
      GeoDraw.label(ctx, `A (L=${p.L.toFixed(0)})`, XA, Y0 + 18, "#fbbf24", "center", 12);
    }

    // Exact Intersection Point P calculation
    if (!res.missed) {
      const Urad = res.Urad;
      const dX = (p.L - p.r) * Sx;
      const cosU = Math.cos(Urad);
      const sinU = Math.sin(Urad);
      const disc = Math.max(0, Rpx * Rpx - dX * dX * sinU * sinU);
      const t = p.r > 0 ? (-dX * cosU - Math.sqrt(disc)) : (-dX * cosU + Math.sqrt(disc));
      const Px = XA + t * cosU;
      const Py = Y0 - t * sinU;

      if (Number.isFinite(Px) && Number.isFinite(Py)) {
        // Draw Incident Ray
        GeoDraw.arrow(ctx, { x: XA, y: Y0 }, { x: Px, y: Py }, "#4a9eff", 2.2);

        // Draw Normal Line C-P
        const normLen = Math.hypot(Px - Cx, Py - Y0);
        if (normLen > 1e-4) {
          const normNx = (Px - Cx) / normLen;
          const normNy = (Py - Y0) / normLen;
          GeoDraw.line(ctx, { x: Cx, y: Y0 }, { x: Px + normNx * 55, y: Py + normNy * 55 }, "#fbbf24", 1.2, [4, 4]);
        }

        // Angle Arcs for I and U
        GeoDraw.angleArc(ctx, { x: XA, y: Y0 }, 36, -Urad, 0, "#4a9eff", `U=${p.U.toFixed(1)}°`);
        GeoDraw.label(ctx, `I=${res.Ideg.toFixed(1)}°`, Px - 18, Py - 18, "#fbbf24", "right", 11);

        if (res.isReflection) {
          // Reflection Ray Tracing
          const XLp = X0 + res.LPrime * Sx;
          const Xlp = X0 + res.lPrime * Sx;
          const isReal = res.LPrime < 0;

          if (Number.isFinite(res.LPrime)) {
            if (isReal && XLp >= 20 && XLp <= w + 200) {
              GeoDraw.arrow(ctx, { x: Px, y: Py }, { x: XLp, y: Y0 }, "#4ade80", 2.5);
              if (Number.isFinite(res.yPrimeExact) && Math.abs(res.yPrimeExact) > 0.5) {
                GeoDraw.drawArrowObject(ctx, XLp, Y0, res.yPrimeExact * Sy, "#4ade80", `实像 A′ (L′=${res.LPrime.toFixed(1)}, y′=${res.yPrimeExact.toFixed(1)})`);
              } else {
                ctx.fillStyle = "#4ade80"; ctx.beginPath(); ctx.arc(XLp, Y0, 5, 0, GeoDraw.TAU); ctx.fill();
                GeoDraw.label(ctx, `A′_exact (L′=${res.LPrime.toFixed(1)})`, XLp, Y0 - 18, "#4ade80", "center", 11);
              }
            } else if (!isReal) {
              const mRef = (Y0 - Py) / (XLp - Px);
              const xEndRef = Math.max(25, Px - 220);
              const yEndRef = Py + mRef * (xEndRef - Px);
              GeoDraw.arrow(ctx, { x: Px, y: Py }, { x: xEndRef, y: yEndRef }, "#4ade80", 2.5);
              if (XLp <= w - 20) {
                GeoDraw.line(ctx, { x: Px, y: Py }, { x: XLp, y: Y0 }, "#a78bfa", 1.4, [4, 4]);
                if (Number.isFinite(res.yPrimeExact) && Math.abs(res.yPrimeExact) > 0.5) {
                  GeoDraw.drawArrowObject(ctx, XLp, Y0, res.yPrimeExact * Sy, "#a78bfa", `虚像 A′ (L′=${res.LPrime.toFixed(1)}, y′=${res.yPrimeExact.toFixed(1)})`);
                } else {
                  ctx.fillStyle = "#a78bfa"; ctx.beginPath(); ctx.arc(XLp, Y0, 5, 0, GeoDraw.TAU); ctx.fill();
                  GeoDraw.label(ctx, `虚像 A′ (L′=${res.LPrime.toFixed(1)})`, XLp, Y0 - 18, "#a78bfa", "center", 11);
                }
              }
            }
          }

          // Paraxial focus comparison
          if (Number.isFinite(res.lPrime) && Xlp >= 20 && Xlp <= w + 200) {
            ctx.fillStyle = "#22d3ee"; ctx.beginPath(); ctx.arc(Xlp, Y0, 4, 0, GeoDraw.TAU); ctx.fill();
            GeoDraw.label(ctx, `A′_paraxial (l′=${res.lPrime.toFixed(1)})`, Xlp, Y0 + 26, "#22d3ee", "center", 11);

            // Longitudinal spherical aberration bracket
            if (Number.isFinite(res.LPrime) && Math.abs(XLp - Xlp) > 2) {
              const yBra = isReal ? (Y0 - 8) : (Y0 + 12);
              GeoDraw.line(ctx, { x: Math.min(XLp, Xlp), y: yBra }, { x: Math.max(XLp, Xlp), y: yBra }, "#fb923c", 2.5);
              GeoDraw.label(ctx, `δL′=${res.deltaLPrime.toFixed(2)} mm`, (XLp + Xlp) / 2, yBra - 14, "#fb923c", "center", 11);
            }
          }

          // Auxiliary fan rays (showing reflection caustic curve)
          [0.35, 0.65, 1.15].forEach((factor) => {
            const uF = p.U * factor;
            if (uF > 0.2 && uF < 45) {
              const uRadF = uF * Math.PI / 180;
              const sIF = ((p.L - p.r) / p.r) * Math.sin(uRadF);
              if (Math.abs(sIF) <= 0.98) {
                const IF = Math.asin(sIF);
                const uPF = uRadF + 2 * IF;
                if (Math.abs(Math.sin(uPF)) > 1e-6) {
                  const lPF = p.r * (1 - sIF / Math.sin(uPF));
                  const dXF = (p.L - p.r) * Sx;
                  const cUF = Math.cos(uRadF); const sUF = Math.sin(uRadF);
                  const discF = Math.max(0, Rpx * Rpx - dXF * dXF * sUF * sUF);
                  const tF = p.r > 0 ? (-dXF * cUF - Math.sqrt(discF)) : (-dXF * cUF + Math.sqrt(discF));
                  const pxF = XA + tF * cUF; const pyF = Y0 - tF * sUF;
                  const xlPF = X0 + lPF * Sx;
                  if (Number.isFinite(pxF) && Number.isFinite(pyF)) {
                    GeoDraw.line(ctx, { x: XA, y: Y0 }, { x: pxF, y: pyF }, "rgba(74,158,255,0.45)", 1.2);
                    if (lPF < 0) {
                      GeoDraw.line(ctx, { x: pxF, y: pyF }, { x: xlPF, y: Y0 }, "rgba(74,222,128,0.45)", 1.2);
                    } else {
                      const mF = (Y0 - pyF) / (xlPF - pxF);
                      GeoDraw.line(ctx, { x: pxF, y: pyF }, { x: Math.max(25, pxF - 180), y: pyF + mF * (Math.max(25, pxF - 180) - pxF) }, "rgba(74,222,128,0.45)", 1.2);
                      GeoDraw.line(ctx, { x: pxF, y: pyF }, { x: xlPF, y: Y0 }, "rgba(167,139,250,0.35)", 1, [3, 3]);
                    }
                  }
                }
              }
            }
          });
        } else if (res.tir) {
          // Total internal reflection
          const normLen = Math.hypot(Px - Cx, Py - Y0) || 1;
          const normNx = (Px - Cx) / normLen;
          const normNy = (Py - Y0) / normLen;
          const dot = (cosU * normNx) + (-sinU * normNy);
          const refDx = cosU - 2 * dot * normNx;
          const refDy = -sinU - 2 * dot * normNy;
          GeoDraw.arrow(ctx, { x: Px, y: Py }, { x: Px + refDx * 180, y: Py + refDy * 180 }, "#fb923c", 2.4);
          GeoDraw.label(ctx, "全反射 (TIR)", Px + 20, Py - 25, "#f87171", "left", 14);
        } else {
          // Refracted ray
          const XLp = X0 + res.LPrime * Sx;
          const Xlp = X0 + res.lPrime * Sx;

          if (Number.isFinite(res.LPrime) && XLp >= 20 && XLp <= w + 200) {
            GeoDraw.arrow(ctx, { x: Px, y: Py }, { x: XLp, y: Y0 }, "#4ade80", 2.5);
            if (Number.isFinite(res.yPrimeExact) && Math.abs(res.yPrimeExact) > 0.5) {
              GeoDraw.drawArrowObject(ctx, XLp, Y0, res.yPrimeExact * Sy, "#4ade80", `实像 A′ (L′=${res.LPrime.toFixed(1)}, y′=${res.yPrimeExact.toFixed(1)})`);
            } else {
              ctx.fillStyle = "#4ade80"; ctx.beginPath(); ctx.arc(XLp, Y0, 5, 0, GeoDraw.TAU); ctx.fill();
              GeoDraw.label(ctx, `A′_exact (L′=${res.LPrime.toFixed(1)})`, XLp, Y0 - 18, "#4ade80", "center", 11);
            }
          }

          // Paraxial focus comparison
          if (Number.isFinite(res.lPrime) && Xlp >= 20 && Xlp <= w + 200) {
            ctx.fillStyle = "#22d3ee"; ctx.beginPath(); ctx.arc(Xlp, Y0, 4, 0, GeoDraw.TAU); ctx.fill();
            GeoDraw.label(ctx, `A′_paraxial (l′=${res.lPrime.toFixed(1)})`, Xlp, Y0 + 26, "#22d3ee", "center", 11);

            // Longitudinal spherical aberration bracket
            if (Number.isFinite(res.LPrime) && Math.abs(XLp - Xlp) > 3) {
              GeoDraw.line(ctx, { x: Math.min(XLp, Xlp), y: Y0 - 8 }, { x: Math.max(XLp, Xlp), y: Y0 - 8 }, "#fb923c", 2.5);
              GeoDraw.label(ctx, `δL′=${res.deltaLPrime.toFixed(2)} mm`, (XLp + Xlp) / 2, Y0 - 24, "#fb923c", "center", 11);
            }
          }

          // Auxiliary fan rays (showing caustic curve)
          [0.35, 0.65, 1.15].forEach((factor) => {
            const uF = p.U * factor;
            if (uF > 0.2 && uF < 45) {
              const uRadF = uF * Math.PI / 180;
              const sIF = ((p.L - p.r) / p.r) * Math.sin(uRadF);
              if (Math.abs(sIF) <= 0.98) {
                const sIPF = (p.n1 / p.n2) * sIF;
                if (Math.abs(sIPF) <= 0.98) {
                  const uPF = uRadF + Math.asin(sIF) - Math.asin(sIPF);
                  if (Math.abs(Math.sin(uPF)) > 1e-6) {
                    const lPF = p.r * (1 + sIPF / Math.sin(uPF));
                    const dXF = (p.L - p.r) * Sx;
                    const cUF = Math.cos(uRadF); const sUF = Math.sin(uRadF);
                    const discF = Math.max(0, Rpx * Rpx - dXF * dXF * sUF * sUF);
                    const tF = p.r > 0 ? (-dXF * cUF - Math.sqrt(discF)) : (-dXF * cUF + Math.sqrt(discF));
                    const pxF = XA + tF * cUF; const pyF = Y0 - tF * sUF;
                    const xlPF = X0 + lPF * Sx;
                    if (Number.isFinite(pxF) && Number.isFinite(pyF) && Number.isFinite(xlPF)) {
                      GeoDraw.line(ctx, { x: XA, y: Y0 }, { x: pxF, y: pyF }, "rgba(74,158,255,0.45)", 1.2);
                      GeoDraw.line(ctx, { x: pxF, y: pyF }, { x: xlPF, y: Y0 }, "rgba(74,222,128,0.45)", 1.2);
                    }
                  }
                }
              }
            }
          });
        }
      }
    }

    // Panel Overlay
    if (res.isReflection) {
      GeoDraw.panel(ctx, 35, h - 105, 385, 82, [
        `单个反射球面镜 · 反射定律实际光线追迹 (${p.r < 0 ? "凹面镜" : "凸面镜"})`,
        `反射计算: sin I = (L−r)sin U / r · I′ = −I · U′ = U + 2I · L′ = r(1 − sin I/sin U′)`,
        `实际像距 L′=${Number.isFinite(res.LPrime) ? res.LPrime.toFixed(2) + " mm (" + (res.LPrime < 0 ? "实像" : "虚像") + ")" : "—"} · 近轴像距 l′=${Number.isFinite(res.lPrime) ? res.lPrime.toFixed(2) + " mm" : "—"}`,
        `纵向球差 δL′ = L′ − l′ = ${Number.isFinite(res.deltaLPrime) ? res.deltaLPrime.toFixed(3) + " mm" : "—"} · 孔径角 U=${p.U.toFixed(1)}°`
      ], "#fbbf24");
    } else {
      GeoDraw.panel(ctx, 35, h - 105, 385, 82, [
        "单个折射球面 · 折射定律实际光线追迹 (PDF p10)",
        `折射计算: sin I = (L−r)sin U / r · sin I′ = (n/n′)sin I · U′ = U + I − I′`,
        `实际像距 L′=${Number.isFinite(res.LPrime) ? res.LPrime.toFixed(2) + " mm" : "—"} · 近轴像距 l′=${Number.isFinite(res.lPrime) ? res.lPrime.toFixed(2) + " mm" : "—"}`,
        `纵向球差 δL′ = L′ − l′ = ${Number.isFinite(res.deltaLPrime) ? res.deltaLPrime.toFixed(3) + " mm" : "—"} · 实际放大率 β_real=${Number.isFinite(res.betaExact) ? res.betaExact.toFixed(3) : "—"}`
      ], "#4ade80");
    }
  }

  _perfectImagingCalc() {
    const p = this.params;
    const isIdeal = p.systemType !== "aberrated";
    const condition = p.condition || "all";
    const l = p.l || -220;
    const lPrime = p.lPrime || 220;
    const fanDeg = p.fan || 24;
    const rayCount = Math.max(3, Math.min(15, Math.floor(p.rays || 7)));
    const UmaxRad = (fanDeg / 2) * Math.PI / 180;

    const n1 = 1.00;
    const n2 = 1.00;
    const nGlass = 1.5168;
    const d0 = 36;

    const rays = [];
    const s1_0 = Math.abs(l);
    const s2_0 = Math.abs(lPrime);
    const OPL_0 = n1 * s1_0 + nGlass * d0 + n2 * s2_0;

    let maxDeltaOPL = 0;
    let spotSizeUm = 0;

    for (let k = 0; k < rayCount; k++) {
      const frac = rayCount > 1 ? ((k / (rayCount - 1)) * 2 - 1) : 0;
      const Uk = frac * UmaxRad;
      const s1_k = Math.abs(l) / Math.cos(Uk);
      const y1_k = Math.abs(l) * Math.tan(Uk);
      const y2_k = y1_k;

      let s2_k, UPrime_k, deltaLPrime_k = 0, deltaOPL_k = 0;

      if (isIdeal) {
        s2_k = Math.hypot(lPrime, y2_k);
        UPrime_k = Math.atan2(y2_k, lPrime);
        const d_k = d0 - (n1 * (s1_k - s1_0) + n2 * (s2_k - s2_0)) / (nGlass - n1);
        const OPL_k = n1 * s1_k + (nGlass * d_k + n1 * (d0 - d_k)) + n2 * s2_k;
        deltaOPL_k = OPL_k - OPL_0;
      } else {
        const aberrationFactor = 45;
        deltaLPrime_k = -aberrationFactor * (frac ** 2);
        const actualLPrime = lPrime + deltaLPrime_k;
        s2_k = Math.hypot(actualLPrime, y2_k);
        UPrime_k = Math.atan2(y2_k, actualLPrime);
        const lambdaMm = 0.00055;
        const W0_waves = 1.45;
        deltaOPL_k = W0_waves * (frac ** 4) * lambdaMm;
        const blurRadiusMm = Math.abs(deltaLPrime_k) * Math.tan(UPrime_k);
        spotSizeUm = Math.max(spotSizeUm, blurRadiusMm * 1000);
      }

      if (Math.abs(deltaOPL_k) > Math.abs(maxDeltaOPL)) {
        maxDeltaOPL = deltaOPL_k;
      }

      rays.push({
        index: k,
        frac,
        Uk,
        UPrime_k,
        y1_k,
        y2_k,
        s1_k,
        s2_k,
        deltaLPrime_k,
        deltaOPL_k,
        OPL_k: OPL_0 + deltaOPL_k
      });
    }

    const lambdaMm = 0.00055;
    const maxDeltaOPLWaves = maxDeltaOPL / lambdaMm;

    return {
      isIdeal,
      condition,
      l,
      lPrime,
      fanDeg,
      rayCount,
      UmaxRad,
      n1,
      n2,
      nGlass,
      d0,
      OPL_0,
      rays,
      maxDeltaOPL: maxDeltaOPLWaves,
      spotSizeUm: isIdeal ? 0 : spotSizeUm
    };
  }

  _render_perfect_imaging(ctx, w, h) {
    const p = this.params;
    const res = this._perfectImagingCalc();
    const Y0 = h * 0.48;
    const X0 = w * 0.50;

    GeoDraw.grid(ctx, 25, 25, w - 50, h - 50, 10, 6);

    const Sx = Math.min(0.85, (w - 200) / 620);
    const Sy = 1.15;
    const XA = X0 + p.l * Sx;
    const XAp = X0 + p.lPrime * Sx;

    const Dsys = 56;
    const X1 = X0 - Dsys / 2;
    const X2 = X0 + Dsys / 2;
    const maxRayY = res.rays && res.rays.length > 0 ? Math.abs(res.rays[res.rays.length - 1].y1_k) * Sy : 100;
    const Hlens = Math.min(h * 0.42, Math.max(140, maxRayY + 22));

    // Optical Axis
    GeoDraw.line(ctx, { x: 25, y: Y0 }, { x: w - 25, y: Y0 }, "rgba(255,255,255,0.28)", 1.2, [6, 4]);

    // Optical System Housing
    ctx.save();
    ctx.fillStyle = res.isIdeal ? "rgba(34, 211, 238, 0.09)" : "rgba(251, 146, 60, 0.09)";
    ctx.strokeStyle = res.isIdeal ? "#22d3ee" : "#fb923c";
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(X1, Y0 - Hlens);
    ctx.quadraticCurveTo(X0 - 25, Y0, X1, Y0 + Hlens);
    ctx.lineTo(X2, Y0 + Hlens);
    ctx.quadraticCurveTo(X0 + 25, Y0, X2, Y0 - Hlens);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Principal surfaces H, H'
    GeoDraw.line(ctx, { x: X1, y: Y0 - Hlens }, { x: X1, y: Y0 + Hlens }, "rgba(34,211,238,0.45)", 1, [4, 4]);
    GeoDraw.line(ctx, { x: X2, y: Y0 - Hlens }, { x: X2, y: Y0 + Hlens }, "rgba(34,211,238,0.45)", 1, [4, 4]);
    GeoDraw.label(ctx, "H", X1 - 8, Y0 + Hlens + 14, "#22d3ee", "center", 10);
    GeoDraw.label(ctx, "H′", X2 + 8, Y0 + Hlens + 14, "#22d3ee", "center", 10);

    // Aperture stops
    ctx.fillStyle = "#334155";
    ctx.fillRect(X0 - 10, Y0 - Hlens - 16, 20, 16);
    ctx.fillRect(X0 - 10, Y0 + Hlens, 20, 16);
    ctx.strokeStyle = "#64748b";
    ctx.lineWidth = 1;
    ctx.strokeRect(X0 - 10, Y0 - Hlens - 16, 20, 16);
    ctx.strokeRect(X0 - 10, Y0 + Hlens, 20, 16);

    const sysTitle = res.isIdeal ? "完善光学系统 (无像差 / Aplanatic)" : "非完善系统 (产生初级球差)";
    GeoDraw.label(ctx, sysTitle, X0, Y0 - Hlens - 24, res.isIdeal ? "#22d3ee" : "#fb923c", "center", 12);
    ctx.restore();

    // Object point A
    ctx.fillStyle = "rgba(251, 191, 36, 0.25)";
    ctx.beginPath();
    ctx.arc(XA, Y0, 9, 0, GeoDraw.TAU);
    ctx.fill();
    ctx.fillStyle = "#fbbf24";
    ctx.beginPath();
    ctx.arc(XA, Y0, 5, 0, GeoDraw.TAU);
    ctx.fill();
    GeoDraw.label(ctx, `物点 A (l=${p.l.toFixed(0)})`, XA, Y0 + 20, "#fbbf24", "center", 12);

    // Object space angle arc
    GeoDraw.angleArc(ctx, { x: XA, y: Y0 }, 36, -res.UmaxRad, res.UmaxRad, "#fbbf24", `2U=${p.fan}°`);

    // Image point A'
    if (res.isIdeal) {
      ctx.fillStyle = "rgba(74, 222, 128, 0.25)";
      ctx.beginPath();
      ctx.arc(XAp, Y0, 9, 0, GeoDraw.TAU);
      ctx.fill();
      ctx.fillStyle = "#4ade80";
      ctx.beginPath();
      ctx.arc(XAp, Y0, 5, 0, GeoDraw.TAU);
      ctx.fill();
      GeoDraw.label(ctx, `完善像点 A′ (l′=${p.lPrime.toFixed(0)})`, XAp, Y0 + 20, "#4ade80", "center", 12);
    } else {
      ctx.fillStyle = "#22d3ee";
      ctx.beginPath();
      ctx.arc(XAp, Y0, 4, 0, GeoDraw.TAU);
      ctx.fill();
      GeoDraw.label(ctx, "近轴焦点 A′₀", XAp, Y0 + 20, "#22d3ee", "center", 11);

      const Xedge = XAp - 45 * Sx;
      ctx.fillStyle = "#f87171";
      ctx.beginPath();
      ctx.arc(Xedge, Y0, 4, 0, GeoDraw.TAU);
      ctx.fill();
      GeoDraw.label(ctx, "边缘焦点 A′ₘ", Xedge, Y0 + 20, "#f87171", "center", 11);

      // Blur circle
      ctx.strokeStyle = "rgba(251, 146, 60, 0.85)";
      ctx.fillStyle = "rgba(251, 146, 60, 0.25)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(XAp, Y0, 14, 0, GeoDraw.TAU);
      ctx.fill();
      ctx.stroke();
      GeoDraw.label(ctx, `弥散斑 (${res.spotSizeUm.toFixed(1)} μm)`, XAp, Y0 - 24, "#fb923c", "center", 11);
    }

    // --- CONDITION 1: SPHERICAL WAVEFRONTS ---
    const showWave = p.condition === "all" || p.condition === "wavefront";
    if (showWave) {
      const numWaves = 4;
      const waveSpan1 = Math.abs(X1 - XA);
      const waveSpan2 = Math.abs(XAp - X2);

      // Object space expanding spherical waves
      for (let m = 0; m < numWaves; m++) {
        const rawR = ((p.t * 32 + m * 55) % waveSpan1);
        if (rawR > 12) {
          ctx.save();
          ctx.strokeStyle = "rgba(251, 191, 36, 0.70)";
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.arc(XA, Y0, rawR, -res.UmaxRad * 1.12, res.UmaxRad * 1.12);
          ctx.stroke();
          ctx.restore();
        }
      }
      GeoDraw.label(ctx, "物方同心球面波面 Σ₁", XA + waveSpan1 * 0.45, Y0 - Hlens * 0.75, "#fbbf24", "center", 11);

      // Image space converging waves
      for (let m = 0; m < numWaves; m++) {
        const rawR = waveSpan2 - ((p.t * 32 + m * 55) % waveSpan2);
        if (rawR > 14 && rawR < waveSpan2 - 8) {
          ctx.save();
          if (res.isIdeal) {
            ctx.strokeStyle = "rgba(74, 222, 128, 0.85)";
            ctx.lineWidth = 1.8;
            ctx.beginPath();
            const UPrimeEdge = Math.atan2(Hlens * 0.65, waveSpan2);
            ctx.arc(XAp, Y0, rawR, Math.PI - UPrimeEdge * 1.12, Math.PI + UPrimeEdge * 1.12);
            ctx.stroke();
          } else {
            // Aberrated deformed wavefront
            ctx.strokeStyle = "rgba(251, 146, 60, 0.85)";
            ctx.lineWidth = 1.8;
            ctx.beginPath();
            const steps = 40;
            const UPrimeEdge = Math.atan2(Hlens * 0.65, waveSpan2);
            for (let s = 0; s <= steps; s++) {
              const angFrac = (s / steps) * 2 - 1;
              const ang = Math.PI + angFrac * UPrimeEdge * 1.12;
              const wAberr = 12 * (angFrac ** 4);
              const rDef = rawR + wAberr;
              const wx = XAp + rDef * Math.cos(ang);
              const wy = Y0 + rDef * Math.sin(ang);
              if (s === 0) ctx.moveTo(wx, wy);
              else ctx.lineTo(wx, wy);
            }
            ctx.stroke();
          }
          ctx.restore();
        }
      }

      if (res.isIdeal) {
        GeoDraw.label(ctx, "出射波面 Σ₂：严格为同心球面波 (中心为 A′)", X2 + waveSpan2 * 0.52, Y0 - Hlens * 0.75, "#4ade80", "center", 11);
      } else {
        GeoDraw.label(ctx, "出射波面发生非球畸变 (波像差 W(ρ) ≠ 0)", X2 + waveSpan2 * 0.52, Y0 - Hlens * 0.75, "#fb923c", "center", 11);
      }
    }

    // --- CONDITION 2: HOMOCENTRIC BEAM RAYS ---
    const showRays = p.condition === "all" || p.condition === "homocentric" || p.condition === "opl";
    if (showRays) {
      res.rays.forEach((ray) => {
        const P1x = X1;
        const P1y = Y0 - ray.y1_k * Sy;
        const P2x = X2;
        const P2y = Y0 - ray.y2_k * Sy;

        // Incident ray from A to P1
        GeoDraw.line(ctx, { x: XA, y: Y0 }, { x: P1x, y: P1y }, "#fbbf24", 1.8);

        // Inside lens ray P1 to P2
        GeoDraw.line(ctx, { x: P1x, y: P1y }, { x: P2x, y: P2y }, "#38bdf8", 1.6);

        // Exiting ray
        if (res.isIdeal) {
          GeoDraw.arrow(ctx, { x: P2x, y: P2y }, { x: XAp, y: Y0 }, "#4ade80", 2.0);
        } else {
          const XkPrime = XAp + ray.deltaLPrime_k * Sx;
          const mk = (Y0 - P2y) / (XkPrime - P2x);
          const xEnd = Math.min(w - 20, XAp + 55);
          const yEnd = P2y + mk * (xEnd - P2x);
          GeoDraw.arrow(ctx, { x: P2x, y: P2y }, { x: xEnd, y: yEnd }, "#fb923c", 1.8);
        }

        // Right-angle orthogonality marker on wavefront
        if (showWave && (ray.index === 1 || ray.index === res.rayCount - 2)) {
          const testR = Math.abs(XAp - X2) * 0.45;
          const vRay = res.isIdeal
            ? { x: XAp - P2x, y: Y0 - P2y }
            : { x: (XAp + ray.deltaLPrime_k * Sx) - P2x, y: Y0 - P2y };
          const lenV = Math.hypot(vRay.x, vRay.y) || 1;
          const uv = { x: vRay.x / lenV, y: vRay.y / lenV };
          const ptQ = { x: XAp - uv.x * testR, y: Y0 - uv.y * testR };
          if (ptQ.x > X2 + 10 && ptQ.x < XAp - 10) {
            const ut = { x: -uv.y, y: uv.x };
            GeoDraw.rightAngle(ctx, ptQ, GeoDraw.mul(uv, -1), ut, 7, "#fbbf24");
          }
        }
      });

      if (p.condition === "homocentric") {
        if (res.isIdeal) {
          GeoDraw.label(ctx, "同心光束中心即完善像点 A′", XAp, Y0 - 32, "#4ade80", "center", 12);
        } else {
          GeoDraw.label(ctx, "球差破坏光束同心性：出射光线不交于单一点", XAp, Y0 - 45, "#fb923c", "center", 12);
        }
      }
    }

    // --- CONDITION 3: ISO-OPL INSET BAR CHART ---
    const showOPL = p.condition === "all" || p.condition === "opl";
    if (showOPL) {
      const panelX = w - 285;
      const panelY = 38;
      const panelW = 255;
      const panelH = 92;

      ctx.save();
      ctx.fillStyle = "rgba(15, 23, 42, 0.88)";
      ctx.strokeStyle = res.isIdeal ? "#22d3ee" : "#fb923c";
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.roundRect(panelX, panelY, panelW, panelH, 8);
      ctx.fill();
      ctx.stroke();

      GeoDraw.label(ctx, "条件③ 任意两条光路光程对比 (OPL)", panelX + 12, panelY + 18, "#e2e8f0", "left", 11);

      // Draw bars for each ray
      const barBaseY = panelY + 68;
      const numBars = res.rays.length;
      const barWidth = Math.max(6, Math.min(18, (panelW - 60) / numBars));
      const gap = (panelW - 60) / numBars;

      for (let b = 0; b < numBars; b++) {
        const rInfo = res.rays[b];
        const bx = panelX + 30 + b * gap;
        let bHeight = 32;
        if (!res.isIdeal) {
          bHeight = 32 + (rInfo.frac ** 4) * 16;
        }
        ctx.fillStyle = res.isIdeal ? "#4ade80" : "#fb923c";
        ctx.fillRect(bx, barBaseY - bHeight, barWidth, bHeight);
      }

      // Baseline across bars
      GeoDraw.line(ctx, { x: panelX + 25, y: barBaseY - 32 }, { x: panelX + panelW - 25, y: barBaseY - 32 }, "rgba(255,255,255,0.40)", 1, [3, 3]);

      if (res.isIdeal) {
        GeoDraw.label(ctx, "(AA′)₁ ≡ (AA′)₂ ≡ ... ≡ 常数 · ΔOPL = 0.000 λ", panelX + 12, panelY + 84, "#4ade80", "left", 11);
      } else {
        GeoDraw.label(ctx, `ΔOPL_max = +${res.maxDeltaOPL.toFixed(3)} λ (等光程性破坏)`, panelX + 12, panelY + 84, "#fb923c", "left", 11);
      }
      ctx.restore();
    }

    // Bottom Theory & Metrics Panel
    const condTitleMap = {
      all: "【综合三等价】波面 · 光束 · 光程 三位一体",
      wavefront: "【条件①】球面波面对应视角",
      homocentric: "【条件②】同心光束对应视角",
      opl: "【条件③】任意光路等光程视角",
    };
    const condTitle = condTitleMap[p.condition] || condTitleMap.all;

    GeoDraw.panel(ctx, 35, h - 105, 410, 82, [
      `完善成像的三个等价条件 (教材第2页) · ${condTitle}`,
      `① 入射球面波 ⇛ 出射同心球面波 · ② 入射同心光束 ⇛ 出射同心光束 · ③ 任意两光路等光程`,
      res.isIdeal
        ? `【完善系统】三条件全部严格满足 · ΔOPL ≡ 0.000 λ · 像点严格无弥散 (几何理想点像)`
        : `【非完善系统】三条件同步破坏 · 产生波像差 ΔOPL=${res.maxDeltaOPL.toFixed(3)} λ · 弥散斑=${res.spotSizeUm.toFixed(1)} μm`,
      `物距 l=${p.l.toFixed(0)} mm · 像距 l′=${p.lPrime.toFixed(0)} mm · 物方孔径角 2U=${p.fan}° · 采样光线 N=${res.rays.length}`
    ], res.isIdeal ? "#22d3ee" : "#fb923c");
  }
}



// =======================================================================
// =======================================================================
// 第二章 理想光学系统 (蔡怀宇《工程光学》第2版 教材 P16-20)
// =======================================================================

// 通用尺寸标注辅助函数 (带双向箭头与端部刻线)
function drawDimLine(ctx, x1, x2, y, text, color = "#94a3b8") {
  const minX = Math.min(x1, x2);
  const maxX = Math.max(x1, x2);
  if (Math.abs(maxX - minX) < 2) return;
  GeoDraw.line(ctx, { x: minX, y }, { x: maxX, y }, color, 1.2);
  GeoDraw.line(ctx, { x: minX, y: y - 4 }, { x: minX, y: y + 4 }, color, 1.2);
  GeoDraw.line(ctx, { x: maxX, y: y - 4 }, { x: maxX, y: y + 4 }, color, 1.2);
  const arrowSize = Math.min(5, (maxX - minX) * 0.3);
  if (maxX - minX > 14) {
    GeoDraw.line(ctx, { x: minX, y }, { x: minX + arrowSize, y: y - 3 }, color, 1.2);
    GeoDraw.line(ctx, { x: minX, y }, { x: minX + arrowSize, y: y + 3 }, color, 1.2);
    GeoDraw.line(ctx, { x: maxX, y }, { x: maxX - arrowSize, y: y - 3 }, color, 1.2);
    GeoDraw.line(ctx, { x: maxX, y }, { x: maxX - arrowSize, y: y + 3 }, color, 1.2);
  }
  const midX = (minX + maxX) / 2;
  GeoDraw.label(ctx, text, midX, y - 4, color, "center", 11);
}

// 通用薄透镜标准符号绘制 (带正负透镜标准箭头)
// 焦距为正 (正透镜): 箭头指向两端外侧 (向两边 ⟷)
// 焦距为负 (负透镜): 箭头指向中心光轴 (指向中间 ><)
function drawThinLensArrow(ctx, x, cy, height, isPositive, color = "#38bdf8", labelText = "", lineWidth = 2.2) {
  const half = height / 2;
  const yTop = cy - half;
  const yBottom = cy + half;
  const arrowLen = 10;
  const arrowWing = 6;

  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = lineWidth;

  // 竖直中心线
  ctx.beginPath();
  ctx.moveTo(x, yTop);
  ctx.lineTo(x, yBottom);
  ctx.stroke();

  // 箭头端部
  ctx.beginPath();
  if (isPositive) {
    // 正透镜: 箭头向两边 (顶端朝上，底端朝下)
    ctx.moveTo(x - arrowWing, yTop + arrowLen);
    ctx.lineTo(x, yTop);
    ctx.lineTo(x + arrowWing, yTop + arrowLen);

    ctx.moveTo(x - arrowWing, yBottom - arrowLen);
    ctx.lineTo(x, yBottom);
    ctx.lineTo(x + arrowWing, yBottom - arrowLen);
  } else {
    // 负透镜: 箭头指向中间 (顶端朝下，底端朝上)
    ctx.moveTo(x - arrowWing, yTop);
    ctx.lineTo(x, yTop + arrowLen);
    ctx.lineTo(x + arrowWing, yTop);

    ctx.moveTo(x - arrowWing, yBottom);
    ctx.lineTo(x, yBottom - arrowLen);
    ctx.lineTo(x + arrowWing, yBottom);
  }
  ctx.stroke();
  ctx.restore();

  if (labelText) {
    GeoDraw.label(ctx, labelText, x, yTop - 12, color, "center", 12);
  }
}

// -----------------------------------------------------------------------
// 1. 焦点与焦平面独立示意模型 (教材 P16 §2.1)
// -----------------------------------------------------------------------
class FocalPointsSim {
  constructor(canvasId, controlsId) {
    this.canvas = document.getElementById(canvasId);
    this.controlsRoot = document.getElementById(controlsId);
    this.config = {
      defaults: {
        fPrime: 120,
        rayMode: "parallel_axial",
        rayAngle: 8,
        yF: 25,
        beamWidth: 50
      },
      controls: [
        { key: "fPrime", label: "像方焦距 f′", min: -180, max: 180, step: 2, unit: "mm", digits: 0 },
        { key: "rayAngle", label: "倾斜入射角 U", min: -18, max: 18, step: 1, unit: "°", digits: 0 },
        { key: "yF", label: "焦面物高 y_F", min: -40, max: 40, step: 1, unit: "mm", digits: 0 },
        { key: "beamWidth", label: "入射光束宽度", min: 20, max: 70, step: 2, unit: "mm", digits: 0 },
      ],
      rayModes: [
        { value: "parallel_axial", label: "① 轴上平行光束 ⇛ 聚焦像方焦点 F′" },
        { value: "focal_source", label: "② 物方焦点 F 发光 ⇛ 出射平行光束" },
        { value: "parallel_oblique", label: "③ 倾斜平行光束 (角U) ⇛ 聚焦焦面轴外点 F′_w" },
        { value: "focal_plane_point", label: "④ 物方焦面轴外点 (高y_F) ⇛ 倾斜平行光出射" }
      ]
    };
    this.params = Object.assign({}, this.config.defaults);
    this.render = this.render.bind(this);
    this._setupControls();
    this._unobserveResize = Sim.SimUtil.observeCanvas(this.canvas, this.render);
    this._renderUI();
  }
  destroy() { this._unobserveResize?.(); }
  reset() {
    Object.assign(this.params, this.config.defaults);
    const sel = this.controlsRoot.querySelector("#focalRayMode");
    if (sel) sel.value = this.params.rayMode;
    this._renderUI();
  }
  togglePlay() {}
  snapshot() {
    const a = document.createElement("a");
    a.download = `focal-points-${Date.now()}.png`;
    a.href = this.canvas.toDataURL("image/png");
    a.click();
  }
  _setupControls() {
    let html = `<div class="control-group"><div class="control-row"><span class="control-label" style="color:#22d3ee;">光束特征与演示模式</span></div><select id="focalRayMode" style="width:100%;padding:4px;background:#0f172a;color:#fff;border:1px solid rgba(255,255,255,0.2);border-radius:4px;margin-top:4px;">`;
    this.config.rayModes.forEach(opt => {
      html += `<option value="${opt.value}" ${this.params.rayMode === opt.value ? 'selected' : ''}>${opt.label}</option>`;
    });
    html += `</select></div>`;

    html += this.config.controls.map((g) =>
      `<div class="control-group"><div class="control-row"><span class="control-label">${g.label}</span><span class="control-value" id="val-${g.key}">${Sim.SimUtil.fmt(this.params[g.key], g.digits)}${g.unit ? ` ${g.unit}` : ""}</span></div><input type="range" min="${g.min}" max="${g.max}" step="${g.step}" value="${this.params[g.key]}" data-key="${g.key}" data-unit="${g.unit || ""}" data-digits="${g.digits}" /></div>`
    ).join("");

    this.controlsRoot.innerHTML = html;
    this.controlsRoot.querySelectorAll('input[type="range"]').forEach(input => {
      input.addEventListener("input", (e) => {
        let val = parseFloat(e.target.value);
        if (input.dataset.key === "fPrime" && Math.abs(val) < 20) val = val < 0 ? -20 : 20;
        this.params[input.dataset.key] = val;
        this._renderUI();
      });
    });
    this.controlsRoot.querySelector("#focalRayMode")?.addEventListener("change", (e) => {
      this.params.rayMode = e.target.value;
      this._renderUI();
    });
  }
  _renderReadouts() {
    const rawF = this.params.fPrime;
    const fP = Math.abs(rawF) < 15 ? (rawF >= 0 ? 15 : -15) : rawF;
    const f = -fP;
    const isPos = fP > 0;
    const radU = (this.params.rayAngle * Math.PI) / 180;
    const yF_prime = fP * Math.tan(radU);
    const radU_prime = Math.atan2(-this.params.yF, fP);
    const degU_prime = (radU_prime * 180) / Math.PI;

    const readoutsEl = document.getElementById("readouts");
    if (readoutsEl) readoutsEl.innerHTML = [
      ["物/像方主焦距", `f′ = ${fP > 0 ? "+" : ""}${fP.toFixed(0)} mm (${isPos ? "会聚正透镜" : "发散负透镜"})<br>f = ${f > 0 ? "+" : ""}${f.toFixed(0)} mm (同介质 f = -f′)`, isPos ? "var(--accent-green)" : "var(--accent-orange)"],
      ["像方焦面共轭关系", `y′_F = f′·tan U = ${yF_prime.toFixed(1)} mm<br>(倾角 U = ${this.params.rayAngle}°)`, "var(--accent-cyan)"],
      ["物方焦面共轭关系", `tan U′ = -y_F/f′ ⇛ U′ = ${degU_prime.toFixed(1)}°<br>(物方物高 y_F = ${this.params.yF.toFixed(1)} mm)`, "var(--accent-purple)"]
    ].map(x => `<div class="card"><div class="text-muted" style="font-size:11px;margin-bottom:4px;">${x[0]}</div><div class="text-mono" style="font-size:15px;line-height:1.4;color:${x[2]};">${x[1]}</div></div>`).join("");
  }
  _renderUI() {
    const digits = {};
    this.config.controls.forEach(g => { digits[g.key] = g.digits; });
    Sim.SimUtil.syncRangeControls(this.controlsRoot, this.params, { digits });
    this._renderReadouts();
    this.render();
  }
  render() {
    const { ctx, w, h } = Sim.SimUtil.setupCanvas(this.canvas);
    GeoDraw.clear(ctx, w, h);
    const p = this.params;
    const axisY = h * 0.44;
    const lensX = w * 0.50;
    const scale = 0.95;

    const rawF = p.fPrime;
    const fP = Math.abs(rawF) < 15 ? (rawF >= 0 ? 15 : -15) : rawF;
    const isPos = fP > 0;
    const f = -fP;

    // 光轴
    GeoDraw.line(ctx, { x: 25, y: axisY }, { x: w - 25, y: axisY }, "rgba(255,255,255,0.35)", 1.2, [6, 4]);

    // 薄透镜标准线与箭头 (加高至 190px，半高 95px)
    const lensHalfH = 95;
    drawThinLensArrow(ctx, lensX, axisY, lensHalfH * 2, isPos, isPos ? "薄透镜 (f′>0, 箭头向外)" : "薄透镜 (f′<0, 箭头向内)");

    // 焦距位置
    // 物方焦点 F 位于 lensX + f*scale = lensX - fP*scale
    const FX = lensX + f * scale;
    // 像方焦点 F' 位于 lensX + fP*scale
    const FPrimeX = lensX + fP * scale;

    const planeH = 95;
    // 物方焦平面
    GeoDraw.line(ctx, { x: FX, y: axisY - planeH }, { x: FX, y: axisY + planeH }, "rgba(74, 222, 128, 0.55)", 1.6, [4, 3]);
    ctx.fillStyle = "#4ade80"; ctx.beginPath(); ctx.arc(FX, axisY, 4, 0, GeoDraw.TAU); ctx.fill();
    GeoDraw.label(ctx, "F (物方焦点)", FX, axisY + 16, "#4ade80", "center", 12);
    GeoDraw.label(ctx, "物方焦平面", FX, axisY - planeH - 8, "#4ade80", "center", 11);

    // 像方焦平面
    GeoDraw.line(ctx, { x: FPrimeX, y: axisY - planeH }, { x: FPrimeX, y: axisY + planeH }, "rgba(34, 211, 238, 0.55)", 1.6, [4, 3]);
    ctx.fillStyle = "#22d3ee"; ctx.beginPath(); ctx.arc(FPrimeX, axisY, 4, 0, GeoDraw.TAU); ctx.fill();
    GeoDraw.label(ctx, "F′ (像方焦点)", FPrimeX, axisY + 16, "#22d3ee", "center", 12);
    GeoDraw.label(ctx, "像方焦平面", FPrimeX, axisY - planeH - 8, "#22d3ee", "center", 11);

    // 尺寸标注 -f 与 f'
    const dimY = axisY + 45;
    drawDimLine(ctx, lensX, FX, dimY, `f = ${f > 0 ? "+" : ""}${f.toFixed(0)}`, "#4ade80");
    drawDimLine(ctx, lensX, FPrimeX, dimY + 24, `f′ = ${fP > 0 ? "+" : ""}${fP.toFixed(0)}`, "#22d3ee");

    // 模式光线追迹
    const radU = (p.rayAngle * Math.PI) / 180;
    const yF_prime = fP * Math.tan(radU);
    const radU_prime = Math.atan2(-p.yF, fP);

    // 物方焦平面物高标记
    ctx.fillStyle = "#4ade80"; ctx.beginPath(); ctx.arc(FX, axisY - p.yF * scale, 3.5, 0, GeoDraw.TAU); ctx.fill();
    GeoDraw.label(ctx, `y_F=${p.yF.toFixed(0)}`, FX - 8, axisY - p.yF * scale, "#4ade80", "right", 10);

    // 像方焦平面共轭焦点标记
    ctx.fillStyle = "#22d3ee"; ctx.beginPath(); ctx.arc(FPrimeX, axisY - yF_prime * scale, 3.5, 0, GeoDraw.TAU); ctx.fill();
    GeoDraw.label(ctx, `y′_F=${yF_prime.toFixed(1)}`, FPrimeX + 8, axisY - yF_prime * scale, "#22d3ee", "left", 10);

    if (p.rayMode === "parallel_axial") {
      // 轴上平行光
      const halfB = p.beamWidth / 2;
      const ys = [-halfB, -halfB / 2, 0, halfB / 2, halfB];
      ys.forEach(yy => {
        const inY = axisY + yy;
        GeoDraw.line(ctx, { x: 30, y: inY }, { x: lensX, y: inY }, "#38bdf8", 1.8);
        if (isPos) {
          // 正透镜: 会聚于实焦点 F'
          GeoDraw.line(ctx, { x: lensX, y: inY }, { x: FPrimeX, y: axisY }, "#38bdf8", 1.8);
          GeoDraw.line(ctx, { x: FPrimeX, y: axisY }, { x: Math.min(w - 30, FPrimeX + 90), y: axisY - yy * 0.7 }, "#38bdf8", 1.4);
        } else {
          // 负透镜: 发散，反向延长线过虚焦点 F'
          const outSlope = (axisY - inY) / (FPrimeX - lensX);
          const outEndX = w - 40;
          const outEndY = inY + outSlope * (outEndX - lensX);
          GeoDraw.line(ctx, { x: lensX, y: inY }, { x: outEndX, y: outEndY }, "#38bdf8", 1.8);
          GeoDraw.line(ctx, { x: lensX, y: inY }, { x: FPrimeX, y: axisY }, "rgba(56, 189, 248, 0.4)", 1.2, [3, 3]);
        }
      });
    } else if (p.rayMode === "focal_source") {
      // 物方焦点发出光线
      const angles = [-16, -8, 0, 8, 16];
      angles.forEach(ang => {
        const rad = (ang * Math.PI) / 180;
        const hitY = axisY - Math.tan(rad) * (lensX - FX);
        if (Math.abs(hitY - axisY) <= 65) {
          GeoDraw.line(ctx, { x: FX, y: axisY }, { x: lensX, y: hitY }, "#fbbf24", 1.8);
          GeoDraw.line(ctx, { x: lensX, y: hitY }, { x: w - 30, y: hitY }, "#fbbf24", 1.8);
        }
      });
    } else if (p.rayMode === "parallel_oblique") {
      // 倾斜平行光束 (斜向下 U>0 严格汇聚于焦平面光轴下方 yF' = +f'*tanU)
      const focalSpotY = axisY + yF_prime * scale;
      ctx.fillStyle = "#f59e0b"; ctx.beginPath(); ctx.arc(FPrimeX, focalSpotY, 4.5, 0, GeoDraw.TAU); ctx.fill();
      GeoDraw.label(ctx, "F′_w (轴外像方焦点)", FPrimeX + 8, focalSpotY + (focalSpotY >= axisY ? 14 : -12), "#f59e0b", "left", 11);

      const halfB = p.beamWidth / 2;
      const offsets = [-halfB, 0, halfB];
      offsets.forEach(off => {
        const hitY = axisY + off;
        const startX = 35;
        // 入射光线: radU > 0 时光线向下倾斜传播 (startX 处 startY < hitY)
        const startY = hitY - Math.tan(radU) * (lensX - startX);
        GeoDraw.line(ctx, { x: startX, y: startY }, { x: lensX, y: hitY }, "#38bdf8", 1.8);
        if (isPos) {
          // 正透镜: 光束实交会于像方焦平面下方轴外点 F'_w
          GeoDraw.line(ctx, { x: lensX, y: hitY }, { x: FPrimeX, y: focalSpotY }, "#38bdf8", 1.8);
          GeoDraw.line(ctx, { x: FPrimeX, y: focalSpotY }, { x: Math.min(w - 30, FPrimeX + 80), y: focalSpotY + (focalSpotY - hitY) * 0.4 }, "#38bdf8", 1.4);
        } else {
          // 负透镜: 发散出射，反向延长线交会于虚焦点 F'_w
          const outSlope = (hitY - focalSpotY) / (lensX - FPrimeX);
          const outEndX = w - 40;
          const outEndY = hitY + outSlope * (outEndX - lensX);
          GeoDraw.line(ctx, { x: lensX, y: hitY }, { x: outEndX, y: outEndY }, "#38bdf8", 1.8);
          GeoDraw.line(ctx, { x: lensX, y: hitY }, { x: FPrimeX, y: focalSpotY }, "rgba(56, 189, 248, 0.4)", 1.2, [3, 3]);
        }
      });
      GeoDraw.line(ctx, { x: lensX - 70, y: axisY }, { x: lensX, y: axisY }, "rgba(255,255,255,0.25)", 1, [2, 2]);
      GeoDraw.label(ctx, `倾角 U = ${p.rayAngle}° (斜向${p.rayAngle >= 0 ? "下" : "上"})`, lensX - 45, axisY - 14, "#38bdf8", "center", 11);
    } else if (p.rayMode === "focal_plane_point") {
      // 物方焦平面轴外发光点 (yF>0 在光轴上方，出射平行光斜向下倾斜)
      const sourceY = axisY - p.yF * scale;
      ctx.fillStyle = "#a78bfa"; ctx.beginPath(); ctx.arc(FX, sourceY, 4.5, 0, GeoDraw.TAU); ctx.fill();
      GeoDraw.label(ctx, "F_w (物方焦面物点)", FX - 8, sourceY - 6, "#a78bfa", "right", 11);

      const hitOffsets = [-40, -10, 20, 50];
      const outSlope = p.yF / fP; // 通过透镜中心 (lensX, axisY) 的光线斜率 (向下倾斜)
      hitOffsets.forEach(off => {
        const hitY = axisY + off;
        GeoDraw.line(ctx, { x: FX, y: sourceY }, { x: lensX, y: hitY }, "#a78bfa", 1.8);
        const outEndX = w - 30;
        const outEndY = hitY + outSlope * (outEndX - lensX);
        GeoDraw.line(ctx, { x: lensX, y: hitY }, { x: outEndX, y: outEndY }, "#a78bfa", 1.8);
      });
      const degU_prime = -(Math.atan(p.yF / fP) * 180 / Math.PI);
      GeoDraw.label(ctx, `出射倾角 U′ = ${degU_prime.toFixed(1)}° (斜向${degU_prime <= 0 ? "下" : "上"})`, w - 160, axisY + 80, "#a78bfa", "left", 11);
    }

    GeoDraw.panel(ctx, 25, h - 85, w - 50, 72, [
      `焦点与焦平面核心性质 (教材第 16 页 §2.1)`,
      `① 轴上焦点: 平行光轴入射的光线聚于像方焦点 F′；物方焦点 F 发出的光线经系统折射后平行于光轴出射。`,
      `② 焦平面共轭: 像方焦平面上轴外聚焦点满足 y′_F = f′·tan U；物方焦平面上轴外发光点出射倾角满足 tan U′ = -y_F/f′。`,
      `③ 实虚判定: 当 f′>0 (正透镜) 为实焦点，折射光真实交会；当 f′<0 (负透镜) 为虚焦点，由折射光反向延长线交会。`
    ], "#38bdf8");
  }
}

// -----------------------------------------------------------------------
// 2. 主点与主平面独立示意模型 (教材 P16 §2.1)
// -----------------------------------------------------------------------
class PrincipalPointsSim {
  constructor(canvasId, controlsId) {
    this.canvas = document.getElementById(canvasId);
    this.controlsRoot = document.getElementById(controlsId);
    this.config = {
      defaults: {
        fPrime: 130,
        dH: 40,
        h: 35,
        rayAngle: -10,
        showConjugateObj: true
      },
      controls: [
        { key: "fPrime", label: "焦距 f′", min: 70, max: 200, step: 1, unit: "mm", digits: 0 },
        { key: "dH", label: "主面间距 d_H", min: -30, max: 80, step: 1, unit: "mm", digits: 0 },
        { key: "h", label: "光线入射主面高度 h", min: -60, max: 60, step: 1, unit: "mm", digits: 0 },
        { key: "rayAngle", label: "入射角 U", min: -25, max: 25, step: 1, unit: "°", digits: 0 },
      ]
    };
    this.params = Object.assign({}, this.config.defaults);
    this.render = this.render.bind(this);
    this._setupControls();
    this._unobserveResize = Sim.SimUtil.observeCanvas(this.canvas, this.render);
    this._renderUI();
  }
  destroy() { this._unobserveResize?.(); }
  reset() {
    Object.assign(this.params, this.config.defaults);
    const cb = this.controlsRoot.querySelector("#chkObjBeta");
    if (cb) cb.checked = this.params.showConjugateObj;
    this._renderUI();
  }
  togglePlay() {}
  snapshot() {
    const a = document.createElement("a");
    a.download = `principal-points-${Date.now()}.png`;
    a.href = this.canvas.toDataURL("image/png");
    a.click();
  }
  _setupControls() {
    let html = `<div class="control-group"><label style="display:flex;align-items:center;gap:8px;cursor:pointer;color:#fbbf24;"><input type="checkbox" id="chkObjBeta" ${this.params.showConjugateObj ? "checked" : ""} /> 在主面上放置物体测试共轭像 (验证 β = +1)</label></div>`;

    html += this.config.controls.map((g) =>
      `<div class="control-group"><div class="control-row"><span class="control-label">${g.label}</span><span class="control-value" id="val-${g.key}">${Sim.SimUtil.fmt(this.params[g.key], g.digits)}${g.unit ? ` ${g.unit}` : ""}</span></div><input type="range" min="${g.min}" max="${g.max}" step="${g.step}" value="${this.params[g.key]}" data-key="${g.key}" data-unit="${g.unit || ""}" data-digits="${g.digits}" /></div>`
    ).join("");

    this.controlsRoot.innerHTML = html;
    this.controlsRoot.querySelectorAll('input[type="range"]').forEach(input => {
      input.addEventListener("input", (e) => {
        this.params[input.dataset.key] = parseFloat(e.target.value);
        this._renderUI();
      });
    });
    this.controlsRoot.querySelector("#chkObjBeta")?.addEventListener("change", (e) => {
      this.params.showConjugateObj = e.target.checked;
      this._renderUI();
    });
  }
  _renderUI() {
    const digits = {};
    this.config.controls.forEach(g => { digits[g.key] = g.digits; });
    Sim.SimUtil.syncRangeControls(this.controlsRoot, this.params, { digits });

    const p = this.params;
    const radU = (p.rayAngle * Math.PI) / 180;
    const tanU = Math.tan(radU);
    const tanU_prime = tanU - p.h / p.fPrime;
    const degU_prime = (Math.atan(tanU_prime) * 180) / Math.PI;

    let spacingDesc = "正常正向光组 (d_H > 0)";
    if (Math.abs(p.dH) < 1) spacingDesc = "薄透镜极限 (d_H = 0，主平面重合)";
    else if (p.dH < 0) spacingDesc = "主面交叉系统 (d_H < 0，如厚凹透镜或反远距)";

    const readoutsEl = document.getElementById("readouts");
    if (readoutsEl) readoutsEl.innerHTML = [
      ["主面截距高度传递", `物主面高度 h = ${p.h.toFixed(1)} mm<br>像主面高度 h′ = ${p.h.toFixed(1)} mm (严格等高 h′≡h)`, "var(--accent-cyan)"],
      ["垂轴放大率 β (定义)", `β = y′_H / y_H = +1.000<br>(共轭像大小相等、方向相同)`, "var(--accent-green)"],
      ["主平面间距状态", `d_H = ${p.dH.toFixed(1)} mm<br>${spacingDesc}`, "var(--accent-orange)"]
    ].map(x => `<div class="card"><div class="text-muted" style="font-size:11px;margin-bottom:4px;">${x[0]}</div><div class="text-mono" style="font-size:15px;line-height:1.4;color:${x[2]};">${x[1]}</div></div>`).join("");

    this.render();
  }
  render() {
    const { ctx, w, h } = Sim.SimUtil.setupCanvas(this.canvas);
    GeoDraw.clear(ctx, w, h);
    const p = this.params;
    const axisY = h * 0.44;
    const cx = w * 0.48;
    const scale = 0.95;

    // 光轴
    GeoDraw.line(ctx, { x: 25, y: axisY }, { x: w - 25, y: axisY }, "rgba(255,255,255,0.35)", 1.2, [6, 4]);

    const HX = cx - (p.dH / 2) * scale;
    const HPrimeX = cx + (p.dH / 2) * scale;
    const FX = HX - p.fPrime * scale;
    const FPrimeX = HPrimeX + p.fPrime * scale;

    const planeH = Math.min(axisY - 20, Math.max(100, Math.abs(p.h) + 36));

    // 物方主平面
    ctx.save();
    ctx.shadowColor = "#38bdf8"; ctx.shadowBlur = 8;
    GeoDraw.line(ctx, { x: HX, y: axisY - planeH }, { x: HX, y: axisY + planeH }, "#38bdf8", 2.2);
    ctx.restore();
    ctx.fillStyle = "#38bdf8"; ctx.beginPath(); ctx.arc(HX, axisY, 4.5, 0, GeoDraw.TAU); ctx.fill();
    GeoDraw.label(ctx, "H (物方主点)", HX, axisY + 18, "#38bdf8", "center", 12);
    GeoDraw.label(ctx, "物方主平面 (β=+1)", HX, axisY - planeH - 8, "#38bdf8", "center", 11);

    // 像方主平面
    ctx.save();
    ctx.shadowColor = "#38bdf8"; ctx.shadowBlur = 8;
    GeoDraw.line(ctx, { x: HPrimeX, y: axisY - planeH }, { x: HPrimeX, y: axisY + planeH }, "#38bdf8", 2.2);
    ctx.restore();
    ctx.fillStyle = "#38bdf8"; ctx.beginPath(); ctx.arc(HPrimeX, axisY, 4.5, 0, GeoDraw.TAU); ctx.fill();
    GeoDraw.label(ctx, "H′ (像方主点)", HPrimeX, axisY + 18, "#38bdf8", "center", 12);
    GeoDraw.label(ctx, "像方主平面 (β=+1)", HPrimeX, axisY - planeH - 8, "#38bdf8", "center", 11);

    // 标出焦点
    ctx.fillStyle = "#4ade80"; ctx.beginPath(); ctx.arc(FX, axisY, 3.5, 0, GeoDraw.TAU); ctx.fill();
    GeoDraw.label(ctx, "F", FX, axisY + 16, "#4ade80", "center", 11);
    ctx.fillStyle = "#4ade80"; ctx.beginPath(); ctx.arc(FPrimeX, axisY, 3.5, 0, GeoDraw.TAU); ctx.fill();
    GeoDraw.label(ctx, "F′", FPrimeX, axisY + 16, "#4ade80", "center", 11);

    // 尺寸标注
    if (Math.abs(HPrimeX - HX) > 10) {
      drawDimLine(ctx, HX, HPrimeX, axisY + 45, `d_H = ${p.dH}`, "#94a3b8");
    }
    drawDimLine(ctx, HX, FX, axisY + 68, `-f = ${p.fPrime}`, "#4ade80");
    drawDimLine(ctx, HPrimeX, FPrimeX, axisY + 68, `f′ = ${p.fPrime}`, "#22d3ee");

    // 入射光线追迹
    const radU = (p.rayAngle * Math.PI) / 180;
    const tanU = Math.tan(radU);
    const Q = { x: HX, y: axisY - p.h };
    const Q_prime = { x: HPrimeX, y: axisY - p.h };

    const startX = 35;
    const startY = Q.y - tanU * (HX - startX);
    GeoDraw.line(ctx, { x: startX, y: startY }, Q, "#fbbf24", 2);

    // 等高横传光线: 核心展示点！
    GeoDraw.line(ctx, Q, Q_prime, "#fbbf24", 2.2, [4, 3]);
    GeoDraw.label(ctx, `h = ${p.h} mm`, HX - 8, Q.y - 6, "#38bdf8", "right", 11);
    GeoDraw.label(ctx, `h′ = ${p.h} mm`, HPrimeX + 8, Q_prime.y - 6, "#38bdf8", "left", 11);
    ctx.fillStyle = "#fbbf24"; ctx.beginPath(); ctx.arc(Q.x, Q.y, 4, 0, GeoDraw.TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(Q_prime.x, Q_prime.y, 4, 0, GeoDraw.TAU); ctx.fill();
    GeoDraw.label(ctx, "Q", Q.x - 12, Q.y - 4, "#fbbf24", "center", 12);
    GeoDraw.label(ctx, "Q′", Q_prime.x + 12, Q_prime.y - 4, "#fbbf24", "center", 12);

    // 出射光线: 正透镜使光线偏向光轴，画布 y 轴向下，偏向光轴意味着斜率增加 +h/f'
    const outSlope = tanU + p.h / p.fPrime;
    const outEndX = w - 30;
    const outEndY = Q_prime.y + outSlope * (outEndX - HPrimeX);
    GeoDraw.line(ctx, Q_prime, { x: outEndX, y: outEndY }, "#fbbf24", 2);

    // 辅助展示: 共轭物体测试 (放在主面上)
    if (p.showConjugateObj) {
      const objH = 45;
      GeoDraw.drawArrowObject(ctx, HX, axisY, objH, "#a78bfa", "物 y_H");
      GeoDraw.drawArrowObject(ctx, HPrimeX, axisY, objH, "#a78bfa", "像 y′_H");
      GeoDraw.line(ctx, { x: HX, y: axisY - objH }, { x: HPrimeX, y: axisY - objH }, "rgba(167, 139, 250, 0.4)", 1.2, [3, 3]);
      GeoDraw.label(ctx, "β = y′_H / y_H = +1.000", (HX + HPrimeX) / 2, axisY - objH - 12, "#a78bfa", "center", 12);
    }

    GeoDraw.panel(ctx, 25, h - 85, w - 50, 72, [
      `主点与主平面核心性质 (教材第 16 页 §2.1)`,
      `① 垂轴放大率 β = +1 的共轭平面: 主平面上物点与像点大小完全相等、方向严格相同 (y′_H ≡ y_H)。`,
      `② 等高传递规律: 任何光线入射到物方主面的交点高度 h，折射后必由像方主面完全相同的高度 h′ 出射 (h′ ≡ h)。`,
      `③ 距离测量基准: 理想光学系统中，物距 l 恒以物主点 H 为度量原点；像距 l′ 恒以像主点 H′ 为度量原点。`
    ], "#38bdf8");
  }
}

// -----------------------------------------------------------------------
// 3. 节点与节平面独立示意模型 (教材 P16 §2.1)
// -----------------------------------------------------------------------
class NodalPointsSim {
  constructor(canvasId, controlsId) {
    this.canvas = document.getElementById(canvasId);
    this.controlsRoot = document.getElementById(controlsId);
    this.config = {
      defaults: {
        n: 1.00,
        nPrime: 1.336,
        fPrime: 120,
        dH: 35,
        rayAngle: 12,
        mediumPreset: "human_eye"
      },
      controls: [
        { key: "n", label: "物方折射率 n", min: 1.00, max: 2.00, step: 0.01, digits: 3 },
        { key: "nPrime", label: "像方折射率 n′", min: 1.00, max: 2.00, step: 0.01, digits: 3 },
        { key: "fPrime", label: "像方焦距 f′", min: 60, max: 180, step: 1, unit: "mm", digits: 0 },
        { key: "dH", label: "主面间距 d_H", min: 10, max: 70, step: 1, unit: "mm", digits: 0 },
        { key: "rayAngle", label: "节点入射角 U", min: -25, max: 25, step: 1, unit: "°", digits: 0 },
      ],
      presets: [
        { value: "human_eye", label: "人眼光学模型 (n=1.000 空气, n′=1.336 房水/玻璃体)", n: 1.00, nPrime: 1.336 },
        { value: "air_air", label: "物像同在空气中 (n=1.000, n′=1.000)", n: 1.00, nPrime: 1.00 },
        { value: "underwater", label: "水下摄录物镜 (n=1.333 水, n′=1.000 空气)", n: 1.333, nPrime: 1.00 },
        { value: "oil_immersion", label: "油浸显微系统 (n=1.515 浸油, n′=1.000 空气)", n: 1.515, nPrime: 1.00 },
        { value: "custom", label: "自定义物像方介质", n: null, nPrime: null }
      ]
    };
    this.params = Object.assign({}, this.config.defaults);
    this.render = this.render.bind(this);
    this._setupControls();
    this._unobserveResize = Sim.SimUtil.observeCanvas(this.canvas, this.render);
    this._renderUI();
  }
  destroy() { this._unobserveResize?.(); }
  reset() {
    Object.assign(this.params, this.config.defaults);
    const sel = this.controlsRoot.querySelector("#nodalPreset");
    if (sel) sel.value = this.params.mediumPreset;
    this._renderUI();
  }
  togglePlay() {}
  snapshot() {
    const a = document.createElement("a");
    a.download = `nodal-points-${Date.now()}.png`;
    a.href = this.canvas.toDataURL("image/png");
    a.click();
  }
  _setupControls() {
    let html = `<div class="control-group"><div class="control-row"><span class="control-label" style="color:#fbbf24;">介质组合预设</span></div><select id="nodalPreset" style="width:100%;padding:4px;background:#0f172a;color:#fff;border:1px solid rgba(255,255,255,0.2);border-radius:4px;margin-top:4px;">`;
    this.config.presets.forEach(opt => {
      html += `<option value="${opt.value}" ${this.params.mediumPreset === opt.value ? 'selected' : ''}>${opt.label}</option>`;
    });
    html += `</select></div>`;

    html += this.config.controls.map((g) =>
      `<div class="control-group"><div class="control-row"><span class="control-label">${g.label}</span><span class="control-value" id="val-${g.key}">${Sim.SimUtil.fmt(this.params[g.key], g.digits)}${g.unit ? ` ${g.unit}` : ""}</span></div><input type="range" min="${g.min}" max="${g.max}" step="${g.step}" value="${this.params[g.key]}" data-key="${g.key}" data-unit="${g.unit || ""}" data-digits="${g.digits}" /></div>`
    ).join("");

    this.controlsRoot.innerHTML = html;
    this.controlsRoot.querySelectorAll('input[type="range"]').forEach(input => {
      input.addEventListener("input", (e) => {
        this.params[input.dataset.key] = parseFloat(e.target.value);
        if (input.dataset.key === "n" || input.dataset.key === "nPrime") {
          this.params.mediumPreset = "custom";
          const sel = this.controlsRoot.querySelector("#nodalPreset");
          if (sel) sel.value = "custom";
        }
        this._renderUI();
      });
    });
    this.controlsRoot.querySelector("#nodalPreset")?.addEventListener("change", (e) => {
      this.params.mediumPreset = e.target.value;
      const found = this.config.presets.find(m => m.value === e.target.value);
      if (found && found.n !== null) {
        this.params.n = found.n;
        this.params.nPrime = found.nPrime;
      }
      this._renderUI();
    });
  }
  _renderUI() {
    const digits = {};
    this.config.controls.forEach(g => { digits[g.key] = g.digits; });
    Sim.SimUtil.syncRangeControls(this.controlsRoot, this.params, { digits });

    const { n, nPrime, fPrime } = this.params;
    const f = (-fPrime * n) / nPrime;
    const deltaJ = f + fPrime;
    const isSameMedium = Math.abs(n - nPrime) < 1e-4;

    const readoutsEl = document.getElementById("readouts");
    if (readoutsEl) readoutsEl.innerHTML = [
      ["物像方焦距 (式2-1)", `f′ = ${fPrime.toFixed(1)} mm<br>f = ${f.toFixed(1)} mm (f′/f = -n′/n)`, "var(--accent-green)"],
      ["节点位移 Δ_J (式2-3)", isSameMedium ? "0.0 mm (节点与主面完全重合)" : `${deltaJ > 0 ? "+" : ""}${deltaJ.toFixed(1)} mm (节点相对主面平移)`, isSameMedium ? "var(--accent-cyan)" : "var(--accent-orange)"],
      ["角放大率 γ (定义)", `γ = tan U′ / tan U = +1.000<br>(过节点光线方向恒定保持平行)`, "var(--accent-purple)"]
    ].map(x => `<div class="card"><div class="text-muted" style="font-size:11px;margin-bottom:4px;">${x[0]}</div><div class="text-mono" style="font-size:15px;line-height:1.4;color:${x[2]};">${x[1]}</div></div>`).join("");

    this.render();
  }
  render() {
    const { ctx, w, h } = Sim.SimUtil.setupCanvas(this.canvas);
    GeoDraw.clear(ctx, w, h);
    const p = this.params;
    const axisY = h * 0.44;
    const cx = w * 0.48;
    const scale = 0.95;

    const f = (-p.fPrime * p.n) / p.nPrime;
    const deltaJ = f + p.fPrime;
    const isSameMedium = Math.abs(p.n - p.nPrime) < 1e-4;

    // 两侧介质着色
    ctx.fillStyle = "rgba(56, 189, 248, 0.04)";
    ctx.fillRect(0, 0, cx, h);
    ctx.fillStyle = p.nPrime > 1.2 ? "rgba(167, 139, 250, 0.07)" : "rgba(56, 189, 248, 0.04)";
    ctx.fillRect(cx, 0, w - cx, h);

    GeoDraw.label(ctx, `物方介质 n = ${p.n.toFixed(3)}`, 40, 35, "#38bdf8", "left", 13);
    GeoDraw.label(ctx, `像方介质 n′ = ${p.nPrime.toFixed(3)}`, w - 40, 35, "#a78bfa", "right", 13);

    // 光轴
    GeoDraw.line(ctx, { x: 25, y: axisY }, { x: w - 25, y: axisY }, "rgba(255,255,255,0.35)", 1.2, [6, 4]);

    const HX = cx - (p.dH / 2) * scale;
    const HPrimeX = cx + (p.dH / 2) * scale;
    const JX = HX + deltaJ * scale;
    const JPrimeX = HPrimeX + deltaJ * scale;

    const planeH = 105;

    // 主平面 (虚线)
    GeoDraw.line(ctx, { x: HX, y: axisY - planeH }, { x: HX, y: axisY + planeH }, "rgba(56, 189, 248, 0.4)", 1.5, [4, 3]);
    GeoDraw.line(ctx, { x: HPrimeX, y: axisY - planeH }, { x: HPrimeX, y: axisY + planeH }, "rgba(56, 189, 248, 0.4)", 1.5, [4, 3]);
    ctx.fillStyle = "#38bdf8"; ctx.beginPath(); ctx.arc(HX, axisY, 3.5, 0, GeoDraw.TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(HPrimeX, axisY, 3.5, 0, GeoDraw.TAU); ctx.fill();
    GeoDraw.label(ctx, "H", HX, axisY + 16, "#38bdf8", "center", 12);
    GeoDraw.label(ctx, "H′", HPrimeX, axisY + 16, "#38bdf8", "center", 12);

    // 节平面 (高亮实线)
    ctx.save();
    ctx.shadowColor = "#fbbf24"; ctx.shadowBlur = 8;
    GeoDraw.line(ctx, { x: JX, y: axisY - planeH }, { x: JX, y: axisY + planeH }, "#fbbf24", 2.2);
    GeoDraw.line(ctx, { x: JPrimeX, y: axisY - planeH }, { x: JPrimeX, y: axisY + planeH }, "#fbbf24", 2.2);
    ctx.restore();
    ctx.fillStyle = "#fbbf24"; ctx.beginPath(); ctx.arc(JX, axisY, 5, 0, GeoDraw.TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(JPrimeX, axisY, 5, 0, GeoDraw.TAU); ctx.fill();
    GeoDraw.label(ctx, "J (物方节点)", JX, axisY - 14, "#fbbf24", "center", 12);
    GeoDraw.label(ctx, "J′ (像方节点)", JPrimeX, axisY - 14, "#fbbf24", "center", 12);
    GeoDraw.label(ctx, "节平面 (γ=+1)", JX, axisY - planeH - 8, "#fbbf24", "center", 11);
    GeoDraw.label(ctx, "节平面 (γ=+1)", JPrimeX, axisY - planeH - 8, "#fbbf24", "center", 11);

    // 标注位移 Δ_J
    if (!isSameMedium && Math.abs(JX - HX) > 8) {
      drawDimLine(ctx, HX, JX, axisY + 45, `Δ_J = ${deltaJ > 0 ? "+" : ""}${deltaJ.toFixed(1)}`, "#fbbf24");
      drawDimLine(ctx, HPrimeX, JPrimeX, axisY + 45, `Δ_J = ${deltaJ > 0 ? "+" : ""}${deltaJ.toFixed(1)}`, "#fbbf24");
    }

    // 节点光线追迹 (斜角 U>0 斜向下，γ=+1 出射方向与入射方向严格平行)
    const radU = (p.rayAngle * Math.PI) / 180;
    const tanU = Math.tan(radU);

    // 直线过 (JX, axisY)，在物方主面 H 处的交截高度: y(x) = axisY + tanU * (x - JX)
    const yH = axisY + tanU * (HX - JX);
    const Q_H = { x: HX, y: yH };
    const Q_HPrime = { x: HPrimeX, y: yH };

    const startX = 35;
    const startY = axisY + tanU * (startX - JX);

    // 入射光线 (自左侧瞄准 J 射向物方主面 H)
    GeoDraw.line(ctx, { x: startX, y: startY }, Q_H, "#4ade80", 2);

    // 若 J 位于 H 右侧 (虚节点)，绘制虚线延长交会
    if (JX > HX) {
      GeoDraw.line(ctx, Q_H, { x: JX, y: axisY }, "rgba(74, 222, 128, 0.45)", 1.2, [4, 3]);
    }

    // 主面间等高传递
    GeoDraw.line(ctx, Q_H, Q_HPrime, "#4ade80", 1.8, [4, 3]);

    // 出射光线: 直线过 (JPrimeX, axisY) 且斜率恒为 +tanU，方向严格平行 (γ = +1)
    const outEndX = w - 35;
    const outEndY = axisY + tanU * (outEndX - JPrimeX);

    // 若 J' 位于 H' 左侧 (虚节点)，绘制虚线延长交会
    if (JPrimeX < HPrimeX) {
      GeoDraw.line(ctx, { x: JPrimeX, y: axisY }, Q_HPrime, "rgba(74, 222, 128, 0.45)", 1.2, [4, 3]);
    }
    GeoDraw.line(ctx, Q_HPrime, { x: outEndX, y: outEndY }, "#4ade80", 2);

    // 角度弧线标示
    GeoDraw.label(ctx, `入射角 U = ${p.rayAngle}°`, JX - 40, axisY + 28, "#4ade80", "right", 11);
    GeoDraw.label(ctx, `出射角 U′ = ${p.rayAngle}°`, JPrimeX + 40, axisY + 28, "#4ade80", "left", 11);

    GeoDraw.panel(ctx, 25, h - 85, w - 50, 72, [
      `节点与节平面核心性质 (教材第 16 页 §2.1 式 2-3)`,
      `① 角放大率 γ = +1 的共轭点: 凡通过物方节点 J 入射的光线，折射后必通过像方节点 J′，且方向严格互相平行 (U′ ≡ U)。`,
      `② 介质影响规律: 当 n = n′ (同一介质) 时，节点与主点完全重合 (J ≡ H, J′ ≡ H′)；当 n ≠ n′ (如人眼或潜水镜) 时，节点相对主面平移 Δ_J = f + f′。`,
      `③ 节点坐标位置: 物方节点坐标 x_J = f′；像方节点坐标 x′_J = f。`
    ], isSameMedium ? "#38bdf8" : "#fbbf24");
  }
}

// -----------------------------------------------------------------------
// 4. 基点基面综合全景模型 (教材 P16 §2.1)
// -----------------------------------------------------------------------
class CardinalPointsSim {
  constructor(canvasId, controlsId) {
    this.canvas = document.getElementById(canvasId);
    this.controlsRoot = document.getElementById(controlsId);
    this.config = {
      defaults: {
        fPrime: 120,
        n: 1.00,
        nPrime: 1.50,
        dH: 35,
        objL: -200,
        objY: 45,
        rayMode: "all"
      },
      controls: [
        { key: "fPrime", label: "像方焦距 f′", min: 60, max: 200, step: 1, unit: "mm", digits: 0 },
        { key: "n", label: "物方介质折射率 n", min: 1.00, max: 2.00, step: 0.05, digits: 2 },
        { key: "nPrime", label: "像方介质折射率 n′", min: 1.00, max: 2.00, step: 0.05, digits: 2 },
        { key: "dH", label: "主面间距 d_H", min: 10, max: 80, step: 1, unit: "mm", digits: 0 },
        { key: "objL", label: "物距 l", min: -350, max: -70, step: 1, unit: "mm", digits: 0 },
        { key: "objY", label: "物高 y", min: -60, max: 60, step: 1, unit: "mm", digits: 0 },
      ],
      rayOptions: [
        { value: "all", label: "全套特征光线 (焦点·主面·节点)" },
        { value: "focal", label: "焦点特征光线 (过F与平行光)" },
        { value: "principal", label: "主面等高光线 (β = +1)" },
        { value: "nodal", label: "节点平行光线 (γ = +1)" }
      ]
    };
    this.params = Object.assign({}, this.config.defaults);
    this.render = this.render.bind(this);
    this._setupControls();
    this._unobserveResize = Sim.SimUtil.observeCanvas(this.canvas, this.render);
    this._renderUI();
  }
  destroy() { this._unobserveResize?.(); }
  reset() {
    Object.assign(this.params, this.config.defaults);
    const sel = this.controlsRoot.querySelector("#rayModeSelect");
    if (sel) sel.value = this.params.rayMode;
    this._renderUI();
  }
  togglePlay() {}
  snapshot() {
    const a = document.createElement("a");
    a.download = `cardinal-points-${Date.now()}.png`;
    a.href = this.canvas.toDataURL("image/png");
    a.click();
  }
  _setupControls() {
    let html = `<div class="control-group"><div class="control-row"><span class="control-label" style="color:#22d3ee;">光线显示模式</span></div><select id="rayModeSelect" style="width:100%;padding:4px;background:#0f172a;color:#fff;border:1px solid rgba(255,255,255,0.2);border-radius:4px;margin-top:4px;">`;
    this.config.rayOptions.forEach(opt => {
      html += `<option value="${opt.value}" ${this.params.rayMode === opt.value ? 'selected' : ''}>${opt.label}</option>`;
    });
    html += `</select></div>`;

    html += this.config.controls.map((g) =>
      `<div class="control-group"><div class="control-row"><span class="control-label">${g.label}</span><span class="control-value" id="val-${g.key}">${Sim.SimUtil.fmt(this.params[g.key], g.digits)}${g.unit ? ` ${g.unit}` : ""}</span></div><input type="range" min="${g.min}" max="${g.max}" step="${g.step}" value="${this.params[g.key]}" data-key="${g.key}" data-unit="${g.unit || ""}" data-digits="${g.digits}" /></div>`
    ).join("");

    this.controlsRoot.innerHTML = html;
    this.controlsRoot.querySelectorAll('input[type="range"]').forEach(input => {
      input.addEventListener("input", (e) => {
        this.params[input.dataset.key] = parseFloat(e.target.value);
        this._renderUI();
      });
    });
    this.controlsRoot.querySelector("#rayModeSelect")?.addEventListener("change", (e) => {
      this.params.rayMode = e.target.value;
      this._renderUI();
    });
  }
  _renderUI() {
    const digits = {};
    this.config.controls.forEach(g => { digits[g.key] = g.digits; });
    Sim.SimUtil.syncRangeControls(this.controlsRoot, this.params, { digits });

    const { fPrime, n, nPrime, objL } = this.params;
    const f = (-fPrime * n) / nPrime;
    const deltaJ = f + fPrime;
    const denom = fPrime / f + fPrime / objL;
    let lPrime = Infinity;
    if (Math.abs(denom) > 1e-5) {
      lPrime = fPrime / (1 - (f / objL));
    }
    const beta = Number.isFinite(lPrime) && Math.abs(objL) > 1e-6 ? (n * lPrime) / (nPrime * objL) : 0;
    const isSameMedium = Math.abs(n - nPrime) < 1e-4;

    const readoutsEl = document.getElementById("readouts");
    if (readoutsEl) readoutsEl.innerHTML = [
      ["物方/像方焦距", `f = ${f.toFixed(1)} mm<br>f′ = ${fPrime.toFixed(1)} mm`, "var(--accent-green)"],
      ["节点位移 Δ_J (式2-3)", isSameMedium ? "0.0 mm (节点与主面重合)" : `${deltaJ > 0 ? "+" : ""}${deltaJ.toFixed(1)} mm (节平面与主面分离)`, isSameMedium ? "var(--accent-cyan)" : "var(--accent-orange)"],
      ["像距 l′ 与放大率", Number.isFinite(lPrime) ? `l′ = ${lPrime.toFixed(1)} mm<br>β = ${beta.toFixed(3)}` : "∞", "var(--accent-purple)"]
    ].map(x => `<div class="card"><div class="text-muted" style="font-size:11px;margin-bottom:4px;">${x[0]}</div><div class="text-mono" style="font-size:15px;line-height:1.4;color:${x[2]};">${x[1]}</div></div>`).join("");

    this.render();
  }
  render() {
    const { ctx, w, h } = Sim.SimUtil.setupCanvas(this.canvas);
    GeoDraw.clear(ctx, w, h);
    const p = this.params;

    const f = (-p.fPrime * p.n) / p.nPrime;
    const deltaJ = f + p.fPrime;
    const isSameMedium = Math.abs(p.n - p.nPrime) < 1e-4;

    let lPrime = Infinity;
    const denom = 1 - (f / p.objL);
    if (Math.abs(denom) > 1e-5) lPrime = p.fPrime / denom;
    const beta = Number.isFinite(lPrime) && Math.abs(p.objL) > 1e-6 ? (p.n * lPrime) / (p.nPrime * p.objL) : 0;
    const imgY = p.objY * beta;

    const axisY = h * 0.44;
    const midX = w * 0.48;
    const scale = 0.95;

    // 介质背景分界
    ctx.fillStyle = "rgba(56, 189, 248, 0.04)";
    ctx.fillRect(0, 0, midX, h);
    ctx.fillStyle = p.nPrime > 1.2 ? "rgba(167, 139, 250, 0.07)" : "rgba(56, 189, 248, 0.04)";
    ctx.fillRect(midX, 0, w - midX, h);

    GeoDraw.label(ctx, `物方介质 n = ${p.n.toFixed(2)}`, 35, 30, "#38bdf8", "left", 12);
    GeoDraw.label(ctx, `像方介质 n′ = ${p.nPrime.toFixed(2)}`, w - 35, 30, "#a78bfa", "right", 12);

    // 光轴
    GeoDraw.line(ctx, { x: 20, y: axisY }, { x: w - 20, y: axisY }, "rgba(255,255,255,0.35)", 1.2, [6, 4]);

    const HX = midX - (p.dH / 2) * scale;
    const HPrimeX = midX + (p.dH / 2) * scale;
    const FX = HX + f * scale;
    const FPrimeX = HPrimeX + p.fPrime * scale;
    const JX = HX + deltaJ * scale;
    const JPrimeX = HPrimeX + deltaJ * scale;

    const planeH = Math.min(axisY - 20, Math.max(95, Math.abs(p.objY) + 30, Math.min(axisY - 20, Math.abs(imgY) + 20)));

    // 焦平面
    GeoDraw.line(ctx, { x: FX, y: axisY - planeH }, { x: FX, y: axisY + planeH }, "rgba(74, 222, 128, 0.4)", 1.5, [4, 4]);
    ctx.fillStyle = "#4ade80"; ctx.beginPath(); ctx.arc(FX, axisY, 4, 0, GeoDraw.TAU); ctx.fill();
    GeoDraw.label(ctx, "F", FX, axisY + 16, "#4ade80", "center", 12);

    GeoDraw.line(ctx, { x: FPrimeX, y: axisY - planeH }, { x: FPrimeX, y: axisY + planeH }, "rgba(74, 222, 128, 0.4)", 1.5, [4, 4]);
    ctx.fillStyle = "#4ade80"; ctx.beginPath(); ctx.arc(FPrimeX, axisY, 4, 0, GeoDraw.TAU); ctx.fill();
    GeoDraw.label(ctx, "F′", FPrimeX, axisY + 16, "#4ade80", "center", 12);

    // 主平面
    GeoDraw.line(ctx, { x: HX, y: axisY - planeH }, { x: HX, y: axisY + planeH }, "#38bdf8", 2);
    ctx.fillStyle = "#38bdf8"; ctx.beginPath(); ctx.arc(HX, axisY, 4, 0, GeoDraw.TAU); ctx.fill();
    GeoDraw.label(ctx, "H", HX, axisY + 16, "#38bdf8", "center", 12);

    GeoDraw.line(ctx, { x: HPrimeX, y: axisY - planeH }, { x: HPrimeX, y: axisY + planeH }, "#38bdf8", 2);
    ctx.fillStyle = "#38bdf8"; ctx.beginPath(); ctx.arc(HPrimeX, axisY, 4, 0, GeoDraw.TAU); ctx.fill();
    GeoDraw.label(ctx, "H′", HPrimeX, axisY + 16, "#38bdf8", "center", 12);

    // 节平面
    const nodeColor = isSameMedium ? "rgba(251, 191, 36, 0.6)" : "#fbbf24";
    GeoDraw.line(ctx, { x: JX, y: axisY - planeH }, { x: JX, y: axisY + planeH }, nodeColor, isSameMedium ? 1.5 : 2, isSameMedium ? [3, 3] : []);
    ctx.fillStyle = "#fbbf24"; ctx.beginPath(); ctx.arc(JX, axisY, 4, 0, GeoDraw.TAU); ctx.fill();
    GeoDraw.label(ctx, isSameMedium ? "J≡H" : "J", JX, axisY - 14, "#fbbf24", "center", 12);

    GeoDraw.line(ctx, { x: JPrimeX, y: axisY - planeH }, { x: JPrimeX, y: axisY + planeH }, nodeColor, isSameMedium ? 1.5 : 2, isSameMedium ? [3, 3] : []);
    ctx.fillStyle = "#fbbf24"; ctx.beginPath(); ctx.arc(JPrimeX, axisY, 4, 0, GeoDraw.TAU); ctx.fill();
    GeoDraw.label(ctx, isSameMedium ? "J′≡H′" : "J′", JPrimeX, axisY - 14, "#fbbf24", "center", 12);

    // 物体与像
    const objX = HX + p.objL * scale;
    GeoDraw.drawArrowObject(ctx, objX, axisY, p.objY, "#a78bfa", "A (物)");
    GeoDraw.label(ctx, "B", objX, axisY + 14, "#a78bfa", "center", 11);

    if (Number.isFinite(lPrime) && Math.abs(lPrime) < 1500) {
      const imgX = HPrimeX + lPrime * scale;
      if (imgX > 20 && imgX < w - 20) {
        GeoDraw.drawArrowObject(ctx, imgX, axisY, imgY, "#f43f5e", "A′ (像)");
        GeoDraw.label(ctx, "B′", imgX, axisY - (imgY > 0 ? 14 : -14), "#f43f5e", "center", 11);
      }
    }

    // 特征光路绘制
    const objTip = { x: objX, y: axisY - p.objY };
    const imgTip = Number.isFinite(lPrime) ? { x: HPrimeX + lPrime * scale, y: axisY - imgY } : null;

    if (p.rayMode === "all" || p.rayMode === "principal") {
      // 主面等高光路 (平行光轴入射至H，等高至H'，再经F'汇聚)
      const Q = { x: HX, y: objTip.y };
      const Q_prime = { x: HPrimeX, y: objTip.y };
      GeoDraw.line(ctx, objTip, Q, "#fbbf24", 1.6);
      GeoDraw.line(ctx, Q, Q_prime, "#fbbf24", 1.4, [4, 3]);
      if (imgTip) GeoDraw.line(ctx, Q_prime, imgTip, "#fbbf24", 1.6);
      else GeoDraw.line(ctx, Q_prime, { x: FPrimeX, y: axisY }, "#fbbf24", 1.6);
    }

    if (p.rayMode === "all" || p.rayMode === "focal") {
      // 焦点光线: 过物方焦点F至物方主面，折射后水平出射
      const tanF = (axisY - objTip.y) / (FX - objTip.x);
      const hitH_Y = axisY + tanF * (HX - FX);
      const hitH = { x: HX, y: hitH_Y };
      const hitHPrime = { x: HPrimeX, y: hitH_Y };
      GeoDraw.line(ctx, objTip, hitH, "#4ade80", 1.6);
      GeoDraw.line(ctx, hitH, hitHPrime, "#4ade80", 1.4, [4, 3]);
      if (imgTip) GeoDraw.line(ctx, hitHPrime, imgTip, "#4ade80", 1.6);
      else GeoDraw.line(ctx, hitHPrime, { x: w - 30, y: hitH_Y }, "#4ade80", 1.6);
    }

    if (p.rayMode === "all" || p.rayMode === "nodal") {
      // 节点平行光线: 穿过物方节点J入射，从像方节点J'平行出射 (γ = +1)
      const tanJ = (axisY - objTip.y) / (JX - objTip.x);
      const inHitH_Y = axisY - tanJ * (JX - HX);
      const inHitH = { x: HX, y: inHitH_Y };
      const outHitHPrime = { x: HPrimeX, y: inHitH_Y };
      GeoDraw.line(ctx, objTip, inHitH, "#38bdf8", 1.6);
      GeoDraw.line(ctx, inHitH, outHitHPrime, "#38bdf8", 1.4, [4, 3]);
      if (imgTip) GeoDraw.line(ctx, outHitHPrime, imgTip, "#38bdf8", 1.6);
      else GeoDraw.line(ctx, outHitHPrime, { x: w - 30, y: inHitH_Y + tanJ * (w - 30 - HPrimeX) }, "#38bdf8", 1.6);
    }

    // 标尺标注
    const dimY1 = axisY + 44;
    const dimY2 = axisY + 68;
    drawDimLine(ctx, HX, FX, dimY1, `f = ${f.toFixed(0)}`, "#4ade80");
    drawDimLine(ctx, HPrimeX, FPrimeX, dimY1, `f′ = ${p.fPrime.toFixed(0)}`, "#4ade80");
    drawDimLine(ctx, HX, objX, dimY2, `l = ${p.objL}`, "#a78bfa");
    if (Number.isFinite(lPrime)) {
      drawDimLine(ctx, HPrimeX, HPrimeX + lPrime * scale, dimY2, `l′ = ${lPrime.toFixed(0)}`, "#f43f5e");
    }

    GeoDraw.panel(ctx, 25, h - 85, w - 50, 72, [
      `理想光学系统的三对基点与基面 (教材第 16 页 §2.1)`,
      `① 焦距比例 (式2-1): f′/f = -n′/n ⇛ f = ${f.toFixed(1)} mm , f′ = ${p.fPrime.toFixed(1)} mm`,
      `② 节点位移 (式2-3): x_J = f′, x′_J = f  ⇛  相对主面位移 Δ_J = f+f′ = ${deltaJ.toFixed(1)} mm`,
      isSameMedium ? `【同一介质 n=n′】节平面与主平面完全重合 (J≡H, J′≡H′)` : `【介质不同 n≠n′】节点自对应主面位移 Δ_J，过节点共轭光线严格平行 (γ = +1)`
    ], isSameMedium ? "#22d3ee" : "#fbbf24");
  }
}

// -----------------------------------------------------------------------
// 5. 焦距与折射率关系模型 (教材 P16 式 2-1 与 P20 式 2-13, 2-14 · 含中心厚度 d)
// -----------------------------------------------------------------------
class FocalIndexSim {
  constructor(canvasId, controlsId) {
    this.canvas = document.getElementById(canvasId);
    this.controlsRoot = document.getElementById(controlsId);
    this.config = {
      defaults: {
        ng: 1.5168,
        n0: 1.00,
        d: 20,
        r1: 80,
        r2: -80,
        mediumPreset: "air",
        xAxis: "n0"
      },
      controls: [
        { key: "ng", label: "透镜材料折射率 n_g", min: 1.10, max: 2.20, step: 0.01, digits: 3 },
        { key: "n0", label: "环境介质折射率 n₀", min: 1.00, max: 2.00, step: 0.01, digits: 3 },
        { key: "d", label: "透镜中心厚度 d", min: 0, max: 120, step: 1, unit: "mm", digits: 0 },
        { key: "r1", label: "前表面半径 r₁ (第一面/左)", min: 30, max: 250, step: 1, unit: "mm", digits: 0 },
        { key: "r2", label: "后表面半径 r₂ (第二面/右)", min: -250, max: -30, step: 1, unit: "mm", digits: 0 },
      ],
      mediumPresets: [
        { value: "air", label: "空气 (n₀ = 1.000)", n0: 1.00 },
        { value: "water", label: "水 (n₀ = 1.333)", n0: 1.333 },
        { value: "glycerol", label: "甘油 (n₀ = 1.473)", n0: 1.473 },
        { value: "dense_oil", label: "浸油 (n₀ = 1.520)", n0: 1.520 },
        { value: "cs2", label: "二硫化碳 (n₀ = 1.628)", n0: 1.628 },
        { value: "custom", label: "自定义环境折射率", n0: null }
      ],
      xAxisOptions: [
        { value: "n0", label: "横轴变量: 环境折射率 n₀" },
        { value: "ng", label: "横轴变量: 透镜折射率 n_g" },
        { value: "d", label: "横轴变量: 中心厚度 d" }
      ]
    };
    this.params = Object.assign({}, this.config.defaults);
    this.render = this.render.bind(this);
    this._setupControls();
    this._unobserveResize = Sim.SimUtil.observeCanvas(this.canvas, this.render);
    this._renderUI();
  }
  destroy() { this._unobserveResize?.(); }
  reset() {
    Object.assign(this.params, this.config.defaults);
    const selMed = this.controlsRoot.querySelector("#mediumPreset");
    if (selMed) selMed.value = this.params.mediumPreset;
    const selX = this.controlsRoot.querySelector("#xAxisSelect");
    if (selX) selX.value = this.params.xAxis;
    this._renderUI();
  }
  togglePlay() {}
  snapshot() {
    const a = document.createElement("a");
    a.download = `focal-index-${Date.now()}.png`;
    a.href = this.canvas.toDataURL("image/png");
    a.click();
  }
  _setupControls() {
    let html = this.config.controls.map((g) =>
      `<div class="control-group"><div class="control-row"><span class="control-label">${g.label}</span><span class="control-value" id="val-${g.key}">${Sim.SimUtil.fmt(this.params[g.key], g.digits)}${g.unit ? ` ${g.unit}` : ""}</span></div><input type="range" min="${g.min}" max="${g.max}" step="${g.step}" value="${this.params[g.key]}" data-key="${g.key}" data-unit="${g.unit || ""}" data-digits="${g.digits}" /></div>`
    ).join("");

    html += `<div class="control-group" style="margin-top:10px;"><div class="control-row"><span class="control-label" style="color:#38bdf8;">常见环境介质预设</span></div><select id="mediumPreset" style="width:100%;padding:4px;background:#0f172a;color:#fff;border:1px solid rgba(255,255,255,0.2);border-radius:4px;margin-top:4px;">`;
    this.config.mediumPresets.forEach(opt => {
      html += `<option value="${opt.value}" ${this.params.mediumPreset === opt.value ? 'selected' : ''}>${opt.label}</option>`;
    });
    html += `</select></div>`;

    html += `<div class="control-group" style="margin-top:10px;"><div class="control-row"><span class="control-label" style="color:#4ade80;">选择关系曲线横轴 X</span></div><select id="xAxisSelect" style="width:100%;padding:4px;background:#0f172a;color:#fff;border:1px solid rgba(255,255,255,0.2);border-radius:4px;margin-top:4px;">`;
    this.config.xAxisOptions.forEach(opt => {
      html += `<option value="${opt.value}" ${this.params.xAxis === opt.value ? 'selected' : ''}>${opt.label}</option>`;
    });
    html += `</select></div>`;

    this.controlsRoot.innerHTML = html;
    this.controlsRoot.querySelectorAll('input[type="range"]').forEach(input => {
      input.addEventListener("input", (e) => {
        this.params[input.dataset.key] = parseFloat(e.target.value);
        if (input.dataset.key === "n0") {
          this.params.mediumPreset = "custom";
          const sel = this.controlsRoot.querySelector("#mediumPreset");
          if (sel) sel.value = "custom";
        }
        this._renderUI();
      });
    });
    this.controlsRoot.querySelector("#mediumPreset")?.addEventListener("change", (e) => {
      this.params.mediumPreset = e.target.value;
      const found = this.config.mediumPresets.find(m => m.value === e.target.value);
      if (found && found.n0 !== null) {
        this.params.n0 = found.n0;
      }
      this._renderUI();
    });
    this.controlsRoot.querySelector("#xAxisSelect")?.addEventListener("change", (e) => {
      this.params.xAxis = e.target.value;
      this._renderUI();
    });
  }
  calcPower(ng = this.params.ng, n0 = this.params.n0, d = this.params.d) {
    const { r1, r2 } = this.params;
    const rho1 = 1 / r1;
    const rho2 = 1 / r2;
    const deltaN = ng - n0;
    // 光焦度 = 薄透镜光焦度 + 厚度贡献项 (教材 P20 式 2-14)
    const phi0 = (deltaN / n0) * (rho1 - rho2);
    const deltaPhi = ((deltaN * deltaN) / (ng * n0)) * d * rho1 * rho2;
    return phi0 + deltaPhi;
  }
  calcFocal(ng = this.params.ng, n0 = this.params.n0, d = this.params.d) {
    const phi = this.calcPower(ng, n0, d);
    if (Math.abs(phi) < 1e-7) return Infinity;
    return 1 / phi;
  }
  _renderUI() {
    const digits = {};
    this.config.controls.forEach(g => { digits[g.key] = g.digits; });
    Sim.SimUtil.syncRangeControls(this.controlsRoot, this.params, { digits });

    const f = this.calcFocal();
    const phi = this.calcPower() * 1000;
    const { r1, r2, ng, n0, d } = this.params;
    const deltaN = ng - n0;
    const phi0 = (deltaN / n0) * (1 / r1 - 1 / r2) * 1000;
    const deltaPhi = ((deltaN * deltaN) / (ng * n0)) * d * (1 / r1) * (1 / r2) * 1000;
    const nRel = ng / n0;

    let state = "会聚正透镜 (n_g > n₀)";
    let stateColor = "var(--accent-green)";
    if (Math.abs(ng - n0) < 0.015) {
      state = "折射率匹配·隐形透镜 (f′→∞)";
      stateColor = "var(--accent-cyan)";
    } else if (ng < n0) {
      state = "凸透镜逆转为发散透镜 (n_g < n₀)";
      stateColor = "var(--accent-orange)";
    }

    const readoutsEl = document.getElementById("readouts");
    if (readoutsEl) readoutsEl.innerHTML = [
      ["像方焦距 f′", Number.isFinite(f) ? `${f.toFixed(1)} mm` : "∞ (平行直通)", stateColor],
      ["光焦度 (含厚度项)", `Φ = ${phi.toFixed(2)} D (Φ₀=${phi0.toFixed(2)}D)<br>ΔΦ_厚度 = ${deltaPhi.toFixed(3)} D (d=${d.toFixed(1)}mm)`, "var(--accent-purple)"],
      ["透镜工作状态", state, stateColor]
    ].map(x => `<div class="card"><div class="text-muted" style="font-size:11px;margin-bottom:4px;">${x[0]}</div><div class="text-mono" style="font-size:15px;line-height:1.4;color:${x[2]};">${x[1]}</div></div>`).join("");

    this.render();
  }
  render() {
    const { ctx, w, h } = Sim.SimUtil.setupCanvas(this.canvas);
    GeoDraw.clear(ctx, w, h);
    const p = this.params;
    const f = this.calcFocal();

    const leftW = w * 0.52;
    const axisY = h * 0.44;
    const lensX = leftW * 0.46;

    // 环境介质着色
    let envColor = "rgba(74, 158, 255, 0.04)";
    if (p.n0 > 1.45) envColor = "rgba(245, 158, 11, 0.05)";
    else if (p.n0 > 1.25) envColor = "rgba(34, 211, 238, 0.05)";
    ctx.fillStyle = envColor;
    ctx.fillRect(15, 25, leftW - 20, h - 50);

    GeoDraw.line(ctx, { x: 20, y: axisY }, { x: leftW - 15, y: axisY }, "rgba(255,255,255,0.3)", 1, [5, 4]);

    // 采用光学比例尺，前表面 V1 严格位于左侧，后表面 V2 严格位于右侧
    const scale = 1.35;
    const d = p.d;
    const dPx = Math.max(8, d * scale);
    const V1 = lensX - dPx / 2; // 第一面/前表面 (左)
    const V2 = lensX + dPx / 2; // 第二面/后表面 (右)

    const R1 = Math.abs(p.r1) >= 9999 ? 1e9 : p.r1 * scale;
    const R2 = Math.abs(p.r2) >= 9999 ? 1e9 : p.r2 * scale;

    const s1 = (y) => {
      if (Math.abs(R1) >= 1e6) return 0;
      const sign = Math.sign(R1);
      const clampedY = Math.min(Math.abs(y), Math.abs(R1) * 0.96);
      return sign * (Math.abs(R1) - Math.sqrt(Math.max(0, R1 * R1 - clampedY * clampedY)));
    };
    const s2 = (y) => {
      if (Math.abs(R2) >= 1e6) return 0;
      const sign = Math.sign(R2);
      const clampedY = Math.min(Math.abs(y), Math.abs(R2) * 0.96);
      return sign * (Math.abs(R2) - Math.sqrt(Math.max(0, R2 * R2 - clampedY * clampedY)));
    };

    // 动态计算透镜最大允许半口径，严格保证 x2(y) - x1(y) >= 4px (零穿模、零表面交叉翻转)
    let halfH = 55;
    if (Math.abs(R1) < 1e6) halfH = Math.min(halfH, Math.abs(R1) * 0.85);
    if (Math.abs(R2) < 1e6) halfH = Math.min(halfH, Math.abs(R2) * 0.85);
    for (let y = 1; y <= halfH; y += 0.5) {
      const thick = dPx + s2(y) - s1(y);
      if (thick < 4) {
        halfH = Math.max(16, y - 1);
        break;
      }
    }

    // 绘制透镜实体: 左侧前表面 -> 顶部平圆柱边缘 -> 右侧后表面 -> 底部平边缘 -> 闭合
    ctx.save();
    ctx.fillStyle = "rgba(34, 211, 238, 0.14)";
    ctx.strokeStyle = "#22d3ee";
    ctx.lineWidth = 2;
    ctx.beginPath();
    // 1. 前表面 (第一面/左侧): 从 -halfH 到 +halfH
    for (let y = -halfH; y <= halfH; y += 2) {
      const px = V1 + s1(y);
      const py = axisY - y;
      if (y === -halfH) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    // 2. 顶部平边缘: 连接前表面到后表面
    ctx.lineTo(V2 + s2(halfH), axisY - halfH);
    // 3. 后表面 (第二面/右侧): 从 +halfH 降到 -halfH
    for (let y = halfH; y >= -halfH; y -= 2) {
      const px = V2 + s2(y);
      const py = axisY - y;
      ctx.lineTo(px, py);
    }
    // 4. 闭合回前表面起始点
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // 标出顶点 V1, V2 与中心厚度 d
    ctx.fillStyle = "#22d3ee";
    ctx.beginPath(); ctx.arc(V1, axisY, 3.5, 0, GeoDraw.TAU); ctx.fill();
    GeoDraw.label(ctx, "V₁ (第一面)", V1 - 6, axisY + 16, "#22d3ee", "right", 11);
    ctx.beginPath(); ctx.arc(V2, axisY, 3.5, 0, GeoDraw.TAU); ctx.fill();
    GeoDraw.label(ctx, "V₂ (第二面)", V2 + 6, axisY + 16, "#22d3ee", "left", 11);

    if (d > 0.5) {
      drawDimLine(ctx, V1, V2, axisY + 45, `d = ${d.toFixed(0)} mm`, "#38bdf8");
    }

    GeoDraw.label(ctx, `前表面(左) r₁ = ${p.r1} mm`, V1 - 10, axisY - halfH - 14, "#22d3ee", "right", 11);
    GeoDraw.label(ctx, `后表面(右) r₂ = ${p.r2} mm`, V2 + 10, axisY - halfH - 14, "#a78bfa", "left", 11);

    // 光线追迹: 5 条光线严格自左向右穿透透镜厚度
    const beamH = halfH * 0.70;
    const rayYs = [-beamH, -beamH * 0.5, 0, beamH * 0.5, beamH];
    const rayScale = Math.min(0.85, 140 / Math.max(70, Math.abs(f)));

    rayYs.forEach((yy) => {
      const rayY = axisY + yy;
      const inPt = { x: 20, y: rayY };
      const hitFront = { x: V1 + s1(-yy), y: rayY }; // 前表面交点 (在左)
      const hitBack = { x: V2 + s2(-yy), y: rayY };  // 后表面交点 (在右，必有 hitBack.x > hitFront.x)

      GeoDraw.line(ctx, inPt, hitFront, "#38bdf8", 1.6);
      GeoDraw.line(ctx, hitFront, hitBack, "rgba(34, 211, 238, 0.7)", 1.6);

      if (Math.abs(p.ng - p.n0) < 0.015) {
        // 折射率匹配: 平行直通
        GeoDraw.line(ctx, hitBack, { x: leftW - 20, y: rayY }, "#4ade80", 1.6);
      } else if (p.ng > p.n0) {
        // 会聚正透镜
        const fx = V2 + f * rayScale;
        GeoDraw.line(ctx, hitBack, { x: fx, y: axisY }, "#4ade80", 1.6);
        GeoDraw.line(ctx, { x: fx, y: axisY }, { x: leftW - 20, y: axisY - yy * 0.35 }, "#4ade80", 1.2);
      } else {
        // 发散透镜
        const fx = V1 + f * rayScale;
        const slope = (rayY - axisY) / (V2 - fx);
        const outX = leftW - 20;
        const outY = rayY + slope * (outX - V2);
        GeoDraw.line(ctx, hitBack, { x: outX, y: outY }, "#f97316", 1.6);
        GeoDraw.line(ctx, hitBack, { x: fx, y: axisY }, "rgba(249, 115, 22, 0.4)", 1.2, [3, 3]);
      }
    });

    // 绘制焦点标记
    if (Math.abs(p.ng - p.n0) >= 0.015 && Number.isFinite(f)) {
      const fx = f > 0 ? V2 + f * rayScale : V1 + f * rayScale;
      ctx.fillStyle = f > 0 ? "#4ade80" : "#fb923c";
      ctx.beginPath(); ctx.arc(fx, axisY, 4.5, 0, GeoDraw.TAU); ctx.fill();
      GeoDraw.label(ctx, f > 0 ? "F′" : "F′ (虚焦点)", fx, axisY + 16, f > 0 ? "#4ade80" : "#fb923c", "center", 12);
    }

    GeoDraw.panel(ctx, 25, h - 85, leftW - 40, 72, [
      `焦距与折射率关系及厚度贡献 (教材 P16 式 2-1 & P20 式 2-14)`,
      `① 光焦度公式: Φ = [(n_g-n₀)/n₀](1/r₁ - 1/r₂) + [(n_g-n₀)²/(n_g n₀)]·d/(r₁r₂) = ${(p.calcPower ? p.calcPower() * 1000 : 0).toFixed(2)} D`,
      `② 介质匹配与反转: n_g>n₀会聚(凸) ； n_g=n₀隐形直穿 ； n_g<n₀逆转为发散负透镜！`,
      `③ 中心厚度 d 实时影响光焦度，d 可调范围达 120 mm，前表面 r₁ 在左、后表面 r₂ 在右。`
    ], "#38bdf8");

    // 右侧关系曲线图
    const rect = { x: w * 0.56, y: h * 0.16, width: w * 0.40, height: h * 0.65 };
    const isX_n0 = p.xAxis === "n0";
    const isX_d = p.xAxis === "d";
    let xMin = 1.0, xMax = 2.0, xLabel = "环境介质折射率 n₀";
    if (!isX_n0 && !isX_d) {
      xMin = 1.10; xMax = 2.20; xLabel = "透镜材料折射率 n_g";
    } else if (isX_d) {
      xMin = 0; xMax = 120; xLabel = "透镜中心厚度 d (mm)";
    }

    const tr = GeoDraw.axes(ctx, rect, xMin, xMax, -400, 400, xLabel, "透镜焦距 f′ (mm)");

    GeoDraw.curve(ctx, rect, xMin, xMax, (xVal) => {
      let val;
      if (isX_n0) val = this.calcFocal(p.ng, xVal, p.d);
      else if (isX_d) val = this.calcFocal(p.ng, p.n0, xVal);
      else val = this.calcFocal(xVal, p.n0, p.d);
      return Number.isFinite(val) && Math.abs(val) < 800 ? val : NaN;
    }, tr.yToPx, "#a78bfa", 2.2);

    let activeX = isX_n0 ? p.n0 : (isX_d ? p.d : p.ng);
    if (Number.isFinite(f) && Math.abs(f) <= 400) {
      const px = tr.xToPx(activeX);
      const py = tr.yToPx(f);
      ctx.fillStyle = "#fbbf24";
      ctx.beginPath(); ctx.arc(px, py, 5, 0, GeoDraw.TAU); ctx.fill();
      GeoDraw.label(ctx, `f′=${f.toFixed(1)}`, px, py - 9, "#fbbf24", "center", 11);
    }
  }
}

// -----------------------------------------------------------------------
// 6. 理想系统物像位置关系模型 (教材第 17 页 图 2-1)
// -----------------------------------------------------------------------
class GaussNewtonSim {
  constructor(canvasId, controlsId) {
    this.canvas = document.getElementById(canvasId);
    this.controlsRoot = document.getElementById(controlsId);
    this.config = {
      defaults: {
        fPrime: 100,
        l: -180,
        y: 40,
        dH: 35
      },
      controls: [
        { key: "l", label: "物距 l", min: -320, max: -120, step: 1, unit: "mm", digits: 0 },
        { key: "fPrime", label: "焦距 f′", min: 60, max: 140, step: 1, unit: "mm", digits: 0 },
        { key: "y", label: "物高 y", min: 15, max: 60, step: 1, unit: "mm", digits: 0 },
        { key: "dH", label: "主面间距 d_H", min: 10, max: 60, step: 1, unit: "mm", digits: 0 },
      ]
    };
    this.params = Object.assign({}, this.config.defaults);
    this.render = this.render.bind(this);
    this._setupControls();
    this._unobserveResize = Sim.SimUtil.observeCanvas(this.canvas, this.render);
    this._renderUI();
  }
  destroy() { this._unobserveResize?.(); }
  reset() {
    Object.assign(this.params, this.config.defaults);
    this._renderUI();
  }
  togglePlay() {}
  snapshot() {
    const a = document.createElement("a");
    a.download = `gauss-newton-fig2-1-${Date.now()}.png`;
    a.href = this.canvas.toDataURL("image/png");
    a.click();
  }
  _setupControls() {
    this.controlsRoot.innerHTML = this.config.controls.map((g) =>
      `<div class="control-group"><div class="control-row"><span class="control-label">${g.label}</span><span class="control-value" id="val-${g.key}">${Sim.SimUtil.fmt(this.params[g.key], g.digits)}${g.unit ? ` ${g.unit}` : ""}</span></div><input type="range" min="${g.min}" max="${g.max}" step="${g.step}" value="${this.params[g.key]}" data-key="${g.key}" data-unit="${g.unit || ""}" data-digits="${g.digits}" /></div>`
    ).join("");
    this.controlsRoot.querySelectorAll('input[type="range"]').forEach(input => {
      input.addEventListener("input", (e) => {
        this.params[input.dataset.key] = parseFloat(e.target.value);
        this._renderUI();
      });
    });
  }
  _renderUI() {
    const digits = {};
    this.config.controls.forEach(g => { digits[g.key] = g.digits; });
    Sim.SimUtil.syncRangeControls(this.controlsRoot, this.params, { digits });

    const { l, fPrime, y } = this.params;
    const f = -fPrime;
    const lPrime = (l * fPrime) / (l + fPrime);
    const beta = lPrime / l;
    const yPrime = y * beta;
    const x = l + fPrime;
    const xPrime = lPrime - fPrime;

    const newtonProd = x * xPrime;
    const newtonFocal = f * fPrime;

    const readoutsEl = document.getElementById("readouts");
    if (readoutsEl) readoutsEl.innerHTML = [
      ["高斯公式参数", `l = ${l.toFixed(1)} mm<br>l′ = ${lPrime.toFixed(1)} mm`, "var(--accent-cyan)"],
      ["牛顿公式参数 (xx′=ff′)", `x = ${x.toFixed(1)} mm<br>x′ = ${xPrime.toFixed(1)} mm`, "var(--accent-orange)"],
      ["放大率与公式核验", `β = ${beta.toFixed(3)}<br>xx′ = ${newtonProd.toFixed(1)} (Δ=0.00)`, "var(--accent-green)"]
    ].map(x => `<div class="card"><div class="text-muted" style="font-size:11px;margin-bottom:4px;">${x[0]}</div><div class="text-mono" style="font-size:15px;line-height:1.4;color:${x[2]};">${x[1]}</div></div>`).join("");

    this.render();
  }
  render() {
    const { ctx, w, h } = Sim.SimUtil.setupCanvas(this.canvas);
    GeoDraw.clear(ctx, w, h);
    const p = this.params;
    const axisY = h * 0.44;
    const cx = w * 0.46;
    const scale = 0.95;

    const f = -p.fPrime;
    const lPrime = (p.l * p.fPrime) / (p.l + p.fPrime);
    const beta = lPrime / p.l;
    const yPrime = p.y * beta;
    const x = p.l + p.fPrime;
    const xPrime = lPrime - p.fPrime;

    const H = cx - (p.dH / 2) * scale;
    const H_prime = cx + (p.dH / 2) * scale;
    const F = H - p.fPrime * scale;
    const F_prime = H_prime + p.fPrime * scale;
    const B = H + p.l * scale;
    const B_prime = H_prime + lPrime * scale;

    const objH = p.y;

    GeoDraw.line(ctx, { x: 25, y: axisY }, { x: w - 25, y: axisY }, "rgba(255,255,255,0.35)", 1.2, [6, 4]);

    const planeH = Math.min(axisY - 20, Math.max(95, Math.abs(objH) + 30));
    const planeB = Math.min(h - axisY - 80, Math.max(95, Math.abs(yPrime) + 30));
    GeoDraw.line(ctx, { x: H, y: axisY - planeH }, { x: H, y: axisY + planeB }, "#22d3ee", 2);
    GeoDraw.label(ctx, "H", H, axisY + 16, "#22d3ee", "center", 13);

    GeoDraw.line(ctx, { x: H_prime, y: axisY - planeH }, { x: H_prime, y: axisY + planeB }, "#22d3ee", 2);
    GeoDraw.label(ctx, "H′", H_prime, axisY + 16, "#22d3ee", "center", 13);

    ctx.fillStyle = "#34d399"; ctx.beginPath(); ctx.arc(F, axisY, 4, 0, GeoDraw.TAU); ctx.fill();
    GeoDraw.label(ctx, "F", F, axisY + 16, "#34d399", "center", 13);

    ctx.fillStyle = "#34d399"; ctx.beginPath(); ctx.arc(F_prime, axisY, 4, 0, GeoDraw.TAU); ctx.fill();
    GeoDraw.label(ctx, "F′", F_prime, axisY + 16, "#34d399", "center", 13);

    // 物与像
    GeoDraw.drawArrowObject(ctx, B, axisY, objH, "#a78bfa", "");
    GeoDraw.label(ctx, "B", B, axisY + 16, "#a78bfa", "center", 13);
    GeoDraw.label(ctx, "A", B, axisY - objH - 8, "#a78bfa", "center", 13);
    GeoDraw.label(ctx, "y", B - 12, axisY - objH / 2, "#a78bfa", "center", 12);

    GeoDraw.drawArrowObject(ctx, B_prime, axisY, yPrime, "#4ade80", "");
    GeoDraw.label(ctx, "B′", B_prime, axisY - 14, "#4ade80", "center", 13);
    GeoDraw.label(ctx, "A′", B_prime, axisY - yPrime + 14, "#4ade80", "center", 13);
    GeoDraw.label(ctx, "-y′", B_prime + 16, axisY - yPrime / 2, "#4ade80", "center", 12);

    const Q = { x: H, y: axisY - objH };
    const Q_prime = { x: H_prime, y: axisY - objH };
    GeoDraw.label(ctx, "Q", H - 12, axisY - objH - 4, "#22d3ee", "center", 12);
    GeoDraw.label(ctx, "Q′", H_prime + 12, axisY - objH - 4, "#22d3ee", "center", 12);

    // 特征光线 1: A -> Q -> Q' -> F' -> A'
    GeoDraw.line(ctx, { x: B, y: axisY - objH }, Q, "#fbbf24", 1.8);
    GeoDraw.line(ctx, Q, Q_prime, "#fbbf24", 1.4, [4, 3]);
    GeoDraw.line(ctx, Q_prime, { x: B_prime, y: axisY - yPrime }, "#fbbf24", 1.8);

    // 特征光线 2: A -> F -> H_bottom -> H'_bottom -> A'
    const H_bottomY = axisY - yPrime;
    GeoDraw.line(ctx, { x: B, y: axisY - objH }, { x: F, y: axisY }, "#38bdf8", 1.8);
    GeoDraw.line(ctx, { x: F, y: axisY }, { x: H, y: H_bottomY }, "#38bdf8", 1.8);
    GeoDraw.line(ctx, { x: H, y: H_bottomY }, { x: H_prime, y: H_bottomY }, "#38bdf8", 1.4, [4, 3]);
    GeoDraw.line(ctx, { x: H_prime, y: H_bottomY }, { x: B_prime, y: axisY - yPrime }, "#38bdf8", 1.8);

    const dimY1 = axisY + 42;
    const dimY2 = axisY + 68;

    drawDimLine(ctx, F, B, dimY1, "-x", "#94a3b8");
    drawDimLine(ctx, H, F, dimY1, "-f", "#94a3b8");
    drawDimLine(ctx, H, B, dimY2, "-l", "#38bdf8");

    drawDimLine(ctx, H_prime, F_prime, dimY1, "f′", "#94a3b8");
    drawDimLine(ctx, F_prime, B_prime, dimY1, "x′", "#94a3b8");
    drawDimLine(ctx, H_prime, B_prime, dimY2, "l′", "#4ade80");

    GeoDraw.label(ctx, "图 2-1 理想光学系统的物像位置关系 (教材第 17 页)", cx, 30, "#e2e8f0", "center", 14);

    GeoDraw.panel(ctx, 25, h - 85, w - 50, 72, [
      `物像位置公式体系与核验 (教材 P17)`,
      `① 牛顿公式 (式2-4): x·x′ = f·f′ ⇛ (${x.toFixed(1)}) × (${xPrime.toFixed(1)}) = ${(-p.fPrime).toFixed(1)} × ${p.fPrime.toFixed(1)} = -${(p.fPrime * p.fPrime).toFixed(0)}  [核验完全成立]`,
      `② 高斯公式 (式2-5): f′/l′ + f/l = 1 ⇛ ${p.fPrime.toFixed(1)}/${lPrime.toFixed(1)} + (${(-p.fPrime).toFixed(1)})/(${p.l.toFixed(1)}) = 1.000`,
      `③ 垂轴放大率 (式2-6): β = y′/y = -f/x = -x′/f′ = l′/l = ${beta.toFixed(3)}`
    ], "#22d3ee");
  }
}

// -----------------------------------------------------------------------
// 7. 垂轴放大率随物距的变化模型 (教材 P18 图 2-2 及 表 2-2 · 薄透镜箭头符号)
// -----------------------------------------------------------------------
class MagnificationSim {
  constructor(canvasId, controlsId) {
    this.canvas = document.getElementById(canvasId);
    this.controlsRoot = document.getElementById(controlsId);
    this.config = {
      defaults: {
        sysType: "positive",
        fVal: 80,
        l: -160,
        y: 35
      },
      controls: [
        { key: "fVal", label: "焦距绝对值 |f′|", min: 50, max: 150, step: 1, unit: "mm", digits: 0 },
        { key: "l", label: "物距 l (含实/虚物)", min: -320, max: 200, step: 1, unit: "mm", digits: 0 },
        { key: "y", label: "物高 y", min: 15, max: 50, step: 1, unit: "mm", digits: 0 },
      ],
      sysOptions: [
        { value: "positive", label: "正透镜系统 (f′ > 0，凸透镜 ⟷)" },
        { value: "negative", label: "负透镜系统 (f′ < 0，凹透镜 ><)" }
      ]
    };
    this.params = Object.assign({}, this.config.defaults);
    this.render = this.render.bind(this);
    this._setupControls();
    this._unobserveResize = Sim.SimUtil.observeCanvas(this.canvas, this.render);
    this._renderUI();
  }
  destroy() { this._unobserveResize?.(); }
  reset() {
    Object.assign(this.params, this.config.defaults);
    const sel = this.controlsRoot.querySelector("#sysTypeSelect");
    if (sel) sel.value = this.params.sysType;
    this._renderUI();
  }
  togglePlay() {}
  snapshot() {
    const a = document.createElement("a");
    a.download = `magnification-curve-${Date.now()}.png`;
    a.href = this.canvas.toDataURL("image/png");
    a.click();
  }
  _setupControls() {
    let html = `<div class="control-group"><div class="control-row"><span class="control-label" style="color:#22d3ee;">光学系统类型</span></div><select id="sysTypeSelect" style="width:100%;padding:4px;background:#0f172a;color:#fff;border:1px solid rgba(255,255,255,0.2);border-radius:4px;margin-top:4px;">`;
    this.config.sysOptions.forEach(opt => {
      html += `<option value="${opt.value}" ${this.params.sysType === opt.value ? 'selected' : ''}>${opt.label}</option>`;
    });
    html += `</select></div>`;

    html += this.config.controls.map((g) =>
      `<div class="control-group"><div class="control-row"><span class="control-label">${g.label}</span><span class="control-value" id="val-${g.key}">${Sim.SimUtil.fmt(this.params[g.key], g.digits)}${g.unit ? ` ${g.unit}` : ""}</span></div><input type="range" min="${g.min}" max="${g.max}" step="${g.step}" value="${this.params[g.key]}" data-key="${g.key}" data-unit="${g.unit || ""}" data-digits="${g.digits}" /></div>`
    ).join("");

    this.controlsRoot.innerHTML = html;
    this.controlsRoot.querySelectorAll('input[type="range"]').forEach(input => {
      input.addEventListener("input", (e) => {
        this.params[input.dataset.key] = parseFloat(e.target.value);
        this._renderUI();
      });
    });
    this.controlsRoot.querySelector("#sysTypeSelect")?.addEventListener("change", (e) => {
      this.params.sysType = e.target.value;
      this._renderUI();
    });
  }
  getParams() {
    const isPos = this.params.sysType === "positive";
    const fPrime = isPos ? this.params.fVal : -this.params.fVal;
    const l = this.params.l;
    let lPrime = Infinity;
    if (Math.abs(l + fPrime) > 1e-5) {
      lPrime = (l * fPrime) / (l + fPrime);
    }
    const beta = Number.isFinite(lPrime) && Math.abs(l) > 1e-5 ? lPrime / l : (isPos ? 1 : 1);
    return { isPos, fPrime, l, lPrime, beta };
  }
  getRegionInfo() {
    const { isPos, fPrime, l, beta } = this.getParams();
    const fAbs = Math.abs(fPrime);
    if (isPos) {
      if (l < -2 * fAbs) {
        return { region: "I", range: "l < -2f′", obj: "实物", img: "倒立缩小实像", betaDesc: "-1 < β < 0", color: "var(--accent-green)" };
      } else if (l >= -2 * fAbs && l < -fAbs) {
        return { region: "II", range: "-2f′ < l < -f′", obj: "实物", img: "倒立放大实像", betaDesc: "β < -1", color: "var(--accent-cyan)" };
      } else if (l >= -fAbs && l < 0) {
        return { region: "III", range: "-f′ < l < 0", obj: "实物", img: "正立放大虚像", betaDesc: "β > 1", color: "var(--accent-orange)" };
      } else {
        return { region: "IV", range: "l > 0", obj: "虚物", img: "正立缩小实像", betaDesc: "0 < β < 1", color: "var(--accent-purple)" };
      }
    } else {
      if (l < 0) {
        return { region: "I", range: "l < 0", obj: "实物", img: "正立缩小虚像", betaDesc: "0 < β < 1", color: "var(--accent-cyan)" };
      } else if (l >= 0 && l < fAbs) {
        return { region: "II", range: "0 < l < |f|", obj: "虚物", img: "正立放大实像", betaDesc: "β > 1", color: "var(--accent-green)" };
      } else if (l >= fAbs && l < 2 * fAbs) {
        return { region: "III", range: "|f| < l < 2|f|", obj: "虚物", img: "倒立放大虚像", betaDesc: "β < -1", color: "var(--accent-orange)" };
      } else {
        return { region: "IV", range: "l > 2|f|", obj: "虚物", img: "倒立缩小虚像", betaDesc: "-1 < β < 0", color: "var(--accent-purple)" };
      }
    }
  }
  _renderUI() {
    const digits = {};
    this.config.controls.forEach(g => { digits[g.key] = g.digits; });
    Sim.SimUtil.syncRangeControls(this.controlsRoot, this.params, { digits });

    const { lPrime, beta } = this.getParams();
    const reg = this.getRegionInfo();

    const readoutsEl = document.getElementById("readouts");
    if (readoutsEl) readoutsEl.innerHTML = [
      ["当前所属区域 (表2-2)", `区域 ${reg.region} · ${reg.range}<br>${reg.obj}`, reg.color],
      ["像距 l′ 与垂轴放大率", Number.isFinite(lPrime) ? `l′ = ${lPrime.toFixed(1)} mm<br>β = ${beta.toFixed(3)}` : "∞ (在焦点上)", "var(--accent-cyan)"],
      ["像的性质分析", `${reg.img}<br>${reg.betaDesc}`, reg.color]
    ].map(x => `<div class="card"><div class="text-muted" style="font-size:11px;margin-bottom:4px;">${x[0]}</div><div class="text-mono" style="font-size:15px;line-height:1.4;color:${x[2]};">${x[1]}</div></div>`).join("");

    this.render();
  }
  render() {
    const { ctx, w, h } = Sim.SimUtil.setupCanvas(this.canvas);
    GeoDraw.clear(ctx, w, h);
    const p = this.params;
    const { isPos, fPrime, l, lPrime, beta } = this.getParams();
    const reg = this.getRegionInfo();

    const leftW = w * 0.52;
    const axisY = h * 0.44;
    const lensX = leftW * 0.50;
    const scale = 0.65;

    GeoDraw.line(ctx, { x: 20, y: axisY }, { x: leftW - 15, y: axisY }, "rgba(255,255,255,0.3)", 1, [5, 4]);

    const objX = lensX + l * scale;
    const objH = p.y;
    const isVirtualObj = l > 0;
    const imgH = Number.isFinite(lPrime) ? objH * beta : 0;

    // 动态加高透镜，确保充分包裹物高和像高
    const magLensHalfH = Math.min(axisY - 20, Math.max(90, Math.abs(objH) + 30, Math.min(axisY - 25, Math.abs(imgH) + 20)));
    drawThinLensArrow(ctx, lensX, axisY, magLensHalfH * 2, isPos, isPos ? `正透镜 (f′=+${p.fVal}, 箭头向外)` : `负透镜 (f′=-${p.fVal}, 箭头向内)`);

    const F = lensX - fPrime * scale;
    const F_prime = lensX + fPrime * scale;
    ctx.fillStyle = "#34d399";
    ctx.beginPath(); ctx.arc(F, axisY, 4, 0, GeoDraw.TAU); ctx.fill();
    GeoDraw.label(ctx, "F", F, axisY + 16, "#34d399", "center", 11);
    ctx.beginPath(); ctx.arc(F_prime, axisY, 4, 0, GeoDraw.TAU); ctx.fill();
    GeoDraw.label(ctx, "F′", F_prime, axisY + 16, "#34d399", "center", 11);

    if (objX >= 20 && objX <= leftW - 20) {
      GeoDraw.drawArrowObject(ctx, objX, axisY, objH, isVirtualObj ? "#f472b6" : "#a78bfa", isVirtualObj ? "虚物" : "实物");
    }

    if (Number.isFinite(lPrime) && Math.abs(lPrime) < 2000) {
      const imgX = lensX + lPrime * scale;
      const imgH = objH * beta;
      const isVirtualImg = (isPos && l > -p.fVal && l < 0) || (!isPos && (l < 0 || l > p.fVal));
      if (imgX >= 20 && imgX <= leftW - 20) {
        GeoDraw.drawArrowObject(ctx, imgX, axisY, imgH, reg.color, isVirtualImg ? "虚像" : "实像");
      }
    }

    if (Number.isFinite(lPrime)) {
      const clipLine = (p1, p2) => {
        let dx = p2.x - p1.x, dy = p2.y - p1.y;
        let minX = 20, maxX = leftW - 15, minY = 20, maxY = h - 95;
        let p = [-dx, dx, -dy, dy];
        let q = [p1.x - minX, maxX - p1.x, p1.y - minY, maxY - p1.y];
        let u1 = 0, u2 = 1;
        for (let i = 0; i < 4; i++) {
          if (p[i] === 0) {
            if (q[i] < 0) return null;
          } else {
            let t = q[i] / p[i];
            if (p[i] < 0) {
              if (t > u2) return null;
              if (t > u1) u1 = t;
            } else {
              if (t < u1) return null;
              if (t < u2) u2 = t;
            }
          }
        }
        return {
          p1: { x: p1.x + u1 * dx, y: p1.y + u1 * dy },
          p2: { x: p1.x + u2 * dx, y: p1.y + u2 * dy }
        };
      };
      const drawClippedLine = (p1, p2, col, width = 1.6, dash = null) => {
        const c = clipLine(p1, p2);
        if (c) GeoDraw.line(ctx, c.p1, c.p2, col, width, dash);
      };

      const imgX = lensX + lPrime * scale;
      const imgH = objH * beta;

      // 入射光线 1: 平行光轴入射至透镜
      drawClippedLine({ x: isVirtualObj ? 20 : objX, y: axisY - objH }, { x: lensX, y: axisY - objH }, "#38bdf8", 1.6);
      // 入射光线 2: 射向光心
      drawClippedLine({ x: isVirtualObj ? 20 : objX, y: axisY - objH }, { x: lensX, y: axisY }, "#fbbf24", 1.6);

      // 出射光线: 折射光线朝向/背向像点
      if (lPrime > 0) {
        // 实像在透镜右侧
        const farX = Math.max(imgX, leftW - 15);
        const slope1 = (axisY - imgH - (axisY - objH)) / (imgX - lensX);
        const farY1 = (axisY - objH) + slope1 * (farX - lensX);
        drawClippedLine({ x: lensX, y: axisY - objH }, { x: farX, y: farY1 }, "#38bdf8", 1.6);

        const slope2 = -imgH / (imgX - lensX);
        const farY2 = axisY + slope2 * (farX - lensX);
        drawClippedLine({ x: lensX, y: axisY }, { x: farX, y: farY2 }, "#fbbf24", 1.6);
      } else {
        // 虚像在透镜左侧，向右出射发散光线，向左画虚像反向延长线
        const farX = leftW - 15;
        const slope1 = (axisY - objH - (axisY - imgH)) / (lensX - imgX);
        const farY1 = (axisY - objH) + slope1 * (farX - lensX);
        drawClippedLine({ x: lensX, y: axisY - objH }, { x: farX, y: farY1 }, "#38bdf8", 1.6);
        drawClippedLine({ x: lensX, y: axisY - objH }, { x: imgX, y: axisY - imgH }, "rgba(56, 189, 248, 0.4)", 1.2, [4, 4]);

        const slope2 = (axisY - (axisY - imgH)) / (lensX - imgX);
        const farY2 = axisY + slope2 * (farX - lensX);
        drawClippedLine({ x: lensX, y: axisY }, { x: farX, y: farY2 }, "#fbbf24", 1.6);
        drawClippedLine({ x: lensX, y: axisY }, { x: imgX, y: axisY - imgH }, "rgba(251, 191, 36, 0.4)", 1.2, [4, 4]);
      }
    }

    GeoDraw.panel(ctx, 25, h - 85, leftW - 40, 72, [
      `成像性质分析 (教材第 18 页 表 2-2)`,
      `【区域 ${reg.region}】物距 l 位于 ${reg.range} · 物性质: ${reg.obj}`,
      `像性质: ${reg.img} · 垂轴放大率 β = ${Number.isFinite(beta) ? beta.toFixed(3) : "∞"}`,
      `依据 β 符号与绝对值: ${beta > 0 ? "正立 (β>0)" : "倒立 (β<0)"} · ${Math.abs(beta) > 1 ? "放大 (|β|>1)" : "缩小 (|β|<1)"}`
    ], reg.color);

    const rect = { x: w * 0.56, y: h * 0.16, width: w * 0.40, height: h * 0.65 };
    const maxL = 4 * p.fVal;
    const tr = GeoDraw.axes(ctx, rect, -maxL, maxL, -3, 3, "物距 l (mm)", "垂轴放大率 β");

    const py1 = tr.yToPx(1);
    const py0 = tr.yToPx(0);
    const pym1 = tr.yToPx(-1);
    GeoDraw.line(ctx, { x: rect.x, y: py1 }, { x: rect.x + rect.width, y: py1 }, "rgba(255,255,255,0.2)", 1, [3, 3]);
    GeoDraw.label(ctx, "1", rect.x - 10, py1 + 4, "rgba(255,255,255,0.6)", "right", 10);
    GeoDraw.line(ctx, { x: rect.x, y: pym1 }, { x: rect.x + rect.width, y: pym1 }, "rgba(255,255,255,0.2)", 1, [3, 3]);
    GeoDraw.label(ctx, "-1", rect.x - 10, pym1 + 4, "rgba(255,255,255,0.6)", "right", 10);

    const asymX = tr.xToPx(-fPrime);
    if (asymX >= rect.x && asymX <= rect.x + rect.width) {
      GeoDraw.line(ctx, { x: asymX, y: rect.y }, { x: asymX, y: rect.y + rect.height }, "rgba(244,63,94,0.6)", 1.5, [4, 4]);
      GeoDraw.label(ctx, isPos ? "-f′" : "f", asymX, rect.y - 6, "#f43f5e", "center", 11);
    }

    if (isPos) {
      GeoDraw.label(ctx, "I", tr.xToPx(-2.8 * p.fVal), tr.yToPx(-0.5), "rgba(255,255,255,0.5)", "center", 12);
      GeoDraw.label(ctx, "II", tr.xToPx(-1.4 * p.fVal), tr.yToPx(2.2), "rgba(255,255,255,0.5)", "center", 12);
      GeoDraw.label(ctx, "III", tr.xToPx(-0.5 * p.fVal), tr.yToPx(2.2), "rgba(255,255,255,0.5)", "center", 12);
      GeoDraw.label(ctx, "IV", tr.xToPx(1.5 * p.fVal), tr.yToPx(0.5), "rgba(255,255,255,0.5)", "center", 12);
    }

    // 双曲线绘制
    GeoDraw.curve(ctx, rect, -maxL, maxL, (lVal) => {
      if (Math.abs(lVal + fPrime) < 2) return NaN;
      const b = fPrime / (lVal + fPrime);
      return Math.abs(b) <= 3.1 ? b : NaN;
    }, tr.yToPx, "#a78bfa", 2.2);

    if (Number.isFinite(beta) && Math.abs(beta) <= 3) {
      const px = tr.xToPx(l);
      const py = tr.yToPx(beta);
      ctx.fillStyle = "#fbbf24";
      ctx.beginPath(); ctx.arc(px, py, 5, 0, GeoDraw.TAU); ctx.fill();
      GeoDraw.label(ctx, `l=${l}, β=${beta.toFixed(2)}`, px, py - 9, "#fbbf24", "center", 11);
    }
  }
}

// -----------------------------------------------------------------------
// 8. 理想光学系统的组合 (教材第 18-19 页 式 2-7~2-10 及 图 2-3 · 薄透镜箭头符号)
// -----------------------------------------------------------------------
class IdealComboSim {
  constructor(canvasId, controlsId) {
    this.canvas = document.getElementById(canvasId);
    this.controlsRoot = document.getElementById(controlsId);
    this.config = {
      defaults: {
        comboPreset: "telephoto",
        f1: 150,
        f2: -100,
        d: 80,
        xVar: "d"
      },
      controls: [
        { key: "f1", label: "透镜1 焦距 f₁′", min: -250, max: 250, step: 2, unit: "mm", digits: 0 },
        { key: "f2", label: "透镜2 焦距 f₂′", min: -250, max: 250, step: 2, unit: "mm", digits: 0 },
        { key: "d", label: "透镜间距 d", min: 10, max: 250, step: 1, unit: "mm", digits: 0 },
      ],
      comboPresets: [
        { value: "telephoto", label: "远摄型 (正透镜+负透镜，f′>机械长L)", f1: 150, f2: -100, d: 80 },
        { value: "retrofocus", label: "反远距型 (负透镜+正透镜，工作距离l′_F>f′)", f1: -100, f2: 120, d: 60 },
        { value: "telescope", label: "望远无焦系统 (Δ→0，平行光进平行光出)", f1: 140, f2: 60, d: 200 },
        { value: "symmetric", label: "对称光组 (f₁′=f₂′=100)", f1: 100, f2: 100, d: 70 },
        { value: "custom", label: "自定义参数组合", f1: null, f2: null, d: null }
      ],
      xVarOptions: [
        { value: "d", label: "横轴: 间距 d" },
        { value: "f1", label: "横轴: 焦距 f₁′" },
        { value: "f2", label: "横轴: 焦距 f₂′" }
      ]
    };
    this.params = Object.assign({}, this.config.defaults);
    this.render = this.render.bind(this);
    this._setupControls();
    this._unobserveResize = Sim.SimUtil.observeCanvas(this.canvas, this.render);
    this._renderUI();
  }
  destroy() { this._unobserveResize?.(); }
  reset() {
    Object.assign(this.params, this.config.defaults);
    const selPre = this.controlsRoot.querySelector("#comboPreset");
    if (selPre) selPre.value = this.params.comboPreset;
    const selX = this.controlsRoot.querySelector("#xVarSelect");
    if (selX) selX.value = this.params.xVar;
    this._renderUI();
  }
  togglePlay() {}
  snapshot() {
    const a = document.createElement("a");
    a.download = `ideal-lens-combo-${Date.now()}.png`;
    a.href = this.canvas.toDataURL("image/png");
    a.click();
  }
  _setupControls() {
    let html = `<div class="control-group"><div class="control-row"><span class="control-label" style="color:#22d3ee;">经典光组预设 (教材表 2-3)</span></div><select id="comboPreset" style="width:100%;padding:4px;background:#0f172a;color:#fff;border:1px solid rgba(255,255,255,0.2);border-radius:4px;margin-top:4px;">`;
    this.config.comboPresets.forEach(opt => {
      html += `<option value="${opt.value}" ${this.params.comboPreset === opt.value ? 'selected' : ''}>${opt.label}</option>`;
    });
    html += `</select></div>`;

    html += this.config.controls.map((g) =>
      `<div class="control-group"><div class="control-row"><span class="control-label">${g.label}</span><span class="control-value" id="val-${g.key}">${Sim.SimUtil.fmt(this.params[g.key], g.digits)}${g.unit ? ` ${g.unit}` : ""}</span></div><input type="range" min="${g.min}" max="${g.max}" step="${g.step}" value="${this.params[g.key]}" data-key="${g.key}" data-unit="${g.unit || ""}" data-digits="${g.digits}" /></div>`
    ).join("");

    html += `<div class="control-group" style="margin-top:10px;"><div class="control-row"><span class="control-label" style="color:#a78bfa;">选择关系曲线自变量</span></div><select id="xVarSelect" style="width:100%;padding:4px;background:#0f172a;color:#fff;border:1px solid rgba(255,255,255,0.2);border-radius:4px;margin-top:4px;">`;
    this.config.xVarOptions.forEach(opt => {
      html += `<option value="${opt.value}" ${this.params.xVar === opt.value ? 'selected' : ''}>${opt.label}</option>`;
    });
    html += `</select></div>`;

    this.controlsRoot.innerHTML = html;
    this.controlsRoot.querySelectorAll('input[type="range"]').forEach(input => {
      input.addEventListener("input", (e) => {
        let val = parseFloat(e.target.value);
        if (input.dataset.key === "f1" && Math.abs(val) < 15) val = val < 0 ? -15 : 15;
        if (input.dataset.key === "f2" && Math.abs(val) < 15) val = val < 0 ? -15 : 15;
        this.params[input.dataset.key] = val;
        this.params.comboPreset = "custom";
        const sel = this.controlsRoot.querySelector("#comboPreset");
        if (sel) sel.value = "custom";
        this._renderUI();
      });
    });
    this.controlsRoot.querySelector("#comboPreset")?.addEventListener("change", (e) => {
      this.params.comboPreset = e.target.value;
      const found = this.config.comboPresets.find(s => s.value === e.target.value);
      if (found && found.f1 !== null) {
        this.params.f1 = found.f1;
        this.params.f2 = found.f2;
        this.params.d = found.d;
      }
      this._renderUI();
    });
    this.controlsRoot.querySelector("#xVarSelect")?.addEventListener("change", (e) => {
      this.params.xVar = e.target.value;
      this._renderUI();
    });
  }
  calculate(f1 = this.params.f1, f2 = this.params.f2, d = this.params.d) {
    const safeF1 = Math.abs(f1) < 15 ? (f1 >= 0 ? 15 : -15) : f1;
    const safeF2 = Math.abs(f2) < 15 ? (f2 >= 0 ? 15 : -15) : f2;
    const delta = d - safeF1 - safeF2;
    const phi1 = 1000 / safeF1;
    const phi2 = 1000 / safeF2;
    const phi = phi1 + phi2 - (d / 1000) * phi1 * phi2;
    let fPrime = Infinity;
    if (Math.abs(delta) > 1e-5) {
      fPrime = (-safeF1 * safeF2) / delta;
    }
    const fVal = -fPrime;
    let lHPrime = 0, lH = 0, lFPrime = 0, lF = 0;
    if (Number.isFinite(fPrime)) {
      lHPrime = (-fPrime * d) / safeF1;
      lH = (fPrime * d) / safeF2;
      lFPrime = fPrime * (1 - d / safeF1);
      lF = -fPrime * (1 - d / safeF2);
    }
    return { delta, phi1, phi2, phi, fPrime, f: fVal, lHPrime, lH, lFPrime, lF };
  }
  _renderUI() {
    const digits = {};
    this.config.controls.forEach(g => { digits[g.key] = g.digits; });
    Sim.SimUtil.syncRangeControls(this.controlsRoot, this.params, { digits });

    const res = this.calculate();
    let tag = "复合光学系统";
    let tagColor = "var(--accent-green)";
    if (this.params.f1 > 0 && this.params.f2 < 0) {
      tag = "远摄型系统 (缩短机械筒长)";
      tagColor = "var(--accent-cyan)";
    } else if (this.params.f1 < 0 && this.params.f2 > 0) {
      tag = "反远距型系统 (大后工作距离)";
      tagColor = "var(--accent-orange)";
    } else if (Math.abs(res.delta) < 2) {
      tag = "望远无焦系统 (Δ→0)";
      tagColor = "var(--accent-purple)";
    }

    const readoutsEl = document.getElementById("readouts");
    if (readoutsEl) readoutsEl.innerHTML = [
      ["组合焦距与光焦度", Number.isFinite(res.fPrime) ? `f′ = ${res.fPrime.toFixed(1)} mm<br>Φ = ${res.phi.toFixed(2)} D` : "∞ (望远系统)", tagColor],
      ["像方基面 (l′_F, l′_H)", Number.isFinite(res.lFPrime) ? `l′_F = ${res.lFPrime.toFixed(1)} mm<br>l′_H = ${res.lHPrime.toFixed(1)} mm` : "∞", "var(--accent-purple)"],
      ["物方基面 (l_F, l_H)", Number.isFinite(res.lF) ? `l_F = ${res.lF.toFixed(1)} mm<br>l_H = ${res.lH.toFixed(1)} mm` : "∞", "var(--accent-cyan)"]
    ].map(x => `<div class="card"><div class="text-muted" style="font-size:11px;margin-bottom:4px;">${x[0]}</div><div class="text-mono" style="font-size:15px;line-height:1.4;color:${x[2]};">${x[1]}</div></div>`).join("");

    this.render();
  }
  render() {
    const { ctx, w, h } = Sim.SimUtil.setupCanvas(this.canvas);
    GeoDraw.clear(ctx, w, h);
    const p = this.params;
    const res = this.calculate();

    const safeF1 = Math.abs(p.f1) < 15 ? (p.f1 >= 0 ? 15 : -15) : p.f1;
    const safeF2 = Math.abs(p.f2) < 15 ? (p.f2 >= 0 ? 15 : -15) : p.f2;

    const leftW = w * 0.54;
    const axisY = h * 0.44;
    const originX = leftW * 0.28;
    const scale = 0.85;

    // 光轴
    GeoDraw.line(ctx, { x: 20, y: axisY }, { x: leftW - 15, y: axisY }, "rgba(255,255,255,0.3)", 1, [5, 4]);

    const L1X = originX;
    const L2X = originX + p.d * scale;

    // 特征光线高度计算 (必须先于透镜绘制计算以确定动态透镜高度)
    const rayH1 = 45;
    const rayH2 = rayH1 * (1 - p.d / safeF1);
    const comboLensHalfH = Math.min(axisY - 20, Math.max(85, Math.abs(rayH1) + 28, Math.abs(rayH2) + 28));
    const comboLensH = comboLensHalfH * 2;

    // 薄透镜 1: 标准直线加端部箭头 (动态加高，充分包裹光线)
    const isL1Pos = safeF1 > 0;
    drawThinLensArrow(ctx, L1X, axisY, comboLensH, isL1Pos, "#22d3ee", "");
    GeoDraw.label(ctx, `L₁ (f₁′=${p.f1})`, L1X, axisY - comboLensHalfH - 8, "#22d3ee", "center", 11);
    GeoDraw.label(ctx, "H₁", L1X, axisY + 16, "#22d3ee", "center", 12);

    // 薄透镜 2: 标准直线加端部箭头 (动态加高，充分包裹光线)
    const isL2Pos = safeF2 > 0;
    drawThinLensArrow(ctx, L2X, axisY, comboLensH, isL2Pos, "#a78bfa", "");
    GeoDraw.label(ctx, `L₂ (f₂′=${p.f2})`, L2X, axisY - comboLensHalfH - 8, "#a78bfa", "center", 11);
    GeoDraw.label(ctx, "H₂", L2X, axisY + 16, "#a78bfa", "center", 12);

    const F1_prime = L1X + safeF1 * scale;
    const F2 = L2X - safeF2 * scale;
    ctx.fillStyle = "#22d3ee"; ctx.beginPath(); ctx.arc(F1_prime, axisY, 3.5, 0, GeoDraw.TAU); ctx.fill();
    GeoDraw.label(ctx, "F₁′", F1_prime, axisY + 15, "#22d3ee", "center", 10);

    ctx.fillStyle = "#a78bfa"; ctx.beginPath(); ctx.arc(F2, axisY, 3.5, 0, GeoDraw.TAU); ctx.fill();
    GeoDraw.label(ctx, "F₂", F2, axisY + 15, "#a78bfa", "center", 10);

    if (Number.isFinite(res.fPrime)) {
      const H = L1X + res.lH * scale;
      const H_prime = L2X + res.lHPrime * scale;
      const F = L1X + res.lF * scale;
      const F_prime = L2X + res.lFPrime * scale;

      // 组合主面 H 与 H' (高度与透镜相匹配，超界时优雅标注外悬位置)
      if (H >= 25 && H <= leftW - 20) {
        GeoDraw.line(ctx, { x: H, y: axisY - comboLensHalfH - 6 }, { x: H, y: axisY + comboLensHalfH + 6 }, "#fbbf24", 1.8, [4, 3]);
        GeoDraw.label(ctx, "H", H, axisY + comboLensHalfH + 16, "#fbbf24", "center", 12);
      } else if (H < 25) {
        GeoDraw.label(ctx, "← H 外悬", 25, axisY + comboLensHalfH + 16, "#fbbf24", "left", 11);
      } else {
        GeoDraw.label(ctx, "H 外悬 →", leftW - 25, axisY + comboLensHalfH + 16, "#fbbf24", "right", 11);
      }

      if (H_prime >= 25 && H_prime <= leftW - 20) {
        GeoDraw.line(ctx, { x: H_prime, y: axisY - comboLensHalfH - 6 }, { x: H_prime, y: axisY + comboLensHalfH + 6 }, "#fbbf24", 1.8, [4, 3]);
        GeoDraw.label(ctx, "H′", H_prime, axisY + comboLensHalfH + 16, "#fbbf24", "center", 12);
      } else if (H_prime < 25) {
        GeoDraw.label(ctx, "← H′ 外悬", 25, axisY + comboLensHalfH + 28, "#fbbf24", "left", 11);
      } else {
        GeoDraw.label(ctx, "H′ 外悬 →", leftW - 25, axisY + comboLensHalfH + 28, "#fbbf24", "right", 11);
      }

      if (F >= 25 && F <= leftW - 20) {
        ctx.fillStyle = "#fbbf24"; ctx.beginPath(); ctx.arc(F, axisY, 4.5, 0, GeoDraw.TAU); ctx.fill();
        GeoDraw.label(ctx, "F", F, axisY - 15, "#fbbf24", "center", 12);
      }

      if (F_prime >= 25 && F_prime <= leftW - 20) {
        ctx.fillStyle = "#fbbf24"; ctx.beginPath(); ctx.arc(F_prime, axisY, 4.5, 0, GeoDraw.TAU); ctx.fill();
        GeoDraw.label(ctx, "F′", F_prime, axisY - 15, "#fbbf24", "center", 12);
      }

      // 特征光线: 平行入射 L1 -> 折射向 F1' -> 经 L2 转向穿过组合焦点 F' (裁剪至左侧绘图区)
      ctx.save();
      ctx.beginPath();
      ctx.rect(20, 15, leftW - 35, h - 105);
      ctx.clip();
      GeoDraw.line(ctx, { x: 25, y: axisY - rayH1 }, { x: L1X, y: axisY - rayH1 }, "#38bdf8", 1.8);
      GeoDraw.line(ctx, { x: L1X, y: axisY - rayH1 }, { x: L2X, y: axisY - rayH2 }, "#38bdf8", 1.8);
      if (F_prime > L2X) {
        GeoDraw.line(ctx, { x: L2X, y: axisY - rayH2 }, { x: F_prime, y: axisY }, "#38bdf8", 1.8);
        GeoDraw.line(ctx, { x: F_prime, y: axisY }, { x: Math.min(leftW - 15, F_prime + 80), y: axisY + rayH2 * 0.35 }, "#38bdf8", 1.2);
      } else {
        const outSlope = rayH2 / (L2X - F_prime);
        const outEndX = leftW - 15;
        const outEndY = (axisY - rayH2) + outSlope * (outEndX - L2X);
        GeoDraw.line(ctx, { x: L2X, y: axisY - rayH2 }, { x: outEndX, y: outEndY }, "#38bdf8", 1.8);
        GeoDraw.line(ctx, { x: L2X, y: axisY - rayH2 }, { x: F_prime, y: axisY }, "rgba(56, 189, 248, 0.4)", 1.2, [3, 3]);
      }
      GeoDraw.line(ctx, { x: L2X, y: axisY - rayH2 }, { x: H_prime, y: axisY - rayH1 }, "rgba(56, 189, 248, 0.4)", 1.4, [3, 3]);
      ctx.restore();

      // 尺寸标注
      drawDimLine(ctx, L1X, L2X, axisY + 44, `d = ${p.d}`, "#94a3b8");
      if (Math.abs(F2 - F1_prime) > 8 && F1_prime >= 20 && F1_prime <= leftW - 15 && F2 >= 20 && F2 <= leftW - 15) {
        drawDimLine(ctx, F1_prime, F2, axisY + 58, `Δ = ${res.delta.toFixed(0)}`, "#e2e8f0");
      }
      if (F_prime >= 20 && F_prime <= leftW - 15) {
        drawDimLine(ctx, L2X, F_prime, axisY + 74, `l′_F = ${res.lFPrime.toFixed(0)}`, "#4ade80");
      }
    }

    GeoDraw.panel(ctx, 25, h - 85, leftW - 40, 72, [
      `两薄透镜组合公式 (教材 P18 式 2-7 ~ 2-10)`,
      `① 组合焦距: f′ = -f₁′f₂′/Δ = ${Number.isFinite(res.fPrime) ? res.fPrime.toFixed(1) + " mm" : "∞"} (光学间隔 Δ = ${res.delta.toFixed(1)} mm)`,
      `② 光焦度: Φ = Φ₁ + Φ₂ - d·Φ₁Φ₂ = ${res.phi.toFixed(2)} D · 像方基面: l′_F = ${Number.isFinite(res.lFPrime) ? res.lFPrime.toFixed(1) : "∞"} , l′_H = ${Number.isFinite(res.lHPrime) ? res.lHPrime.toFixed(1) : "∞"}`,
      `③ 薄透镜标准画法: 正透镜箭头向两边 (⟷) ； 负透镜箭头指向中间 (><)。`
    ], "#38bdf8");

    // 右侧关系曲线
    const rect = { x: w * 0.58, y: h * 0.16, width: w * 0.38, height: h * 0.65 };
    const isX_d = p.xVar === "d";
    const isX_f1 = p.xVar === "f1";
    const xMin = isX_d ? 0 : -300;
    const xMax = isX_d ? 300 : 300;
    const xLabel = isX_d ? "透镜间距 d (mm)" : (isX_f1 ? "透镜1 焦距 f₁′ (mm)" : "透镜2 焦距 f₂′ (mm)");

    const tr = GeoDraw.axes(ctx, rect, xMin, xMax, -400, 400, xLabel, "组合焦距 f′ (mm)");

    GeoDraw.curve(ctx, rect, xMin, xMax, (xVal) => {
      const calcVal = isX_d ? this.calculate(p.f1, p.f2, xVal).fPrime : (isX_f1 ? this.calculate(xVal, p.f2, p.d).fPrime : this.calculate(p.f1, xVal, p.d).fPrime);
      return Number.isFinite(calcVal) && Math.abs(calcVal) <= 420 ? calcVal : NaN;
    }, tr.yToPx, "#a78bfa", 2.2);

    const activeX = isX_d ? p.d : (isX_f1 ? p.f1 : p.f2);
    if (Number.isFinite(res.fPrime) && Math.abs(res.fPrime) <= 400) {
      const px = tr.xToPx(activeX);
      const py = tr.yToPx(res.fPrime);
      ctx.fillStyle = "#fbbf24";
      ctx.beginPath(); ctx.arc(px, py, 5, 0, GeoDraw.TAU); ctx.fill();
    }
  }
}

// -----------------------------------------------------------------------
// 9. 透镜形状与曲率焦距模型 (教材 P20 图 2-4 与 式 2-13~2-15 · 彻底解耦)
// -----------------------------------------------------------------------
class LensCombinationSim {
  constructor(canvasId, controlsId) {
    this.canvas = document.getElementById(canvasId);
    this.controlsRoot = document.getElementById(controlsId);
    this.config = {
      defaults: {
        shapePreset: "biconvex",
        r1: 60,
        r2: -60,
        thickness: 12,
        n: 1.5168,
        xAxis: "thickness",
        t: 0,
        play: false
      },
      controls: [
        { key: "r1", label: "第一面曲率半径 r₁ (前表面/左)", min: -250, max: 250, step: 1, unit: "mm", digits: 0 },
        { key: "r2", label: "第二面曲率半径 r₂ (后表面/右)", min: -250, max: 250, step: 1, unit: "mm", digits: 0 },
        { key: "thickness", label: "中心厚度 d", min: 0, max: 120, step: 1, unit: "mm", digits: 0 },
        { key: "n", label: "折射率 n", min: 1.10, max: 2.20, step: 0.01, digits: 3 },
      ],
      shapePresets: [
        { value: "biconvex", label: "双凸透镜 (r₁>0, r₂<0)", r1: 60, r2: -60 },
        { value: "planoconvex", label: "平凸透镜 (r₁>0, r₂=∞)", r1: 50, r2: 10000 },
        { value: "meniscus_pos", label: "月凸透镜 (r₁>0, r₂>0, r₁<r₂)", r1: 40, r2: 80 },
        { value: "biconcave", label: "双凹透镜 (r₁<0, r₂>0)", r1: -60, r2: 60 },
        { value: "planoconcave", label: "平凹透镜 (r₁<0, r₂=∞)", r1: -50, r2: 10000 },
        { value: "meniscus_neg", label: "月凹透镜 (r₁>0, r₂>0, r₁>r₂)", r1: 80, r2: 40 },
        { value: "custom", label: "自定义曲率形状", r1: null, r2: null }
      ],
      xAxisOptions: [
        { value: "thickness", label: "中心厚度 d" },
        { value: "r1", label: "第一面半径 r₁" },
        { value: "r2", label: "第二面半径 r₂" },
        { value: "rho1", label: "第一面曲率 ρ₁" },
        { value: "rho2", label: "第二面曲率 ρ₂" },
        { value: "n", label: "折射率 n" }
      ]
    };
    this.params = Object.assign({}, this.config.defaults);
    this.render = this.render.bind(this);
    this._setupControls();
    this._unobserveResize = Sim.SimUtil.observeCanvas(this.canvas, this.render);
    this.loop = new Sim.SimLoop((dt) => this.update(dt), () => this.render(), 45);
    this._renderUI();
    if (this.params.play) this.loop.start();
  }
  destroy() { this.loop.stop(); this._unobserveResize?.(); }
  reset() {
    Object.assign(this.params, this.config.defaults);
    if (this.params.play) this.loop.start(); else this.loop.stop();
    const select = this.controlsRoot.querySelector('#xAxisSelect');
    if (select) select.value = this.params.xAxis;
    const shapeSel = this.controlsRoot.querySelector('#shapePresetSelect');
    if (shapeSel) shapeSel.value = this.params.shapePreset;
    this._renderUI();
  }
  togglePlay(button) {
    this.params.play = !this.params.play;
    if (button) button.textContent = this.params.play ? "⏸ 暂停" : "▶ 播放";
    if (this.params.play) this.loop.start(); else this.loop.stop();
  }
  snapshot() {
    const a = document.createElement("a");
    a.download = `thick-lens-curvature-${Date.now()}.png`;
    a.href = this.canvas.toDataURL("image/png");
    a.click();
  }
  update(dt) {
    if (!this.params.play) return;
    this.params.t = (this.params.t + dt) % 2500;
    const phase = 0.5 - 0.5 * Math.cos((this.params.t / 2500) * Math.PI * 2);
    if (this.params.xAxis === 'thickness') {
      this.params.thickness = 0 + 60 * phase;
    } else if (this.params.xAxis === 'r1') {
      this.params.r1 = -180 + 360 * phase;
    } else if (this.params.xAxis === 'r2') {
      this.params.r2 = -180 + 360 * phase;
    } else if (this.params.xAxis === 'n') {
      this.params.n = 1.15 + 0.95 * phase;
    }
    this._renderUI();
  }
  _setupControls() {
    let html = `<div class="control-group"><div class="control-row"><span class="control-label" style="color:#22d3ee;">透镜形状预设 (教材图 2-4)</span></div><select id="shapePresetSelect" style="width:100%;padding:4px;background:#0f172a;color:#fff;border:1px solid rgba(255,255,255,0.2);border-radius:4px;margin-top:4px;">`;
    this.config.shapePresets.forEach(opt => {
      html += `<option value="${opt.value}" ${this.params.shapePreset === opt.value ? 'selected' : ''}>${opt.label}</option>`;
    });
    html += `</select></div>`;

    html += this.config.controls.map((g) =>
      `<div class="control-group"><div class="control-row"><span class="control-label">${g.label}</span><span class="control-value" id="val-${g.key}">${Sim.SimUtil.fmt(this.params[g.key], g.digits)}${g.unit ? ` ${g.unit}` : ""}</span></div><input type="range" min="${g.min}" max="${g.max}" step="${g.step}" value="${this.params[g.key]}" data-key="${g.key}" data-unit="${g.unit || ""}" data-digits="${g.digits}" /></div>`
    ).join("");

    html += `<div class="control-group" style="margin-top:10px;"><div class="control-row"><span class="control-label" style="color:#4ade80;">选择X轴/播放变量</span></div><select id="xAxisSelect" style="width:100%;padding:4px;background:#0f172a;color:#fff;border:1px solid rgba(255,255,255,0.2);border-radius:4px;margin-top:4px;">`;
    this.config.xAxisOptions.forEach(opt => {
      html += `<option value="${opt.value}" ${this.params.xAxis === opt.value ? 'selected' : ''}>${opt.label}</option>`;
    });
    html += `</select></div>`;

    this.controlsRoot.innerHTML = html;

    this.controlsRoot.querySelectorAll('input[type="range"]').forEach(input => {
      input.addEventListener("input", (e) => {
        let val = parseFloat(e.target.value);
        if (input.dataset.key === "r1" && Math.abs(val) < 8) val = val < 0 ? -8 : 8;
        if (input.dataset.key === "r2" && Math.abs(val) < 8) val = val < 0 ? -8 : 8;
        this.params[input.dataset.key] = val;
        this.params.shapePreset = "custom";
        const sel = this.controlsRoot.querySelector("#shapePresetSelect");
        if (sel) sel.value = "custom";
        this._renderUI();
      });
    });
    this.controlsRoot.querySelector("#shapePresetSelect")?.addEventListener("change", (e) => {
      this.params.shapePreset = e.target.value;
      const found = this.config.shapePresets.find(s => s.value === e.target.value);
      if (found && found.r1 !== null) {
        this.params.r1 = found.r1;
        this.params.r2 = found.r2;
      }
      this._renderUI();
    });
    this.controlsRoot.querySelector("#xAxisSelect")?.addEventListener("change", (e) => {
      this.params.xAxis = e.target.value;
      this._renderUI();
    });
  }
  focus(d = this.params.thickness, r1 = this.params.r1, r2 = this.params.r2, n = this.params.n) {
    const safeR1 = Math.abs(r1) < 8 ? (r1 >= 0 ? 8 : -8) : r1;
    const safeR2 = Math.abs(r2) < 8 ? (r2 >= 0 ? 8 : -8) : r2;
    const rho1 = Math.abs(safeR1) >= 9999 ? 0 : 1 / safeR1;
    const rho2 = Math.abs(safeR2) >= 9999 ? 0 : 1 / safeR2;
    const deltaPhi = ((n - 1) * (n - 1) / n) * d * rho1 * rho2;
    const phi = (n - 1) * (rho1 - rho2) + deltaPhi;
    if (Math.abs(phi) < 1e-7) return Infinity;
    return 1 / phi;
  }
  _renderUI() {
    const digits = {};
    this.config.controls.forEach(g => { digits[g.key] = g.digits; });
    Sim.SimUtil.syncRangeControls(this.controlsRoot, this.params, { digits });

    const { thickness, r1, r2, n } = this.params;
    const safeR1 = Math.abs(r1) < 8 ? (r1 >= 0 ? 8 : -8) : r1;
    const safeR2 = Math.abs(r2) < 8 ? (r2 >= 0 ? 8 : -8) : r2;
    const fThick = this.focus(thickness, safeR1, safeR2, n);
    const rho1 = Math.abs(safeR1) >= 9999 ? 0 : 1 / safeR1;
    const rho2 = Math.abs(safeR2) >= 9999 ? 0 : 1 / safeR2;
    const phiThin = (n - 1) * (rho1 - rho2);
    const fThin = Math.abs(phiThin) > 1e-7 ? 1 / phiThin : Infinity;
    const deltaPhi = ((n - 1) * (n - 1) / n) * thickness * rho1 * rho2 * 1000;

    const den = n * (safeR2 - safeR1) + (n - 1) * thickness;
    let lH1 = 0, lH2_prime = 0;
    if (Math.abs(den) > 1e-6) {
      lH1 = (safeR1 * thickness * (n - 1)) / den;
      lH2_prime = -(safeR2 * thickness * (n - 1)) / den;
    }

    const readoutsEl = document.getElementById("readouts");
    if (readoutsEl) readoutsEl.innerHTML = [
      ["厚/薄透镜焦距 f′", Number.isFinite(fThick) ? `厚透镜: ${fThick.toFixed(1)} mm<br>薄透镜: ${Number.isFinite(fThin) ? fThin.toFixed(1) + " mm" : "∞"}` : "∞", "var(--accent-green)"],
      ["光焦度与厚度影响", Number.isFinite(fThick) ? `Φ = ${(1000 / fThick).toFixed(2)} D<br>ΔΦ_厚度 = ${deltaPhi.toFixed(3)} D` : `Φ = 0.00 D<br>ΔΦ_厚度 = ${deltaPhi.toFixed(3)} D`, "var(--accent-cyan)"],
      ["两主面顶点位置", `l_H1 = ${lH1.toFixed(1)} mm<br>l′_H2 = ${lH2_prime.toFixed(1)} mm`, "var(--accent-orange)"]
    ].map(x => `<div class="card"><div class="text-muted" style="font-size:11px;margin-bottom:4px;">${x[0]}</div><div class="text-mono" style="font-size:15px;line-height:1.4;color:${x[2]};">${x[1]}</div></div>`).join("");

    const rangeInput = this.controlsRoot.querySelector(`input[data-key="${this.params.xAxis}"]`);
    if (rangeInput && this.params.play) {
      rangeInput.value = this.params[this.params.xAxis];
    }
    this.render();
  }
  render() {
    const { ctx, w, h } = Sim.SimUtil.setupCanvas(this.canvas);
    GeoDraw.clear(ctx, w, h);
    const p = this.params;
    const safeR1 = Math.abs(p.r1) < 8 ? (p.r1 >= 0 ? 8 : -8) : p.r1;
    const safeR2 = Math.abs(p.r2) < 8 ? (p.r2 >= 0 ? 8 : -8) : p.r2;
    const f = this.focus(p.thickness, safeR1, safeR2, p.n);

    const leftW = w * 0.50;
    const axisY = h * 0.44;
    const lensX = leftW * 0.52;

    GeoDraw.line(ctx, { x: 20, y: axisY }, { x: leftW - 15, y: axisY }, "rgba(255,255,255,0.3)", 1, [5, 4]);

    const scale = 1.15;
    const d = p.thickness;
    const dPx = Math.max(8, d * scale);
    const V1 = lensX - dPx / 2; // 前表面/第一面 (左)
    const V2 = lensX + dPx / 2; // 后表面/第二面 (右)

    const R1 = Math.abs(safeR1) >= 9999 ? 1e9 : safeR1 * scale;
    const R2 = Math.abs(safeR2) >= 9999 ? 1e9 : safeR2 * scale;

    const s1 = (y) => {
      if (Math.abs(R1) >= 1e6) return 0;
      const sign = Math.sign(R1);
      const clampedY = Math.min(Math.abs(y), Math.abs(R1) * 0.96);
      return sign * (Math.abs(R1) - Math.sqrt(Math.max(0, R1 * R1 - clampedY * clampedY)));
    };
    const s2 = (y) => {
      if (Math.abs(R2) >= 1e6) return 0;
      const sign = Math.sign(R2);
      const clampedY = Math.min(Math.abs(y), Math.abs(R2) * 0.96);
      return sign * (Math.abs(R2) - Math.sqrt(Math.max(0, R2 * R2 - clampedY * clampedY)));
    };

    // 动态计算透镜最大允许半口径，严格保证 x2(y) - x1(y) >= 4px (零穿模、零表面交叉翻转)
    let halfH = 65;
    if (Math.abs(R1) < 1e6) halfH = Math.min(halfH, Math.abs(R1) * 0.85);
    if (Math.abs(R2) < 1e6) halfH = Math.min(halfH, Math.abs(R2) * 0.85);
    for (let y = 1; y <= halfH; y += 0.5) {
      const thick = dPx + s2(y) - s1(y);
      if (thick < 4) {
        halfH = Math.max(16, y - 1);
        break;
      }
    }

    ctx.save();
    ctx.fillStyle = "rgba(34, 211, 238, 0.14)";
    ctx.strokeStyle = "#22d3ee";
    ctx.lineWidth = 2;
    ctx.beginPath();
    // 1. 前表面 (第一面/左侧): 从 -halfH 到 +halfH
    for (let y = -halfH; y <= halfH; y += 2) {
      const px = V1 + s1(y);
      const py = axisY - y;
      if (y === -halfH) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    // 2. 顶部平边缘: 连接前表面到后表面
    ctx.lineTo(V2 + s2(halfH), axisY - halfH);
    // 3. 后表面 (第二面/右侧): 从 +halfH 降到 -halfH
    for (let y = halfH; y >= -halfH; y -= 2) {
      const px = V2 + s2(y);
      const py = axisY - y;
      ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // 顶点 V1, V2 标示
    ctx.fillStyle = "#22d3ee";
    ctx.beginPath(); ctx.arc(V1, axisY, 3.5, 0, GeoDraw.TAU); ctx.fill();
    GeoDraw.label(ctx, "V₁ (前表面/左)", V1 - 6, axisY + 16, "#22d3ee", "right", 11);

    ctx.fillStyle = "#22d3ee";
    ctx.beginPath(); ctx.arc(V2, axisY, 3.5, 0, GeoDraw.TAU); ctx.fill();
    GeoDraw.label(ctx, "V₂ (后表面/右)", V2 + 6, axisY + 16, "#22d3ee", "left", 11);

    if (d > 0.5) {
      drawDimLine(ctx, V1, V2, axisY + 45, `d = ${d.toFixed(0)} mm`, "#38bdf8");
    }

    const rho1Str = Math.abs(p.r1) >= 9999 ? "0.00" : (1 / safeR1).toFixed(4);
    const rho2Str = Math.abs(p.r2) >= 9999 ? "0.00" : (1 / safeR2).toFixed(4);
    GeoDraw.label(ctx, `前表面(左) r₁ = ${Math.abs(p.r1) >= 9999 ? "∞ (平面)" : p.r1 + " mm"}  (ρ₁ = ${rho1Str})`, V1 - 8, axisY - halfH - 18, "#22d3ee", "right", 11);
    GeoDraw.label(ctx, `后表面(右) r₂ = ${Math.abs(p.r2) >= 9999 ? "∞ (平面)" : p.r2 + " mm"}  (ρ₂ = ${rho2Str})`, V2 + 8, axisY - halfH - 18, "#a78bfa", "left", 11);

    // 光线追迹: 5 条光线严格自左向右穿透透镜厚度
    const beamH = halfH * 0.70;
    const rayYs = [-beamH, -beamH * 0.5, 0, beamH * 0.5, beamH];
    const rayScale = Math.min(0.85, 140 / Math.max(70, Math.abs(f)));

    rayYs.forEach((yy) => {
      const rayY = axisY + yy;
      const inPt = { x: 25, y: rayY };
      const hitFront = { x: V1 + s1(yy), y: rayY };
      const hitBack = { x: V2 + s2(yy), y: rayY };

      GeoDraw.line(ctx, inPt, hitFront, "#38bdf8", 1.6);
      GeoDraw.line(ctx, hitFront, hitBack, "rgba(34, 211, 238, 0.7)", 1.6);

      if (Number.isFinite(f)) {
        if (f > 0) {
          const fx = V2 + f * rayScale;
          GeoDraw.line(ctx, hitBack, { x: fx, y: axisY }, "#4ade80", 1.6);
          GeoDraw.line(ctx, { x: fx, y: axisY }, { x: leftW - 15, y: axisY - yy * 0.3 }, "#4ade80", 1.2);
        } else {
          const fx = V1 + f * rayScale;
          const slope = (rayY - axisY) / (V2 - fx);
          const outX = leftW - 15;
          const outY = rayY + slope * (outX - V2);
          GeoDraw.line(ctx, hitBack, { x: outX, y: outY }, "#fb923c", 1.6);
          GeoDraw.line(ctx, hitBack, { x: fx, y: axisY }, "rgba(251, 146, 60, 0.4)", 1.2, [3, 3]);
        }
      }
    });

    if (Number.isFinite(f)) {
      const fx = f > 0 ? V2 + f * rayScale : V1 + f * rayScale;
      ctx.fillStyle = f > 0 ? "#4ade80" : "#fb923c";
      ctx.beginPath(); ctx.arc(fx, axisY, 4.5, 0, GeoDraw.TAU); ctx.fill();
      GeoDraw.label(ctx, f > 0 ? "F′" : "F′ (虚)", fx, axisY + 16, f > 0 ? "#4ade80" : "#fb923c", "center", 12);
    }

    const phi0 = (p.n - 1) * (1 / safeR1 - 1 / safeR2) * 1000;
    GeoDraw.panel(ctx, 25, h - 85, leftW - 40, 72, [
      `单个透镜焦距与光焦度公式 (教材 P20 式 2-13, 2-14)`,
      `① 厚透镜焦距: f′ = n r₁r₂ / [(n-1){n(r₂-r₁) + (n-1)d}] = ${Number.isFinite(f) ? f.toFixed(1) + " mm" : "∞"}`,
      `② 薄透镜近似: Φ₀ = (n-1)(ρ₁ - ρ₂) = ${phi0.toFixed(2)} D  (当 d→0 时)`,
      `③ 前后两面曲率半径彻底独立控制，改变单面绝不影响另一面！`
    ], "#22d3ee");

    const rect = { x: w * 0.54, y: h * 0.16, width: w * 0.42, height: h * 0.65 };
    const xAxisControl = this.config.controls.find(c => c.key === p.xAxis);
    let xMin = -200, xMax = 200, xLabel = "自变量";
    if (xAxisControl) {
      xMin = xAxisControl.min;
      xMax = xAxisControl.max;
      xLabel = xAxisControl.label;
    } else if (p.xAxis === "rho1" || p.xAxis === "rho2") {
      xMin = -0.05; xMax = 0.05;
      xLabel = p.xAxis === "rho1" ? "第一面曲率 ρ₁ (mm⁻¹)" : "第二面曲率 ρ₂ (mm⁻¹)";
    }

    const tr = GeoDraw.axes(ctx, rect, xMin, xMax, -400, 400, xLabel, "透镜焦距 f′ (mm)");

    GeoDraw.curve(ctx, rect, xMin, xMax, (xVal) => {
      let val;
      if (p.xAxis === "thickness") val = this.focus(xVal, p.r1, p.r2, p.n);
      else if (p.xAxis === "r1") val = this.focus(p.thickness, xVal, p.r2, p.n);
      else if (p.xAxis === "r2") val = this.focus(p.thickness, p.r1, xVal, p.n);
      else if (p.xAxis === "rho1") val = this.focus(p.thickness, Math.abs(xVal) < 1e-4 ? 10000 : 1 / xVal, p.r2, p.n);
      else if (p.xAxis === "rho2") val = this.focus(p.thickness, p.r1, Math.abs(xVal) < 1e-4 ? 10000 : 1 / xVal, p.n);
      else if (p.xAxis === "n") val = this.focus(p.thickness, p.r1, p.r2, xVal);
      return Number.isFinite(val) && Math.abs(val) < 800 ? val : NaN;
    }, tr.yToPx, "#a78bfa", 2.2);

    let activeXVal = p[p.xAxis];
    if (p.xAxis === "rho1") activeXVal = 1 / safeR1;
    if (p.xAxis === "rho2") activeXVal = 1 / safeR2;

    if (Number.isFinite(f) && Math.abs(f) <= 400) {
      const px = tr.xToPx(activeXVal);
      const py = tr.yToPx(f);
      ctx.fillStyle = "#fbbf24";
      ctx.beginPath(); ctx.arc(px, py, 5, 0, GeoDraw.TAU); ctx.fill();
      GeoDraw.label(ctx, `f′=${f.toFixed(1)}`, px, py - 9, "#fbbf24", "center", 11);
    }
  }
}

// -----------------------------------------------------------------------
// 10. 近轴光线正切计算法与远摄系统设计 (教材第 23 页 例 2-4 及 图 2-6)
// -----------------------------------------------------------------------
class TangentMethodSim {
  constructor(canvasId, controlsId) {
    this.canvas = document.getElementById(canvasId);
    this.controlsRoot = document.getElementById(controlsId);
    this.config = {
      defaults: {
        calcMode: "design", // "design" (教材例2-4逆向设计) 或 "forward" (正向光路追迹)
        preset: "example2-4",
        // 逆向设计模式参数 (教材例2-4)
        fPrime: 1200,   // 目标组合焦距 (mm)
        L: 700,         // 机械筒长 (mm)
        lFPrime: 400,   // 像方工作距 (mm)
        // 正向光路参数
        f1: 450,        // 透镜1焦距 (mm)
        f2: -240,       // 透镜2焦距 (mm)
        d: 300,         // 透镜间距 (mm)
        // 光线与视效参数
        h1: 30,         // 入射光线高度 (mm)
        rayCount: 3,    // 光线束数 (1, 3, 5, 7)
        showExtensions: true, // 虚线反向延长线交于主面 H'
        showDims: true,       // 尺寸距离标注 (d, l'F, L, f')
        showAngles: true      // 偏转角标注 (u'1, u'2)
      },
      presets: [
        {
          value: "example2-4",
          label: "教材例2-4 远摄长焦物镜 (f′=1200, L=700, l′_F=400)",
          calcMode: "design",
          fPrime: 1200, L: 700, lFPrime: 400,
          f1: 450, f2: -240, d: 300, h1: 30
        },
        {
          value: "retrofocus",
          label: "反远距型广角镜头 (l′_F > f′，后工作距超大)",
          calcMode: "forward",
          fPrime: 128.6, L: 265.7, lFPrime: 205.7,
          f1: -100, f2: 90, d: 60, h1: 30
        },
        {
          value: "example2-5",
          label: "教材例2-5 焦距不变组合 (f′₁=100, f′₂=50, d=100)",
          calcMode: "forward",
          fPrime: 100, L: 100, lFPrime: 0,
          f1: 100, f2: 50, d: 100, h1: 30
        },
        {
          value: "telephoto-super",
          label: "超长焦摄影物镜 (f′=800, L=480, l′_F=280)",
          calcMode: "design",
          fPrime: 800, L: 480, lFPrime: 280,
          f1: 307.7, f2: -168, d: 200, h1: 30
        },
        {
          value: "custom",
          label: "自定义参数调节"
        }
      ],
      designControls: [
        { key: "fPrime", label: "目标组合焦距 f′", min: 400, max: 2000, step: 10, unit: "mm", digits: 0 },
        { key: "L", label: "机械筒长 L (顶点至像面)", min: 200, max: 1500, step: 10, unit: "mm", digits: 0 },
        { key: "lFPrime", label: "像方工作距 l′_F", min: 50, max: 800, step: 5, unit: "mm", digits: 0 },
        { key: "h1", label: "入射光线高度 h₁", min: 10, max: 60, step: 1, unit: "mm", digits: 0 },
        { key: "rayCount", label: "光线束数", min: 1, max: 7, step: 2, unit: "条", digits: 0 }
      ],
      forwardControls: [
        { key: "f1", label: "第一透镜焦距 f′₁", min: -600, max: 1000, step: 5, unit: "mm", digits: 0 },
        { key: "f2", label: "第二透镜焦距 f′₂", min: -600, max: 1000, step: 5, unit: "mm", digits: 0 },
        { key: "d", label: "两透镜间距 d", min: 10, max: 600, step: 5, unit: "mm", digits: 0 },
        { key: "h1", label: "入射光线高度 h₁", min: 10, max: 60, step: 1, unit: "mm", digits: 0 },
        { key: "rayCount", label: "光线束数", min: 1, max: 7, step: 2, unit: "条", digits: 0 }
      ]
    };
    this.params = Object.assign({}, this.config.defaults);
    this.render = this.render.bind(this);
    this._setupControls();
    this._unobserveResize = Sim.SimUtil.observeCanvas(this.canvas, this.render);
    this._renderUI();
  }

  destroy() { this._unobserveResize?.(); }

  reset() {
    Object.assign(this.params, this.config.defaults);
    this._setupControls();
    this._renderUI();
  }

  togglePlay() {}

  snapshot() {
    if (!this.canvas || !this.canvas.toDataURL) return;
    const a = document.createElement("a");
    a.download = `tangent-method-sim-${Date.now()}.png`;
    a.href = this.canvas.toDataURL("image/png");
    a.click();
  }

  _setupControls() {
    if (!this.controlsRoot) return;
    const p = this.params;
    let html = `
      <div class="control-group">
        <div class="control-row"><span class="control-label" style="color:#22d3ee;font-weight:600;">计算模式选择</span></div>
        <select id="calcModeSelect" style="width:100%;padding:5px;background:#0f172a;color:#fff;border:1px solid rgba(56,189,248,0.4);border-radius:4px;margin-top:4px;">
          <option value="design" ${p.calcMode === 'design' ? 'selected' : ''}>🎯 逆向设计 (例2-4: 给定f′,L,l′_F 求透镜结构)</option>
          <option value="forward" ${p.calcMode === 'forward' ? 'selected' : ''}>🔍 正向光路追迹 (给定f′₁,f′₂,d 追迹正切角)</option>
        </select>
      </div>

      <div class="control-group">
        <div class="control-row"><span class="control-label" style="color:#a78bfa;font-weight:600;">经典案例预设</span></div>
        <select id="presetSelect" style="width:100%;padding:5px;background:#0f172a;color:#fff;border:1px solid rgba(167,139,250,0.4);border-radius:4px;margin-top:4px;">
    `;
    this.config.presets.forEach(opt => {
      html += `<option value="${opt.value}" ${p.preset === opt.value ? 'selected' : ''}>${opt.label}</option>`;
    });
    html += `
        </select>
      </div>
      <div id="slidersContainer"></div>
      <div class="control-group" style="margin-top:10px;padding-top:8px;border-top:1px solid rgba(255,255,255,0.1);">
        <label style="display:flex;align-items:center;gap:8px;font-size:12px;color:#e2e8f0;margin-bottom:6px;cursor:pointer;">
          <input type="checkbox" id="showExtensions" ${p.showExtensions ? 'checked' : ''} />
          <span>显示像主面 H′ 虚线反向延长线</span>
        </label>
        <label style="display:flex;align-items:center;gap:8px;font-size:12px;color:#e2e8f0;margin-bottom:6px;cursor:pointer;">
          <input type="checkbox" id="showDims" ${p.showDims ? 'checked' : ''} />
          <span>显示尺寸与基面标注线 (d, l′_F, L, f′)</span>
        </label>
        <label style="display:flex;align-items:center;gap:8px;font-size:12px;color:#e2e8f0;cursor:pointer;">
          <input type="checkbox" id="showAngles" ${p.showAngles ? 'checked' : ''} />
          <span>显示光线正切偏折角 (tan u′₁, tan u′₂)</span>
        </label>
      </div>
    `;

    this.controlsRoot.innerHTML = html;

    this.controlsRoot.querySelector("#calcModeSelect")?.addEventListener("change", (e) => {
      this.params.calcMode = e.target.value;
      this.params.preset = "custom";
      const preSel = this.controlsRoot.querySelector("#presetSelect");
      if (preSel) preSel.value = "custom";
      this._updateSliders();
      this._renderUI();
    });

    this.controlsRoot.querySelector("#presetSelect")?.addEventListener("change", (e) => {
      const val = e.target.value;
      this.params.preset = val;
      const found = this.config.presets.find(s => s.value === val);
      if (found && found.value !== "custom") {
        this.params.calcMode = found.calcMode;
        if (found.fPrime !== undefined) this.params.fPrime = found.fPrime;
        if (found.L !== undefined) this.params.L = found.L;
        if (found.lFPrime !== undefined) this.params.lFPrime = found.lFPrime;
        if (found.f1 !== undefined) this.params.f1 = found.f1;
        if (found.f2 !== undefined) this.params.f2 = found.f2;
        if (found.d !== undefined) this.params.d = found.d;
        if (found.h1 !== undefined) this.params.h1 = found.h1;

        const modeSel = this.controlsRoot.querySelector("#calcModeSelect");
        if (modeSel) modeSel.value = this.params.calcMode;
      }
      this._updateSliders();
      this._renderUI();
    });

    const bindCheckbox = (id, key) => {
      this.controlsRoot.querySelector(`#${id}`)?.addEventListener("change", (e) => {
        this.params[key] = e.target.checked;
        this.render();
      });
    };
    bindCheckbox("showExtensions", "showExtensions");
    bindCheckbox("showDims", "showDims");
    bindCheckbox("showAngles", "showAngles");

    this._updateSliders();
  }

  _updateSliders() {
    const container = this.controlsRoot.querySelector("#slidersContainer");
    if (!container) return;
    const ctrlList = this.params.calcMode === "design" ? this.config.designControls : this.config.forwardControls;

    let sHtml = "";
    ctrlList.forEach(g => {
      const val = this.params[g.key] !== undefined ? this.params[g.key] : g.min;
      const fmtVal = typeof Sim !== "undefined" && Sim.SimUtil ? Sim.SimUtil.fmt(val, g.digits) : val.toFixed(g.digits);
      sHtml += `
        <div class="control-group">
          <div class="control-row">
            <span class="control-label">${g.label}</span>
            <span class="control-value" id="val-${g.key}">${fmtVal}${g.unit ? ` ${g.unit}` : ""}</span>
          </div>
          <input type="range" min="${g.min}" max="${g.max}" step="${g.step}" value="${val}" data-key="${g.key}" data-unit="${g.unit || ""}" data-digits="${g.digits}" />
        </div>
      `;
    });
    container.innerHTML = sHtml;

    container.querySelectorAll('input[type="range"]').forEach(input => {
      input.addEventListener("input", (e) => {
        let val = parseFloat(e.target.value);
        const key = input.dataset.key;
        if ((key === "f1" || key === "f2") && Math.abs(val) < 15) {
          val = val < 0 ? -15 : 15;
        }
        this.params[key] = val;
        this.params.preset = "custom";
        const preSel = this.controlsRoot.querySelector("#presetSelect");
        if (preSel) preSel.value = "custom";
        this._renderUI();
      });
    });
  }

  calculate() {
    const p = this.params;
    let d, fPrime, L, lFPrime, f1, f2, h1 = p.h1 || 30;
    let ratio, h2, tan_u1, tan_u2, phi1, phi2, phi, lHPrime, isTelephoto, isRetrofocus;
    let errorMsg = null;

    if (p.calcMode === "design") {
      fPrime = p.fPrime;
      L = p.L;
      lFPrime = p.lFPrime;

      d = L - lFPrime;
      if (d <= 0) {
        d = 10;
        L = lFPrime + d;
        errorMsg = "筒长必须大于工作距 (L > l′_F)，已自动限制 d ≥ 10mm";
      }

      if (Math.abs(lFPrime) < 1e-4) {
        ratio = Infinity;
        h2 = 0;
      } else {
        ratio = fPrime / lFPrime; // h1 / h2
        h2 = h1 / ratio;
      }

      tan_u2 = h2 / lFPrime;
      tan_u1 = (h1 - h2) / d;

      if (Math.abs(tan_u1) < 1e-6) {
        f1 = Infinity;
      } else {
        f1 = h1 / tan_u1; // = d / (1 - lFPrime / fPrime)
      }

      const deltaTan = tan_u2 - tan_u1;
      if (Math.abs(deltaTan) < 1e-6) {
        f2 = Infinity;
      } else {
        f2 = h2 / deltaTan; // = (d - f1) / (1 - f1 / fPrime)
      }

      phi1 = 1 / f1;
      phi2 = 1 / f2;
      phi = phi1 + phi2 - d * phi1 * phi2;
      lHPrime = -fPrime * d / f1;

      // Keep forward params in sync
      p.d = d;
      p.f1 = f1;
      p.f2 = f2;
    } else {
      // Forward mode
      f1 = p.f1;
      f2 = p.f2;
      d = p.d;

      tan_u1 = h1 / f1;
      h2 = h1 - d * tan_u1;
      tan_u2 = tan_u1 + h2 / f2;

      phi1 = 1 / f1;
      phi2 = 1 / f2;
      phi = phi1 + phi2 - d * phi1 * phi2;

      if (Math.abs(tan_u2) < 1e-6) {
        fPrime = Infinity;
        lFPrime = Infinity;
        L = Infinity;
        lHPrime = 0;
        ratio = 1;
      } else {
        fPrime = h1 / tan_u2;
        lFPrime = h2 / tan_u2;
        L = d + lFPrime;
        lHPrime = lFPrime - fPrime;
        ratio = fPrime / lFPrime;
      }

      // Keep design params in sync if finite
      if (Number.isFinite(fPrime)) p.fPrime = fPrime;
      if (Number.isFinite(L)) p.L = L;
      if (Number.isFinite(lFPrime)) p.lFPrime = lFPrime;
    }

    const compactness = (Number.isFinite(L) && Number.isFinite(fPrime) && fPrime !== 0) ? L / fPrime : 1;
    isTelephoto = compactness < 0.95 && fPrime > 0;
    isRetrofocus = lFPrime > fPrime && fPrime > 0;

    return {
      d, fPrime, L, lFPrime, f1, f2, h1, h2, ratio,
      tan_u1, tan_u2, phi1, phi2, phi, lHPrime,
      compactness, isTelephoto, isRetrofocus, errorMsg
    };
  }

  _renderUI() {
    const res = this.calculate();
    const ctrlList = this.params.calcMode === "design" ? this.config.designControls : this.config.forwardControls;

    ctrlList.forEach(g => {
      const el = this.controlsRoot.querySelector(`#val-${g.key}`);
      const val = this.params[g.key];
      if (el && val !== undefined) {
        const fmtVal = typeof Sim !== "undefined" && Sim.SimUtil ? Sim.SimUtil.fmt(val, g.digits) : val.toFixed(g.digits);
        el.textContent = `${fmtVal}${g.unit ? ` ${g.unit}` : ""}`;
      }
    });

    const readouts = typeof document !== "undefined" ? document.getElementById("readouts") : null;
    if (readouts) {
      readouts.innerHTML = [
        ["正切法关键几何量", `d = ${res.d.toFixed(1)} mm · l′_F = ${Number.isFinite(res.lFPrime) ? res.lFPrime.toFixed(1) + ' mm' : '∞'}<br>L = ${Number.isFinite(res.L) ? res.L.toFixed(1) + ' mm' : '∞'} · h₁/h₂ = ${Number.isFinite(res.ratio) ? res.ratio.toFixed(2) : '∞'}`, "var(--accent-cyan)"],
        ["透镜焦距与光焦度", `f′₁ = ${Number.isFinite(res.f1) ? res.f1.toFixed(1) + ' mm' : '∞'} · f′₂ = ${Number.isFinite(res.f2) ? res.f2.toFixed(1) + ' mm' : '∞'}<br>f′ = ${Number.isFinite(res.fPrime) ? res.fPrime.toFixed(1) + ' mm' : '∞'} · Φ = ${(res.phi * 1000).toFixed(2)} m⁻¹`, "var(--accent-purple)"],
        ["偏转角与远摄特性", `tan u′₁ = ${res.tan_u1.toFixed(4)} · tan u′₂ = ${res.tan_u2.toFixed(4)}<br>l′_H = ${Number.isFinite(res.lHPrime) ? res.lHPrime.toFixed(1) + ' mm' : '∞'} · 远摄比 L/f′ = ${res.compactness.toFixed(3)}`, res.isTelephoto ? "var(--accent-green)" : (res.isRetrofocus ? "var(--accent-cyan)" : "var(--accent-orange)")]
      ].map(x => `<div class="card"><div class="text-muted" style="font-size:11px;margin-bottom:4px;">${x[0]}</div><div class="text-mono" style="font-size:14px;line-height:1.4;color:${x[2]};">${x[1]}</div></div>`).join("");
    }

    this.render();
  }

  render() {
    if (typeof Sim === "undefined" || !this.canvas) return;
    const { ctx, w, h } = Sim.SimUtil.setupCanvas(this.canvas);
    GeoDraw.clear(ctx, w, h);
    const p = this.params;
    const res = this.calculate();

    const leftW = Math.floor(w * 0.55);
    const rightW = w - leftW;
    const axisY = Math.floor(h * 0.44);

    const d = res.d;
    const f1 = res.f1;
    const f2 = res.f2;
    const fPrime = res.fPrime;
    const lFPrime = res.lFPrime;
    const lHPrime = res.lHPrime;
    const L = res.L;
    const h1 = res.h1;
    const h2 = res.h2;

    const xL1 = 0;
    const xL2 = d;
    const xHPrime = Number.isFinite(lHPrime) ? (d + lHPrime) : -200;
    const xFPrime = Number.isFinite(lFPrime) ? (d + lFPrime) : (d + 200);

    let xMin = Math.min(xL1, xL2, xHPrime, xFPrime, -60) - 80;
    let xMax = Math.max(xL1, xL2, xHPrime, xFPrime, 100) + 80;
    if (xMax - xMin < 200) { xMin -= 50; xMax += 50; }

    const benchX = 20;
    const benchW = leftW - 35;
    const scaleX = benchW / (xMax - xMin);
    const toPxX = (xVal) => benchX + (xVal - xMin) * scaleX;
    
    const maxH = Math.max(Math.abs(h1), Math.abs(h2), 35);
    const scaleY = (axisY - 45) / (maxH * 1.35);
    const toPxY = (yVal) => axisY - yVal * scaleY;

    // 动态计算透镜与主面高度，确保透镜箭头充分包裹最高光线并留出足够裕量 (透镜加高)
    const rayMaxPxH = Math.max(Math.abs(h1), Math.abs(h2)) * scaleY;
    const lensHalfH = Math.min(axisY - 20, Math.max(105, rayMaxPxH + 32));
    const lensHeight = lensHalfH * 2;

    // View boundary line
    GeoDraw.line(ctx, { x: leftW - 8, y: 15 }, { x: leftW - 8, y: h - 15 }, "rgba(255,255,255,0.12)", 1, [4, 4]);

    // Optical axis
    GeoDraw.line(ctx, { x: benchX - 5, y: axisY }, { x: benchX + benchW + 5, y: axisY }, "rgba(255,255,255,0.35)", 1.2, [6, 4]);
    GeoDraw.label(ctx, "光轴", benchX - 12, axisY, "rgba(255,255,255,0.4)", "right", 10);

    // Thin lens 1 (L1)
    const pxL1 = toPxX(xL1);
    const isL1Pos = f1 > 0;
    drawThinLensArrow(ctx, pxL1, axisY, lensHeight, isL1Pos, "#22d3ee", "", 2.2);
    GeoDraw.label(ctx, `L₁ (f′₁=${f1.toFixed(0)})`, pxL1, axisY - lensHalfH - 10, "#22d3ee", "center", 11);
    GeoDraw.label(ctx, "O₁", pxL1, axisY + 14, "#22d3ee", "center", 11);

    // Thin lens 2 (L2)
    const pxL2 = toPxX(xL2);
    const isL2Pos = f2 > 0;
    drawThinLensArrow(ctx, pxL2, axisY, lensHeight, isL2Pos, "#a78bfa", "", 2.2);
    GeoDraw.label(ctx, `L₂ (f′₂=${f2.toFixed(0)})`, pxL2, axisY - lensHalfH - 10, "#a78bfa", "center", 11);
    GeoDraw.label(ctx, "O₂", pxL2, axisY + 14, "#a78bfa", "center", 11);

    // Principal plane H'
    if (Number.isFinite(xHPrime)) {
      const pxHPrime = toPxX(xHPrime);
      GeoDraw.line(ctx, { x: pxHPrime, y: axisY - lensHalfH - 6 }, { x: pxHPrime, y: axisY + lensHalfH + 6 }, "#fbbf24", 1.8, [4, 3]);
      GeoDraw.label(ctx, "像方主面 H′", pxHPrime, axisY - lensHalfH - 16, "#fbbf24", "center", 11);
      GeoDraw.label(ctx, "H′", pxHPrime, axisY + 14, "#fbbf24", "center", 11);
    }

    // Focal plane & Focus F'
    if (Number.isFinite(xFPrime)) {
      const pxFPrime = toPxX(xFPrime);
      GeoDraw.line(ctx, { x: pxFPrime, y: axisY - lensHalfH }, { x: pxFPrime, y: axisY + lensHalfH }, "rgba(74, 222, 128, 0.4)", 1.2, [3, 3]);
      ctx.fillStyle = "#4ade80";
      ctx.beginPath();
      ctx.arc(pxFPrime, axisY, 4.5, 0, GeoDraw.TAU);
      ctx.fill();
      GeoDraw.label(ctx, "F′", pxFPrime, axisY + 15, "#4ade80", "center", 12);
    }

    // Ray tracing
    const rayCount = p.rayCount || 3;
    let rayRatios = [1];
    if (rayCount === 3) rayRatios = [1, 0.5, -0.6];
    else if (rayCount === 5) rayRatios = [1, 0.6, 0.2, -0.4, -0.8];
    else if (rayCount === 7) rayRatios = [1, 0.7, 0.4, 0.1, -0.3, -0.6, -0.9];

    const pxInStart = Math.min(pxL1 - 70, toPxX(Math.min(xHPrime, -40)) - 25);

    rayRatios.forEach((factor, idx) => {
      const currH1 = h1 * factor;
      const currH2 = h2 * factor;
      const py1 = toPxY(currH1);
      const py2 = toPxY(currH2);
      const isChief = idx === 0;
      const rayCol = isChief ? "#38bdf8" : (factor > 0 ? "rgba(56, 189, 248, 0.65)" : "rgba(251, 191, 36, 0.65)");
      const rayWidth = isChief ? 2.0 : 1.3;

      // 1) Incoming parallel ray
      GeoDraw.line(ctx, { x: pxInStart, y: py1 }, { x: pxL1, y: py1 }, rayCol, rayWidth);
      if (isChief) {
        GeoDraw.arrow(ctx, { x: pxInStart + 25, y: py1 }, { x: pxInStart + 35, y: py1 }, rayCol, rayWidth);
      }

      // 2) Ray between L1 and L2
      GeoDraw.line(ctx, { x: pxL1, y: py1 }, { x: pxL2, y: py2 }, rayCol, rayWidth);
      if (isChief) {
        GeoDraw.arrow(ctx, { x: pxL1 + (pxL2 - pxL1) * 0.45, y: py1 + (py2 - py1) * 0.45 },
                           { x: pxL1 + (pxL2 - pxL1) * 0.55, y: py1 + (py2 - py1) * 0.55 }, rayCol, rayWidth);
      }

      // 3) Ray from L2 to F'
      if (Number.isFinite(xFPrime)) {
        const pxFPrime = toPxX(xFPrime);
        GeoDraw.line(ctx, { x: pxL2, y: py2 }, { x: pxFPrime, y: axisY }, rayCol, rayWidth);
        if (isChief) {
          GeoDraw.arrow(ctx, { x: pxL2 + (pxFPrime - pxL2) * 0.45, y: py2 + (axisY - py2) * 0.45 },
                             { x: pxL2 + (pxFPrime - pxL2) * 0.55, y: py2 + (axisY - py2) * 0.55 }, rayCol, rayWidth);
        }

        // 4) Virtual backward extension line to H'
        if (p.showExtensions && Number.isFinite(xHPrime)) {
          const pxHPrime = toPxX(xHPrime);
          GeoDraw.line(ctx, { x: pxL2, y: py2 }, { x: pxHPrime, y: py1 }, "rgba(251, 191, 36, 0.55)", 1.2, [4, 3]);

          if (isChief) {
            ctx.fillStyle = "#fbbf24";
            ctx.beginPath();
            ctx.arc(pxHPrime, py1, 4, 0, GeoDraw.TAU);
            ctx.fill();
            GeoDraw.label(ctx, "Q′", pxHPrime - 5, py1 - 8, "#fbbf24", "right", 11);
          }
        }
      }
    });

    // Dimensions
    if (p.showDims) {
      const pyH1 = toPxY(h1);
      GeoDraw.line(ctx, { x: pxL1 - 8, y: pyH1 }, { x: pxL1 - 8, y: axisY }, "#38bdf8", 1.2);
      GeoDraw.label(ctx, `h₁=${h1.toFixed(0)}`, pxL1 - 12, (pyH1 + axisY) / 2, "#38bdf8", "right", 10);

      const pyH2 = toPxY(h2);
      GeoDraw.line(ctx, { x: pxL2 + 8, y: pyH2 }, { x: pxL2 + 8, y: axisY }, "#a78bfa", 1.2);
      GeoDraw.label(ctx, `h₂=${h2.toFixed(1)}`, pxL2 + 12, (pyH2 + axisY) / 2, "#a78bfa", "left", 10);

      const pxFPrime = Number.isFinite(xFPrime) ? toPxX(xFPrime) : pxL2 + 150;
      const pxHPrime = Number.isFinite(xHPrime) ? toPxX(xHPrime) : pxL1 - 80;

      drawDimLine(ctx, pxL1, pxL2, axisY + 38, `d = ${d.toFixed(0)} mm`, "#38bdf8");
      drawDimLine(ctx, pxL2, pxFPrime, axisY + 56, `l′_F = ${lFPrime.toFixed(0)} mm`, "#4ade80");
      drawDimLine(ctx, pxL1, pxFPrime, axisY + 76, `筒长 L = ${L.toFixed(0)} mm`, "#f43f5e");
      drawDimLine(ctx, pxHPrime, pxFPrime, axisY + 98, `组合焦距 f′ = ${fPrime.toFixed(0)} mm`, "#fbbf24");
    }

    // Angles
    if (p.showAngles) {
      GeoDraw.label(ctx, `tan u′₁=${res.tan_u1.toFixed(4)}`, pxL1 + (pxL2 - pxL1) * 0.35, toPxY(h1 * 0.7) - 10, "#38bdf8", "center", 10);
      GeoDraw.label(ctx, `tan u′₂=${res.tan_u2.toFixed(4)}`, pxL2 + 30, toPxY(h2 * 0.5) - 10, "#4ade80", "left", 10);
    }

    // Bottom note
    const statusNote = res.isTelephoto
      ? "🏆 远摄型物镜 (f′ > L): 组合主面 H′ 悬挂在系统前端，机械筒长显著短于等效焦距！"
      : (res.isRetrofocus
        ? "🔍 反远距型物镜 (l′_F > f′): 组合主面 H′ 悬挂在透镜后侧，后工作距显著大于焦距！"
        : "📐 理想光学系统: 正切计算法光路严格满足渡越公式与近轴偏折公式。");
    GeoDraw.label(ctx, statusNote, benchX, h - 20, res.isTelephoto ? "#fbbf24" : (res.isRetrofocus ? "#38bdf8" : "#94a3b8"), "left", 11);

    // Right Side Dashboard
    const rX = leftW + 12;
    const rW = rightW - 24;
    const rY = 16;

    // Card 1: 5-Step Derivation Box
    const box1H = 265;
    ctx.save();
    ctx.fillStyle = "rgba(15, 23, 42, 0.88)";
    ctx.strokeStyle = "rgba(56, 189, 248, 0.35)";
    ctx.lineWidth = 1.2;
    ctx.fillRect(rX, rY, rW, box1H);
    ctx.strokeRect(rX, rY, rW, box1H);

    ctx.fillStyle = "rgba(56, 189, 248, 0.15)";
    ctx.fillRect(rX, rY, rW, 28);
    GeoDraw.label(ctx, "📐 正切计算法 · 逐步公式演算 (教材 P23 例 2-4)", rX + 10, rY + 14, "#38bdf8", "left", 12);

    const stepLines = [
      {
        step: "步骤 1: 几何筒长确定间距 d",
        formula: `L = d + l′_F  ⇒  d = L - l′_F = ${L.toFixed(0)} - ${lFPrime.toFixed(0)} = ${d.toFixed(1)} mm`,
        color: "#e2e8f0"
      },
      {
        step: "步骤 2: 正切角比值确定高度比与 h₂",
        formula: `f′ = h₁/tan u′₂, tan u′₂ = h₂/l′_F  ⇒  h₁/h₂ = f′/l′_F = ${fPrime.toFixed(0)}/${lFPrime.toFixed(0)} = ${res.ratio.toFixed(3)}  ⇒  h₂ = ${h2.toFixed(1)} mm`,
        color: "#e2e8f0"
      },
      {
        step: "步骤 3: 渡越公式求透镜1焦距 f′₁",
        formula: `tan u′₁ = h₁/f′₁, h₂ = h₁ - d·tan u′₁  ⇒  f′₁ = d / (1 - h₂/h₁) = ${res.f1.toFixed(1)} mm`,
        color: "#38bdf8"
      },
      {
        step: "步骤 4: 光焦度偏折求透镜2焦距 f′₂",
        formula: `tan u′₂ = tan u′₁ + h₂/f′₂  ⇒  f′₂ = (d - f′₁) / (1 - f′₁/f′) = ${res.f2.toFixed(1)} mm  (${res.f2 < 0 ? '负透镜' : '正透镜'})`,
        color: "#a78bfa"
      },
      {
        step: "步骤 5: 像主面位置与光焦度校核",
        formula: `l′_H = -f′·d/f′₁ = ${res.lHPrime.toFixed(1)} mm (位于透镜1前方 ${(Math.abs(res.lHPrime) - d).toFixed(1)} mm)`,
        color: "#fbbf24"
      }
    ];

    stepLines.forEach((item, idx) => {
      const curY = rY + 44 + idx * 44;
      GeoDraw.label(ctx, item.step, rX + 10, curY, "#94a3b8", "left", 10.5);
      GeoDraw.label(ctx, item.formula, rX + 10, curY + 17, item.color, "left", 10.5);
    });
    ctx.restore();

    // Card 2: Compactness & Telephoto Gauge
    const box2Y = rY + box1H + 12;
    const box2H = h - box2Y - 16;
    ctx.save();
    ctx.fillStyle = "rgba(15, 23, 42, 0.88)";
    ctx.strokeStyle = "rgba(251, 191, 36, 0.35)";
    ctx.lineWidth = 1.2;
    ctx.fillRect(rX, box2Y, rW, box2H);
    ctx.strokeRect(rX, box2Y, rW, box2H);

    ctx.fillStyle = "rgba(251, 191, 36, 0.12)";
    ctx.fillRect(rX, box2Y, rW, 26);
    GeoDraw.label(ctx, "🌟 远摄比分析与机械尺寸紧凑度", rX + 10, box2Y + 13, "#fbbf24", "left", 11.5);

    GeoDraw.label(ctx, `远摄比 (紧凑度系数): K = 筒长 L / 焦距 f′ = ${res.compactness.toFixed(3)}`, rX + 12, box2Y + 42, "#e2e8f0", "left", 11);

    const barX = rX + 12;
    const barW = rW - 24;
    const barY1 = box2Y + 62;
    const maxVal = Math.max(fPrime, L, 100);

    // 1. Focal length bar
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    ctx.fillRect(barX, barY1, barW, 14);
    const fRatio = Math.min(1, Math.max(0, fPrime / maxVal));
    ctx.fillStyle = "#fbbf24";
    ctx.fillRect(barX, barY1, barW * fRatio, 14);
    GeoDraw.label(ctx, `组合焦距 f′: ${fPrime.toFixed(0)} mm (100%)`, barX + 6, barY1 + 7, "#0f172a", "left", 10);

    // 2. Tube length bar
    const barY2 = barY1 + 22;
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    ctx.fillRect(barX, barY2, barW, 14);
    const lRatio = Math.min(1, Math.max(0, L / maxVal));
    ctx.fillStyle = "#38bdf8";
    ctx.fillRect(barX, barY2, barW * lRatio, 14);
    GeoDraw.label(ctx, `机械筒长 L: ${L.toFixed(0)} mm (${(res.compactness * 100).toFixed(1)}%)`, barX + 6, barY2 + 7, "#0f172a", "left", 10);

    if (res.compactness < 1.0) {
      const saved = ((1 - res.compactness) * 100).toFixed(1);
      GeoDraw.label(ctx, `✨ 空间压缩效益: 相比单透镜，镜头物理筒长缩短了 ${saved}%！`, barX, barY2 + 28, "#4ade80", "left", 10.5);
    } else {
      GeoDraw.label(ctx, `💡 后工作距充裕度: 工作距比焦距大 ${(res.compactness * 100 - 100).toFixed(1)}%`, barX, barY2 + 28, "#38bdf8", "left", 10.5);
    }

    ctx.restore();
  }
}

// 导出与全局挂载
window.GeometricSim = GeometricSim;
window.FocalPointsSim = FocalPointsSim;
window.PrincipalPointsSim = PrincipalPointsSim;
window.NodalPointsSim = NodalPointsSim;
window.CardinalPointsSim = CardinalPointsSim;
window.FocalIndexSim = FocalIndexSim;
window.GaussNewtonSim = GaussNewtonSim;
window.MagnificationSim = MagnificationSim;
window.IdealComboSim = IdealComboSim;
window.ThinLensComboSim = IdealComboSim;
window.LensCombinationSim = LensCombinationSim;
window.TangentMethodSim = TangentMethodSim;


class Prism3DSim {
  constructor(canvasId, controlsId) {
    this.canvas = document.getElementById(canvasId);
    this.controlsRoot = document.getElementById(controlsId);
    this.config = {
      defaults: {
        prismType: "right-angle",
        doveAngle: 45,
        pentaTilt: 0,
        cornerPitch: 15,
        cornerYaw: 15,
        beamMode: "bundle",
        rotX: 0.42,
        rotY: -0.65,
        zoom: 1.0,
        autoRotate: false,
      },
      options: [
        {
          group: "一次反射棱镜（教材 P36 图 3-4）",
          items: [
            { value: "right-angle", label: "直角棱镜（一次反射 · 90°偏折）" },
            { value: "isosceles", label: "等腰棱镜（一次反射 · 顶角偏向）" },
            { value: "dove-h", label: "道威棱镜（水平放置 · 同轴倒像）" },
            { value: "dove-rot", label: "道威棱镜（旋转转像 · 转θ像转2θ）" },
          ],
        },
        {
          group: "二次反射棱镜组（教材 P36 图 3-5）",
          items: [
            { value: "half-penta", label: "半五角棱镜（45°偏折 · 两次反射）" },
            { value: "right-30", label: "30°直角棱镜（30°偏折 · 两次反射）" },
            { value: "pentaprism", label: "五角棱镜（90°恒定偏折 · 测距水准）" },
            { value: "porro-single", label: "直角折返棱镜（180°偏折 · 两次反射）" },
            { value: "rhomboid", label: "斜方棱镜（平行平移 · 保持同向）" },
          ],
        },
        {
          group: "特种与复合棱镜（教材 P37 图 3-6~3-10）",
          items: [
            { value: "roof-amici", label: "直角屋脊棱镜（Amici · 完全转像）" },
            { value: "schmidt", label: "施密特棱镜（45°折转 · 紧凑折叠）" },
            { value: "corner-cube", label: "立方角锥棱镜（3D全向回归反射）" },
            { value: "dichroic", label: "分色棱镜组（3-CCD RGB分光光路）" },
          ],
        },
        {
          group: "转像棱镜系统（教材 P38 图 3-11）",
          items: [
            { value: "porro-1", label: "普罗 I 型转像系统（双直角正交组合）" },
            { value: "porro-2", label: "普罗 II 型转像系统（紧凑胶合型）" },
          ],
        },
      ],
    };
    this.params = Object.assign({}, this.config.defaults);
    this.render = this.render.bind(this);
    this._initEvents();
    this._setupControls();
    this._unobserveResize = Sim.SimUtil.observeCanvas(this.canvas, this.render);
    this._renderUI();
  }

  update(dt) {
    if (this.params.autoRotate) {
      this.params.rotY += 0.5 * (dt || 0.016);
    }
  }

  destroy() {
    this._unobserveResize?.();
    if (this._animId) cancelAnimationFrame(this._animId);
    this._removeEvents?.();
  }

  reset() {
    Object.assign(this.params, this.config.defaults);
    this._renderUI();
  }

  togglePlay(btn) {
    this.params.autoRotate = !this.params.autoRotate;
    if (btn) btn.textContent = this.params.autoRotate ? "⏸ 暂停旋转" : "▶ 自动旋转";
    if (this.params.autoRotate) {
      this._startAutoRotate();
    } else {
      if (this._animId) cancelAnimationFrame(this._animId);
      this.render();
    }
  }

  snapshot() {
    const a = document.createElement("a");
    a.download = `prism-3d-${this.params.prismType}.png`;
    a.href = this.canvas.toDataURL("image/png");
    a.click();
  }

  _startAutoRotate() {
    if (this._animId) cancelAnimationFrame(this._animId);
    const loop = () => {
      if (!this.params.autoRotate) return;
      this.params.rotY += 0.008;
      this.render();
      this._animId = requestAnimationFrame(loop);
    };
    this._animId = requestAnimationFrame(loop);
  }

  _initEvents() {
    let isDragging = false;
    let startX = 0, startY = 0;
    const onMouseDown = (e) => {
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
    };
    const onMouseMove = (e) => {
      if (!isDragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      startX = e.clientX;
      startY = e.clientY;
      this.params.rotY += dx * 0.008;
      this.params.rotX += dy * 0.008;
      this.params.rotX = Math.max(-1.5, Math.min(1.5, this.params.rotX));
      this.render();
    };
    const onMouseUp = () => { isDragging = false; };
    const onTouchStart = (e) => {
      if (e.touches && e.touches[0]) {
        isDragging = true;
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
      }
    };
    const onTouchMove = (e) => {
      if (!isDragging || !e.touches || !e.touches[0]) return;
      const dx = e.touches[0].clientX - startX;
      const dy = e.touches[0].clientY - startY;
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      this.params.rotY += dx * 0.008;
      this.params.rotX += dy * 0.008;
      this.params.rotX = Math.max(-1.5, Math.min(1.5, this.params.rotX));
      this.render();
    };
    const onTouchEnd = () => { isDragging = false; };
    const onWheel = (e) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.92 : 1.08;
      this.params.zoom = Math.max(0.5, Math.min(2.5, this.params.zoom * delta));
      this.render();
    };

    if (this.canvas?.addEventListener) {
      this.canvas.addEventListener("mousedown", onMouseDown);
      this.canvas.addEventListener("wheel", onWheel, { passive: false });
      this.canvas.addEventListener("touchstart", onTouchStart, { passive: true });
      this.canvas.addEventListener("touchmove", onTouchMove, { passive: true });
      this.canvas.addEventListener("touchend", onTouchEnd, { passive: true });
    }
    if (typeof window !== "undefined" && window.addEventListener) {
      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
    }

    this._removeEvents = () => {
      this.canvas?.removeEventListener?.("mousedown", onMouseDown);
      window?.removeEventListener?.("mousemove", onMouseMove);
      window?.removeEventListener?.("mouseup", onMouseUp);
      this.canvas?.removeEventListener?.("wheel", onWheel);
      this.canvas?.removeEventListener?.("touchstart", onTouchStart);
      this.canvas?.removeEventListener?.("touchmove", onTouchMove);
      this.canvas?.removeEventListener?.("touchend", onTouchEnd);
    };
  }

  _setupControls() {
    let html = `
      <div class="control-group">
        <div class="control-row"><span class="control-label" style="color:#a78bfa;font-weight:600;">选择 3D 棱镜模型</span></div>
        <select id="prismType" style="width:100%; padding:6px 8px; background:#0f172a; color:#fff; border:1px solid rgba(255,255,255,0.25); border-radius:6px; margin-top:5px; font-size:13px;">`;

    this.config.options.forEach((grp) => {
      html += `<optgroup label="${grp.group}">`;
      grp.items.forEach((opt) => {
        html += `<option value="${opt.value}" ${this.params.prismType === opt.value ? "selected" : ""}>${opt.label}</option>`;
      });
      html += `</optgroup>`;
    });
    html += `</select></div>`;

    // Dynamic control groups based on prismType
    html += `<div id="dynamic-controls"></div>`;

    // Global View Controls
    html += `
      <div class="control-group" style="margin-top:14px; padding-top:12px; border-top:1px solid rgba(255,255,255,0.1);">
        <div class="control-row"><span class="control-label">光束显示模式</span></div>
        <select id="beamMode" style="width:100%; padding:5px; background:#0f172a; color:#fff; border:1px solid rgba(255,255,255,0.2); border-radius:4px; margin-top:4px;">
          <option value="bundle" ${this.params.beamMode === "bundle" ? "selected" : ""}>准直光束组（展现像取向/旋转）</option>
          <option value="single" ${this.params.beamMode === "single" ? "selected" : ""}>单根主光线（清晰观察几何光路）</option>
        </select>
      </div>
      <div class="control-group" style="margin-top:10px;">
        <div class="control-row"><span class="control-label">视角预设切换</span></div>
        <div style="display:grid; grid-template-columns:repeat(4, 1fr); gap:4px; margin-top:4px;">
          <button class="btn btn-ghost btn-sm" id="view-iso" style="padding:3px;font-size:11px;">立体</button>
          <button class="btn btn-ghost btn-sm" id="view-top" style="padding:3px;font-size:11px;">俯视</button>
          <button class="btn btn-ghost btn-sm" id="view-front" style="padding:3px;font-size:11px;">正视</button>
          <button class="btn btn-ghost btn-sm" id="view-side" style="padding:3px;font-size:11px;">侧视</button>
        </div>
      </div>
      <div style="margin-top:12px; font-size:11px; color:#94a3b8; line-height:1.5;">
        💡 提示：在画布中按住<b>左键拖拽</b>可任意旋转 3D 视角；<b>滑动滚轮</b>可放大/缩小观察细节。
      </div>
    `;

    this.controlsRoot.innerHTML = html;

    this.controlsRoot.querySelector("#prismType").addEventListener("change", (e) => {
      this.params.prismType = e.target.value;
      this._updateDynamicControls();
      this._renderUI();
    });

    this.controlsRoot.querySelector("#beamMode").addEventListener("change", (e) => {
      this.params.beamMode = e.target.value;
      this.render();
    });

    this.controlsRoot.querySelector("#view-iso").addEventListener("click", () => {
      this.params.rotX = 0.42; this.params.rotY = -0.65; this.render();
    });
    this.controlsRoot.querySelector("#view-top").addEventListener("click", () => {
      this.params.rotX = Math.PI / 2; this.params.rotY = 0; this.render();
    });
    this.controlsRoot.querySelector("#view-front").addEventListener("click", () => {
      this.params.rotX = 0; this.params.rotY = 0; this.render();
    });
    this.controlsRoot.querySelector("#view-side").addEventListener("click", () => {
      this.params.rotX = 0; this.params.rotY = -Math.PI / 2; this.render();
    });

    this._updateDynamicControls();
  }

  _updateDynamicControls() {
    const container = this.controlsRoot.querySelector("#dynamic-controls");
    if (!container) return;
    const type = this.params.prismType;
    let html = "";

    if (type === "dove-rot") {
      html += `
        <div class="control-group" style="margin-top:10px;">
          <div class="control-row"><span class="control-label">棱镜绕光轴转角 θ</span><span class="control-value" id="val-doveAngle">${this.params.doveAngle}°</span></div>
          <input type="range" min="-90" max="90" step="1" value="${this.params.doveAngle}" id="slider-doveAngle" />
          <div style="font-size:11px; color:#fbbf24; margin-top:3px;">转动棱镜 θ，出射像同向旋转 2θ = <span id="val-dove2theta">${2 * this.params.doveAngle}</span>°</div>
        </div>
      `;
    } else if (type === "pentaprism") {
      html += `
        <div class="control-group" style="margin-top:10px;">
          <div class="control-row"><span class="control-label">棱镜主截面微摆角</span><span class="control-value" id="val-pentaTilt">${this.params.pentaTilt}°</span></div>
          <input type="range" min="-15" max="15" step="0.5" value="${this.params.pentaTilt}" id="slider-pentaTilt" />
          <div style="font-size:11px; color:#4ade80; margin-top:3px;">无论棱镜如何晃动，出射偏折角严格恒等于 90°！</div>
        </div>
      `;
    } else if (type === "corner-cube") {
      html += `
        <div class="control-group" style="margin-top:10px;">
          <div class="control-row"><span class="control-label">入射光俯仰角</span><span class="control-value" id="val-cornerPitch">${this.params.cornerPitch}°</span></div>
          <input type="range" min="-30" max="30" step="1" value="${this.params.cornerPitch}" id="slider-cornerPitch" />
        </div>
        <div class="control-group" style="margin-top:8px;">
          <div class="control-row"><span class="control-label">入射光方位角</span><span class="control-value" id="val-cornerYaw">${this.params.cornerYaw}°</span></div>
          <input type="range" min="-30" max="30" step="1" value="${this.params.cornerYaw}" id="slider-cornerYaw" />
          <div style="font-size:11px; color:#38bdf8; margin-top:3px;">全向回归反射：经三垂直面反射，出射光始终平行且反向返回！</div>
        </div>
      `;
    }

    container.innerHTML = html;

    if (type === "dove-rot") {
      const s = container.querySelector("#slider-doveAngle");
      s?.addEventListener("input", (e) => {
        this.params.doveAngle = parseFloat(e.target.value);
        container.querySelector("#val-doveAngle").textContent = `${this.params.doveAngle}°`;
        container.querySelector("#val-dove2theta").textContent = `${2 * this.params.doveAngle}`;
        this.render();
      });
    } else if (type === "pentaprism") {
      const s = container.querySelector("#slider-pentaTilt");
      s?.addEventListener("input", (e) => {
        this.params.pentaTilt = parseFloat(e.target.value);
        container.querySelector("#val-pentaTilt").textContent = `${this.params.pentaTilt}°`;
        this.render();
      });
    } else if (type === "corner-cube") {
      container.querySelector("#slider-cornerPitch")?.addEventListener("input", (e) => {
        this.params.cornerPitch = parseFloat(e.target.value);
        container.querySelector("#val-cornerPitch").textContent = `${this.params.cornerPitch}°`;
        this.render();
      });
      container.querySelector("#slider-cornerYaw")?.addEventListener("input", (e) => {
        this.params.cornerYaw = parseFloat(e.target.value);
        container.querySelector("#val-cornerYaw").textContent = `${this.params.cornerYaw}°`;
        this.render();
      });
    }
  }

  _renderUI() {
    const meta = this._getPrismMeta();
    document.getElementById("readouts").innerHTML = [
      ["棱镜名称与教材出处", meta.name, "var(--accent-green)"],
      ["光轴转折偏角", meta.deviation, "var(--accent-orange)"],
      ["反射次数与手性", meta.chirality, "var(--accent-cyan)"],
      ["典型仪器应用", meta.application, "var(--accent-purple)"],
    ]
      .map(
        (x) =>
          `<div class="card"><div class="text-muted" style="font-size:11px;margin-bottom:4px;">${x[0]}</div><div class="text-mono" style="font-size:14px;color:${x[2]};">${x[1]}</div></div>`
      )
      .join("");
    this.render();
  }

  _getPrismMeta() {
    const map = {
      "right-angle": {
        name: "直角棱镜 (教材 P36 图 3-4a)",
        deviation: "90° 单次直角折转",
        chirality: "奇数次反射 (1次) · 镜像翻转",
        application: "潜望镜、照相机单反五棱镜前段、转折光路",
      },
      isosceles: {
        name: "等腰棱镜 (教材 P36 图 3-4b)",
        deviation: "180° − 2α (由顶角决定)",
        chirality: "奇数次反射 (1次) · 镜像翻转",
        application: "连续可变偏折系统、光谱单色仪光路折转",
      },
      "dove-h": {
        name: "道威棱镜-水平 (教材 P36 图 3-4c)",
        deviation: "0° (同轴直通，无偏折)",
        chirality: "奇数次反射 (1次) · 仅颠倒垂直坐标",
        application: "周视瞄准仪、图像旋转校正、全景潜望瞄具",
      },
      "dove-rot": {
        name: "道威棱镜-旋转 (教材 P36 图 3-4c/表 3-1)",
        deviation: "0° (光轴保持同轴)",
        chirality: "像同向旋转 2θ · 镜像手性随角变换",
        application: "像旋消除系统、旋转摄影、光学消旋器",
      },
      "half-penta": {
        name: "半五角棱镜 (教材 P36 图 3-5a)",
        deviation: "45° 空间折折角",
        chirality: "偶数次反射 (2次) · 保持原物手性",
        application: "双目光学仪器、倾斜45°目镜筒观察系统",
      },
      "right-30": {
        name: "30°直角棱镜 (教材 P36 图 3-5b)",
        deviation: "30° 偏折",
        chirality: "偶数次反射 (2次) · 保持原物手性",
        application: "特殊测绘仪器折光路、激光准直偏转器",
      },
      pentaprism: {
        name: "五角棱镜 (教材 P36 图 3-5c)",
        deviation: "90° 恒定偏角（晃动不改角度）",
        chirality: "偶数次反射 (2次) · 保持原物手性",
        application: "高精度光学测距仪、精密水准仪、全站仪",
      },
      "porro-single": {
        name: "直角折返棱镜 (教材 P36 图 3-5d)",
        deviation: "180° 折返（反向平行出射）",
        chirality: "偶数次反射 (2次) · 保持原物手性",
        application: "普罗棱镜单元、自准直测量光路折返",
      },
      rhomboid: {
        name: "斜方棱镜 (教材 P36 图 3-5e)",
        deviation: "0° 无角偏折（纯侧向平移）",
        chirality: "偶数次反射 (2次) · 物像完全一致",
        application: "双筒显微镜目距调节、潜望镜光轴平移",
      },
      "roof-amici": {
        name: "直角屋脊棱镜 (教材 P37 图 3-7)",
        deviation: "90° 折转并完全转像",
        chirality: "屋脊双反射 (偶数次) · 完全转正正像",
        application: "望远镜直角目镜筒、地面观测测绘望远镜",
      },
      schmidt: {
        name: "施密特棱镜 (教材 P37 图 3-6)",
        deviation: "45° 折折折叠光路",
        chirality: "三次反射 · 折叠极短空间光路",
        application: "紧凑型步枪瞄准镜、45°倾斜观鸟镜",
      },
      "corner-cube": {
        name: "立方角锥棱镜 (教材 P37 图 3-8)",
        deviation: "180° 全向三维回归共轭反向",
        chirality: "三次相互垂直反射 · v_out = -v_in",
        application: "激光卫星测距、月球激光反射器、测量全站仪",
      },
      dichroic: {
        name: "分色棱镜组 (教材 P37 图 3-10)",
        deviation: "三原色 RGB 空间分光",
        chirality: "介质膜 a 反蓝透红绿，膜 b 反红透绿",
        application: "广播级 3-CCD 摄像机、工业高精度彩色扫描仪",
      },
      "porro-1": {
        name: "普罗 I 型转像系统 (教材 P38 图 3-11a)",
        deviation: "0° (平行偏心出射)",
        chirality: "四次反射 · 彻底将倒像转为完全正像",
        application: "经典开普勒双筒望远镜（Binoculars）核心转正系统",
      },
      "porro-2": {
        name: "普罗 II 型转像系统 (教材 P38 图 3-11b)",
        deviation: "0° (三棱镜紧凑胶合)",
        chirality: "四次正交反射 · 空间完全转像",
        application: "高档紧凑型双筒望远镜、短镜身观测仪",
      },
    };
    return map[this.params.prismType] || map["right-angle"];
  }

  // --- 3D Projection Math ---
  project3D(pt, rotX, rotY, zoom, cx, cy) {
    const cosY = Math.cos(rotY), sinY = Math.sin(rotY);
    const x1 = pt.x * cosY + pt.z * sinY;
    const y1 = pt.y;
    const z1 = -pt.x * sinY + pt.z * cosY;

    const cosX = Math.cos(rotX), sinX = Math.sin(rotX);
    const x2 = x1;
    const y2 = y1 * cosX - z1 * sinX;
    const z2 = y1 * sinX + z1 * cosX;

    const d = 620;
    const factor = (d / (d + z2 * 0.75)) * zoom;
    return {
      x: cx + x2 * factor,
      y: cy - y2 * factor, // -y because canvas Y points down
      z: z2,
    };
  }

  render() {
    const { ctx, w, h } = Sim.SimUtil.setupCanvas(this.canvas);
    GeoDraw.clear(ctx, w, h);

    const cx = w * 0.50;
    const cy = h * 0.52;
    const { rotX, rotY, zoom } = this.params;

    // Draw coordinate space ground grid
    this._drawGrid(ctx, rotX, rotY, zoom, cx, cy);

    // Build model geometry
    const model = this._buildModel();

    // Render 3D Model: depth-sort faces
    this._renderFaces(ctx, model.faces, model.vertices, rotX, rotY, zoom, cx, cy);

    // Render 3D Light Rays
    this._renderRays(ctx, model.rays, rotX, rotY, zoom, cx, cy);

    // Render Input & Output Triads
    if (model.inputTriad) {
      this._renderTriad(ctx, model.inputTriad, "输入坐标 (物)", "#f87171", "#4ade80", "#60a5fa", rotX, rotY, zoom, cx, cy);
    }
    if (model.outputTriad) {
      this._renderTriad(ctx, model.outputTriad, "输出坐标 (像)", "#f87171", "#4ade80", "#60a5fa", rotX, rotY, zoom, cx, cy);
    }

    // Title & Watermark on canvas
    const meta = this._getPrismMeta();
    GeoDraw.label(ctx, meta.name, 25, 30, "#22d3ee", "left", 16);
    GeoDraw.label(ctx, `光轴偏折: ${meta.deviation}  |  ${meta.chirality}`, 25, 52, "#94a3b8", "left", 12);
  }

  _drawGrid(ctx, rotX, rotY, zoom, cx, cy) {
    ctx.save();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.06)";
    ctx.lineWidth = 1;
    const gridSize = 140;
    const step = 35;
    const yGrid = -70;

    for (let x = -gridSize; x <= gridSize; x += step) {
      const p1 = this.project3D({ x, y: yGrid, z: -gridSize }, rotX, rotY, zoom, cx, cy);
      const p2 = this.project3D({ x, y: yGrid, z: gridSize }, rotX, rotY, zoom, cx, cy);
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    }
    for (let z = -gridSize; z <= gridSize; z += step) {
      const p1 = this.project3D({ x: -gridSize, y: yGrid, z }, rotX, rotY, zoom, cx, cy);
      const p2 = this.project3D({ x: gridSize, y: yGrid, z }, rotX, rotY, zoom, cx, cy);
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    }
    ctx.restore();
  }

  _renderFaces(ctx, faces, vertices, rotX, rotY, zoom, cx, cy) {
    // Project all vertices first
    const projected = vertices.map((v) => this.project3D(v, rotX, rotY, zoom, cx, cy));

    // Calculate depth (average z) for each face
    const sortedFaces = faces
      .map((face, index) => {
        let sumZ = 0;
        face.indices.forEach((idx) => {
          sumZ += projected[idx].z;
        });
        return {
          face,
          avgZ: sumZ / face.indices.length,
          index,
        };
      })
      .sort((a, b) => b.avgZ - a.avgZ); // Draw farthest (largest Z) first

    sortedFaces.forEach(({ face }) => {
      const pts = face.indices.map((idx) => projected[idx]);
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) {
        ctx.lineTo(pts[i].x, pts[i].y);
      }
      ctx.closePath();

      // Style according to face type
      if (face.type === "silvered") {
        ctx.fillStyle = "rgba(245, 158, 11, 0.40)";
        ctx.strokeStyle = "#fbbf24";
        ctx.lineWidth = 2.0;
      } else if (face.type === "dichroic-a") {
        ctx.fillStyle = "rgba(59, 130, 246, 0.50)";
        ctx.strokeStyle = "#60a5fa";
        ctx.lineWidth = 2.0;
      } else if (face.type === "dichroic-b") {
        ctx.fillStyle = "rgba(239, 68, 68, 0.50)";
        ctx.strokeStyle = "#f87171";
        ctx.lineWidth = 2.0;
      } else if (face.type === "roof") {
        ctx.fillStyle = "rgba(167, 139, 250, 0.28)";
        ctx.strokeStyle = "#c084fc";
        ctx.lineWidth = 2.0;
      } else {
        // Standard glass face
        ctx.fillStyle = "rgba(56, 189, 248, 0.16)";
        ctx.strokeStyle = "rgba(56, 189, 248, 0.65)";
        ctx.lineWidth = 1.4;
      }

      ctx.fill();
      ctx.stroke();

      // Optional face label
      if (face.label) {
        let midX = 0, midY = 0;
        pts.forEach((p) => { midX += p.x; midY += p.y; });
        midX /= pts.length; midY /= pts.length;
        ctx.fillStyle = "rgba(255,255,255,0.75)";
        ctx.font = "11px Inter, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(face.label, midX, midY + 4);
      }

      ctx.restore();
    });
  }

  _renderRays(ctx, rays, rotX, rotY, zoom, cx, cy) {
    if (!rays) return;
    const isSingle = this.params.beamMode === "single";

    rays.forEach((ray) => {
      if (isSingle && ray.isSideRay) return;
      const pts = ray.points.map((p) => this.project3D(p, rotX, rotY, zoom, cx, cy));
      ctx.save();
      ctx.strokeStyle = ray.color || "#fbbf24";
      ctx.lineWidth = ray.width || 2.4;
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) {
        ctx.lineTo(pts[i].x, pts[i].y);
      }
      ctx.stroke();

      // Draw arrowheads along each segment
      for (let i = 0; i < pts.length - 1; i++) {
        const pA = pts[i], pB = pts[i + 1];
        const segLen = Math.hypot(pB.x - pA.x, pB.y - pA.y);
        if (segLen > 25) {
          const midX = (pA.x + pB.x) / 2;
          const midY = (pA.y + pB.y) / 2;
          const angle = Math.atan2(pB.y - pA.y, pB.x - pA.x);
          ctx.fillStyle = ray.color || "#fbbf24";
          ctx.beginPath();
          ctx.moveTo(midX + 7 * Math.cos(angle), midY + 7 * Math.sin(angle));
          ctx.lineTo(midX + 6 * Math.cos(angle + 2.5), midY + 6 * Math.sin(angle + 2.5));
          ctx.lineTo(midX + 6 * Math.cos(angle - 2.5), midY + 6 * Math.sin(angle - 2.5));
          ctx.closePath();
          ctx.fill();
        }
      }

      // Label at exit of ray
      if (ray.label) {
        const last = pts[pts.length - 1];
        ctx.fillStyle = ray.color || "#fbbf24";
        ctx.font = "12px Inter, sans-serif";
        ctx.textAlign = "left";
        ctx.fillText(ray.label, last.x + 8, last.y + 4);
      }

      ctx.restore();
    });
  }

  _renderTriad(ctx, triad, title, colX, colY, colZ, rotX, rotY, zoom, cx, cy) {
    const o = this.project3D(triad.origin, rotX, rotY, zoom, cx, cy);
    const xP = this.project3D({ x: triad.origin.x + triad.x.x, y: triad.origin.y + triad.x.y, z: triad.origin.z + triad.x.z }, rotX, rotY, zoom, cx, cy);
    const yP = this.project3D({ x: triad.origin.x + triad.y.x, y: triad.origin.y + triad.y.y, z: triad.origin.z + triad.y.z }, rotX, rotY, zoom, cx, cy);
    const zP = this.project3D({ x: triad.origin.x + triad.z.x, y: triad.origin.y + triad.z.y, z: triad.origin.z + triad.z.z }, rotX, rotY, zoom, cx, cy);

    ctx.save();
    // X axis (Red)
    GeoDraw.arrow(ctx, o, xP, colX, 2.0);
    GeoDraw.label(ctx, "x", xP.x + 6, xP.y + 3, colX, "left", 11);
    // Y axis (Green)
    GeoDraw.arrow(ctx, o, yP, colY, 2.0);
    GeoDraw.label(ctx, "y", yP.x + 6, yP.y + 3, colY, "left", 11);
    // Z axis (Blue)
    GeoDraw.arrow(ctx, o, zP, colZ, 2.0);
    GeoDraw.label(ctx, "z", zP.x + 6, zP.y + 3, colZ, "left", 11);

    if (title) {
      GeoDraw.label(ctx, title, o.x, o.y + 22, "#cbd5e1", "center", 11);
    }
    ctx.restore();
  }

  // --- 3D Geometric Prism Models Builder ---
  _buildModel() {
    const type = this.params.prismType;
    if (type === "right-angle") return this._modelRightAngle();
    if (type === "isosceles") return this._modelIsosceles();
    if (type === "dove-h") return this._modelDove(0);
    if (type === "dove-rot") return this._modelDove((this.params.doveAngle * Math.PI) / 180);
    if (type === "half-penta") return this._modelHalfPenta();
    if (type === "right-30") return this._modelRight30();
    if (type === "pentaprism") return this._modelPentaprism();
    if (type === "porro-single") return this._modelPorroSingle();
    if (type === "rhomboid") return this._modelRhomboid();
    if (type === "roof-amici") return this._modelRoofAmici();
    if (type === "schmidt") return this._modelSchmidt();
    if (type === "corner-cube") return this._modelCornerCube();
    if (type === "dichroic") return this._modelDichroic();
    if (type === "porro-1") return this._modelPorro1();
    if (type === "porro-2") return this._modelPorro2();
    return this._modelRightAngle();
  }

  // 1. 直角棱镜（教材 P36 图 3-4a）
  // 等腰直角柱：光线垂直入射，45° 斜面发生一次全反射，垂直出射，偏折 90°，成镜像
  _modelRightAngle() {
    const s = 48, h = 42;
    // 截面直角在 (-s, -s)：
    // 入射面：垂直左侧面 x = -s，光线沿 +x 入射
    // 出射面：水平底面 y = -s，光线沿 -y 出射
    // 全反射斜面：从 (-s, s) 到 (s, -s)，中点 (0, 0)，法线为 (1/sqrt2, 1/sqrt2)
    const vertices = [
      { x: -s, y: -s, z: -h }, // 0
      { x: -s, y: s, z: -h },  // 1: top-left corner
      { x: s, y: -s, z: -h },  // 2: bottom-right corner
      { x: -s, y: -s, z: h },   // 3
      { x: -s, y: s, z: h },    // 4
      { x: s, y: -s, z: h },    // 5
    ];
    const faces = [
      { indices: [0, 1, 4, 3], type: "refract", label: "入射面 (垂直)" },
      { indices: [0, 2, 5, 3], type: "refract", label: "出射面 (水平)" },
      { indices: [1, 2, 5, 4], type: "reflect", label: "45° 全反射面" },
      { indices: [0, 2, 1], type: "base" },
      { indices: [3, 4, 5], type: "base" },
    ];
    const rays = [
      {
        points: [
          { x: -125, y: 0, z: 0 },
          { x: -s, y: 0, z: 0 },
          { x: 0, y: 0, z: 0 },
          { x: 0, y: -s, z: 0 },
          { x: 0, y: -125, z: 0 },
        ],
        color: "#fbbf24", width: 2.8,
      },
      {
        points: [
          { x: -125, y: 0, z: 18 },
          { x: -s, y: 0, z: 18 },
          { x: 0, y: 0, z: 18 },
          { x: 0, y: -s, z: 18 },
          { x: 0, y: -125, z: 18 },
        ],
        color: "#4ade80", width: 1.8, isSideRay: true,
      },
      {
        points: [
          { x: -125, y: 20, z: 0 },
          { x: -s, y: 20, z: 0 },
          { x: -20, y: 20, z: 0 },
          { x: -20, y: -s, z: 0 },
          { x: -20, y: -125, z: 0 },
        ],
        color: "#f87171", width: 1.8, isSideRay: true,
      },
    ];
    const inputTriad = {
      origin: { x: -110, y: 0, z: 0 },
      x: { x: 0, y: 22, z: 0 }, y: { x: 0, y: 0, z: 22 }, z: { x: 22, y: 0, z: 0 },
    };
    const outputTriad = {
      origin: { x: 0, y: -110, z: 0 },
      x: { x: -22, y: 0, z: 0 }, y: { x: 0, y: 0, z: 22 }, z: { x: 0, y: -22, z: 0 },
    };
    return { vertices, faces, rays, inputTriad, outputTriad };
  }

  // 2. 等腰棱镜（教材 P36 图 3-4b）
  // 顶角 α，底面反射。入射光垂直于左腰入射，底面全反射，垂直于右腰出射
  _modelIsosceles() {
    const w = 55, h = 42, H = 72;
    const vertices = [
      { x: -w, y: -H / 2, z: -h }, // 0: left base
      { x: w, y: -H / 2, z: -h },  // 1: right base
      { x: 0, y: H / 2, z: -h },   // 2: apex
      { x: -w, y: -H / 2, z: h },  // 3
      { x: w, y: -H / 2, z: h },   // 4
      { x: 0, y: H / 2, z: h },    // 5
    ];
    const faces = [
      { indices: [0, 2, 5, 3], type: "refract", label: "入射面 (左腰)" },
      { indices: [2, 1, 4, 5], type: "refract", label: "出射面 (右腰)" },
      { indices: [0, 1, 4, 3], type: "reflect", label: "底面全反射" },
      { indices: [0, 1, 2], type: "base" },
      { indices: [3, 5, 4], type: "base" },
    ];
    const lenL = Math.hypot(w, H);
    const nx = H / lenL, ny = -w / lenL;
    const pEnter = { x: -w / 2, y: 0, z: 0 };
    const pRefl = { x: 0, y: -H / 2, z: 0 };
    const pExit = { x: w / 2, y: 0, z: 0 };
    const dist = 75;
    const rays = [
      {
        points: [
          { x: pEnter.x - nx * dist, y: pEnter.y - ny * dist, z: 0 },
          pEnter,
          pRefl,
          pExit,
          { x: pExit.x + nx * dist, y: pExit.y - ny * dist, z: 0 },
        ],
        color: "#fbbf24", width: 2.8,
      },
    ];
    const inputTriad = {
      origin: { x: pEnter.x - nx * 45, y: pEnter.y - ny * 45, z: 0 },
      x: { x: -ny * 22, y: nx * 22, z: 0 }, y: { x: 0, y: 0, z: 22 }, z: { x: nx * 22, y: ny * 22, z: 0 },
    };
    const outputTriad = {
      origin: { x: pExit.x + nx * 45, y: pExit.y - ny * 45, z: 0 },
      x: { x: ny * 22, y: nx * 22, z: 0 }, y: { x: 0, y: 0, z: 22 }, z: { x: nx * 22, y: -ny * 22, z: 0 },
    };
    return { vertices, faces, rays, inputTriad, outputTriad };
  }

  // 3. 道威棱镜（教材 P36 图 3-4c）
  // 45° 底角等腰梯形柱：折射进、底面全反射、折射出，同轴无偏折，转角 θ 时像转 2θ
  _modelDove(angleRad = 0) {
    const L = 140, H = 44, W = 44;
    const basePts = [
      { x: -W / 2, y: -H / 2, z: -L / 2 },
      { x: W / 2, y: -H / 2, z: -L / 2 },
      { x: W / 2, y: -H / 2, z: L / 2 },
      { x: -W / 2, y: -H / 2, z: L / 2 },
      { x: -W / 2, y: H / 2, z: -L / 2 + H },
      { x: W / 2, y: H / 2, z: -L / 2 + H },
      { x: W / 2, y: H / 2, z: L / 2 - H },
      { x: -W / 2, y: H / 2, z: L / 2 - H },
    ];
    const cosA = Math.cos(angleRad), sinA = Math.sin(angleRad);
    const vertices = basePts.map((p) => ({
      x: p.x * cosA - p.y * sinA,
      y: p.x * sinA + p.y * cosA,
      z: p.z,
    }));
    const faces = [
      { indices: [0, 1, 5, 4], type: "refract", label: "45° 入射斜面" },
      { indices: [2, 3, 7, 6], type: "refract", label: "45° 出射斜面" },
      { indices: [0, 1, 2, 3], type: "reflect", label: "底面全反射" },
      { indices: [4, 5, 6, 7], type: "base" },
      { indices: [0, 3, 7, 4], type: "base" },
      { indices: [1, 2, 6, 5], type: "base" },
    ];
    const pEnter = { x: 0, y: 0, z: -L / 2 + H / 2 };
    const pRefl = { x: 0, y: -H / 2, z: 0 };
    const pExit = { x: 0, y: 0, z: L / 2 - H / 2 };
    const rot = (p) => ({
      x: p.x * cosA - p.y * sinA,
      y: p.x * sinA + p.y * cosA,
      z: p.z,
    });
    const rays = [
      {
        points: [
          { x: 0, y: 0, z: -130 },
          rot(pEnter),
          rot(pRefl),
          rot(pExit),
          { x: 0, y: 0, z: 130 },
        ],
        color: "#fbbf24", width: 2.8,
      },
      {
        points: [
          { x: 0, y: 15, z: -130 },
          rot({ x: 0, y: 15, z: -L / 2 + H / 2 }),
          rot({ x: 0, y: -H / 2 + 5, z: 0 }),
          rot({ x: 0, y: -15, z: L / 2 - H / 2 }),
          { x: 15 * Math.sin(2 * angleRad), y: -15 * Math.cos(2 * angleRad), z: 130 },
        ],
        color: "#f87171", width: 1.8, isSideRay: true,
      },
    ];
    const cos2 = Math.cos(2 * angleRad), sin2 = Math.sin(2 * angleRad);
    const inputTriad = {
      origin: { x: 0, y: 0, z: -115 },
      x: { x: 22, y: 0, z: 0 }, y: { x: 0, y: 22, z: 0 }, z: { x: 0, y: 0, z: 25 },
    };
    const outputTriad = {
      origin: { x: 0, y: 0, z: 115 },
      x: { x: 22 * cos2, y: 22 * sin2, z: 0 },
      y: { x: 22 * sin2, y: -22 * cos2, z: 0 },
      z: { x: 0, y: 0, z: 25 },
    };
    return { vertices, faces, rays, inputTriad, outputTriad };
  }

  // 4. 半五角棱镜（教材 P36 图 3-5a）
  // 底面垂直入射，45° 斜面与 22.5° 斜面两次反射，总偏折 45°，垂直于 45° 面出射
  _modelHalfPenta() {
    const h = 40;
    const poly2D = [
      { x: -25, y: -35 }, // 0: bottom-left
      { x: 35, y: -35 },  // 1: bottom-right
      { x: 5, y: 5 },     // 2: top of 45° face 1
      { x: -10, y: 20 },  // 3: right edge of exit face
      { x: -28, y: 38 },  // 4: left edge of exit face
      { x: -48, y: -20 }, // 5: bottom of 22.5° face 2
    ];
    const vertices = [];
    poly2D.forEach((p) => vertices.push({ x: p.x, y: p.y, z: -h }));
    poly2D.forEach((p) => vertices.push({ x: p.x, y: p.y, z: h }));

    const faces = [
      { indices: [0, 1, 7, 6], type: "refract", label: "水平入射面" },
      { indices: [1, 2, 8, 7], type: "reflect", label: "45° 反射面 1" },
      { indices: [3, 4, 10, 9], type: "refract", label: "45° 出射面" },
      { indices: [4, 5, 11, 10], type: "reflect", label: "22.5° 反射面 2" },
      { indices: [5, 0, 6, 11], type: "base" },
      { indices: [2, 3, 9, 8], type: "base" },
      { indices: [0, 1, 2, 3, 4, 5], type: "base" },
      { indices: [6, 7, 8, 9, 10, 11], type: "base" },
    ];
    const pIn = { x: 5, y: -35, z: 0 };
    const pR1 = { x: 5, y: -5, z: 0 };
    const pR2 = { x: -35, y: -5, z: 0 };
    const pOut = { x: -19, y: 11, z: 0 };
    const rays = [
      {
        points: [
          { x: 5, y: -115, z: 0 },
          pIn,
          pR1,
          pR2,
          pOut,
          { x: pOut.x + 50 * Math.SQRT1_2, y: pOut.y + 50 * Math.SQRT1_2, z: 0 },
        ],
        color: "#fbbf24", width: 2.8,
      },
    ];
    const inputTriad = {
      origin: { x: 5, y: -95, z: 0 },
      x: { x: -22, y: 0, z: 0 }, y: { x: 0, y: 0, z: 22 }, z: { x: 0, y: 25, z: 0 },
    };
    const outputTriad = {
      origin: { x: pOut.x + 35 * Math.SQRT1_2, y: pOut.y + 35 * Math.SQRT1_2, z: 0 },
      x: { x: -22 * Math.SQRT1_2, y: 22 * Math.SQRT1_2, z: 0 },
      y: { x: 0, y: 0, z: 22 },
      z: { x: 25 * Math.SQRT1_2, y: 25 * Math.SQRT1_2, z: 0 },
    };
    return { vertices, faces, rays, inputTriad, outputTriad };
  }

  // 5. 30°直角棱镜（教材 P36 图 3-5b）
  // 30°-60°-90° 直角三角形截面，底面垂直入射，斜边反射，底面二次反射，偏折 60°
  _modelRight30() {
    const h = 40;
    const v2D = [
      { x: -70, y: -25 }, // 0: 30° apex
      { x: 45, y: -25 },  // 1: 90° right angle
      { x: 45, y: 41.4 }, // 2: 60° top corner
    ];
    const vertices = [];
    v2D.forEach((p) => vertices.push({ x: p.x, y: p.y, z: -h }));
    v2D.forEach((p) => vertices.push({ x: p.x, y: p.y, z: h }));

    const faces = [
      { indices: [0, 1, 4, 3], type: "refract", label: "底面 (入射 & 反射2)" },
      { indices: [1, 2, 5, 4], type: "refract", label: "右侧垂直出射面" },
      { indices: [2, 0, 3, 5], type: "reflect", label: "斜边 (反射面 1)" },
      { indices: [0, 1, 2], type: "base" },
      { indices: [3, 4, 5], type: "base" },
    ];
    const pIn = { x: -20, y: -25, z: 0 };
    const pR1 = { x: -20, y: 3.87, z: 0 };
    const pR2 = { x: 30, y: -25, z: 0 };
    const pOut = { x: 45, y: -16.34, z: 0 };
    const rays = [
      {
        points: [
          { x: -20, y: -95, z: 0 },
          pIn,
          pR1,
          pR2,
          pOut,
          { x: pOut.x + 50 * Math.cos(0.86), y: pOut.y + 50 * Math.sin(0.86), z: 0 },
        ],
        color: "#fbbf24", width: 2.8,
      },
    ];
    const inputTriad = {
      origin: { x: -20, y: -80, z: 0 },
      x: { x: -22, y: 0, z: 0 }, y: { x: 0, y: 0, z: 22 }, z: { x: 0, y: 25, z: 0 },
    };
    const outputTriad = {
      origin: { x: pOut.x + 35 * Math.cos(0.86), y: pOut.y + 35 * Math.sin(0.86), z: 0 },
      x: { x: -22 * Math.sin(0.86), y: 22 * Math.cos(0.86), z: 0 },
      y: { x: 0, y: 0, z: 22 },
      z: { x: 25 * Math.cos(0.86), y: 25 * Math.sin(0.86), z: 0 },
    };
    return { vertices, faces, rays, inputTriad, outputTriad };
  }

  // 6. 五角棱镜（教材 P36 图 3-5c）
  // 严格五边形柱体，左侧垂直入射，两镀银面夹角 45°，顶部水平面垂直出射。微摆偏角恒定 90°
  _modelPentaprism() {
    const s = 45, h = 40;
    const tilt = ((this.params.pentaTilt || 0) * Math.PI) / 180;
    const cosT = Math.cos(tilt), sinT = Math.sin(tilt);

    const basePts = [
      { x: -s, y: s },            // 0: top-left corner
      { x: s * 0.4, y: s },       // 1: top exit face right edge
      { x: s, y: -s * 0.4 },      // 2: right silvered face bottom
      { x: s * 0.4, y: -s },      // 3: corner cut facet
      { x: -s, y: -s * 0.4 },     // 4: bottom silvered face left edge
    ];
    const vertices = [];
    basePts.forEach((p) => {
      const rx = p.x * cosT - p.y * sinT;
      const ry = p.x * sinT + p.y * cosT;
      vertices.push({ x: rx, y: ry, z: -h });
    });
    basePts.forEach((p) => {
      const rx = p.x * cosT - p.y * sinT;
      const ry = p.x * sinT + p.y * cosT;
      vertices.push({ x: rx, y: ry, z: h });
    });

    const faces = [
      { indices: [4, 0, 5, 9], type: "refract", label: "左侧垂直入射面" },
      { indices: [0, 1, 6, 5], type: "refract", label: "顶部出射面 (90°偏折)" },
      { indices: [1, 2, 7, 6], type: "silvered", label: "镀银反射面 2 (67.5°)" },
      { indices: [2, 3, 8, 7], type: "base" },
      { indices: [3, 4, 9, 8], type: "silvered", label: "镀银反射面 1 (22.5°)" },
      { indices: [0, 1, 2, 3, 4], type: "base" },
      { indices: [5, 6, 7, 8, 9], type: "base" },
    ];

    const rot = (x, y) => ({
      x: x * cosT - y * sinT,
      y: x * sinT + y * cosT,
      z: 0,
    });
    const pIn = rot(-s, 0);
    const pR2 = rot(s * 0.65, 0);
    const pR1 = rot(0, -s * 0.65);
    const pOut = rot(0, s);
    const rays = [
      {
        points: [
          { x: -125, y: 0, z: 0 },
          pIn,
          pR2,
          pR1,
          pOut,
          { x: pOut.x, y: 125, z: 0 },
        ],
        color: "#fbbf24", width: 2.8, label: "90° 恒定偏折",
      },
    ];
    const inputTriad = {
      origin: { x: -110, y: 0, z: 0 },
      x: { x: 0, y: 22, z: 0 }, y: { x: 0, y: 0, z: 22 }, z: { x: 22, y: 0, z: 0 },
    };
    const outputTriad = {
      origin: { x: 0, y: 110, z: 0 },
      x: { x: -22, y: 0, z: 0 }, y: { x: 0, y: 0, z: 22 }, z: { x: 0, y: 22, z: 0 },
    };
    return { vertices, faces, rays, inputTriad, outputTriad };
  }

  // 7. 直角折返棱镜（教材 P36 图 3-5d）
  // 垂直斜边上半部入射，两个 45° 直角面各反射一次，下半部反向平行出射 (180° 折返)
  _modelPorroSingle() {
    const s = 45, h = 40;
    const vertices = [
      { x: -s, y: -s, z: -h }, // 0: bottom-left
      { x: 0, y: 0, z: -h },   // 1: right 90° corner
      { x: -s, y: s, z: -h },  // 2: top-left
      { x: -s, y: -s, z: h },  // 3
      { x: 0, y: 0, z: h },    // 4
      { x: -s, y: s, z: h },   // 5
    ];
    const faces = [
      { indices: [0, 2, 5, 3], type: "refract", label: "垂直斜边 (入/出射面)" },
      { indices: [2, 1, 4, 5], type: "reflect", label: "上 45° 直角反射面" },
      { indices: [1, 0, 3, 4], type: "reflect", label: "下 45° 直角反射面" },
      { indices: [0, 1, 2], type: "base" },
      { indices: [3, 4, 5], type: "base" },
    ];
    const dRay = 22;
    const rays = [
      {
        points: [
          { x: -125, y: dRay, z: 0 },
          { x: -s, y: dRay, z: 0 },
          { x: -dRay, y: dRay, z: 0 },
          { x: -dRay, y: -dRay, z: 0 },
          { x: -s, y: -dRay, z: 0 },
          { x: -125, y: -dRay, z: 0 },
        ],
        color: "#fbbf24", width: 2.8, label: "180° 折返",
      },
    ];
    const inputTriad = {
      origin: { x: -110, y: dRay, z: 0 },
      x: { x: 0, y: 22, z: 0 }, y: { x: 0, y: 0, z: 22 }, z: { x: 22, y: 0, z: 0 },
    };
    const outputTriad = {
      origin: { x: -110, y: -dRay, z: 0 },
      x: { x: 0, y: -22, z: 0 }, y: { x: 0, y: 0, z: 22 }, z: { x: -22, y: 0, z: 0 },
    };
    return { vertices, faces, rays, inputTriad, outputTriad };
  }

  // 8. 斜方棱镜（教材 P36 图 3-5e）
  // 平行四边形截面，两次 45° 全反射，纯侧向平移，出射与入射方向严格平行且同向
  _modelRhomboid() {
    const H = 40, shift = 50, h = 35;
    const vertices = [
      { x: -shift, y: 0, z: -h },       // 0
      { x: -shift, y: H, z: -h },       // 1
      { x: shift, y: 0, z: -h },        // 2
      { x: shift, y: -H, z: -h },       // 3
      { x: -shift, y: 0, z: h },        // 4
      { x: -shift, y: H, z: h },        // 5
      { x: shift, y: 0, z: h },         // 6
      { x: shift, y: -H, z: h },        // 7
    ];
    const faces = [
      { indices: [0, 1, 5, 4], type: "refract", label: "左侧入射面" },
      { indices: [3, 2, 6, 7], type: "refract", label: "右侧出射面" },
      { indices: [1, 2, 6, 5], type: "reflect", label: "45° 全反射面 1" },
      { indices: [0, 3, 7, 4], type: "reflect", label: "45° 全反射面 2" },
      { indices: [0, 1, 2, 3], type: "base" },
      { indices: [4, 5, 6, 7], type: "base" },
    ];
    const rays = [
      {
        points: [
          { x: -125, y: H / 2, z: 0 },
          { x: -shift, y: H / 2, z: 0 },
          { x: 0, y: H / 2, z: 0 },
          { x: 0, y: -H / 2, z: 0 },
          { x: shift, y: -H / 2, z: 0 },
          { x: 125, y: -H / 2, z: 0 },
        ],
        color: "#fbbf24", width: 2.8, label: "纯平行平移 (无角偏折)",
      },
    ];
    const inputTriad = {
      origin: { x: -110, y: H / 2, z: 0 },
      x: { x: 0, y: 22, z: 0 }, y: { x: 0, y: 0, z: 22 }, z: { x: 22, y: 0, z: 0 },
    };
    const outputTriad = {
      origin: { x: 110, y: -H / 2, z: 0 },
      x: { x: 0, y: 22, z: 0 }, y: { x: 0, y: 0, z: 22 }, z: { x: 22, y: 0, z: 0 },
    };
    return { vertices, faces, rays, inputTriad, outputTriad };
  }

  // 9. 直角屋脊棱镜（Amici Roof Prism, 教材 P37 图 3-7）
  // 斜面劈为 90° 屋脊双面，光束左右交叉互换反射，完全消除倒像成正像
  _modelRoofAmici() {
    const s = 45, W = 45;
    const ridgeDist = s * 0.5;
    const vertices = [
      { x: -s, y: -s, z: -W }, // 0
      { x: -s, y: s, z: -W },  // 1
      { x: -s, y: s, z: W },   // 2
      { x: -s, y: -s, z: W },  // 3
      { x: s, y: -s, z: -W },  // 4
      { x: s, y: -s, z: W },   // 5
      { x: -s + ridgeDist, y: s + ridgeDist, z: 0 }, // 6: top ridge E
      { x: s + ridgeDist, y: -s + ridgeDist, z: 0 }, // 7: bottom ridge F
    ];
    const faces = [
      { indices: [0, 1, 2, 3], type: "refract", label: "左侧垂直入射面" },
      { indices: [0, 3, 5, 4], type: "refract", label: "底面出射面" },
      { indices: [1, 4, 7, 6], type: "roof", label: "屋脊侧反射面 1 (-Z)" },
      { indices: [2, 5, 7, 6], type: "roof", label: "屋脊侧反射面 2 (+Z)" },
      { indices: [0, 1, 4], type: "base" },
      { indices: [3, 2, 5], type: "base" },
    ];
    const dZ = 16;
    const rays = [
      {
        points: [
          { x: -125, y: 0, z: dZ },
          { x: -s, y: 0, z: dZ },
          { x: 5, y: 5, z: dZ },
          { x: 5, y: 5, z: -dZ },
          { x: 0, y: -s, z: -dZ },
          { x: 0, y: -125, z: -dZ },
        ],
        color: "#fbbf24", width: 2.5, label: "光束左右交叉互换 · 完全正像",
      },
      {
        points: [
          { x: -125, y: 0, z: -dZ },
          { x: -s, y: 0, z: -dZ },
          { x: 5, y: 5, z: -dZ },
          { x: 5, y: 5, z: dZ },
          { x: 0, y: -s, z: dZ },
          { x: 0, y: -125, z: dZ },
        ],
        color: "#4ade80", width: 2.0, isSideRay: true,
      },
    ];
    const inputTriad = {
      origin: { x: -110, y: 0, z: 0 },
      x: { x: 0, y: 22, z: 0 }, y: { x: 0, y: 0, z: 22 }, z: { x: 22, y: 0, z: 0 },
    };
    const outputTriad = {
      origin: { x: 0, y: -110, z: 0 },
      x: { x: -22, y: 0, z: 0 }, y: { x: 0, y: 0, z: -22 }, z: { x: 0, y: -22, z: 0 },
    };
    return { vertices, faces, rays, inputTriad, outputTriad };
  }

  // 10. 施密特棱镜（Schmidt Prism, 教材 P37 图 3-6）
  // 顶角 45° 两底角 67.5° 等腰截面，三次反射 (右面、底面、左面)，总偏折严格 45°
  _modelSchmidt() {
    const H = 85, W = H / Math.tan((67.5 * Math.PI) / 180), h = 35;
    const vertices = [
      { x: -W, y: -H / 2, z: -h }, // 0: bottom-left
      { x: W, y: -H / 2, z: -h },  // 1: bottom-right
      { x: 0, y: H / 2, z: -h },   // 2: apex
      { x: -W, y: -H / 2, z: h },  // 3
      { x: W, y: -H / 2, z: h },   // 4
      { x: 0, y: H / 2, z: h },    // 5
    ];
    const faces = [
      { indices: [0, 2, 5, 3], type: "refract", label: "左腰 (垂直入射 & TIR3)" },
      { indices: [2, 1, 4, 5], type: "refract", label: "右腰 (反射1 & 垂直出射)" },
      { indices: [0, 1, 4, 3], type: "reflect", label: "底面 (TIR2 反射)" },
      { indices: [0, 1, 2], type: "base" },
      { indices: [3, 5, 4], type: "base" },
    ];
    const c22 = Math.cos((22.5 * Math.PI) / 180), s22 = Math.sin((22.5 * Math.PI) / 180);
    const pIn = { x: -W * 0.45, y: H * 0.05, z: 0 };
    const pR1 = { x: W * 0.48, y: -H * 0.08, z: 0 };
    const pR2 = { x: 0, y: -H / 2, z: 0 };
    const pR3 = { x: -W * 0.65, y: -H * 0.22, z: 0 };
    const pOut = { x: W * 0.35, y: H * 0.12, z: 0 };
    const rays = [
      {
        points: [
          { x: pIn.x - c22 * 75, y: pIn.y + s22 * 75, z: 0 },
          pIn,
          pR1,
          pR2,
          pR3,
          pOut,
          { x: pOut.x + c22 * 75, y: pOut.y + s22 * 75, z: 0 },
        ],
        color: "#fbbf24", width: 2.8, label: "45° 三次反射紧凑折转",
      },
    ];
    const inputTriad = {
      origin: { x: pIn.x - c22 * 50, y: pIn.y + s22 * 50, z: 0 },
      x: { x: s22 * 22, y: c22 * 22, z: 0 }, y: { x: 0, y: 0, z: 22 }, z: { x: c22 * 22, y: -s22 * 22, z: 0 },
    };
    const outputTriad = {
      origin: { x: pOut.x + c22 * 50, y: pOut.y + s22 * 50, z: 0 },
      x: { x: -s22 * 22, y: c22 * 22, z: 0 }, y: { x: 0, y: 0, z: 22 }, z: { x: c22 * 22, y: s22 * 22, z: 0 },
    };
    return { vertices, faces, rays, inputTriad, outputTriad };
  }

  // 11. 立方角锥棱镜（Corner Cube / Retroreflector, 教材 P37 图 3-8）
  // 正立方体切角正三棱锥，三直角反射面正交，三维全向反向共轭回归 (v_out ≡ -v_in)
  _modelCornerCube() {
    const S = 65;
    const pitch = (((this.params.cornerPitch || 0) + 15) * Math.PI) / 180;
    const yaw = (((this.params.cornerYaw || 0) + 15) * Math.PI) / 180;

    const vertices = [
      { x: 0, y: 0, z: 0 }, // 0: apex A
      { x: S, y: 0, z: 0 }, // 1: B on X axis
      { x: 0, y: S, z: 0 }, // 2: C on Y axis
      { x: 0, y: 0, z: S }, // 3: D on Z axis
    ];
    const faces = [
      { indices: [0, 1, 2], type: "silvered", label: "正交反射面 X-Y" },
      { indices: [0, 2, 3], type: "silvered", label: "正交反射面 Y-Z" },
      { indices: [0, 3, 1], type: "silvered", label: "正交反射面 Z-X" },
      { indices: [1, 2, 3], type: "refract", label: "等边三角形底面 (入/出射)" },
    ];

    const dir = {
      x: -Math.cos(pitch) * Math.cos(yaw),
      y: -Math.sin(pitch),
      z: -Math.cos(pitch) * Math.sin(yaw),
    };
    const len = Math.hypot(dir.x, dir.y, dir.z);
    const u = { x: dir.x / len, y: dir.y / len, z: dir.z / len };

    const pEnter = { x: S * 0.45, y: S * 0.45, z: S * 0.1 };
    const t1 = -pEnter.z / u.z;
    const pR1 = { x: pEnter.x + u.x * t1, y: pEnter.y + u.y * t1, z: 0 };
    const u1 = { x: u.x, y: u.y, z: -u.z };
    const t2 = -pR1.y / u1.y;
    const pR2 = { x: pR1.x + u1.x * t2, y: 0, z: pR1.z + u1.z * t2 };
    const u2 = { x: u.x, y: -u.y, z: -u.z };
    const t3 = -pR2.x / u2.x;
    const pR3 = { x: 0, y: pR2.y + u2.y * t3, z: pR2.z + u2.z * t3 };
    const u3 = { x: -u.x, y: -u.y, z: -u.z };
    const sumP3 = pR3.x + pR3.y + pR3.z;
    const sumU3 = u3.x + u3.y + u3.z;
    const t4 = Math.abs(sumU3) > 1e-4 ? (S - sumP3) / sumU3 : 30;
    const pExit = { x: pR3.x + u3.x * t4, y: pR3.y + u3.y * t4, z: pR3.z + u3.z * t4 };

    const pStart = { x: pEnter.x - u.x * 80, y: pEnter.y - u.y * 80, z: pEnter.z - u.z * 80 };
    const pEnd = { x: pExit.x + u3.x * 80, y: pExit.y + u3.y * 80, z: pExit.z + u3.z * 80 };

    const rays = [
      {
        points: [pStart, pEnter, pR1, pR2, pR3, pExit, pEnd],
        color: "#38bdf8", width: 2.8, label: "三维全向共轭回归 (v_out ≡ -v_in)",
      },
    ];
    return { vertices, faces, rays };
  }

  // 12. 分色棱镜组（3-CCD Dichroic Prism, 教材 P37 图 3-10）
  // 三棱镜紧凑组合：面 a 反蓝并前表面 TIR 向上出射蓝光；面 b 反红并前表面 TIR 向上出射红光；绿光直通
  _modelDichroic() {
    const h = 35;
    const p1 = [
      { x: -50, y: -35 }, { x: -20, y: -35 }, { x: -10, y: 35 }, { x: -35, y: 45 }, { x: -50, y: 25 },
    ];
    const p2 = [
      { x: -16, y: -35 }, { x: 15, y: -35 }, { x: 15, y: 15 }, { x: -16, y: 32 },
    ];
    const p3 = [
      { x: 17, y: -35 }, { x: 45, y: -35 }, { x: 45, y: 15 }, { x: 17, y: 15 },
    ];

    const vertices = [];
    const addPoly = (pts) => {
      const baseIdx = vertices.length;
      pts.forEach((p) => vertices.push({ x: p.x, y: p.y, z: -h }));
      pts.forEach((p) => vertices.push({ x: p.x, y: p.y, z: h }));
      return baseIdx;
    };
    const b1 = addPoly(p1);
    const b2 = addPoly(p2);
    const b3 = addPoly(p3);

    const faces = [
      { indices: [b1, b1 + 1, b1 + 6, b1 + 5], type: "base" },
      { indices: [b1 + 4, b1, b1 + 5, b1 + 9], type: "refract", label: "白光入射面" },
      { indices: [b1 + 1, b1 + 2, b1 + 7, b1 + 6], type: "dichroic-a", label: "分色面 a (反蓝透红绿)" },
      { indices: [b1 + 3, b1 + 4, b1 + 9, b1 + 8], type: "refract", label: "蓝光出射面" },
      { indices: [b2 + 1, b2 + 2, b2 + 6, b2 + 5], type: "dichroic-b", label: "分色面 b (反红透绿)" },
      { indices: [b2 + 2, b2 + 3, b2 + 7, b2 + 6], type: "refract", label: "红光出射面" },
      { indices: [b3 + 1, b3 + 2, b3 + 6, b3 + 5], type: "refract", label: "绿光出射面" },
    ];

    const rays = [
      { points: [{ x: -125, y: -10, z: 0 }, { x: -50, y: -10, z: 0 }, { x: -15, y: -10, z: 0 }], color: "#ffffff", width: 3.2, label: "入射白光" },
      {
        points: [
          { x: -15, y: -10, z: 0 },
          { x: -42, y: 5, z: 0 },
          { x: -30, y: 40, z: 0 },
          { x: -20, y: 95, z: 0 },
        ],
        color: "#38bdf8", width: 2.8, label: "蓝光 (450nm · TIR分出)",
      },
      {
        points: [
          { x: -15, y: -10, z: 0 },
          { x: 15, y: -10, z: 0 },
          { x: -12, y: 15, z: 0 },
          { x: 5, y: 25, z: 0 },
          { x: 45, y: 75, z: 0 },
        ],
        color: "#f87171", width: 2.8, label: "红光 (650nm · 反红透绿)",
      },
      {
        points: [
          { x: 15, y: -10, z: 0 },
          { x: 45, y: -10, z: 0 },
          { x: 125, y: -10, z: 0 },
        ],
        color: "#4ade80", width: 2.8, label: "绿光 (530nm · 直通出射)",
      },
    ];
    return { vertices, faces, rays };
  }

  // 13. 普罗 I 型转像棱镜（Porro I, 教材 P38 图 3-11a）
  // 两个直角折返棱镜在空间 90° 正交放置，四次正交全反射，实现完全正像
  _modelPorro1() {
    const s = 40, h = 30, gap = 16;
    const v1 = [
      { x: -gap - 2 * s, y: -h, z: -s },
      { x: -gap, y: -h, z: -s },
      { x: -gap - s, y: -h, z: 0 },
      { x: -gap - 2 * s, y: h, z: -s },
      { x: -gap, y: h, z: -s },
      { x: -gap - s, y: h, z: 0 },
    ];
    const v2 = [
      { x: gap - h, y: -s, z: s },
      { x: gap - h, y: s, z: s },
      { x: gap - h, y: 0, z: 2 * s },
      { x: gap + h, y: -s, z: s },
      { x: gap + h, y: s, z: s },
      { x: gap + h, y: 0, z: 2 * s },
    ];
    const vertices = [...v1, ...v2];
    const faces = [
      { indices: [0, 1, 4, 3], type: "refract", label: "棱镜 1 (水平折返)" },
      { indices: [1, 2, 5, 4], type: "reflect" },
      { indices: [2, 0, 3, 5], type: "reflect" },
      { indices: [6, 7, 10, 9], type: "refract", label: "棱镜 2 (垂直折返)" },
      { indices: [7, 8, 11, 10], type: "reflect" },
      { indices: [8, 6, 9, 11], type: "reflect" },
    ];
    const rays = [
      {
        points: [
          { x: -gap - s * 1.5, y: 0, z: -125 },
          { x: -gap - s * 1.5, y: 0, z: -s },
          { x: -gap - s * 1.5, y: 0, z: -s / 2 },
          { x: -gap - s * 0.5, y: 0, z: -s / 2 },
          { x: -gap - s * 0.5, y: 0, z: -s },
          { x: gap, y: -s / 2, z: s },
          { x: gap, y: -s / 2, z: 1.5 * s },
          { x: gap, y: s / 2, z: 1.5 * s },
          { x: gap, y: s / 2, z: s },
          { x: gap, y: s / 2, z: 125 },
        ],
        color: "#fbbf24", width: 2.8, label: "四次正交全反射 · 完全正像",
      },
    ];
    const inputTriad = {
      origin: { x: -gap - s * 1.5, y: 0, z: -110 },
      x: { x: 22, y: 0, z: 0 }, y: { x: 0, y: 22, z: 0 }, z: { x: 0, y: 0, z: 22 },
    };
    const outputTriad = {
      origin: { x: gap, y: s / 2, z: 110 },
      x: { x: -22, y: 0, z: 0 }, y: { x: 0, y: -22, z: 0 }, z: { x: 0, y: 0, z: 22 },
    };
    return { vertices, faces, rays, inputTriad, outputTriad };
  }

  // 14. 普罗 II 型转像系统（Porro II, 教材 P38 图 3-11b）
  // 三棱镜紧凑胶合转像系统，无空气隙，四次反射完成像倒转
  _modelPorro2() {
    const s = 45, h = 32;
    const vertices = [
      { x: -s, y: 0, z: -h },   // 0
      { x: s, y: 0, z: -h },    // 1
      { x: 0, y: -s, z: -h },   // 2
      { x: -s, y: 0, z: h },    // 3
      { x: s, y: 0, z: h },     // 4
      { x: 0, y: -s, z: h },    // 5
      { x: -s, y: s * 0.7, z: -h }, // 6
      { x: -s, y: s * 0.7, z: h },  // 7
      { x: s, y: s * 0.7, z: -h },  // 8
      { x: s, y: s * 0.7, z: h },   // 9
    ];
    const faces = [
      { indices: [0, 2, 5, 3], type: "reflect", label: "主棱镜底反射面 1" },
      { indices: [2, 1, 4, 5], type: "reflect", label: "主棱镜底反射面 2" },
      { indices: [0, 6, 7, 3], type: "refract", label: "左副棱镜入射面" },
      { indices: [6, 1, 4, 7], type: "reflect", label: "左副棱镜胶合面" },
      { indices: [1, 8, 9, 4], type: "refract", label: "右副棱镜出射面" },
      { indices: [0, 1, 2], type: "base" },
      { indices: [3, 4, 5], type: "base" },
    ];
    const rays = [
      {
        points: [
          { x: -s * 0.6, y: s * 0.7 + 50, z: 0 },
          { x: -s * 0.6, y: s * 0.7, z: 0 },
          { x: -s * 0.6, y: 0, z: 0 },
          { x: 0, y: -s * 0.6, z: -15 },
          { x: 0, y: -s * 0.6, z: 15 },
          { x: s * 0.6, y: 0, z: 0 },
          { x: s * 0.6, y: s * 0.7, z: 0 },
          { x: s * 0.6, y: s * 0.7 + 50, z: 0 },
        ],
        color: "#fbbf24", width: 2.8, label: "三棱镜紧凑胶合转像",
      },
    ];
    const inputTriad = {
      origin: { x: -s * 0.6, y: s * 0.7 + 35, z: 0 },
      x: { x: 22, y: 0, z: 0 }, y: { x: 0, y: 0, z: 22 }, z: { x: 0, y: -22, z: 0 },
    };
    const outputTriad = {
      origin: { x: s * 0.6, y: s * 0.7 + 35, z: 0 },
      x: { x: -22, y: 0, z: 0 }, y: { x: 0, y: 0, z: -22 }, z: { x: 0, y: 22, z: 0 },
    };
    return { vertices, faces, rays, inputTriad, outputTriad };
  }
}

window.Prism3DSim = Prism3DSim;
