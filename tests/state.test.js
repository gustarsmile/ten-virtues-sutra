import { describe, it, expect } from 'vitest';
import { loadBookFromDisk, memoryStorage, brokenStorage } from './helpers/loadBook.js';
import { createStore } from '../js/state.js';
import { SAVE_KEY, TOTAL_PEARLS } from '../js/config.js';

const { chapters } = loadBookFromDisk();
const ch3 = chapters[2];

describe('寶珠', () => {
  it('點亮一顆：第一次回 true，重複點回 false，只算一顆', () => {
    const s = createStore(memoryStorage());
    expect(s.lightPearl('ch03', 0)).toBe(true);
    expect(s.lightPearl('ch03', 0)).toBe(false);
    expect(s.isLit('ch03', 0)).toBe(true);
    expect(s.isLit('ch03', 1)).toBe(false);
    expect(s.litCount('ch03')).toBe(1);
    expect(s.totalLit()).toBe(1);
  });
  it('各章分開計數，總數加總', () => {
    const s = createStore(memoryStorage());
    s.lightPearl('ch03', 0); s.lightPearl('ch03', 5); s.lightPearl('ch04', 2);
    expect(s.litCount('ch03')).toBe(2);
    expect(s.litCount('ch04')).toBe(1);
    expect(s.litCount('ch05')).toBe(0);
    expect(s.totalLit()).toBe(3);
  });
  it('該章寶珠全亮才算圓滿', () => {
    const s = createStore(memoryStorage());
    for (let i = 0; i < 9; i += 1) s.lightPearl('ch03', i);
    expect(s.isVirtueComplete(ch3)).toBe(false);
    s.lightPearl('ch03', 9);
    expect(s.isVirtueComplete(ch3)).toBe(true);
    expect(s.completedVirtues(chapters)).toEqual([1]);
  });
  it('十善全部圓滿時，總數是 71', () => {
    const s = createStore(memoryStorage());
    for (const ch of chapters.filter((c) => c.kind === 'virtue')) {
      const n = ch.blocks.find((b) => b.role === 'benefits').items.length;
      for (let i = 0; i < n; i += 1) s.lightPearl(ch.id, i);
    }
    expect(s.totalLit()).toBe(TOTAL_PEARLS);
    expect(s.completedVirtues(chapters)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });
  it('非十善的章節不會被算成圓滿的一善', () => {
    const s = createStore(memoryStorage());
    expect(s.isVirtueComplete(chapters[0])).toBe(false);
  });
});

describe('其他進度', () => {
  it('已讀、情境題、配對、上次位置', () => {
    const s = createStore(memoryStorage());
    expect(s.isSeen('ch01')).toBe(false);
    s.markSeen('ch01'); s.markSeen('ch01');
    expect(s.isSeen('ch01')).toBe(true);

    expect(s.getScenario('ch03')).toBeNull();
    s.setScenario('ch03', 0);
    expect(s.getScenario('ch03')).toBe(0); // 0 是有效答案，不能被當成沒答
    s.setScenario('ch03', 2);
    expect(s.getScenario('ch03')).toBe(2);

    expect(s.isMatchDone()).toBe(false);
    s.setMatchDone();
    expect(s.isMatchDone()).toBe(true);

    expect(s.getLast()).toBe('');
    s.setLast('ch/5');
    expect(s.getLast()).toBe('ch/5');
  });
});

describe('保存', () => {
  it('重建 store 之後資料還在', () => {
    const storage = memoryStorage();
    const a = createStore(storage);
    a.lightPearl('ch03', 3); a.markSeen('ch02'); a.setScenario('ch04', 1); a.setMatchDone(); a.setLast('ch/4');
    const b = createStore(storage);
    expect(b.isLit('ch03', 3)).toBe(true);
    expect(b.isSeen('ch02')).toBe(true);
    expect(b.getScenario('ch04')).toBe(1);
    expect(b.isMatchDone()).toBe(true);
    expect(b.getLast()).toBe('ch/4');
  });
  it('reset 清空並移除存檔', () => {
    const storage = memoryStorage();
    const s = createStore(storage);
    s.lightPearl('ch03', 0);
    s.reset();
    expect(s.totalLit()).toBe(0);
    expect(storage.getItem(SAVE_KEY)).toBeNull();
    expect(createStore(storage).totalLit()).toBe(0);
  });
});

describe('存檔出問題時不當機', () => {
  it('storage 一碰就丟例外：功能照常，只是不保存', () => {
    const s = createStore(brokenStorage());
    expect(s.lightPearl('ch03', 0)).toBe(true);
    expect(s.litCount('ch03')).toBe(1);
    expect(() => s.reset()).not.toThrow();
  });
  it('沒有 storage（傳 null）也能用', () => {
    const s = createStore(null);
    s.setLast('ch/2');
    expect(s.getLast()).toBe('ch/2');
  });
  it.each([
    ['亂碼', '{not json'],
    ['舊版號', JSON.stringify({ v: 0, pearls: { ch03: [0, 1] } })],
    ['不是物件', '"hello"'],
    ['null', 'null'],
    ['欄位型別不對', JSON.stringify({ v: 1, pearls: 'x', seen: 5, scenario: [], match: 'yes', last: 42 })],
  ])('存檔內容是%s → 當成沒有存檔', (_, raw) => {
    const s = createStore(memoryStorage({ [SAVE_KEY]: raw }));
    expect(s.totalLit()).toBe(0);
    expect(s.getLast()).toBe('');
    expect(s.isMatchDone()).toBe(false);
    expect(s.lightPearl('ch03', 0)).toBe(true);
  });
  it('存檔裡的寶珠索引不合理（負數、小數、字串、重複）會被丟掉', () => {
    const raw = JSON.stringify({ v: 1, pearls: { ch03: [0, 0, -1, 1.5, '2', 3] }, seen: [], scenario: {}, match: false, last: '' });
    const s = createStore(memoryStorage({ [SAVE_KEY]: raw }));
    expect(s.litCount('ch03')).toBe(2); // 只留 0 和 3
  });
});

describe('同時開兩個分頁（共用同一份存檔）', () => {
  it('兩邊各自點寶珠，不會互相蓋掉', () => {
    const storage = memoryStorage();
    const a = createStore(storage);
    const b = createStore(storage);
    for (let i = 0; i < 10; i += 1) b.lightPearl('ch04', i);
    a.lightPearl('ch03', 0); // a 的記憶體裡還沒有 b 的進度
    expect(createStore(storage).totalLit()).toBe(11);
    expect(a.totalLit()).toBe(11);
  });
  it('已讀、情境題、配對、上次位置也一樣不互蓋', () => {
    const storage = memoryStorage();
    const a = createStore(storage);
    const b = createStore(storage);
    b.markSeen('ch05'); b.setScenario('ch05', 2); b.setMatchDone();
    a.markSeen('ch03'); a.setScenario('ch03', 1); a.setLast('ch/3');
    const fresh = createStore(storage);
    expect(fresh.isSeen('ch05') && fresh.isSeen('ch03')).toBe(true);
    expect(fresh.getScenario('ch05')).toBe(2);
    expect(fresh.getScenario('ch03')).toBe(1);
    expect(fresh.isMatchDone()).toBe(true);
    expect(fresh.getLast()).toBe('ch/3');
  });
  it('refresh() 之後看得到另一個分頁的進度', () => {
    const storage = memoryStorage();
    const a = createStore(storage);
    createStore(storage).lightPearl('ch04', 3);
    expect(a.totalLit()).toBe(0);
    a.refresh();
    expect(a.isLit('ch04', 3)).toBe(true);
  });
  it('另一個分頁清除進度後，這邊 refresh 也跟著清空', () => {
    const storage = memoryStorage();
    const a = createStore(storage);
    a.lightPearl('ch03', 0);
    createStore(storage).reset();
    a.refresh();
    expect(a.totalLit()).toBe(0);
  });
  it('這顆在另一個分頁已經點亮：這邊再點回 false（不重複計數）', () => {
    const storage = memoryStorage();
    const a = createStore(storage);
    createStore(storage).lightPearl('ch03', 0);
    expect(a.lightPearl('ch03', 0)).toBe(false);
    expect(a.litCount('ch03')).toBe(1);
  });
});

describe('存不進去的時候', () => {
  it('寫入失敗（容量滿了）：之後的操作不會被 storage 裡的舊資料蓋掉', () => {
    const old = JSON.stringify({ v: 1, pearls: { ch03: [0] }, seen: [], scenario: {}, match: false, last: '' });
    const storage = { getItem: () => old, setItem: () => { throw new Error('QuotaExceededError'); }, removeItem: () => {} };
    const s = createStore(storage);
    expect(s.totalLit()).toBe(1);
    s.lightPearl('ch03', 1);
    s.lightPearl('ch03', 2);
    expect(s.litCount('ch03')).toBe(3); // 沒有因為重讀舊存檔而掉回 1 或 2
    s.refresh();
    expect(s.litCount('ch03')).toBe(3);
  });
  it('讀得到但一直丟例外的 storage：refresh 不會清掉記憶體裡的進度', () => {
    const s = createStore(brokenStorage());
    s.lightPearl('ch03', 0);
    s.refresh();
    expect(s.totalLit()).toBe(1);
  });
});
