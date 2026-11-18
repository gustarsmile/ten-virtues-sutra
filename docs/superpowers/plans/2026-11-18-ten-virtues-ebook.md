# 《十善業道經》互動電子書 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> 執行方式：使用者已選「直接做」，由同一個 session 自己逐項實作（native），不停下來等審。
>
> **狀態（2026-11-18）：** Task 1–9 完成並上線。Task 10 的部落格文章已存成草稿，等使用者審稿後發布。上線後追加了三件事（細節見 git log 與 spec 的「追加」一節）：使用者要求的點圖放大；獨立審查白話與註解後的修正；獨立程式審查後的修正（觸控誤翻頁、放著過夜、兩個分頁、嵌入時的瀏覽歷程等）。下面的核取方塊沒有逐一回頭打勾。

**Goal:** 做出一本可以在手機上從頭讀到尾、帶五種互動的《十善業道經》網頁電子書，發布到 GitHub Pages，並在 omilkyway.org 建立介紹文章草稿。

**Architecture:** 純靜態網頁。`js/data/*.json` 是內容（經文原文、白話、註解、情境題），`js/*.js` 是不碰 DOM 的邏輯（讀資料、進度、每日十善、朗讀、路由），`js/ui/*.js` 是畫面。`js/app.js` 依 hash 路由切換畫面。

**Tech Stack:** 原生 ES modules、CSS、localStorage、Web Speech API；vitest＋happy-dom；sharp（壓圖）。

**Spec:** `docs/superpowers/specs/2026-11-18-ten-virtues-ebook-design.md`

## Global Constraints

- 經文 `raw` 串接後必須與 `tests/fixtures/T0600-cbeta.txt` 去空白後逐字相同（含標點）。
- 寶珠總數 71，十善各章依序 10、10、4、8、5、8、3、5、8、10。
- 白話、註解、情境題全部自寫；不寫嚇人的報應、不貶其他信仰、不寫療效。
- 無建置步驟；不引入執行期相依套件；不發送任何網路請求（除了載入自己的檔案）。
- 存檔鍵：`shishanBook.v1`、`shishanDaily.v1`。正式網址：`https://gustarsmile.github.io/ten-virtues-sutra/`。
- 畫面文字用台灣繁體中文。

## Review Focus

1. localStorage 不能用（無痕模式、iframe 被擋而丟例外）→ 書照樣能讀，只是不保存。→ Task 3、4 的測試。
2. 存檔內容壞掉或是舊格式 → 當成沒有存檔，不當機。→ Task 3、4。
3. 沒有 `speechSynthesis` 或沒有中文語音 → 不顯示朗讀鈕，不當機。→ Task 5、6。
4. 深連結到不存在的頁（`#/ch/99`、`#/xyz`）→ 回封面。→ Task 5。
5. 每日十善跨過午夜、以及時區：日期鍵用本地日期而不是 UTC。→ Task 4。

---

## 檔案

```
index.html
css/style.css
js/config.js        常數（網址、存檔鍵、寶珠數）
js/book.js          載入資料、頁序、原文處理（純函式）
js/state.js         閱讀進度（寶珠、已讀、情境題、配對、上次位置）
js/daily.js         每日十善（日期鍵、打勾、近七日、連續天數）
js/speech.js        朗讀（包 speechSynthesis）
js/router.js        hash ↔ 路由
js/app.js           組裝：依路由畫出對應畫面、頂列、翻頁手勢
js/main.js          進入點
js/ui/dom.js        el()、button()、artImg()
js/ui/gloss.js      原文裡的難詞按鈕與註解
js/ui/coverView.js  tocView.js  chapterView.js  matchView.js  landView.js  dailyView.js  aboutView.js
js/data/chapters.json  glossary.json  daily.json
assets/art/*.webp  assets/og.png  assets/favicon.svg
scripts/art-manifest.mjs  optimize-art.mjs
tests/*.test.js  tests/fixtures/T0600-cbeta.txt  tests/helpers/loadBook.js
```

---

### Task 1：內容資料與逐字比對

**Files:** Create `js/data/chapters.json`、`js/data/glossary.json`、`js/data/daily.json`、`js/config.js`、`tests/helpers/loadBook.js`；Test `tests/fidelity.test.js`、`tests/data.test.js`

**Interfaces — Produces:**
- `tests/helpers/loadBook.js`：`loadBookFromDisk(): { chapters, glossary, daily }`（用 `fs` 讀 JSON）
- `js/config.js`：`BOOK_TITLE`、`BOOK_SUBTITLE`、`BOOK_URL`、`SAVE_KEY`、`DAILY_KEY`、`TOTAL_PEARLS = 71`、`BENEFIT_COUNTS = [10,10,4,8,5,8,3,5,8,10]`

- [ ] **Step 1：寫會失敗的測試**
  - `fidelity`：所有章節 blocks 依序取 `raw`（passage 取自身、list 取每個 item）串接，去掉空白字元後 `===` fixture 去掉空白字元。失敗時印出第一個不同的位置前後各 20 字。
  - `data`：15 章、`no` 為 1–15、`id` 為 `ch01`–`ch15`；kind 依序 intro、one、virtue×10、giving、adorn、earth；virtue 章的 benefits 項目數等於 `BENEFIT_COUNTS`、總和 71；每個 virtue 章有 `scenario`（3 個選項、各有 `text` 與 `reply`）、`takeaway`、`virtue.index` 1–10、`virtue.group` 為 身身身口口口口意意意；每個 passage 與 item 都有非空的 `plain`；每個 `terms` 鍵都在 glossary 裡，且該 term 字串出現在該區塊的 raw；第 13 章清單 10 項、第 14 章 20 項；`daily.items` 10 項。
- [ ] **Step 2：跑測試確認失敗**（`npx vitest run tests/fidelity.test.js tests/data.test.js`）
- [ ] **Step 3：寫資料**（依 spec 的章節表切分；白話自寫）
- [ ] **Step 4：跑測試到全綠**
- [ ] **Step 5：Commit**

### Task 2：`js/book.js`

**Files:** Create `js/book.js`；Test `tests/book.test.js`

**Interfaces — Produces:**
- `loadBook(fetchJson?): Promise<{ chapters, glossary, daily }>`
- `benefitList(chapter): block | null`（`role === 'benefits'` 的清單）
- `virtueChapters(chapters): chapter[]`（10 個，依 `virtue.index` 排序）
- `pages(chapters): string[]` → `['ch/1',…,'ch/12','match','ch/13','ch/14','ch/15','land']`
- `nextRoute(chapters, route): string | null`、`prevRoute(chapters, route): string | null`（`'ch/1'` 的上一頁是 `''` 封面；封面的下一頁是 `'ch/1'`；不在頁序裡的路由回 `null`）
- `displayText(raw): string`（去掉開頭的「一、」「一者、」與結尾的 ；。，以及「」）
- `splitSentences(text): string[]`（以 。！？； 斷句、去掉「」與空字串，供朗讀）
- `chapterRaw(chapter): string`（整章原文串接）

- [ ] 測試：上述每個函式各一組斷言（`displayText('一者、資財盈積，王、賊、水、火，及非愛子，不能散滅；')` → `'資財盈積，王、賊、水、火，及非愛子，不能散滅'`；`displayText('九、住無礙見，')` → `'住無礙見'`；`pages` 長度 17、`nextRoute(c,'ch/12') === 'match'`、`prevRoute(c,'ch/13') === 'match'`、`nextRoute(c,'land') === null`）。
- [ ] 失敗 → 實作 → 通過 → Commit

### Task 3：`js/state.js`

**Files:** Create `js/state.js`；Test `tests/state.test.js`

**Interfaces — Produces:** `createStore(storage?)` 回傳
`lightPearl(chId, idx): boolean`（新點亮才回 true）、`isLit(chId, idx)`、`litCount(chId)`、`totalLit()`、`markSeen(chId)`、`isSeen(chId)`、`setScenario(chId, i)`、`getScenario(chId): number | null`、`setMatchDone()`、`isMatchDone()`、`setLast(route)`、`getLast(): string`、`isVirtueComplete(chapter): boolean`、`completedVirtues(chapters): number[]`、`reset()`

- [ ] 測試：點亮同一顆兩次只算一次；跨 `createStore` 重建後資料還在；storage 的 `getItem`/`setItem` 丟例外時不丟出、功能照常（記憶體內）；存檔是亂碼或 `{"v":0}` 時視為空；`isVirtueComplete` 在該章寶珠全亮時為 true；`reset()` 清空並移除存檔。
- [ ] 失敗 → 實作 → 通過 → Commit

### Task 4：`js/daily.js`

**Files:** Create `js/daily.js`；Test `tests/daily.test.js`

**Interfaces — Produces:** `dateKey(d: Date): 'YYYY-MM-DD'`（本地日期）；`createDaily(storage?, now?)` 回傳 `today(): boolean[10]`、`toggle(i): boolean`、`countToday(): number`、`history(n = 7): { key, count: number | null }[]`（由舊到新）、`streak(): number`

- [ ] 測試：`dateKey(new Date(2026, 10, 18, 23, 59))` → `'2026-11-18'`、`new Date(2026, 10, 19, 0, 1)` → `'2026-11-19'`；toggle 後 `countToday` 增減；換一天（注入的 `now` 往後一天）`today()` 全 false、昨天的紀錄仍在 `history`；`streak`：今天有紀錄且昨天有 → 2；今天還沒勾、昨天前天有 → 2；中斷一天 → 重算；只保留最近 90 天；storage 丟例外或亂碼時不當機。
- [ ] 失敗 → 實作 → 通過 → Commit

### Task 5：`js/speech.js`、`js/router.js`

**Files:** Create `js/speech.js`、`js/router.js`；Test `tests/speech.test.js`、`tests/router.test.js`

**Interfaces — Produces:**
- `pickVoice(voices): voice | null`（優先 `zh-TW`，其次其他 `zh` 開頭，沒有回 null）
- `createSpeech({ synth, Utterance }?)` 回傳 `{ supported: boolean, speak(sentences: string[], { onEnd }?), stop(), isSpeaking(): boolean }`；`synth` 或 `Utterance` 不存在時 `supported === false`，`speak`/`stop` 是 no-op。
- `parseRoute(hash): { name: 'cover'|'toc'|'ch'|'match'|'land'|'daily'|'about', no?: number, route: string }`（`'#/ch/3'` → `{ name:'ch', no:3, route:'ch/3' }`；`'#/ch/99'`、`'#/ch/abc'`、`'#/xyz'`、`''` → cover）
- `toHash(route): string`（`''` → `'#/'`）

- [ ] 失敗 → 實作 → 通過 → Commit

### Task 6：畫面

**Files:** Create `js/ui/*.js`、`js/app.js`、`js/main.js`、`index.html`、`css/style.css`；Test `tests/views.test.js`、`tests/html.test.js`

**Interfaces — Consumes:** Task 1–5 全部。**Produces:** `createApp({ root, book, store, daily, speech, win }): { render(), go(route) }`；各 view `renderX(root, ctx)`，`ctx = { book, store, daily, speech, go, route }`。

- [ ] 測試（happy-dom，資料從磁碟讀）：
  - 封面有書名與「開始閱讀」；有存檔位置時顯示「繼續閱讀」。
  - `go('ch/3')`：畫面含「離殺生」、原文片段「若離殺生」、10 顆未亮的寶珠；點第一顆 → 顯示白話、該顆有 `lit`、頂列寶珠數變 1／71。
  - 情境題：點一個選項 → 顯示該選項的回饋，並記到 store。
  - 難詞：點「阿耨多羅三藐三菩提」→ 出現註解文字。
  - 配對：依正解點完十組 → 顯示完成訊息、`store.isMatchDone()`。
  - 十善大地：沒進度時 10 方都有 `mist`；把第 3 章寶珠全點亮後第 1 方沒有 `mist`。
  - 每日十善：點第一項 → 打勾、計數 1／10。
  - 不存在的路由回封面；`speech.supported === false` 時畫面上沒有朗讀鈕。
  - 每一章都能渲染不丟例外（迴圈 1–15）。
  - `html`：`index.html` 的 og:url、og:image 與 `BOOK_URL` 一致；有 description、theme-color、favicon。
- [ ] 失敗 → 實作 → 通過 → Commit

### Task 7：插圖

**Files:** Create `scripts/art-manifest.mjs`、`scripts/optimize-art.mjs`、`assets/art/*.webp`、`assets/og.png`、`assets/favicon.svg`；Test `tests/art.test.js`

- 清單 16 張：`cover`、`c01-assembly`、`c02-one-dharma`、`v01-no-killing`、`v02-no-stealing`、`v03-fidelity`、`v04-truth`、`v05-harmony`、`v06-gentle-speech`、`v07-meaningful-speech`、`v08-contentment`、`v09-patience`、`v10-right-view`、`c13-giving`、`c14-adornments`、`c15-earth`。
- [ ] 測試：清單 16 張都在 `assets/art/`；每章的 `art` 都在清單裡；總體積 < 4MB；`og.png` 存在且 < 500KB。
- [ ] 生圖（draw 技能、low、1536×1024）→ 逐張過目（不得有字、人物不被裁切）→ `npm run opt-art` → 通過 → Commit

### Task 8：本機驗收與 README

- [ ] `npm run dev`，用瀏覽器以 390×844 與 1280×800 各走一輪（翻頁、寶珠、情境題、配對、大地、每日十善、朗讀、重新整理後進度還在、iframe 內可用），截圖留給文章用。
- [ ] 寫 `README.md`（執行、測試、部署、資料慣例、授權）。Commit。

### Task 9：上線

- [ ] `gh repo create gustarsmile/ten-virtues-sutra --public --source . --push`，啟用 Pages（main 分支根目錄）。
- [ ] 等部署完成後開正式網址確認首頁、第 3 章、資料檔都是 200。

### Task 10：部落格草稿

- [ ] 文章（Gutenberg 區塊）：十善業道經是什麼、十善是哪十善、十善白話與功德、可展開的全文、電子書介紹與嵌入、常見問題、延伸閱讀、參考資料。
- [ ] 首圖 1600×900 JPG、內文截圖；上傳媒體、建草稿（作者 4、分類 180、標籤、不寄電子報）、Rank Math 關鍵字。
- [ ] 用預覽連結確認畫面，交給使用者審。

### Task 11：收尾

- [ ] 更新工作資料夾的 `文章規劃與關鍵字清單.md` 與記憶。
