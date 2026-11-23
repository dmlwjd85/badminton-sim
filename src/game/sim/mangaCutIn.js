/** 결정적 순간의 열혈 만화 한 컷. 점수·로그인·저장 값은 건드리지 않아요. */

const APPEAR_MS = 200;
const HOLD_MS = 2000;
const LEAVE_MS = 120;
/** 막 뜬 직후 클릭이 바로 닫히지 않게, 잠깐 기다려요 (컴퓨터 마우스). */
const ARM_MS = 280;

export const MANGA_SCENES = {
  'bd-smash-m': { src: 'manga/bd-smash-m.webp', sfx: '스매시!!', tone: 'fire' },
  'bd-smash-f': { src: 'manga/bd-smash-f.webp', sfx: '스매시!!', tone: 'fire' },
  'bd-combo-m': { src: 'manga/bd-combo-m.webp', sfx: '찰떡 콤보!', tone: 'gold' },
  'bd-combo-f': { src: 'manga/bd-combo-f.webp', sfx: '찰떡 콤보!', tone: 'gold' },
  'bd-barrage-m': { src: 'manga/bd-barrage-m.webp', sfx: '연타 폭격!', tone: 'fire' },
  'bd-barrage-f': { src: 'manga/bd-barrage-f.webp', sfx: '연타 폭격!', tone: 'fire' },
  'bd-counter-m': { src: 'manga/bd-counter-m.webp', sfx: '카운터!!', tone: 'ice' },
  'bd-counter-f': { src: 'manga/bd-counter-f.webp', sfx: '카운터!!', tone: 'ice' },
};

export const BD_PRELOAD_IDS = Object.keys(MANGA_SCENES);

export function mangaAssetUrl(rel) {
  let base = '/';
  try {
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.BASE_URL) {
      base = import.meta.env.BASE_URL;
    }
  } catch {
    /* node 테스트 */
  }
  if (!base.endsWith('/')) base += '/';
  return `${base}${String(rel).replace(/^\//, '')}`;
}

/** 윈도우 '애니메이션 효과' 끄기처럼 움직임 줄이기가 켜져 있는지. */
export function prefersReducedMotion(explicit) {
  if (explicit === true) return true;
  if (explicit === false) return false;
  if (typeof matchMedia === 'function') {
    try {
      return matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch {
      /* 무시 */
    }
  }
  return false;
}

/** 시험 속도(바로 결과)에서만 한 컷을 건너뛰어요. 움직임 줄이기에서는 움직임만 줄이고 그림은 보여요. */
export function shouldSkipMangaCutIn({ timeScale } = {}) {
  return timeScale === 0;
}

export function pickBdMangaScene(key, gender) {
  const map = { smashBomb: 'smash', combo: 'combo', barrage: 'barrage', counter: 'counter' };
  const scene = map[key];
  if (!scene) return null;
  const g = gender === 'F' ? 'f' : 'm';
  return `bd-${scene}-${g}`;
}

/** 한 모의경기에서 만화 한 컷은 이 횟수까지만 띄워요. */
export const MANGA_PER_MATCH_CAP = 4;
/** 스매시 위닝인데 이름표가 안 나왔을 때, 그림을 보강할 확률 */
export const BONUS_SMASH_P = 0.5;

/** 스매시로 점수를 냈는데 큰 장면 이름표가 없으면, 스매시 그림을 보강할지 */
export function shouldBonusSmashCutIn({ reason, lastType, alreadyManga, remaining } = {}) {
  return remaining > 0 && !alreadyManga && reason === 'winner' && lastType === 'smash';
}

let current = null;

export function preloadMangaCutIns(ids = BD_PRELOAD_IDS) {
  if (typeof document === 'undefined') return;
  for (const id of ids) {
    const scene = MANGA_SCENES[id];
    if (!scene) continue;
    const img = document.createElement('img');
    img.decoding = 'async';
    img.src = mangaAssetUrl(scene.src);
  }
}

function closeNow(reason) {
  const cur = current;
  current = null;
  if (!cur) return;
  if (cur.timer) clearTimeout(cur.timer);
  if (cur.armTimer) clearTimeout(cur.armTimer);
  cur.root.remove();
  cur.resolve({ shown: true, closed: reason });
}

export function closeMangaCutIn(reason = 'api') {
  closeNow(reason);
}

function buildOverlay(scene, url) {
  const root = document.createElement('div');
  root.className = 'manga-cutin';
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-label', scene.sfx);
  const card = document.createElement('div');
  card.className = 'manga-cutin-card';
  const img = document.createElement('img');
  img.className = 'manga-cutin-art';
  img.alt = scene.sfx;
  img.src = url;
  const sfx = document.createElement('div');
  sfx.className = `manga-cutin-sfx manga-cutin-sfx-${scene.tone}`;
  sfx.textContent = scene.sfx;
  const hint = document.createElement('button');
  hint.type = 'button';
  hint.className = 'manga-cutin-hint';
  hint.textContent = '화면을 누르면 닫혀요';
  card.append(img, sfx);
  root.append(card, hint);
  return root;
}

export function showMangaCutIn(sceneId, opts = {}) {
  if (shouldSkipMangaCutIn(opts)) return Promise.resolve({ shown: false, reason: 'skip' });
  const scene = MANGA_SCENES[sceneId];
  if (!scene) return Promise.resolve({ shown: false, reason: 'unknown' });
  if (typeof document === 'undefined') return Promise.resolve({ shown: false, reason: 'no-dom' });

  if (current) closeNow('replace');

  return new Promise((resolve) => {
    const root = buildOverlay(scene, mangaAssetUrl(scene.src));
    const reduced = prefersReducedMotion(opts.reducedMotion);
    if (reduced) root.classList.add('is-static');
    const entry = { root, resolve, timer: null, armTimer: null, armed: false };
    current = entry;
    const close = (reason) => {
      if (current !== entry) return;
      if (!entry.armed && reason === 'tap') return;
      if (entry.timer) clearTimeout(entry.timer);
      if (entry.armTimer) clearTimeout(entry.armTimer);
      entry.timer = null;
      entry.armTimer = null;
      root.classList.add('is-out');
      const finish = () => {
        if (current !== entry) return;
        current = null;
        root.remove();
        resolve({ shown: true, closed: reason });
      };
      setTimeout(finish, reduced ? 0 : LEAVE_MS);
    };
    const onPointer = () => close('tap');
    root.addEventListener('click', onPointer);
    root.addEventListener('keydown', (ev) => {
      if (ev.key === 'Escape' || ev.key === 'Enter' || ev.key === ' ') {
        ev.preventDefault();
        close('tap');
      }
    });
    document.body.appendChild(root);
    if (reduced) root.classList.add('is-in');
    else requestAnimationFrame(() => root.classList.add('is-in'));
    entry.armTimer = setTimeout(() => { entry.armed = true; }, ARM_MS);
    entry.timer = setTimeout(() => close('timeout'), HOLD_MS);
  });
}

export function resetMangaCutInForTests() {
  if (current && current.timer) clearTimeout(current.timer);
  if (current && current.armTimer) clearTimeout(current.armTimer);
  if (current && current.root && current.root.remove) current.root.remove();
  current = null;
}

if (typeof window !== 'undefined') {
  window.__sambongMangaCutIn = { showMangaCutIn, preloadMangaCutIns, closeMangaCutIn, MANGA_SCENES };
}
