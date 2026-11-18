import { el, button, append } from './dom.js';
import { SOURCE } from '../config.js';

// CBETA 資料庫使用說明（再加工發行時須附上；原文照錄自 https://www.cbeta.org/copyright）
const CBETA_NOTICE = [
  '非營利使用：本資料庫之使用限定於個人或團體非營利性用途。',
  '再傳播規範：將本資料庫以網路、光碟或其它媒體再傳播、節錄引用及再加工發行時，以不改變實質內容為原則，並需於成品附上本說明及版本資訊，以利使用者查詢相關修訂資訊。',
  '錯誤回報：若發現本資料庫中任何錯誤之處，請與本會聯絡。',
  '免責聲明：若因使用本資料庫所產生之任何損害，本會一概不負任何責任。',
  '核心授權：除下方「二、底本來源與授權分類」中特別註明不適用之文獻外，本資料庫未特別說明處皆採用「Creative Commons 姓名標示-非商業性-相同方式分享 4.0 國際授權條款」釋出。',
];

const CBETA_VERSION = [
  '【經文資訊】大正新脩大藏經 第 15 冊 No. 600 十善業道經',
  '【版本記錄】發行日期：2026-08，最後更新：2025-01-30（CBETA 2026.R2）',
  '【編輯說明】本資料庫由 財團法人佛教電子佛典基金會（CBETA）依「大正新脩大藏經」所編輯',
  '【原始資料】蕭鎮國大德提供，郭鴻達大德輸入，日本 SAT 組織提供，北美某大德提供，三寶弟子提供新式標點，張革豐大德提供新式標點重校',
];

function link(text, href) {
  const a = el('a', null, text);
  a.href = href;
  a.target = '_blank';
  a.rel = 'noopener';
  return a;
}

function section(title, ...children) {
  return append(el('section', 'about-sec'), el('h2', null, title), ...children);
}

export function renderAbout(root, ctx) {
  const { store, go } = ctx;
  const page = el('section', 'page about');
  append(page, el('p', 'ch-kicker', '版權頁'), el('h1', null, '關於本書'));

  page.appendChild(section(
    '經文',
    el('p', null, `《十善業道經》一卷，${SOURCE.translator}。${SOURCE.canon}。`),
    el('p', null, '本書的經文與新式標點採用 CBETA 電子佛典集成的現行版本，一字未改。全書測試會把書裡所有原文串起來，和底本逐字比對。'),
    el('p', null, '有一處和較早流通的版本不同：《大正藏》原本作「正莊嚴故，悉能滌除一切結使」，CBETA 依宮內廳本等校訂為「止莊嚴故」，和下一句「觀莊嚴故」成對。本書依 CBETA。'),
    append(el('p'), link('在 CBETA 線上閱讀對照原文', SOURCE.reader)),
  ));

  const notice = el('ol', 'about-notice');
  for (const line of CBETA_NOTICE) notice.appendChild(el('li', null, line));
  const version = el('ul', 'about-version');
  for (const line of CBETA_VERSION) version.appendChild(el('li', null, line));
  page.appendChild(section(
    'CBETA 資料庫使用說明與版本資訊',
    el('p', null, '依 CBETA 的規定，附上其使用說明與本書所用的版本資訊：'),
    notice,
    version,
    append(el('p'), link('財團法人佛教電子佛典基金會 版權宣告', SOURCE.license)),
  ));

  page.appendChild(section(
    '白話、註解與情境題',
    el('p', null, '白話、難詞註解、導讀和生活情境題，由蔬米 OMILKYWAY 編寫（有 AI 協助），不是轉載任何一家的譯本。目的是幫初學的人把經文讀懂，難免有不夠精確的地方；義理請以經文本身和善知識的講解為準。'),
    el('p', null, '情境題沒有標準答案，也不計分。'),
  ));

  page.appendChild(section(
    '插圖與朗讀',
    el('p', null, '插圖是 AI 生成的示意圖，畫的是各章的意象，不是歷史考據。'),
    el('p', null, '朗讀使用你的瀏覽器內建的語音，聲音和讀音依裝置而不同；有些字的讀音可能和傳統讀誦不一樣。'),
  ));

  page.appendChild(section(
    '流通',
    el('p', null, '本書免費、非營利，沒有廣告。歡迎分享網址。經文部分依 CBETA 的授權（姓名標示-非商業性-相同方式分享 4.0）；其餘內容也歡迎非營利流通，請註明出處。'),
    append(el('p'), el('span', null, '製作：'), link('蔬米 OMILKYWAY', 'https://omilkyway.org/')),
  ));

  const reset = button('清除閱讀進度', 'btn danger', () => {
    if (reset.dataset.armed !== 'yes') {
      reset.dataset.armed = 'yes';
      reset.textContent = '再按一次，確定清除';
      return;
    }
    store.reset();
    reset.dataset.armed = '';
    reset.textContent = '已清除';
    reset.disabled = true;
    ctx.refreshTopbar();
  }, 'reset');
  page.appendChild(section(
    '你的紀錄',
    el('p', null, '閱讀進度、點亮的寶珠和每日十善的紀錄，只存在這台裝置的瀏覽器裡，不會上傳到任何地方。換裝置或清除瀏覽資料，紀錄就會不見。'),
    el('p', null, '有些瀏覽器會自己清：例如 iPhone 的 Safari，大約一個星期沒有回來讀，就會把網站存的資料清掉；如果是嵌在別的網頁裡閱讀，關掉 Safari 之後進度就不在了。想保存得久一點，請直接開啟本書的網址來讀。'),
    el('p', null, '另外，本書使用 Google Analytics 統計有多少人來讀、看了哪些頁面、從哪裡連過來，不包含上面這些閱讀紀錄。'),
    reset,
  ));

  const actions = el('div', 'land-actions');
  append(actions, button('目錄', 'btn', () => go('toc')), button('回封面', 'btn', () => go('')));
  page.appendChild(actions);
  root.appendChild(page);
}
