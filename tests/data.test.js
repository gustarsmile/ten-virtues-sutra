import { describe, it, expect } from 'vitest';
import { loadBookFromDisk } from './helpers/loadBook.js';
import { BENEFIT_COUNTS, TOTAL_PEARLS } from '../js/config.js';

const { chapters, glossary, daily } = loadBookFromDisk();
const virtues = chapters.filter((c) => c.kind === 'virtue');
const benefitsOf = (ch) => ch.blocks.find((b) => b.type === 'list' && b.role === 'benefits');
const textBlocks = (ch) => ch.blocks.flatMap((b) => (b.type === 'list' ? b.items : [b]));

describe('章節結構', () => {
  it('15 章，編號與 id 連續', () => {
    expect(chapters).toHaveLength(15);
    chapters.forEach((ch, i) => {
      expect(ch.no).toBe(i + 1);
      expect(ch.id).toBe(`ch${String(i + 1).padStart(2, '0')}`);
      expect(ch.title, ch.id).toBeTruthy();
      expect(ch.subtitle, ch.id).toBeTruthy();
      expect(ch.art, ch.id).toMatch(/\.webp$/);
      expect(ch.alt, ch.id).toBeTruthy();
    });
  });

  it('章節類型依序是 intro、one、virtue×10、giving、adorn、earth', () => {
    expect(chapters.map((c) => c.kind)).toEqual(
      ['intro', 'one', ...Array(10).fill('virtue'), 'giving', 'adorn', 'earth'],
    );
  });

  it('每一段原文都有白話', () => {
    for (const ch of chapters) {
      for (const t of textBlocks(ch)) {
        expect(t.raw, ch.id).toBeTruthy();
        expect(t.plain, `${ch.id}｜${t.raw}`).toBeTruthy();
      }
    }
  });
});

describe('十善各章', () => {
  it('依序是身三、口四、意三', () => {
    expect(virtues.map((c) => c.virtue.index)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(virtues.map((c) => c.virtue.group).join('')).toBe('身身身口口口口意意意');
    for (const c of virtues) expect(c.virtue.short, c.id).toBeTruthy();
  });

  it('功德條數是 10、10、4、8、5、8、3、5、8、10，合計 71', () => {
    const counts = virtues.map((c) => benefitsOf(c).items.length);
    expect(counts).toEqual(BENEFIT_COUNTS);
    expect(counts.reduce((a, b) => a + b, 0)).toBe(TOTAL_PEARLS);
  });

  it('功德清單有名目與說明，名目出現在該章原文裡', () => {
    for (const c of virtues) {
      const list = benefitsOf(c);
      expect(list.name, c.id).toBeTruthy();
      expect(list.nameNote, c.id).toBeTruthy();
      const raw = c.blocks.filter((b) => b.type === 'passage').map((b) => b.raw).join('');
      expect(raw, c.id).toContain(list.name);
    }
  });

  it('每章一題情境題：三個選項，各有回饋；還有一句帶走的話', () => {
    for (const c of virtues) {
      expect(c.scenario.prompt, c.id).toBeTruthy();
      expect(c.scenario.options, c.id).toHaveLength(3);
      for (const o of c.scenario.options) {
        expect(o.text, c.id).toBeTruthy();
        expect(o.reply, c.id).toBeTruthy();
      }
      expect(c.takeaway, c.id).toBeTruthy();
    }
  });

  it('十善以外的章節沒有情境題，也沒有寶珠清單', () => {
    for (const c of chapters.filter((x) => x.kind !== 'virtue')) {
      expect(c.scenario, c.id).toBeUndefined();
      expect(benefitsOf(c), c.id).toBeUndefined();
    }
  });
});

describe('第 13、14 章的清單', () => {
  it('以施莊嚴 10 項、種種莊嚴 20 項', () => {
    const list = (no) => chapters[no - 1].blocks.find((b) => b.type === 'list');
    expect(list(13).role).toBe('plain-list');
    expect(list(13).items).toHaveLength(10);
    expect(list(14).role).toBe('plain-list');
    expect(list(14).items).toHaveLength(20);
  });
});

describe('註解', () => {
  it('每個詞條都有 term 與 note', () => {
    for (const [key, entry] of Object.entries(glossary)) {
      expect(entry.term, key).toBeTruthy();
      expect(entry.note, key).toBeTruthy();
    }
  });

  it('區塊引用的詞條都存在，而且那個詞真的出現在該段原文裡', () => {
    for (const ch of chapters) {
      for (const t of textBlocks(ch)) {
        for (const key of t.terms || []) {
          expect(glossary[key], `${ch.id} 引用了不存在的詞條「${key}」`).toBeTruthy();
          expect(t.raw, `${ch.id}｜詞條「${key}」不在這段原文裡`).toContain(glossary[key].term);
        }
      }
    }
  });

  it('每個詞條至少被引用一次（沒有孤兒詞條）', () => {
    const used = new Set(chapters.flatMap((ch) => textBlocks(ch).flatMap((t) => t.terms || [])));
    for (const key of Object.keys(glossary)) expect(used.has(key), `詞條「${key}」沒有被用到`).toBe(true);
  });
});

describe('每日十善', () => {
  it('十項，各有名稱與一句提問，順序對應十善', () => {
    expect(daily.items).toHaveLength(10);
    daily.items.forEach((it, i) => {
      expect(it.name, `第 ${i + 1} 項`).toBe(virtues[i].virtue.short);
      expect(it.ask, `第 ${i + 1} 項`).toBeTruthy();
    });
  });
});
