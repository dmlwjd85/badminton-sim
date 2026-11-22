/**
 * 배드민턴 랠리 계산 (화면과 무관한 순수 계산 — 테스트할 수 있어요)
 *
 * 한 랠리 = 서브부터 셔틀이 바닥에 떨어질 때까지의 샷 목록.
 * 샷마다 '친 사람 능력 vs 받는 사람 능력'으로 실수·위닝샷·이어짐을 정해요.
 *
 * 위치는 { d: 네트에서 몇 m(0~6.7), y: 코트 폭 0~1 } 로 기억해요.
 * 복식 진형: 'fb'(앞뒤, 공격) / 'ss'(나란히, 수비). 셔틀을 아래로 치면 앞뒤, 위로 올리면 나란히.
 */

export const COURT_W = 6.1;
export const SINGLES_IN = 0.46 / COURT_W;

/** 샷 종류. up: 위로 올림(상대가 공격), down: 아래로 침(우리가 공격) */
export const SHOTS = {
  serveShort: { name: '짧은 서브', dir: 'flat', depth: [2.05, 2.5], arc: 0.35, speed: 7, stat: ['dis'], err: 0.045 },
  serveLong: { name: '높은 서브', dir: 'up', depth: [6.15, 6.55], arc: 5.5, speed: 11, stat: ['dis'], err: 0.03 },
  flick: { name: '플릭 서브', dir: 'up', depth: [5.35, 5.85], arc: 2.4, speed: 12, stat: ['dis'], err: 0.06 },
  clear: { name: '클리어', dir: 'up', depth: [5.7, 6.5], arc: 5, speed: 13, stat: ['pas'], err: 0.04 },
  lift: { name: '로브', dir: 'up', depth: [5.3, 6.4], arc: 4.3, speed: 11, stat: ['pas', 'def'], err: 0.03 },
  smash: { name: '스매시', dir: 'down', depth: [2.8, 5.2], arc: 0, speed: 26, decel: 2.2, fz: 2.9, tz: 0.4, stat: ['sho'], err: 0.08 },
  drop: { name: '드롭', dir: 'down', depth: [1.1, 2.4], arc: 0.7, speed: 8, fz: 2.6, stat: ['dri'], err: 0.06 },
  net: { name: '헤어핀', dir: 'down', depth: [0.3, 1.2], arc: 0.3, speed: 4, fz: 1.2, tz: 0.6, stat: ['dri', 'int'], err: 0.08 },
  kill: { name: '네트 킬', dir: 'down', depth: [1.4, 3.6], arc: 0, speed: 22, decel: 2, fz: 2.0, tz: 0.3, stat: ['int'], err: 0.05 },
  drive: { name: '드라이브', dir: 'flat', depth: [3.0, 5.2], arc: 0.15, speed: 18, fz: 1.5, tz: 1.2, stat: ['wrk'], err: 0.06 },
  push: { name: '푸시', dir: 'down', depth: [2.4, 3.8], arc: 0.1, speed: 13, fz: 1.6, tz: 0.9, stat: ['wrk', 'int'], err: 0.05 },
  block: { name: '블록', dir: 'down', depth: [0.5, 1.6], arc: 0.3, speed: 6, fz: 1.0, tz: 0.7, stat: ['def'], err: 0.06 },
};
const UP = new Set(['serveLong', 'flick', 'clear', 'lift']);
const FAST = new Set(['smash', 'kill']);
const SHORT = new Set(['drop', 'net', 'block', 'serveShort', 'push']);

/** 전술 노트 (아이들 눈높이) */
export const NOTES = {
  serve_short_d: '복식은 짧고 낮게 서브해요. 높게 띄우면 상대가 바로 스매시하거든요.',
  serve_long_s: '단식은 높고 길게 서브해서 상대를 맨 뒤로 보내요. 앞으로 치고 나오기 어려워요.',
  flick: '짧은 서브만 기다리는 상대에겐 가끔 플릭으로 머리 위를 넘겨요. 깜짝 작전!',
  attack_fb: '셔틀을 아래로 쳤으면 앞뒤로! 뒷사람은 스매시, 앞사람은 네트에서 기다려요.',
  defense_ss: '셔틀을 위로 올렸으면 나란히! 둘이 코트를 반씩 나눠 스매시를 받아요.',
  middle: '두 사람 사이 가운데로! 서로 "네가 쳐!" 하다가 놓치기 쉬워요.',
  kill: '약하게 넘어온 셔틀은 앞사람이 바로 꽂아요. 스매시 → 네트 킬이 복식 공격 공식!',
  block: '강한 스매시는 힘으로 맞받지 말고 네트 앞에 살짝 떨어뜨려요. 이게 블록이에요.',
  drive: '낮고 빠른 드라이브로 상대가 셔틀을 위로 올리게 만들어요. 그럼 우리 공격 차례!',
  clear_drop: '뒤로 길게(클리어) 보냈다가 앞에 살짝(드롭)! 상대가 코트를 끝에서 끝까지 뛰어야 해요.',
  corners: '네 구석을 돌아가며 노려요. 많이 뛴 상대는 지쳐서 실수해요.',
  home: '치고 나면 코트 가운데 "홈"으로 돌아와요. 그래야 어디로 와도 받을 수 있어요.',
  lift_short: '올릴 때는 맨 뒤까지 높게! 짧게 올리면 바로 스매시를 맞아요.',
  net_tight: '헤어핀은 네트에 붙을수록 좋아요. 상대는 아래에서 위로 올릴 수밖에 없어요.',
  patience: '무리하게 세게 치면 실수가 나와요. 기회가 올 때까지 랠리를 이어 가요.',
  smash_win: '높이 뜬 셔틀은 기회! 위에서 아래로 내리꽂는 스매시로 끝내요.',
  positioning: '위치 선정이 좋은 선수는 셔틀이 오기 전에 미리 가 있어요. 그래서 여유 있게 쳐요.',
  off_role: '자기 자리가 아니면 힘들어요. 전위 선수는 뒤에서, 후위 선수는 네트 앞에서 실수가 늘어요.',
  backhand_rear: '뒤쪽 백핸드는 가장 치기 어려운 곳이에요. 셔틀을 멀리 못 보내고, 스매시도 힘들어요.',
  backhand_target: '상대 백핸드 쪽을 노렸어요! 오른손잡이는 왼쪽 뒤, 왼손잡이는 오른쪽 뒤가 약해요.',
  lefty: '왼손잡이는 포핸드·백핸드가 반대예요. 상대가 어느 손으로 치는지 먼저 봐요!',
  forehand: '몸 쪽으로 돌아 들어가 포핸드로 치면 더 세고 정확해요. 빨리 움직이는 게 먼저!',
  mixed: '혼합복식은 보통 여자 선수가 앞(네트), 남자 선수가 뒤(스매시)를 맡아요. 서로 잘하는 자리!',
};

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rand = (rng, a, b) => a + rng() * (b - a);

function pickWeighted(entries, rng) {
  const list = entries.filter(([, w]) => w > 0);
  const sum = list.reduce((s, [, w]) => s + w, 0);
  let r = rng() * sum;
  for (const [k, w] of list) { r -= w; if (r <= 0) return k; }
  return list[list.length - 1][0];
}

/**
 * 포핸드/백핸드: 네트를 보고 섰을 때 라켓 쥔 손 쪽으로 오면 포핸드, 반대쪽이면 백핸드.
 * A팀은 y가 큰 쪽이 오른쪽, B팀은 y가 작은 쪽이 오른쪽. 왼손잡이는 반대.
 */
export function strokeSide(side, hand, fromY, toY) {
  const rightDir = side === 'A' ? 1 : -1;
  const handDir = hand === 'L' ? -rightDir : rightDir;
  const dy = toY - fromY;
  if (Math.abs(dy) < 0.04) return 'fh';
  return dy * handDir > 0 ? 'fh' : 'bh';
}
/** 그 선수의 백핸드 쪽 방향 (+1: y 큰 쪽) */
export function backhandDir(side, hand) {
  const rightDir = side === 'A' ? 1 : -1;
  return hand === 'L' ? rightDir : -rightDir;
}

/** 서브 위치: 서브하는 쪽 점수가 짝수면 오른쪽, 홀수면 왼쪽 */
export function serveCourtRight(score) { return score % 2 === 0; }

/** y가 그 팀 기준 오른쪽 코트인지 (A는 y가 큰 쪽, B는 작은 쪽이 오른쪽) */
export function rightY(side) { return side === 'A' ? 0.75 : 0.25; }
export function leftY(side) { return side === 'A' ? 0.25 : 0.75; }

/**
 * 점수·서브 상태
 * state: { score:{A,B}, serving:'A'|'B', right:{A:id,B:id}, players:{A:[..],B:[..]}, doubles }
 */
export function serveInfo(st) {
  const S = st.serving; const R = S === 'A' ? 'B' : 'A';
  const right = serveCourtRight(st.score[S]);
  if (!st.doubles) return { server: st.players[S][0], receiver: st.players[R][0], right, S, R };
  const sR = st.right[S]; const rR = st.right[R];
  const other = (side, id) => st.players[side].find((p) => p.id !== id) || st.players[side][0];
  const server = right ? st.players[S].find((p) => p.id === sR) : other(S, sR);
  const receiver = right ? st.players[R].find((p) => p.id === rR) : other(R, rR);
  return { server, receiver, right, S, R };
}

/** 랠리 결과로 점수·서브권·자리 바꾸기 (BWF 규칙) */
export function applyPoint(st, winner) {
  st.score[winner]++;
  if (st.doubles) {
    if (winner === st.serving) {
      // 서브한 팀이 이기면 같은 사람이 옆 코트로 옮겨 다시 서브
      const ids = st.players[winner].map((p) => p.id);
      st.right[winner] = ids.find((id) => id !== st.right[winner]) || st.right[winner];
    }
  }
  st.serving = winner;
}

/** 게임 끝났는지: target점 먼저, (target-1) 동점이면 2점 차, cap에서 끝 */
export function gameWinner(score, target, cap) {
  const { A, B } = score;
  if ((A >= target || B >= target) && Math.abs(A - B) >= 2) return A > B ? 'A' : 'B';
  if (A >= cap) return 'A';
  if (B >= cap) return 'B';
  return null;
}

function statOf(p, keys, eff) { return keys.reduce((s, k) => s + eff(p, k), 0) / keys.length; }

/**
 * 한 랠리 계산
 * opts: { st, eff(p,key), tactics:{A,B}, rng, pressure(0~1, 게임 막판) }
 * 반환: { shots:[...], winner:'A'|'B', reason:'winner'|'error', last }
 */
export function simulateRally(opts) {
  const { st, eff, tactics, rng = Math.random } = opts;
  const doubles = st.doubles;
  const { server, receiver, right, S, R } = serveInfo(st);
  const other = (side) => (side === 'A' ? 'B' : 'A');
  const pos = {};
  const form = { A: doubles ? 'ss' : 'single', B: doubles ? 'ss' : 'single' };
  // 서브 대형
  const sY = right ? rightY(S) : leftY(S);
  const rY = right ? rightY(R) : leftY(R);
  st.players[S].forEach((p) => { pos[p.id] = p.id === server.id ? { d: doubles ? 2.3 : 2.6, y: sY } : { d: 4.3, y: 0.5 }; });
  st.players[R].forEach((p) => { pos[p.id] = p.id === receiver.id ? { d: doubles ? 2.5 : 3.0, y: rY } : { d: 4.4, y: 1 - rY }; });
  if (doubles) { form[S] = 'fb'; }
  const shots = [];
  /** 진형 자리로 가기: 위치 선정(POS)이 낮으면 조금 엇나간 곳에 서요 */
  const place = (p, d, y) => {
    const miss = (1 - eff(p, 'pst') / 99) * 0.8; // m
    pos[p.id] = { d: clamp(d + (rng() * 2 - 1) * miss, 0.6, 6.4), y: clamp(y + ((rng() * 2 - 1) * miss) / COURT_W, 0.08, 0.92) };
  };
  const gender = (p) => (st.genders && st.genders[p.id]) || 'M';
  const snap = () => Object.fromEntries(Object.entries(pos).map(([k, v]) => [k, { ...v }]));

  let hitter = server; let side = S;
  let inc = null; // 직전 샷
  let prevByHitter = {};
  const usedNotes = new Set();

  for (let n = 0; n < 60; n++) {
    const tac = tactics[side] || {};
    const oppSide = other(side);
    const notes = [];
    // 1) 샷 고르기
    let type;
    const myD = pos[hitter.id].d;
    if (!inc) {
      const ser = tac.serve || 'mix';
      if (doubles) type = pickWeighted([['serveShort', ser === 'short' ? 0.92 : ser === 'mix' ? 0.75 : 0.45], ['flick', ser === 'short' ? 0.08 : ser === 'mix' ? 0.25 : 0.55]], rng);
      else type = pickWeighted([['serveShort', ser === 'short' ? 0.6 : ser === 'mix' ? 0.2 : 0.06], ['serveLong', ser === 'short' ? 0.4 : ser === 'mix' ? 0.8 : 0.94]], rng);
      if (type === 'serveShort' && doubles) notes.push('serve_short_d');
      if (type === 'serveLong') notes.push('serve_long_s');
      if (type === 'flick') notes.push('flick');
    } else {
      const sty = tac.style || 'balanced';
      const atk = sty === 'attack' ? 1.6 : sty === 'rally' ? 0.6 : 1;
      const safe = sty === 'rally' ? 1.6 : sty === 'attack' ? 0.7 : 1;
      const s = (k) => eff(hitter, k) / 70;
      const w = [];
      // 자기 자리가 아니면 그 자리 기술이 약해져요 (전위가 뒤에서 스매시, 후위가 앞에서 네트)
      const role = hitter.pos;
      const offBack = doubles && myD > 4.2 && role === 'Front';
      const offFront = doubles && myD < 2.4 && role === 'Rear';
      if ((offBack || offFront) && rng() < 0.35) notes.push('off_role');
      // 뒤쪽 백핸드: 스매시가 어렵고 안전하게 넘기기 바빠요
      const bhRear = inc.bh && myD > 4.2;
      if (bhRear && rng() < 0.45) notes.push('backhand_rear');
      if (UP.has(inc.type)) {
        // 높이 떠서 뒤로 온 셔틀: 공격 기회
        const late = inc.q; // 좋은 클리어일수록 스매시가 어려워요
        w.push(['smash', 3 * s('sho') * atk * (1 - late * 0.55) * (doubles ? 1.35 : 0.85) * (offBack ? 0.65 : 1) * (bhRear ? 0.35 : 1)]);
        w.push(['drop', 2 * s('dri') * (doubles ? 0.8 : 1.3)]);
        w.push(['clear', 1.5 * s('pas') * safe * (doubles ? 0.45 : 1.3) * (0.6 + late)]);
      } else if (FAST.has(inc.type)) {
        w.push(['block', 3 * s('def')]);
        w.push(['lift', 2 * safe]);
        w.push(['drive', 1.4 * s('wrk') * atk]);
      } else if (inc.type === 'drive' || inc.type === 'push') {
        w.push(['drive', 2.5 * s('wrk')]);
        w.push(['push', myD < 3 ? 1.6 * s('int') : 0.5]);
        w.push(['block', 1]);
        w.push(['lift', 0.9 * safe]);
        if (myD < 2.8 && inc.q < 0.4) w.push(['kill', 3 * s('int') * atk]);
      } else {
        // 짧은 셔틀 (드롭·헤어핀·블록·짧은 서브)
        const loose = inc.q < 0.35;
        w.push(['net', 2.5 * s('dri') * (offFront ? 0.75 : 1)]);
        w.push(['push', 1.4 * s('wrk')]);
        w.push([doubles ? 'lift' : 'clear', 2 * safe]);
        if (loose) w.push(['kill', 4.2 * s('int') * atk * (offFront ? 0.6 : 1)]);
        if (inc.type === 'serveShort' && doubles) w.push(['push', 1.2]);
      }
      type = pickWeighted(w, rng);
    }
    const S0 = SHOTS[type];
    // 2) 실수?
    const skill = statOf(hitter, S0.stat, eff);
    let errP = S0.err * clamp(1.6 - skill / 80, 0.45, 1.6) * (1 + (inc ? inc.q : 0) * 0.8);
    const sty = tac.style || 'balanced';
    if (sty === 'rally') errP *= 0.75;
    if (sty === 'attack' && (type === 'smash' || type === 'kill' || type === 'drive')) errP *= 1.2;
    if (opts.pressure) errP *= 1 + opts.pressure * (1.2 - eff(hitter, 'cmp') / 100);
    if (doubles && ((myD > 4.2 && hitter.pos === 'Front') || (myD < 2.4 && hitter.pos === 'Rear'))) errP *= 1.25;
    const stroke = inc ? (inc.bh ? 'bh' : 'fh') : 'fh';
    if (inc && inc.bh) errP *= myD > 4.2 ? 1.35 : 1.1;
    // 3) 어디로?
    const target = tac.target || 'middle';
    const recvTeam = st.players[oppSide];
    let ty;
    const pick = rng();
    if (!inc && type !== 'serveLong') ty = right ? rightY(oppSide) : leftY(oppSide); // 서브는 대각선
    else if (!inc) ty = right ? (oppSide === 'A' ? rand(rng, 0.55, 0.85) : rand(rng, 0.15, 0.45)) : (oppSide === 'A' ? rand(rng, 0.15, 0.45) : rand(rng, 0.55, 0.85));
    else if (pick < 0.62 && target === 'middle') ty = doubles ? rand(rng, 0.44, 0.56) : rand(rng, 0.4, 0.6);
    else if (pick < 0.62 && target === 'corners') ty = rng() < 0.5 ? rand(rng, 0.1, 0.2) : rand(rng, 0.8, 0.9);
    else if (pick < 0.62 && target === 'backhand') {
      // 받을 사람의 백핸드 쪽: 긴 샷이면 뒤에 있는 사람, 짧은 샷이면 앞사람
      const deepShot = S0.depth[0] > 4;
      const rp = recvTeam.length > 1 ? recvTeam.reduce((b, p) => ((deepShot ? pos[p.id].d > pos[b.id].d : pos[p.id].d < pos[b.id].d) ? p : b), recvTeam[0]) : recvTeam[0];
      ty = pos[rp.id].y + backhandDir(oppSide, rp.hand) * rand(rng, 0.2, 0.33);
      if (rp.hand === 'L' && rng() < 0.35) notes.push('lefty');
    } else if (pick < 0.62 && target === 'body') { const rp = recvTeam[Math.floor(rng() * recvTeam.length)]; ty = pos[rp.id].y + rand(rng, -0.05, 0.05); }
    else ty = rand(rng, 0.12, 0.88);
    if (!doubles) ty = clamp(ty, SINGLES_IN + 0.04, 1 - SINGLES_IN - 0.04);
    let td = rand(rng, S0.depth[0], S0.depth[1]);
    // 서브: 서비스 코트 안 (단식은 끝선, 복식은 긴 서비스 라인)
    if (type === 'serveShort') ty = clamp(ty, 0.08, 0.92);

    let q = clamp(0.3 + (skill - 60) / 100 + rng() * 0.35 - (inc ? inc.q : 0) * 0.2, 0.02, 1);
    if (inc && inc.bh && myD > 4.2) q = Math.max(0.02, q - 0.15); // 뒤쪽 백핸드는 짧게 날아가요
    // 짧게 올린 로브는 상대가 스매시하기 좋아요
    if ((type === 'lift' || type === 'clear') && q < 0.3) td = Math.min(td, 4.6 + q * 3);

    // 4) 실수면 랠리 끝
    if (rng() < errP) {
      const lowShot = !UP.has(type);
      const kind = lowShot && rng() < 0.65 ? 'net' : 'out';
      let ld = td; let ly = ty;
      if (kind === 'out') {
        if (UP.has(type) || rng() < 0.4) ld = rand(rng, 6.8, 7.3);
        else ly = ty < 0.5 ? rand(rng, -0.08, doubles ? -0.02 : SINGLES_IN - 0.03) : rand(rng, doubles ? 1.02 : 1 - SINGLES_IN + 0.03, 1.08);
      }
      if (sty === 'attack' && !usedNotes.has('patience') && (type === 'smash' || type === 'kill')) notes.push('patience');
      shots.push({ hitter, side, type, stroke, d: kind === 'net' ? 0.15 : ld, y: ly, q, err: kind, winner: false, notes, pos: snap(), form: { ...form } });
      return { shots, winner: oppSide, reason: 'error', last: hitter };
    }

    // 5) 받는 사람 & 진형
    // 친 팀 진형 바꾸기
    if (doubles) {
      const before = form[side];
      const mates = st.players[side];
      const partner = mates.find((p) => p.id !== hitter.id);
      if (S0.dir === 'up') {
        form[side] = 'ss';
        const ys = [0.27, 0.73];
        const sorted = [...mates].sort((a, b) => pos[a.id].y - pos[b.id].y);
        sorted.forEach((p, i) => place(p, 3.8, ys[i]));
        if (before !== 'ss' && inc) notes.push('defense_ss');
      } else if (inc) {
        form[side] = 'fb';
        const hitterFront = myD < 2.6;
        let frontP = hitterFront ? hitter : partner;
        let backP = hitterFront ? partner : hitter;
        // 혼합복식: 여자 선수 앞, 남자 선수 뒤
        if (st.mixed && partner) {
          const fem = mates.find((p) => gender(p) === 'F'); const mal = mates.find((p) => gender(p) !== 'F');
          if (fem && mal) { frontP = fem; backP = mal; if (before !== 'fb' && rng() < 0.2) notes.push('mixed'); }
        }
        if (frontP) place(frontP, 1.9, clamp(frontP === hitter ? pos[hitter.id].y : ty, 0.32, 0.68));
        if (backP) place(backP, backP === hitter ? 4.4 : 4.5, backP === hitter ? clamp(ty, 0.25, 0.75) : 0.5);
        if (before !== 'fb' && (type === 'smash' || type === 'drop')) notes.push('attack_fb');
      }
    } else if (inc) {
      // 단식: 치고 나면 홈으로
      place(hitter, 3.3, 0.5);
      if (rng() < 0.08) notes.push('home');
    }
    // 받는 팀에서 가장 가까운 사람
    const dist = (p) => Math.hypot(pos[p.id].d - td, (pos[p.id].y - ty) * COURT_W);
    let recv = recvTeam[0];
    if (recvTeam.length > 1) {
      // 앞뒤 진형: 짧은 셔틀은 앞사람, 긴 셔틀은 뒷사람
      recv = recvTeam.reduce((b, p) => (dist(p) < dist(b) ? p : b), recvTeam[0]);
    }
    const D = dist(recv);
    const recvStroke = strokeSide(oppSide, recv.hand, pos[recv.id].y, ty);
    // 6) 받을 수 있나?
    const base = { smash: 0.8, kill: 0.56, drop: 0.92, net: 0.92, clear: 0.99, lift: 0.99, drive: 0.92, push: 0.93, block: 0.95, serveShort: 0.98, serveLong: 0.995, flick: 0.92 }[type];
    const rs = FAST.has(type) ? (eff(recv, 'def') + eff(recv, 'ref')) / 2
      : SHORT.has(type) ? (eff(recv, 'pac') + eff(recv, 'dri')) / 2
        : type === 'drive' ? (eff(recv, 'ref') + eff(recv, 'wrk')) / 2 : eff(recv, 'pac');
    let reach = base - q * 0.15 - Math.max(0, D - 1.6) * 0.035 * (1.25 - eff(recv, 'pac') / 99) + (rs - 60) / 240 + (eff(recv, 'pst') - 60) / 600;
    if (D < 1.1 && eff(recv, 'pst') >= 70 && rng() < 0.2) notes.push('positioning');
    if (recvStroke === 'bh' && td > 4.2) reach -= 0.03;
    // 나란히 선 두 사람 가운데: 서로 미루다 놓침
    if (doubles && form[oppSide] === 'ss' && Math.abs(ty - 0.5) < 0.07 && inc) {
      reach -= 0.07;
      if (rng() < 0.5) notes.push('middle');
    }
    // 짧게 올린 로브 → 스매시는 더 강해요
    if (type === 'smash' && inc && (inc.type === 'lift' || inc.type === 'clear') && inc.q < 0.3) { reach -= 0.12; notes.push('lift_short'); }
    if (type === 'kill') notes.push('kill');
    if (type === 'block' && inc && FAST.has(inc.type)) notes.push('block');
    if (type === 'drive' && rng() < 0.4) notes.push('drive');
    if (type === 'net' && q > 0.7) notes.push('net_tight');
    if (!doubles && type === 'drop' && prevByHitter[hitter.id] === 'clear') notes.push('clear_drop');
    reach = clamp(reach, 0.12, 0.985);
    const won = rng() > reach;
    if (won) {
      if (type === 'smash') notes.push('smash_win');
      if (recvStroke === 'bh' && target === 'backhand') notes.push('backhand_target');
      if (!doubles && (ty < 0.22 || ty > 0.78)) notes.push('corners');
    }
    notes.forEach((k) => usedNotes.add(k));
    shots.push({ hitter, side, type, stroke, d: td, y: ty, q, err: null, winner: won, receiver: recv, D, recvStroke, notes, pos: snap(), form: { ...form } });
    prevByHitter[hitter.id] = type;
    if (won) return { shots, winner: side, reason: 'winner', last: hitter };
    // 7) 받는 사람이 셔틀 쪽으로
    pos[recv.id] = { d: td, y: ty };
    if (doubles) {
      const partner = recvTeam.find((p) => p.id !== recv.id);
      if (partner) {
        if (S0.dir === 'up') { place(partner, 1.9, 0.5); form[oppSide] = 'fb'; } else if (form[oppSide] !== 'fb') { place(partner, 3.8, ty < 0.5 ? 0.73 : 0.27); }
      }
    }
    inc = { type, q, d: td, y: ty, bh: recvStroke === 'bh' };
    hitter = recv; side = oppSide;
  }
  // 아주 긴 랠리: 마지막 친 쪽 득점으로 정리
  return { shots, winner: side === 'A' ? 'B' : 'A', reason: 'error', last: hitter };
}

/**
 * 결정적 순간 이름표 (풋살의 '킬패스', '슈퍼세이브' 같은 것)
 * kind: attack(공격) / defense(수비) / rally(랠리)
 */
export const HIGHLIGHTS = {
  smashBomb: { name: '스매시 폭격', en: 'SMASH BOMB', icon: '🔥', kind: 'attack', color: '#fb923c', desc: '스매시로 바로 끝낸 점수' },
  netKill: { name: '네트 킬', en: 'NET KILL', icon: '⚡', kind: 'attack', color: '#facc15', desc: '네트 앞에서 떠오른 셔틀을 내리꽂은 점수' },
  combo: { name: '찰떡 콤보', en: 'COMBO!', icon: '🤝', kind: 'attack', color: '#f472b6', desc: '뒷사람 스매시 → 앞사람 네트 킬로 끝낸 복식 공식' },
  barrage: { name: '연속 폭격', en: 'BARRAGE', icon: '💣', kind: 'attack', color: '#f97316', desc: '한 랠리에 스매시 3번 이상 몰아쳐서 이긴 점수' },
  trickDrop: { name: '속임수 드롭', en: 'TRICK DROP', icon: '🎭', kind: 'attack', color: '#a78bfa', desc: '세게 칠 것처럼 하다 살짝 떨어뜨려 상대를 속인 점수' },
  magicNet: { name: '마법 헤어핀', en: 'MAGIC NET', icon: '🪶', kind: 'attack', color: '#5eead4', desc: '네트에 딱 붙인 헤어핀으로 끝낸 점수' },
  laser: { name: '레이저 드라이브', en: 'LASER', icon: '🚀', kind: 'attack', color: '#38bdf8', desc: '낮고 빠른 드라이브·푸시로 끝낸 점수' },
  lineSnipe: { name: '라인 저격', en: 'ON THE LINE', icon: '🎯', kind: 'attack', color: '#4ade80', desc: '선에 아슬아슬하게 떨어진 점수' },
  ace: { name: '서브 에이스', en: 'SERVICE ACE', icon: '🎾', kind: 'attack', color: '#fde047', desc: '서브 한 번에 끝낸 점수' },
  flickAmbush: { name: '플릭 기습', en: 'FLICK!', icon: '✈️', kind: 'attack', color: '#93c5fd', desc: '짧은 서브인 척 머리 위로 넘겨 끝낸 점수' },
  backhandHunt: { name: '백핸드 사냥', en: 'BACKHAND HUNT', icon: '🏹', kind: 'attack', color: '#c084fc', desc: '상대 뒤쪽 백핸드를 노려 끝낸 점수' },
  superReceive: { name: '슈퍼 리시브', en: 'SUPER DEFENSE', icon: '🛡️', kind: 'defense', color: '#22d3ee', desc: '아주 강한 스매시·킬을 받아 낸 순간' },
  diveSave: { name: '몸을 날린 수비', en: 'DIVE SAVE', icon: '🦸', kind: 'defense', color: '#67e8f9', desc: '멀리 떨어진 셔틀까지 몸을 날려 받아 낸 순간' },
  ironWall: { name: '철벽 수비', en: 'IRON WALL', icon: '🧱', kind: 'defense', color: '#94a3b8', desc: '스매시를 3번 이상 버티고 끝내 점수를 낸 랠리' },
  counter: { name: '역습 성공', en: 'COUNTER!', icon: '🔄', kind: 'defense', color: '#34d399', desc: '스매시를 받아 내고 거꾸로 점수를 낸 랠리' },
  marathon: { name: '마라톤 랠리', en: 'MARATHON', icon: '🔁', kind: 'rally', color: '#fbbf24', desc: '15번 넘게 주고받은 긴 랠리' },
};

const SMASHY = new Set(['smash', 'kill']);

/** 랠리 하나에서 나온 결정적 순간들. at: 몇 번째 샷에서 나왔는지 (수비 장면은 랠리 중간에 보여 줘요) */
export function rallyHighlights(r, doubles) {
  const out = [];
  const shots = r.shots;
  const last = shots[shots.length - 1];
  const W = r.winner;
  // 랠리 중간: 수비 장면
  shots.forEach((sh, i) => {
    if (sh.err || sh.winner || !sh.receiver) return;
    const def = sh.side === 'A' ? 'B' : 'A';
    const next = shots[i + 1];
    const returned = next && !next.err;
    if (!returned) return;
    if (SMASHY.has(sh.type) && sh.q >= 0.6) out.push({ key: 'superReceive', side: def, player: sh.receiver, at: i });
    else if (sh.D >= (doubles ? 2.5 : 3.1) && sh.q >= 0.5 && !UP.has(sh.type)) out.push({ key: 'diveSave', side: def, player: sh.receiver, at: i });
  });
  if (r.reason === 'winner') {
    const t = last.type;
    const p = last.hitter;
    const prev = shots[shots.length - 2];
    const prev2 = shots[shots.length - 3];
    let key = null;
    if (t === 'serveShort' || (t === 'serveLong' && last.q >= 0.6)) key = 'ace';
    else if (t === 'flick') key = 'flickAmbush';
    else if (t === 'kill' && doubles && prev2 && prev2.side === W && prev2.type === 'smash' && prev2.hitter.id !== p.id) key = 'combo';
    else if (t === 'kill') key = 'netKill';
    else if (t === 'smash' && last.q >= 0.4) key = 'smashBomb';
    else if (t === 'drop' && last.q >= 0.45) key = 'trickDrop';
    else if ((t === 'net' || t === 'block') && last.q >= 0.55) key = 'magicNet';
    else if ((t === 'drive' || t === 'push') && last.q >= 0.5) key = 'laser';
    const sideLine = doubles ? Math.min(last.y, 1 - last.y) * COURT_W : Math.min(Math.abs(last.y - SINGLES_IN), Math.abs(1 - SINGLES_IN - last.y)) * COURT_W;
    const backLine = Math.abs(6.7 - last.d);
    if ((sideLine < 0.18 || backLine < 0.2) && (!key || key === 'laser' || key === 'trickDrop' || t === 'clear' || t === 'lift')) key = 'lineSnipe';
    if (last.recvStroke === 'bh' && last.d > 4.2 && (!key || key === 'lineSnipe')) key = 'backhandHunt';
    if (key) out.push({ key, side: W, player: p, at: shots.length - 1, final: true });
    const smashes = shots.filter((s) => s.side === W && SMASHY.has(s.type)).length;
    if (smashes >= 3 && key !== 'combo') out.push({ key: 'barrage', side: W, player: p, at: shots.length - 1, final: true });
    void prev;
  }
  // 수비하던 쪽이 이김
  const faced = shots.filter((s) => s.side !== W && SMASHY.has(s.type) && !s.err).length;
  if (faced >= 3) out.push({ key: 'ironWall', side: W, player: last.side === W ? last.hitter : (shots.filter((s) => s.side === W).pop() || last).hitter, at: shots.length - 1, final: true });
  else if (faced >= 1 && r.reason === 'winner' && !SMASHY.has(last.type) && shots.some((s, i) => s.side !== W && SMASHY.has(s.type) && i < shots.length - 1)) out.push({ key: 'counter', side: W, player: last.hitter, at: shots.length - 1, final: true });
  if (shots.length >= 15) out.push({ key: 'marathon', side: W, player: null, at: shots.length - 1, final: true });
  return out;
}
