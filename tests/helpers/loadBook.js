import { readFileSync } from 'node:fs';

const read = (name) => JSON.parse(readFileSync(`js/data/${name}`, 'utf8'));

// 測試用：直接從磁碟讀三份資料檔
export function loadBookFromDisk() {
  return { chapters: read('chapters.json'), glossary: read('glossary.json'), daily: read('daily.json') };
}

// 給 loadBook(fetchJson) 用的假 fetch
export const fetchJsonFromDisk = async (path) => JSON.parse(readFileSync(path, 'utf8'));

// 記憶體版 localStorage
export function memoryStorage(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => { map.set(k, String(v)); },
    removeItem: (k) => { map.delete(k); },
    _map: map,
  };
}

// 一碰就丟例外的 storage（模擬無痕模式或被瀏覽器擋掉的 iframe）
export function brokenStorage() {
  const boom = () => { throw new Error('storage blocked'); };
  return { getItem: boom, setItem: boom, removeItem: boom };
}
