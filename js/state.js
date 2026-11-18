// 閱讀進度：點亮的寶珠、讀過的章、情境題的選擇、配對是否完成、上次讀到哪。
import { SAVE_KEY } from './config.js';
import { benefitList } from './book.js';
import { resolveStorage, readJson, writeJson, removeKey, isPlainObject } from './storage.js';

const VERSION = 1;
const isIndex = (n) => Number.isInteger(n) && n >= 0;

function empty() {
  return { pearls: {}, seen: [], scenario: {}, match: false, last: '' };
}

// 存檔可能是舊版、被改過或壞掉：每個欄位都驗過才收，不合的丟掉
function sanitize(saved) {
  const s = empty();
  if (!isPlainObject(saved) || saved.v !== VERSION) return s;
  if (isPlainObject(saved.pearls)) {
    for (const [id, list] of Object.entries(saved.pearls)) {
      if (Array.isArray(list)) s.pearls[id] = [...new Set(list.filter(isIndex))];
    }
  }
  if (Array.isArray(saved.seen)) s.seen = [...new Set(saved.seen.filter((x) => typeof x === 'string'))];
  if (isPlainObject(saved.scenario)) {
    for (const [id, i] of Object.entries(saved.scenario)) if (isIndex(i)) s.scenario[id] = i;
  }
  s.match = saved.match === true;
  if (typeof saved.last === 'string') s.last = saved.last;
  return s;
}

export function createStore(storage) {
  const store = resolveStorage(storage);
  let s = sanitize(readJson(store, SAVE_KEY));
  const save = () => writeJson(store, SAVE_KEY, { v: VERSION, ...s });

  const isLit = (chId, idx) => (s.pearls[chId] || []).includes(idx);

  return {
    // 新點亮才回 true（畫面據此決定要不要播音效、更新計數）
    lightPearl(chId, idx) {
      if (!isIndex(idx) || isLit(chId, idx)) return false;
      (s.pearls[chId] ||= []).push(idx);
      save();
      return true;
    },
    isLit,
    litCount: (chId) => (s.pearls[chId] || []).length,
    totalLit: () => Object.values(s.pearls).reduce((sum, list) => sum + list.length, 0),

    markSeen(chId) {
      if (s.seen.includes(chId)) return;
      s.seen.push(chId);
      save();
    },
    isSeen: (chId) => s.seen.includes(chId),

    setScenario(chId, i) {
      if (!isIndex(i)) return;
      s.scenario[chId] = i;
      save();
    },
    getScenario: (chId) => (chId in s.scenario ? s.scenario[chId] : null),

    setMatchDone() { s.match = true; save(); },
    isMatchDone: () => s.match,

    setLast(route) { s.last = String(route); save(); },
    getLast: () => s.last,

    // 一善「圓滿」＝該章的功德寶珠全部點亮
    isVirtueComplete(chapter) {
      const list = benefitList(chapter);
      return Boolean(list) && list.items.every((_, i) => isLit(chapter.id, i));
    },
    completedVirtues(chapters) {
      return chapters
        .filter((c) => c.kind === 'virtue' && this.isVirtueComplete(c))
        .map((c) => c.virtue.index)
        .sort((a, b) => a - b);
    },

    reset() {
      s = empty();
      removeKey(store, SAVE_KEY);
    },
  };
}
