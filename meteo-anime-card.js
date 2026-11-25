/*
 * Météo Animée Card — carte Lovelace pour Home Assistant
 * Fond animé (ciel, soleil, lune, étoiles, nuages, pluie, neige, grêle,
 * brouillard, orage) qui suit en direct l'état d'une entité weather.*.
 * Aucune dépendance, aucun build : un seul fichier JS.
 */
const CARD_VERSION = '0.2.1';
const QUALITY = { high: 0.6, medium: 0.4, low: 0.28 };

/* ------------------------------------------------------------------ */
/* Données de référence                                                */
/* ------------------------------------------------------------------ */

const CONDITIONS_FR = {
  'clear-night': 'Nuit dégagée',
  cloudy: 'Nuageux',
  exceptional: 'Exceptionnel',
  fog: 'Brouillard',
  hail: 'Grêle',
  lightning: 'Orage',
  'lightning-rainy': 'Orage pluvieux',
  partlycloudy: 'Éclaircies',
  pouring: 'Averses',
  rainy: 'Pluie',
  snowy: 'Neige',
  'snowy-rainy': 'Pluie et neige',
  sunny: 'Ensoleillé',
  windy: 'Venteux',
  'windy-variant': 'Venteux et nuageux',
};

const ICONS = {
  'clear-night': 'mdi:weather-night',
  cloudy: 'mdi:weather-cloudy',
  exceptional: 'mdi:alert-circle-outline',
  fog: 'mdi:weather-fog',
  hail: 'mdi:weather-hail',
  lightning: 'mdi:weather-lightning',
  'lightning-rainy': 'mdi:weather-lightning-rainy',
  partlycloudy: 'mdi:weather-partly-cloudy',
  pouring: 'mdi:weather-pouring',
  rainy: 'mdi:weather-rainy',
  snowy: 'mdi:weather-snowy',
  'snowy-rainy': 'mdi:weather-snowy-rainy',
  sunny: 'mdi:weather-sunny',
  windy: 'mdi:weather-windy',
  'windy-variant': 'mdi:weather-windy-variant',
};

/* [jour, nuit] */
const SKY = {
  clear: [
    'linear-gradient(180deg,#2f80ed 0%,#56a8f2 55%,#a8d8f7 100%)',
    'linear-gradient(180deg,#070b1f 0%,#101a3a 55%,#1f2f55 100%)',
  ],
  partly: [
    'linear-gradient(180deg,#3d74c4 0%,#6c9fd6 55%,#b4cde6 100%)',
    'linear-gradient(180deg,#0c1226 0%,#18223d 55%,#2a3854 100%)',
  ],
  cloudy: [
    'linear-gradient(180deg,#56677a 0%,#7d8ea0 55%,#a9b6c3 100%)',
    'linear-gradient(180deg,#121821 0%,#1f2733 55%,#323c4b 100%)',
  ],
  rain: [
    'linear-gradient(180deg,#3b4959 0%,#556577 55%,#7b8a9a 100%)',
    'linear-gradient(180deg,#0d1118 0%,#19202a 55%,#2a333f 100%)',
  ],
  storm: [
    'linear-gradient(180deg,#1d242f 0%,#323c4a 55%,#4d5867 100%)',
    'linear-gradient(180deg,#07090d 0%,#12161d 55%,#20262f 100%)',
  ],
  snow: [
    'linear-gradient(180deg,#7d8fa6 0%,#a3b2c4 55%,#d3dbe4 100%)',
    'linear-gradient(180deg,#1c2433 0%,#2c3647 55%,#46526a 100%)',
  ],
  fog: [
    'linear-gradient(180deg,#8a96a3 0%,#a9b3bd 55%,#c9d0d6 100%)',
    'linear-gradient(180deg,#1c2026 0%,#2b3038 55%,#3e444d 100%)',
  ],
};

/* Couleur des nuages [jour, nuit] */
const CLOUD = {
  light: ['rgba(255,255,255,.92)', 'rgba(150,160,182,.55)'],
  grey: ['rgba(206,213,223,.88)', 'rgba(88,98,116,.78)'],
  dark: ['rgba(122,132,148,.92)', 'rgba(52,60,74,.88)'],
  storm: ['rgba(72,80,95,.96)', 'rgba(34,39,50,.94)'],
};

const VIGILANCE = {
  Jaune: { color: '#f5c518', label: 'jaune' },
  Orange: { color: '#ff8c1a', label: 'orange' },
  Rouge: { color: '#e53935', label: 'rouge' },
};

const DIRS = ['Nord', 'Nord-est', 'Est', 'Sud-est', 'Sud', 'Sud-ouest', 'Ouest', 'Nord-ouest'];

/* ------------------------------------------------------------------ */
/* Utilitaires                                                         */
/* ------------------------------------------------------------------ */

const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const isNum = (v) => typeof v === 'number' && !Number.isNaN(v);
const r0 = (v) => (isNum(v) ? Math.round(v) : '–');
const fr1 = (v) => (isNum(v) ? v.toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : '–');
const dirFr = (b) => (isNum(b) ? DIRS[Math.round(((b % 360) + 360) % 360 / 45) % 8] : '');

function iconFor(cond, night) {
  if (night && cond === 'sunny') return 'mdi:weather-night';
  if (night && cond === 'partlycloudy') return 'mdi:weather-night-partly-cloudy';
  return ICONS[cond] || 'mdi:weather-cloudy';
}

function iconColor(cond, night) {
  if (cond === 'clear-night' || (night && cond === 'sunny')) return '#f4e7a1';
  if (cond === 'sunny') return '#ffc83d';
  if (cond === 'partlycloudy') return night ? '#e6e9f0' : '#ffd873';
  if (cond === 'rainy' || cond === 'pouring') return '#8fd0ff';
  if (cond.startsWith('lightning')) return '#ffd54f';
  if (cond.startsWith('snowy') || cond === 'hail') return '#ffffff';
  return '#e8eef5';
}

function condLabel(cond, night) {
  if (night && cond === 'sunny') return 'Dégagé';
  return CONDITIONS_FR[cond] || cond;
}

/* Échelle de couleur des températures pour les barres min/max */
function tempColor(t) {
  const stops = [
    [-10, [127, 178, 255]],
    [0, [110, 231, 240]],
    [10, [142, 240, 176]],
    [20, [255, 213, 107]],
    [30, [255, 138, 91]],
  ];
  if (!isNum(t)) return 'rgb(110,231,240)';
  if (t <= stops[0][0]) return `rgb(${stops[0][1]})`;
  for (let i = 1; i < stops.length; i++) {
    if (t <= stops[i][0]) {
      const [t0, c0] = stops[i - 1];
      const [t1, c1] = stops[i];
      const k = (t - t0) / (t1 - t0);
      return `rgb(${c0.map((c, j) => Math.round(c + (c1[j] - c) * k))})`;
    }
  }
  return `rgb(${stops[stops.length - 1][1]})`;
}

function uvLabel(uv) {
  if (!isNum(uv)) return 'n/d';
  if (uv < 3) return 'Faible';
  if (uv < 6) return 'Modéré';
  if (uv < 8) return 'Élevé';
  if (uv < 11) return 'Très élevé';
  return 'Extrême';
}

function windChill(t, v) {
  if (!isNum(t) || !isNum(v) || t > 10 || v < 4.8) return t;
  const p = Math.pow(v, 0.16);
  return 13.12 + 0.6215 * t - 11.37 * p + 0.3965 * t * p;
}

function smoothPath(pts) {
  if (pts.length < 2) return '';
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] || p2;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return d;
}

/* Jauge circulaire 270° */
function gauge(pct, inner, color) {
  const r = 34;
  const cx = 44;
  const cy = 44;
  const start = 135;
  const sweep = 270;
  const p = clamp(isNum(pct) ? pct : 0, 0, 1);
  const pt = (a) => [cx + r * Math.cos((a * Math.PI) / 180), cy + r * Math.sin((a * Math.PI) / 180)];
  const arc = (from, to) => {
    const [x0, y0] = pt(from);
    const [x1, y1] = pt(to);
    return `M${x0.toFixed(2)} ${y0.toFixed(2)} A${r} ${r} 0 ${to - from > 180 ? 1 : 0} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
  };
  const [dx, dy] = pt(start + sweep * p);
  return `<svg viewBox="0 0 88 88" class="gauge">
    <path d="${arc(start, start + sweep)}" class="g-track"/>
    ${p > 0.01 ? `<path d="${arc(start, start + sweep * p)}" class="g-val" style="stroke:${color}"/>` : ''}
    <circle cx="${dx.toFixed(2)}" cy="${dy.toFixed(2)}" r="4.5" class="g-dot"/>
    ${inner}
  </svg>`;
}

/* Rose des vents, flèche dans le sens où souffle le vent */
function compass(bearing, speed) {
  let ticks = '';
  for (let i = 0; i < 72; i++) {
    const a = (i * 5 * Math.PI) / 180;
    const r1 = i % 18 === 0 ? 31 : 34;
    ticks += `<line x1="${(44 + r1 * Math.sin(a)).toFixed(2)}" y1="${(44 - r1 * Math.cos(a)).toFixed(2)}" x2="${(44 + 38 * Math.sin(a)).toFixed(2)}" y2="${(44 - 38 * Math.cos(a)).toFixed(2)}"/>`;
  }
  const rot = isNum(bearing) ? bearing + 180 : 0;
  return `<svg viewBox="0 0 88 88" class="compass">
    <g class="ticks">${ticks}</g>
    <text x="44" y="21">N</text><text x="68" y="47">E</text><text x="44" y="73">S</text><text x="20" y="47">O</text>
    ${isNum(bearing) ? `<g transform="rotate(${rot} 44 44)" class="needle"><line x1="44" y1="74" x2="44" y2="17"/><path d="M44 11 L38.5 21 L49.5 21 Z"/></g>` : ''}
    <circle cx="44" cy="44" r="13" class="hub"/>
    <text x="44" y="47.5" class="hubtxt">${isNum(speed) ? Math.round(speed) : '–'}</text>
  </svg>`;
}

/* Arc du soleil entre lever et coucher */
function sunArc(frac) {
  const cx = 50;
  const cy = 58;
  const r = 36;
  let dot = '';
  if (frac !== null) {
    const a = Math.PI * (1 - clamp(frac, 0, 1));
    dot = `<circle cx="${(cx + r * Math.cos(a)).toFixed(2)}" cy="${(cy - r * Math.sin(a)).toFixed(2)}" r="5" class="sun-dot"/>`;
  }
  return `<svg viewBox="0 0 100 66" class="sunarc">
    <line x1="4" y1="${cy}" x2="96" y2="${cy}" class="horizon"/>
    <path d="M${cx - r} ${cy} A${r} ${r} 0 0 1 ${cx + r} ${cy}" class="sun-path"/>
    ${dot}
  </svg>`;
}

/* ------------------------------------------------------------------ */
/* Ciel WebGL : nuages volumétriques, soleil, lune, étoiles, brouillard */
/* ------------------------------------------------------------------ */

const SKY_VERT = 'attribute vec2 a;void main(){gl_Position=vec4(a,0.0,1.0);}';

const SKY_FRAG = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform vec2 uRes;
uniform float uUnit;
uniform float uTime;
uniform float uDrift;
uniform vec3 uSkyTop;
uniform vec3 uSkyBot;
uniform vec3 uLit;
uniform vec3 uShadow;
uniform vec3 uFogCol;
uniform float uCover;
uniform float uDark;
uniform float uFog;
uniform float uSunVis;
uniform float uMoonVis;
uniform float uStars;
uniform vec2 uSun;
uniform vec2 uMoon;
uniform float uFlash;
uniform vec2 uFlashPos;

float hash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
const mat2 M = mat2(1.6, 1.2, -1.2, 1.6);
float fbm(vec2 p) {
  float v = 0.0; float a = 0.5;
  for (int i = 0; i < 5; i++) { v += a * noise(p); p = M * p; a *= 0.5; }
  return v;
}
float fbm3(vec2 p) {
  float v = 0.0; float a = 0.5;
  for (int i = 0; i < 3; i++) { v += a * noise(p); p = M * p; a *= 0.5; }
  return v;
}
float cloudN(vec2 p, float t) {
  vec2 q = vec2(fbm3(p + vec2(0.0, t * 0.05)), fbm3(p + vec2(5.2, 1.3) - vec2(0.0, t * 0.04)));
  return fbm(p + 1.1 * q);
}

void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  vec2 p = gl_FragCoord.xy / uUnit;
  vec3 col = mix(uSkyBot, uSkyTop, smoothstep(0.0, 1.0, uv.y));

  if (uStars > 0.01) {
    vec2 g = p * 70.0;
    vec2 id = floor(g);
    float h = hash(id);
    if (h > 0.972) {
      vec2 f = fract(g) - 0.5 - (vec2(hash(id + 1.7), hash(id + 3.1)) - 0.5) * 0.6;
      float tw = 0.55 + 0.45 * sin(uTime * (1.0 + h * 4.0) + h * 50.0);
      col += vec3(0.9, 0.95, 1.0) * smoothstep(0.1, 0.0, length(f)) * tw * uStars * smoothstep(0.2, 0.7, uv.y);
    }
  }

  vec2 mp = uMoon;
  float md = length(p - mp);
  if (uMoonVis > 0.01) {
    col += uMoonVis * vec3(0.55, 0.62, 0.8) * 0.22 * exp(-md * 7.0);
    float disk = smoothstep(0.042, 0.037, md);
    float tex = 0.8 + 0.2 * fbm((p - mp) * 30.0 + 3.0);
    col = mix(col, vec3(0.96, 0.94, 0.86) * tex, disk * uMoonVis);
  }

  vec2 sp = uSun;
  float sd = length(p - sp);
  col += uSunVis * (vec3(1.0, 0.97, 0.9) * smoothstep(0.045, 0.032, sd)
       + vec3(1.0, 0.85, 0.6) * 0.30 * exp(-sd * 3.5)
       + vec3(1.0, 0.92, 0.75) * 0.40 * exp(-sd * 14.0));

  float t = uTime;
  vec2 cp = p * vec2(1.3, 2.1);
  float cov = clamp(uCover * (0.8 + 0.3 * uv.y), 0.0, 1.0);
  float th = mix(0.86, 0.1, cov);
  float nFar = cloudN(cp * 1.6 + vec2(uDrift * 0.55, 7.0), t);
  float thF = mix(0.86, 0.1, cov * 0.92);
  float dFar = smoothstep(thF, thF + 0.3, nFar);
  vec2 np = cp + vec2(uDrift, 0.0);
  float nNear = cloudN(np, t * 1.3);
  float dNear = smoothstep(th, th + 0.28, nNear);
  vec2 lp = (uSunVis > uMoonVis) ? sp : mp;
  vec2 toL = normalize(lp - p + vec2(0.0001)) * 0.05;
  float nL = cloudN(np + toL * vec2(1.3, 2.1), t * 1.3);
  float dLight = smoothstep(th, th + 0.28, nL);
  float sh = clamp(0.32 + (nL - nNear) * 4.5 + uDark * 0.45 + (1.0 - uv.y) * 0.15 * uDark, 0.0, 1.0);

  vec3 farC = mix(uLit, uShadow, 0.3 + uDark * 0.4) * (0.85 + 0.3 * nFar);
  col = mix(col, mix(farC, col, 0.2), dFar * 0.85);
  vec3 nearC = mix(uLit, uShadow, sh) * (0.8 + 0.4 * nNear);
  nearC += uSunVis * vec3(1.0, 0.88, 0.65) * 0.5 * exp(-sd * 4.0) * (1.0 - dLight);
  nearC += uMoonVis * vec3(0.6, 0.68, 0.85) * 0.25 * exp(-md * 5.0) * (1.0 - dLight);
  col = mix(col, nearC, dNear);

  vec2 fp = uFlashPos;
  col += uFlash * vec3(0.75, 0.8, 1.0) * (0.2 + 1.0 * max(dNear, dFar)) * exp(-length(p - fp) * 1.6);

  if (uFog > 0.01) {
    float f = fbm(p * vec2(1.4, 3.5) + vec2(uDrift * 0.6, t * 0.01));
    float amt = uFog * clamp(0.35 + (1.0 - uv.y) * 0.75, 0.0, 1.0) * (0.55 + 0.6 * f);
    col = mix(col, uFogCol, clamp(amt, 0.0, 0.95));
  }

  col += (hash(gl_FragCoord.xy + fract(uTime)) - 0.5) / 255.0;
  gl_FragColor = vec4(col, 1.0);
}`;

/* Palettes du ciel WebGL : d = jour, n = nuit */
const GLP = {
  clear: {
    d: { top: [0.16, 0.42, 0.84], bot: [0.6, 0.79, 0.95], lit: [1, 1, 1], sh: [0.62, 0.68, 0.78], cover: 0.22, dark: 0 },
    n: { top: [0.015, 0.025, 0.07], bot: [0.07, 0.1, 0.2], lit: [0.2, 0.23, 0.3], sh: [0.05, 0.06, 0.09], cover: 0.1, dark: 0.2 },
  },
  partly: {
    d: { top: [0.22, 0.46, 0.8], bot: [0.64, 0.77, 0.9], lit: [1, 1, 1], sh: [0.55, 0.6, 0.7], cover: 0.56, dark: 0.05 },
    n: { top: [0.02, 0.03, 0.08], bot: [0.08, 0.1, 0.18], lit: [0.22, 0.25, 0.32], sh: [0.05, 0.06, 0.09], cover: 0.52, dark: 0.2 },
  },
  cloudy: {
    d: { top: [0.42, 0.5, 0.58], bot: [0.68, 0.72, 0.77], lit: [0.88, 0.9, 0.93], sh: [0.46, 0.5, 0.57], cover: 0.88, dark: 0.3 },
    n: { top: [0.04, 0.05, 0.07], bot: [0.11, 0.12, 0.16], lit: [0.2, 0.22, 0.27], sh: [0.06, 0.07, 0.09], cover: 0.88, dark: 0.3 },
  },
  rain: {
    d: { top: [0.3, 0.36, 0.43], bot: [0.52, 0.57, 0.63], lit: [0.66, 0.7, 0.75], sh: [0.3, 0.33, 0.38], cover: 0.96, dark: 0.55 },
    n: { top: [0.03, 0.04, 0.05], bot: [0.09, 0.1, 0.13], lit: [0.16, 0.18, 0.22], sh: [0.04, 0.05, 0.06], cover: 0.96, dark: 0.5 },
  },
  storm: {
    d: { top: [0.15, 0.18, 0.23], bot: [0.33, 0.37, 0.43], lit: [0.46, 0.49, 0.54], sh: [0.14, 0.16, 0.2], cover: 1, dark: 0.8 },
    n: { top: [0.02, 0.02, 0.03], bot: [0.06, 0.07, 0.09], lit: [0.12, 0.13, 0.16], sh: [0.02, 0.03, 0.04], cover: 1, dark: 0.7 },
  },
  snow: {
    d: { top: [0.55, 0.62, 0.7], bot: [0.84, 0.87, 0.9], lit: [0.94, 0.95, 0.97], sh: [0.62, 0.66, 0.72], cover: 0.92, dark: 0.25 },
    n: { top: [0.08, 0.1, 0.14], bot: [0.2, 0.23, 0.29], lit: [0.3, 0.33, 0.4], sh: [0.12, 0.14, 0.18], cover: 0.92, dark: 0.3 },
  },
  fog: {
    d: { top: [0.6, 0.64, 0.68], bot: [0.8, 0.82, 0.84], lit: [0.88, 0.89, 0.9], sh: [0.62, 0.65, 0.68], cover: 0.55, dark: 0.2 },
    n: { top: [0.06, 0.07, 0.08], bot: [0.14, 0.15, 0.17], lit: [0.2, 0.21, 0.23], sh: [0.09, 0.1, 0.11], cover: 0.55, dark: 0.3 },
  },
};

const lerp = (a, b, k) => a + (b - a) * k;

class SkyGL {
  constructor(canvas) {
    this.c = canvas;
    this.cur = null;
    this.tgt = null;
    this.drift = Math.random() * 50;
    this.flash = 0;
    this.flashPos = [0.5, 60];
    this.scale = 0.4;
    let gl = null;
    try {
      gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: false, preserveDrawingBuffer: true, antialias: false, depth: false, stencil: false, powerPreference: 'low-power' });
    } catch (e) {
      gl = null;
    }
    this.ok = !!gl && this._init(gl);
    canvas.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      this.ok = false;
    });
    canvas.addEventListener('webglcontextrestored', () => {
      this.ok = this._init(this.gl);
    });
  }

  _init(gl) {
    this.gl = gl;
    const sh = (type, src) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        console.warn('meteo-anime-card: shader', gl.getShaderInfoLog(s));
        return null;
      }
      return s;
    };
    const vs = sh(gl.VERTEX_SHADER, SKY_VERT);
    const fs = sh(gl.FRAGMENT_SHADER, SKY_FRAG);
    if (!vs || !fs) return false;
    const pr = gl.createProgram();
    gl.attachShader(pr, vs);
    gl.attachShader(pr, fs);
    gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) {
      console.warn('meteo-anime-card: link', gl.getProgramInfoLog(pr));
      return false;
    }
    gl.useProgram(pr);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(pr, 'a');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    this.u = {};
    ['uRes', 'uUnit', 'uTime', 'uDrift', 'uSkyTop', 'uSkyBot', 'uLit', 'uShadow', 'uFogCol', 'uCover', 'uDark', 'uFog', 'uSunVis', 'uMoonVis', 'uStars', 'uSun', 'uMoon', 'uFlash', 'uFlashPos'].forEach(
      (n) => (this.u[n] = gl.getUniformLocation(pr, n)),
    );
    if (this.w) this.resize(this.w, this.h, this.scale);
    return true;
  }

  resize(w, h, scale) {
    this.w = w;
    this.h = h;
    this.scale = scale;
    this.c.width = Math.max(1, Math.round(w * scale));
    this.c.height = Math.max(1, Math.round(h * scale));
    if (this.ok) this.gl.viewport(0, 0, this.c.width, this.c.height);
  }

  setTarget(p, instant) {
    this.tgt = p;
    if (!this.cur || instant) this.cur = JSON.parse(JSON.stringify(p));
  }

  render(t, dt) {
    if (!this.ok || !this.cur) return;
    const k = 1 - Math.exp(-dt * 0.7);
    const c = this.cur;
    for (const key of Object.keys(this.tgt)) {
      const v = this.tgt[key];
      if (Array.isArray(v)) c[key] = c[key].map((x, i) => lerp(x, v[i], k));
      else c[key] = lerp(c[key], v, k);
    }
    this.drift += dt * c.wind * 0.012;
    if (this.drift > 200) this.drift -= 200;
    const gl = this.gl;
    const u = this.u;
    gl.uniform2f(u.uRes, this.c.width, this.c.height);
    // unité : 700 px CSS ; positions calées sur le haut de la carte
    const W = this.w || 1;
    const H = this.h || 1;
    const toP = (xf, topPx) => [(xf * W) / 700, (H - topPx) / 700];
    gl.uniform1f(u.uUnit, (700 * this.c.height) / H);
    gl.uniform1f(u.uTime, t % 1000);
    gl.uniform1f(u.uDrift, this.drift);
    gl.uniform3fv(u.uSkyTop, c.top);
    gl.uniform3fv(u.uSkyBot, c.bot);
    gl.uniform3fv(u.uLit, c.lit);
    gl.uniform3fv(u.uShadow, c.sh);
    gl.uniform3fv(u.uFogCol, c.fogCol);
    gl.uniform1f(u.uCover, c.cover);
    gl.uniform1f(u.uDark, c.dark);
    gl.uniform1f(u.uFog, c.fog);
    gl.uniform1f(u.uSunVis, c.sunVis);
    gl.uniform1f(u.uMoonVis, c.moonVis);
    gl.uniform1f(u.uStars, c.stars);
    gl.uniform2fv(u.uSun, toP(c.sun[0], 55 + (1 - c.sun[1]) * 175));
    gl.uniform2fv(u.uMoon, toP(c.moon[0], 85));
    gl.uniform1f(u.uFlash, this.flash);
    gl.uniform2fv(u.uFlashPos, toP(this.flashPos[0], this.flashPos[1]));
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
}

/* Paramètres du ciel WebGL pour une météo donnée */
function skyParams(cond, night, windKmh, sun) {
  const s = buildScene(cond, night, windKmh);
  const pal = GLP[s.sky][night ? 'n' : 'd'];
  const elev = sun && isNum(sun.elevation) ? sun.elevation : night ? -20 : 30;
  const az = sun && isNum(sun.azimuth) ? sun.azimuth : 200;
  const clearish = s.sky === 'clear' || s.sky === 'partly';
  const sunUp = clamp((elev + 2) / 6, 0, 1);
  let bot = pal.bot;
  // lumière rasante de l'aube et du crépuscule
  const twi = clearish && elev > -6 && elev < 8 ? 1 - Math.abs(elev - 1) / 7 : 0;
  if (twi > 0) bot = bot.map((v, i) => lerp(v, [0.98, 0.62, 0.42][i], clamp(twi, 0, 1) * 0.75));
  const wind = (0.6 + (isNum(windKmh) ? windKmh : 0) / 20) * (cond === 'windy' || cond === 'windy-variant' ? 2 : 1);
  const fog = { fog: 0.85, rainy: 0.12, pouring: 0.3, 'lightning-rainy': 0.2, snowy: 0.2, 'snowy-rainy': 0.25, hail: 0.15 }[cond] || 0;
  return {
    top: pal.top,
    bot,
    lit: pal.lit,
    sh: pal.sh,
    fogCol: night ? [0.18, 0.19, 0.22] : [0.86, 0.88, 0.89],
    cover: pal.cover,
    dark: pal.dark,
    fog,
    sunVis: night ? 0 : (clearish ? 1 : s.sky === 'cloudy' ? 0.5 : 0.2) * sunUp,
    moonVis: night ? (clearish ? 1 : s.sky === 'cloudy' ? 0.5 : 0) : 0,
    stars: night ? (s.sky === 'clear' ? 1 : s.sky === 'partly' ? 0.8 : s.sky === 'cloudy' ? 0.3 : 0) : 0,
    sun: [clamp((az - 90) / 180, 0.08, 0.92), clamp(elev / 50, 0, 1)],
    moon: [0.78, 0],
    wind,
  };
}

/* ------------------------------------------------------------------ */
/* Particules (canvas 2D) : pluie, gouttes sur la vitre, neige, éclairs */
/* ------------------------------------------------------------------ */

function makeSprite(size, draw) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  draw(c.getContext('2d'), size);
  return c;
}

const RAIN_LAYERS = [
  { len: 9, sp: 520, a: 0.13, w: 0.6, share: 0.5 },
  { len: 17, sp: 780, a: 0.22, w: 1, share: 0.32 },
  { len: 32, sp: 1100, a: 0.32, w: 1.6, share: 0.18 },
];
const SNOW_LAYERS = [
  { r: 1.1, sp: 22, a: 0.55, amp: 6, share: 0.5 },
  { r: 2.3, sp: 40, a: 0.8, amp: 14, share: 0.35 },
  { r: 5, sp: 70, a: 0.85, amp: 26, share: 0.15 },
];

class WeatherFx {
  constructor(canvas, glCanvas, flash, opts) {
    this.c = canvas;
    this.ctx = canvas.getContext('2d');
    this.flash = flash;
    this.fps = opts.fps || 30;
    this.scale = opts.scale || 0.4;
    this.sky = opts.webgl ? new SkyGL(glCanvas) : null;
    if (this.sky && !this.sky.ok) this.sky = null;
    this.w = 0;
    this.h = 0;
    this.scene = null;
    this.rain = [];
    this.snow = [];
    this.hail = [];
    this.splashes = [];
    this.drops = [];
    this.trails = [];
    this.bolt = null;
    this.nextStrike = 0;
    this.running = false;
    this.enabled = true;
    this.last = 0;
    this.t = 0;
    this._loop = this._loop.bind(this);
    this.flake = makeSprite(32, (g, s) => {
      const gr = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
      gr.addColorStop(0, 'rgba(255,255,255,1)');
      gr.addColorStop(0.35, 'rgba(255,255,255,.85)');
      gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr;
      g.fillRect(0, 0, s, s);
    });
    this.dropSprite = makeSprite(64, (g, s) => {
      const r = s / 2 - 2;
      const c = s / 2;
      const body = g.createRadialGradient(c - r * 0.3, c - r * 0.35, r * 0.1, c, c, r);
      body.addColorStop(0, 'rgba(255,255,255,.22)');
      body.addColorStop(0.7, 'rgba(210,225,240,.10)');
      body.addColorStop(1, 'rgba(255,255,255,.28)');
      g.fillStyle = body;
      g.beginPath();
      g.arc(c, c, r, 0, 6.283);
      g.fill();
      g.strokeStyle = 'rgba(0,0,0,.22)';
      g.lineWidth = 2;
      g.beginPath();
      g.arc(c, c + 1, r - 1, 0.15 * Math.PI, 0.85 * Math.PI);
      g.stroke();
      g.fillStyle = 'rgba(255,255,255,.85)';
      g.beginPath();
      g.ellipse(c - r * 0.35, c - r * 0.4, r * 0.22, r * 0.12, -0.6, 0, 6.283);
      g.fill();
      g.strokeStyle = 'rgba(255,255,255,.35)';
      g.lineWidth = 1.5;
      g.beginPath();
      g.arc(c, c, r - 1, 0.95 * Math.PI, 1.6 * Math.PI);
      g.stroke();
    });
  }

  resize(w, h) {
    if (!w || !h) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.w = w;
    this.h = h;
    this.c.width = Math.round(w * dpr);
    this.c.height = Math.round(h * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (this.sky) this.sky.resize(w, h, this.scale);
    this._populate();
  }

  setScene(scene) {
    this.scene = scene;
    this.nextStrike = 0;
    this._populate();
  }

  setSky(params, instant) {
    if (this.sky) this.sky.setTarget(params, instant);
    if (!this.running) this._sync();
  }

  _needed() {
    const s = this.scene;
    return !!this.sky || (!!s && (s.rain || s.snow || s.hail || s.stars || s.lightning));
  }

  _pick(layers) {
    let r = Math.random();
    for (let i = 0; i < layers.length; i++) {
      if (r < layers[i].share) return i;
      r -= layers[i].share;
    }
    return layers.length - 1;
  }

  _populate() {
    const s = this.scene;
    if (!s || !this.w) return;
    const k = clamp((this.w * this.h) / (600 * 900), 0.35, 2.5);
    this.rain = [];
    this.snow = [];
    this.hail = [];
    this.splashes = [];
    for (let i = 0; i < Math.round(s.rain * 1.4 * k); i++) {
      const z = this._pick(RAIN_LAYERS);
      const L = RAIN_LAYERS[z];
      this.rain.push(this._spawn({ z, len: L.len * (0.75 + Math.random() * 0.5), sp: L.sp * (0.85 + Math.random() * 0.3), gy: this.h * (0.82 + Math.random() * 0.18) }, true));
    }
    for (let i = 0; i < Math.round(s.snow * 1.3 * k); i++) {
      const z = this._pick(SNOW_LAYERS);
      const L = SNOW_LAYERS[z];
      this.snow.push(this._spawn({ z, r: L.r * (0.7 + Math.random() * 0.6), sp: L.sp * (0.8 + Math.random() * 0.4), a: L.a, amp: L.amp, ph: Math.random() * 6.283 }, true));
    }
    for (let i = 0; i < Math.round(s.hail * k); i++) {
      this.hail.push(this._spawn({ r: 1.3 + Math.random() * 2, sp: 560 + Math.random() * 300, vy: 0, gy: this.h * (0.85 + Math.random() * 0.15), b: 0 }, true));
    }
    this.glassMax = Math.round((s.glass || 0) * clamp(k, 0.6, 1.6));
    if (!this.glassMax) {
      this.drops = [];
      this.trails = [];
    }
    if (!this.sky) {
      this.stars = [];
      for (let i = 0; i < Math.round(s.stars * k); i++) {
        this.stars.push({ x: Math.random() * this.w, y: Math.random() * this.h * 0.55, r: 0.4 + Math.random() * 1.3, ph: Math.random() * 6.283, sp: 0.5 + Math.random() * 1.8 });
      }
    } else this.stars = [];
    this._sync();
  }

  _spawn(p, init) {
    const sl = this.scene.slant;
    const extra = this.h * Math.abs(sl);
    p.x = Math.random() * (this.w + extra) - (sl > 0 ? extra : 0);
    p.y = init ? Math.random() * this.h : -40 - Math.random() * 80;
    return p;
  }

  _makeBolt() {
    const segs = [];
    const grow = (x, y, ang, len, w, depth) => {
      const pts = [[x, y]];
      const n = Math.max(4, Math.round(len / 16));
      const step = len / n;
      for (let i = 0; i < n; i++) {
        ang += (Math.random() - 0.5) * 0.8;
        ang = clamp(ang, -1.1, 1.1);
        x += Math.sin(ang) * step;
        y += Math.cos(ang) * step;
        pts.push([x, y]);
        if (depth < 2 && Math.random() < (depth ? 0.05 : 0.09)) {
          grow(x, y, ang + (Math.random() < 0.5 ? -1 : 1) * (0.4 + Math.random() * 0.6), len * (0.2 + Math.random() * 0.3), w * 0.55, depth + 1);
        }
      }
      segs.push({ pts, w });
    };
    const x0 = this.w * (0.12 + Math.random() * 0.76);
    grow(x0, -10, (Math.random() - 0.5) * 0.4, this.h * (0.45 + Math.random() * 0.35), 2.6, 0);
    return { segs, x0 };
  }

  _strike(t) {
    const sheet = Math.random() < 0.4;
    const b = sheet ? { segs: [], x0: this.w * Math.random() } : this._makeBolt();
    b.t0 = t;
    b.sheet = sheet;
    this.bolt = b;
    if (this.sky) this.sky.flashPos = [b.x0 / this.w, sheet ? 30 + Math.random() * 150 : 20];
  }

  _boltAlpha(age) {
    if (age < 0.06) return 1;
    if (age < 0.11) return 0.25;
    if (age < 0.17) return 0.9;
    return Math.max(0, 1 - (age - 0.17) / 0.35);
  }

  start() {
    this.enabled = true;
    this._sync();
  }

  stop() {
    this.enabled = false;
    this._sync();
  }

  _sync() {
    const want = this.enabled && this._needed() && this.w > 0;
    if (want && !this.running) {
      this.running = true;
      this.last = 0;
      this.raf = requestAnimationFrame(this._loop);
    } else if (!want && this.running) {
      this.running = false;
      cancelAnimationFrame(this.raf);
    }
    if (!want && this.w) {
      this.ctx.clearRect(0, 0, this.w, this.h);
      // image fixe si les animations sont coupées
      if (!this.enabled && this._needed()) this._frame(this.t, 0);
    }
  }

  _loop(ts) {
    if (!this.running) return;
    this.raf = requestAnimationFrame(this._loop);
    if (this.last && ts - this.last < 1000 / this.fps - 2) return;
    const dt = this.last ? Math.min(0.1, (ts - this.last) / 1000) : 0;
    this.last = ts;
    this.t = ts / 1000;
    this._frame(this.t, dt);
  }

  _frame(t, dt) {
    const ctx = this.ctx;
    const s = this.scene;

    // éclairs
    let fa = 0;
    if (s && s.lightning && dt > 0) {
      if (!this.nextStrike) this.nextStrike = t + 1.5 + Math.random() * 3;
      if (t >= this.nextStrike) {
        this._strike(t);
        this.nextStrike = t + 3 + Math.random() * 8;
      }
    }
    if (this.bolt) {
      const age = t - this.bolt.t0;
      if (age > 0.55 || age < 0) this.bolt = null;
      else fa = this._boltAlpha(age) * (this.bolt.sheet ? 0.7 : 1);
    }

    if (this.sky && !this.sky.ok) {
      // contexte WebGL perdu : retour au rendu CSS
      this.sky = null;
      if (this.onSkyLost) this.onSkyLost();
      return;
    }
    if (this.sky) {
      this.sky.flash = fa * 0.85;
      this.sky.render(t, dt);
    } else if (fa > 0) {
      this.flash.style.transition = 'none';
      this.flash.style.opacity = String(fa * 0.5);
    } else if (this.flash.style.opacity !== '0') {
      this.flash.style.opacity = '0';
    }

    ctx.clearRect(0, 0, this.w, this.h);
    if (!s) return;

    if (this.stars.length) {
      ctx.fillStyle = '#fff';
      for (const st of this.stars) {
        ctx.globalAlpha = 0.3 + 0.7 * Math.abs(Math.sin(t * st.sp + st.ph));
        ctx.beginPath();
        ctx.arc(st.x, st.y, st.r, 0, 6.283);
        ctx.fill();
      }
    }

    if (this.bolt && this.bolt.segs.length && fa > 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      for (const pass of [0, 1]) {
        for (const sg of this.bolt.segs) {
          ctx.globalAlpha = fa * (pass ? 1 : 0.35);
          ctx.strokeStyle = pass ? '#f4f7ff' : '#9fb6ff';
          ctx.lineWidth = pass ? sg.w : sg.w * 6;
          ctx.shadowColor = '#8fa8ff';
          ctx.shadowBlur = pass ? 8 : 30;
          ctx.beginPath();
          sg.pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
          ctx.stroke();
        }
      }
      ctx.restore();
    }

    const sl = s.slant;
    ctx.lineCap = 'round';

    // pluie : trois plans de profondeur
    if (this.rain.length) {
      for (let z = 0; z < RAIN_LAYERS.length; z++) {
        const L = RAIN_LAYERS[z];
        ctx.globalAlpha = L.a;
        ctx.strokeStyle = '#dbeafc';
        ctx.lineWidth = L.w;
        ctx.beginPath();
        for (const p of this.rain) {
          if (p.z !== z) continue;
          p.y += p.sp * dt;
          p.x += p.sp * sl * dt;
          const ground = z === 0 ? this.h + p.len : p.gy;
          if (p.y > ground) {
            if (z > 0 && dt > 0 && this.splashes.length < 90 && Math.random() < 0.6) this.splashes.push({ x: p.x, y: p.gy, t0: t, z });
            this._spawn(p, false);
          }
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x - p.len * sl, p.y - p.len);
        }
        ctx.stroke();
      }
      // éclaboussures
      ctx.strokeStyle = '#e6f1ff';
      ctx.lineWidth = 1;
      this.splashes = this.splashes.filter((sp) => {
        const age = t - sp.t0;
        if (age > 0.28 || age < 0) return false;
        const k = age / 0.28;
        const r = (sp.z === 2 ? 7 : 4) * (0.3 + k);
        ctx.globalAlpha = (1 - k) * (sp.z === 2 ? 0.45 : 0.3);
        ctx.beginPath();
        ctx.ellipse(sp.x, sp.y, r, r * 0.32, 0, Math.PI, 2 * Math.PI);
        ctx.stroke();
        return true;
      });
    }

    // neige : flocons doux, plus gros et flous au premier plan
    for (const p of this.snow) {
      p.y += p.sp * dt;
      p.x += (p.sp * sl * 1.5 + Math.sin(t * 0.9 + p.ph) * p.amp * 0.6) * dt;
      if (p.y - p.r > this.h) this._spawn(p, false);
      if (p.x > this.w + 20) p.x = -20;
      else if (p.x < -20) p.x = this.w + 20;
      const d = p.r * (p.z === 2 ? 4.2 : 3);
      ctx.globalAlpha = p.a;
      ctx.drawImage(this.flake, p.x - d / 2, p.y - d / 2, d, d);
    }

    // grêle avec rebond
    if (this.hail.length) {
      ctx.fillStyle = '#f2f6fb';
      for (const p of this.hail) {
        if (p.b === 0) {
          p.y += p.sp * dt;
          p.x += p.sp * sl * dt;
          if (p.y > p.gy) {
            p.b = 1;
            p.vy = -p.sp * 0.22;
          }
        } else {
          p.vy += 1600 * dt;
          p.y += p.vy * dt;
          if (p.y > p.gy + 4) {
            p.b = 0;
            this._spawn(p, false);
          }
        }
        ctx.globalAlpha = 0.85;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, 6.283);
        ctx.fill();
      }
    }

    // gouttes sur la vitre
    if (this.glassMax) this._glass(t, dt);
    ctx.globalAlpha = 1;
  }

  _glass(t, dt) {
    const ctx = this.ctx;
    if (dt > 0 && this.drops.length < this.glassMax && Math.random() < dt * this.glassMax * 0.15) {
      this.drops.push({ x: Math.random() * this.w, y: Math.random() * this.h * 0.95, r: 1.5 + Math.random() * Math.random() * 6, vy: 0, slide: false, born: t, lastTrail: 0 });
    }
    // traînées laissées par les gouttes qui glissent
    this.trails = this.trails.filter((tr) => {
      const age = t - tr.t0;
      if (age > 5 || age < 0) return false;
      ctx.globalAlpha = 0.6 * (1 - age / 5);
      ctx.drawImage(this.dropSprite, tr.x - tr.r, tr.y - tr.r, tr.r * 2, tr.r * 2);
      return true;
    });
    this.drops = this.drops.filter((d) => {
      if (!d.slide && d.r > 3.2 && dt > 0 && Math.random() < dt * 0.06) {
        d.slide = true;
        d.vy = 20;
      }
      if (d.slide) {
        d.vy = Math.min(d.vy + 120 * dt, 90 + d.r * 12);
        d.y += d.vy * dt;
        d.x += Math.sin(t * 3 + d.born) * 6 * dt;
        if (d.y - d.lastTrail > 7) {
          d.lastTrail = d.y;
          if (this.trails.length < 400) this.trails.push({ x: d.x + (Math.random() - 0.5) * 1.5, y: d.y - d.r, r: Math.max(0.8, d.r * (0.25 + Math.random() * 0.2)), t0: t });
        }
        if (d.y - d.r > this.h) return false;
      }
      const grow = clamp((t - d.born) * 3, 0.05, 1);
      const r = d.r * grow;
      ctx.globalAlpha = 0.9;
      ctx.drawImage(this.dropSprite, d.x - r, d.y - r * 1.05, r * 2, r * 2.1);
      return true;
    });
  }
}

function buildScene(cond, night, windKmh) {
  const w = isNum(windKmh) ? windKmh : 0;
  const s = {
    sky: 'cloudy', sun: false, moon: false, stars: 0, clouds: 0, shade: 'grey',
    rain: 0, snow: 0, hail: 0, glass: 0, fog: false, lightning: false,
    wind: 1 + Math.min(w, 90) / 30,
    slant: Math.min(w / 120, 0.45),
  };
  switch (cond) {
    case 'sunny': Object.assign(s, { sky: 'clear', sun: !night, clouds: night ? 0 : 1, shade: 'light' }); break;
    case 'clear-night': Object.assign(s, { sky: 'clear', clouds: 0, shade: 'light' }); break;
    case 'partlycloudy': Object.assign(s, { sky: 'partly', sun: !night, clouds: 4, shade: 'light' }); break;
    case 'cloudy': Object.assign(s, { sky: 'cloudy', clouds: 7, shade: 'grey' }); break;
    case 'windy':
    case 'windy-variant':
      Object.assign(s, { sky: cond === 'windy' ? 'partly' : 'cloudy', clouds: 6, shade: 'grey', wind: s.wind * 2.2, slant: Math.max(s.slant, 0.35) });
      break;
    case 'fog': Object.assign(s, { sky: 'fog', fog: true, clouds: 2, shade: 'light' }); break;
    case 'rainy': Object.assign(s, { sky: 'rain', clouds: 7, shade: 'dark', rain: 140, glass: 18 }); break;
    case 'pouring': Object.assign(s, { sky: 'storm', clouds: 8, shade: 'dark', rain: 340, glass: 34 }); break;
    case 'lightning': Object.assign(s, { sky: 'storm', clouds: 8, shade: 'storm', lightning: true, rain: 30 }); break;
    case 'lightning-rainy': Object.assign(s, { sky: 'storm', clouds: 8, shade: 'storm', lightning: true, rain: 260, glass: 26 }); break;
    case 'snowy': Object.assign(s, { sky: 'snow', clouds: 6, shade: 'grey', snow: 160 }); break;
    case 'snowy-rainy': Object.assign(s, { sky: 'snow', clouds: 7, shade: 'dark', snow: 90, rain: 90, glass: 10 }); break;
    case 'hail': Object.assign(s, { sky: 'storm', clouds: 8, shade: 'dark', hail: 140, rain: 60, glass: 12 }); break;
    default: Object.assign(s, { sky: 'cloudy', clouds: 6, shade: 'grey' });
  }
  if (night && (s.sky === 'clear' || s.sky === 'partly')) {
    s.moon = true;
    s.stars = s.sky === 'clear' ? 140 : 70;
  }
  return s;
}

/* ------------------------------------------------------------------ */
/* Styles                                                              */
/* ------------------------------------------------------------------ */

const STYLE = `
:host { display:block; }
ha-card {
  display:block; position:relative; overflow:hidden; isolation:isolate;
  border-radius: var(--ha-card-border-radius, 18px);
  color:#fff; background:#2c3a4b;
  font-family: var(--paper-font-body1_-_font-family, 'Roboto', system-ui, sans-serif);
  min-height: var(--mac-min-height, auto);
}
.bg { position:absolute; inset:0; z-index:0; overflow:hidden; pointer-events:none; }
.skywrap, .sky, .clouds, canvas, .flash, .shade, .fog { position:absolute; inset:0; }
.sky { transition: opacity 1.5s ease; }
canvas { width:100%; height:100%; }
.glsky { position:absolute; inset:0; width:100%; height:100%; display:none; }
.bg.gl .glsky { display:block; }
.bg.gl .sun, .bg.gl .moon, .bg.gl .clouds, .bg.gl .fog { display:none; }
.flash { background: rgb(225,232,255); opacity:0; mix-blend-mode: screen; }
.shade { background: linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,.12) 45%, rgba(0,0,0,.28) 100%); }

.sun {
  position:absolute; top:-70px; right:-70px; width:300px; height:300px; border-radius:50%;
  background: radial-gradient(circle, rgba(255,244,200,1) 0 15%, rgba(255,214,120,.6) 27%, rgba(255,200,90,.18) 48%, rgba(255,200,90,0) 70%);
  opacity:0; transition: opacity 1.5s ease; animation: pulse 7s ease-in-out infinite;
}
.sun::after {
  content:''; position:absolute; inset:-60px; border-radius:50%;
  background: repeating-conic-gradient(from 0deg, rgba(255,240,190,.16) 0deg 6deg, rgba(255,240,190,0) 6deg 18deg);
  -webkit-mask: radial-gradient(circle, #000 20%, transparent 68%); mask: radial-gradient(circle, #000 20%, transparent 68%);
  animation: spin 90s linear infinite;
}
.moon {
  position:absolute; top:42px; right:56px; width:68px; height:68px; border-radius:50%;
  box-shadow: inset -17px 9px 0 0 #f3efd9;
  filter: drop-shadow(0 0 16px rgba(243,239,217,.55));
  opacity:0; transition: opacity 1.5s ease; transform: rotate(-18deg);
}
.on { opacity:1 !important; }

.track { position:absolute; left:0; width:100%; animation-name: drift; animation-timing-function: linear; animation-iteration-count: infinite; will-change: transform; }
.cloud {
  position:absolute; right:100%; width:230px; height:72px; border-radius:72px;
  background: var(--cc); filter: blur(7px); transform-origin: right center;
}
.cloud::before { content:''; position:absolute; width:112px; height:112px; top:-56px; left:38px; background:inherit; border-radius:50%; }
.cloud::after  { content:''; position:absolute; width:144px; height:144px; top:-78px; right:26px; background:inherit; border-radius:50%; }

.fog { opacity:0; transition: opacity 1.5s ease; }
.fog div {
  position:absolute; left:-60%; width:220%; height:45%;
  background: radial-gradient(ellipse at center, rgba(236,240,245,.6), rgba(236,240,245,0) 65%);
  animation: fogmove 38s ease-in-out infinite alternate;
}
.fog div:nth-child(1) { top:22%; }
.fog div:nth-child(2) { top:52%; animation-duration: 52s; animation-direction: alternate-reverse; }

.static * , .static *::after { animation-play-state: paused !important; }

@keyframes drift { from { transform: translateX(0); } to { transform: translateX(calc(100% + 340px)); } }
@keyframes spin { to { transform: rotate(360deg); } }
@keyframes pulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.06); } }
@keyframes fogmove { from { transform: translateX(-12%); } to { transform: translateX(12%); } }

/* ---- Contenu ---- */
.content { position:relative; z-index:1; padding: 22px 18px 18px; container-type: inline-size; text-shadow: 0 1px 3px rgba(0,0,0,.25); }
.head { padding: 4px 8px 18px; cursor:pointer; }
.loc { font-size: 1.25rem; font-weight: 500; opacity:.95; }
.temp { font-size: 6.2rem; font-weight: 200; line-height: 1; margin: 6px 0 4px; letter-spacing:-2px; }
.temp .deg { font-size: 3rem; vertical-align: top; position:relative; top:.35em; margin-left:4px; }
.cond { font-size: 1.15rem; opacity: .9; }
.chips { display:flex; gap:8px; margin-top:12px; flex-wrap:wrap; }
.chip { display:inline-flex; align-items:center; gap:6px; padding:5px 12px; border-radius:999px; background: rgba(255,255,255,.18); font-size:.95rem; font-weight:500; }
.chip ha-icon { --mdc-icon-size: 18px; }

.panel {
  background: rgba(22,32,46,.30); border: 1px solid rgba(255,255,255,.08);
  -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px);
  border-radius: 18px; padding: 14px 16px; margin-bottom: 12px;
}
.ptitle { font-size:.92rem; opacity:.85; margin-bottom:8px; display:flex; justify-content:space-between; }

.alert { display:flex; gap:12px; align-items:flex-start; border-left: 4px solid var(--ac); }
.alert ha-icon { color: var(--ac); --mdc-icon-size: 26px; }
.alert .t1 { font-weight:600; font-size:1.1rem; }
.alert .t2 { opacity:.9; margin-top:2px; }

.drow { display:grid; grid-template-columns: 6.5em 1fr 44px 2.6em minmax(60px, 160px) 2.6em; align-items:center; gap: 8px; padding: 9px 0; border-bottom: 1px solid rgba(255,255,255,.09); }
.drow:last-child { border-bottom: 0; }
.dday { font-weight:600; }
.dwind { opacity:.9; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.dicon { text-align:center; position:relative; }
.dicon ha-icon { --mdc-icon-size: 28px; }
.dpp { position:absolute; left:50%; transform:translateX(-50%); bottom:-11px; font-size:.68rem; color:#9ad6ff; white-space:nowrap; }
.dmin, .dmax { text-align:right; font-variant-numeric: tabular-nums; }
.dmax { text-align:left; }
.bar { position:relative; height:6px; border-radius:3px; background: rgba(255,255,255,.13); }
.bar i { position:absolute; top:0; bottom:0; border-radius:3px; }
.bar b { position:absolute; top:50%; width:8px; height:8px; margin:-4px 0 0 -4px; border-radius:50%; background:#fff; box-shadow: 0 0 0 2px rgba(0,0,0,.25); }

.hscroll { overflow-x:auto; overflow-y:hidden; scrollbar-width: none; -webkit-overflow-scrolling: touch; }
.hscroll::-webkit-scrollbar { display:none; }
.hinner { position:relative; }
.hinner svg.curve { display:block; }
.curve .line { fill:none; stroke:#7ee8ef; stroke-width:2.5; }
.curve .area { stroke:none; }
.curve text { fill:#fff; font-size:15px; text-anchor:middle; }
.curve .now { fill:#fff; }
.hcols { display:flex; }
.hcol { flex: 0 0 auto; text-align:center; font-size:.82rem; }
.hcol ha-icon { --mdc-icon-size: 28px; display:block; margin: 2px auto 4px; }
.hcol .hw { opacity:.9; white-space:nowrap; }
.hcol .hp { color:#9ad6ff; font-size:.72rem; min-height: 1em; }
.hcol .ht { margin-top:4px; font-weight:500; }

.tiles { display:grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
.tile { margin:0; position:relative; min-height: 150px; display:flex; flex-direction:column; }
.tile .tl { font-size:.9rem; opacity:.85; }
.tile .tv { font-size:1.5rem; font-weight:500; margin-top:4px; }
.tile .ts { font-size:.8rem; opacity:.75; margin-top:2px; }
.tile .viz { margin-top:auto; align-self:flex-end; width: 92px; }
.tile .viz.wide { width: 120px; }
.gauge .g-track { fill:none; stroke: rgba(255,255,255,.18); stroke-width:6; stroke-linecap:round; }
.gauge .g-val { fill:none; stroke-width:6; stroke-linecap:round; }
.gauge .g-dot { fill:#fff; }
.gauge text { fill:#fff; font-size:20px; font-weight:500; text-anchor:middle; }
.gauge text.small { font-size:11px; opacity:.8; }
.compass .ticks line { stroke: rgba(255,255,255,.45); stroke-width:1; }
.compass text { fill:#fff; font-size:9px; text-anchor:middle; opacity:.85; }
.compass .needle line { stroke:#fff; stroke-width:2.5; stroke-linecap:round; }
.compass .needle path { fill:#fff; }
.compass .hub { fill: rgba(255,255,255,.92); }
.compass .hubtxt { fill:#33414f; font-size:11px; font-weight:700; opacity:1; }
.sunarc .horizon { stroke: rgba(255,255,255,.35); stroke-width:1; stroke-dasharray: 3 3; }
.sunarc .sun-path { fill:none; stroke: rgba(255,255,255,.75); stroke-width:3; stroke-linecap: round; }
.sunarc .sun-dot { fill:#ffd45a; filter: drop-shadow(0 0 4px rgba(255,212,90,.9)); }
.sunt { display:flex; justify-content:space-between; font-size:.72rem; opacity:.85; }

.err { padding: 16px; background: #b3261e; color:#fff; }
.foot { text-align:center; font-size:.75rem; opacity:.6; margin-top: 6px; }

@container (max-width: 520px) {
  .tiles { grid-template-columns: repeat(2, 1fr); }
  .drow { grid-template-columns: 5.6em 1fr 36px 2.3em minmax(40px, 90px) 2.3em; font-size:.92rem; }
  .temp { font-size: 5rem; }
}
@container (max-width: 380px) {
  .dwind { display:none; }
  .drow { grid-template-columns: 5.6em 36px 2.3em 1fr 2.3em; }
}
`;

/* ------------------------------------------------------------------ */
/* Carte                                                               */
/* ------------------------------------------------------------------ */

class MeteoAnimeCard extends HTMLElement {
  static getStubConfig(hass) {
    const ids = Object.keys(hass?.states || {});
    const weather = ids.find((e) => e.startsWith('weather.meteo_france')) || ids.find((e) => e.startsWith('weather.')) || 'weather.home';
    const alert = ids.find((e) => e.startsWith('sensor.') && e.endsWith('_weather_alert'));
    return { entity: weather, ...(alert ? { alert_entity: alert } : {}) };
  }

  setConfig(config) {
    if (!config || !config.entity || !String(config.entity).startsWith('weather.')) {
      throw new Error('Paramètre "entity" obligatoire (une entité weather.*)');
    }
    this._config = {
      sun_entity: 'sun.sun',
      days: 5,
      hours: 24,
      show_daily: true,
      show_hourly: true,
      show_tiles: true,
      animations: true,
      fps: 30,
      ...config,
    };
    this._sceneKey = null;
    this._forecast = { daily: null, hourly: null };
    this._unsubscribe();
    if (this._built) {
      this._applyCardStyle();
      this._fx.fps = this._config.fps;
      if (this._hass) this.hass = this._hass;
    }
  }

  set hass(hass) {
    const first = !this._hass;
    this._hass = hass;
    if (!this._config) return;
    if (!this._built) this._build();
    const c = this._config;
    const st = hass.states[c.entity];
    const sun = hass.states[c.sun_entity];
    const al = c.alert_entity ? hass.states[c.alert_entity] : null;
    const aqi = c.aqi_entity ? hass.states[c.aqi_entity] : null;
    if (first || st !== this._st || sun !== this._sun || al !== this._al || aqi !== this._aqi) {
      this._st = st;
      this._sun = sun;
      this._al = al;
      this._aqi = aqi;
      this._update();
    }
    this._subscribe();
  }

  get hass() {
    return this._hass;
  }

  connectedCallback() {
    if (this._built) {
      if (this._config.animations !== false) this._fx.start();
      this._subscribe();
    }
  }

  disconnectedCallback() {
    if (this._fx) this._fx.stop();
    this._unsubscribe();
  }

  getCardSize() {
    return 14;
  }

  getGridOptions() {
    return { columns: 'full' };
  }

  /* ---------- Construction ---------- */

  _build() {
    this._built = true;
    const root = this.attachShadow ? this.shadowRoot || this.attachShadow({ mode: 'open' }) : this;
    root.innerHTML = `
      <style>${STYLE}</style>
      <ha-card>
        <div class="bg">
          <canvas class="glsky"></canvas>
          <div class="skywrap"></div>
          <div class="sun"></div>
          <div class="moon"></div>
          <div class="clouds"></div>
          <div class="fog"><div></div><div></div></div>
          <canvas></canvas>
          <div class="flash"></div>
          <div class="shade"></div>
        </div>
        <div class="content"></div>
      </ha-card>`;
    this._root = root;
    this._bg = root.querySelector('.bg');
    this._content = root.querySelector('.content');
    const q = this._config.quality;
    this._fx = new WeatherFx(root.querySelector('canvas:not(.glsky)'), root.querySelector('.glsky'), root.querySelector('.flash'), {
      fps: this._config.fps,
      scale: QUALITY[q] || QUALITY.medium,
      webgl: q !== 'css',
    });
    this._bg.classList.toggle('gl', !!this._fx.sky);
    this._fx.onSkyLost = () => {
      this._bg.classList.remove('gl');
      this._sceneKey = null;
      this._update();
    };
    this._ro = new ResizeObserver((entries) => {
      const r = entries[0].contentRect;
      this._fx.resize(r.width, r.height);
    });
    this._ro.observe(this._bg);
    this._content.addEventListener('click', (ev) => {
      if (ev.target.closest('[data-more]')) {
        this.dispatchEvent(new CustomEvent('hass-more-info', { bubbles: true, composed: true, detail: { entityId: this._config.entity } }));
      }
    });
    this._applyCardStyle();
    if (this._config.animations === false) this._fx.stop();
    else this._fx.start();
  }

  _applyCardStyle() {
    const card = this._root.querySelector('ha-card');
    card.style.setProperty('--mac-min-height', this._config.min_height || 'auto');
    this._bg.classList.toggle('static', this._config.animations === false);
    if (this._config.animations === false) this._fx.stop();
    else if (this.isConnected) this._fx.start();
  }

  /* ---------- Prévisions (API weather/subscribe_forecast) ---------- */

  _subscribe() {
    const hass = this._hass;
    if (this._subs || !hass || !hass.connection || !this.isConnected) return;
    const st = hass.states[this._config.entity];
    if (!st) return;
    const feats = st.attributes.supported_features || 0;
    const types = [];
    if (feats & 1) types.push('daily');
    if (feats & 2) types.push('hourly');
    if (!types.length) return;
    this._subs = types.map((type) =>
      hass.connection
        .subscribeMessage(
          (msg) => {
            this._forecast[type] = msg.forecast || [];
            this._update();
          },
          { type: 'weather/subscribe_forecast', forecast_type: type, entity_id: this._config.entity },
        )
        .catch((err) => {
          console.warn('meteo-anime-card: abonnement prévisions impossible', type, err);
          return null;
        }),
    );
  }

  _unsubscribe() {
    if (!this._subs) return;
    this._subs.forEach((p) => p.then((un) => typeof un === 'function' && un()).catch(() => {}));
    this._subs = null;
  }

  /* ---------- Helpers temporels ---------- */

  get _tz() {
    return this._hass?.config?.time_zone || undefined;
  }

  _dayKey(d) {
    return d.toLocaleDateString('fr-CA', { timeZone: this._tz });
  }

  _minutes(d) {
    const parts = new Intl.DateTimeFormat('fr-FR', { timeZone: this._tz, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(d);
    const h = +parts.find((p) => p.type === 'hour').value;
    const m = +parts.find((p) => p.type === 'minute').value;
    return h * 60 + m;
  }

  _hhmm(d) {
    return d.toLocaleTimeString('fr-FR', { timeZone: this._tz, hour: '2-digit', minute: '2-digit' });
  }

  _sunTimes() {
    const a = this._sun?.attributes;
    if (!a || !a.next_rising || !a.next_setting) return null;
    const rise = new Date(a.next_rising);
    const set = new Date(a.next_setting);
    return { rise, set, riseMin: this._minutes(rise), setMin: this._minutes(set) };
  }

  _isNightAt(d, sunT) {
    if (!sunT) {
      const h = this._minutes(d) / 60;
      return h < 7 || h >= 19;
    }
    const m = this._minutes(d);
    return m < sunT.riseMin || m >= sunT.setMin;
  }

  _isNightNow(cond) {
    const c = this._config;
    if (typeof c.demo_night === 'boolean') return c.demo_night;
    if (cond === 'clear-night') return true;
    if (this._sun) return this._sun.state === 'below_horizon';
    return this._isNightAt(new Date(), null);
  }

  /* ---------- Rendu ---------- */

  _update() {
    if (!this._built) return;
    const c = this._config;
    const st = this._st;
    if (!st) {
      this._content.innerHTML = `<div class="err">Entité introuvable : ${esc(c.entity)}</div>`;
      return;
    }
    const a = st.attributes;
    const cond = c.demo_condition || st.state;
    const night = this._isNightNow(cond);

    const wind = isNum(c.demo_wind) ? c.demo_wind : a.wind_speed;
    const key = `${cond}|${night}|${Math.round((wind || 0) / 15)}`;
    const firstScene = this._sceneKey === null;
    if (key !== this._sceneKey) {
      this._sceneKey = key;
      this._applyScene(buildScene(cond, night, wind), night);
    }
    if (this._fx.sky) this._fx.setSky(skyParams(cond, night, wind, this._sun?.attributes), firstScene);

    const scroller = this._content.querySelector('.hscroll');
    const scrollLeft = scroller ? scroller.scrollLeft : 0;

    const daily = (this._forecast.daily || a.forecast || []).slice(0, c.days);
    const now = new Date();
    const hourly = (this._forecast.hourly || [])
      .filter((f) => new Date(f.datetime) > now)
      .slice(0, c.hours);
    const sunT = this._sunTimes();

    let html = this._renderHead(a, cond, night, daily[0]);
    html += this._renderAlert();
    if (c.show_daily && daily.length) html += this._renderDaily(daily, a);
    if (c.show_hourly && hourly.length) html += this._renderHourly(hourly, a, cond, night, sunT);
    if (c.show_tiles) html += this._renderTiles(a, daily[0], sunT, night);
    if (a.attribution && c.show_attribution !== false) html += `<div class="foot">${esc(a.attribution)}</div>`;
    this._content.innerHTML = html;

    const sc = this._content.querySelector('.hscroll');
    if (sc && scrollLeft) sc.scrollLeft = scrollLeft;
  }

  _applyScene(s, night) {
    const n = night ? 1 : 0;
    const wrap = this._root.querySelector('.skywrap');
    const layer = document.createElement('div');
    layer.className = 'sky';
    layer.style.background = SKY[s.sky][n];
    layer.style.opacity = wrap.children.length ? '0' : '1';
    wrap.appendChild(layer);
    void layer.offsetWidth;
    layer.style.opacity = '1';
    clearTimeout(this._skyTimer);
    this._skyTimer = setTimeout(() => {
      while (wrap.children.length > 1) wrap.firstChild.remove();
    }, 1700);

    this._root.querySelector('.sun').classList.toggle('on', s.sun);
    this._root.querySelector('.moon').classList.toggle('on', s.moon);
    this._root.querySelector('.fog').classList.toggle('on', s.fog);

    const clouds = this._root.querySelector('.clouds');
    clouds.style.setProperty('--cc', CLOUD[s.shade][n]);
    let ch = '';
    for (let i = 0; i < s.clouds; i++) {
      const dur = (70 + Math.random() * 80) / s.wind;
      const top = -4 + Math.random() * (s.clouds > 5 ? 46 : 34);
      const scale = 0.65 + Math.random() * 0.85;
      const op = 0.55 + Math.random() * 0.45;
      ch += `<div class="track" style="top:${top.toFixed(1)}%;animation-duration:${dur.toFixed(1)}s;animation-delay:-${(Math.random() * dur).toFixed(1)}s">
        <div class="cloud" style="transform:scale(${scale.toFixed(2)});opacity:${op.toFixed(2)}"></div></div>`;
    }
    clouds.innerHTML = ch;

    this._fx.setScene(s);
  }

  _renderHead(a, cond, night, today) {
    const c = this._config;
    const name = c.name ?? this._hass.config?.location_name ?? a.friendly_name;
    const range = today && isNum(today.temperature) ? ` ${r0(today.temperature)}°/${r0(today.templow)}°` : '';
    let chips = '';
    if (this._aqi) {
      chips += `<span class="chip"><ha-icon icon="mdi:leaf"></ha-icon>IQA ${esc(this._aqi.state)}</span>`;
    }
    return `<div class="head" data-more>
      <div class="loc">${esc(name)}</div>
      <div class="temp">${r0(a.temperature)}<span class="deg">°</span></div>
      <div class="cond">${esc(condLabel(cond, night))}${range}</div>
      ${chips ? `<div class="chips">${chips}</div>` : ''}
    </div>`;
  }

  _renderAlert() {
    const al = this._al;
    if (!al || !VIGILANCE[al.state]) return '';
    const v = VIGILANCE[al.state];
    const risks = Object.entries(al.attributes)
      .filter(([, val]) => VIGILANCE[val])
      .map(([k, val]) => `${k.toLowerCase()} (${VIGILANCE[val].label})`);
    return `<div class="panel alert" style="--ac:${v.color}">
      <ha-icon icon="mdi:alert"></ha-icon>
      <div><div class="t1">Vigilance ${v.label}</div>
      <div class="t2">${esc(risks.join(', ') || 'Risque météo en cours')}</div></div>
    </div>`;
  }

  _dayLabel(d) {
    const k = this._dayKey(d);
    if (k === this._dayKey(new Date())) return "Aujourd'hui";
    if (k === this._dayKey(new Date(Date.now() + 86400000))) return 'Demain';
    const s = d.toLocaleDateString('fr-FR', { timeZone: this._tz, weekday: 'short' });
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  _renderDaily(daily, a) {
    const lows = daily.map((d) => (isNum(d.templow) ? d.templow : d.temperature));
    const highs = daily.map((d) => d.temperature);
    const lo = Math.min(...lows);
    const hi = Math.max(...highs);
    const span = hi - lo || 1;
    const rows = daily
      .map((d, i) => {
        const dt = new Date(d.datetime);
        const low = lows[i];
        const left = ((low - lo) / span) * 100;
        const width = Math.max(((d.temperature - low) / span) * 100, 3);
        const isToday = this._dayKey(dt) === this._dayKey(new Date());
        const dot = isToday && isNum(a.temperature) ? `<b style="left:${clamp(((a.temperature - lo) / span) * 100, 0, 100).toFixed(1)}%"></b>` : '';
        const pp = isNum(d.precipitation_probability) && d.precipitation_probability >= 20 ? `<span class="dpp">${d.precipitation_probability}%</span>` : '';
        const windTxt = isNum(d.wind_speed) ? `${dirFr(d.wind_bearing)} ${fr1(d.wind_speed)} km/h` : '';
        return `<div class="drow">
          <div class="dday">${this._dayLabel(dt)}</div>
          <div class="dwind">${windTxt}</div>
          <div class="dicon"><ha-icon icon="${iconFor(d.condition, false)}" style="color:${iconColor(d.condition, false)}"></ha-icon>${pp}</div>
          <div class="dmin">${r0(low)}°</div>
          <div class="bar"><i style="left:${left.toFixed(1)}%;width:${width.toFixed(1)}%;background:linear-gradient(90deg,${tempColor(low)},${tempColor(d.temperature)})"></i>${dot}</div>
          <div class="dmax">${r0(d.temperature)}°</div>
        </div>`;
      })
      .join('');
    return `<div class="panel"><div class="ptitle"><span>Prévisions sur ${daily.length} jours</span></div>${rows}</div>`;
  }

  _renderHourly(hourly, a, cond, night, sunT) {
    const colW = 72;
    const items = [
      { label: 'Maintenant', temp: a.temperature, cond, night, wind: a.wind_speed, pp: null },
      ...hourly.map((f) => {
        const d = new Date(f.datetime);
        const midnight = this._minutes(d) < 60;
        return {
          label: midnight ? d.toLocaleDateString('fr-FR', { timeZone: this._tz, day: '2-digit', month: '2-digit' }) : this._hhmm(d),
          temp: f.temperature,
          cond: f.condition,
          night: this._isNightAt(d, sunT),
          wind: f.wind_speed,
          pp: f.precipitation_probability,
        };
      }),
    ];
    const W = items.length * colW;
    const H = 92;
    const temps = items.map((i) => i.temp).filter(isNum);
    const tmin = Math.min(...temps);
    const tmax = Math.max(...temps);
    const yOf = (t) => (tmax === tmin ? 60 : 82 - ((t - tmin) / (tmax - tmin)) * 44);
    const pts = items.map((it, i) => [i * colW + colW / 2, yOf(isNum(it.temp) ? it.temp : tmin)]);
    const line = smoothPath(pts);
    const area = `${line} L${pts[pts.length - 1][0]},${H} L${pts[0][0]},${H} Z`;
    const labels = items.map((it, i) => `<text x="${pts[i][0]}" y="${(pts[i][1] - 12).toFixed(1)}">${r0(it.temp)}°</text>`).join('');
    const cols = items
      .map(
        (it) => `<div class="hcol" style="width:${colW}px">
          <ha-icon icon="${iconFor(it.cond, it.night)}" style="color:${iconColor(it.cond, it.night)}"></ha-icon>
          <div class="hp">${isNum(it.pp) && it.pp > 0 ? `${it.pp}%` : ''}</div>
          <div class="hw">${isNum(it.wind) ? `${fr1(it.wind)} km/h` : ''}</div>
          <div class="ht">${esc(it.label)}</div>
        </div>`,
      )
      .join('');
    return `<div class="panel"><div class="ptitle"><span>Prévisions sur ${this._config.hours} heures</span></div>
      <div class="hscroll"><div class="hinner" style="width:${W}px">
        <svg class="curve" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
          <defs><linearGradient id="hg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7ee8ef" stop-opacity=".28"/><stop offset="1" stop-color="#7ee8ef" stop-opacity="0"/></linearGradient></defs>
          <path d="${area}" class="area" fill="url(#hg)"/>
          <path d="${line}" class="line"/>
          <circle cx="${pts[0][0]}" cy="${pts[0][1]}" r="4" class="now"/>
          ${labels}
        </svg>
        <div class="hcols">${cols}</div>
      </div></div></div>`;
  }

  _renderTiles(a, today, sunT, night) {
    const uv = isNum(a.uv_index) ? a.uv_index : today?.uv_index;
    const hum = a.humidity;
    const feels = isNum(a.apparent_temperature) ? a.apparent_temperature : windChill(a.temperature, a.wind_speed);
    const pres = a.pressure;

    const tiles = [];
    tiles.push(`<div class="panel tile"><div class="tl">UV</div><div class="tv">${uvLabel(uv)}</div>
      <div class="viz">${gauge(isNum(uv) ? uv / 11 : 0, `<text x="44" y="51">${isNum(uv) ? Math.round(uv) : '–'}</text>`, '#ffd166')}</div></div>`);

    tiles.push(`<div class="panel tile"><div class="tl">Humidité</div><div class="tv">${isNum(hum) ? Math.round(hum) : '–'} %</div>
      <div class="viz">${gauge(isNum(hum) ? hum / 100 : 0, `<path d="M44 33 C44 33 36 43 36 48 a8 8 0 0 0 16 0 C52 43 44 33 44 33Z" fill="#fff"/>`, '#7fc8ff')}</div></div>`);

    tiles.push(`<div class="panel tile"><div class="tl">Ressenti</div><div class="tv">${r0(feels)}°</div>
      <div class="viz">${gauge(isNum(feels) ? (feels + 20) / 60 : 0, `<text x="44" y="49" class="small">°C</text>`, tempColor(feels))}</div></div>`);

    const gust = isNum(a.wind_gust_speed) && a.wind_gust_speed > 0 ? `Rafales ${fr1(a.wind_gust_speed)} km/h` : '';
    tiles.push(`<div class="panel tile"><div class="tl">${esc(dirFr(a.wind_bearing) || 'Vent')}</div><div class="tv">${fr1(a.wind_speed)} <span style="font-size:.9rem">km/h</span></div>
      <div class="ts">${gust}</div><div class="viz">${compass(a.wind_bearing, a.wind_speed)}</div></div>`);

    if (sunT) {
      const up = this._sun.state === 'above_horizon';
      const nowM = this._minutes(new Date());
      const frac = up ? (nowM - sunT.riseMin) / (sunT.setMin - sunT.riseMin) : null;
      tiles.push(`<div class="panel tile"><div class="tl">${up ? 'Coucher' : 'Lever'}</div><div class="tv">${this._hhmm(up ? sunT.set : sunT.rise)}</div>
        <div class="viz wide">${sunArc(frac)}<div class="sunt"><span>${this._hhmm(sunT.rise)}</span><span>${this._hhmm(sunT.set)}</span></div></div></div>`);
    }

    tiles.push(`<div class="panel tile"><div class="tl">Pression</div><div class="tv">${isNum(pres) ? Math.round(pres) : '–'}</div>
      <div class="viz">${gauge(isNum(pres) ? (pres - 960) / 100 : 0, `<text x="44" y="49" class="small">hPa</text>`, '#b9a7ff')}</div></div>`);

    return `<div class="tiles">${tiles.join('')}</div>`;
  }
}

if (!customElements.get('meteo-anime-card')) {
  customElements.define('meteo-anime-card', MeteoAnimeCard);
  window.customCards = window.customCards || [];
  window.customCards.push({
    type: 'meteo-anime-card',
    name: 'Météo animée',
    description: 'Carte météo avec fond animé qui suit la météo en direct',
    preview: true,
  });
  console.info(`%c METEO-ANIME-CARD %c v${CARD_VERSION} `, 'background:#2f80ed;color:#fff;font-weight:700', 'background:#fff;color:#2f80ed');
}
