export const BOOK_TITLE = '十善業道經';
export const BOOK_SUBTITLE = '互動電子書・十善大地';

// 部署定址：GitHub Pages（帳號 gustarsmile）。改這個值之後，index.html 的 og:url／og:image 也要一起改
// （tests/html.test.js 會守門）。
export const BOOK_URL = 'https://gustarsmile.github.io/ten-virtues-sutra/';

export const SAVE_KEY = 'shishanBook.v1';
export const DAILY_KEY = 'shishanDaily.v1';

// 十善各自的功德條數（經文：十離惱法、十種可保信法、四種智所讚法……），合計 71 顆寶珠
export const BENEFIT_COUNTS = [10, 10, 4, 8, 5, 8, 3, 5, 8, 10];
export const TOTAL_PEARLS = 71;

// 經文底本資訊（顯示在「關於本書」）
export const SOURCE = {
  canon: '大正新脩大藏經 第 15 冊 No. 600',
  translator: '大唐于闐三藏實叉難陀　奉制譯',
  edition: 'CBETA 電子佛典集成 2026.R2（發行日期 2026-08，最後更新 2025-01-30）',
  reader: 'https://cbetaonline.dila.edu.tw/T0600',
  license: 'https://www.cbeta.org/copyright',
};
