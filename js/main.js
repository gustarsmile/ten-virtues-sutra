import { loadBook } from './book.js';
import { createStore } from './state.js';
import { createDaily } from './daily.js';
import { createSpeech } from './speech.js';
import { createApp } from './app.js';

const root = document.getElementById('app');

// 最常見的失敗原因：直接雙擊 index.html（file://）開啟，瀏覽器不讓它讀 JSON
function showError(err) {
  const make = (tag, className, text) => {
    const n = document.createElement(tag);
    if (className) n.className = className;
    n.textContent = text;
    return n;
  };
  const again = make('button', 'btn primary', '重新整理');
  again.type = 'button';
  again.addEventListener('click', () => location.reload());
  const box = make('div', 'load-error', '');
  box.append(
    make('h1', null, '書的內容載入失敗'),
    make('p', null, '請重新整理再試一次。如果你是直接打開檔案，請改用網址開啟這本書。'),
    again,
    make('p', 'hint', String(err)),
  );
  root.textContent = '';
  root.appendChild(box);
}

// 不用 top-level await：舊一點的 iPhone（iOS 14）不支援
loadBook()
  .then((book) => {
    createApp({ root, book, store: createStore(), daily: createDaily(), speech: createSpeech() }).render();
  })
  .catch(showError);
