/** 모의경기 명단과 팀 자동 편성 */
import { SIM_TEAM_KEYS, isSimTeamKey, simTeamInfo, GENDER_MAP } from '../constants.js';

/** 성별: 저장된 값 → 명단 기본값 → 모르면 남 */
export const genderOf = (p) => ((p && (p.gender || GENDER_MAP[p.name])) === 'F' ? 'F' : 'M');
import { buildTeams, pickLineup, bestMixedPair, TEAM_MODES } from '../teamBuilder.js';
import { paintSimOrientButton } from './court.js';
import { getOVRForPos, getBonusStats, getStat } from '../stats.js';
import { getOVR, getPosColor } from '../stats.js';
import { triggerConfetti } from '../ui.js';
import { escapeHtml } from '../utils.js';

window.changeTeamCount = (change) => {
window.targetTeamCount = Math.max(2, Math.min(6, window.targetTeamCount + change));
document.getElementById('targetTeamCount') && (document.getElementById('targetTeamCount').innerText = window.targetTeamCount);
window.renderSimTeamBoards();
};

/** 모의경기 대진: 경기장 왼쪽(A칸, 빨강 조끼) = home, 오른쪽(B칸, 파랑 조끼) = away */
window.simMatchup = window.simMatchup || { home: 'A', away: 'B' };

/** 경기 칸('A'=홈, 'B'=원정) → 실제 팀 키 */
export function simSlotTeam(slot) {
const m = window.simMatchup || {};
if (slot === 'A') return isSimTeamKey(m.home) ? m.home : 'A';
if (slot === 'B') return isSimTeamKey(m.away) ? m.away : 'B';
return slot;
}
export function simSlotName(slot) {
return simTeamInfo(simSlotTeam(slot)).name;
}

/** 모의경기: 그 칸에 해당하는 팀 소속 인원 수 */
export function countSimTeam(slot) {
const team = simSlotTeam(slot);
return (window.allPlayersData || []).filter((p) => p.simTeam === team).length;
}

/** 그 칸 팀의 전체 선수 (교체 포함) */
export function getSimSquad(slot) {
const team = simSlotTeam(slot);
return (window.allPlayersData || []).filter((p) => p.simTeam === team);
}

/** 자리(포지션)에서의 OVR — 원래 포지션이 아니어도 그 자리 능력으로 계산 */
export function fitOVR(p, slotPos) {
const b = getBonusStats(p).flat;
const st = {};
['pac', 'sho', 'pas', 'dri', 'def', 'phy', 'ref', 'int', 'pst', 'dis', 'cmp', 'wrk'].forEach((k) => { st[k] = getStat(p, k) + (b[k] || 0); });
return getOVRForPos(st, slotPos);
}

/** 경기용 복사본: pos는 이번 경기에서 맡은 자리, natPos는 원래 포지션 */
export function asRole(p, role) {
return { ...p, natPos: p.natPos || p.pos || '미정', pos: role };
}

/** 출전 명단: 복식1(후위+전위) · 단식 · 복식2 · 대기. 사람이 모자라면 자동 보조 선수 */
export function getSimLineup(slot) {
  let squad = getSimSquad(slot);
  if (squad.length < 2) squad = padSimRosterWithBots(squad, slot, 2).roster;
  const L = pickLineup(squad, fitOVR);
  const role = (p, r) => (p ? asRole(p, r) : p);
  const mx = bestMixedPair(squad, fitOVR, genderOf);
  return {
    mixed: mx ? [role(mx[0], 'Rear'), role(mx[1], 'Front')] : null,
    doubles1: [role(L.doubles1[0], 'Rear'), role(L.doubles1[1], 'Front')],
    single: role(L.single, 'Single'),
    doubles2: [role(L.doubles2[0], 'Rear'), role(L.doubles2[1], 'Front')],
    bench: L.bench,
  };
}

/** 모의경기 탭: 인원 수 + 팀 분류 보드(라커와 동일 UI) */
/** 대진 고르기: 선수가 있는 팀이 3팀 이상일 때만 보임 */
function renderSimMatchupPicker() {
const box = document.getElementById('simMatchupPicker');
if (!box) return;
const used = SIM_TEAM_KEYS.filter((k) => (window.allPlayersData || []).some((p) => p.simTeam === k));
const m = window.simMatchup;
if (!used.includes(m.home)) m.home = used[0] || 'A';
if (!used.includes(m.away) || m.away === m.home) m.away = used.find((k) => k !== m.home) || 'B';
if (used.length < 3) { box.classList.add('hidden'); box.innerHTML = ''; return; }
const opt = (sel) => used.map((k) => `<option value="${k}" ${k === sel ? 'selected' : ''}>${simTeamInfo(k).name}</option>`).join('');
box.classList.remove('hidden');
box.innerHTML = `<div class="flex items-center gap-2 flex-wrap text-sm">
<span class="text-xs font-bold text-amber-300 shrink-0">대진</span>
<select id="simPickHome" onchange="window.setSimMatchup('home', this.value)" class="flex-1 min-w-[7rem] min-h-[44px] bg-red-950/60 border border-red-700/60 rounded-lg px-2 text-white font-bold" aria-label="홈 팀">${opt(m.home)}</select>
<span class="text-slate-400 font-display">VS</span>
<select id="simPickAway" onchange="window.setSimMatchup('away', this.value)" class="flex-1 min-w-[7rem] min-h-[44px] bg-blue-950/60 border border-blue-700/60 rounded-lg px-2 text-white font-bold" aria-label="원정 팀">${opt(m.away)}</select>
</div>
<p class="text-[11px] text-slate-500 mt-1.5">경기장에서는 왼쪽 팀이 빨강, 오른쪽 팀이 파랑 조끼를 입어요.</p>`;
}

window.setSimMatchup = (side, key) => {
if (!isSimTeamKey(key)) return;
const m = window.simMatchup;
if (side === 'home') { if (key === m.away) m.away = m.home; m.home = key; }
else { if (key === m.home) m.home = m.away; m.away = key; }
window.renderSimMatchTab();
};

/** 경기 탭의 팀 이름 자리 채우기 */
function paintSimSlotNames() {
document.querySelectorAll('[data-sim-slot-name]').forEach((el) => { el.textContent = simSlotName(el.getAttribute('data-sim-slot-name')); });
document.querySelectorAll('[data-sim-slot-short]').forEach((el) => { const ti = simTeamInfo(simSlotTeam(el.getAttribute('data-sim-slot-short'))); el.textContent = ti.short; el.style.color = ti.hex; });
}


/** 종목에 맞는 출전 명단 */
function lineupHtml(slot) {
  if (!getSimSquad(slot).length) return '<p class="text-xs text-slate-500">분류표에서 이 팀에 선수를 넣어 주세요.</p>';
  const L = getSimLineup(slot);
  const ev = document.getElementById('simEvent')?.value || 'team';
  const chip = (t) => `<span class="text-[10px] font-black px-1.5 rounded bg-black/40 text-amber-200 shrink-0">${t}</span>`;
  const who = (p) => (p ? `<span class="text-white font-bold">${escapeHtml(p.name)}</span>${p.hand === 'L' ? '<span class="text-[10px] text-violet-300 ml-0.5" title="왼손잡이">왼손</span>' : ''}<span class="font-oswald text-fut-gold text-[11px] ml-1">${getOVR(p)}</span>` : '—');
  const pair = (d) => `${who(d[0])} <span class="text-[10px] text-slate-400">(후위)</span> · ${who(d[1])} <span class="text-[10px] text-slate-400">(전위)</span>`;
  const row = (label, html) => `<div class="flex items-center gap-2 text-[13px] min-h-[30px] min-w-0">${chip(label)}<span class="truncate min-w-0">${html}</span></div>`;
  let html = '';
  if (ev === 'singles') html = row('단식', who(L.single));
  else if (ev === 'mixed') html = L.mixed ? row('혼복', `${who(L.mixed[0])} <span class="text-[10px] text-sky-300">(남·후위)</span> · ${who(L.mixed[1])} <span class="text-[10px] text-pink-300">(여·전위)</span>`) : `${row('복식', pair(L.doubles1))}<p class="text-[11px] text-amber-300">남녀가 모두 있어야 혼합복식이에요. 지금은 일반 복식으로 뛰어요. (선수 카드에서 성별을 정해 주세요)</p>`;
  else if (ev === 'doubles') html = row('복식', pair(L.doubles1));
  else html = row('복식1', pair(L.doubles1)) + row('단식', who(L.single)) + row('복식2', pair(L.doubles2));
  if (L.bench.length) html += `<p class="text-[11px] text-slate-400 mt-1">응원: ${L.bench.map((p) => escapeHtml(p.name)).join(', ')}</p>`;
  return html;
}

window.renderSimMatchTab = () => {
renderSimMatchupPicker();
paintSimOrientButton();
paintSimSlotNames();
const na = countSimTeam('A');
const nb = countSimTeam('B');
const ca = document.getElementById('simCountA');
const cb = document.getElementById('simCountB');
const note = (n) => (n === 0 ? '선수 없음' : n < 2 ? `${n}명 · 짝이 없으면 자동 보조 선수가 같이 뛰어요` : `${n}명 · 단체전은 복식1 → 단식 → 복식2 (사람이 모자라면 겹쳐서 뛰어요)`);
if (ca) ca.textContent = note(na);
if (cb) cb.textContent = note(nb);
const la = document.getElementById('simLineupA');
const lb = document.getElementById('simLineupB');
if (la) la.innerHTML = lineupHtml('A');
if (lb) lb.innerHTML = lineupHtml('B');
window.renderSimTeamBoards();
const slog = document.getElementById('simMatchLog');
if (slog && slog.children.length === 0 && window.resetSimPitchCanvas) window.resetSimPitchCanvas();
const brief = document.getElementById('simPrematchBrief');
if (brief && getSimSquad('A').length && getSimSquad('B').length) {
const nameA = simSlotName('A');
const nameB = simSlotName('B');
const LA = getSimLineup('A'); const LB = getSimLineup('B');
const avg = (arr) => Math.round(arr.filter(Boolean).reduce((s, p) => s + getOVR(p), 0) / Math.max(1, arr.filter(Boolean).length));
const oa = avg([...LA.doubles1, LA.single]);
const ob = avg([...LB.doubles1, LB.single]);
const fav = oa === ob ? '팽팽한 전력' : (oa > ob ? `${nameA} OVR ${oa - ob} 우세` : `${nameB} OVR ${ob - oa} 우세`);
brief.innerHTML = `<div class="flex flex-wrap items-center justify-between gap-2 mb-2"><span class="text-[10px] font-black tracking-widest text-amber-300">PRE-MATCH · ${escapeHtml(nameA)} VS ${escapeHtml(nameB)}</span><span class="text-[11px] text-slate-300">${fav}</span></div>
<div class="grid grid-cols-3 gap-2 text-center mb-2">
<div><div class="text-red-300 font-black text-lg">${oa}</div><div class="text-[10px] text-slate-500">${escapeHtml(nameA)} 출전 평균</div></div>
<div class="text-[10px] text-slate-400 self-center">VS</div>
<div><div class="text-blue-300 font-black text-lg">${ob}</div><div class="text-[10px] text-slate-500">${escapeHtml(nameB)} 출전 평균</div></div>
</div>
<p class="text-[12px] text-slate-300">단식 맞대결: <b class="text-red-200">${escapeHtml(LA.single.name)}</b> vs <b class="text-blue-200">${escapeHtml(LB.single.name)}</b>. 스매시는 스매시/수비, 헤어핀은 드롭/풋워크, 드라이브는 드라이브/반응 속도로 겨뤄요. 실수를 줄이는 것도 실력이에요!</p>`;
}
};

/** 모의경기 포지션 약칭 (중계용) */
export function simPosShort(p) {
const m = { Single: '단식 전문', All: '올라운더', Front: '전위', Rear: '후위', 미정: '미정' };
return m[p.pos] || '미정';
}

export function simPickTwoDistinct(players) {
if (players.length < 2) return [players[0], players[0]];
const a = players[Math.floor(Math.random() * players.length)];
let b = players[Math.floor(Math.random() * players.length)];
let guard = 0;
while (b.id === a.id && guard++ < 12) b = players[Math.floor(Math.random() * players.length)];
return [a, b];
}

/** 실제 소속 선수만으로 5명 미만일 때 시뮬용 가상 팀원으로 채움 (서버·기록 없음) */
export function padSimRosterWithBots(realRoster, teamLetter, min = 2) {
const sorted = [...realRoster].sort((a, b) => getOVR(b) - getOVR(a));
const need = Math.max(0, min - sorted.length);
let bots = 0;
const posCycle = ['Rear', 'Front', 'All', 'Single'];
const avgOvr = sorted.length
? Math.round(sorted.reduce((s, p) => s + getOVR(p), 0) / sorted.length)
: 72;
for (let i = 0; i < need; i++) {
bots++;
const idx = sorted.length;
const v = Math.max(58, Math.min(82, avgOvr + Math.floor(Math.random() * 7) - 3));
const pos = posCycle[idx % posCycle.length];
const bot = {
id: `__sim_bot_${teamLetter}_${idx}`,
name: `자동 보조 ${bots}`,
pos,
age: 15,
level: 1,
pac: v, sho: v, pas: v, dri: v, def: v, phy: v, ref: v, int: v, pst: v, dis: v, cmp: v, wrk: v,
inventory: [],
itemLevels: {},
equipHead: null, equipHandL: null, equipHandR: null, equipFootL: null, equipFootR: null, equipFace: null
};
sorted.push(bot);
}
return { roster: sorted, bots };
}

/** 팀 나누는 방식 (기기에 기억) */
function loadTeamMode() {
try { const v = localStorage.getItem('sbd_team_mode'); if (TEAM_MODES[v]) return v; } catch (e) { /* 저장 막힘 */ }
return 'balanced';
}
window.teamBuildMode = window.teamBuildMode || loadTeamMode();

/** 방식 고르기 버튼 그리기 */
export function renderTeamModePicker() {
const box = document.getElementById('teamModePicker');
if (!box) return;
const cur = window.teamBuildMode;
box.innerHTML = Object.entries(TEAM_MODES).map(([k, m]) => `<button type="button" role="radio" aria-checked="${k === cur}" onclick="window.setTeamBuildMode('${k}')" class="min-h-[48px] px-1 rounded-xl border text-[13px] sm:text-sm font-bold leading-tight transition ${k === cur ? 'bg-blue-600 border-blue-300 text-white shadow-lg' : 'bg-slate-800 border-slate-600 text-slate-300 hover:bg-slate-700'}">${m.label}</button>`).join('');
const d = document.getElementById('teamModeDesc');
if (d) d.textContent = TEAM_MODES[cur].desc;
window.renderTeamKeepInfo();
}

/** 고정할 선수: 출석했고 분류표 팀에 들어 있는 선수 → 팀 번호 */
function fixedFromBoard(activePlayers) {
const m = new Map();
activePlayers.forEach((p) => { if (isSimTeamKey(p.simTeam)) m.set(p.id, SIM_TEAM_KEYS.indexOf(p.simTeam)); });
return m;
}

/** '그대로 두기' 칸: 감독에게만 보이고, 지금 고정될 인원을 알려 줌 */
window.renderTeamKeepInfo = () => {
const wrap = document.getElementById('teamKeepWrap');
if (!wrap) return;
const isGM = !!(window.playerState && window.playerState.isGM);
wrap.classList.toggle('hidden', !isGM);
const info = document.getElementById('teamKeepInfo');
const cb = document.getElementById('teamKeepFixed');
if (!info || !cb) return;
const active = Array.from(window.checkedInPlayers || []).map((id) => (window.allPlayersData || []).find((p) => p.id === id)).filter(Boolean);
const fixed = fixedFromBoard(active);
if (!cb.checked) { info.textContent = '먼저 분류표에서 몇 명을 팀에 넣고 이걸 켜면, 나머지 출석 선수만 나눠 채워요.'; return; }
if (!fixed.size) { info.innerHTML = '<span class="text-amber-300">아직 분류표에 넣어 둔 출석 선수가 없어요. 처음부터 전부 나눠요.</span>'; return; }
const per = SIM_TEAM_KEYS.map((k) => [k, active.filter((p) => p.simTeam === k).length]).filter(([, n]) => n).map(([k, n]) => `${simTeamInfo(k).short} ${n}`).join(' · ');
info.innerHTML = `<span class="text-emerald-300">고정 ${fixed.size}명 (${per})</span> · 나머지 ${active.length - fixed.size}명을 나눠 채워요.`;
};

window.setTeamBuildMode = (mode) => {
if (!TEAM_MODES[mode]) return;
window.teamBuildMode = mode;
try { localStorage.setItem('sbd_team_mode', mode); } catch (e) { /* 저장 막힘 */ }
renderTeamModePicker();
};

const POS_SHORT = { Single: '단식', All: '올라', Front: '전위', Rear: '후위', 미정: '?' };

/** 마지막으로 짠 편성 (적용 버튼용) */
let lastPlan = null;

window.generateBalancedTeams = () => {
const resultEl = document.getElementById('teamResult');
const activePlayers = Array.from(window.checkedInPlayers).map((id) => window.allPlayersData.find((p) => p.id === id)).filter(Boolean);
const want = Math.max(2, Math.min(6, Number(window.targetTeamCount) || 2));
if (activePlayers.length < want) { window.customAlert(`출석 체크한 선수가 ${want}명보다 적어요. 라커룸 카드의 체크를 눌러 출석을 먼저 표시해 주세요.`); return; }

const mode = TEAM_MODES[window.teamBuildMode] ? window.teamBuildMode : 'balanced';
const keep = !!document.getElementById('teamKeepFixed')?.checked && !!(window.playerState && window.playerState.isGM);
const fixed = keep ? fixedFromBoard(activePlayers) : new Map();
const { teams, metrics, fixedIds } = buildTeams(activePlayers, want, mode, { ovrOf: getOVR, fixed });
lastPlan = { ids: teams.map((t) => t.map((p) => p.id)), mode };

const isGM = !!(window.playerState && window.playerState.isGM);
const posBadge = (p) => `<span class="text-[10px] font-black ${getPosColor(p.pos)} border border-slate-700 rounded px-1 w-8 text-center shrink-0">${POS_SHORT[p.pos] || '?'}</span>`;
const cards = teams.map((team, idx) => {
const ti = simTeamInfo(SIM_TEAM_KEYS[idx]);
const sum = metrics.summaries[idx];
const c = sum.counts;
const rows = team.map((p) => `<div class="flex items-center gap-2 text-sm min-h-[36px] border-b border-slate-700/40 last:border-0">${posBadge(p)}<span class="text-white font-bold truncate flex-1 min-w-0">${escapeHtml(p.name)}</span>${fixedIds.has(p.id) ? '<span class="text-[10px] text-emerald-300 shrink-0" title="고정"><i class="fa-solid fa-thumbtack"></i> 고정</span>' : ''}<span class="font-oswald text-fut-gold shrink-0">${getOVR(p)}</span></div>`).join('');
return `<div class="bg-slate-900/80 p-3 rounded-xl border border-slate-700 border-t-4 ${ti.bar} min-w-0">
<div class="flex items-center justify-between gap-2 mb-1">
<h4 class="font-display ${ti.head} text-lg flex items-center gap-2"><span class="w-2.5 h-2.5 rounded-full ${ti.dot}"></span>${ti.name}</h4>
<span class="text-xs bg-slate-800 text-slate-200 px-2 py-1 rounded font-bold">평균 <b class="font-oswald text-fut-gold text-sm">${sum.avg.toFixed(1)}</b> · ${sum.size}명</span>
</div>
<p class="text-[11px] text-slate-400 mb-1.5">전위 ${c.Front} · 후위 ${c.Rear} · 올라 ${c.All} · 단식 ${c.Single}${c['미정'] ? ` · 미정 ${c['미정']}` : ''}</p>
<div>${rows}</div>
</div>`;
}).join('');
const gkNote = metrics.summaries.some((x) => x.counts.Rear === 0) ? '<span class="text-amber-300">후위가 없는 팀은 경기 때 가장 잘 맞는 선수가 뒤에서 공격해요.</span>' : '';
const head = `<div class="flex flex-wrap items-center gap-x-3 gap-y-1 mb-3 text-xs text-slate-300">
<span class="font-bold text-white">${TEAM_MODES[mode].label}</span>
${fixedIds.size ? `<span class="text-emerald-300"><i class="fa-solid fa-thumbtack"></i> 고정 ${fixedIds.size}명</span>` : ''}
<span>평균 OVR 차이 <b class="text-fut-gold">${metrics.ovrSpread.toFixed(1)}</b></span>
<span>포지션 ${metrics.posExcess === 0 ? '<b class="text-emerald-300">가장 고르게</b>' : `쏠림 <b class="text-amber-300">${metrics.posExcess}</b>`}</span>
${gkNote}
</div>`;
const actions = isGM
? `<div class="sticky bottom-[calc(env(safe-area-inset-bottom)+4.5rem)] lg:bottom-4 z-20 mt-3 grid grid-cols-2 gap-2 bg-slate-950/90 backdrop-blur p-2 rounded-xl border border-slate-700">
<button type="button" onclick="window.generateBalancedTeams()" class="min-h-[48px] rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-bold text-sm"><i class="fa-solid fa-rotate mr-1"></i>다시 짜기</button>
<button type="button" id="btnApplyTeamPlan" onclick="window.applyLastTeamPlan()" class="min-h-[48px] rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm"><i class="fa-solid fa-check mr-1"></i>분류표에 적용</button>
</div>`
: '<p class="mt-3 text-xs text-slate-400">미리보기예요. 분류표에 적용은 감독님만 할 수 있어요.</p>';
const html = `${head}<div class="grid grid-cols-1 sm:grid-cols-2 ${teams.length > 2 ? 'xl:grid-cols-3' : ''} gap-3">${cards}</div>${actions}`;
if (resultEl) {
resultEl.innerHTML = html;
resultEl.classList.remove('hidden');
resultEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
};

window.applyLastTeamPlan = async () => {
if (!lastPlan) return;
const btn = document.getElementById('btnApplyTeamPlan');
if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i>저장 중'; }
const ok = await window.applyTeamPlan(lastPlan.ids);
if (btn) {
btn.disabled = false;
btn.innerHTML = ok ? '<i class="fa-solid fa-check-double mr-1"></i>적용됨' : '<i class="fa-solid fa-check mr-1"></i>분류표에 적용';
}
if (ok) {
triggerConfetti();
document.getElementById('lockerSimTeamsPreview')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
};

/** PC처럼 넓은 화면에서는 경기 탭의 접는 칸(분류표·전술 보드)을 처음부터 펼쳐 둠 */
export function openSimFoldsOnWide() {
try {
if (window.matchMedia('(min-width: 1024px)').matches) document.querySelectorAll('details.sim-fold').forEach((d) => { d.open = true; });
} catch (e) { /* 무시 */ }
}
