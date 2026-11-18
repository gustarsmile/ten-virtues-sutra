// @vitest-environment happy-dom
// 實際使用時才會遇到的狀況：手機觸控、放著過夜、開兩個分頁、嵌在別的網頁裡、鍵盤操作。
// （獨立程式審查 2026-11-18 找到的問題，一條一組測試。）
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { loadBookFromDisk, memoryStorage } from './helpers/loadBook.js';
import { createApp } from '../js/app.js';
import { createStore } from '../js/state.js';
import { createDaily } from '../js/daily.js';
import { createSpeech } from '../js/speech.js';
import { rawWithTerms } from '../js/ui/gloss.js';
import { resetLayers } from '../js/ui/layer.js';
import { BOOK_URL, SAVE_KEY } from '../js/config.js';

const book = loadBookFromDisk();
const flush = () => new Promise((r) => setTimeout(r, 0));

let root; let store; let daily; let app; let now; let bookStorage; let dailyStorage;
function boot({ embedded = false, hash = '' } = {}) {
  app?.destroy();
  window.location.hash = hash;
  document.body.textContent = '';
  root = document.createElement('div');
  root.id = 'app';
  document.body.appendChild(root);
  bookStorage = memoryStorage();
  dailyStorage = memoryStorage();
  now = new Date(2026, 10, 18, 22, 0);
  store = createStore(bookStorage);
  daily = createDaily(dailyStorage, () => new Date(now));
  app = createApp({ root, book, store, daily, speech: createSpeech({ synth: undefined, Utterance: undefined }), win: window, embedded });
  app.render();
}
const $ = (sel) => root.querySelector(sel);
const $$ = (sel) => [...root.querySelectorAll(sel)];
const lb = () => document.querySelector('#lightbox');
const isOpen = () => !!lb()?.classList.contains('open');

// 觸控事件：happy-dom 沒有 TouchEvent，用一般事件掛上 touches／changedTouches
function touch(type, target, points, changed = points) {
  const e = new window.Event(type, { bubbles: true });
  Object.defineProperty(e, 'touches', { value: points });
  Object.defineProperty(e, 'changedTouches', { value: changed });
  target.dispatchEvent(e);
}
const pt = (x, y, id = 1) => ({ identifier: id, clientX: x, clientY: y });
function swipe(fromX, toX, { y = 300, toY = y, target = $('.view') } = {}) {
  touch('touchstart', target, [pt(fromX, y)]);
  touch('touchend', target, [], [pt(toX, toY)]);
}
function key(k, init = {}) {
  document.dispatchEvent(new window.KeyboardEvent('keydown', { key: k, bubbles: true, ...init }));
}

beforeEach(() => {
  resetLayers();
  vi.spyOn(window.history, 'back').mockImplementation(() => {
    setTimeout(() => window.dispatchEvent(new window.PopStateEvent('popstate', { state: null })), 0);
  });
  Object.defineProperty(window, 'innerWidth', { value: 390, configurable: true });
  boot();
});
afterEach(async () => {
  if (isOpen()) lb().click();
  resetLayers();
  await flush();
  vi.restoreAllMocks();
});

describe('左右滑翻頁', () => {
  it('單指快速左滑到下一頁、右滑回上一頁', () => {
    app.go('ch/3');
    swipe(300, 120);
    expect(window.location.hash).toBe('#/ch/4');
    swipe(120, 300);
    expect(window.location.hash).toBe('#/ch/3');
  });
  it('兩指（捏合縮放、兩指點一下）不翻頁', () => {
    app.go('ch/3');
    const view = $('.view');
    touch('touchstart', view, [pt(300, 300, 1)]);
    touch('touchstart', view, [pt(300, 300, 1), pt(320, 300, 2)], [pt(320, 300, 2)]);
    touch('touchend', view, [pt(120, 300, 1)], [pt(140, 300, 2)]); // 一指先放開
    touch('touchend', view, [], [pt(120, 300, 1)]);
    expect(window.location.hash).toBe('#/ch/3');
  });
  it('放開的不是當初按下的那根手指，不翻頁', () => {
    app.go('ch/3');
    touch('touchstart', $('.view'), [pt(300, 300, 1)]);
    touch('touchend', $('.view'), [], [pt(100, 300, 7)]);
    expect(window.location.hash).toBe('#/ch/3');
  });
  it('慢慢拖（長按選字、慢慢移）不翻頁', () => {
    app.go('ch/3');
    const t0 = 1_800_000_000_000;
    const clock = vi.spyOn(Date, 'now').mockReturnValue(t0);
    touch('touchstart', $('.view'), [pt(300, 300)]);
    clock.mockReturnValue(t0 + 900);
    touch('touchend', $('.view'), [], [pt(100, 300)]);
    expect(window.location.hash).toBe('#/ch/3');
  });
  it('主要是上下捲動時不翻頁；位移太短也不翻', () => {
    app.go('ch/3');
    swipe(300, 180, { toY: 420 }); // 斜著滑
    swipe(300, 240);               // 只滑了 60px
    expect(window.location.hash).toBe('#/ch/3');
  });
  it('從螢幕邊緣開始的滑動留給系統（iPhone 的返回手勢）', () => {
    app.go('ch/3');
    swipe(8, 250);
    swipe(385, 150);
    expect(window.location.hash).toBe('#/ch/3');
  });
  it('頁面被兩指放大時，左右滑是在平移畫面，不翻頁', () => {
    app.go('ch/3');
    Object.defineProperty(window, 'visualViewport', { value: { scale: 2 }, configurable: true });
    swipe(300, 100);
    expect(window.location.hash).toBe('#/ch/3');
    Object.defineProperty(window, 'visualViewport', { value: undefined, configurable: true });
  });
  it('正在選字時不翻頁', () => {
    app.go('ch/3');
    vi.spyOn(window, 'getSelection').mockReturnValue({ toString: () => '若離殺生' });
    swipe(300, 100);
    expect(window.location.hash).toBe('#/ch/3');
  });
  it('在配對盤面上拖曳不翻頁', () => {
    app.go('match');
    swipe(300, 100, { target: $('.match-board button') });
    expect(window.location.hash).toBe('#/match');
  });
  it('touchcancel 之後的 touchend 不算數', () => {
    app.go('ch/3');
    touch('touchstart', $('.view'), [pt(300, 300)]);
    touch('touchcancel', $('.view'), [], [pt(300, 300)]);
    touch('touchend', $('.view'), [], [pt(100, 300)]);
    expect(window.location.hash).toBe('#/ch/3');
  });
});

describe('鍵盤翻頁', () => {
  it('Shift＋方向鍵是在延伸選取，不翻頁', () => {
    app.go('ch/3');
    key('ArrowRight', { shiftKey: true });
    expect(window.location.hash).toBe('#/ch/3');
  });
  it('按住不放的連發不會一路翻到最後一頁', () => {
    app.go('ch/3');
    key('ArrowRight');
    for (let i = 0; i < 20; i += 1) key('ArrowRight', { repeat: true });
    expect(window.location.hash).toBe('#/ch/4');
    expect(store.isSeen('ch06')).toBe(false);
  });
  it('翻頁後焦點移到新頁的標題（螢幕閱讀器會唸出新的一頁，鍵盤也不會迷路）', () => {
    app.go('ch/3');
    expect(document.activeElement).toBe($('.chapter h1'));
    expect($('.chapter h1').getAttribute('tabindex')).toBe('-1');
    app.go('toc');
    expect(document.activeElement).toBe($('.toc h1'));
  });
  it('一開始載入時不搶焦點', () => {
    boot({ hash: '#/ch/5' });
    expect(document.activeElement).not.toBe($('.chapter h1'));
  });
});

describe('每日十善放著過夜', () => {
  it('跨過午夜後打勾：畫面換成新的一天，只有剛勾的那一項，昨天的紀錄還在', () => {
    app.go('daily');
    $$('.daily-item input')[0].click();
    $$('.daily-item input')[1].click();
    $$('.daily-item input')[2].click();
    expect($('.daily-count').textContent).toContain('3／10');

    now = new Date(2026, 10, 19, 7, 30); // 隔天早上，分頁沒關
    $$('.daily-item input')[5].click();

    expect(root.textContent).toContain('2026 年 11 月 19 日');
    expect($('.daily-count').textContent).toContain('1／10');
    expect($$('.daily-item input').map((b) => b.checked)).toEqual([false, false, false, false, false, true, false, false, false, false]);
    expect(daily.history(2)).toEqual([{ key: '2026-11-18', count: 3 }, { key: '2026-11-19', count: 1 }]);
  });
  it('跨過午夜後想取消昨天勾的那一項：不會變成在今天打勾', () => {
    app.go('daily');
    $$('.daily-item input')[0].click();
    now = new Date(2026, 10, 19, 7, 30);
    $$('.daily-item input')[0].click(); // 畫面上還是昨天的勾，使用者點它想取消
    expect($$('.daily-item input')[0].checked).toBe(false);
    expect(daily.countToday()).toBe(0);
    expect(daily.history(2)[0]).toEqual({ key: '2026-11-18', count: 1 });
  });
  it('分頁切回來時（visibilitychange），每日十善會換成今天', () => {
    app.go('daily');
    $$('.daily-item input')[0].click();
    now = new Date(2026, 10, 19, 7, 30);
    document.dispatchEvent(new window.Event('visibilitychange'));
    expect(root.textContent).toContain('2026 年 11 月 19 日');
    expect($$('.daily-item input').some((b) => b.checked)).toBe(false);
  });
  it('切回來時如果在別的頁面，不會把人捲回最上面（不重畫）', () => {
    app.go('ch/3');
    const before = $('.chapter');
    document.dispatchEvent(new window.Event('visibilitychange'));
    expect($('.chapter')).toBe(before);
  });
});

describe('同時開兩個分頁', () => {
  it('另一個分頁點亮寶珠後，這邊收到 storage 事件會更新頂列的數字', () => {
    app.go('ch/3');
    const other = createStore(bookStorage);
    for (let i = 0; i < 10; i += 1) other.lightPearl('ch04', i);
    window.dispatchEvent(new window.StorageEvent('storage', { key: SAVE_KEY }));
    expect($('.tb-pearls').textContent).toContain('10／71');
  });
  it('這邊再點一顆，不會把另一個分頁的進度蓋掉', () => {
    app.go('ch/3');
    const other = createStore(bookStorage);
    for (let i = 0; i < 10; i += 1) other.lightPearl('ch04', i);
    $$('.pearl')[0].click();
    expect($('.tb-pearls').textContent).toContain('11／71');
    expect(createStore(bookStorage).totalLit()).toBe(11);
  });
  it('這一顆已經在另一個分頁點亮了：這邊點它，畫面也會亮起來', () => {
    app.go('ch/3');
    createStore(bookStorage).lightPearl('ch03', 0);
    $$('.pearl')[0].click();
    expect($$('.pearl')[0].classList.contains('lit')).toBe(true);
    expect($$('.pearl-row .plain')[0].hidden).toBe(false);
    expect($('.pearl-count').textContent).toContain('1／10');
  });
  it('和這本書無關的 storage 事件不理會', () => {
    app.go('ch/3');
    const spy = vi.spyOn(store, 'refresh');
    window.dispatchEvent(new window.StorageEvent('storage', { key: 'someone-else' }));
    expect(spy).not.toHaveBeenCalled();
  });
});

describe('嵌在別的網頁裡（iframe）', () => {
  it('翻頁用 replace，不替外面的網頁多塞「上一頁」', () => {
    boot({ embedded: true });
    const replace = vi.spyOn(window.location, 'replace').mockImplementation((h) => { window.location.hash = h; });
    app.go('ch/1'); app.go('ch/2'); app.go('ch/3');
    expect(replace.mock.calls.map((c) => c[0])).toEqual(['#/ch/1', '#/ch/2', '#/ch/3']);
    expect($('.chapter h1').textContent).toBe('離殺生');
  });
  it('不是嵌入時照常留下瀏覽歷程（返回鍵可以回上一頁）', () => {
    const replace = vi.spyOn(window.location, 'replace');
    app.go('ch/1'); app.go('ch/2');
    expect(replace).not.toHaveBeenCalled();
  });
  it('封面提醒：在新分頁開啟，進度保存得比較久', () => {
    boot({ embedded: true });
    const link = $('.embed-note a');
    expect(link.getAttribute('href')).toBe(BOOK_URL);
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toContain('noopener');
  });
  it('不是嵌入時沒有這段提醒', () => {
    expect($('.embed-note')).toBeNull();
  });
  it('關於本書說明：隔一段時間沒回來、或嵌在別的網頁裡，紀錄可能被瀏覽器清掉', () => {
    app.go('about');
    expect(root.textContent).toContain('Safari');
    expect(root.textContent).toContain('不會上傳');
  });
});

describe('點一列時，不要誤觸', () => {
  it('第 14 章：點已經展開的白話不會把它收起來', () => {
    app.go('ch/14');
    const row = $$('.fold-row')[0];
    row.querySelector('.fold-head').click();
    row.querySelector('.plain p').click();
    expect(row.querySelector('.plain').hidden).toBe(false);
  });
  it('第 14 章：點原文那一行還是可以展開', () => {
    app.go('ch/14');
    const row = $$('.fold-row')[1];
    row.querySelector('.raw-line').click();
    expect(row.querySelector('.plain').hidden).toBe(false);
  });
  it('拖曳選取經文時不會點亮寶珠，也不會展開', () => {
    vi.spyOn(window, 'getSelection').mockReturnValue({ toString: () => '於諸眾生' });
    app.go('ch/3');
    $$('.pearl-row .raw-line')[0].click();
    expect(store.totalLit()).toBe(0);
    app.go('ch/14');
    $$('.fold-row .raw-line')[0].click();
    expect($$('.fold-row .plain')[0].hidden).toBe(true);
  });
  it('直接點寶珠那顆按鈕，就算有選取也照樣點亮（那是明確的操作）', () => {
    vi.spyOn(window, 'getSelection').mockReturnValue({ toString: () => '於諸眾生' });
    app.go('ch/3');
    $$('.pearl')[0].click();
    expect(store.totalLit()).toBe(1);
  });
});

describe('大圖開著的時候，後面的頁面不能操作', () => {
  it('頁面設成 inert，關掉後恢復', () => {
    app.go('ch/3');
    $('.chapter .zoom-btn').click();
    expect(root.inert).toBe(true);
    lb().click();
    expect(root.inert).toBe(false);
  });
  it('就算有人按到後面的「下一頁」，也不會翻頁', () => {
    app.go('ch/3');
    $('.chapter .zoom-btn').click();
    $('[data-action="next"]').click();
    app.go('toc');
    expect(window.location.hash).toBe('#/ch/3');
    expect(isOpen()).toBe(true);
  });
});

describe('難詞', () => {
  it('不是用 <button>（按鈕裡的字不能斷行，長詞會把一行撐壞），但鍵盤一樣能操作', () => {
    app.go('ch/3');
    const term = $$('.term').find((t) => t.textContent === '阿耨多羅三藐三菩提');
    expect(term.tagName).toBe('SPAN');
    expect(term.getAttribute('role')).toBe('button');
    expect(term.getAttribute('tabindex')).toBe('0');
    term.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(term.getAttribute('aria-expanded')).toBe('true');
    expect($('.gloss-note:not([hidden])').textContent).toContain('無上正等正覺');
    term.dispatchEvent(new window.KeyboardEvent('keydown', { key: ' ', bubbles: true }));
    expect(term.getAttribute('aria-expanded')).toBe('false');
  });
  it('在難詞上按方向鍵不會被當成開關', () => {
    app.go('ch/3');
    const term = $$('.term')[0];
    term.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
    expect(term.getAttribute('aria-expanded')).toBe('false');
  });
  it('資料裡引用的每一個詞條，都真的畫成了可以點的字（沒有因為位置重疊被吃掉）', () => {
    let total = 0;
    for (const ch of book.chapters) {
      for (const b of ch.blocks) {
        for (const t of b.type === 'list' ? b.items : [b]) {
          const want = (t.terms || []).length;
          const { node } = rawWithTerms(t.raw, t.terms, book.glossary);
          expect(node.querySelectorAll('.term').length, `${ch.id}｜${t.raw.slice(0, 12)}`).toBe(want);
          expect(node.textContent, ch.id).toBe(t.raw);
          total += want;
        }
      }
    }
    expect(total).toBeGreaterThan(100);
  });
});

describe('我的十善大地：圖載不到', () => {
  it('雲霧格子還在、還能點去各章（只是底下沒有圖）', () => {
    app.go('land');
    $('.land-frame img').dispatchEvent(new window.Event('error'));
    expect($('.land-frame').classList.contains('art-missing')).toBe(true);
    expect($$('.land-tile')).toHaveLength(10);
    $$('.land-tile')[2].click();
    expect(window.location.hash).toBe('#/ch/5');
  });
});
