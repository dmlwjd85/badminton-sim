import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MANGA_SCENES,
  mangaAssetUrl,
  pickBdMangaScene,
  shouldSkipMangaCutIn,
} from './sim/mangaCutIn.js';

test('시험 속도(ts=0)와 움직임 줄이기에서는 한 컷을 건너뛴다', () => {
  assert.equal(shouldSkipMangaCutIn({ timeScale: 0, reducedMotion: false }), true);
  assert.equal(shouldSkipMangaCutIn({ timeScale: 1, reducedMotion: true }), true);
  assert.equal(shouldSkipMangaCutIn({ timeScale: 1, reducedMotion: false }), false);
  assert.equal(shouldSkipMangaCutIn({ timeScale: 0.45, reducedMotion: false }), false);
});

test('큰 장면 몇 가지에만 한 컷을 붙이고, 성별로 그림을 고른다', () => {
  assert.equal(pickBdMangaScene('smashBomb', 'F'), 'bd-smash-f');
  assert.equal(pickBdMangaScene('smashBomb', 'M'), 'bd-smash-m');
  assert.equal(pickBdMangaScene('combo'), 'bd-combo-m');
  assert.equal(pickBdMangaScene('combo', 'F'), 'bd-combo-f');
  assert.equal(pickBdMangaScene('barrage', 'F'), 'bd-barrage-f');
  assert.equal(pickBdMangaScene('counter', 'M'), 'bd-counter-m');
  assert.equal(pickBdMangaScene('ironWall', 'F'), null);
  assert.equal(pickBdMangaScene('marathon', 'M'), null);
  assert.equal(pickBdMangaScene('lineSnipe'), null);
  assert.equal(pickBdMangaScene('unknown', 'F'), null);
});

test('한 컷 그림 주소와 효과음 글자는 그림 파일이 아니라 코드에 있다', () => {
  assert.equal(Object.keys(MANGA_SCENES).length, 8);
  for (const [id, scene] of Object.entries(MANGA_SCENES)) {
    assert.ok(scene.src.endsWith('.webp'), id);
    assert.equal(scene.src, `manga/${id}.webp`, id);
    assert.ok(scene.sfx.length > 0, id);
    assert.match(mangaAssetUrl(scene.src), /\/manga\/bd-.*\.webp$/);
  }
});
