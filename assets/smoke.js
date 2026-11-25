/* ==========================================================================
   Mr. Sniff's — incense cursor
   An ember dot replaces the pointer; a small WebGL fluid simulation trails
   grey smoke behind it. Smoke is pale over dark sections and charcoal over
   light ones, rises gently, curls, and fades in a second or two. While the
   cursor rests, a thin thread of smoke rises from the "tip".

   Desktop only (fine pointer + hover). Off for prefers-reduced-motion.
   If WebGL2 + float render targets are unavailable, the dot still works and
   the smoke simply doesn't render. The sim sleeps when nothing is moving.

   Stable-fluids approach (advect → curl/vorticity → divergence → pressure →
   gradient subtract), after Jos Stam / Pavel Dobryakov's WebGL fluid work.
   ========================================================================== */
(() => {
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (!fine.matches || reduce.matches) return;

  /* ---- Tuning ------------------------------------------------------------- */
  const CFG = {
    SIM_RES: 128,               // velocity grid (short side)
    DYE_RES: 640,               // smoke texture (short side)
    DENSITY_DISSIPATION: 1.45, // higher = smoke fades faster
    VELOCITY_DISSIPATION: 1.1,
    PRESSURE: 0.8,
    PRESSURE_ITERATIONS: 16,
    CURL: 34,                   // vorticity: the curls in the wisps
    BUOYANCY: 32,               // how strongly smoke rises
    SPLAT_RADIUS: 0.00028,      // trail thickness
    SPLAT_FORCE: 2600,
    TRAIL_ALPHA: 0.30,          // smoke laid per move
    THREAD_ALPHA: 0.06,         // idle thread from the tip
    THREAD_SECONDS: 5,          // how long the tip smokes while resting
    SLEEP_AFTER: 3.5,           // seconds of no input before the sim sleeps
    MAX_ALPHA_LIGHT: 0.65,      // display ceiling, pale smoke on dark
    MAX_ALPHA_DARK: 0.28,       // display ceiling, charcoal smoke on light
  };
  const TONE = {
    light: [0.86, 0.86, 0.84],  // pale grey over dark sections
    dark:  [0.20, 0.20, 0.22],  // charcoal haze over light sections
  };

  /* Where smoke should be pale. Checked against the element under the cursor.
     DARK_FIRST wins: light-grey product stages inside dark sections. */
  const DARK_FIRST = '.scent-card__media, .shop-grid .holder-card__media, [data-smoke="dark"]';
  const LIGHT_ON = [
    '.section--ink', '.hero__frame', '.shop-hero__frame', '.story', '.gallery',
    '.holder-card__media', '.decide-card__media', '.howto__media', '[data-smoke="light"]',
  ].join(', ');

  /* ---- Cursor dot -------------------------------------------------------- */
  const root = document.documentElement;
  const dot = document.createElement('div');
  dot.className = 'cursor-dot is-hidden';
  dot.setAttribute('aria-hidden', 'true');
  dot.innerHTML = '<span></span>';
  dot.style.transform = 'translate3d(-100px, -100px, 0)';   // off-screen until the first move
  document.body.append(dot);
  root.classList.add('has-cursor-dot');

  const INTERACTIVE = 'a, button, summary, label, select, [role="button"], .gallery__item';
  const TEXTY = 'input:not([type="checkbox"]):not([type="radio"]), textarea, [contenteditable="true"]';

  let mx = -100, my = -100;
  let lastMove = performance.now();

  window.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    mx = e.clientX; my = e.clientY;
    dot.style.transform = `translate3d(${mx}px, ${my}px, 0)`;
    const t = e.target instanceof Element ? e.target : null;
    const texty = t && t.closest(TEXTY);
    dot.classList.toggle('is-hidden', !!texty);
    dot.classList.toggle('is-hover', !texty && !!(t && t.closest(INTERACTIVE)));
    onMove(e);
  }, { passive: true });
  window.addEventListener('pointerdown', () => dot.classList.add('is-down'));
  window.addEventListener('pointerup', () => dot.classList.remove('is-down'));
  document.addEventListener('pointerleave', () => dot.classList.add('is-hidden'));
  document.documentElement.addEventListener('mouseleave', () => dot.classList.add('is-hidden'));

  reduce.addEventListener?.('change', () => location.reload());

  /* ---- WebGL setup ------------------------------------------------------- */
  const canvas = document.createElement('canvas');
  canvas.className = 'smoke-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.append(canvas);

  const gl = canvas.getContext('webgl2', { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false, preserveDrawingBuffer: false });
  if (!gl || !gl.getExtension('EXT_color_buffer_float')) { canvas.remove(); return; }
  gl.getExtension('OES_texture_float_linear');

  const VERT = `#version 300 es
  in vec2 aPosition;
  out vec2 vUv, vL, vR, vT, vB;
  uniform vec2 texelSize;
  void main() {
    vUv = aPosition * 0.5 + 0.5;
    vL = vUv - vec2(texelSize.x, 0.0);
    vR = vUv + vec2(texelSize.x, 0.0);
    vT = vUv + vec2(0.0, texelSize.y);
    vB = vUv - vec2(0.0, texelSize.y);
    gl_Position = vec4(aPosition, 0.0, 1.0);
  }`;
  const H = `#version 300 es
  precision highp float; precision highp sampler2D;
  in vec2 vUv, vL, vR, vT, vB; out vec4 o;`;

  const FRAG = {
    splat: `${H}
      uniform sampler2D uTarget; uniform float aspectRatio, radius; uniform vec4 color; uniform vec2 point;
      void main() {
        vec2 p = vUv - point; p.x *= aspectRatio;
        o = texture(uTarget, vUv) + exp(-dot(p, p) / radius) * color;
      }`,
    advection: `${H}
      uniform sampler2D uVelocity, uSource; uniform vec2 texelSize; uniform float dt, dissipation;
      void main() {
        vec2 coord = vUv - dt * texture(uVelocity, vUv).xy * texelSize;
        o = texture(uSource, coord) / (1.0 + dissipation * dt);
      }`,
    buoyancy: `${H}
      uniform sampler2D uVelocity, uDye; uniform float dt, strength;
      void main() {
        vec2 v = texture(uVelocity, vUv).xy;
        v.y += strength * texture(uDye, vUv).a * dt;
        o = vec4(v, 0.0, 1.0);
      }`,
    divergence: `${H}
      uniform sampler2D uVelocity;
      void main() {
        float L = texture(uVelocity, vL).x, R = texture(uVelocity, vR).x;
        float T = texture(uVelocity, vT).y, B = texture(uVelocity, vB).y;
        vec2 C = texture(uVelocity, vUv).xy;
        if (vL.x < 0.0) L = -C.x; if (vR.x > 1.0) R = -C.x;
        if (vT.y > 1.0) T = -C.y; if (vB.y < 0.0) B = -C.y;
        o = vec4(0.5 * (R - L + T - B), 0.0, 0.0, 1.0);
      }`,
    curl: `${H}
      uniform sampler2D uVelocity;
      void main() {
        float L = texture(uVelocity, vL).y, R = texture(uVelocity, vR).y;
        float T = texture(uVelocity, vT).x, B = texture(uVelocity, vB).x;
        o = vec4(0.5 * (R - L - T + B), 0.0, 0.0, 1.0);
      }`,
    vorticity: `${H}
      uniform sampler2D uVelocity, uCurl; uniform float curl, dt;
      void main() {
        float L = texture(uCurl, vL).x, R = texture(uCurl, vR).x;
        float T = texture(uCurl, vT).x, B = texture(uCurl, vB).x, C = texture(uCurl, vUv).x;
        vec2 f = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));
        f /= length(f) + 0.0001; f *= curl * C; f.y *= -1.0;
        vec2 v = texture(uVelocity, vUv).xy + f * dt;
        o = vec4(clamp(v, -1000.0, 1000.0), 0.0, 1.0);
      }`,
    pressure: `${H}
      uniform sampler2D uPressure, uDivergence;
      void main() {
        float L = texture(uPressure, vL).x, R = texture(uPressure, vR).x;
        float T = texture(uPressure, vT).x, B = texture(uPressure, vB).x;
        o = vec4((L + R + B + T - texture(uDivergence, vUv).x) * 0.25, 0.0, 0.0, 1.0);
      }`,
    gradient: `${H}
      uniform sampler2D uPressure, uVelocity;
      void main() {
        float L = texture(uPressure, vL).x, R = texture(uPressure, vR).x;
        float T = texture(uPressure, vT).x, B = texture(uPressure, vB).x;
        o = vec4(texture(uVelocity, vUv).xy - vec2(R - L, T - B), 0.0, 1.0);
      }`,
    clear: `${H}
      uniform sampler2D uTexture; uniform float value;
      void main() { o = value * texture(uTexture, vUv); }`,
    shift: `${H}
      uniform sampler2D uTexture; uniform vec2 offset;
      void main() {
        vec2 uv = vUv - offset;
        o = (uv.y < 0.0 || uv.y > 1.0) ? vec4(0.0) : texture(uTexture, uv);
      }`,
    display: `${H}
      uniform sampler2D uTexture; uniform float maxLight, maxDark;
      void main() {
        vec4 c = texture(uTexture, vUv);
        if (c.a < 0.002) { o = vec4(0.0); return; }
        vec3 tone = c.rgb / c.a;                                  // un-premultiply
        float ceilA = mix(maxDark, maxLight, smoothstep(0.35, 0.75, tone.r));
        float a = ceilA * (1.0 - exp(-c.a * 2.2));                // soft shoulder
        o = vec4(tone * a, a);                                    // premultiplied
      }`,
  };

  const compile = (type, src) => {
    const s = gl.createShader(type);
    gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  };
  const vs = compile(gl.VERTEX_SHADER, VERT);
  const programs = {};
  try {
    for (const [name, src] of Object.entries(FRAG)) {
      const p = gl.createProgram();
      gl.attachShader(p, vs); gl.attachShader(p, compile(gl.FRAGMENT_SHADER, src));
      gl.bindAttribLocation(p, 0, 'aPosition');
      gl.linkProgram(p);
      if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
      const u = {};
      const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
      for (let i = 0; i < n; i++) { const { name: un } = gl.getActiveUniform(p, i); u[un] = gl.getUniformLocation(p, un); }
      programs[name] = { p, u };
    }
  } catch (err) { canvas.remove(); return; }

  // full-screen quad
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, -1, 1, 1, 1, 1, -1]), gl.STATIC_DRAW);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0, 1, 2, 0, 2, 3]), gl.STATIC_DRAW);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(0);

  const blit = (target) => {
    if (target) { gl.viewport(0, 0, target.w, target.h); gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo); }
    else { gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight); gl.bindFramebuffer(gl.FRAMEBUFFER, null); }
    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
  };

  const makeFBO = (w, h, internal, format) => {
    gl.activeTexture(gl.TEXTURE0);
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, internal, w, h, 0, format, gl.HALF_FLOAT, null);
    const fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    gl.viewport(0, 0, w, h); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    return { tex, fbo, w, h, texel: [1 / w, 1 / h], attach(i) { gl.activeTexture(gl.TEXTURE0 + i); gl.bindTexture(gl.TEXTURE_2D, tex); return i; } };
  };
  const makeDouble = (w, h, i, f) => {
    let a = makeFBO(w, h, i, f), b = makeFBO(w, h, i, f);
    return { get read() { return a; }, get write() { return b; }, swap() { [a, b] = [b, a]; }, w, h, texel: a.texel };
  };
  const res = (n) => {
    const ar = gl.drawingBufferWidth / gl.drawingBufferHeight;
    return ar >= 1 ? [Math.round(n * ar), n] : [n, Math.round(n / ar)];
  };

  let dye, velocity, divergence, curl, pressure;
  const initFBOs = () => {
    const [sw, sh] = res(CFG.SIM_RES), [dw, dh] = res(CFG.DYE_RES);
    dye = makeDouble(dw, dh, gl.RGBA16F, gl.RGBA);
    velocity = makeDouble(sw, sh, gl.RG16F, gl.RG);
    divergence = makeFBO(sw, sh, gl.R16F, gl.RED);
    curl = makeFBO(sw, sh, gl.R16F, gl.RED);
    pressure = makeDouble(sw, sh, gl.R16F, gl.RED);
  };

  const resize = () => {
    const w = Math.round(window.innerWidth), h = Math.round(window.innerHeight);   // DPR 1: smoke is soft
    if (canvas.width === w && canvas.height === h) return false;
    canvas.width = w; canvas.height = h;
    initFBOs();
    return true;
  };
  resize();

  /* ---- Simulation -------------------------------------------------------- */
  const use = (name) => { const pr = programs[name]; gl.useProgram(pr.p); return pr.u; };

  const splat = (x, y, dx, dy, color) => {
    let u = use('splat');
    gl.uniform1i(u.uTarget, velocity.read.attach(0));
    gl.uniform1f(u.aspectRatio, canvas.width / canvas.height);
    gl.uniform2f(u.point, x, y);
    gl.uniform4f(u.color, dx, dy, 0, 0);
    gl.uniform1f(u.radius, CFG.SPLAT_RADIUS * (canvas.width > canvas.height ? 1 : canvas.height / canvas.width));
    gl.uniform2f(u.texelSize, ...velocity.texel);
    blit(velocity.write); velocity.swap();

    gl.uniform1i(u.uTarget, dye.read.attach(0));
    gl.uniform4f(u.color, ...color);
    blit(dye.write); dye.swap();
  };

  const shift = (target, dyUv) => {
    const u = use('shift');
    gl.uniform2f(u.texelSize, ...target.texel);
    gl.uniform1i(u.uTexture, target.read.attach(0));
    gl.uniform2f(u.offset, 0, dyUv);
    blit(target.write); target.swap();
  };

  const step = (dt) => {
    let u;
    gl.disable(gl.BLEND);

    u = use('curl');
    gl.uniform2f(u.texelSize, ...velocity.texel);
    gl.uniform1i(u.uVelocity, velocity.read.attach(0));
    blit(curl);

    u = use('vorticity');
    gl.uniform2f(u.texelSize, ...velocity.texel);
    gl.uniform1i(u.uVelocity, velocity.read.attach(0));
    gl.uniform1i(u.uCurl, curl.attach(1));
    gl.uniform1f(u.curl, CFG.CURL);
    gl.uniform1f(u.dt, dt);
    blit(velocity.write); velocity.swap();

    u = use('buoyancy');
    gl.uniform2f(u.texelSize, ...velocity.texel);
    gl.uniform1i(u.uVelocity, velocity.read.attach(0));
    gl.uniform1i(u.uDye, dye.read.attach(1));
    gl.uniform1f(u.strength, CFG.BUOYANCY);
    gl.uniform1f(u.dt, dt);
    blit(velocity.write); velocity.swap();

    u = use('divergence');
    gl.uniform2f(u.texelSize, ...velocity.texel);
    gl.uniform1i(u.uVelocity, velocity.read.attach(0));
    blit(divergence);

    u = use('clear');
    gl.uniform2f(u.texelSize, ...pressure.texel);
    gl.uniform1i(u.uTexture, pressure.read.attach(0));
    gl.uniform1f(u.value, CFG.PRESSURE);
    blit(pressure.write); pressure.swap();

    u = use('pressure');
    gl.uniform2f(u.texelSize, ...velocity.texel);
    gl.uniform1i(u.uDivergence, divergence.attach(0));
    for (let i = 0; i < CFG.PRESSURE_ITERATIONS; i++) {
      gl.uniform1i(u.uPressure, pressure.read.attach(1));
      blit(pressure.write); pressure.swap();
    }

    u = use('gradient');
    gl.uniform2f(u.texelSize, ...velocity.texel);
    gl.uniform1i(u.uPressure, pressure.read.attach(0));
    gl.uniform1i(u.uVelocity, velocity.read.attach(1));
    blit(velocity.write); velocity.swap();

    u = use('advection');
    gl.uniform2f(u.texelSize, ...velocity.texel);
    gl.uniform1i(u.uVelocity, velocity.read.attach(0));
    gl.uniform1i(u.uSource, velocity.read.attach(0));
    gl.uniform1f(u.dt, dt);
    gl.uniform1f(u.dissipation, CFG.VELOCITY_DISSIPATION);
    blit(velocity.write); velocity.swap();

    gl.uniform1i(u.uVelocity, velocity.read.attach(0));
    gl.uniform1i(u.uSource, dye.read.attach(1));
    gl.uniform1f(u.dissipation, CFG.DENSITY_DISSIPATION);
    blit(dye.write); dye.swap();
  };

  const render = () => {
    const u = use('display');
    gl.uniform2f(u.texelSize, 1 / canvas.width, 1 / canvas.height);
    gl.uniform1i(u.uTexture, dye.read.attach(0));
    gl.uniform1f(u.maxLight, CFG.MAX_ALPHA_LIGHT);
    gl.uniform1f(u.maxDark, CFG.MAX_ALPHA_DARK);
    blit(null);
  };

  /* ---- Input → splats ---------------------------------------------------- */
  let toneTarget = TONE.dark.slice();
  let tone = TONE.dark.slice();
  let lastToneCheck = 0;
  const readTone = (x, y) => {
    const el = document.elementFromPoint(x, y);
    if (!el) return;
    if (el.closest(DARK_FIRST)) toneTarget = TONE.dark;
    else toneTarget = el.closest(LIGHT_ON) ? TONE.light : TONE.dark;
  };

  let pending = null;            // accumulated movement since last frame
  let px = null, py = null;
  function onMove(e) {
    const now = performance.now();
    lastMove = now;
    if (now - lastToneCheck > 90) { readTone(e.clientX, e.clientY); lastToneCheck = now; }
    if (px === null) { px = e.clientX; py = e.clientY; }
    const dx = e.clientX - px, dy = e.clientY - py;
    px = e.clientX; py = e.clientY;
    pending = pending
      ? { x: e.clientX, y: e.clientY, dx: pending.dx + dx, dy: pending.dy + dy }
      : { x: e.clientX, y: e.clientY, dx, dy };
    wake();
  }

  let lastScroll = window.scrollY;
  window.addEventListener('scroll', () => {
    const d = window.scrollY - lastScroll;
    lastScroll = window.scrollY;
    if (!running || !d) return;
    // smoke drifts with the page instead of hovering on the glass
    const dyUv = d / canvas.height;
    shift(dye, dyUv);
    shift(velocity, dyUv);
  }, { passive: true });

  /* ---- Loop (sleeps when idle) ------------------------------------------ */
  let running = false;
  let lastT = 0;
  let lastThread = 0;

  function wake() {
    if (running || document.hidden) return;
    running = true;
    lastT = performance.now();
    requestAnimationFrame(frame);
  }

  function frame(now) {
    if (!running) return;
    if (resize()) lastT = now;
    const dt = Math.min((now - lastT) / 1000, 1 / 30);
    lastT = now;

    // ease tone so crossing a section boundary blends rather than snaps
    for (let i = 0; i < 3; i++) tone[i] += (toneTarget[i] - tone[i]) * Math.min(1, dt * 8);

    if (pending) {
      const { x, y, dx, dy } = pending;
      pending = null;
      const speed = Math.min(Math.hypot(dx, dy) / 24, 1);
      const a = CFG.TRAIL_ALPHA * (0.35 + 0.65 * speed);
      splat(
        x / canvas.width, 1 - y / canvas.height,
        (dx / canvas.width) * CFG.SPLAT_FORCE, (-dy / canvas.height) * CFG.SPLAT_FORCE,
        [tone[0] * a, tone[1] * a, tone[2] * a, a]
      );
    }

    // resting tip: a thin rising thread for a few seconds
    const idle = (now - lastMove) / 1000;
    if (idle > 0.25 && idle < CFG.THREAD_SECONDS && now - lastThread > 45 && mx >= 0) {
      lastThread = now;
      const a = CFG.THREAD_ALPHA * Math.min(1, (CFG.THREAD_SECONDS - idle) / 1.5);
      const wobble = Math.sin(now / 340) * 6;
      splat(
        mx / canvas.width, 1 - (my - 4) / canvas.height,
        (wobble / canvas.width) * CFG.SPLAT_FORCE * 0.4, 0.012 * CFG.SPLAT_FORCE / 100,
        [tone[0] * a, tone[1] * a, tone[2] * a, a]
      );
    }

    step(dt);
    render();

    if (idle > Math.max(CFG.SLEEP_AFTER, CFG.THREAD_SECONDS + 2.5)) {
      // fully faded: clear and sleep until the next move
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      running = false;
      return;
    }
    requestAnimationFrame(frame);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) running = false;
  });
})();
