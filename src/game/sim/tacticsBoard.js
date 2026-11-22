/**
 * 감독용 전술판 (배드민턴 코트): 선수·셔틀을 끌어 옮기고, 움직임·셔틀 길 화살표를 그리고,
 * 장면(1, 2, 3…)을 저장해 '재생'하면 장면 사이를 부드럽게 움직이며 작전을 설명해요.
 * 그리기는 라이브 코트(court.js)와 같은 그림을 써서 가로/세로 모두 됨.
 */
import { LiveCourt, getSimOrientation, setSimOrientation, depthX } from './court.js';
import { getSimLineup, simSlotName } from './roster.js';
import { getTactic, setTactic, TACTIC_OPTIONS } from './tactics.js';
import { simSlotTeam } from './roster.js';
import { fontStack } from '../utils.js';

const STORE = 'sbd_tac_board_v2';
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

/** 처음 배치: [네트에서 m, 폭 y] — 앞 두 개가 우리 팀(A), 뒤 두 개가 상대(B) */
export const FORMATIONS = {
  attack: { label: '복식: 앞뒤 (공격)', A: [[4.5, 0.55], [1.9, 0.5]], B: [[3.8, 0.27], [3.8, 0.73]], shuttle: [5.6, 0.5, 'B'] },
  defense: { label: '복식: 나란히 (수비)', A: [[3.8, 0.27], [3.8, 0.73]], B: [[4.5, 0.5], [1.9, 0.5]], shuttle: [5.6, 0.5, 'A'] },
  serve: { label: '복식: 서브·리시브', A: [[2.3, 0.72], [4.2, 0.5]], B: [[2.4, 0.28], [4.3, 0.5]], shuttle: [2.3, 0.72, 'A'] },
  singles: { label: '단식: 홈 포지션', A: [[3.3, 0.5]], B: [[3.3, 0.5]], shuttle: [6.2, 0.5, 'B'] },
};

class TacticsScene extends LiveCourt {
  constructor() {
    super({ canvasId: 'tacBoardCanvas', panelId: 'tacBoardPanel', extraH: 300 });
    this.arrows = [];
    this.temp = null;
    this.showNames = true;
  }

  draw(now) {
    super.draw(now);
    const ctx = this.canvas()?.getContext('2d');
    if (!ctx) return;
    const all = this.temp ? [...this.arrows, this.temp] : this.arrows;
    if (!this.rect) return;
    all.forEach((a) => this.drawArrow(ctx, a));
  }

  drawArrow(ctx, a) {
    const [x1, y1] = this.toScreen(a.x1, a.y1);
    const [x2, y2] = this.toScreen(a.x2, a.y2);
    const pass = a.type === 'pass';
    ctx.save();
    ctx.strokeStyle = pass ? '#fde047' : ((this.kits && this.kits[a.side] && this.kits[a.side].hex) || (a.side === 'B' ? '#93c5fd' : '#fca5a5'));
    ctx.fillStyle = ctx.strokeStyle;
    ctx.lineWidth = 3;
    ctx.setLineDash(pass ? [8, 6] : []);
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    ctx.setLineDash([]);
    const ang = Math.atan2(y2 - y1, x2 - x1); const h = 12;
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - h * Math.cos(ang - 0.45), y2 - h * Math.sin(ang - 0.45));
    ctx.lineTo(x2 - h * Math.cos(ang + 0.45), y2 - h * Math.sin(ang + 0.45));
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  drawPlayer(ctx, pl, r) {
    if (this.showNames) { super.drawPlayer(ctx, pl, r * 1.1); return; }
    // 번호만 (얼굴 없이 조끼 색 + 번호)
    const [sx, sy] = this.toScreen(pl.x, pl.y);
    ctx.beginPath(); ctx.arc(sx, sy, r * 1.1, 0, Math.PI * 2);
    ctx.fillStyle = (this.kits && this.kits[pl.side] && this.kits[pl.side].hex) || (pl.side === 'A' ? '#dc2626' : '#2563eb'); ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = '#fff'; ctx.stroke();
    ctx.font = `900 ${Math.round(r)}px ${fontStack('num')}`; ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(String(pl.num || ''), sx, sy + 1);
  }
}

const scene = new TacticsScene();
let state = { steps: [], current: -1 };
let mode = 'move';
let drag = null;
let playing = false;

function loadState() {
  try { const o = JSON.parse(localStorage.getItem(STORE) || 'null'); if (o && Array.isArray(o.steps)) state = o; } catch (e) { /* 무시 */ }
}
function saveState() {
  try { localStorage.setItem(STORE, JSON.stringify(state)); } catch (e) { /* 무시 */ }
}

/** 지금 화면 → 장면 데이터 */
function snapshot() {
  const pos = {};
  scene.players.forEach((pl, id) => { pos[id] = { x: pl.x, y: pl.y }; });
  return { pos, ball: { x: scene.ball.x, y: scene.ball.y }, arrows: scene.arrows.map((a) => ({ ...a })) };
}
function applyStep(st) {
  scene.players.forEach((pl, id) => { const p = st.pos[id]; if (p) { pl.x = pl.tx = p.x; pl.y = pl.ty = p.y; } });
  scene.ball.x = st.ball.x; scene.ball.y = st.ball.y; scene.ball.holder = null;
  scene.arrows = (st.arrows || []).map((a) => ({ ...a }));
  redraw();
}
function redraw() { if (!scene.rect) scene.resize(); if (scene.rect) scene.draw(performance.now()); }

/** 선수 말: 대진의 복식1 짝 (단식 배치면 단식 선수) */
let curFormation = 'attack';
function loadPieces(key = curFormation) {
  const a = getSimLineup('A'); const b = getSimLineup('B');
  const single = key === 'singles';
  scene.setRosters(single ? [a.single] : a.doubles1.filter(Boolean), single ? [b.single] : b.doubles1.filter(Boolean));
  let i = 0; scene.players.forEach((pl) => { pl.num = (i % 2) + 1; i++; });
}

/** 처음 배치 */
function placeFormation(key) {
  const f = FORMATIONS[key] || FORMATIONS.attack;
  if ((key === 'singles') !== (curFormation === 'singles')) { curFormation = key; loadPieces(key); }
  curFormation = key;
  ['A', 'B'].forEach((side) => {
    const list = [...scene.players.values()].filter((pl) => pl.side === side);
    list.forEach((pl, i) => {
      const [d, y] = f[side][i] || [3.3, 0.5];
      // B쪽은 마주 보니 좌우가 반대
      pl.x = pl.tx = depthX(side, d); pl.y = pl.ty = side === 'A' ? y : 1 - y;
    });
  });
  const [sd, sy, ss] = f.shuttle;
  scene.ball.x = depthX(ss, sd); scene.ball.y = ss === 'A' ? sy : 1 - sy; scene.ball.z = 0;
  scene.arrows = [];
  redraw();
}

function paintSteps() {
  const box = document.getElementById('tacSteps');
  if (!box) return;
  box.innerHTML = state.steps.map((_, i) => `<button type="button" class="tac-step ${i === state.current ? 'is-on' : ''}" onclick="window.tacGoStep(${i})">${i + 1}</button>`).join('')
    + `<button type="button" class="tac-step tac-step-add" onclick="window.tacAddStep()" aria-label="지금 모습을 장면으로 저장"><i class="fa-solid fa-plus"></i> 장면 저장</button>`;
  const del = document.getElementById('tacDelStep');
  if (del) del.disabled = state.current < 0;
  const play = document.getElementById('tacPlay');
  if (play) play.disabled = state.steps.length < 2;
}

function paintModes() {
  document.querySelectorAll('[data-tac-mode]').forEach((b) => b.classList.toggle('is-on', b.getAttribute('data-tac-mode') === mode));
  const hint = document.getElementById('tacHint');
  if (hint) hint.textContent = { move: '선수나 셔틀을 끌어서 옮겨요', run: '선수가 움직일 길을 그어요 (팀 색 화살표)', pass: '셔틀이 날아갈 길을 그어요 (노란 점선)' }[mode];
}

function paintOrient() {
  const o = getSimOrientation();
  document.querySelectorAll('[data-orient]').forEach((b) => b.classList.toggle('is-on', b.getAttribute('data-orient') === o));
}

function paintTactics() {
  const box = document.getElementById('tacTeamTactics');
  if (!box) return;
  const row = (slot) => {
    const key = simSlotTeam(slot);
    const t = getTactic(key);
    const sel = (k) => `<label class="flex items-center justify-between gap-2 text-xs text-slate-300"><span class="font-bold">${TACTIC_OPTIONS[k].label}</span><select class="min-h-[36px] bg-slate-900 border border-slate-600 rounded-lg px-2 text-white text-xs" onchange="window.tacSetTactic('${key}','${k}',this.value)">${Object.entries(TACTIC_OPTIONS[k].opts).map(([v, l]) => `<option value="${v}" ${t[k] === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>`;
    return `<div class="rounded-xl border ${slot === 'A' ? 'border-red-800/50 bg-red-950/20' : 'border-blue-800/50 bg-blue-950/20'} p-2.5 space-y-1.5"><p class="text-sm font-bold ${slot === 'A' ? 'text-red-300' : 'text-blue-300'}">${simSlotName(slot)}</p>${sel('style')}${sel('target')}${sel('serve')}</div>`;
  };
  box.innerHTML = row('A') + row('B');
}

/** 탭을 열 때 */
export function openTacticsBoard() {
  loadState();
  scene.stop();
  scene.resize();
  scene.setKits(simSlotTeam('A'), simSlotTeam('B'));
  loadPieces();
  if (state.current >= 0 && state.steps[state.current]) applyStep(state.steps[state.current]);
  else placeFormation(document.getElementById('tacFormation')?.value || 'attack');
  scene.stop();
  scene.resize();
  redraw();
  paintSteps(); paintModes(); paintOrient(); paintTactics();
}

/* ───── 화면 버튼 ───── */
window.tacSetMode = (m) => { mode = m; paintModes(); };
window.tacSetOrient = (o) => {
  setSimOrientation(o);
  paintOrient();
  scene.resize(); redraw();
  if (window.repaintSimOrient) window.repaintSimOrient();
};
window.tacFormation = (key) => { placeFormation(key); state.current = -1; paintSteps(); };
window.tacUndoArrow = () => { scene.arrows.pop(); redraw(); };
window.tacClearArrows = () => { scene.arrows = []; redraw(); };
window.tacToggleNames = () => { scene.showNames = !scene.showNames; redraw(); const b = document.getElementById('tacNames'); if (b) b.classList.toggle('is-on', !scene.showNames); };
window.tacAddStep = () => {
  state.steps.splice(state.current + 1, 0, snapshot());
  state.current += 1;
  scene.arrows = [];
  saveState(); paintSteps(); redraw();
};
window.tacGoStep = (i) => { if (!state.steps[i]) return; state.current = i; applyStep(state.steps[i]); paintSteps(); };
window.tacDelStep = () => {
  if (state.current < 0) return;
  state.steps.splice(state.current, 1);
  state.current = Math.min(state.current, state.steps.length - 1);
  if (state.current >= 0) applyStep(state.steps[state.current]);
  saveState(); paintSteps();
};
window.tacResetAll = async () => {
  if (state.steps.length && !await window.customConfirm('저장한 장면을 모두 지우고 처음 배치로 돌아갈까요?')) return;
  state = { steps: [], current: -1 };
  saveState(); loadPieces(); placeFormation(document.getElementById('tacFormation')?.value || 'attack'); paintSteps();
};
window.tacSetTactic = (key, k, v) => { setTactic(key, k, v); };

/** 장면 1 → 2 → 3… 부드럽게 재생 (선수는 이동, 공은 패스처럼) */
window.tacPlay = async () => {
  if (playing || state.steps.length < 2) return;
  playing = true;
  const btn = document.getElementById('tacPlay');
  if (btn) btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i>재생 중';
  applyStep(state.steps[0]);
  state.current = 0; paintSteps();
  await new Promise((r) => setTimeout(r, 600));
  for (let i = 1; i < state.steps.length; i++) {
    const a = state.steps[i - 1]; const b = state.steps[i];
    // 다음 장면의 화살표를 먼저 보여 주고 그 길로 움직임
    scene.arrows = (b.arrows || []).map((x) => ({ ...x }));
    const dur = 1400;
    const t0 = performance.now();
    await new Promise((resolve) => {
      const frame = (now) => {
        const t = clamp((now - t0) / dur, 0, 1); const e = ease(t);
        scene.players.forEach((pl, id) => {
          const p0 = a.pos[id]; const p1 = b.pos[id];
          if (p0 && p1) { pl.x = p0.x + (p1.x - p0.x) * e; pl.y = p0.y + (p1.y - p0.y) * e; }
        });
        scene.ball.x = a.ball.x + (b.ball.x - a.ball.x) * e;
        scene.ball.y = a.ball.y + (b.ball.y - a.ball.y) * e;
        scene.ball.z = Math.sin(Math.PI * t) * (Math.hypot(b.ball.x - a.ball.x, b.ball.y - a.ball.y) > 0.3 ? 4.5 : 1.2);
        redraw();
        if (t < 1) requestAnimationFrame(frame); else resolve();
      };
      requestAnimationFrame(frame);
    });
    scene.ball.z = 0;
    state.current = i; paintSteps();
    await new Promise((r) => setTimeout(r, 650));
  }
  playing = false;
  if (btn) btn.innerHTML = '<i class="fa-solid fa-play mr-1"></i>재생';
};

/** 예시 작전: 스매시 → 네트 킬 (복식 공격 공식) 4장면 */
window.tacDemo = () => {
  const sel = document.getElementById('tacFormation');
  if (sel) sel.value = 'attack';
  placeFormation('attack');
  const ids = { A: [], B: [] };
  scene.players.forEach((pl, id) => ids[pl.side].push(id));
  const P = (side, d, y) => ({ x: depthX(side, d), y: side === 'A' ? y : 1 - y });
  const step = (posList, ball, arrows) => {
    const pos = {};
    ['A', 'B'].forEach((side) => ids[side].forEach((id, i) => { pos[id] = posList[side][i]; }));
    return { pos, ball, arrows };
  };
  const a0 = [P('A', 3.8, 0.27), P('A', 3.8, 0.73)]; const b0 = [P('B', 2.3, 0.5), P('B', 4.2, 0.5)];
  const s1 = step({ A: a0, B: b0 }, P('B', 2.3, 0.5), []);
  // 1) 상대가 높이 올림(로브) → 우리는 앞뒤로
  const a1 = [P('A', 5.4, 0.6), P('A', 1.9, 0.5)]; const b1 = [P('B', 3.8, 0.27), P('B', 3.8, 0.73)];
  const s2 = step({ A: a1, B: b1 }, P('A', 5.6, 0.6), [{ type: 'pass', side: 'B', x1: s1.ball.x, y1: s1.ball.y, x2: P('A', 5.6, 0.6).x, y2: P('A', 5.6, 0.6).y }, { type: 'run', side: 'A', x1: a0[1].x, y1: a0[1].y, x2: a1[1].x, y2: a1[1].y }]);
  // 2) 뒷사람 스매시 (두 사람 사이 가운데로)
  const s3 = step({ A: a1, B: [P('B', 3.6, 0.3), P('B', 3.6, 0.7)] }, P('B', 3.4, 0.5), [{ type: 'pass', side: 'A', x1: s2.ball.x, y1: s2.ball.y, x2: P('B', 3.4, 0.5).x, y2: P('B', 3.4, 0.5).y }]);
  // 3) 약하게 넘어온 블록 → 앞사람 네트 킬
  const s4 = step({ A: [P('A', 4.4, 0.5), P('A', 1.4, 0.45)], B: [P('B', 3.6, 0.3), P('B', 3.6, 0.7)] }, P('B', 2.6, 0.2), [{ type: 'pass', side: 'B', x1: s3.ball.x, y1: s3.ball.y, x2: P('A', 1.5, 0.45).x, y2: P('A', 1.5, 0.45).y }, { type: 'pass', side: 'A', x1: P('A', 1.5, 0.45).x, y1: P('A', 1.5, 0.45).y, x2: P('B', 2.6, 0.2).x, y2: P('B', 2.6, 0.2).y }]);
  state = { steps: [s1, s2, s3, s4], current: 0 };
  saveState(); applyStep(s1); paintSteps();
  window.customAlert('예시 작전: ① 상대가 높이 올리면 ② 우리는 앞뒤로 서고 ③ 뒷사람이 두 사람 사이로 스매시 ④ 약하게 넘어온 셔틀을 앞사람이 네트 킬!\n\n재생을 눌러 보세요.');
};

/** 전체 화면 (발표용) */
window.tacFullscreen = () => {
  const panel = document.getElementById('tacBoardWrap');
  if (!panel) return;
  const on = !panel.classList.contains('tac-full');
  panel.classList.toggle('tac-full', on);
  document.body.classList.toggle('overflow-hidden', on);
  scene.fullscreen = on;
  scene.fullExtraH = 290;
  scene.resize(); redraw();
  const b = document.getElementById('tacFullBtn');
  if (b) b.innerHTML = on ? '<i class="fa-solid fa-compress mr-1"></i>작게' : '<i class="fa-solid fa-expand mr-1"></i>전체 화면';
};

/* ───── 끌기·그리기 ───── */
function localXY(e) {
  const c = scene.canvas(); const r = c.getBoundingClientRect();
  return { px: (e.clientX - r.left) * (scene.W / r.width), py: (e.clientY - r.top) * (scene.H / r.height) };
}
function hit(px, py) {
  const [bx, by] = scene.toScreen(scene.ball.x, scene.ball.y);
  if (Math.hypot(px - bx, py - by) < 18) return { ball: true };
  let best = null; let bd = 26;
  scene.players.forEach((pl, id) => {
    const [sx, sy] = scene.toScreen(pl.x, pl.y);
    const d = Math.hypot(px - sx, py - sy);
    if (d < bd) { bd = d; best = { id }; }
  });
  return best;
}

export function bindTacticsBoard() {
  const c = document.getElementById('tacBoardCanvas');
  if (!c || c.dataset.bound === '1') return;
  c.dataset.bound = '1';
  c.style.touchAction = 'none';
  c.addEventListener('pointerdown', (e) => {
    if (playing) return;
    const { px, py } = localXY(e);
    const f = scene.fromScreen(px, py);
    if (mode === 'move') {
      drag = hit(px, py);
    } else {
      const h = hit(px, py);
      const side = h && h.id ? scene.players.get(h.id)?.side : 'A';
      // 선수 위에서 시작하면 그 선수 자리에서 시작
      const from = h && h.id ? scene.players.get(h.id) : null;
      drag = { draw: true };
      scene.temp = { type: mode, side, x1: from ? from.x : f.x, y1: from ? from.y : f.y, x2: f.x, y2: f.y };
    }
    if (drag) { try { c.setPointerCapture(e.pointerId); } catch (err) { /* 무시 */ } }
  });
  c.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const { px, py } = localXY(e);
    const f = scene.fromScreen(px, py);
    if (drag.draw) { scene.temp.x2 = f.x; scene.temp.y2 = f.y; }
    else if (drag.ball) { scene.ball.x = clamp(f.x, -0.01, 1.01); scene.ball.y = clamp(f.y, -0.01, 1.01); }
    else if (drag.id) { const pl = scene.players.get(drag.id); if (pl) { pl.x = pl.tx = f.x; pl.y = pl.ty = f.y; } }
    redraw();
  });
  const up = () => {
    if (drag && drag.draw && scene.temp) {
      const t = scene.temp;
      if (Math.hypot((t.x2 - t.x1) * 13.4, (t.y2 - t.y1) * 6.1) > 0.5) scene.arrows.push({ ...t });
      scene.temp = null;
    }
    drag = null;
    redraw();
  };
  c.addEventListener('pointerup', up);
  c.addEventListener('pointercancel', up);
  window.addEventListener('resize', () => { if (!document.getElementById('tabTactics')?.classList.contains('hidden')) { scene.resize(); redraw(); } });
}
