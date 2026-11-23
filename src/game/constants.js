/** 선수 명단·능력치 이름·업적·상점 품목 같은 고정값 */


// Vite 빌드 시 .env의 VITE_APP_ID 사용, 없으면 기본값 (기존 단일 HTML과 동일)
export const appId = (import.meta.env && import.meta.env.VITE_APP_ID) || (typeof globalThis.__app_id !== 'undefined' ? globalThis.__app_id : 'sambong-badminton');

/** 처음 명단. 더 넣을 사람은 마스터J가 '신규 선수 등록'으로 넣어요 */
/** 이름을 바꾼 선수 (예전 이름 → 새 이름). 마스터가 들어올 때 서버 기록을 새 이름으로 옮겨요 */
export const RENAMED_PLAYERS = { '백소윤': '백소연' };
export const INITIAL_PLAYERS = ['백소연', '정지은', '정예람', '박정민', '정의정', '고새연', '박도담', '신희영', '김병우'];

export let ALLOWED_PLAYERS = [...INITIAL_PLAYERS];

export const getSafeDocId = (name) => {
if (!name) return 'unknown';
if(name === 'gm1' || name === 'gm2') return name;
return String(name).replace(/[^가-힣a-zA-Z0-9]/g, ''); 
};

export const GENDER_MAP = {};

export const POS_KR = { 'Front': '전위 (네트)', 'Rear': '후위 (공격)', 'All': '올라운더', 'Single': '단식 전문', '미정': '포지션 미정' };
export const STAT_NAMES = { pac:'풋워크 (FTW)', sho:'스매시 (SMA)', pas:'클리어 (CLR)', dri:'드롭·헤어핀 (DRP)', def:'수비 리시브 (DEF)', phy:'체력 (STA)', ref:'반응 속도 (REF)', int:'네트 플레이 (NET)', pst:'위치 선정 (POS)', dis:'서브 (SRV)', cmp:'평정심 (CMP)', wrk:'드라이브 (DRV)' };

export const POS_WEIGHTS = {
'Front': { core: ['int', 'ref', 'wrk', 'pst'], sub: ['dri', 'dis'], coreW: 0.70, subW: 0.25, etcW: 0.05 },
'Rear': { core: ['sho', 'pas', 'phy', 'pac'], sub: ['wrk', 'cmp'], coreW: 0.70, subW: 0.25, etcW: 0.05 },
'All': { core: ['def', 'ref', 'pst', 'cmp'], sub: ['pac', 'dis'], coreW: 0.70, subW: 0.25, etcW: 0.05 },
'Single': { core: ['pac', 'pas', 'dri', 'phy'], sub: ['cmp', 'pst'], coreW: 0.70, subW: 0.25, etcW: 0.05 },
'미정': { core: [], sub: [], coreW: 0, subW: 0, etcW: 1.0 }
};

/** 시즌 2 기본 능력치 · 일일 기록 한도 */
export const STAT_BASE = 55;
export const STAT_KEYS = ['pac', 'sho', 'pas', 'dri', 'def', 'phy', 'ref', 'int', 'pst', 'dis', 'cmp', 'wrk'];
export const ACTIVITY_DAILY_CAP = { training: 1, matches: 1, goals: 4, assists: 4, keypass: 6, saves: 8 };
export const ACTIVITY_LABEL = { training: '개인 훈련', matches: '경기 출전', goals: '위닝샷', assists: '찬스 메이킹', keypass: '랠리 승리', saves: '수비 성공' };

export const STAT_DESC = {
'pac': '🏃 풋워크 (Footwork)\n\n코트 앞뒤·좌우로 빠르게 움직이는 발놀림입니다.\n구석으로 온 셔틀도 늦지 않게 따라가 칠 수 있어요.',
'sho': '💥 스매시 (Smash)\n\n높이 뜬 셔틀을 위에서 아래로 세게 내리꽂는 힘과 정확도입니다.\n가장 강한 공격 기술이에요.',
'pas': '🌈 클리어 (Clear)\n\n셔틀을 상대 코트 맨 뒤까지 높고 길게 보내는 능력입니다.\n상대를 뒤로 밀어내고 내가 준비할 시간을 벌어요.',
'dri': '🪶 드롭·헤어핀 (Drop & Hairpin)\n\n셔틀을 네트 바로 앞에 살짝 떨어뜨리는 섬세한 손기술입니다.\n세게 칠 것처럼 하다가 살짝 놓으면 상대가 속아요.',
'def': '🛡️ 수비 리시브 (Defense)\n\n상대 스매시를 받아 내는 능력입니다.\n힘으로 맞받기보다 네트 앞에 블록하거나 길게 올려 버텨요.',
'phy': '🔋 체력 (Stamina)\n\n긴 랠리에도 지치지 않는 힘입니다.\n경기 끝까지 처음처럼 뛰고 칠 수 있어요.',
'ref': '⚡ 반응 속도 (Reflex)\n\n눈앞으로 빠르게 날아오는 셔틀에 라켓을 갖다 대는 순간 반응입니다.\n전위에서 드라이브를 막을 때 특히 중요해요.',
'int': '🕸️ 네트 플레이 (Net)\n\n네트 앞에서 셔틀을 가로채 꽂거나(킬) 살짝 넘기는 능력입니다.\n복식 전위 선수의 핵심이에요.',
'pst': '🎯 위치 선정 (Positioning)\n\n치고 나서 다음 셔틀이 올 곳으로 미리 가 있는 눈치입니다.\n단식은 코트 가운데(홈), 복식은 앞뒤·나란히 자리를 지켜요.',
'dis': '🏸 서브 (Serve)\n\n허리 아래(1.15m 아래)에서 쳐서 대각선 서비스 코트로 넣는 능력입니다.\n짧고 낮게, 또는 높고 길게 골라 넣어요.',
'cmp': '🧘 평정심 (Composure)\n\n점수가 비슷하거나 긴 랠리일 때도 실수하지 않고 침착하게 치는 마음의 힘입니다.',
'wrk': '🚄 드라이브 (Drive)\n\n네트 높이로 낮고 빠르게 직선으로 치는 기술입니다.\n상대가 셔틀을 위로 올리게 만들어 공격권을 가져와요.'
};

export const DAILY_TIPS = [
{ title: "2027년부터 15점 경기!", img: "🔢", category: "새 규칙", desc: "세계배드민턴연맹(BWF)이 2027년 1월 4일부터 한 게임을 21점이 아닌 15점으로 바꿔요. 14-14가 되면 2점을 앞서야 이기고, 20-20이면 다음 1점이 이겨요." },
{ title: "서브는 허리 아래에서!", img: "🏸", category: "기본규칙", desc: "서브할 때 셔틀 전체가 바닥에서 1.15m보다 낮은 곳에서 맞아야 해요. 그리고 대각선 쪽 서비스 코트로 넣어야 합니다." },
{ title: "내 점수가 짝수면 오른쪽", img: "↔️", category: "기본규칙", desc: "서브하는 사람의 점수가 0·2·4처럼 짝수면 오른쪽, 1·3·5처럼 홀수면 왼쪽 서비스 코트에서 서브해요." },
{ title: "셔틀이 올라가면 나란히", img: "↕️", category: "복식 전술", desc: "우리가 셔틀을 높이 올렸으면 상대가 스매시해요. 둘이 나란히 서서 코트를 반씩 막아요. 우리가 아래로 쳤으면 앞뒤로 서서 공격해요!" },
{ title: "두 사람 사이 가운데", img: "🎯", category: "복식 전술", desc: "복식에서 상대 두 명 사이 가운데로 치면 서로 '네가 쳐!' 하다가 놓치기 쉬워요." },
{ title: "단식은 네 구석", img: "🧭", category: "단식 전술", desc: "앞-뒤-왼쪽-오른쪽 네 구석으로 보내 상대를 많이 뛰게 하고, 치고 나면 나는 코트 가운데(홈)로 돌아와요." }
];

export const ACHIEVEMENTS = [
{ id: 'goal_1', category: '개인 기록', title: '첫 위닝샷', desc: '처음으로 상대가 못 받는 공을 쳐서 점수를 냈어요.', reqKey: 'goals', reqValue: 1, icon: '🏸', color: 'text-yellow-400', bg: 'bg-yellow-400', reward: 5 },
{ id: 'goal_50', category: '개인 기록', title: '스매시 폭격기', desc: '위닝샷 50개! 상대가 가장 무서워하는 공격수입니다.', reqKey: 'goals', reqValue: 50, icon: '🚀', color: 'text-red-500', bg: 'bg-red-500', reward: 50 },
{ id: 'ast_1', category: '팀 플레이', title: '찬스 메이커', desc: '파트너가 점수를 내도록 처음으로 찬스를 만들었어요.', reqKey: 'assists', reqValue: 1, icon: '🤝', color: 'text-emerald-400', bg: 'bg-emerald-400', reward: 5 },
{ id: 'save_30', category: '수비/헌신', title: '통곡의 벽', desc: '수비 성공 30번! 스매시를 다 받아 내요.', reqKey: 'saves', reqValue: 30, icon: '🧱', color: 'text-slate-300', bg: 'bg-slate-300', reward: 30 },
{ id: 'match_50', category: '꾸준함', title: '강철 체력', desc: '50경기 출전! 지치지 않는 체력.', reqKey: 'matches', reqValue: 50, icon: '🫀', color: 'text-pink-500', bg: 'bg-pink-500', reward: 50 },
{ id: 'lv_50', category: '레벨업', title: '레전드의 시작', desc: '레벨 50 달성. 명예의 전당에 오를 자격이 충분합니다.', reqKey: 'level', reqValue: 50, icon: '👑', color: 'text-fut-gold', bg: 'bg-fut-gold', reward: 100 },
{ id: 'rear_low', category: '후위(공격)', title: '스매시 새싹', desc: '위닝샷 10개. 뒤에서 내리꽂는 힘이 생겼어요.', reqKey: 'goals', reqValue: 10, icon: '🎯', color: 'text-red-400', bg: 'bg-red-400', reward: 10 },
{ id: 'rear_med', category: '후위(공격)', title: '점프 스매셔', desc: '위닝샷 30개. 찬스를 놓치지 않는 해결사!', reqKey: 'goals', reqValue: 30, icon: '🦅', color: 'text-red-500', bg: 'bg-red-500', reward: 30 },
{ id: 'rear_high', category: '후위(공격)', title: '전설의 스매셔', desc: '위닝샷 100개. 삼봉 배드민턴 최고의 공격수!', reqKey: 'goals', reqValue: 100, icon: '🔥', color: 'text-red-600', bg: 'bg-red-600', reward: 100 },
{ id: 'front_low', category: '전위(네트)', title: '네트 지킴이', desc: '찬스 메이킹 10번. 파트너를 살리는 앞사람이에요.', reqKey: 'assists', reqValue: 10, icon: '🕸️', color: 'text-emerald-400', bg: 'bg-emerald-400', reward: 10 },
{ id: 'front_med', category: '전위(네트)', title: '헤어핀 장인', desc: '찬스 메이킹 30번. 네트 앞이 내 무대!', reqKey: 'assists', reqValue: 30, icon: '🪶', color: 'text-emerald-500', bg: 'bg-emerald-500', reward: 30 },
{ id: 'front_high', category: '전위(네트)', title: '네트의 마술사', desc: '찬스 메이킹 100번. 완벽한 전위!', reqKey: 'assists', reqValue: 100, icon: '🪄', color: 'text-emerald-600', bg: 'bg-emerald-600', reward: 100 },
{ id: 'rally_low', category: '랠리', title: '끈질긴 랠리', desc: '랠리 승리 10번. 오래 버티면 이겨요.', reqKey: 'keypass', reqValue: 10, icon: '🔁', color: 'text-blue-400', bg: 'bg-blue-400', reward: 10 },
{ id: 'rally_med', category: '랠리', title: '랠리 마스터', desc: '랠리 승리 30번.', reqKey: 'keypass', reqValue: 30, icon: '🔭', color: 'text-blue-500', bg: 'bg-blue-500', reward: 30 },
{ id: 'def_low', category: '수비', title: '든든한 수비', desc: '수비 성공 10번.', reqKey: 'saves', reqValue: 10, icon: '🛡️', color: 'text-orange-400', bg: 'bg-orange-400', reward: 10 },
{ id: 'def_high', category: '수비', title: '삼봉의 벽', desc: '수비 성공 150번. 무엇이든 받아 내요!', reqKey: 'saves', reqValue: 150, icon: '🐢', color: 'text-orange-600', bg: 'bg-orange-600', reward: 150 },
{ id: 'train_8', category: '성장', title: '땀의 증표', desc: '개인 훈련 8회. 꾸준히 나온 선수가 강해집니다.', reqKey: 'training', reqValue: 8, icon: '💪', color: 'text-lime-400', bg: 'bg-lime-400', reward: 20 },
{ id: 'lv_10', category: '성장', title: '첫 도약', desc: '레벨 10. 능력치 55에서 천천히 올라온 증표입니다.', reqKey: 'level', reqValue: 10, icon: '🌟', color: 'text-amber-300', bg: 'bg-amber-300', reward: 25 },
{ id: 'match_8', category: '성장', title: '코트 단골', desc: '출전 8회. 꾸준히 나온 선수입니다.', reqKey: 'matches', reqValue: 8, icon: '📅', color: 'text-sky-400', bg: 'bg-sky-400', reward: 20 }
];

/** 강화: 평타는 느껴지되 +5에서 능력치가 폭주하지 않게 보너스를 완만히 */
export const ENHANCE_LEVELS = [
{ level: 0, chance: 100, statPlus: 0, growthMult: 1.0, css: 'eff-0', text: '+0', color: 'text-slate-400' },
{ level: 1, chance: 90,  statPlus: 1, growthMult: 1.05, css: 'eff-1', text: '+1', color: 'text-white' },
{ level: 2, chance: 70,  statPlus: 1, growthMult: 1.1, css: 'eff-2', text: '+2', color: 'text-blue-400' },
{ level: 3, chance: 45,  statPlus: 2, growthMult: 1.2, css: 'eff-3', text: '+3', color: 'text-purple-400' },
{ level: 4, chance: 25,  statPlus: 2, growthMult: 1.3, css: 'eff-4', text: '+4', color: 'text-yellow-400' },
{ level: 5, chance: 12,  statPlus: 3, growthMult: 1.4, css: 'eff-5', text: '+5 MAX', color: 'text-red-400 drop-shadow-[0_0_5px_red]' }
];

export const SHOP_ITEMS = [
{ id: 'head_tier1', name: '시야 확장 고글', type: 'head', price: 500, icon: '🥽', desc: '[1종 집중형] 공간 지각력을 높입니다.', baseStats: {pst: 1}, baseGrowth: {pst: 15} },
{ id: 'head_tier2', name: '와이드 비전 헤드밴드', type: 'head', price: 620, icon: '🪢', desc: '[2종 복합형] 패스 길을 읽는 헤드밴드.', baseStats: {pst: 1, pas: 1}, baseGrowth: {pst: 10, pas: 10} },
{ id: 'head_tier3', name: '삼봉 마스터 헬멧', type: 'head', price: 800, icon: '🪖', desc: '[3종 올라운더] 최상급 수비지휘 헬멧.', baseStats: {cmp: 1, dis: 1, def: 1}, baseGrowth: {cmp: 7, dis: 7, def: 7} },
{ id: 'handL_tier1', name: '라텍스 그립 장갑 [좌]', type: 'handL', price: 500, icon: '🧤', desc: '[1종 집중형] 반사신경을 극대화.', baseStats: {ref: 1}, baseGrowth: {ref: 15} },
{ id: 'handL_tier2', name: '테크니컬 암 슬리브 [좌]', type: 'handL', price: 620, icon: '🦾', desc: '[2종 복합형] 거친 몸싸움을 버티는 슬리브.', baseStats: {phy: 1, wrk: 1}, baseGrowth: {phy: 10, wrk: 10} },
{ id: 'handL_tier3', name: '전설의 황금 완장 [좌]', type: 'handL', price: 800, icon: '🎗️', desc: '[3종 올라운더] 팀을 이끄는 주장의 완장.', baseStats: {pas: 1, cmp: 1, wrk: 1}, baseGrowth: {pas: 7, cmp: 7, wrk: 7} },
{ id: 'handR_tier1', name: '거미줄 그립 장갑 [우]', type: 'handR', price: 500, icon: '🧤', desc: '[1종 집중형] 펀칭과 캐칭 능력 극대화.', baseStats: {ref: 1}, baseGrowth: {ref: 15} },
{ id: 'handR_tier2', name: '밸런스 암 슬리브 [우]', type: 'handR', price: 620, icon: '🦾', desc: '[2종 복합형] 흔들림 없는 피지컬 유지.', baseStats: {phy: 1, wrk: 1}, baseGrowth: {phy: 10, wrk: 10} },
{ id: 'handR_tier3', name: '명장의 호루라기 [우]', type: 'handR', price: 800, icon: '🏅', desc: '[3종 올라운더] 필드의 감독이 되어 조율.', baseStats: {dis: 1, int: 1, def: 1}, baseGrowth: {dis: 7, int: 7, def: 7} },
{ id: 'footL_tier1', name: '경량화 카본 운동화 [좌]', type: 'footL', price: 500, icon: '👟', desc: '[1종 집중형] 폭발적인 스피드.', baseStats: {pac: 1}, baseGrowth: {pac: 15} },
{ id: 'footL_tier1_alt', name: '파워 임팩트 운동화 [좌]', type: 'footL', price: 500, icon: '🥾', desc: '[1종 집중형] 대포알 슈팅 장착.', baseStats: {sho: 1}, baseGrowth: {sho: 15} },
{ id: 'footL_tier2', name: '마에스트로 운동화 [좌]', type: 'footL', price: 620, icon: '👞', desc: '[2종 복합형] 우아한 드리블과 패스.', baseStats: {dri: 1, pas: 1}, baseGrowth: {dri: 10, pas: 10} },
{ id: 'footR_tier1', name: '강철 발목 보호대 [우]', type: 'footR', price: 500, icon: '🧦', desc: '[1종 집중형] 정확한 가로채기 타이밍.', baseStats: {int: 1}, baseGrowth: {int: 15} },
{ id: 'footR_tier1_alt', name: '터프 태클 운동화 [우]', type: 'footR', price: 500, icon: '🥾', desc: '[1종 집중형] 끈질긴 대인 수비 전용.', baseStats: {def: 1}, baseGrowth: {def: 15} },
{ id: 'footR_tier2', name: '팬텀 드리블러 운동화 [우]', type: 'footR', price: 620, icon: '👟', desc: '[2종 복합형] 보이지 않는 발놀림.', baseStats: {dri: 1, pac: 1}, baseGrowth: {dri: 10, pac: 10} },
{ id: 'footL_tier3', name: '삼봉 골든 부스트 [좌]', type: 'footL', price: 800, icon: '🥇', desc: '[3종 올라운더] 최상급 왼발. 속력·슈팅·드리블.', baseStats: {pac: 1, sho: 1, dri: 1}, baseGrowth: {pac: 7, sho: 7, dri: 7} },
{ id: 'footR_tier3', name: '삼봉 아이언 앵클 [우]', type: 'footR', price: 800, icon: '🛡️', desc: '[3종 올라운더] 최상급 오른발. 수비·가로채기·피지컬.', baseStats: {def: 1, int: 1, phy: 1}, baseGrowth: {def: 7, int: 7, phy: 7} },
{ id: 'head_band_wrk', name: '땀밴드 플라이', type: 'head', price: 520, icon: '🎽', desc: '[1종 집중형] 활동량을 끌어올리는 헤어밴드.', baseStats: {wrk: 1}, baseGrowth: {wrk: 15} },
{ id: 'handL_gk_pro', name: '슈퍼세이브 글러브 [좌]', type: 'handL', price: 740, icon: '🥅', desc: '[2종 복합형] 골레이로 전용 그립과 반사.', baseStats: {ref: 1, cmp: 1}, baseGrowth: {ref: 12, cmp: 8} },
{ id: 'handR_gk_pro', name: '슈퍼세이브 글러브 [우]', type: 'handR', price: 740, icon: '🥅', desc: '[2종 복합형] 펀칭과 볼배급.', baseStats: {ref: 1, dis: 1}, baseGrowth: {ref: 12, dis: 8} },
{ id: 'head_cap_int', name: '리딩 캡', type: 'head', price: 550, icon: '🧢', desc: '[2종 복합형] 패스 길과 가로채기를 읽습니다.', baseStats: {int: 1, pst: 1}, baseGrowth: {int: 10, pst: 10} },
{ id: 'footL_ctrl', name: '터치 마스터 [좌]', type: 'footL', price: 600, icon: '🩰', desc: '[2종 복합형] 드리블과 슈팅 터치.', baseStats: {dri: 1, sho: 1}, baseGrowth: {dri: 10, sho: 10} },
{ id: 'footR_engine', name: '엔진 부츠 [우]', type: 'footR', price: 600, icon: '⚙️', desc: '[2종 복합형] 속력과 활동량.', baseStats: {pac: 1, wrk: 1}, baseGrowth: {pac: 10, wrk: 10} },

{ id: 'skin_m1', name: '기본 스킨: 그린 스파이크', type: 'skin', price: 0, icon: '💚', gender: 'M', desc: '[무료] 남학생 기본 3종 ① 증명사진 비율.', faceImageUrl: 'faces/skin-m1.jpg', baseStats: {}, baseGrowth: {} },
{ id: 'skin_m2', name: '기본 스킨: 네이비 사이드', type: 'skin', price: 0, icon: '💙', gender: 'M', desc: '[무료] 남학생 기본 3종 ② 증명사진 비율.', faceImageUrl: 'faces/skin-m2.jpg', baseStats: {}, baseGrowth: {} },
{ id: 'skin_m3', name: '기본 스킨: 크림슨 실버', type: 'skin', price: 0, icon: '❤️', gender: 'M', desc: '[무료] 남학생 기본 3종 ③ 증명사진 비율.', faceImageUrl: 'faces/skin-m3.jpg', baseStats: {}, baseGrowth: {} },
{ id: 'skin_f1', name: '기본 스킨: 퍼플 포니', type: 'skin', price: 0, icon: '💜', gender: 'F', desc: '[무료] 여학생 기본 3종 ① 증명사진 비율.', faceImageUrl: 'faces/skin-f1.jpg', baseStats: {}, baseGrowth: {} },
{ id: 'skin_f2', name: '기본 스킨: 민트 보브', type: 'skin', price: 0, icon: '💚', gender: 'F', desc: '[무료] 여학생 기본 3종 ② 증명사진 비율.', faceImageUrl: 'faces/skin-f2.jpg', baseStats: {}, baseGrowth: {} },
{ id: 'skin_f3', name: '기본 스킨: 코랄 헤드밴드', type: 'skin', price: 0, icon: '🧡', gender: 'F', desc: '[무료] 여학생 기본 3종 ③ 증명사진 비율.', faceImageUrl: 'faces/skin-f3.jpg', baseStats: {}, baseGrowth: {} },
{ id: 'skin_hero_m', name: '히어로 스킨: 클로즈업 남', type: 'skin', price: 600, icon: '⚡', desc: '[유료] 경기 직전 클로즈업 연출 (남).', faceImageUrl: 'faces/sfc-manga-boy.jpg', baseStats: {}, baseGrowth: {} },
{ id: 'skin_hero_f', name: '히어로 스킨: 클로즈업 여', type: 'skin', price: 600, icon: '✨', desc: '[유료] 경기 직전 클로즈업 연출 (여).', faceImageUrl: 'faces/sfc-manga-girl.jpg', baseStats: {}, baseGrowth: {} },
{ id: 'skin_close_m1', name: '클로즈업: 레드 스파이크 (남)', type: 'skin', price: 650, icon: '⚡', gender: 'M', desc: '[유료] 경기 직전 클로즈업. 빨간 홈킷.', faceImageUrl: 'faces/closeup-m1.jpg', baseStats: {}, baseGrowth: {} },
{ id: 'skin_close_m2', name: '클로즈업: 블루 사이드 (남)', type: 'skin', price: 650, icon: '⚡', gender: 'M', desc: '[유료] 경기 직전 클로즈업. 파란 킷.', faceImageUrl: 'faces/closeup-m2.jpg', baseStats: {}, baseGrowth: {} },
{ id: 'skin_close_m3', name: '클로즈업: 화이트 라이트닝 (남)', type: 'skin', price: 680, icon: '⚡', gender: 'M', desc: '[유료] 경기 직전 클로즈업. 흰 어웨이킷.', faceImageUrl: 'faces/closeup-m3.jpg', baseStats: {}, baseGrowth: {} },
{ id: 'skin_close_m4', name: '클로즈업: 나이트 실버 (남)', type: 'skin', price: 720, icon: '⚡', gender: 'M', desc: '[유료] 경기 직전 클로즈업. 블랙 킷.', faceImageUrl: 'faces/closeup-m4.jpg', baseStats: {}, baseGrowth: {} },
{ id: 'skin_close_m5', name: '클로즈업: 선셋 파이어 (남)', type: 'skin', price: 700, icon: '⚡', gender: 'M', desc: '[유료] 경기 직전 클로즈업. 오렌지 킷.', faceImageUrl: 'faces/closeup-m5.jpg', baseStats: {}, baseGrowth: {} },
{ id: 'skin_close_f1', name: '클로즈업: 마젠타 포니 (여)', type: 'skin', price: 650, icon: '✨', gender: 'F', desc: '[유료] 경기 직전 클로즈업. 마젠타 킷.', faceImageUrl: 'faces/closeup-f1.jpg', baseStats: {}, baseGrowth: {} },
{ id: 'skin_close_f2', name: '클로즈업: 스카이 트윈 (여)', type: 'skin', price: 650, icon: '✨', gender: 'F', desc: '[유료] 경기 직전 클로즈업. 스카이 킷.', faceImageUrl: 'faces/closeup-f2.jpg', baseStats: {}, baseGrowth: {} },
{ id: 'skin_close_f3', name: '클로즈업: 골드 보브 (여)', type: 'skin', price: 680, icon: '✨', gender: 'F', desc: '[유료] 경기 직전 클로즈업. 골드 킷.', faceImageUrl: 'faces/closeup-f3.jpg', baseStats: {}, baseGrowth: {} },
{ id: 'skin_close_f4', name: '클로즈업: 에메랄드 사이드 (여)', type: 'skin', price: 700, icon: '✨', gender: 'F', desc: '[유료] 경기 직전 클로즈업. 초록 킷.', faceImageUrl: 'faces/closeup-f4.jpg', baseStats: {}, baseGrowth: {} },
{ id: 'skin_close_f5', name: '클로즈업: 크림슨 헤드밴드 (여)', type: 'skin', price: 720, icon: '✨', gender: 'F', desc: '[유료] 경기 직전 클로즈업. 흰·빨강 킷.', faceImageUrl: 'faces/closeup-f5.jpg', baseStats: {}, baseGrowth: {} },
{ id: 'skin_m4', name: '킷 스킨: 골드 홈 (남)', type: 'skin', price: 510, icon: '💛', gender: 'M', desc: '[유료] 노란 홈킷 · 증명사진 비율.', faceImageUrl: 'faces/skin-m4.jpg', baseStats: {}, baseGrowth: {} },
{ id: 'skin_m5', name: '킷 스킨: 화이트 어웨이 (남)', type: 'skin', price: 510, icon: '🤍', gender: 'M', desc: '[유료] 흰 어웨이킷 · 증명사진 비율.', faceImageUrl: 'faces/skin-m5.jpg', baseStats: {}, baseGrowth: {} },
{ id: 'skin_f4', name: '킷 스킨: 레드 스트라이프 (여)', type: 'skin', price: 510, icon: '❤️', gender: 'F', desc: '[유료] 빨간 홈킷 · 증명사진 비율.', faceImageUrl: 'faces/skin-f4.jpg', baseStats: {}, baseGrowth: {} },
{ id: 'skin_f5', name: '킷 스킨: 민트 어웨이 (여)', type: 'skin', price: 510, icon: '💚', gender: 'F', desc: '[유료] 민트 어웨이킷 · 증명사진 비율.', faceImageUrl: 'faces/skin-f5.jpg', baseStats: {}, baseGrowth: {} },
{ id: 'kit_emerald', name: '카드 킷: 에메랄드 피치', type: 'kit', price: 520, icon: '🌿', kitClass: 'card-skin-emerald', desc: '[킷] 카드에 초록 스포트라이트.', baseStats: {}, baseGrowth: {} },
{ id: 'kit_gold', name: '카드 킷: 골든 포일', type: 'kit', price: 580, icon: '🥇', kitClass: 'card-skin-gold', desc: '[킷] 금박 포일 테두리.', baseStats: {}, baseGrowth: {} },
{ id: 'kit_crimson', name: '카드 킷: 크림슨 플레어', type: 'kit', price: 550, icon: '🔥', kitClass: 'card-skin-crimson', desc: '[킷] 레드 플레어 아우라.', baseStats: {}, baseGrowth: {} },
{ id: 'kit_midnight', name: '카드 킷: 미드나잇', type: 'kit', price: 540, icon: '🌙', kitClass: 'card-skin-midnight', desc: '[킷] 야간 경기 조명.', baseStats: {}, baseGrowth: {} },
{ id: 'kit_sakura', name: '카드 킷: 사쿠라', type: 'kit', price: 560, icon: '🌸', kitClass: 'card-skin-sakura', desc: '[킷] 핑크 하이라이트.', baseStats: {}, baseGrowth: {} },
{ id: 'kit_ice', name: '카드 킷: 아이스 블루', type: 'kit', price: 540, icon: '❄️', kitClass: 'card-skin-ice', desc: '[킷] 냉정한 블루 글로우.', baseStats: {}, baseGrowth: {} },
{ id: 'kit_sun', name: '카드 킷: 선샤인', type: 'kit', price: 530, icon: '☀️', kitClass: 'card-skin-sun', desc: '[킷] 밝은 햇살 골드.', baseStats: {}, baseGrowth: {} },
{ id: 'kit_void', name: '카드 킷: 보이드', type: 'kit', price: 570, icon: '🖤', kitClass: 'card-skin-void', desc: '[킷] 검은 보이드 테두리.', baseStats: {}, baseGrowth: {} },


// 여학생 추천: Dicebear 9 lorelei + 원형·그라데이션 배경 (무대 조명 느낌)
{ id: 'face_idol_rose', name: '스포트라이트 얼굴: 로즈 무대', type: 'face', price: 660, icon: '💗', desc: '[컨셉] 핑크 스포트라이트·로맨틱 무대 (여학생 추천).', faceImageUrl: 'https://api.dicebear.com/9.x/lorelei/png?seed=SambongStageRose&size=256&radius=50&scale=96&backgroundType=gradientLinear&backgroundRotation=0,180,360&backgroundColor=ffb7d5,ffc9e6,ffe0ec', baseStats: {}, baseGrowth: {} },
{ id: 'face_idol_sky', name: '스포트라이트 얼굴: 스카이 무대', type: 'face', price: 680, icon: '💙', desc: '[컨셉] 시원한 블루·실버 무대 라이트.', faceImageUrl: 'https://api.dicebear.com/9.x/lorelei/png?seed=SambongStageSky&size=256&radius=50&scale=96&backgroundType=gradientLinear&backgroundRotation=0,180,360&backgroundColor=a8d8ff,c7e3ff,e0f2fe', baseStats: {}, baseGrowth: {} },
{ id: 'face_idol_peach', name: '스포트라이트 얼굴: 피치 글로우', type: 'face', price: 720, icon: '🍑', desc: '[컨셉] 코랄·피치 톤 스포트라이트.', faceImageUrl: 'https://api.dicebear.com/9.x/lorelei/png?seed=SambongStagePeach&size=256&radius=50&scale=96&backgroundType=gradientLinear&backgroundRotation=0,180,360&backgroundColor=ffd6ba,ffe4d6,fff0e6', baseStats: {}, baseGrowth: {} },
{ id: 'face_idol_mint', name: '스포트라이트 얼굴: 민트 쉬머', type: 'face', price: 640, icon: '💚', desc: '[컨셉] 청량 민트·민트 그린 무대.', faceImageUrl: 'https://api.dicebear.com/9.x/lorelei/png?seed=SambongStageMint&size=256&radius=50&scale=96&backgroundType=gradientLinear&backgroundRotation=0,180,360&backgroundColor=9fe5d7,b8f2e6,d1faf0', baseStats: {}, baseGrowth: {} },
{ id: 'face_idol_lilac', name: '스포트라이트 얼굴: 라일락 드림', type: 'face', price: 740, icon: '💜', desc: '[컨셉] 라일락·라벤더 드림 무대.', faceImageUrl: 'https://api.dicebear.com/9.x/lorelei/png?seed=SambongStageLilac&size=256&radius=50&scale=96&backgroundType=gradientLinear&backgroundRotation=0,180,360&backgroundColor=d9c9ff,e9d5ff,f3e8ff', baseStats: {}, baseGrowth: {} },
];

export const LOCKER_POS_ORDER = ['Front', 'Rear', 'All', 'Single', '미정'];
export const LOCKER_POS_HEAD = { Front: '전위 (네트)', Rear: '후위 (공격)', All: '올라운더', Single: '단식 전문', '미정': '포지션 미정' };
export const SHOP_GEAR_TYPES = ['head', 'handL', 'handR', 'footL', 'footR'];
export const SHOP_SKIN_TYPES = ['skin', 'kit'];
/** 모의경기·팀 분류표의 팀 (최대 6팀). Firestore simTeam 값은 key('A'~'F') */
export const SIM_TEAMS = [
  { key: 'A', pick: 'peer-checked:bg-red-600 peer-checked:border-red-400', name: '레드팀', short: '레드', text: 'text-red-300', head: 'text-red-400', zone: 'border-red-800/50 bg-red-950/30', chip: 'bg-red-600 border-red-400', dot: 'bg-red-500', bar: 'border-t-red-500', hex: '#ef4444' },
  { key: 'B', pick: 'peer-checked:bg-blue-600 peer-checked:border-blue-400', name: '블루팀', short: '블루', text: 'text-blue-300', head: 'text-blue-400', zone: 'border-blue-800/50 bg-blue-950/30', chip: 'bg-blue-600 border-blue-400', dot: 'bg-blue-500', bar: 'border-t-blue-500', hex: '#3b82f6' },
  { key: 'C', pick: 'peer-checked:bg-emerald-600 peer-checked:border-emerald-400', name: '그린팀', short: '그린', text: 'text-emerald-300', head: 'text-emerald-400', zone: 'border-emerald-800/50 bg-emerald-950/30', chip: 'bg-emerald-600 border-emerald-400', dot: 'bg-emerald-500', bar: 'border-t-emerald-500', hex: '#10b981' },
  { key: 'D', pick: 'peer-checked:bg-yellow-500 peer-checked:border-yellow-300 peer-checked:!text-slate-900', name: '옐로팀', short: '옐로', text: 'text-yellow-200', head: 'text-yellow-300', zone: 'border-yellow-700/50 bg-yellow-950/25', chip: 'bg-yellow-500 border-yellow-300 text-slate-900', dot: 'bg-yellow-400', bar: 'border-t-yellow-400', hex: '#facc15' },
  { key: 'E', pick: 'peer-checked:bg-purple-600 peer-checked:border-purple-400', name: '퍼플팀', short: '퍼플', text: 'text-purple-300', head: 'text-purple-400', zone: 'border-purple-800/50 bg-purple-950/30', chip: 'bg-purple-600 border-purple-400', dot: 'bg-purple-500', bar: 'border-t-purple-500', hex: '#a855f7' },
  { key: 'F', pick: 'peer-checked:bg-orange-600 peer-checked:border-orange-400', name: '오렌지팀', short: '오렌지', text: 'text-orange-300', head: 'text-orange-400', zone: 'border-orange-800/50 bg-orange-950/30', chip: 'bg-orange-600 border-orange-400', dot: 'bg-orange-500', bar: 'border-t-orange-500', hex: '#f97316' },
];
export const SIM_TEAM_KEYS = SIM_TEAMS.map((t) => t.key);
export const isSimTeamKey = (k) => SIM_TEAM_KEYS.includes(k);
export const simTeamInfo = (k) => SIM_TEAMS.find((t) => t.key === k) || SIM_TEAMS[0];
/** 한 팀 최대 인원 */
export const MAX_SIM_TEAM_SIZE = 12;
/** 예전 이름 (중계 기본값) */
export const SIM_TEAM_A_NAME = '레드팀';
export const SIM_TEAM_B_NAME = '블루팀';
