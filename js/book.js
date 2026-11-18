// 書的資料：載入、頁序、原文處理。這裡的函式都不碰 DOM。
const DATA = 'js/data';

async function defaultFetchJson(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`讀不到 ${path}（${res.status}）`);
  return res.json();
}

export async function loadBook(fetchJson = defaultFetchJson) {
  const [chapters, glossary, daily] = await Promise.all([
    fetchJson(`${DATA}/chapters.json`),
    fetchJson(`${DATA}/glossary.json`),
    fetchJson(`${DATA}/daily.json`),
  ]);
  return { chapters, glossary, daily };
}

// 十善各章的功德清單（寶珠）；其他章節沒有
export function benefitList(chapter) {
  return chapter.blocks.find((b) => b.type === 'list' && b.role === 'benefits') || null;
}

export function virtueChapters(chapters) {
  return chapters.filter((c) => c.kind === 'virtue').sort((a, b) => a.virtue.index - b.virtue.index);
}

// 翻頁順序：各章依序，「十善配對」接在最後一個十善章節後面，最後是「十善大地」
export function pages(chapters) {
  const lastVirtueNo = Math.max(...chapters.filter((c) => c.kind === 'virtue').map((c) => c.no));
  const out = [];
  for (const ch of chapters) {
    out.push(`ch/${ch.no}`);
    if (ch.no === lastVirtueNo) out.push('match');
  }
  out.push('land');
  return out;
}

// 封面（''）的下一頁是第一章；不在頁序裡的頁（目錄、每日十善…）沒有上下頁
export function nextRoute(chapters, route) {
  const list = pages(chapters);
  if (route === '') return list[0];
  const i = list.indexOf(route);
  return i < 0 ? null : list[i + 1] ?? null;
}

export function prevRoute(chapters, route) {
  const list = pages(chapters);
  const i = list.indexOf(route);
  if (i < 0) return null;
  return i === 0 ? '' : list[i - 1];
}

// 朗讀用：依 。！？； 斷成一句一句（不用 lookbehind，舊版 Safari 不支援）
export function splitSentences(text) {
  const clean = String(text || '').replace(/[「」『』\s]/g, '');
  return clean.match(/[^。！？；]+[。！？；]?/g) || [];
}

export function chapterRaw(chapter) {
  return chapter.blocks
    .map((b) => (b.type === 'list' ? b.items.map((it) => it.raw).join('') : b.raw))
    .join('');
}
