// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from 'vitest';
import { loadBookFromDisk, memoryStorage } from './helpers/loadBook.js';
import { createApp } from '../js/app.js';
import { createStore } from '../js/state.js';
import { createDaily } from '../js/daily.js';
import { createSpeech } from '../js/speech.js';
import { benefitList } from '../js/book.js';

const book = loadBookFromDisk();
const noSpeech = () => createSpeech({ synth: undefined, Utterance: undefined });

function fakeSpeech() {
  const spoken = [];
  class U { constructor(t) { this.text = t; } }
  const synth = { getVoices: () => [{ lang: 'zh-TW', name: 'v' }], speak: (u) => spoken.push(u), cancel() {} };
  return { speech: createSpeech({ synth, Utterance: U }), spoken };
}

let root; let store; let daily; let app;
function boot({ speech = noSpeech(), storage = memoryStorage(), hash = '' } = {}) {
  app?.destroy(); // 上一個測試的 app 不要留在頁面上繼續聽鍵盤
  window.location.hash = hash;
  root = document.createElement('div');
  document.body.innerHTML = '';
  document.body.appendChild(root);
  store = createStore(storage);
  daily = createDaily(memoryStorage(), () => new Date(2026, 10, 18, 12));
  app = createApp({ root, book, store, daily, speech, win: window });
  app.render();
  return app;
}
const $ = (sel) => root.querySelector(sel);
const $$ = (sel) => [...root.querySelectorAll(sel)];
const text = () => root.textContent;

beforeEach(() => { boot(); });

describe('封面', () => {
  it('有書名、譯者和「開始閱讀」', () => {
    expect($('.cover h1').textContent).toBe('十善業道經');
    expect(text()).toContain('實叉難陀');
    expect($('[data-action="start"]')).toBeTruthy();
    expect($('[data-action="continue"]')).toBeNull();
  });
  it('按「開始閱讀」到第一章', () => {
    $('[data-action="start"]').click();
    expect(window.location.hash).toBe('#/ch/1');
    expect($('.chapter h1').textContent).toBe('龍宮法會');
  });
  it('讀過之後回封面，會出現「繼續閱讀」並帶回上次的章節', () => {
    app.go('ch/5');
    app.go('');
    const btn = $('[data-action="continue"]');
    expect(btn.textContent).toContain('離邪行');
    btn.click();
    expect(window.location.hash).toBe('#/ch/5');
  });
  it('存檔裡的「上次位置」不是真的書頁（舊版、被改過）→ 不顯示「繼續閱讀」', () => {
    for (const last of ['ch/99', 'toc', 'xyz']) {
      const storage = memoryStorage({ 'shishanBook.v1': JSON.stringify({ v: 1, pearls: {}, seen: [], scenario: {}, match: false, last }) });
      boot({ storage });
      expect($('[data-action="continue"]'), last).toBeNull();
      expect($('[data-action="start"]'), last).toBeTruthy();
    }
  });
  it('上次停在配對或大地，也能繼續', () => {
    app.go('match'); app.go('');
    expect($('[data-action="continue"]').textContent).toContain('十善配對');
    app.go('land'); app.go('');
    expect($('[data-action="continue"]').textContent).toContain('我的十善大地');
  });
  it('封面不顯示頂列，其他頁有', () => {
    expect($('.topbar').hidden).toBe(true);
    app.go('toc');
    expect($('.topbar').hidden).toBe(false);
  });
});

describe('章節頁', () => {
  it('十五章都能畫出來，標題、原文、白話都在', () => {
    for (const ch of book.chapters) {
      app.go(`ch/${ch.no}`);
      expect($('.chapter h1').textContent, ch.id).toBe(ch.title);
      const firstRaw = ch.blocks[0].raw.replace(/[「」]/g, '').slice(0, 8);
      expect($('.sutra').textContent.replace(/[「」]/g, ''), ch.id).toContain(firstRaw);
      expect($('.sutra').textContent, ch.id).toContain(ch.blocks[0].plain.slice(0, 8));
      expect($('.chapter img').getAttribute('src'), ch.id).toBe(`assets/art/${ch.art}`);
      expect($('.chapter img').getAttribute('alt'), ch.id).toBe(ch.alt);
    }
  });
  it('原文一字不漏地出現在畫面上（第 3 章）', () => {
    app.go('ch/3');
    const shown = $('.sutra').textContent.replace(/\s/g, '');
    for (const b of book.chapters[2].blocks) {
      const raws = b.type === 'list' ? b.items.map((i) => i.raw) : [b.raw];
      for (const raw of raws) expect(shown).toContain(raw);
    }
  });
  it('看過的章會記下來，並更新「上次讀到」', () => {
    app.go('ch/4');
    expect(store.isSeen('ch04')).toBe(true);
    expect(store.getLast()).toBe('ch/4');
  });
  it('上一頁、下一頁照頁序走；第 12 章之後是配對', () => {
    app.go('ch/12');
    $('[data-action="next"]').click();
    expect(window.location.hash).toBe('#/match');
    app.go('ch/1');
    $('[data-action="prev"]').click();
    expect(window.location.hash).toBe('#/');
  });
  it('第 2 章有十善一覽，點一下跳到那一章', () => {
    app.go('ch/2');
    const chips = $$('.overview-chip');
    expect(chips).toHaveLength(10);
    expect(chips[3].textContent).toContain('不妄語');
    chips[3].click();
    expect(window.location.hash).toBe('#/ch/6');
  });
  it('白話可以收起來再打開', () => {
    app.go('ch/1');
    const toggle = $('[data-action="toggle-plain"]');
    expect($('.passage .plain').hidden).toBe(false);
    toggle.click();
    expect($$('.passage .plain').every((p) => p.hidden)).toBe(true);
    toggle.click();
    expect($('.passage .plain').hidden).toBe(false);
  });
});

describe('功德寶珠', () => {
  it('第 3 章有 10 顆，一開始都沒亮，白話藏著', () => {
    app.go('ch/3');
    expect($$('.pearl')).toHaveLength(10);
    expect($$('.pearl.lit')).toHaveLength(0);
    expect($$('.pearl-row .plain').every((p) => p.hidden)).toBe(true);
    expect($('.tb-pearls').textContent).toContain('0／71');
  });
  it('點一顆：亮起來、顯示白話、計數加一、存進進度', () => {
    app.go('ch/3');
    $$('.pearl')[0].click();
    expect($$('.pearl')[0].classList.contains('lit')).toBe(true);
    expect($$('.pearl')[0].getAttribute('aria-pressed')).toBe('true');
    expect($$('.pearl-row .plain')[0].hidden).toBe(false);
    expect($$('.pearl-row .plain')[0].textContent).toContain('不必害怕');
    expect($('.tb-pearls').textContent).toContain('1／71');
    expect($('.pearl-count').textContent).toContain('1／10');
    expect(store.isLit('ch03', 0)).toBe(true);
  });
  it('重複點同一顆不會重複計數', () => {
    app.go('ch/3');
    $$('.pearl')[0].click(); $$('.pearl')[0].click();
    expect(store.totalLit()).toBe(1);
    expect($('.tb-pearls').textContent).toContain('1／71');
  });
  it('離開再回來，亮過的還是亮的', () => {
    app.go('ch/3');
    $$('.pearl')[2].click();
    app.go('ch/4'); app.go('ch/3');
    expect($$('.pearl')[2].classList.contains('lit')).toBe(true);
    expect($$('.pearl-row .plain')[2].hidden).toBe(false);
    expect($$('.pearl.lit')).toHaveLength(1);
  });
  it('全部點亮後出現圓滿訊息', () => {
    app.go('ch/5');
    expect($('.virtue-done').hidden).toBe(true);
    $$('.pearl').forEach((p) => p.click());
    expect($('.virtue-done').hidden).toBe(false);
    expect(store.isVirtueComplete(book.chapters[4])).toBe(true);
  });
  it('每一章的寶珠數等於該章功德條數', () => {
    for (const ch of book.chapters.filter((c) => c.kind === 'virtue')) {
      app.go(`ch/${ch.no}`);
      expect($$('.pearl'), ch.id).toHaveLength(benefitList(ch).items.length);
    }
  });
  it('十善以外的章節沒有寶珠', () => {
    for (const no of [1, 2, 13, 14, 15]) {
      app.go(`ch/${no}`);
      expect($$('.pearl'), `第 ${no} 章`).toHaveLength(0);
    }
  });
});

describe('可展開的清單（第 13、14 章）', () => {
  it('第 14 章 20 項，點一項才顯示白話；「止」那一項有校勘說明', () => {
    app.go('ch/14');
    const rows = $$('.fold-row');
    expect(rows).toHaveLength(20);
    const zhi = rows[17];
    expect(zhi.querySelector('.plain').hidden).toBe(true);
    zhi.querySelector('.fold-head').click();
    expect(zhi.querySelector('.plain').hidden).toBe(false);
    expect(zhi.textContent).toContain('校勘');
    zhi.querySelector('.fold-head').click();
    expect(zhi.querySelector('.plain').hidden).toBe(true);
  });
  it('第 14 章依修行類別分組', () => {
    app.go('ch/14');
    expect($$('.fold-group').map((g) => g.textContent)).toEqual(
      ['六度（布施見上一章）', '四無量心', '四攝法', '三十七道品', '止觀', '方便'],
    );
  });
});

describe('情境題', () => {
  it('選一個選項就顯示那個選項的回饋，並記下來', () => {
    app.go('ch/3');
    const opts = $$('.scenario .option');
    expect(opts).toHaveLength(3);
    expect($('.scenario .reply').hidden).toBe(true);
    opts[1].click();
    expect($('.scenario .reply').hidden).toBe(false);
    expect($('.scenario .reply').textContent).toContain('普施無畏');
    expect(opts[1].classList.contains('chosen')).toBe(true);
    expect(store.getScenario('ch03')).toBe(1);
  });
  it('可以改選', () => {
    app.go('ch/3');
    $$('.scenario .option')[0].click();
    $$('.scenario .option')[2].click();
    expect($$('.scenario .option.chosen')).toHaveLength(1);
    expect($('.scenario .reply').textContent).toContain('不傷害牠');
    expect(store.getScenario('ch03')).toBe(2);
  });
  it('回到這一章時，上次的選擇還在', () => {
    app.go('ch/3');
    $$('.scenario .option')[0].click();
    app.go('ch/4'); app.go('ch/3');
    expect($$('.scenario .option')[0].classList.contains('chosen')).toBe(true);
    expect($('.scenario .reply').hidden).toBe(false);
  });
});

describe('難詞註解', () => {
  it('點難詞出現註解，再點一次收起來', () => {
    app.go('ch/3');
    const term = $$('.term').find((b) => b.textContent === '阿耨多羅三藐三菩提');
    expect(term).toBeTruthy();
    term.click();
    expect($('.gloss-note:not([hidden])').textContent).toContain('無上正等正覺');
    term.click();
    expect($('.gloss-note:not([hidden])')).toBeNull();
  });
  it('同一段點另一個詞，註解換成新的', () => {
    app.go('ch/1');
    const first = $('.passage');
    const terms = [...first.querySelectorAll('.term')];
    terms[0].click();
    terms[1].click();
    const open = [...first.querySelectorAll('.gloss-note:not([hidden])')];
    expect(open).toHaveLength(1);
    expect(open[0].textContent).toContain('鹹海');
  });
  it('註解按鈕不會改動原文', () => {
    app.go('ch/14');
    const raws = $$('.fold-row .raw').map((n) => n.textContent);
    expect(raws[14]).toBe('力莊嚴故，眾怨盡滅，無能壞者；');
    expect(raws[19]).toBe('方便莊嚴故，速得成滿為、無為樂。');
  });
});

describe('朗讀', () => {
  it('瀏覽器不支援時，沒有朗讀鈕', () => {
    app.go('ch/3');
    expect($('.btn-speak')).toBeNull();
  });
  it('支援時，按下去一句一句唸這一章的原文；再按一次停止', () => {
    const { speech, spoken } = fakeSpeech();
    boot({ speech });
    app.go('ch/3');
    const btn = $('.btn-speak');
    btn.click();
    expect(spoken[0].text).toBe('龍王！');
    expect(btn.getAttribute('aria-pressed')).toBe('true');
    btn.click();
    expect(speech.isSpeaking()).toBe(false);
    expect(btn.getAttribute('aria-pressed')).toBe('false');
  });
  it('翻到別頁就停止朗讀', () => {
    const { speech } = fakeSpeech();
    boot({ speech });
    app.go('ch/3');
    $('.btn-speak').click();
    expect(speech.isSpeaking()).toBe(true);
    app.go('ch/4');
    expect(speech.isSpeaking()).toBe(false);
  });
});

describe('十善配對', () => {
  const pairAll = () => {
    for (const left of $$('.match-left button')) {
      left.click();
      $$('.match-right button').find((r) => r.dataset.key === left.dataset.key).click();
    }
  };
  it('左右各十個', () => {
    app.go('match');
    expect($$('.match-left button')).toHaveLength(10);
    expect($$('.match-right button')).toHaveLength(10);
    expect($$('.match-left button')[0].textContent).toContain('不殺生');
    expect($$('.match-right button').map((b) => b.textContent)).toContain('十離惱法');
  });
  it('配對正確：兩邊都鎖住', () => {
    app.go('match');
    const left = $$('.match-left button')[0];
    left.click();
    const right = $$('.match-right button').find((r) => r.dataset.key === left.dataset.key);
    right.click();
    expect(left.disabled).toBe(true);
    expect(right.disabled).toBe(true);
    expect(left.classList.contains('matched')).toBe(true);
  });
  it('配對錯誤：不鎖，可以再試', () => {
    app.go('match');
    const left = $$('.match-left button')[0];
    left.click();
    const wrong = $$('.match-right button').find((r) => r.dataset.key !== left.dataset.key);
    wrong.click();
    expect(left.disabled).toBe(false);
    expect(wrong.disabled).toBe(false);
    expect($('.match-msg').textContent).toBeTruthy();
    expect(store.isMatchDone()).toBe(false);
  });
  it('十組全對：顯示完成並記錄', () => {
    app.go('match');
    expect($('.match-done').hidden).toBe(true);
    pairAll();
    expect($('.match-done').hidden).toBe(false);
    expect(store.isMatchDone()).toBe(true);
  });
  it('沒先選左邊就點右邊，不會出錯', () => {
    app.go('match');
    expect(() => $$('.match-right button')[0].click()).not.toThrow();
    expect($$('.matched')).toHaveLength(0);
  });
});

describe('十善大地', () => {
  it('還沒有進度：十方都是雲霧', () => {
    app.go('land');
    expect($$('.land-tile')).toHaveLength(10);
    expect($$('.land-tile.mist')).toHaveLength(10);
    expect($('.land-count').textContent).toContain('0／10');
  });
  it('圓滿一善，那一方就散開', () => {
    app.go('ch/3');
    $$('.pearl').forEach((p) => p.click());
    app.go('land');
    expect($$('.land-tile')[0].classList.contains('mist')).toBe(false);
    expect($$('.land-tile.mist')).toHaveLength(9);
    expect($('.land-count').textContent).toContain('1／10');
  });
  it('點有雲霧的一方，前往那一章', () => {
    app.go('land');
    $$('.land-tile')[4].click();
    expect(window.location.hash).toBe('#/ch/7');
  });
  it('十善全圓滿：顯示大地的譬喻原文', () => {
    for (const ch of book.chapters.filter((c) => c.kind === 'virtue')) {
      benefitList(ch).items.forEach((_, i) => store.lightPearl(ch.id, i));
    }
    app.go('land');
    expect($$('.land-tile.mist')).toHaveLength(0);
    expect($('.land-complete').hidden).toBe(false);
    expect($('.land-complete').textContent).toContain('咸共依此十善大地而得成就');
  });
});

describe('每日十善', () => {
  it('十項，勾一項計數變 1／10', () => {
    app.go('daily');
    const boxes = $$('.daily-item input[type="checkbox"]');
    expect(boxes).toHaveLength(10);
    expect($('.daily-count').textContent).toContain('0／10');
    boxes[0].click();
    expect($('.daily-count').textContent).toContain('1／10');
    expect(daily.today()[0]).toBe(true);
  });
  it('顯示今天的日期與最近七天', () => {
    app.go('daily');
    expect(text()).toContain('2026 年 11 月 18 日');
    expect($$('.daily-day')).toHaveLength(7);
  });
  it('離開再回來，勾過的還在', () => {
    app.go('daily');
    $$('.daily-item input')[3].click();
    app.go('toc'); app.go('daily');
    expect($$('.daily-item input')[3].checked).toBe(true);
  });
});

describe('目錄與關於', () => {
  it('目錄列出十五章與其他頁，點了會過去', () => {
    app.go('toc');
    expect($$('.toc-chapter')).toHaveLength(15);
    expect(text()).toContain('十善配對');
    expect(text()).toContain('每日十善');
    $$('.toc-chapter')[6].click();
    expect(window.location.hash).toBe('#/ch/7');
  });
  it('目錄顯示各章寶珠進度', () => {
    store.lightPearl('ch03', 0); store.lightPearl('ch03', 1);
    app.go('toc');
    expect($$('.toc-chapter')[2].textContent).toContain('2／10');
  });
  it('關於本書：有底本、版本、授權與 AI 插圖的說明', () => {
    app.go('about');
    for (const s of ['大正新脩大藏經', 'No. 600', 'CBETA', '2026.R2', '非營利', '姓名標示-非商業性-相同方式分享', 'AI', '不會上傳']) {
      expect(text(), s).toContain(s);
    }
  });
  it('關於本書：照實說明有用 Google Analytics 統計瀏覽，而且不包含閱讀紀錄', () => {
    app.go('about');
    expect(text()).toContain('Google Analytics');
    expect(text()).toMatch(/Google Analytics[^。]*不包含/);
  });
  it('清除進度要按兩次才生效', () => {
    store.lightPearl('ch03', 0);
    app.go('about');
    const btn = $('[data-action="reset"]');
    btn.click();
    expect(store.totalLit()).toBe(1);
    btn.click();
    expect(store.totalLit()).toBe(0);
  });
});

describe('路由', () => {
  it('不存在的頁回封面', () => {
    for (const hash of ['#/ch/99', '#/xyz', '#/ch/abc']) {
      boot({ hash });
      expect($('.cover'), hash).toBeTruthy();
    }
  });
  it('直接用網址進到某一章', () => {
    boot({ hash: '#/ch/9' });
    expect($('.chapter h1').textContent).toBe('離綺語');
  });
  it('瀏覽器的上一頁（hashchange）會重畫', () => {
    app.go('ch/3');
    window.location.hash = '#/ch/4';
    window.dispatchEvent(new Event('hashchange'));
    expect($('.chapter h1').textContent).toBe('離偷盜');
  });
  it('頁面標題跟著換', () => {
    app.go('ch/3');
    expect(document.title).toContain('離殺生');
    app.go('');
    expect(document.title).toContain('十善業道經');
  });
});
