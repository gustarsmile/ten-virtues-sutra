// @vitest-environment happy-dom
// 點圖放大在整本書裡的行為，以及寶珠條目上的補充說明。
// （大圖疊層本身的行為在 lightbox.test.js，歷程管理在 layer.test.js。）
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { loadBookFromDisk, memoryStorage } from './helpers/loadBook.js';
import { createApp } from '../js/app.js';
import { createStore } from '../js/state.js';
import { createDaily } from '../js/daily.js';
import { createSpeech } from '../js/speech.js';
import { benefitList } from '../js/book.js';
import { resetLayers } from '../js/ui/layer.js';

const book = loadBookFromDisk();
const flush = () => new Promise((r) => setTimeout(r, 0));

let root; let store; let app;
function boot() {
  window.location.hash = '';
  document.body.textContent = '';
  root = document.createElement('div');
  document.body.appendChild(root);
  store = createStore(memoryStorage());
  app = createApp({
    root, book, store,
    daily: createDaily(memoryStorage(), () => new Date(2026, 10, 18, 12)),
    speech: createSpeech({ synth: undefined, Utterance: undefined }),
    win: window,
  });
  app.render();
}
const $ = (sel) => root.querySelector(sel);
const $$ = (sel) => [...root.querySelectorAll(sel)];
const lb = () => document.querySelector('#lightbox');
const isOpen = () => !!lb()?.classList.contains('open');
const key = (k) => document.dispatchEvent(new window.KeyboardEvent('keydown', { key: k, bubbles: true }));

beforeEach(() => {
  resetLayers();
  vi.spyOn(window.history, 'back').mockImplementation(() => {
    setTimeout(() => window.dispatchEvent(new window.PopStateEvent('popstate', { state: null })), 0);
  });
  boot();
});
afterEach(async () => {
  if (isOpen()) lb().click(); // 走真正的關閉路徑，lightbox.js 才會把自己的狀態歸零
  app.destroy();
  resetLayers();
  await flush();
  vi.restoreAllMocks();
});

describe('點圖放大', () => {
  it('封面的圖可以放大', () => {
    const btn = $('.cover-art .zoom-btn');
    btn.click();
    expect(isOpen()).toBe(true);
    expect(lb().querySelector('.lightbox-img').src).toMatch(/\/assets\/art\/cover\.webp$/);
  });

  it('十五章的插圖都可以放大，大圖就是那一章的圖', () => {
    for (const ch of book.chapters) {
      app.go(`ch/${ch.no}`);
      $('.chapter .zoom-btn').click();
      expect(isOpen(), ch.id).toBe(true);
      expect(lb().querySelector('.lightbox-img').src.endsWith(`/assets/art/${ch.art}`), ch.id).toBe(true);
      expect(lb().querySelector('.lightbox-img').alt, ch.id).toBe(ch.alt);
      lb().click();
      expect(isOpen(), ch.id).toBe(false);
    }
  });

  it('大圖開著的時候，左右鍵不翻頁；關掉之後才恢復', () => {
    app.go('ch/3');
    $('.chapter .zoom-btn').click();
    key('ArrowRight'); key('ArrowLeft');
    expect(window.location.hash).toBe('#/ch/3');
    expect($('.chapter h1').textContent).toBe('離殺生');
    key('Escape');
    expect(isOpen()).toBe(false);
    expect(window.location.hash).toBe('#/ch/3'); // Esc 只關大圖，不離開這一頁
    key('ArrowRight');
    expect(window.location.hash).toBe('#/ch/4');
  });

  it('開關大圖不會動到網址（翻頁用的 hash 不變）', async () => {
    app.go('ch/5');
    $('.chapter .zoom-btn').click();
    expect(window.location.hash).toBe('#/ch/5');
    lb().click();
    await flush(); await flush();
    expect(window.location.hash).toBe('#/ch/5');
    expect($('.chapter h1').textContent).toBe('離邪行');
  });

  it('我的十善大地：還有雲霧時不能放大（放大就看光了）', () => {
    app.go('land');
    expect($('.land-frame .zoom-btn')).toBeNull();
    expect($$('.land-tile')).toHaveLength(10);
  });

  it('我的十善大地：十方都散開之後，整張圖可以放大', () => {
    for (const ch of book.chapters.filter((c) => c.kind === 'virtue')) {
      benefitList(ch).items.forEach((_, i) => store.lightPearl(ch.id, i));
    }
    app.go('land');
    expect($$('.land-tile')).toHaveLength(0);
    $('.land-frame .zoom-btn').click();
    expect(isOpen()).toBe(true);
    expect(lb().querySelector('.lightbox-img').src).toMatch(/\/assets\/art\/c15-earth\.webp$/);
  });
});

describe('app.destroy()', () => {
  it('拆掉之後，鍵盤和 hashchange 都不再讓它翻頁', () => {
    app.go('ch/3');
    app.destroy();
    key('ArrowRight');
    expect(window.location.hash).toBe('#/ch/3');
    window.location.hash = '#/ch/9';
    window.dispatchEvent(new Event('hashchange'));
    expect($('.chapter h1').textContent).toBe('離殺生'); // 畫面沒有跟著換
  });
});

describe('寶珠條目上的補充說明', () => {
  it('有說明的條目，點亮後連同白話一起顯示', () => {
    app.go('ch/7');
    const row = $$('.pearl-row')[2]; // 三、得不壞信，順本業故
    expect(row.querySelector('.plain').hidden).toBe(true);
    row.querySelector('.pearl').click();
    expect(row.querySelector('.plain').hidden).toBe(false);
    expect(row.querySelector('.collation').textContent).toContain('得信堅固，獲得信業果報故');
  });

  it('「唯歸依佛」那一條附有說明，不是要人輕視其他信仰', () => {
    app.go('ch/12');
    const row = $$('.pearl-row')[2];
    row.querySelector('.pearl').click();
    expect(row.querySelector('.collation').textContent).toContain('不是要人輕視其他信仰');
  });

  it('沒有說明的條目不會多出空的說明欄', () => {
    app.go('ch/3');
    $$('.pearl').forEach((p) => p.click());
    expect($$('.pearl-row .collation')).toHaveLength(0);
  });

  it('第 13 章「悉以慧捨」附有校勘', () => {
    app.go('ch/13');
    const row = $$('.fold-row')[7];
    row.querySelector('.fold-head').click();
    expect(row.querySelector('.collation').textContent).toContain('惠捨');
  });
});
