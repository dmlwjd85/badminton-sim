/** 한국어 조사 자동 고르기 */
/** 받침에 맞게 조사 고르기: '민준이(가)' → '민준이', '지호이(가)' → '지호가' */
export function josa(text) {
  const PAIRS = { '이(가)': ['이', '가'], '은(는)': ['은', '는'], '을(를)': ['을', '를'], '와(과)': ['과', '와'], '(으)로': ['으로', '로'], '이(가)\u0020': ['이 ', '가 '] };
  return String(text || '').replace(/([가-힣A-Za-z0-9])(이\(가\)|은\(는\)|을\(를\)|와\(과\)|\(으\)로)/g, (_, ch, j) => {
    const code = ch.charCodeAt(0);
    let batchim;
    if (code >= 0xac00 && code <= 0xd7a3) batchim = (code - 0xac00) % 28 !== 0;
    else batchim = /[013678lmnLMN]$/.test(ch);
    const [withB, noB] = PAIRS[j];
    if (j === '(으)로' && code >= 0xac00 && (code - 0xac00) % 28 === 8) return ch + '로'; // ㄹ받침
    return ch + (batchim ? withB : noB);
  });
}
