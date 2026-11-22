/**
 * 배드민턴 모의경기 진행 (중계·점수판·경기 후 기록)
 *
 * 종목: 단체전(복식1 → 단식 → 복식2, 2승 먼저) / 복식 / 단식
 * 점수: 15점 랠리포인트(2027년부터 BWF 표준, 14-14부터 2점 차, 최대 21점) 또는 예전 21점(최대 30점)
 * 랠리 계산은 rally.js, 코트 애니메이션은 court.js
 */
import confetti from 'canvas-confetti';
import { liveCourt, depthX } from './court.js';
import { simulateRally, applyPoint, gameWinner, serveInfo, SHOTS, NOTES } from './rally.js';
import { getTactic, TACTIC_OPTIONS } from './tactics.js';
import { simSlotTeam, simSlotName, countSimTeam, getSimLineup } from './roster.js';
import { getStat } from '../stats.js';
import { escapeHtml, sleep } from '../utils.js';
import { josa } from './josa.js';

const FORMATS = {
  '1x15': { games: 1, target: 15, cap: 21, label: '15점 1게임' },
  '3x15': { games: 3, target: 15, cap: 21, label: '15점 3게임' },
  '1x21': { games: 1, target: 21, cap: 30, label: '21점 1게임 (예전 규칙)' },
};
const SPEED = { real: 1.45, normal: 1, fast: 0.45, test: 0 };
const UP = new Set(['serveLong', 'flick', 'clear', 'lift']);

export function resetSimPitchCanvas() {
  const a = getSimLineup('A'); const b = getSimLineup('B');
  liveCourt.setKits(simSlotTeam('A'), simSlotTeam('B'));
  liveCourt.idle(a.doubles1 || [], b.doubles1 || []);
  const n = document.getElementById('simNote');
  if (n) n.textContent = '셔틀이 올라가면 나란히, 내려가면 앞뒤로!';
}
window.resetSimPitchCanvas = resetSimPitchCanvas;

window.simClearLog = () => {
  const log = document.getElementById('simMatchLog');
  if (log) log.innerHTML = '';
  ['simScoreBar', 'simLiveHud', 'simPostMatchStats'].forEach((id) => document.getElementById(id)?.classList.add('hidden'));
  const post = document.getElementById('simPostMatchStats');
  if (post) post.innerHTML = '';
  resetSimPitchCanvas();
};

/** 경기 순서 */
function buildRubbers(event, A, B) {
  const D1 = { kind: 'D', label: '복식', a: A.doubles1, b: B.doubles1 };
  if (event === 'doubles') return [D1];
  if (event === 'singles') return [{ kind: 'S', label: '단식', a: [A.single], b: [B.single] }];
  return [
    { ...D1, label: '1경기 · 복식' },
    { kind: 'S', label: '2경기 · 단식', a: [A.single], b: [B.single] },
    { kind: 'D', label: '3경기 · 복식', a: A.doubles2, b: B.doubles2 },
  ];
}

window.runSimMatch = async () => {
  if (window.playerState.isGuest) return window.customAlert('둘러보기는 경기를 돌릴 수 없어요. 내 이름으로 들어와 주세요.');
  if (countSimTeam('A') < 1 || countSimTeam('B') < 1) {
    return window.customAlert(window.playerState.isGM ? '두 팀에 각각 한 명 이상 넣어 주세요.' : '아직 팀이 정해지지 않았어요. 감독님이 나눠 주면 경기를 볼 수 있어요.');
  }
  const event = document.getElementById('simEvent')?.value || 'team';
  const fmt = FORMATS[document.getElementById('simFormat')?.value] || FORMATS['1x15'];
  const speedKey = document.getElementById('simSpeed')?.value || 'normal';
  const ts = SPEED[speedKey] ?? 1;
  const LA = getSimLineup('A'); const LB = getSimLineup('B');
  const rubbers = buildRubbers(event, LA, LB);
  const nameA = simSlotName('A'); const nameB = simSlotName('B');
  const tactics = { A: getTactic(simSlotTeam('A')), B: getTactic(simSlotTeam('B')) };

  const btn = document.getElementById('btnSimStart');
  if (btn) { btn.disabled = true; btn.classList.add('opacity-50', 'cursor-not-allowed'); }
  const logEl = document.getElementById('simMatchLog');
  if (logEl) logEl.innerHTML = '';
  const post = document.getElementById('simPostMatchStats');
  if (post) { post.classList.add('hidden'); post.innerHTML = ''; }
  document.getElementById('simBoardDetails')?.removeAttribute('open');
  document.getElementById('simScoreBar')?.classList.remove('hidden');
  document.getElementById('simLiveHud')?.classList.remove('hidden');
  document.getElementById('simScoreAName').textContent = nameA;
  document.getElementById('simScoreBName').textContent = nameB;
  requestAnimationFrame(() => {
    const phone = window.innerWidth < 768;
    document.getElementById(phone ? 'simPitchPanel' : 'simScoreBar')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  window.__simLastLog = [];
  const court = liveCourt;
  court.timeScale = ts;
  court.setKits(simSlotTeam('A'), simSlotTeam('B'));
  court.flip = false;

  /* ───── 기록 ───── */
  const stamina = {};
  const pstat = {}; // id -> { p, side, win, err, smash, kill, rallies }
  const team = { A: { win: 0, err: 0, pts: 0, shots: {} }, B: { win: 0, err: 0, pts: 0, shots: {} } };
  const notesSeen = new Map(); // key -> 횟수
  let longest = 0;
  const ps = (p, side) => { if (!pstat[p.id]) pstat[p.id] = { p, side, win: 0, err: 0, smash: 0, kill: 0, def: 0, bot: String(p.id).startsWith('__sim_bot') }; return pstat[p.id]; };
  const eff = (p, k) => getStat(p, k) * (0.86 + 0.14 * ((stamina[p.id] ?? 100) / 100));
  const log = (html, cls = '') => {
    window.__simLastLog.push(html.replace(/<[^>]+>/g, ''));
    if (!logEl) return;
    const d = document.createElement('div');
    d.className = `sim-log-row ${cls}`;
    d.innerHTML = html;
    logEl.appendChild(d);
    logEl.scrollTo({ top: logEl.scrollHeight, behavior: 'smooth' });
  };
  const nm = (p) => escapeHtml(p.name);
  const tcol = (side) => (side === 'A' ? 'text-red-300' : 'text-sky-300');
  const tname = (side) => (side === 'A' ? nameA : nameB);
  const hud = () => {
    const s = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
    s('simHudWin', `${team.A.win}-${team.B.win}`);
    s('simHudErr', `${team.A.err}-${team.B.err}`);
    s('simHudRally', `${longest}타`);
  };
  hud();
  const rubberWins = { A: 0, B: 0 };
  const rubberResults = [];
  const setBoard = (sc, games, label) => {
    const n = document.getElementById('simScoreNums'); if (n) n.textContent = `${sc.A} - ${sc.B}`;
    const p = document.getElementById('simPitchScore'); if (p) p.textContent = `${sc.A} - ${sc.B}`;
    const sub = document.getElementById('simScoreSub');
    if (sub) sub.textContent = `${label} · 게임 ${games.A}-${games.B}${rubbers.length > 1 ? ` · 경기 ${rubberWins.A}-${rubberWins.B}` : ''}`;
  };
  const showNote = (key) => {
    if (!NOTES[key]) return false;
    court.note(NOTES[key]);
    const n = (notesSeen.get(key) || 0) + 1;
    notesSeen.set(key, n);
    return n === 1;
  };

  /** 셔틀 날아가는 모습 한 번 */
  const playShot = async (shot, st, isLast, reason) => {
    const S = SHOTS[shot.type];
    const H = court.players.get(shot.hitter.id);
    const opp = shot.side === 'A' ? 'B' : 'A';
    const lx = depthX(opp, shot.d);
    court.highlight = new Set([shot.hitter.id]);
    // 다른 선수들은 이번 샷 뒤 진형으로
    Object.entries(shot.pos).forEach(([id, v]) => {
      if (id === shot.hitter.id) return;
      const pl = court.players.get(id);
      if (pl) court.place(id, pl.side, v.d, v.y);
    });
    if (shot.receiver && !shot.err) {
      const R = court.players.get(shot.receiver.id);
      const k = shot.winner ? 0.6 : 1;
      if (R) court.moveTo(shot.receiver.id, R.x + (lx - R.x) * k, R.y + (shot.y - R.y) * k);
    }
    const caption = `${shot.hitter.name} ${S.name}${shot.err ? '' : shot.winner ? '!' : ''}`;
    court.say(caption, S.name, shot.type === 'smash' || shot.type === 'kill' ? 'hot' : UP.has(shot.type) ? 'info' : 'good');
    shot.notes.forEach((k) => showNote(k));
    const fz = S.fz ?? (shot.type === 'lift' ? 0.7 : shot.type === 'clear' ? 2.6 : shot.type.startsWith('serve') || shot.type === 'flick' ? 1.0 : 1.5);
    let tz = S.tz ?? (UP.has(shot.type) ? 2.5 : 0.9);
    if (shot.winner || shot.err === 'out') tz = 0;
    if (shot.err === 'net') {
      await court.fly({ fromId: H ? shot.hitter.id : null, x: 0.5 + (shot.side === 'A' ? -0.01 : 0.01), y: shot.y, z: 1.2, arc: 0.2, speed: S.speed * 0.8, fz, netFall: false });
      await court.fly({ x: depthX(shot.side, 0.3), y: shot.y, z: 0, arc: 0, speed: 3, fz: 1.2 });
      court.mark(depthX(shot.side, 0.3), shot.y, 'out');
    } else {
      await court.fly({ fromId: shot.hitter.id, x: shot.err === 'out' ? (opp === 'A' ? 0.5 - shot.d / 13.4 : 0.5 + shot.d / 13.4) : lx, y: shot.y, z: tz, arc: S.arc, speed: S.speed, decel: S.decel, fz });
      if (shot.err === 'out') court.mark(opp === 'A' ? 0.5 - shot.d / 13.4 : 0.5 + shot.d / 13.4, shot.y, 'out');
      else if (shot.winner) court.mark(lx, shot.y, 'win');
    }
    if (isLast) {
      if (reason === 'error') court.showFx(shot.err === 'net' ? 'NET' : 'OUT', '#f87171');
      else court.showFx(shot.type === 'smash' ? 'SMASH!' : shot.type === 'kill' ? 'KILL!' : 'POINT!', '#fde047');
    }
    await court.wait(90);
    void st;
  };

  const start = performance.now();
  try {
    log(`<b class="text-amber-300">━━ ${escapeHtml(nameA)} vs ${escapeHtml(nameB)} · ${event === 'team' ? '단체전 (복식·단식·복식, 2승 먼저)' : event === 'doubles' ? '복식' : '단식'} · ${fmt.label} ━━</b>`, 'sim-log-head');
    const tacLine = (side) => { const t = tactics[side]; return `${escapeHtml(tname(side))}: ${TACTIC_OPTIONS.style.opts[t.style]} · ${TACTIC_OPTIONS.target.opts[t.target]} · 서브 ${TACTIC_OPTIONS.serve.opts[t.serve]}`; };
    log(`🎯 팀 전술 — ${tacLine('A')} / ${tacLine('B')}`, 'text-slate-400');
    if (fmt.target === 15) log('📘 새 규칙: 2027년부터 한 게임은 15점! 14-14가 되면 2점을 앞서야 이기고, 20-20이면 다음 1점으로 끝나요.', 'sim-log-note');

    for (let ri = 0; ri < rubbers.length; ri++) {
      const rb = rubbers[ri];
      if (rubbers.length > 1 && (rubberWins.A >= 2 || rubberWins.B >= 2)) break;
      const doubles = rb.kind === 'D';
      const pa = rb.a.filter(Boolean); const pb = rb.b.filter(Boolean);
      [...pa, ...pb].forEach((p) => { if (stamina[p.id] == null) stamina[p.id] = 100; ps(p, pa.includes(p) ? 'A' : 'B'); });
      court.setRosters(pa, pb);
      const games = { A: 0, B: 0 };
      let firstServe = Math.random() < 0.5 ? 'A' : 'B';
      log(`<b class="text-amber-200">▶ ${rb.label}</b> — <span class="${tcol('A')}">${pa.map(nm).join(' · ')}</span> vs <span class="${tcol('B')}">${pb.map(nm).join(' · ')}</span>`, 'sim-log-head');
      for (let g = 0; g < fmt.games; g++) {
        if (games.A * 2 > fmt.games || games.B * 2 > fmt.games) break;
        const st = { score: { A: 0, B: 0 }, serving: firstServe, doubles, players: { A: pa, B: pb }, right: { A: pa[0].id, B: pb[0].id } };
        const gl = `${rb.label}${fmt.games > 1 ? ` ${g + 1}게임` : ''}`;
        court.flip = g === 1;
        let intervalDone = false;
        setBoard(st.score, games, gl);
        court.start();
        court.say(`${gl} 시작! ${tname(st.serving)} 서브부터`, '시작', 'info');
        court.note(doubles ? NOTES.serve_short_d : NOTES.serve_long_s);
        await court.wait(700);
        let gw = null;
        while (!(gw = gameWinner(st.score, fmt.target, fmt.cap))) {
          const { server, right, S } = serveInfo(st);
          // 서브 대형
          court.zones = { side: S, right, singles: !doubles };
          const near = Math.max(st.score.A, st.score.B) >= fmt.target - 2;
          const r = simulateRally({ st, eff, tactics, pressure: near ? 0.8 : 0 });
          const first = r.shots[0];
          Object.entries(first.pos).forEach(([id, v]) => { const pl = court.players.get(id); if (pl) court.place(id, pl.side, v.d, v.y, ts === 0); });
          court.ball = { x: depthX(S, first.pos[server.id].d), y: first.pos[server.id].y, z: 1.0, holder: null };
          court.say(`${server.name} 서브 (${right ? '오른쪽' : '왼쪽'} 서비스 코트 · ${tname(S)} ${st.score[S]}점 = ${right ? '짝수' : '홀수'})`, '서브', 'info');
          await court.wait(560);
          court.zones = null;
          for (let i = 0; i < r.shots.length; i++) {
            const sh = r.shots[i];
            await playShot(sh, st, i === r.shots.length - 1, r.reason);
            const pp = ps(sh.hitter, sh.side);
            if (sh.type === 'smash') pp.smash++;
            if (sh.type === 'kill') pp.kill++;
            team[sh.side].shots[sh.type] = (team[sh.side].shots[sh.type] || 0) + 1;
            if (!sh.err && !sh.winner && sh.receiver && (sh.type === 'smash' || sh.type === 'kill')) ps(sh.receiver, sh.side === 'A' ? 'B' : 'A').def++;
            stamina[sh.hitter.id] = Math.max(35, (stamina[sh.hitter.id] ?? 100) - (0.5 + (99 - getStat(sh.hitter, 'phy')) / 160));
          }
          const last = r.shots[r.shots.length - 1];
          longest = Math.max(longest, r.shots.length);
          if (r.reason === 'winner') { team[r.winner].win++; ps(last.hitter, last.side).win++; } else { team[last.side].err++; ps(last.hitter, last.side).err++; }
          applyPoint(st, r.winner);
          team[r.winner].pts++;
          setBoard(st.score, games, gl);
          hud();
          // 중계 한 줄: 샷 흐름
          const seq = r.shots.map((s) => `${escapeHtml(s.hitter.name)} ${SHOTS[s.type].name}`);
          const flow = seq.length > 6 ? [...seq.slice(0, 2), `… (${seq.length - 4}타) …`, ...seq.slice(-2)] : seq;
          const how = r.reason === 'winner' ? `<b class="text-emerald-300">위닝샷!</b>` : `<span class="text-amber-300">${last.err === 'net' ? '네트에 걸림' : '아웃'} (실수)</span>`;
          log(`<span class="sim-log-score">${st.score.A}-${st.score.B}</span> ${flow.join(' → ')} · ${how} <b class="${tcol(r.winner)}">${escapeHtml(tname(r.winner))} 득점</b>`);
          const fresh = [...new Set(r.shots.flatMap((s) => s.notes))].filter((k) => notesSeen.get(k) === 1 && !r.__logged);
          fresh.forEach((k) => log(`📘 ${NOTES[k]}`, 'sim-log-note'));
          r.__logged = true;
          court.say(josa(`${tname(r.winner)} 득점! ${st.score.A}-${st.score.B}`), '득점', 'good');
          await court.wait(r.shots.length > 8 ? 900 : 650);
          // 인터벌: 한 팀이 먼저 8점(21점 경기는 11점)
          const half = fmt.target === 15 ? 8 : 11;
          if (!intervalDone && (st.score.A === half || st.score.B === half) && !gameWinner(st.score, fmt.target, fmt.cap)) {
            intervalDone = true;
            const lead = st.score.A > st.score.B ? 'A' : 'B';
            const trail = lead === 'A' ? 'B' : 'A';
            const tip = team[trail].err > team[trail].win ? NOTES.patience : team[lead].shots.smash > 4 ? NOTES.lift_short : NOTES.middle;
            log(`⏸ 인터벌 (${half}점) — ${escapeHtml(tname(trail))} 코치: "${tip}"`, 'sim-log-note');
            court.say(`인터벌! ${tname(trail)} 코치의 작전 지시`, '인터벌', 'hot');
            court.note(tip);
            if (g === 2) { court.flip = !court.flip; log('↔ 마지막 게임 중간이라 코트를 바꿔요.', 'text-slate-400'); }
            await court.wait(1500);
          }
          if (ts === 0) await sleep(0);
        }
        games[gw]++;
        firstServe = gw;
        log(`<b class="${tcol(gw)}">🏁 ${escapeHtml(gl)} — ${escapeHtml(tname(gw))} 승리 ${st.score.A}-${st.score.B}</b>`, 'sim-log-head');
        court.say(`${gl} 끝! ${tname(gw)} 승리 ${st.score.A}-${st.score.B}`, '게임', 'hot');
        court.showFx('GAME', '#fde047');
        await court.wait(1300);
      }
      const rw = games.A > games.B ? 'A' : 'B';
      rubberWins[rw]++;
      rubberResults.push({ label: rb.label, a: pa, b: pb, games: { ...games }, winner: rw });
      if (rubbers.length > 1) log(`<b class="text-amber-300">단체전 ${rubberWins.A}-${rubberWins.B}</b>`, 'sim-log-head');
    }
    const winSide = rubbers.length > 1 ? (rubberWins.A > rubberWins.B ? 'A' : 'B') : rubberResults[0].winner;
    log(`<b class="text-fut-gold">🏆 최종 승리: ${escapeHtml(tname(winSide))}${rubbers.length > 1 ? ` (단체전 ${rubberWins.A}-${rubberWins.B})` : ''}</b>`, 'sim-log-head');
    log('(모의경기 · 서버 기록·경험치 미반영)', 'text-slate-500');
    court.say(`${tname(winSide)} 승리!`, '경기 끝', 'hot');
    try { if (ts > 0) confetti({ particleCount: 140, spread: 90, origin: { y: 0.4 }, zIndex: 9999, disableForReducedMotion: true }); } catch (e) { /* 무시 */ }
    renderPostMatch({ nameA, nameB, team, pstat, notesSeen, rubberResults, winSide, longest, secs: Math.round((performance.now() - start) / 1000) });
  } finally {
    setTimeout(() => court.stop(), 1500);
    if (btn) { btn.disabled = false; btn.classList.remove('opacity-50', 'cursor-not-allowed'); }
  }
};

/** 경기 후: 결과·선수 기록·오늘 배운 전술 */
function renderPostMatch({ nameA, nameB, team, pstat, notesSeen, rubberResults, winSide, longest }) {
  const el = document.getElementById('simPostMatchStats');
  if (!el) return;
  const tn = (s) => escapeHtml(s === 'A' ? nameA : nameB);
  const rows = Object.values(pstat).filter((x) => !x.bot).map((x) => {
    const rating = Math.max(4.5, Math.min(9.9, 6.3 + x.win * 0.35 + x.kill * 0.15 + x.def * 0.12 - x.err * 0.25));
    return { ...x, rating };
  }).sort((a, b) => b.rating - a.rating);
  const motm = rows[0];
  const res = rubberResults.map((r) => `<div class="flex items-center justify-between gap-2 text-[12px]"><span class="text-slate-300 font-bold">${escapeHtml(r.label)}</span><span class="truncate"><span class="text-red-300">${r.a.map((p) => escapeHtml(p.name)).join('·')}</span> <b class="text-fut-gold">${r.games.A}-${r.games.B}</b> <span class="text-sky-300">${r.b.map((p) => escapeHtml(p.name)).join('·')}</span></span></div>`).join('');
  const shotName = (k) => SHOTS[k] ? SHOTS[k].name : k;
  const top = (side) => Object.entries(team[side].shots).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, v]) => `${shotName(k)} ${v}`).join(' · ');
  const basic = new Set(['serve_short_d', 'serve_long_s']);
  const learned = [...notesSeen.entries()].sort((a, b) => (basic.has(a[0]) ? 1 : 0) - (basic.has(b[0]) ? 1 : 0) || b[1] - a[1]).map(([k, v]) => `<li><b class="text-sky-200">${basic.has(k) ? '기본' : `${v}번`}</b> ${escapeHtml(NOTES[k])}</li>`).join('');
  const table = `<div class="overflow-x-auto"><table class="w-full text-[11px] sm:text-xs text-left border-collapse"><thead><tr class="text-slate-400 border-b border-slate-700"><th class="py-1.5 pr-2">팀</th><th class="py-1.5 pr-2">선수</th><th class="py-1.5 text-center">평점</th><th class="py-1.5 text-center" title="위닝샷">🏸</th><th class="py-1.5 text-center" title="스매시">💥</th><th class="py-1.5 text-center" title="네트 킬">🕸️</th><th class="py-1.5 text-center" title="스매시 받아 내기">🛡️</th><th class="py-1.5 text-center" title="실수">❌</th></tr></thead><tbody>${rows.map((r) => `<tr class="border-b border-slate-800/80"><td class="py-1.5 pr-2 font-bold ${r.side === 'A' ? 'text-red-400' : 'text-blue-400'} truncate max-w-[5rem]">${tn(r.side)}</td><td class="py-1.5 pr-2 text-white font-bold truncate max-w-[7rem]">${escapeHtml(r.p.name)}</td><td class="py-1.5 text-center font-black ${r.rating >= 8 ? 'text-fut-gold' : r.rating >= 7 ? 'text-emerald-300' : 'text-slate-300'}">${r.rating.toFixed(1)}</td><td class="py-1.5 text-center text-fut-gold">${r.win || ''}</td><td class="py-1.5 text-center text-orange-300">${r.smash || ''}</td><td class="py-1.5 text-center text-emerald-300">${r.kill || ''}</td><td class="py-1.5 text-center text-cyan-300">${r.def || ''}</td><td class="py-1.5 text-center text-red-300">${r.err || ''}</td></tr>`).join('')}</tbody></table></div>`;
  el.innerHTML = `<div class="flex flex-wrap items-center gap-2 mb-2 border-b border-amber-700/30 pb-2"><i class="fa-solid fa-chart-simple text-amber-400"></i><span class="text-sm font-bold text-amber-200">경기 분석</span><span class="text-[10px] text-slate-500">(모의경기 · 서버 미반영)</span></div>
<p class="text-sm font-black text-fut-gold mb-2">🏆 ${tn(winSide)} 승리</p>
<div class="grid gap-1 mb-2">${res}</div>
${motm ? `<p class="text-[11px] text-fut-gold mb-2">MVP <b>${escapeHtml(motm.p.name)}</b> · 평점 ${motm.rating.toFixed(1)}</p>` : ''}
<div class="grid grid-cols-3 gap-2 text-center mb-2 text-[11px]">
<div class="rounded-lg bg-black/40 py-1.5"><div class="text-slate-500">위닝샷</div><div class="font-black text-emerald-300">${team.A.win}-${team.B.win}</div></div>
<div class="rounded-lg bg-black/40 py-1.5"><div class="text-slate-500">실수로 준 점수</div><div class="font-black text-amber-200">${team.A.err}-${team.B.err}</div></div>
<div class="rounded-lg bg-black/40 py-1.5"><div class="text-slate-500">최장 랠리</div><div class="font-black text-cyan-200">${longest}타</div></div>
</div>
<p class="text-[11px] text-slate-400 mb-2"><span class="text-red-300">${tn('A')}</span> 많이 친 샷: ${top('A') || '—'}<br><span class="text-sky-300">${tn('B')}</span> 많이 친 샷: ${top('B') || '—'}</p>
${learned ? `<div class="mb-2 rounded-lg bg-sky-950/40 border border-sky-800/50 p-2"><div class="text-[11px] font-bold text-sky-300 mb-1">📘 오늘 경기에서 나온 전술</div><ul class="text-[11px] text-slate-200 space-y-1 list-none">${learned}</ul><p class="text-[10px] text-slate-500 mt-1">실수로 준 점수가 많은 팀은 '랠리형', 스매시를 많이 맞은 팀은 '로브를 맨 뒤까지'를 연습해 봐요.</p></div>` : ''}
${table}`;
  el.classList.remove('hidden');
}
