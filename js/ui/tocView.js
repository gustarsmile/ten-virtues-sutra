import { el, button, append, cnNumber } from './dom.js';
import { benefitList } from '../book.js';

// 目錄分段：哪一章開始要放小標
const SECTION_AT = { 1: '緣起', 3: '身業三', 6: '口業四', 10: '意業三', 13: '以十善為地' };

export function renderToc(root, ctx) {
  const { book, store, go } = ctx;
  const page = el('section', 'page toc');
  page.appendChild(el('h1', null, '目錄'));

  const list = el('div', 'toc-list');
  for (const ch of book.chapters) {
    if (SECTION_AT[ch.no]) list.appendChild(el('h2', 'toc-section', SECTION_AT[ch.no]));
    const row = button(null, 'toc-row toc-chapter', () => go(`ch/${ch.no}`));
    const benefits = benefitList(ch);
    append(
      row,
      el('span', 'toc-no', cnNumber(ch.no)),
      append(el('span', 'toc-text'), el('span', 'toc-title', ch.title), el('span', 'toc-sub', ch.subtitle)),
    );
    if (benefits) {
      const done = store.isVirtueComplete(ch);
      row.appendChild(el('span', `toc-mark${done ? ' done' : ''}`, `${store.litCount(ch.id)}／${benefits.items.length}`));
    } else if (store.isSeen(ch.id)) {
      row.appendChild(el('span', 'toc-mark done', '已讀'));
    }
    list.appendChild(row);
    if (ch.no === 12) {
      const m = button(null, 'toc-row toc-extra', () => go('match'));
      append(m, el('span', 'toc-no', '◇'), append(el('span', 'toc-text'), el('span', 'toc-title', '十善配對'), el('span', 'toc-sub', '十善各得什麼功德？配配看')));
      if (store.isMatchDone()) m.appendChild(el('span', 'toc-mark done', '完成'));
      list.appendChild(m);
    }
  }

  list.appendChild(el('h2', 'toc-section', '其他'));
  const extras = [
    ['land', '我的十善大地', `已圓滿 ${store.completedVirtues(book.chapters).length}／10 善`],
    ['daily', '每日十善', '每天一分鐘，照一照自己'],
    ['about', '關於本書', '經文出處、版本與授權'],
  ];
  for (const [route, title, sub] of extras) {
    const row = button(null, 'toc-row toc-extra', () => go(route));
    append(row, el('span', 'toc-no', '◇'), append(el('span', 'toc-text'), el('span', 'toc-title', title), el('span', 'toc-sub', sub)));
    list.appendChild(row);
  }

  page.appendChild(list);
  root.appendChild(page);
}
