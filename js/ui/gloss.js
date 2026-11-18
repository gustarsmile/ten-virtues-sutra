// 原文裡的難詞：畫成可以點的字，點了在該段下方顯示註解。
// 只在原文上「加按鈕」，不增刪任何字——node.textContent 永遠等於 raw。
import { el } from './dom.js';

// 找出每個詞條在 raw 裡第一個「不和別的詞條重疊」的位置
function locate(raw, termKeys, glossary) {
  const ranges = [];
  for (const key of termKeys) {
    const entry = glossary[key];
    if (!entry) continue;
    let from = 0;
    for (;;) {
      const start = raw.indexOf(entry.term, from);
      if (start === -1) break;
      const end = start + entry.term.length;
      if (!ranges.some((r) => start < r.end && end > r.start)) { ranges.push({ start, end, entry }); break; }
      from = start + 1;
    }
  }
  return ranges.sort((a, b) => a.start - b.start);
}

// 回傳 { node, note }：node 放原文，note 是這一段共用的註解框（一次只開一個詞）
export function rawWithTerms(raw, termKeys, glossary) {
  const node = el('span', 'raw');
  const note = el('div', 'gloss-note');
  note.hidden = true;
  note.setAttribute('role', 'note');
  let open = null;

  const close = () => {
    if (open) open.setAttribute('aria-expanded', 'false');
    open = null;
    note.hidden = true;
  };

  let pos = 0;
  for (const r of locate(raw, termKeys || [], glossary)) {
    if (r.start > pos) node.appendChild(document.createTextNode(raw.slice(pos, r.start)));
    const b = el('button', 'term', raw.slice(r.start, r.end));
    b.type = 'button';
    b.setAttribute('aria-expanded', 'false');
    b.addEventListener('click', (e) => {
      e.stopPropagation(); // 不要順便觸發整列的點擊（點亮寶珠、展開白話）
      if (open === b) { close(); return; }
      close();
      note.textContent = '';
      note.appendChild(el('strong', null, r.entry.term));
      note.appendChild(document.createTextNode(`　${r.entry.note}`));
      note.hidden = false;
      b.setAttribute('aria-expanded', 'true');
      open = b;
    });
    node.appendChild(b);
    pos = r.end;
  }
  if (pos < raw.length) node.appendChild(document.createTextNode(raw.slice(pos)));
  return { node, note };
}
