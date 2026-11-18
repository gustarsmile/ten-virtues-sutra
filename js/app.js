// 組裝：依 hash 路由畫出對應的頁面，並管理頂列、翻頁鍵與滑動手勢。
import { parseRoute, toHash } from './router.js';
import { pages, nextRoute, prevRoute } from './book.js';
import { BOOK_TITLE, TOTAL_PEARLS } from './config.js';
import { el, button, append } from './ui/dom.js';
import { renderCover } from './ui/coverView.js';
import { renderToc } from './ui/tocView.js';
import { renderChapter } from './ui/chapterView.js';
import { renderMatch } from './ui/matchView.js';
import { renderLand } from './ui/landView.js';
import { renderDaily } from './ui/dailyView.js';
import { renderAbout } from './ui/aboutView.js';

const FIXED_TITLES = { toc: '目錄', match: '十善配對', land: '我的十善大地', daily: '每日十善', about: '關於本書' };

export function routeTitle(book, route) {
  if (route === '' || route == null) return '封面';
  const r = parseRoute(toHash(route), book.chapters.length);
  return r.name === 'ch' ? book.chapters[r.no - 1].title : FIXED_TITLES[r.name] || '封面';
}

export function createApp({ root, book, store, daily, speech, win = globalThis.window }) {
  const doc = root.ownerDocument;
  const order = pages(book.chapters);
  let current = null;

  // 頂列：目錄｜書名（回封面）｜寶珠數（到十善大地）
  const topbar = el('header', 'topbar');
  const pearls = button(null, 'tb-pearls', () => go('land'));
  append(
    topbar,
    button('目錄', 'tb-btn', () => go('toc')),
    button(BOOK_TITLE, 'tb-title', () => go('')),
    pearls,
  );
  const view = el('div', 'view');
  root.textContent = '';
  append(root, topbar, view);

  function refreshTopbar() {
    const n = store.totalLit();
    pearls.textContent = `寶珠 ${n}／${TOTAL_PEARLS}`;
    pearls.setAttribute('aria-label', `已點亮 ${n} 顆寶珠，共 ${TOTAL_PEARLS} 顆。前往十善大地`);
  }

  const ctx = {
    book, store, daily, speech, go, refreshTopbar,
    routeTitle: (route) => routeTitle(book, route),
    isPage: (route) => order.includes(route),
    next: (route) => nextRoute(book.chapters, route),
    prev: (route) => prevRoute(book.chapters, route),
  };

  function render() {
    speech.stop(); // 翻頁就停止朗讀
    const r = parseRoute(win.location.hash, book.chapters.length);
    current = r.route;
    view.textContent = '';
    topbar.hidden = r.name === 'cover';

    // 記下讀到哪：只記「書頁」（各章、配對、大地），目錄和每日十善不算
    if (order.includes(r.route)) store.setLast(r.route);
    if (r.name === 'ch') store.markSeen(book.chapters[r.no - 1].id);

    if (r.name === 'ch') renderChapter(view, ctx, r.no);
    else if (r.name === 'toc') renderToc(view, ctx);
    else if (r.name === 'match') renderMatch(view, ctx);
    else if (r.name === 'land') renderLand(view, ctx);
    else if (r.name === 'daily') renderDaily(view, ctx);
    else if (r.name === 'about') renderAbout(view, ctx);
    else renderCover(view, ctx);

    refreshTopbar();
    preloadNext(r.route);
    doc.title = r.name === 'cover' ? `${BOOK_TITLE}｜互動電子書` : `${routeTitle(book, r.route)}｜${BOOK_TITLE}`;
    try { win.scrollTo(0, 0); } catch { /* 測試環境沒有捲動 */ }
  }

  function preloadNext(route) {
    const next = parseRoute(toHash(ctx.next(route) ?? ''), book.chapters.length);
    const file = next.name === 'ch' ? book.chapters[next.no - 1].art
      : next.name === 'land' ? book.chapters.find((c) => c.kind === 'earth').art : null;
    if (file && typeof win.Image === 'function') new win.Image().src = `assets/art/${file}`;
  }

  function go(route) {
    if (route == null) return;
    const hash = toHash(route);
    if (win.location.hash !== hash) win.location.hash = hash;
    render();
  }

  // 瀏覽器的上一頁／下一頁、手動改網址。go() 自己已經畫過的不重畫
  win.addEventListener('hashchange', () => {
    if (parseRoute(win.location.hash, book.chapters.length).route !== current) render();
  });

  // 鍵盤左右鍵翻頁（正在打字或操作控制項時不搶）
  doc.addEventListener('keydown', (e) => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.target?.closest?.('input, textarea, select')) return;
    const to = e.key === 'ArrowRight' ? ctx.next(current) : e.key === 'ArrowLeft' ? ctx.prev(current) : undefined;
    if (to != null) go(to);
  });

  // 手機左右滑翻頁：水平位移要夠長、而且明顯大於垂直位移，避免上下捲動時誤翻
  let start = null;
  view.addEventListener('touchstart', (e) => {
    const t = e.changedTouches?.[0];
    start = t ? { x: t.clientX, y: t.clientY } : null;
  }, { passive: true });
  view.addEventListener('touchend', (e) => {
    const t = e.changedTouches?.[0];
    if (!start || !t) return;
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    start = null;
    if (Math.abs(dx) < 90 || Math.abs(dx) < Math.abs(dy) * 2.5) return;
    const to = dx < 0 ? ctx.next(current) : ctx.prev(current);
    if (to != null) go(to);
  }, { passive: true });

  return { render, go };
}
