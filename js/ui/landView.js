import { el, button, append, artFigure } from './dom.js';
import { virtueChapters } from '../book.js';
import { TOTAL_PEARLS } from '../config.js';

// 十善大地：一張大地的圖分成 2×5 十方，圓滿一善（該章寶珠全亮）就散開一方雲霧。
export function renderLand(root, ctx) {
  const { book, store, go } = ctx;
  const virtues = virtueChapters(book.chapters);
  const earth = book.chapters.find((c) => c.kind === 'earth');
  const done = store.completedVirtues(book.chapters);

  const page = el('section', 'page land');
  append(page, el('p', 'ch-kicker', '你的進度'), el('h1', null, '我的十善大地'));

  const allClear = done.length === virtues.length;
  let frame;
  if (allClear) {
    // 十方都散開了：整張大地可以點開放大
    frame = artFigure(earth.art, earth.alt, 'land-frame');
  } else {
    // 還有雲霧：圖上蓋一層 2×5 的格子，圓滿的那一方透明、其餘是雲霧。這時不能放大（放大就看光了）
    frame = artFigure(earth.art, '被雲霧蓋住的大地，圓滿一善就散開一方', 'land-frame', { zoom: false });
    const grid = el('div', 'land-grid');
    for (const ch of virtues) {
      const clear = done.includes(ch.virtue.index);
      const tile = button(clear ? null : ch.virtue.short, `land-tile ${clear ? 'clear' : 'mist'}`, () => { if (!clear) go(`ch/${ch.no}`); });
      tile.setAttribute('aria-label', clear ? `${ch.virtue.short}：已圓滿` : `${ch.virtue.short}：還有雲霧，前往這一章`);
      if (clear) tile.disabled = true;
      grid.appendChild(tile);
    }
    frame.appendChild(grid);
  }
  page.appendChild(frame);

  page.appendChild(el('p', 'land-count', `已圓滿 ${done.length}／10 善　寶珠 ${store.totalLit()}／${TOTAL_PEARLS}`));

  const complete = el('div', 'land-complete');
  complete.hidden = !allClear;
  const simile = earth.blocks[1];
  append(
    complete,
    el('p', 'raw-line', simile.raw),
    el('p', 'plain', simile.plain),
    el('p', 'land-thanks', '十方雲霧都散開了。這片大地一直在你腳下：每一次不傷害、不欺騙、不貪求，都是踩在上面的一步。'),
  );
  page.appendChild(complete);
  if (complete.hidden) page.appendChild(el('p', 'hint', '把一善的功德寶珠全部點亮，那一方的雲霧就會散開。點有雲霧的地方，可以前往那一章。'));

  const actions = el('div', 'land-actions');
  append(actions, button('每日十善', 'btn primary', () => go('daily')), button('目錄', 'btn', () => go('toc')));
  page.appendChild(actions);

  const nav = el('nav', 'pager');
  nav.setAttribute('aria-label', '翻頁');
  nav.appendChild(button(`‹ ${ctx.routeTitle(ctx.prev('land'))}`, 'btn pager-prev', () => go(ctx.prev('land')), 'prev'));
  page.appendChild(nav);

  root.appendChild(page);
}
