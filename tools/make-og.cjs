// SNS で貼られたときの絵（og.png 1200×630）を作る。今日の問題（答え）は入れず、遊び方の例だけ（北風・弱い風の町で、燃える家はいくつ？）。
// 使い方: node tools/make-og.cjs（qa/ の playwright を使う）
const path = require("path");
const G = require(path.join(__dirname, "..", "data.js"));
const { chromium } = require(path.join(__dirname, "..", "qa", "node_modules", "playwright"));
// 例の町（5×5・北風・弱い風）。答えは G.burn で数える（qa/run.mjs が、正解の行がこの数かを見る）
const EX = { g: "hhrhhhhhkhhrhhhkhhhhrhhkh", n: 5, f: 1, wd: { dir: "n", s: 1 } };
const ANS = G.countOf(G.burn(EX.g, EX.n, EX.f, EX.wd));
const OPTS = [ANS - 4, ANS, ANS + 3];
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const p = await b.newPage({ viewport: { width: 1200, height: 630 } });
  const line = (t, ok) => `<div style="position:relative;font-size:30px;font-weight:700;padding:8px ${ok ? "150px" : "20px"} 8px 20px;border-radius:12px;background:#fff;border:${ok ? "5px solid #21704a" : "3px solid #1d2a3f55"}">${t}${ok ? `<span style="position:absolute;right:16px;top:50%;transform:translateY(-50%) rotate(-8deg);border:4px solid #164f33;color:#164f33;border-radius:8px;padding:0 10px;font-size:28px;font-weight:900">✓ 正解</span>` : ""}</div>`;
  await p.setContent(`<body style="margin:0;font-family:'Noto Sans CJK JP','IPAPGothic',sans-serif">
  <div style="width:1200px;height:630px;box-sizing:border-box;padding:40px 56px;background:#f3efe4;color:#1d2a3f;display:flex;gap:40px;align-items:center">
    <div style="flex:0 0 400px">
      <div style="font-size:28px;color:#83261a;letter-spacing:.06em">風と蔵で考える燃え広がり</div>
      <div style="font-size:72px;font-weight:900;margin-top:8px;line-height:1.15;color:#123554">町の<br><span style="color:#b23a24">燃え広がり</span></div>
      <div style="font-size:32px;margin-top:14px">どこまで燃える？<br>どこに蔵を置けば止まる？</div>
    </div>
    <div style="flex:1;background:#fffdf7;border:4px solid #1d2a3f;border-radius:8px;overflow:hidden;display:flex;gap:16px;padding:16px;align-items:center">
      <div style="flex:0 0 270px">${G.gridSvg(EX).replace("<svg ", '<svg width="270" height="270" ')}</div>
      <div style="flex:1;display:flex;flex-direction:column;gap:10px">
        <div style="font-size:28px;font-weight:700">北風・弱い風。燃える家は何けん？</div>
        ${OPTS.map((x) => line(`${x}けん`, x === ANS)).join("")}
      </div>
    </div>
  </div></body>`);
  await p.screenshot({ path: path.join(__dirname, "..", "og.png") });
  await b.close();
})();
