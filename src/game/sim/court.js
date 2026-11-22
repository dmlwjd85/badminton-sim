/**
 * 배드민턴 라이브 코트 (연속 애니메이션)
 *
 * - 좌표: x 0~1 (홈 A쪽 끝선 0 → 네트 0.5 → 원정 B쪽 끝선 1), y 0~1 (복식 코트 폭)
 * - 실제 크기: 길이 13.4m × 폭 6.1m. 단식 옆줄은 안쪽 0.46m, 짧은 서비스 라인은 네트에서 1.98m,
 *   복식 긴 서비스 라인은 끝선에서 0.76m 안쪽
 * - 셔틀은 바닥 위치(x, y)와 높이 z(m)를 가져요. 그림자는 바닥에, 셔틀은 높이만큼 위에 그려요
 * - 세로(휴대폰 기본)에서는 홈 팀이 아래쪽, 원정 팀이 위쪽
 */
import { getStat } from '../stats.js';
import { getPortraitUrl } from '../ui.js';
import { fontStack } from '../utils.js';
import { simTeamInfo } from '../constants.js';

export const COURT_L = 13.4;
export const COURT_W = 6.1;
export const SINGLES_IN = 0.46 / COURT_W; // 단식 옆줄 (양쪽 안쪽)
export const SHORT_LINE = 1.98 / COURT_L; // 네트에서 짧은 서비스 라인까지
export const LONG_DBL = 0.76 / COURT_L; // 끝선에서 복식 긴 서비스 라인까지
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const meters = (ax, ay, bx, by) => Math.hypot((ax - bx) * COURT_L, (ay - by) * COURT_W);

/** 네트에서 d m 떨어진 x (side 'A'는 0.5보다 작은 쪽) */
export function depthX(side, d) {
  const off = clamp(d, -1, 6.7) / COURT_L;
  return side === 'A' ? 0.5 - off : 0.5 + off;
}
/** x가 네트에서 몇 m인지 */
export function depthOf(x) { return Math.abs(x - 0.5) * COURT_L; }

const imgCache = new Map();
function loadImg(url) {
  if (!url) return null;
  if (imgCache.has(url)) return imgCache.get(url);
  const im = new Image();
  im.decoding = 'async';
  im.src = url;
  imgCache.set(url, im);
  return im;
}

/** 휴대폰에서는 세로가 기본. 사용자가 고르면 기억 */
export function getSimOrientation() {
  try {
    const v = localStorage.getItem('sbd_sim_orient');
    if (v === 'portrait' || v === 'landscape') return v;
  } catch (e) { /* 무시 */ }
  return (typeof window !== 'undefined' && window.innerWidth < 768) ? 'portrait' : 'landscape';
}
export function setSimOrientation(v) {
  try { localStorage.setItem('sbd_sim_orient', v); } catch (e) { /* 무시 */ }
}

export class LiveCourt {
  constructor(opts = {}) {
    this.canvasId = opts.canvasId || 'simPitchCanvas';
    this.panelId = opts.panelId === undefined ? 'simPitchPanel' : opts.panelId;
    this.extraH = opts.extraH ?? 240;
    this.players = new Map(); // id -> { p, side, x, y, tx, ty, img, swing }
    this.ball = { x: 0.5, y: 0.5, z: 0, holder: null }; // 셔틀
    this.flight = null;
    this.trail = [];
    this.marks = []; // 떨어진 자리 표시
    this.fx = null;
    this.timeScale = 1;
    this.running = false;
    this.last = 0;
    this.flip = false; // 게임 사이 코트 바꾸기
    this.orient = getSimOrientation();
    this.highlight = new Set();
    this.zones = null; // 서비스 코트 강조 { side, right }
  }

  canvas() { return document.getElementById(this.canvasId); }

  resize() {
    const canvas = this.canvas();
    if (!canvas) return;
    this.orient = getSimOrientation();
    const panel = this.panelId ? document.getElementById(this.panelId) : null;
    panel?.classList.toggle('sim-portrait', this.orient === 'portrait');
    const ratio = (COURT_L + 1.4) / (COURT_W + 1.2);
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    if (this.fullscreen) {
      const fw = window.innerWidth - 16; const fh = window.innerHeight - (this.fullExtraH || 150);
      let w; let h;
      if (this.orient === 'portrait') { h = Math.min(fh, fw * ratio); w = h / ratio; } else { w = Math.min(fw, fh * ratio); h = w / ratio; }
      this.applySize(Math.round(w), Math.round(h), dpr);
      return;
    }
    const wrap = canvas.parentElement;
    const availW = Math.max(240, Math.min(wrap?.clientWidth || 360, 900) - 8);
    let cssW; let cssH;
    if (this.orient === 'portrait') {
      const maxH = Math.max(380, window.innerHeight - this.extraH);
      cssW = Math.min(availW, 420);
      cssH = cssW * ratio;
      if (cssH > maxH) { cssH = maxH; cssW = cssH / ratio; }
    } else {
      cssW = availW;
      cssH = Math.min(cssW / ratio, 460);
      cssW = Math.min(cssW, cssH * ratio);
    }
    this.applySize(Math.round(cssW), Math.round(cssH), dpr);
  }

  applySize(cssW, cssH, dpr) {
    const canvas = this.canvas();
    if (!canvas) return;
    if (canvas.width !== Math.floor(cssW * dpr) || canvas.height !== Math.floor(cssH * dpr)) {
      canvas.width = Math.floor(cssW * dpr);
      canvas.height = Math.floor(cssH * dpr);
    }
    canvas.style.width = `${cssW}px`;
    canvas.style.height = `${cssH}px`;
    this.W = cssW; this.H = cssH; this.dpr = dpr;
    if (this.orient === 'portrait') {
      const mx = cssW * (0.6 / (COURT_W + 1.2)); const my = cssH * (0.7 / (COURT_L + 1.4));
      this.rect = { x0: mx, y0: my, w: cssW - mx * 2, h: cssH - my * 2 };
      this.pxPerM = this.rect.h / COURT_L;
    } else {
      const mx = cssW * (0.7 / (COURT_L + 1.4)); const my = cssH * (0.6 / (COURT_W + 1.2));
      this.rect = { x0: mx, y0: my, w: cssW - mx * 2, h: cssH - my * 2 };
      this.pxPerM = this.rect.w / COURT_L;
    }
  }

  /** 코트 좌표 → 화면. 세로일 때 홈(A)은 아래쪽 */
  toScreen(x, y) {
    const r = this.rect;
    const X = this.flip ? 1 - x : x;
    const Y = this.flip ? 1 - y : y;
    if (this.orient === 'portrait') return [r.x0 + Y * r.w, r.y0 + (1 - X) * r.h];
    return [r.x0 + X * r.w, r.y0 + Y * r.h];
  }

  fromScreen(px, py) {
    const r = this.rect;
    let x; let y;
    if (this.orient === 'portrait') { x = 1 - (py - r.y0) / r.h; y = (px - r.x0) / r.w; } else { x = (px - r.x0) / r.w; y = (py - r.y0) / r.h; }
    if (this.flip) { x = 1 - x; y = 1 - y; }
    return { x: clamp(x, -0.05, 1.05), y: clamp(y, -0.08, 1.08) };
  }

  setKits(homeKey, awayKey) {
    const h = simTeamInfo(homeKey || 'A'); const a = simTeamInfo(awayKey || 'B');
    this.kits = { A: { hex: h.hex, short: h.short, dark: h.key === 'D' }, B: { hex: a.hex, short: a.short, dark: a.key === 'D' } };
  }

  setRosters(plA, plB) {
    const keep = new Set();
    const add = (p, side, i, n) => {
      keep.add(p.id);
      const cur = this.players.get(p.id);
      if (cur) { cur.p = p; cur.side = side; return; }
      const x = depthX(side, n > 1 ? (i === 0 ? 4.4 : 2.2) : 3.3);
      const y = n > 1 ? (i === 0 ? 0.35 : 0.65) : 0.5;
      this.players.set(p.id, { p, side, x, y, tx: x, ty: y, img: loadImg(getPortraitUrl(p)), swing: 0 });
    };
    plA.forEach((p, i) => add(p, 'A', i, plA.length));
    plB.forEach((p, i) => add(p, 'B', i, plB.length));
    [...this.players.keys()].forEach((id) => { if (!keep.has(id)) this.players.delete(id); });
  }

  /** 선수 목표 위치 (네트에서 d m, 폭 y) */
  place(id, side, d, y, snap) {
    const pl = this.players.get(id);
    if (!pl) return;
    pl.tx = depthX(side, d); pl.ty = clamp(y, 0.03, 0.97);
    if (snap) { pl.x = pl.tx; pl.y = pl.ty; }
  }

  moveTo(id, x, y) {
    const pl = this.players.get(id);
    if (!pl) return;
    pl.tx = clamp(x, -0.03, 1.03); pl.ty = clamp(y, -0.05, 1.05);
  }

  snap() { this.players.forEach((pl) => { pl.x = pl.tx; pl.y = pl.ty; }); }

  say(text, badge, tone) {
    const cap = document.getElementById('simPitchCaption');
    if (cap && text) cap.textContent = text;
    const bd = document.getElementById('simPitchBadge');
    if (bd && badge) {
      bd.textContent = badge;
      const cls = { good: 'bg-emerald-700 text-emerald-50', bad: 'bg-red-800 text-red-50', hot: 'bg-amber-500 text-slate-900', info: 'bg-slate-700 text-slate-100' }[tone || 'info'];
      bd.className = `text-[11px] font-bold px-2.5 py-0.5 rounded-md shrink-0 ${cls}`;
    }
  }

  note(text) {
    const el = document.getElementById('simNote');
    if (el && text) el.textContent = text;
    const bar = document.getElementById('simNoteBar');
    if (bar && text) { bar.classList.remove('note-pop'); void bar.offsetWidth; bar.classList.add('note-pop'); }
  }

  showFx(text, color) { this.fx = { text, color, t0: performance.now(), dur: Math.max(500, 1300 * Math.max(0.45, this.timeScale)) }; }

  /* ───── 시간 ───── */
  start() {
    this.resize();
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    const tick = (now) => {
      if (!this.running) return;
      const dt = Math.min(0.05, (now - this.last) / 1000);
      this.last = now;
      this.update(dt, now);
      this.draw(now);
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  stop() { this.running = false; }

  wait(ms) {
    const real = ms * this.timeScale;
    if (real <= 0) return Promise.resolve();
    return new Promise((r) => setTimeout(r, real));
  }

  update(dt, now) {
    const sp = this.timeScale > 0 ? 1 / Math.max(0.2, this.timeScale) : 50;
    this.players.forEach((pl) => {
      const pac = getStat(pl.p, 'pac') || 60;
      const v = (3.0 + (pac / 99) * 2.6) * sp; // m/s
      const d = meters(pl.x, pl.y, pl.tx, pl.ty);
      if (d > 0.01) {
        const step = Math.min(1, (v * dt) / d);
        pl.x = lerp(pl.x, pl.tx, step);
        pl.y = lerp(pl.y, pl.ty, step);
      } else { pl.x = pl.tx; pl.y = pl.ty; }
      if (pl.swing > 0) pl.swing = Math.max(0, pl.swing - dt * 3.2 * sp);
    });
    const f = this.flight;
    const b = this.ball;
    if (f) {
      const t = f.dur <= 0 ? 1 : clamp((now - f.t0) / f.dur, 0, 1);
      // 셔틀은 처음엔 빠르고 끝에서 느려져요
      const e = 1 - Math.pow(1 - t, f.decel);
      b.x = lerp(f.fx, f.tx, e); b.y = lerp(f.fy, f.ty, e);
      b.z = lerp(f.fz, f.tz, e) + f.arc * 4 * e * (1 - e);
      if (f.netFall && e > 0.5) { b.x = lerp(f.fx, 0.5, 0.98); b.z = Math.max(0, lerp(f.fz, 0, (e - 0.5) * 2)); }
      this.trail.push({ x: b.x, y: b.y, z: b.z, t: now });
      if (t >= 1) { this.flight = null; if (f.done) f.done(); }
    }
    this.trail = this.trail.filter((p) => now - p.t < 520);
    this.marks = this.marks.filter((m) => now - m.t0 < 2200);
  }

  /**
   * 셔틀 날리기: 선수 라켓에서 (x, y, z) 지점까지
   * opts: { fromId, x, y, z(도착 높이), arc(위로 솟는 높이 m), speed(m/s), decel, netFall }
   */
  fly(opts) {
    const A = opts.fromId ? this.players.get(opts.fromId) : null;
    if (A) { A.swing = 1; this.ball.x = A.x; this.ball.y = A.y; }
    const b = this.ball;
    const fz = opts.fz ?? (A ? 2.2 : b.z);
    const dist = meters(b.x, b.y, opts.x, opts.y);
    const dur = Math.max(160, (dist / (opts.speed || 10)) * 1000) * this.timeScale;
    return new Promise((res) => {
      this.flight = { fx: b.x, fy: b.y, fz, tx: opts.x, ty: opts.y, tz: opts.z ?? 0.9, arc: opts.arc || 0, decel: opts.decel || 1.4, t0: performance.now(), dur, netFall: !!opts.netFall, done: res };
      if (dur <= 0) { this.update(0, performance.now() + 1); }
    });
  }

  /** 셔틀이 떨어진 자리 (in: 초록 원, out: 빨강 X) */
  mark(x, y, kind) { this.marks.push({ x, y, kind, t0: performance.now() }); }

  /* ───── 그리기 ───── */
  draw(now) {
    const canvas = this.canvas();
    if (!canvas || !this.rect) return;
    const ctx = canvas.getContext('2d');
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    const { W, H } = this;
    ctx.clearRect(0, 0, W, H);
    this.drawCourt(ctx);
    // 떨어진 자리
    this.marks.forEach((m) => {
      const [sx, sy] = this.toScreen(m.x, m.y);
      const al = 1 - (now - m.t0) / 2200;
      ctx.save(); ctx.globalAlpha = Math.max(0, al);
      if (m.kind === 'out') {
        ctx.strokeStyle = '#f87171'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(sx - 7, sy - 7); ctx.lineTo(sx + 7, sy + 7); ctx.moveTo(sx + 7, sy - 7); ctx.lineTo(sx - 7, sy + 7); ctx.stroke();
      } else {
        ctx.strokeStyle = m.kind === 'win' ? '#fde047' : '#4ade80'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(sx, sy, 9, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.restore();
    });
    const r = clamp(this.pxPerM * 0.34, 10, 17);
    const list = [...this.players.values()].sort((a, b) => this.toScreen(a.x, a.y)[1] - this.toScreen(b.x, b.y)[1]);
    list.forEach((pl) => this.drawPlayer(ctx, pl, r));
    this.drawShuttle(ctx, now);
    if (this.fx) {
      const t = (now - this.fx.t0) / this.fx.dur;
      if (t >= 1) this.fx = null;
      else {
        const s = 1 + 0.22 * Math.sin(Math.min(1, t * 3) * Math.PI / 2);
        ctx.save();
        ctx.globalAlpha = t < 0.75 ? 1 : 1 - (t - 0.75) / 0.25;
        ctx.translate(W / 2, H / 2);
        ctx.scale(s, s);
        ctx.font = `900 ${Math.round(Math.min(W, H) * 0.15)}px ${fontStack('num')}`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.lineWidth = 6; ctx.strokeStyle = 'rgba(0,0,0,0.75)';
        ctx.strokeText(this.fx.text, 0, 0);
        ctx.fillStyle = this.fx.color;
        ctx.fillText(this.fx.text, 0, 0);
        ctx.restore();
      }
    }
  }

  drawCourt(ctx) {
    const { W, H } = this;
    // 체육관 바닥
    ctx.fillStyle = '#1b2433';
    ctx.fillRect(0, 0, W, H);
    const P = (x, y) => this.toScreen(x, y);
    const poly = (pts) => { ctx.beginPath(); pts.forEach(([x, y], i) => { const [sx, sy] = P(x, y); if (i) ctx.lineTo(sx, sy); else ctx.moveTo(sx, sy); }); ctx.closePath(); };
    const line = (x1, y1, x2, y2) => { const [a, b] = P(x1, y1); const [c, d] = P(x2, y2); ctx.beginPath(); ctx.moveTo(a, b); ctx.lineTo(c, d); ctx.stroke(); };
    // 코트 바닥 (초록 매트) — 양 팀 쪽에 살짝 팀색
    poly([[0, 0], [1, 0], [1, 1], [0, 1]]);
    ctx.fillStyle = '#167a52'; ctx.fill();
    const kits = this.kits || { A: { hex: '#ef4444' }, B: { hex: '#3b82f6' } };
    ['A', 'B'].forEach((side) => {
      const x0 = side === 'A' ? 0 : 0.5; const x1 = side === 'A' ? 0.5 : 1;
      poly([[x0, 0], [x1, 0], [x1, 1], [x0, 1]]);
      ctx.globalAlpha = 0.1; ctx.fillStyle = kits[side].hex; ctx.fill(); ctx.globalAlpha = 1;
    });
    // 서브 차례: 서비스 코트 강조
    if (this.zones) {
      const z = this.zones;
      const near = depthX(z.side, 1.98 / 1); const far = z.side === 'A' ? (z.singles ? 0 : LONG_DBL) : (z.singles ? 1 : 1 - LONG_DBL);
      // A쪽에서 오른쪽 = 화면 기준 홈 선수가 네트를 볼 때 오른쪽 = y 큰 쪽
      const rightY = z.side === 'A' ? [0.5, z.singles ? 1 - SINGLES_IN : 1] : [z.singles ? SINGLES_IN : 0, 0.5];
      const leftY = z.side === 'A' ? [z.singles ? SINGLES_IN : 0, 0.5] : [0.5, z.singles ? 1 - SINGLES_IN : 1];
      const yy = z.right ? rightY : leftY;
      poly([[near, yy[0]], [far, yy[0]], [far, yy[1]], [near, yy[1]]]);
      ctx.fillStyle = 'rgba(253,224,71,0.16)'; ctx.fill();
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.92)'; ctx.lineWidth = 2;
    poly([[0, 0], [1, 0], [1, 1], [0, 1]]); ctx.stroke();
    ctx.lineWidth = 1.6;
    line(0, SINGLES_IN, 1, SINGLES_IN); line(0, 1 - SINGLES_IN, 1, 1 - SINGLES_IN);
    [0.5 - SHORT_LINE, 0.5 + SHORT_LINE].forEach((x) => line(x, 0, x, 1));
    [LONG_DBL, 1 - LONG_DBL].forEach((x) => line(x, 0, x, 1));
    line(0, 0.5, 0.5 - SHORT_LINE, 0.5); line(0.5 + SHORT_LINE, 0.5, 1, 0.5);
    // 네트 (흰 띠 + 기둥)
    const [n1x, n1y] = P(0.5, -0.04); const [n2x, n2y] = P(0.5, 1.04);
    ctx.save();
    ctx.strokeStyle = 'rgba(0,0,0,0.45)'; ctx.lineWidth = 7;
    ctx.beginPath(); ctx.moveTo(n1x + 2, n1y + 3); ctx.lineTo(n2x + 2, n2y + 3); ctx.stroke();
    ctx.strokeStyle = 'rgba(226,232,240,0.55)'; ctx.lineWidth = 5; ctx.setLineDash([2, 2]);
    ctx.beginPath(); ctx.moveTo(n1x, n1y); ctx.lineTo(n2x, n2y); ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.moveTo(n1x, n1y); ctx.lineTo(n2x, n2y); ctx.stroke();
    [[n1x, n1y], [n2x, n2y]].forEach(([x, y]) => { ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fillStyle = '#cbd5e1'; ctx.fill(); });
    ctx.restore();
    // 팀 이름 (끝선 밖)
    ctx.font = `800 11px ${fontStack('body')}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ['A', 'B'].forEach((side) => {
      const [sx, sy] = P(side === 'A' ? -0.03 : 1.03, 0.5);
      ctx.fillStyle = kits[side].hex; ctx.fillText(kits[side].short || side, sx, sy);
    });
  }

  drawPlayer(ctx, pl, r) {
    const [sx, sy] = this.toScreen(pl.x, pl.y);
    const kits = this.kits || { A: { hex: '#ef4444', short: '레드' }, B: { hex: '#3b82f6', short: '블루' } };
    const kit = kits[pl.side] || kits.A;
    const hot = this.highlight.has(pl.p.id);
    ctx.beginPath(); ctx.ellipse(sx, sy + r * 0.95, r * 0.95, r * 0.34, 0, 0, Math.PI * 2); ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fill();
    // 라켓 (치는 순간 휘둘러요)
    const [nx, ny] = this.toScreen(0.5, pl.y);
    const toward = Math.atan2(ny - sy, nx - sx);
    const ang = toward + 0.9 - pl.swing * 1.8;
    const rx = sx + Math.cos(ang) * r * 1.55; const ry = sy + Math.sin(ang) * r * 1.55;
    ctx.save();
    ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(sx + Math.cos(ang) * r * 0.9, sy + Math.sin(ang) * r * 0.9); ctx.lineTo(rx, ry); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(rx + Math.cos(ang) * r * 0.35, ry + Math.sin(ang) * r * 0.35, r * 0.42, r * 0.3, ang, 0, Math.PI * 2);
    ctx.fillStyle = pl.swing > 0.1 ? 'rgba(253,224,71,0.5)' : 'rgba(255,255,255,0.18)'; ctx.fill();
    ctx.lineWidth = 1.6; ctx.strokeStyle = pl.swing > 0.1 ? '#fde047' : '#f1f5f9'; ctx.stroke();
    ctx.restore();
    ctx.beginPath(); ctx.arc(sx, sy, r * 1.08, 0, Math.PI * 2); ctx.fillStyle = kit.hex; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = '#ffffff'; ctx.stroke();
    const inner = r * 0.74;
    ctx.beginPath(); ctx.arc(sx, sy, inner, 0, Math.PI * 2); ctx.fillStyle = '#e5e7eb'; ctx.fill();
    const img = pl.img;
    if (img && img.complete && img.naturalWidth) {
      ctx.save(); ctx.beginPath(); ctx.arc(sx, sy, inner, 0, Math.PI * 2); ctx.clip();
      const iw = img.naturalWidth; const ih = img.naturalHeight;
      const cw = iw * 0.5; const cx0 = (iw - cw) / 2; const cy0 = ih * 0.3;
      ctx.drawImage(img, cx0, cy0, cw, cw, sx - inner, sy - inner, inner * 2, inner * 2);
      ctx.restore();
    }
    if (hot) { ctx.lineWidth = 3; ctx.strokeStyle = '#fde047'; ctx.beginPath(); ctx.arc(sx, sy, r * 1.08 + 2, 0, Math.PI * 2); ctx.stroke(); }
    const name = String(pl.p.name || '').slice(0, 4);
    const fs = Math.round(clamp(r * 0.78, 9, 12));
    ctx.font = `800 ${fs}px ${fontStack('body')}`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    const tw = ctx.measureText(name).width + 8;
    const ty = sy + r * 1.08 + 2;
    ctx.fillStyle = hot ? '#fde047' : kit.hex;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(sx - tw / 2, ty, tw, fs + 4, 3); else ctx.rect(sx - tw / 2, ty, tw, fs + 4);
    ctx.fill();
    ctx.fillStyle = hot || kit.dark ? '#111827' : '#fff';
    ctx.fillText(name, sx, ty + 2);
  }

  drawShuttle(ctx, now) {
    const b = this.ball;
    const lift = this.pxPerM * 0.42; // 높이 1m가 화면에서 위로 몇 px
    // 궤적
    if (this.trail.length > 1) {
      ctx.save(); ctx.lineCap = 'round';
      for (let i = 1; i < this.trail.length; i++) {
        const a = this.trail[i - 1]; const c = this.trail[i];
        const al = 1 - (now - c.t) / 520;
        const [ax, ay] = this.toScreen(a.x, a.y); const [cx, cy] = this.toScreen(c.x, c.y);
        ctx.strokeStyle = `rgba(253,224,71,${0.6 * al})`;
        ctx.lineWidth = 2.5 * al + 0.5;
        ctx.beginPath(); ctx.moveTo(ax, ay - a.z * lift); ctx.lineTo(cx, cy - c.z * lift); ctx.stroke();
      }
      ctx.restore();
    }
    const [sx, sy] = this.toScreen(b.x, b.y);
    // 그림자 (바닥)
    ctx.beginPath(); ctx.ellipse(sx, sy, 4, 2, 0, 0, Math.PI * 2); ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fill();
    const y = sy - b.z * lift;
    // 셔틀: 코르크(둥근 머리) + 깃털(원뿔) — 날아가는 반대 방향으로 깃털
    let ang = -Math.PI / 2;
    const tr = this.trail;
    if (tr.length > 1) {
      const p = tr[tr.length - 2]; const q = tr[tr.length - 1];
      const [px, py] = this.toScreen(p.x, p.y); const [qx, qy] = this.toScreen(q.x, q.y);
      const dx = qx - px; const dy = (qy - q.z * lift) - (py - p.z * lift);
      if (Math.hypot(dx, dy) > 0.3) ang = Math.atan2(dy, dx);
    }
    const s = clamp(this.pxPerM * 0.16, 4, 7);
    ctx.save();
    ctx.translate(sx, y); ctx.rotate(ang);
    ctx.beginPath(); ctx.moveTo(-s * 0.2, -s * 0.55); ctx.lineTo(-s * 2.2, -s * 1.15); ctx.lineTo(-s * 2.2, s * 1.15); ctx.lineTo(-s * 0.2, s * 0.55); ctx.closePath();
    ctx.fillStyle = 'rgba(255,255,255,0.95)'; ctx.fill(); ctx.lineWidth = 0.8; ctx.strokeStyle = '#94a3b8'; ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, s * 0.62, 0, Math.PI * 2); ctx.fillStyle = '#f8fafc'; ctx.fill(); ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 1; ctx.stroke();
    ctx.restore();
  }

  /** 경기 전: 빈 코트 한 장 */
  idle(plA = [], plB = []) {
    this.stop();
    this.resize();
    this.flip = false;
    this.setRosters(plA, plB);
    this.ball = { x: 0.5, y: 0.5, z: 1.55, holder: null };
    this.flight = null; this.trail = []; this.fx = null; this.marks = []; this.zones = null; this.highlight = new Set();
    this.draw(performance.now());
    this.say('경기 시작을 누르면 선수들이 움직이며 중계해요', '대기', 'info');
  }
}

export const liveCourt = new LiveCourt();

if (typeof window !== 'undefined') {
  window.addEventListener('resize', () => { if (liveCourt.running) liveCourt.resize(); });
}

export function paintSimOrientButton() {
  const o = getSimOrientation();
  document.querySelectorAll('[data-orient]').forEach((b) => b.classList.toggle('is-on', b.getAttribute('data-orient') === o));
}
if (typeof window !== 'undefined') {
  window.repaintSimOrient = paintSimOrientButton;
  window.simSetOrient = (o) => {
    setSimOrientation(o);
    paintSimOrientButton();
    liveCourt.resize();
    if (!liveCourt.running) liveCourt.draw(performance.now());
  };
}
