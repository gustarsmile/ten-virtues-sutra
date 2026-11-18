import { describe, it, expect } from 'vitest';
import { memoryStorage, brokenStorage } from './helpers/loadBook.js';
import { dateKey, createDaily } from '../js/daily.js';
import { DAILY_KEY } from '../js/config.js';

// 可以往後撥的時鐘
function clock(y, m, d, h = 12) {
  let t = new Date(y, m - 1, d, h, 0, 0);
  const now = () => new Date(t);
  now.addDays = (n) => { t = new Date(t.getFullYear(), t.getMonth(), t.getDate() + n, h, 0, 0); };
  now.set = (date) => { t = date; };
  return now;
}

describe('dateKey 用本地日期', () => {
  it('午夜前後各算各的一天', () => {
    expect(dateKey(new Date(2026, 10, 18, 23, 59, 59))).toBe('2026-11-18');
    expect(dateKey(new Date(2026, 10, 19, 0, 0, 1))).toBe('2026-11-19');
  });
  it('月、日補零', () => {
    expect(dateKey(new Date(2027, 0, 5, 8))).toBe('2027-01-05');
  });
});

describe('每日十善', () => {
  it('一開始十項都沒勾', () => {
    const d = createDaily(memoryStorage(), clock(2026, 11, 18));
    expect(d.today()).toEqual(Array(10).fill(false));
    expect(d.countToday()).toBe(0);
  });
  it('toggle 打勾、再點取消', () => {
    const d = createDaily(memoryStorage(), clock(2026, 11, 18));
    expect(d.toggle(0)).toBe(true);
    expect(d.toggle(9)).toBe(true);
    expect(d.countToday()).toBe(2);
    expect(d.toggle(0)).toBe(false);
    expect(d.countToday()).toBe(1);
    expect(d.today()[9]).toBe(true);
  });
  it('超出範圍的項目不理會', () => {
    const d = createDaily(memoryStorage(), clock(2026, 11, 18));
    expect(d.toggle(10)).toBe(false);
    expect(d.toggle(-1)).toBe(false);
    expect(d.countToday()).toBe(0);
  });
  it('換一天：今天重新開始，昨天的紀錄還在', () => {
    const now = clock(2026, 11, 18);
    const d = createDaily(memoryStorage(), now);
    d.toggle(0); d.toggle(1); d.toggle(2);
    now.addDays(1);
    expect(d.countToday()).toBe(0);
    const h = d.history(7);
    expect(h).toHaveLength(7);
    expect(h.at(-1)).toEqual({ key: '2026-11-19', count: null });
    expect(h.at(-2)).toEqual({ key: '2026-11-18', count: 3 });
    expect(h[0]).toEqual({ key: '2026-11-13', count: null });
  });
  it('開著網頁跨過午夜：勾的是新的一天', () => {
    const now = clock(2026, 11, 18, 23);
    const d = createDaily(memoryStorage(), now);
    d.toggle(0);
    now.set(new Date(2026, 10, 19, 0, 5));
    d.toggle(1);
    expect(d.today()).toEqual([false, true, ...Array(8).fill(false)]);
    expect(d.history(2)).toEqual([{ key: '2026-11-18', count: 1 }, { key: '2026-11-19', count: 1 }]);
  });
  it('重建之後資料還在', () => {
    const storage = memoryStorage();
    const now = clock(2026, 11, 18);
    createDaily(storage, now).toggle(4);
    expect(createDaily(storage, now).today()[4]).toBe(true);
  });
});

describe('連續天數', () => {
  it('今天和昨天都有做 → 2', () => {
    const now = clock(2026, 11, 17);
    const d = createDaily(memoryStorage(), now);
    d.toggle(0); now.addDays(1); d.toggle(0);
    expect(d.streak()).toBe(2);
  });
  it('今天還沒勾，但昨天、前天有 → 還是 2（今天還沒過完）', () => {
    const now = clock(2026, 11, 16);
    const d = createDaily(memoryStorage(), now);
    d.toggle(0); now.addDays(1); d.toggle(0); now.addDays(1);
    expect(d.streak()).toBe(2);
  });
  it('中斷一天 → 重新算', () => {
    const now = clock(2026, 11, 15);
    const d = createDaily(memoryStorage(), now);
    d.toggle(0); now.addDays(2); d.toggle(0);
    expect(d.streak()).toBe(1);
  });
  it('勾了又全部取消的那天不算', () => {
    const now = clock(2026, 11, 17);
    const d = createDaily(memoryStorage(), now);
    d.toggle(0); now.addDays(1); d.toggle(0); d.toggle(0);
    expect(d.streak()).toBe(1);
  });
  it('從來沒做過 → 0', () => {
    expect(createDaily(memoryStorage(), clock(2026, 11, 18)).streak()).toBe(0);
  });
});

describe('存檔', () => {
  it('只保留最近 90 天', () => {
    const storage = memoryStorage();
    const now = clock(2026, 1, 1);
    const d = createDaily(storage, now);
    for (let i = 0; i < 120; i += 1) { d.toggle(0); now.addDays(1); }
    d.toggle(0);
    const saved = JSON.parse(storage.getItem(DAILY_KEY));
    expect(Object.keys(saved.days).length).toBeLessThanOrEqual(90);
    expect(saved.days[dateKey(now())]).toBeTruthy();
  });
  it('storage 丟例外、沒有 storage、存檔是亂碼或型別不對，都不當機', () => {
    const now = clock(2026, 11, 18);
    for (const storage of [
      brokenStorage(), null,
      memoryStorage({ [DAILY_KEY]: '{oops' }),
      memoryStorage({ [DAILY_KEY]: JSON.stringify({ v: 1, days: 'x' }) }),
      memoryStorage({ [DAILY_KEY]: JSON.stringify({ v: 1, days: { '2026-11-18': 'yes', bad: [true] } }) }),
      memoryStorage({ [DAILY_KEY]: JSON.stringify({ v: 9, days: { '2026-11-18': Array(10).fill(true) } }) }),
    ]) {
      const d = createDaily(storage, now);
      expect(d.today()).toEqual(Array(10).fill(false));
      expect(d.toggle(3)).toBe(true);
      expect(d.countToday()).toBe(1);
      expect(d.streak()).toBe(1);
    }
  });
});
