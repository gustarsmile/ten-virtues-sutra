import { el, button, append } from './dom.js';

const WEEK = ['日', '一', '二', '三', '四', '五', '六'];
// 'YYYY-MM-DD' → 本地日期（不要用 new Date(key)，那會被當成 UTC）
const toDate = (key) => { const [y, m, d] = key.split('-').map(Number); return new Date(y, m - 1, d); };

export function renderDaily(root, ctx) {
  const { book, daily, go } = ctx;
  const data = book.daily;
  const page = el('section', 'page daily');
  append(page, el('p', 'ch-kicker', '把經文帶回生活'), el('h1', null, '每日十善'));

  const todayKey = daily.history(1)[0].key;
  const t = toDate(todayKey);
  page.appendChild(el('p', 'daily-date', `${t.getFullYear()} 年 ${t.getMonth() + 1} 月 ${t.getDate()} 日（${WEEK[t.getDay()]}）`));
  append(page, el('blockquote', 'daily-quote', data.quote), el('p', 'lead', data.intro));

  const count = el('p', 'daily-count');
  const closing = el('p', 'daily-closing');
  const week = el('div', 'daily-week');
  const streak = el('p', 'daily-streak');

  function refresh() {
    const n = daily.countToday();
    count.textContent = `今天 ${n}／10`;
    closing.textContent = n === 0 ? data.closing.none : n === 10 ? data.closing.all : data.closing.some;
    week.textContent = '';
    for (const day of daily.history(7)) {
      const d = toDate(day.key);
      const cell = el('div', `daily-day${day.count ? ' has' : ''}${day.key === todayKey ? ' today' : ''}`);
      cell.setAttribute('aria-label', `${d.getMonth() + 1} 月 ${d.getDate()} 日：${day.count == null ? '沒有紀錄' : `${day.count} 項`}`);
      append(cell, el('span', 'daily-dow', WEEK[d.getDay()]), el('span', 'daily-dot', day.count ? String(day.count) : '·'));
      week.appendChild(cell);
    }
    const s = daily.streak();
    streak.textContent = s > 1 ? `已經連續 ${s} 天` : '';
  }

  const list = el('ol', 'daily-list');
  const today = daily.today();
  data.items.forEach((item, i) => {
    const label = el('label', 'daily-item');
    const box = el('input');
    box.type = 'checkbox';
    box.checked = today[i];
    box.addEventListener('change', () => { box.checked = daily.toggle(i); refresh(); });
    append(label, box, append(el('span', 'daily-text'), el('span', 'daily-name', item.name), el('span', 'daily-ask', item.ask)));
    list.appendChild(append(el('li'), label));
  });

  append(page, list, count, closing, el('h2', null, '最近七天'), week, streak);
  page.appendChild(el('p', 'hint', '紀錄只存在這台裝置的瀏覽器裡，不會上傳。'));

  const actions = el('div', 'land-actions');
  append(actions, button('目錄', 'btn', () => go('toc')), button('我的十善大地', 'btn', () => go('land')));
  page.appendChild(actions);

  refresh();
  root.appendChild(page);
}
