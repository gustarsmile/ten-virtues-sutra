# 十善業道經｜互動電子書

《十善業道經》（唐・實叉難陀譯，大正藏 T15 No.600）的網頁電子書：全經原文、白話、註解、朗讀，加上五種取自經文的互動。蔬米 OMILKYWAY「經典互動」系列之一，和弟子規小遊戲、三款遊記遊戲同一個家族。

正式網址：<https://gustarsmile.github.io/ten-virtues-sutra/>

## 這本書有什麼

- **15 章**：龍宮法會 → 一法 → 十善各一章 → 以施莊嚴 → 種種莊嚴 → 十善大地。原文一字不漏，每段有白話，難詞可以點開看註解，每章可以朗讀。
- **功德寶珠**：十善各自的功德共 71 條（10、10、4、8、5、8、3、5、8、10），一條一顆，點了才亮、才顯示白話。
- **生活情境題**：十善各一題，三個選項，選完給回饋，不計分。
- **十善配對**：十善 ↔ 所得功德的名目。
- **我的十善大地**：一張大地的圖分成十方，圓滿一善（該章寶珠全亮）就散開一方雲霧。
- **每日十善**：對應經文「晝夜常念思惟觀察善法」，每天十項自我檢核。
- **點圖放大**：封面和各章插圖點一下就全螢幕看完整的圖（版面上的是裁切過的），點任意處、✕、Esc 或手機返回鍵關閉。做法比照《天堂遊記》。「我的十善大地」要十方雲霧都散開之後才能放大。

進度只存在讀者自己的瀏覽器裡（`localStorage`），沒有帳號、沒有追蹤碼、不載入任何外部資源。

## 執行

```bash
npm install
npm run dev        # http://localhost:8010（不要直接雙擊 index.html，瀏覽器不讓 file:// 讀 JSON）
npx vitest run     # 全部測試
```

## 部署

整個資料夾就是純靜態網站，沒有建置步驟。GitHub Pages 設定為 `main` 分支根目錄，push 之後自動發布。

換網址時要改兩處：`js/config.js` 的 `BOOK_URL`，以及 `index.html` 的 `og:url`、`og:image`（`tests/html.test.js` 會檢查兩邊一致）。

## 嵌入其他網頁

```html
<iframe
  src="https://gustarsmile.github.io/ten-virtues-sutra/"
  title="十善業道經互動電子書"
  style="width: 100%; max-width: 560px; height: 820px; border: 0; border-radius: 8px; display: block; margin: 0 auto;"
  loading="lazy">
</iframe>
```

iframe 裡的進度和直接開網址的進度是分開的兩份（瀏覽器把它當成第三方儲存空間），而且 iPhone 的 Safari 關掉之後，嵌入頁面裡存的進度就沒了。所以旁邊最好再放一個「全螢幕開啟」的連結；書的封面在被嵌入時也會自己顯示這個提醒。

被嵌入時翻頁用 `location.replace`，不留瀏覽歷程——不然讀者每翻一頁，外面那個網頁就多一筆「上一頁」，要按很多次返回才離得開那篇文章。直接開網址時則照常留歷程，返回鍵可以回上一頁。

## 幾個實際使用才會遇到的狀況（都有測試）

- **觸控翻頁**只認「單指、0.6 秒內、水平位移明顯大於垂直」的一滑。兩指（捏合縮放）、畫面放大時的平移、從螢幕邊緣滑入（iPhone 的返回手勢）、正在選字、在配對盤面上拖曳，都不翻頁。
- **放著過夜**：每日十善的畫面記得自己是為哪一天畫的；過了午夜再操作，會寫進新的一天並整頁換成今天。分頁切回來時也會更新。
- **開兩個分頁**：進度每次寫入前都先重讀一次，兩邊不會拿著各自的舊資料互相蓋掉。
- **存不進去**（無痕模式、容量滿、被瀏覽器擋掉）：書照樣能讀，只是不保存。
- **大圖開著時**後面的頁面是 `inert`，方向鍵不翻頁。

## 檔案

```
index.html、css/style.css
js/book.js      載入資料、頁序、原文處理（純函式）
js/state.js     閱讀進度          js/daily.js   每日十善
js/speech.js    朗讀              js/router.js  hash ↔ 路由
js/storage.js   localStorage 的安全包裝
js/app.js       依路由切換畫面、頂列、翻頁鍵與滑動
js/ui/*.js      各頁畫面
js/ui/lightbox.js  點圖放大的大圖疊層
js/ui/layer.js     疊層的 Esc／返回鍵關閉（移植自《天堂遊記》，動到它一定要在真的瀏覽器裡驗證返回鍵）
js/data/chapters.json   經文原文、白話、功德、情境題
js/data/glossary.json   難詞註解
js/data/daily.json      每日十善的文字
tests/                  vitest＋happy-dom
scripts/                插圖相關的腳本
```

## 內容慣例（測試會守門）

- **經文不能動。** 所有 `raw` 依序串起來、去掉空白之後，必須和 `tests/fixtures/T0600-cbeta.txt`（CBETA 2026.R2）逐字相同，標點也算。改了一個字，`tests/fidelity.test.js` 會指出第幾個字不同。
- **白話、註解、情境題都是自己寫的**，不轉載別人的譯本。不寫嚇人的報應、不貶其他信仰、不寫療效；功德以「經文說」的口吻呈現。
- 十善各章的清單 `role: "benefits"` 才算寶珠；第 13、14 章是 `role: "plain-list"`，只是可展開白話的清單。
- 區塊的 `terms` 引用 `glossary.json` 的鍵，那個詞必須真的出現在該區塊的 `raw` 裡；沒有被引用的詞條不能留。
- 同一個字在不同地方意思不同時（例如「普施無畏」和佛的「四無畏」），開不同的鍵、各自引用。
- 經文的「常」「恒」是「恆常、總是」，白話寫成「時時」「總是」「長保」，不要寫成「常常」（那是「時常」，意思變弱了）。
- 清單項目可以加 `note`（校勘、歷來不同的解釋、容易誤會的地方），會和白話一起顯示。引用別的版本或譯本時，要查證過原文再寫。

## 插圖

16 張（封面＋每章一張），用 gpt-image-2 生成。提示詞在 `scripts/art-prompts.mjs`，每張都以同一段風格前綴開頭（台灣廟宇彩繪、Q 版人物、青綠海色，畫中不得有字）。

```bash
node scripts/gen-art.mjs                 # 補齊 art-src/ 裡還沒有的圖
node scripts/gen-art.mjs v03-fidelity    # 只重畫指定的圖
node scripts/contact-sheet.mjs           # 拼成對照表過目（art-src/_preview/）
npm run opt-art                          # art-src/*.png → assets/art/*.webp，並由封面產生 assets/og.png
```

`art-src/` 是原圖，不進 repo。新增一張圖要同時改三處：`scripts/art-manifest.mjs`、`scripts/art-prompts.mjs`、`chapters.json` 的 `art`。

## 經文版本

底本是 CBETA 的現行版，含新式標點。和較早流通的版本有一處不同：《大正藏》原作「**正**莊嚴故，悉能滌除一切結使」，CBETA 依宮內廳本等校訂為「**止**莊嚴故」，和下一句「觀莊嚴故」成對。本書依 CBETA，並在第 14 章該條加了校勘說明。

## 授權

- **經文與標點**：出自 CBETA 電子佛典集成（財團法人佛教電子佛典基金會），採「創用 CC 姓名標示-非商業性-相同方式分享 4.0 國際」授權，限非營利使用。CBETA 的使用說明與版本資訊附在書裡的「關於本書」頁。詳見 <https://www.cbeta.org/copyright>。
- **白話、註解、情境題、插圖與程式**：蔬米 OMILKYWAY 製作。歡迎非營利流通，請註明出處。

## 設計文件

`docs/superpowers/specs/2026-11-18-ten-virtues-ebook-design.md`、`docs/superpowers/plans/2026-11-18-ten-virtues-ebook.md`
