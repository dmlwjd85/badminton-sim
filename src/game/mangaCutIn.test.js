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

test('큰 장면 몇 가지에만 한 컷을 붙이고, 나머지 이름표는 그대로 둔다', () => {
  assert.equal(pickBdMangaScene('smashBomb'), 'bd-smashBomb');
  assert.equal(pickBdMangaScene('combo'), 'bd-combo');
  assert.equal(pickBdMangaScene('barrage'), 'bd-barrage');
  assert.equal(pickBdMangaScene('counter'), 'bd-counter');
  assert.equal(pickBdMangaScene('ironWall'), null);
  assert.equal(pickBdMangaScene('marathon'), null);
  assert.equal(pickBdMangaScene('lineSnipe'), null);
  assert.equal(pickBdMangaScene('unknown'), null);
});

test('한 컷 그림 주소와 효과음 글자는 그림 파일이 아니라 코드에 있다', () => {
  for (const [id, scene] of Object.entries(MANGA_SCENES)) {
    assert.ok(scene.src.endsWith('.webp'), id);
    assert.ok(scene.sfx.length > 0, id);
    assert.match(mangaAssetUrl(scene.src), /\/manga\/bd-.*\.webp$/);
  }
  assert.equal(Object.keys(MANGA_SCENES).length, 4);
});
