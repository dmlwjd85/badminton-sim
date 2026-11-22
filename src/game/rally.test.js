import { test } from 'node:test';
import assert from 'node:assert/strict';
import { simulateRally, applyPoint, gameWinner, serveInfo } from './sim/rally.js';

const mk = (id, v = 65) => ({ id, name: id, pac: v, sho: v, pas: v, dri: v, def: v, phy: v, ref: v, int: v, pst: v, dis: v, cmp: v, wrk: v });
const eff = (p, k) => p[k];
function seeded(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 2 ** 32; }; }

test('15점 규칙: 15점 먼저, 14-14면 2점 차, 20-20이면 21점에서 끝', () => {
  assert.equal(gameWinner({ A: 15, B: 10 }, 15, 21), 'A');
  assert.equal(gameWinner({ A: 15, B: 14 }, 15, 21), null);
  assert.equal(gameWinner({ A: 16, B: 14 }, 15, 21), 'A');
  assert.equal(gameWinner({ A: 20, B: 20 }, 15, 21), null);
  assert.equal(gameWinner({ A: 20, B: 21 }, 15, 21), 'B');
  assert.equal(gameWinner({ A: 21, B: 19 }, 21, 30), 'A');
  assert.equal(gameWinner({ A: 29, B: 30 }, 21, 30), 'B');
});

test('복식 서브: 짝수면 오른쪽, 서브 팀이 이기면 같은 사람이 코트를 바꿔 다시 서브', () => {
  const st = { score: { A: 0, B: 0 }, serving: 'A', doubles: true, players: { A: [mk('a1'), mk('a2')], B: [mk('b1'), mk('b2')] }, right: { A: 'a1', B: 'b1' } };
  let s = serveInfo(st);
  assert.equal(s.server.id, 'a1'); assert.equal(s.receiver.id, 'b1'); assert.equal(s.right, true);
  applyPoint(st, 'A'); // 1-0: a1이 왼쪽으로 옮겨 다시 서브
  s = serveInfo(st);
  assert.equal(s.server.id, 'a1'); assert.equal(s.right, false); assert.equal(s.receiver.id, 'b2');
  applyPoint(st, 'B'); // 1-1: B 서브, B 점수 1 → 왼쪽 코트 사람(b2)
  s = serveInfo(st);
  assert.equal(s.S, 'B'); assert.equal(s.server.id, 'b2'); assert.equal(s.right, false);
  applyPoint(st, 'B'); // 1-2: b2가 오른쪽으로 옮겨 다시 서브
  s = serveInfo(st);
  assert.equal(s.server.id, 'b2'); assert.equal(s.right, true);
});

test('랠리: 샷이 1개 이상, 마지막 샷이 위닝샷이거나 실수, 실수한 쪽 상대가 득점', () => {
  const rng = seeded(3);
  for (let i = 0; i < 300; i++) {
    const doubles = i % 2 === 0;
    const st = { score: { A: i % 7, B: i % 5 }, serving: i % 3 ? 'A' : 'B', doubles, players: { A: doubles ? [mk('a1'), mk('a2')] : [mk('a1')], B: doubles ? [mk('b1'), mk('b2')] : [mk('b1')] }, right: { A: 'a1', B: 'b1' } };
    const r = simulateRally({ st, eff, tactics: { A: {}, B: {} }, rng });
    assert.ok(r.shots.length >= 1);
    const last = r.shots[r.shots.length - 1];
    if (r.reason === 'error') { assert.ok(last.err); assert.notEqual(r.winner, last.side); } else { assert.ok(last.winner); assert.equal(r.winner, last.side); }
    // 번갈아 쳐요
    for (let k = 1; k < r.shots.length; k++) assert.notEqual(r.shots[k].side, r.shots[k - 1].side);
  }
});

test('능력치가 높은 팀이 대부분 이긴다', () => {
  const rng = seeded(11);
  let wins = 0;
  for (let g = 0; g < 40; g++) {
    const st = { score: { A: 0, B: 0 }, serving: 'A', doubles: true, players: { A: [mk('a1', 78), mk('a2', 78)], B: [mk('b1', 58), mk('b2', 58)] }, right: { A: 'a1', B: 'b1' } };
    let w;
    while (!(w = gameWinner(st.score, 15, 21))) applyPoint(st, simulateRally({ st, eff, tactics: { A: {}, B: {} }, rng }).winner);
    if (w === 'A') wins++;
  }
  assert.ok(wins >= 34, `wins ${wins}`);
});

test('포핸드/백핸드: 오른손잡이 A팀은 y 큰 쪽(오른쪽)이 포핸드, 왼손잡이는 반대, B팀은 거울', async () => {
  const { strokeSide } = await import('./sim/rally.js');
  assert.equal(strokeSide('A', 'R', 0.5, 0.8), 'fh');
  assert.equal(strokeSide('A', 'R', 0.5, 0.2), 'bh');
  assert.equal(strokeSide('A', 'L', 0.5, 0.2), 'fh');
  assert.equal(strokeSide('B', 'R', 0.5, 0.2), 'fh');
  assert.equal(strokeSide('B', 'L', 0.5, 0.2), 'bh');
  assert.equal(strokeSide('A', 'R', 0.5, 0.52), 'fh');
});

test('결정적 순간: 스매시 위닝은 스매시 폭격, 긴 랠리는 마라톤', async () => {
  const { rallyHighlights } = await import('./sim/rally.js');
  const a = mk('a1'); const b = mk('b1');
  const sh = (side, type, extra = {}) => ({ hitter: side === 'A' ? a : b, side, type, q: 0.6, d: 3.5, y: 0.5, err: null, winner: false, receiver: side === 'A' ? b : a, D: 1, notes: [], ...extra });
  const r1 = { shots: [sh('A', 'serveShort'), sh('B', 'lift'), sh('A', 'smash', { winner: true })], winner: 'A', reason: 'winner' };
  assert.ok(rallyHighlights(r1, false).some((h) => h.key === 'smashBomb'));
  const long = Array.from({ length: 16 }, (_, i) => sh(i % 2 ? 'B' : 'A', 'clear'));
  long[15] = sh('B', 'drop', { winner: true, q: 0.2 });
  assert.ok(rallyHighlights({ shots: long, winner: 'B', reason: 'winner' }, false).some((h) => h.key === 'marathon'));
});
