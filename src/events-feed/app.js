const EVENTS_URL = "./events.json";
const DEFAULT_IMAGE = "https://lmg.cool/img/logos/lmg/louisville-makes-games-logo-for-dark-bg-sm.png";
const REFRESH_INTERVAL_SECONDS = 300;

const palette = ["#edde44", "#6acad0", "#ea3657"];

function proxiedImageUrl(url) {
  if (!url) return DEFAULT_IMAGE;
  if (url.includes("images.weserv.nl")) return url;
  if (url.includes("meetupstatic.com")) {
    const stripped = url.replace(/^https?:\/\//, "");
    return `https://images.weserv.nl/?url=${encodeURIComponent(stripped)}&w=1280`;
  }
  return url;
}

function inTwoMonthWindow(iso, now = new Date()) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return false;
  const cutoff = new Date(now.getFullYear(), now.getMonth() + 3, 0, 23, 59, 59, 999);
  return date >= now && date <= cutoff;
}

function shortDate(iso) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric"
  }).format(new Date(iso)).toUpperCase();
}

function shortTime(iso) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(iso));
}

function textColorForBg(hex) {
  const raw = hex.replace("#", "");
  const r = parseInt(raw.slice(0, 2), 16);
  const g = parseInt(raw.slice(2, 4), 16);
  const b = parseInt(raw.slice(4, 6), 16);
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return luminance > 0.6 ? "#0b0b0b" : "#f4f4ef";
}

function normalizeLocation(location) {
  const raw = String(location || "").trim();
  const lowered = raw.toLowerCase();
  if (
    lowered.includes("warp zone wolrd 3") ||
    lowered.includes("warp zone world 3") ||
    lowered.includes("warp zone")
  ) {
    return "Warp Zone Louisville";
  }
  return raw || "Location TBA";
}

function isGameCreatorsMeetup(event) {
  const text = `${event.title || ""} ${event.description || ""}`.toLowerCase();
  return text.includes("game creators meetup");
}

async function loadEvents() {
  const response = await fetch(EVENTS_URL);
  if (!response.ok) throw new Error("Could not load events.json");
  const feedEvents = await response.json();

  return feedEvents
    .filter(event => event.start && inTwoMonthWindow(event.start))
    .sort((a, b) => new Date(a.start) - new Date(b.start));
}

function formatNow() {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date());
}

function daysUntil(iso, now = new Date()) {
  const start = new Date(iso);
  if (Number.isNaN(start.getTime())) return 0;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const delta = Math.round((target - today) / 86400000);
  return Math.max(0, delta);
}

function initBackgroundShader() {
  const canvas = document.querySelector("#bg-shader");
  if (!canvas) return;

  const gl = canvas.getContext("webgl", { antialias: true, alpha: true });
  if (!gl) return;

  const vertex = `
    attribute vec2 a_position;
    void main() {
      gl_Position = vec4(a_position, 0.0, 1.0);
    }
  `;

  const fragment = `
    precision highp float;
    uniform vec2 u_resolution;
    uniform float u_time;

    float wave(vec2 p, float speed, float frequency, float offset) {
      return sin(p.x * frequency + u_time * speed + offset) * 0.5 + 0.5;
    }

    void main() {
      vec2 uv = gl_FragCoord.xy / u_resolution.xy;
      uv.x *= u_resolution.x / u_resolution.y;

      float w1 = wave(uv, 0.65, 5.2, 0.0);
      float w2 = wave(uv.yx, 0.48, 7.1, 1.7);
      float mixWave = smoothstep(0.18, 0.9, (w1 * 0.62 + w2 * 0.38));

      vec3 base = vec3(0.07, 0.08, 0.18);
      vec3 cyan = vec3(0.10, 0.62, 0.85);
      vec3 violet = vec3(0.37, 0.22, 0.74);
      vec3 pink = vec3(0.72, 0.18, 0.45);

      vec3 c = mix(base, cyan, smoothstep(0.0, 0.95, mixWave));
      c = mix(c, violet, smoothstep(0.42, 1.0, w2));
      c = mix(c, pink, smoothstep(0.66, 1.0, w1) * 0.28);

      float vignette = smoothstep(1.45, 0.2, distance(uv, vec2(0.78, 0.48)));
      c *= 0.62 + vignette * 0.48;

      gl_FragColor = vec4(c, 1.0);
    }
  `;

  function compile(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error(gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  const vs = compile(gl.VERTEX_SHADER, vertex);
  const fs = compile(gl.FRAGMENT_SHADER, fragment);
  if (!vs || !fs) return;

  const program = gl.createProgram();
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error(gl.getProgramInfoLog(program));
    return;
  }

  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
    gl.STATIC_DRAW
  );

  const position = gl.getAttribLocation(program, "a_position");
  const resolution = gl.getUniformLocation(program, "u_resolution");
  const time = gl.getUniformLocation(program, "u_time");

  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.floor(window.innerWidth * dpr);
    const height = Math.floor(window.innerHeight * dpr);
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
      gl.viewport(0, 0, width, height);
    }
  };

  let rafId = null;
  const start = performance.now();
  const render = now => {
    resize();
    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    gl.uniform2f(resolution, canvas.width, canvas.height);
    gl.uniform1f(time, (now - start) * 0.001);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    rafId = requestAnimationFrame(render);
  };

  window.addEventListener("resize", resize);
  rafId = requestAnimationFrame(render);

  document.addEventListener("visibilitychange", () => {
    if (document.hidden && rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
      return;
    }
    if (!document.hidden && !rafId) {
      rafId = requestAnimationFrame(render);
    }
  });
}

function pickColor(index) {
  return palette[index % palette.length];
}

function buildTile(template, event, color) {
  const node = template.content.firstElementChild.cloneNode(true);
  node.classList.add("tile-standard");
  const media = node.querySelector(".event-media");
  const title = node.querySelector(".event-title");
  const time = node.querySelector(".event-time");
  const location = node.querySelector(".event-location");
  const copy = node.querySelector(".event-copy");

  node.style.backgroundColor = color;
  node.style.color = textColorForBg(color);
  media.style.backgroundImage = `url('${proxiedImageUrl(event.image || DEFAULT_IMAGE)}')`;
  const recurringGameCreators = isGameCreatorsMeetup(event);
  if (!recurringGameCreators) {
    media.style.backgroundImage = `url('${proxiedImageUrl(event.image || DEFAULT_IMAGE)}')`;
  } else {
    node.classList.add("tile-no-image");
    media.style.backgroundImage = "none";
  }

  title.textContent = event.title;
  time.innerHTML = `<span class="event-date">${shortDate(event.start)}</span><span class="event-clock">${shortTime(event.start).toUpperCase()}</span>`;
  location.textContent = normalizeLocation(event.location);

  const days = document.createElement("p");
  days.className = "event-days";
  days.textContent = `in ${daysUntil(event.start)} days!`;
  copy.appendChild(days);

  return node;
}

function layoutSignature(events) {
  return events.map(event => `${event.id}|${event.start}`).join("||");
}

function applyLayoutShiftAnimation(root) {
  const cards = root.querySelectorAll(".event-tile");
  cards.forEach((card, index) => {
    card.style.setProperty("--stagger", `${index * 75}ms`);
    card.classList.remove("layout-shift-animate");
    void card.offsetWidth;
    card.classList.add("layout-shift-animate");
  });
}

function renderEvents(events, opts = {}) {
  const grid = document.querySelector("#metro-grid");
  const template = document.querySelector("#event-tile-template");
  grid.innerHTML = "";
  const visibleEvents = events.slice(0, 5);

  if (!visibleEvents.length) {
    grid.textContent = "No upcoming events in the next 2 months.";
    return;
  }

  visibleEvents.forEach((event, index) => {
    const color = pickColor(index);
    grid.appendChild(buildTile(template, event, color));
  });

  if (opts.animateLayoutChange) {
    applyLayoutShiftAnimation(grid);
  }
}

function wireClock() {
  const output = document.querySelector("#date-display");
  const tick = () => {
    output.textContent = formatNow();
  };
  tick();
  setInterval(tick, 30000);
}

async function init() {
  initBackgroundShader();
  wireClock();

  let previousSignature = "";
  let countdown = REFRESH_INTERVAL_SECONDS;
  const countdownNode = document.querySelector("#refresh-countdown-value");

  const renderCountdown = () => {
    const min = String(Math.floor(countdown / 60)).padStart(2, "0");
    const sec = String(countdown % 60).padStart(2, "0");
    countdownNode.textContent = `${min}:${sec}`;
  };

  const resetCountdown = () => {
    countdown = REFRESH_INTERVAL_SECONDS;
    renderCountdown();
  };

  const refresh = async () => {
    try {
      const events = await loadEvents();
      const nextSignature = layoutSignature(events);
      const animateLayoutChange = previousSignature !== "" && previousSignature !== nextSignature;
      renderEvents(events, { animateLayoutChange });
      previousSignature = nextSignature;
      resetCountdown();
    } catch (error) {
      const grid = document.querySelector("#metro-grid");
      grid.textContent = "Failed to load events. Run the build script first.";
      console.error(error);
    }
  };

  renderCountdown();
  await refresh();

  setInterval(() => {
    countdown = Math.max(0, countdown - 1);
    renderCountdown();
  }, 1000);

  setInterval(() => {
    refresh();
  }, REFRESH_INTERVAL_SECONDS * 1000);
}

init();
