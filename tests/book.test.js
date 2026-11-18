import { describe, it, expect } from 'vitest';
import { fetchJsonFromDisk } from './helpers/loadBook.js';
import {
  loadBook, benefitList, virtueChapters, pages, nextRoute, prevRoute,
  splitSentences, chapterRaw,
} from '../js/book.js';

const book = await loadBook(fetchJsonFromDisk);
const { chapters } = book;

describe('loadBook', () => {
  it('讀進三份資料', () => {
    expect(book.chapters).toHaveLength(15);
    expect(book.glossary['迴向'].note).toBeTruthy();
    expect(book.daily.items).toHaveLength(10);
  });
  it('任何一份讀不到就整個失敗（不要半套資料）', async () => {
    const flaky = async (p) => { if (p.includes('glossary')) throw new Error('404'); return fetchJsonFromDisk(p); };
    await expect(loadBook(flaky)).rejects.toThrow();
  });
});

describe('章節查詢', () => {
  it('benefitList 只在十善各章有', () => {
    expect(benefitList(chapters[2]).name).toBe('十離惱法');
    expect(benefitList(chapters[0])).toBeNull();
    expect(benefitList(chapters[12])).toBeNull(); // 第 13 章是 plain-list，不是寶珠
  });
  it('virtueChapters 回傳十章，依十善順序', () => {
    const v = virtueChapters(chapters);
    expect(v.map((c) => c.no)).toEqual([3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  });
  it('chapterRaw 是整章原文', () => {
    expect(chapterRaw(chapters[2])).toMatch(/^「龍王！若離殺生.*得佛隨心自在壽命。$/);
  });
});

describe('頁序', () => {
  it('第 1–12 章 → 十善配對 → 第 13–15 章 → 十善大地，共 17 頁', () => {
    const p = pages(chapters);
    expect(p).toHaveLength(17);
    expect(p[0]).toBe('ch/1');
    expect(p.slice(11, 14)).toEqual(['ch/12', 'match', 'ch/13']);
    expect(p.at(-1)).toBe('land');
  });
  it('nextRoute', () => {
    expect(nextRoute(chapters, '')).toBe('ch/1'); // 封面的下一頁
    expect(nextRoute(chapters, 'ch/12')).toBe('match');
    expect(nextRoute(chapters, 'ch/15')).toBe('land');
    expect(nextRoute(chapters, 'land')).toBeNull();
    expect(nextRoute(chapters, 'daily')).toBeNull(); // 不在頁序裡
  });
  it('prevRoute', () => {
    expect(prevRoute(chapters, 'ch/1')).toBe(''); // 回封面
    expect(prevRoute(chapters, 'ch/13')).toBe('match');
    expect(prevRoute(chapters, 'land')).toBe('ch/15');
    expect(prevRoute(chapters, '')).toBeNull();
    expect(prevRoute(chapters, 'about')).toBeNull();
  });
});

describe('原文處理', () => {
  it('splitSentences 依 。！？； 斷句，去掉引號，不留空字串', () => {
    expect(splitSentences('「龍王！若離殺生，即得成就十離惱法。何等為十？')).toEqual(['龍王！', '若離殺生，即得成就十離惱法。', '何等為十？']);
    expect(splitSentences('一、言不乖度；二、言皆利益；')).toEqual(['一、言不乖度；', '二、言皆利益；']);
    expect(splitSentences('')).toEqual([]);
    expect(splitSentences('沒有句尾標點')).toEqual(['沒有句尾標點']);
  });
});
