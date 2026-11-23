/** 결정적 순간의 열혈 만화 한 컷. 점수·로그인·저장 값은 건드리지 않아요. */

const APPEAR_MS = 200;
const HOLD_MS = 2000;
const LEAVE_MS = 120;

export const MANGA_SCENES = {
  'bd-smashBomb': { src: 'manga/bd-smashbomb.webp', sfx: '스매시!!', tone: 'fire' },
  'bd-combo': { src: 'manga/bd-combo.webp', sfx: '찰떡 콤보!', tone: 'gold' },
  'bd-barrage': { src: 'manga/bd-barrage.webp', sfx: '연타 폭격!', tone: 'fire' },
  'bd-counter': { src: 'manga/bd-counter.webp', sfx: '카운터!!', tone: 'ice' },
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

export function shouldSkipMangaCutIn({ timeScale, reducedMotion } = {}) {
  if (timeScale === 0) return true;
  if (reducedMotion === true) return true;
  if (reducedMotion == null && typeof matchMedia === 'function') {
    try {
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) return true;
    } catch {
      /* 무시 */
    }
  }
  return false;
}

export function pickBdMangaScene(key) {
  const map = { smashBomb: 'bd-smashBomb', combo: 'bd-combo', barrage: 'bd-barrage', counter: 'bd-counter' };
  return map[key] || null;
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
    const entry = { root, resolve, timer: null };
    current = entry;
    const close = (reason) => {
      if (current !== entry) return;
      if (entry.timer) clearTimeout(entry.timer);
      entry.timer = null;
      root.classList.add('is-out');
      const finish = () => {
        if (current !== entry) return;
        current = null;
        root.remove();
        resolve({ shown: true, closed: reason });
      };
      setTimeout(finish, LEAVE_MS);
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
    requestAnimationFrame(() => root.classList.add('is-in'));
    entry.timer = setTimeout(() => close('timeout'), HOLD_MS);
  });
}

export function resetMangaCutInForTests() {
  if (current && current.timer) clearTimeout(current.timer);
  if (current && current.root && current.root.remove) current.root.remove();
  current = null;
}

if (typeof window !== 'undefined') {
  window.__sambongMangaCutIn = { showMangaCutIn, preloadMangaCutIns, closeMangaCutIn, MANGA_SCENES };
}
