/** 팀 전술 (전술판에서 고름, 기기에 저장). 팀 키('A'~'F')별로 따로 */
export const TACTIC_OPTIONS = {
  style: { label: '경기 스타일', opts: { attack: '공격형 (스매시)', balanced: '균형', rally: '랠리형 (실수 줄이기)' } },
  target: { label: '노리는 곳', opts: { middle: '두 사람 사이 가운데', corners: '네 구석', body: '몸 쪽' } },
  serve: { label: '서브', opts: { short: '짧고 낮게', mix: '섞어서', long: '높고 길게' } },
};
export const DEFAULT_TACTIC = { style: 'balanced', target: 'middle', serve: 'mix' };

const STORE = 'sbd_sim_tactics_v1';
function load() {
  try { const o = JSON.parse(localStorage.getItem(STORE) || 'null'); if (o && typeof o === 'object') return o; } catch (e) { /* 무시 */ }
  return {};
}
window.simTactics = window.simTactics || load();

export function getTactic(teamKey) {
  const t = { ...DEFAULT_TACTIC, ...(window.simTactics[teamKey] || {}) };
  // 예전 값이 남아 있으면 기본값으로
  Object.keys(TACTIC_OPTIONS).forEach((k) => { if (!TACTIC_OPTIONS[k].opts[t[k]]) t[k] = DEFAULT_TACTIC[k]; });
  return t;
}
export function setTactic(teamKey, key, value) {
  if (!TACTIC_OPTIONS[key] || !TACTIC_OPTIONS[key].opts[value]) return;
  window.simTactics[teamKey] = { ...getTactic(teamKey), [key]: value };
  try { localStorage.setItem(STORE, JSON.stringify(window.simTactics)); } catch (e) { /* 무시 */ }
}
