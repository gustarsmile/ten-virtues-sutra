import { el, button, append, artFigure, cnNumber } from './dom.js';
import { rawWithTerms } from './gloss.js';
import { benefitList, virtueChapters, chapterRaw, splitSentences } from '../book.js';

const ORDINAL = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];

// 一段原文＋註解框＋白話
function passageBlock(block, glossary, plainNodes) {
  const box = el('div', 'passage');
  const { node, note } = rawWithTerms(block.raw, block.terms, glossary);
  const plain = el('p', 'plain', block.plain);
  plainNodes.push(plain);
  append(box, append(el('p', 'raw-line'), node), note, plain);
  return box;
}

// 十善各章的功德清單：一條一顆寶珠，點了才亮、才顯示白話
function benefitsBlock(block, ch, ctx) {
  const { store, book, go } = ctx;
  const total = block.items.length;
  const box = el('div', 'benefits');

  const count = el('span', 'pearl-count');
  const head = el('div', 'list-head');
  append(head, el('span', 'list-name', block.name), el('span', 'list-note', block.nameNote), count);
  box.appendChild(head);
  box.appendChild(el('p', 'hint', '點一下寶珠，看白話並把它點亮。'));

  const done = el('p', 'virtue-done');
  append(done, el('span', null, '這一善的寶珠全部點亮了，十善大地散開了一方雲霧。'), button('去看看', 'link', () => go('land')));

  const refresh = () => {
    count.textContent = `已點亮 ${store.litCount(ch.id)}／${total}`;
    done.hidden = !store.isVirtueComplete(ch);
  };

  const list = el('ol', 'pearl-list');
  block.items.forEach((item, i) => {
    const row = el('li', 'pearl-row');
    const pearl = el('button', 'pearl');
    pearl.type = 'button';
    pearl.setAttribute('aria-label', `第 ${i + 1} 顆寶珠`);
    const { node, note } = rawWithTerms(item.raw, item.terms, book.glossary);
    const plain = el('div', 'plain');
    plain.appendChild(el('p', null, item.plain));
    if (item.note) plain.appendChild(el('p', 'collation', item.note));

    const show = (lit) => {
      pearl.classList.toggle('lit', lit);
      pearl.setAttribute('aria-pressed', String(lit));
      row.classList.toggle('lit', lit);
      plain.hidden = !lit;
    };
    show(store.isLit(ch.id, i));

    // 整列都可以點（手機上寶珠比較小）；點難詞時 gloss 會擋下來，不會誤亮
    row.addEventListener('click', () => {
      if (!store.lightPearl(ch.id, i)) return;
      show(true);
      pearl.classList.add('pop');
      refresh();
      ctx.refreshTopbar();
    });

    append(row, pearl, append(el('div', 'pearl-body'), append(el('p', 'raw-line'), node), note, plain));
    list.appendChild(row);
  });

  refresh();
  append(box, list, done);
  return box;
}

// 第 13、14 章的清單：原文都列出來，白話一項一項展開
function foldBlock(block, glossary) {
  const box = el('div', 'fold-list');
  const head = el('div', 'list-head');
  append(head, el('span', 'list-name', block.name), el('span', 'list-note', block.nameNote));
  box.appendChild(head);
  box.appendChild(el('p', 'hint', '點一項，看它的白話。'));

  let group = null;
  for (const item of block.items) {
    if (item.group && item.group !== group) {
      group = item.group;
      box.appendChild(el('h3', 'fold-group', group));
    }
    const row = el('div', 'fold-row');
    const { node, note } = rawWithTerms(item.raw, item.terms, glossary);
    const plain = el('div', 'plain');
    plain.hidden = true;
    plain.appendChild(el('p', null, item.plain));
    if (item.note) plain.appendChild(el('p', 'collation', item.note));

    const toggle = el('button', 'fold-head');
    toggle.type = 'button';
    toggle.setAttribute('aria-expanded', 'false');
    append(toggle, el('span', 'fold-label', item.label), el('span', 'fold-chev', '白話'));
    const flip = () => {
      plain.hidden = !plain.hidden;
      toggle.setAttribute('aria-expanded', String(!plain.hidden));
      row.classList.toggle('open', !plain.hidden);
    };
    toggle.addEventListener('click', (e) => { e.stopPropagation(); flip(); });
    row.addEventListener('click', flip);

    append(row, toggle, append(el('p', 'raw-line'), node), note, plain);
    box.appendChild(row);
  }
  return box;
}

function scenarioSection(ch, ctx) {
  const { store } = ctx;
  const sec = el('section', 'scenario');
  append(sec, el('h2', null, '生活裡的這一條'), el('p', 'prompt', ch.scenario.prompt));
  const reply = el('p', 'reply');
  reply.hidden = true;
  reply.setAttribute('aria-live', 'polite');

  const options = el('div', 'options');
  const buttons = ch.scenario.options.map((opt, i) => button(opt.text, 'option', () => {
    store.setScenario(ch.id, i);
    choose(i);
  }));
  function choose(i) {
    buttons.forEach((b, k) => {
      b.classList.toggle('chosen', k === i);
      b.setAttribute('aria-pressed', String(k === i));
    });
    reply.textContent = ch.scenario.options[i].reply;
    reply.hidden = false;
  }
  buttons.forEach((b) => { b.setAttribute('aria-pressed', 'false'); options.appendChild(b); });
  append(sec, options, reply, el('p', 'hint', '沒有標準答案，也不計分。選一個最接近你的，看看經文怎麼說。'));

  const saved = store.getScenario(ch.id);
  if (saved !== null && saved < buttons.length) choose(saved);
  return sec;
}

// 第 2 章：十善一覽（身三、口四、意三），點了跳到那一章
function overviewSection(ctx) {
  const { book, store, go } = ctx;
  const sec = el('section', 'overview');
  sec.appendChild(el('h2', null, '十善一覽'));
  const groups = { 身: '身業三：身體做的事', 口: '口業四：嘴巴說的話', 意: '意業三：心裡的念頭' };
  for (const [g, title] of Object.entries(groups)) {
    sec.appendChild(el('h3', 'overview-group', title));
    const wrap = el('div', 'overview-chips');
    for (const ch of virtueChapters(book.chapters).filter((c) => c.virtue.group === g)) {
      const chip = button(null, 'overview-chip', () => go(`ch/${ch.no}`));
      const total = benefitList(ch).items.length;
      append(
        chip,
        el('span', 'chip-name', ch.virtue.short),
        el('span', 'chip-sub', ch.subtitle),
        el('span', `chip-pearls${store.isVirtueComplete(ch) ? ' done' : ''}`, `${store.litCount(ch.id)}／${total}`),
      );
      wrap.appendChild(chip);
    }
    sec.appendChild(wrap);
  }
  return sec;
}

function speakButton(ch, ctx) {
  const { speech } = ctx;
  if (!speech.supported) return null;
  const b = button('朗讀', 'btn small btn-speak');
  b.setAttribute('aria-pressed', 'false');
  const idle = () => { b.textContent = '朗讀'; b.setAttribute('aria-pressed', 'false'); };
  b.addEventListener('click', () => {
    if (speech.isSpeaking()) { speech.stop(); return; } // stop 會觸發 onEnd → idle
    // Chrome 的語音清單載入後才知道有沒有中文語音；確定沒有就直說，不要讓人按了沒反應
    if (speech.voicesLoaded() && !speech.hasVoice()) {
      b.textContent = '這個裝置沒有中文語音';
      b.disabled = true;
      return;
    }
    b.textContent = '停止朗讀';
    b.setAttribute('aria-pressed', 'true');
    speech.speak(splitSentences(chapterRaw(ch)), { onEnd: idle });
  });
  return b;
}

export function renderChapter(root, ctx, no) {
  const { book, go } = ctx;
  const ch = book.chapters[no - 1];
  const route = `ch/${no}`;
  const page = el('article', `page chapter kind-${ch.kind}`);

  // 左欄（寬螢幕）：章名、插圖、導讀
  const side = el('div', 'ch-side');
  const kicker = ch.virtue
    ? `第${cnNumber(no)}章　十善之${ORDINAL[ch.virtue.index]}・${ch.virtue.group}業`
    : `第${cnNumber(no)}章`;
  const header = el('header', 'ch-head');
  append(header, el('p', 'ch-kicker', kicker), el('h1', null, ch.title), el('p', 'ch-sub', ch.subtitle));
  append(side, header, artFigure(ch.art, ch.alt), el('p', 'lead', ch.lead));

  // 右欄：經文與互動
  const main = el('div', 'ch-main');
  const sutra = el('section', 'sutra');
  const plainNodes = [];
  const tools = el('div', 'sec-tools');
  const toggle = button('白話：開', 'btn small', () => {
    const hide = !plainNodes[0].hidden;
    plainNodes.forEach((p) => { p.hidden = hide; });
    toggle.textContent = hide ? '白話：關' : '白話：開';
    toggle.setAttribute('aria-pressed', String(!hide));
  }, 'toggle-plain');
  toggle.setAttribute('aria-pressed', 'true');
  append(tools, speakButton(ch, ctx), toggle);
  append(sutra, append(el('div', 'sec-head'), el('h2', null, '經文'), tools));

  for (const block of ch.blocks) {
    if (block.type === 'passage') sutra.appendChild(passageBlock(block, book.glossary, plainNodes));
    else if (block.role === 'benefits') sutra.appendChild(benefitsBlock(block, ch, ctx));
    else sutra.appendChild(foldBlock(block, book.glossary));
  }
  main.appendChild(sutra);

  if (ch.kind === 'one') main.appendChild(overviewSection(ctx));
  if (ch.scenario) main.appendChild(scenarioSection(ch, ctx));
  if (ch.kind === 'earth') {
    const cta = el('section', 'cta');
    append(cta, el('p', null, '全經到這裡結束。你讀過、點亮的每一條，都鋪在一片大地上。'), button('去看我的十善大地', 'btn primary', () => go('land')));
    main.appendChild(cta);
  }
  if (ch.takeaway) main.appendChild(el('blockquote', 'takeaway', ch.takeaway));

  // 翻頁
  const nav = el('nav', 'pager');
  nav.setAttribute('aria-label', '翻頁');
  const prev = ctx.prev(route);
  const next = ctx.next(route);
  append(
    nav,
    button(`‹ ${prev === '' ? '封面' : ctx.routeTitle(prev)}`, 'btn pager-prev', () => go(prev), 'prev'),
    next ? button(`${ctx.routeTitle(next)} ›`, 'btn primary pager-next', () => go(next), 'next') : null,
  );
  main.appendChild(nav);

  append(page, side, main);
  root.appendChild(page);
}
