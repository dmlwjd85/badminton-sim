/**
 * 팀 자동 편성 (화면·Firebase와 무관한 순수 계산이라 테스트할 수 있어요)
 *
 * 네 가지 방식
 *  - position : 포지션 우선. 팀마다 전위·후위·올라운더·단식 전문 수가 최대한 같게, 그 안에서 OVR을 맞춤
 *  - ability  : 능력치 우선. 팀 평균 OVR 차이를 가장 작게, 포지션은 동점일 때만 고려
 *  - balanced : 밸런스형. OVR 차이와 포지션 쏠림을 함께 줄임
 *  - random   : 완전 랜덤. 인원 수만 맞추고 무작위로 나눔
 *
 * fixed(고정)를 주면 그 선수들은 정한 팀에 그대로 두고 나머지만 나눠요.
 * 팀 인원은 항상 최대 1명 차이로 맞춰요.
 */

export const TEAM_MODES = {
  position: { label: '포지션 우선', short: '포지션', desc: '팀마다 전위·후위·올라운더·단식 전문 수를 먼저 똑같이 맞추고, 그다음 OVR을 맞춰요.' },
  ability: { label: '능력치 우선', short: '능력치', desc: '팀 평균 OVR 차이가 가장 작게 나눠요. 포지션은 덜 따져요.' },
  balanced: { label: '밸런스형', short: '밸런스', desc: 'OVR과 포지션을 함께 봐요. 복식 짝(전위+후위)을 만들 수 있게 나눠요.' },
  random: { label: '완전 랜덤', short: '랜덤', desc: '능력치·포지션을 보지 않고 무작위로 나눠요. 인원 수만 맞춰요.' },
};

export const POSITIONS = ['Front', 'Rear', 'All', 'Single', '미정'];

const normPos = (p) => (POSITIONS.includes(p && p.pos) ? p.pos : '미정');

/** 팀 상태 요약 */
export function teamSummary(team, ovrOf) {
  const counts = Object.fromEntries(POSITIONS.map((k) => [k, 0]));
  let total = 0;
  team.forEach((p) => { counts[normPos(p)]++; total += ovrOf(p); });
  return { size: team.length, counts, total, avg: team.length ? total / team.length : 0 };
}

/** 편성 품질 측정: OVR 평균 차이, 포지션 쏠림 */
export function measureTeams(teams, ovrOf) {
  const sums = teams.map((t) => teamSummary(t, ovrOf));
  const avgs = sums.map((s) => s.avg);
  const ovrSpread = Math.max(...avgs) - Math.min(...avgs);
  let posSpread = 0;
  POSITIONS.forEach((k) => {
    const c = sums.map((s) => s.counts[k]);
    posSpread += Math.max(...c) - Math.min(...c);
  });
  // 인원상 피할 수 없는 차이를 뺀 '쓸데없는 쏠림' (0이면 가장 고르게 나눈 것)
  let posExcess = 0;
  POSITIONS.forEach((k) => {
    const c = sums.map((s) => s.counts[k]);
    const total = c.reduce((a, b) => a + b, 0);
    posExcess += Math.max(0, (Math.max(...c) - Math.min(...c)) - (total % teams.length ? 1 : 0));
  });
  // 후위(공격)가 팀 수 이상인데도 후위 없는 팀 수 — 복식 짝을 만들기 어려워져요
  const totalRear = sums.reduce((s, x) => s + x.counts.Rear, 0);
  const missingGk = totalRear >= teams.length ? sums.filter((s) => s.counts.Rear === 0).length : 0;
  return { ovrSpread, posSpread, posExcess, missingGk, summaries: sums };
}

function costOf(m, mode) {
  if (mode === 'position') return m.missingGk * 1e6 + m.posSpread * 1e3 + m.ovrSpread;
  if (mode === 'ability') return m.ovrSpread * 1e3 + m.posSpread + m.missingGk * 5;
  // balanced: 포지션 1명 쏠림 ≈ 평균 OVR 1.5 차이로 봄
  return m.missingGk * 1e4 + m.ovrSpread + m.posSpread * 1.5;
}

/** 섞기 (rng 주입 가능) */
function shuffled(arr, rng) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** 시작 배치: 고정 선수를 먼저 넣고, 나머지는 (포지션별로 묶어) OVR 순으로 가장 인원이 적은 팀부터 채움 */
function initialDraft(free, fixedTeams, ovrOf, rng, byPos, random) {
  const teams = fixedTeams.map((t) => [...t]);
  const order = random
    ? shuffled(free, rng)
    : byPos
      ? POSITIONS.flatMap((k) => shuffled(free.filter((p) => normPos(p) === k), rng).sort((a, b) => ovrOf(b) - ovrOf(a)))
      : shuffled(free, rng).sort((a, b) => ovrOf(b) - ovrOf(a));
  // 스네이크처럼 번갈아 가며 넣되, 항상 인원이 가장 적은 팀 중에서 고름 (고정 인원이 달라도 ±1로 맞춰짐)
  let dir = rng() < 0.5 ? 1 : -1;
  order.forEach((p) => {
    const min = Math.min(...teams.map((t) => t.length));
    let cand = teams.map((t, i) => i).filter((i) => teams[i].length === min);
    if (random) cand = shuffled(cand, rng);
    else if (dir < 0) cand.reverse();
    teams[cand[0]].push(p);
    if (cand.length === 1) dir = -dir;
  });
  return teams;
}

/** 두 선수 맞바꾸기로 비용이 줄어드는 동안 계속 개선 (인원 수는 그대로 유지) */
function improve(teams, ovrOf, mode, locked) {
  let cur = costOf(measureTeams(teams, ovrOf), mode);
  let improved = true;
  let guard = 0;
  while (improved && guard++ < 200) {
    improved = false;
    for (let a = 0; a < teams.length; a++) {
      for (let b = a + 1; b < teams.length; b++) {
        for (let i = 0; i < teams[a].length; i++) {
          for (let j = 0; j < teams[b].length; j++) {
            const pa = teams[a][i];
            const pb = teams[b][j];
            if (locked.has(pa) || locked.has(pb)) continue;
            if (normPos(pa) === normPos(pb) && ovrOf(pa) === ovrOf(pb)) continue;
            teams[a][i] = pb; teams[b][j] = pa;
            const c = costOf(measureTeams(teams, ovrOf), mode);
            if (c < cur - 1e-9) { cur = c; improved = true; }
            else { teams[a][i] = pa; teams[b][j] = pb; }
          }
        }
      }
    }
  }
  return cur;
}

/**
 * @param {object[]} players 출석한 선수 (고정 선수 포함)
 * @param {number} teamCount 팀 수 (2~6)
 * @param {'position'|'ability'|'balanced'|'random'} mode
 * @param {{ ovrOf: (p) => number, rng?: () => number, tries?: number, fixed?: Map<string, number> }} opts
 *        fixed: 선수 id → 팀 번호(0부터). 그 팀에 그대로 둠
 * @returns {{ teams: object[][], metrics: ReturnType<typeof measureTeams>, fixedIds: Set<string> }}
 */
export function buildTeams(players, teamCount, mode, opts) {
  const ovrOf = opts.ovrOf;
  const rng = opts.rng || Math.random;
  const fixedMap = opts.fixed || new Map();
  const fixedPlayers = players.filter((p) => fixedMap.has(p.id));
  const maxFixedTeam = fixedPlayers.reduce((m, p) => Math.max(m, fixedMap.get(p.id)), -1);
  const n = Math.max(1, Math.max(maxFixedTeam + 1, Math.min(teamCount, players.length)));
  const fixedTeams = Array.from({ length: n }, () => []);
  fixedPlayers.forEach((p) => fixedTeams[fixedMap.get(p.id)].push(p));
  const free = players.filter((p) => !fixedMap.has(p.id));
  const locked = new Set(fixedPlayers);
  const random = mode === 'random';
  const tries = random ? 1 : (opts.tries || 24);
  let best = null;
  let bestCost = Infinity;
  const near = [];
  for (let t = 0; t < tries; t++) {
    const teams = initialDraft(free, fixedTeams, ovrOf, rng, mode !== 'ability' || t % 2 === 1, random);
    const c = random ? 0 : improve(teams, ovrOf, mode, locked);
    if (c < bestCost - 1e-9) { bestCost = c; best = teams.map((x) => [...x]); near.length = 0; near.push(best); }
    else if (Math.abs(c - bestCost) < 1e-9) near.push(teams.map((x) => [...x]));
  }
  // 똑같이 좋은 편성이 여러 개면 그중 하나를 골라 '다시 짜기' 때마다 조합이 바뀌게
  const chosen = near.length ? near[Math.floor(rng() * near.length)] : best;
  const posRank = (p) => POSITIONS.indexOf(normPos(p));
  chosen.forEach((t) => t.sort((a, b) => posRank(a) - posRank(b) || ovrOf(b) - ovrOf(a)));
  return { teams: chosen, metrics: measureTeams(chosen, ovrOf), fixedIds: new Set(fixedPlayers.map((p) => p.id)) };
}

/**
 * 배드민턴 출전 명단
 *  - 단식: 단식 자리 능력(Single)이 가장 높은 1명
 *  - 복식: 후위(Rear) 1 + 전위(Front) 1 짝. 둘의 합이 가장 큰 짝
 *  - 단체전: 복식1 → 단식 → 복식2 (가능하면 서로 다른 선수, 모자라면 겹쳐서 뛰어요)
 * @param {object[]} squad 팀 전체 선수
 * @param {(p, slotPos) => number} fitOf 그 자리에서의 OVR
 */
export function bestPair(pool, fitOf) {
  if (pool.length < 2) return pool.length ? [pool[0], pool[0]] : [];
  let best = null; let bs = -Infinity;
  for (let i = 0; i < pool.length; i++) {
    for (let j = 0; j < pool.length; j++) {
      if (i === j) continue;
      const s = fitOf(pool[i], 'Rear') + fitOf(pool[j], 'Front')
        + (normPos(pool[i]) === 'Rear' ? 3 : 0) + (normPos(pool[j]) === 'Front' ? 3 : 0);
      if (s > bs) { bs = s; best = [pool[i], pool[j]]; }
    }
  }
  return best; // [후위, 전위]
}

export function bestSingle(pool, fitOf) {
  let best = null; let bs = -Infinity;
  pool.forEach((p) => { const s = fitOf(p, 'Single') + (normPos(p) === 'Single' ? 3 : 0); if (s > bs) { bs = s; best = p; } });
  return best;
}

export function pickLineup(squad, fitOf) {
  const pool = [...squad];
  const d1 = bestPair(pool, fitOf);
  const rest1 = pool.filter((p) => !d1.includes(p));
  const single = bestSingle(rest1.length ? rest1 : pool, fitOf);
  const rest2 = rest1.filter((p) => p !== single);
  let d2 = rest2.length >= 2 ? bestPair(rest2, fitOf) : null;
  if (!d2) {
    // 사람이 모자라면 겹쳐서: 단식 선수 + 남은 사람, 그래도 없으면 복식1을 다시
    const extra = rest2[0] || single;
    const mate = rest2[0] ? single : d1[1];
    d2 = extra && mate && extra !== mate ? [extra, mate] : d1;
  }
  const used = new Set([...d1, single, ...d2].filter(Boolean).map((p) => p.id));
  return { doubles1: d1, single, doubles2: d2, bench: pool.filter((p) => !used.has(p.id)) };
}
