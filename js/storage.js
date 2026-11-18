// localStorage 的安全包裝：無痕模式、被擋掉的 iframe、容量滿了，都可能丟例外。
// 這裡一律吞掉，讓書照樣能讀，只是不保存。

// 沒傳 storage（undefined）才去拿瀏覽器的；明確傳 null 代表「不要保存」
export function resolveStorage(storage) {
  if (storage !== undefined) return storage;
  try { return globalThis.localStorage ?? null; } catch { return null; }
}

export function readJson(storage, key) {
  try {
    const raw = storage?.getItem(key);
    return raw == null ? null : JSON.parse(raw);
  } catch {
    return null;
  }
}

export function writeJson(storage, key, value) {
  try { storage?.setItem(key, JSON.stringify(value)); } catch { /* 存不了就算了 */ }
}

export function removeKey(storage, key) {
  try { storage?.removeItem(key); } catch { /* 同上 */ }
}

export const isPlainObject = (x) => x !== null && typeof x === 'object' && !Array.isArray(x);
