import { describe, it, expect } from 'vitest';
import { existsSync, statSync, readdirSync } from 'node:fs';
import { ART_MANIFEST } from '../scripts/art-manifest.mjs';
import { PROMPTS } from '../scripts/art-prompts.mjs';
import { loadBookFromDisk } from './helpers/loadBook.js';

describe('插圖', () => {
  it('清單 16 張都在 assets/art/', () => {
    expect(ART_MANIFEST).toHaveLength(16);
    for (const f of ART_MANIFEST) expect(existsSync(`assets/art/${f}`), f).toBe(true);
  });
  it('每一章用的插圖都在清單裡，而且沒有兩章共用同一張', () => {
    const { chapters } = loadBookFromDisk();
    const used = chapters.map((c) => c.art);
    for (const f of used) expect(ART_MANIFEST, f).toContain(f);
    expect(new Set(used).size).toBe(used.length);
  });
  it('清單裡每一張都有提示詞（之後才重畫得出來）', () => {
    for (const f of ART_MANIFEST) expect(PROMPTS[f.replace(/\.webp$/, '')], f).toBeTruthy();
  });
  it('assets/art/ 沒有清單以外的檔案，總體積在 4MB 內', () => {
    const files = readdirSync('assets/art');
    for (const f of files) expect(ART_MANIFEST, f).toContain(f);
    const total = files.reduce((s, f) => s + statSync(`assets/art/${f}`).size, 0);
    expect(total).toBeLessThan(4 * 1024 * 1024);
  });
  it('社群預覽圖 og.png 存在且在 500KB 內', () => {
    expect(existsSync('assets/og.png')).toBe(true);
    expect(statSync('assets/og.png').size).toBeLessThan(500 * 1024);
  });
});
