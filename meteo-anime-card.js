/*
 * Météo Animée Card — carte Lovelace pour Home Assistant
 * Fond animé (ciel, soleil, lune, étoiles, nuages, pluie, neige, grêle,
 * brouillard, orage) qui suit en direct l'état d'une entité weather.*.
 * Aucune dépendance, aucun build : un seul fichier JS.
 */
const CARD_VERSION = '0.1.0';

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
/* Moteur d'animation (canvas) : pluie, neige, grêle, étoiles, éclairs */
/* ------------------------------------------------------------------ */

class WeatherFx {
  constructor(canvas, flash, fps) {
    this.c = canvas;
    this.ctx = canvas.getContext('2d');
    this.flash = flash;
    this.fps = fps || 30;
    this.w = 0;
    this.h = 0;
    this.scene = null;
    this.parts = [];
    this.stars = [];
    this.bolt = null;
    this.nextStrike = 0;
    this.running = false;
    this.enabled = true;
    this.last = 0;
    this._loop = this._loop.bind(this);
  }

  resize(w, h) {
    if (!w || !h) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.w = w;
    this.h = h;
    this.c.width = Math.round(w * dpr);
    this.c.height = Math.round(h * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this._populate();
  }

  setScene(scene) {
    this.scene = scene;
    this.nextStrike = 0;
    this._populate();
  }

  _needed() {
    const s = this.scene;
    return !!s && (s.rain || s.snow || s.hail || s.stars || s.lightning);
  }

  _populate() {
    const s = this.scene;
    if (!s || !this.w) return;
    const k = clamp((this.w * this.h) / (600 * 900), 0.35, 2.5);
    this.parts = [];
    for (let i = 0; i < Math.round(s.rain * k); i++) this.parts.push(this._spawn(this._newRain(), true));
    for (let i = 0; i < Math.round(s.snow * k); i++) this.parts.push(this._spawn(this._newSnow(), true));
    for (let i = 0; i < Math.round(s.hail * k); i++) this.parts.push(this._spawn(this._newHail(), true));
    this.stars = [];
    for (let i = 0; i < Math.round(s.stars * k); i++) {
      this.stars.push({
        x: Math.random() * this.w,
        y: Math.random() * this.h * 0.55,
        r: 0.4 + Math.random() * 1.3,
        ph: Math.random() * 6.283,
        sp: 0.5 + Math.random() * 1.8,
      });
    }
    this._sync();
  }

  _newRain() {
    return { t: 'r', len: 10 + Math.random() * 16, sp: 700 + Math.random() * 450, a: 0.22 + Math.random() * 0.35, lw: Math.random() < 0.2 ? 1.6 : 1 };
  }
  _newSnow() {
    return { t: 's', r: 1 + Math.random() * 2.6, sp: 25 + Math.random() * 55, a: 0.55 + Math.random() * 0.45, ph: Math.random() * 6.283, amp: 8 + Math.random() * 22 };
  }
  _newHail() {
    return { t: 'h', r: 1.4 + Math.random() * 1.8, sp: 480 + Math.random() * 320, a: 0.7 + Math.random() * 0.3 };
  }

  _spawn(p, init) {
    const sl = this.scene.slant;
    const extra = this.h * Math.abs(sl);
    p.x = Math.random() * (this.w + extra) - (sl > 0 ? extra : 0);
    p.y = init ? Math.random() * this.h : -20 - Math.random() * 60;
    return p;
  }

  _strike(t) {
    const pts = [];
    let x = this.w * (0.15 + Math.random() * 0.7);
    let y = 0;
    const end = this.h * (0.4 + Math.random() * 0.3);
    pts.push([x, y]);
    while (y < end) {
      y += 14 + Math.random() * 24;
      x += (Math.random() - 0.5) * 42;
      pts.push([x, y]);
    }
    this.bolt = { pts, t0: t };
    const fl = this.flash;
    const flick = (op) => {
      fl.style.transition = 'none';
      fl.style.opacity = String(op);
      void fl.offsetWidth;
      fl.style.transition = 'opacity .7s ease-out';
      fl.style.opacity = '0';
    };
    flick(0.3 + Math.random() * 0.35);
    if (Math.random() < 0.5) setTimeout(() => flick(0.2 + Math.random() * 0.25), 140);
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
      if (!this.enabled && this._needed()) this._frame(0, 0);
    }
  }

  _loop(ts) {
    if (!this.running) return;
    this.raf = requestAnimationFrame(this._loop);
    if (this.last && ts - this.last < 1000 / this.fps - 2) return;
    const dt = this.last ? Math.min(0.1, (ts - this.last) / 1000) : 0;
    this.last = ts;
    this._frame(ts / 1000, dt);
  }

  _frame(t, dt) {
    const ctx = this.ctx;
    const s = this.scene;
    ctx.clearRect(0, 0, this.w, this.h);
    if (!s) return;

    ctx.fillStyle = '#fff';
    for (const st of this.stars) {
      ctx.globalAlpha = 0.3 + 0.7 * Math.abs(Math.sin(t * st.sp + st.ph));
      ctx.beginPath();
      ctx.arc(st.x, st.y, st.r, 0, 6.283);
      ctx.fill();
    }

    if (s.lightning && dt > 0) {
      if (!this.nextStrike) this.nextStrike = t + 1.5 + Math.random() * 3;
      if (t >= this.nextStrike) {
        this._strike(t);
        this.nextStrike = t + 3 + Math.random() * 8;
      }
    }
    if (this.bolt) {
      const age = t - this.bolt.t0;
      if (age > 0.35 || age < 0) this.bolt = null;
      else {
        ctx.globalAlpha = 1 - age / 0.35;
        ctx.strokeStyle = '#eef3ff';
        ctx.lineWidth = 2.2;
        ctx.shadowColor = '#9db8ff';
        ctx.shadowBlur = 18;
        ctx.beginPath();
        this.bolt.pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
        ctx.stroke();
        ctx.shadowBlur = 0;
      }
    }

    ctx.lineCap = 'round';
    const sl = s.slant;
    for (const p of this.parts) {
      if (p.t === 'r') {
        p.y += p.sp * dt;
        p.x += p.sp * sl * dt;
        if (p.y - p.len > this.h) this._spawn(p, false);
        ctx.globalAlpha = p.a;
        ctx.strokeStyle = '#d4e9ff';
        ctx.lineWidth = p.lw;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - p.len * sl, p.y - p.len);
        ctx.stroke();
      } else if (p.t === 's') {
        p.y += p.sp * dt;
        p.x += (p.sp * sl * 1.5 + Math.sin(t * 1.3 + p.ph) * p.amp) * dt;
        if (p.y - p.r > this.h) this._spawn(p, false);
        if (p.x > this.w + 10) p.x = -10;
        else if (p.x < -10) p.x = this.w + 10;
        ctx.globalAlpha = p.a;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, 6.283);
        ctx.fill();
      } else {
        p.y += p.sp * dt;
        p.x += p.sp * sl * dt;
        if (p.y - p.r > this.h) this._spawn(p, false);
        ctx.globalAlpha = p.a;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, 6.283);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }
}

function buildScene(cond, night, windKmh) {
  const w = isNum(windKmh) ? windKmh : 0;
  const s = {
    sky: 'cloudy', sun: false, moon: false, stars: 0, clouds: 0, shade: 'grey',
    rain: 0, snow: 0, hail: 0, fog: false, lightning: false,
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
    case 'rainy': Object.assign(s, { sky: 'rain', clouds: 7, shade: 'dark', rain: 140 }); break;
    case 'pouring': Object.assign(s, { sky: 'storm', clouds: 8, shade: 'dark', rain: 340 }); break;
    case 'lightning': Object.assign(s, { sky: 'storm', clouds: 8, shade: 'storm', lightning: true, rain: 30 }); break;
    case 'lightning-rainy': Object.assign(s, { sky: 'storm', clouds: 8, shade: 'storm', lightning: true, rain: 260 }); break;
    case 'snowy': Object.assign(s, { sky: 'snow', clouds: 6, shade: 'grey', snow: 160 }); break;
    case 'snowy-rainy': Object.assign(s, { sky: 'snow', clouds: 7, shade: 'dark', snow: 90, rain: 90 }); break;
    case 'hail': Object.assign(s, { sky: 'storm', clouds: 8, shade: 'dark', hail: 140, rain: 60 }); break;
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
    this._fx = new WeatherFx(root.querySelector('canvas'), root.querySelector('.flash'), this._config.fps);
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
    if (key !== this._sceneKey) {
      this._sceneKey = key;
      this._applyScene(buildScene(cond, night, wind), night);
    }

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
