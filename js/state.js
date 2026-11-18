// 閱讀進度：點亮的寶珠、讀過的章、情境題的選擇、配對是否完成、上次讀到哪。
import { SAVE_KEY } from './config.js';
import { benefitList } from './book.js';
import { resolveStorage, tryRead, writeJson, removeKey, isPlainObject } from './storage.js';

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
  let s = sanitize(tryRead(store, SAVE_KEY).value);
  // 上一次寫入有沒有成功。寫不進去之後，storage 裡的就是舊資料，不能再拿來蓋掉手上的
  let synced = true;

  // 重新讀 storage：同一本書可能開在另一個分頁，那邊也在寫。
  // 每次要改之前都先讀一次再改，兩邊才不會拿著各自的舊資料互相蓋掉。
  function refresh() {
    if (!synced) return;
    const r = tryRead(store, SAVE_KEY);
    if (r.ok) s = sanitize(r.value);
  }
  function change(mutate) {
    refresh();
    mutate();
    synced = writeJson(store, SAVE_KEY, { v: VERSION, ...s }) || !store;
  }

  const isLit = (chId, idx) => (s.pearls[chId] || []).includes(idx);

  return {
    refresh,

    // 新點亮才回 true（畫面據此決定要不要播動畫）
    lightPearl(chId, idx) {
      if (!isIndex(idx)) return false;
      let fresh = false;
      change(() => {
        if (isLit(chId, idx)) return;
        (s.pearls[chId] ||= []).push(idx);
        fresh = true;
      });
      return fresh;
    },
    isLit,
    litCount: (chId) => (s.pearls[chId] || []).length,
    totalLit: () => Object.values(s.pearls).reduce((sum, list) => sum + list.length, 0),

    markSeen(chId) {
      if (s.seen.includes(chId)) return;
      change(() => { if (!s.seen.includes(chId)) s.seen.push(chId); });
    },
    isSeen: (chId) => s.seen.includes(chId),

    setScenario(chId, i) {
      if (!isIndex(i)) return;
      change(() => { s.scenario[chId] = i; });
    },
    getScenario: (chId) => (chId in s.scenario ? s.scenario[chId] : null),

    setMatchDone() { change(() => { s.match = true; }); },
    isMatchDone: () => s.match,

    setLast(route) {
      if (s.last === String(route)) return;
      change(() => { s.last = String(route); });
    },
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
      synced = true;
    },
  };
}
