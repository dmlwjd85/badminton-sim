import { test } from 'node:test';
import assert from 'node:assert/strict';
import { positionOVRs, recommendedPosition } from './stats.js';

const base = (o) => ({ pos: '미정', pac: 60, sho: 60, pas: 60, dri: 60, def: 60, phy: 60, ref: 60, int: 60, pst: 60, dis: 60, cmp: 60, wrk: 60, ...o });

test('포지션 4개 OVR을 모두 계산한다', () => {
  const list = positionOVRs(base({}));
  assert.deepEqual(list.map((x) => x.pos), ['Front', 'Rear', 'All', 'Single']);
  list.forEach((x) => assert.equal(x.ovr, 60));
});

test('스매시·클리어·체력이 높으면 후위를 추천', () => {
  assert.equal(recommendedPosition(base({ sho: 85, pas: 82, phy: 80, pac: 75 })).pos, 'Rear');
});

test('네트·반응·드라이브가 높으면 전위를 추천', () => {
  assert.equal(recommendedPosition(base({ int: 85, ref: 84, wrk: 78, pst: 75 })).pos, 'Front');
});

test('풋워크·드롭·체력이 높으면 단식 전문을 추천', () => {
  assert.equal(recommendedPosition(base({ pac: 88, dri: 85, phy: 80, pas: 78 })).pos, 'Single');
});
