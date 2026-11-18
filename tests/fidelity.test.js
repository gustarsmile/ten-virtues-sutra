import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadBookFromDisk } from './helpers/loadBook.js';

// 底本：CBETA 2026.R2，T15 No.600《十善業道經》正文（含新式標點）
const canon = readFileSync('tests/fixtures/T0600-cbeta.txt', 'utf8').replace(/\s+/g, '');

function rawOf(chapters) {
  let out = '';
  for (const ch of chapters) {
    for (const b of ch.blocks) {
      if (b.type === 'passage') out += b.raw;
      else if (b.type === 'list') for (const it of b.items) out += it.raw;
    }
  }
  return out.replace(/\s+/g, '');
}

describe('經文逐字比對', () => {
  const { chapters } = loadBookFromDisk();
  const mine = rawOf(chapters);

  it('所有章節的原文串起來，和 CBETA 底本一字不差（含標點）', () => {
    if (mine !== canon) {
      let i = 0;
      while (i < mine.length && i < canon.length && mine[i] === canon[i]) i += 1;
      const ctx = (s) => `${s.slice(Math.max(0, i - 20), i)}【${s.slice(i, i + 1)}】${s.slice(i + 1, i + 20)}`;
      throw new Error(`第 ${i} 個字開始不同\n  底本：${ctx(canon)}\n  本書：${ctx(mine)}\n  長度 底本 ${canon.length}／本書 ${mine.length}`);
    }
    expect(mine).toBe(canon);
  });

  it('從 CBETA 的校訂：是「止莊嚴故」不是「正莊嚴故」', () => {
    expect(mine).toContain('止莊嚴故，悉能滌除一切結使');
    expect(mine).not.toContain('正莊嚴故');
  });

  it('正文 2,366 個漢字', () => {
    expect((mine.match(/[㐀-鿿]/g) || []).length).toBe(2366);
  });
});
