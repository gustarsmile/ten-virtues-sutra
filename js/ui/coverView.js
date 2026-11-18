import { el, button, append, artFigure, cnNumber } from './dom.js';
import { BOOK_TITLE, TOTAL_PEARLS, SOURCE } from '../config.js';
import { parseRoute, toHash } from '../router.js';

// 「繼續閱讀」按鈕上的文字：第五章 離邪行／十善配對／十善大地
function lastLabel(ctx, route) {
  const r = parseRoute(toHash(route), ctx.book.chapters.length);
  if (r.name === 'ch') return `第${cnNumber(r.no)}章 ${ctx.book.chapters[r.no - 1].title}`;
  return ctx.routeTitle(route);
}

export function renderCover(root, ctx) {
  const { store, go, book } = ctx;
  const page = el('section', 'page cover');
  page.appendChild(artFigure('cover.webp', '海底的龍宮，一條小龍在金頂碧瓦的宮殿上方盤繞，四周是魚群、海龜與珊瑚', 'cover-art'));

  const body = el('div', 'cover-body');
  append(
    body,
    el('p', 'cover-kicker', '互動電子書'),
    el('h1', null, BOOK_TITLE),
    el('p', 'cover-by', SOURCE.translator),
    el('p', 'cover-intro', '佛陀在海底的龍宮，為龍王講了十件事。全經約 2,400 字，這裡有原文、白話、註解和朗讀，還有 71 顆等你點亮的功德寶珠。'),
  );

  const actions = el('div', 'cover-actions');
  const last = store.getLast();
  if (ctx.isPage(last)) {
    actions.appendChild(button(`繼續閱讀：${lastLabel(ctx, last)}`, 'btn primary', () => go(last), 'continue'));
    actions.appendChild(button('從頭開始', 'btn', () => go('ch/1'), 'start'));
  } else {
    actions.appendChild(button('開始閱讀', 'btn primary', () => go('ch/1'), 'start'));
  }
  body.appendChild(actions);

  const lit = store.totalLit();
  const lands = store.completedVirtues(book.chapters).length;
  if (lit > 0) body.appendChild(el('p', 'cover-progress', `寶珠 ${lit}／${TOTAL_PEARLS}　十善大地 ${lands}／10`));

  const links = el('nav', 'cover-links');
  links.setAttribute('aria-label', '其他頁面');
  append(
    links,
    button('目錄', 'link', () => go('toc')),
    button('每日十善', 'link', () => go('daily')),
    button('關於本書', 'link', () => go('about')),
  );
  body.appendChild(links);

  page.appendChild(body);
  root.appendChild(page);
}
