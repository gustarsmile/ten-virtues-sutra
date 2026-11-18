import { el, button, append } from './dom.js';
import { benefitList, virtueChapters } from '../book.js';

// 洗牌（Fisher–Yates）。rng 可注入，測試時不需要固定順序也能跑
function shuffle(list, rng = Math.random) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function renderMatch(root, ctx) {
  const { book, store, go } = ctx;
  const virtues = virtueChapters(book.chapters);
  const page = el('section', 'page match');
  append(
    page,
    el('p', 'ch-kicker', '小複習'),
    el('h1', null, '十善配對'),
    el('p', 'lead', '左邊是十善，右邊是做到之後所得的功德名目。先點左邊，再點右邊，把它們配成一對。'),
  );
  if (store.isMatchDone()) page.appendChild(el('p', 'hint', '你已經完成過這個配對，想再玩一次也可以。'));

  const msg = el('p', 'match-msg');
  msg.setAttribute('aria-live', 'polite');
  const doneBox = el('div', 'match-done');
  doneBox.hidden = true;
  append(doneBox, el('p', null, '十組全部配對完成。十善各有各的果，接下來看看它們加上布施會怎麼樣。'));

  let selected = null;
  let matched = 0;
  const leftCol = el('div', 'match-col match-left');
  const rightCol = el('div', 'match-col match-right');

  const select = (b) => {
    if (selected) selected.classList.remove('selected');
    selected = b;
    if (b) b.classList.add('selected');
  };

  for (const ch of virtues) {
    const b = button(null, 'match-item', () => { select(b); msg.textContent = `「${ch.virtue.short}」可以得到哪一種？`; });
    b.dataset.key = ch.id;
    append(b, el('span', 'match-name', ch.virtue.short), el('span', 'match-sub', ch.subtitle));
    leftCol.appendChild(b);
  }

  for (const ch of shuffle(virtues)) {
    const name = benefitList(ch).name;
    const b = button(name, 'match-item', () => {
      if (!selected) { msg.textContent = '先點左邊的一善，再點右邊。'; return; }
      if (selected.dataset.key !== b.dataset.key) {
        msg.textContent = '不是這一個，再想想。翻回那一章看一眼也可以。';
        b.classList.remove('shake');
        void b.offsetWidth; // 讓動畫可以連續重播
        b.classList.add('shake');
        return;
      }
      for (const x of [selected, b]) { x.classList.add('matched'); x.classList.remove('selected'); x.disabled = true; }
      msg.textContent = `${selected.querySelector('.match-name').textContent} → ${name}`;
      selected = null;
      matched += 1;
      if (matched === virtues.length) {
        store.setMatchDone();
        doneBox.hidden = false;
        msg.textContent = '';
      }
    });
    b.dataset.key = ch.id;
    rightCol.appendChild(b);
  }

  const board = el('div', 'match-board');
  append(board, leftCol, rightCol);
  append(page, msg, board, doneBox);

  const nav = el('nav', 'pager');
  nav.setAttribute('aria-label', '翻頁');
  append(
    nav,
    button(`‹ ${ctx.routeTitle(ctx.prev('match'))}`, 'btn pager-prev', () => go(ctx.prev('match')), 'prev'),
    button(`${ctx.routeTitle(ctx.next('match'))} ›`, 'btn primary pager-next', () => go(ctx.next('match')), 'next'),
  );
  page.appendChild(nav);
  root.appendChild(page);
}
