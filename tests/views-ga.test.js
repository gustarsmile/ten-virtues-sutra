// @vitest-environment happy-dom
// 換頁時送 GA 的 page_view：每一章有自己的標題和網址，GA 報表才看得出各章有多少人讀。
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { loadBookFromDisk, memoryStorage } from './helpers/loadBook.js';
import { createApp, pageViewUrl } from '../js/app.js';
import { createStore } from '../js/state.js';
import { createDaily } from '../js/daily.js';
import { createSpeech } from '../js/speech.js';

const book = loadBookFromDisk();
let app; let gtag;

function boot({ hash = '', embedded = false } = {}) {
  app?.destroy();
  window.location.hash = hash;
  document.body.textContent = '';
  const root = document.createElement('div');
  document.body.appendChild(root);
  app = createApp({
    root, book, embedded,
    store: createStore(memoryStorage()),
    daily: createDaily(memoryStorage(), () => new Date(2026, 10, 19, 12)),
    speech: createSpeech({ synth: undefined, Utterance: undefined }),
    win: window,
  });
  app.render();
}
const pageViews = () => gtag.mock.calls.filter((c) => c[0] === 'event' && c[1] === 'page_view').map((c) => c[2]);

beforeEach(() => {
  gtag = vi.fn();
  window.gtag = gtag; // index.html 的 Google 代碼會定義這個全域函式
});
afterEach(() => {
  app?.destroy();
  app = null;
  delete window.gtag;
});

describe('pageViewUrl', () => {
  it('用書頁的路由當成網址路徑（不放 #），GA 的「網頁路徑」才分得開各章', () => {
    const base = `${window.location.origin}${window.location.pathname}`;
    expect(pageViewUrl(window.location, 'ch/3')).toBe(`${base}ch/3`);
    expect(pageViewUrl(window.location, '')).toBe(base);
    expect(pageViewUrl({ origin: 'https://edu.omilkyway.org', pathname: '/ten-virtues-sutra/' }, 'land'))
      .toBe('https://edu.omilkyway.org/ten-virtues-sutra/land');
  });
  it('pathname 不是斜線結尾（例如 /index.html）也接得對', () => {
    expect(pageViewUrl({ origin: 'https://x.org', pathname: '/book/index.html' }, 'ch/1')).toBe('https://x.org/book/ch/1');
  });
});

describe('換頁時送 page_view', () => {
  it('第一次載入不送（Google 代碼自己會送第一筆）', () => {
    boot();
    expect(pageViews()).toEqual([]);
  });
  it('每翻到新的一頁送一筆，標題是那一頁的章名', () => {
    boot();
    app.go('ch/3');
    app.go('ch/4');
    app.go('match');
    const titles = pageViews().map((p) => p.page_title);
    expect(titles).toEqual(['離殺生｜十善業道經', '離偷盜｜十善業道經', '十善配對｜十善業道經']);
    expect(pageViews()[0].page_location).toBe(pageViewUrl(window.location, 'ch/3'));
  });
  it('同一頁重畫（例如每日十善跨日時整頁換成今天）不重複送', () => {
    boot();
    app.go('daily');
    app.go('daily');
    app.render();
    expect(pageViews()).toHaveLength(1);
  });
  it('瀏覽器上一頁（hashchange）也算一次換頁', () => {
    boot({ hash: '#/ch/5' });
    window.location.hash = '#/ch/6';
    window.dispatchEvent(new Event('hashchange'));
    expect(pageViews().map((p) => p.page_title)).toEqual(['離妄語｜十善業道經']);
  });
  it('回到封面也送（標題是書名）', () => {
    boot({ hash: '#/ch/1' });
    app.go('');
    expect(pageViews().map((p) => p.page_title)).toEqual(['十善業道經｜互動電子書']);
  });
  it('嵌在別的網頁裡一樣會送', () => {
    boot({ embedded: true });
    const replace = vi.spyOn(window.location, 'replace').mockImplementation((h) => { window.location.hash = h; });
    app.go('ch/2');
    expect(pageViews().map((p) => p.page_title)).toEqual(['一法｜十善業道經']);
    replace.mockRestore();
  });
  it('沒有 Google 代碼（被擋廣告的外掛擋掉、離線）時什麼都不做，也不會出錯', () => {
    delete window.gtag;
    boot();
    expect(() => app.go('ch/3')).not.toThrow();
  });
  it('gtag 本身丟例外也不影響翻頁', () => {
    window.gtag = () => { throw new Error('blocked'); };
    boot();
    expect(() => app.go('ch/3')).not.toThrow();
    expect(document.querySelector('.chapter h1').textContent).toBe('離殺生');
  });
});
