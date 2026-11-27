// アプリのアイコン（icon-192.png・icon-512.png）を作る。紺の地に、白い蔵と、となりで上がる火（町の燃え広がり）。
// 使い方: node tools/make-icons.cjs（qa/ の playwright を使う）
const path = require("path");
const { chromium } = require(path.join(__dirname, "..", "qa", "node_modules", "playwright"));
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  for (const s of [192, 512]) {
    const p = await b.newPage({ viewport: { width: s, height: s } });
    await p.setContent(`<body style="margin:0"><svg width="${s}" height="${s}" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <rect width="100" height="100" fill="#123554"/>
      <path d="M14 44 L38 28 L62 44Z" fill="#1c1917"/><rect x="18" y="44" width="40" height="42" fill="#fbfaf5"/><rect x="18" y="72" width="40" height="14" fill="#4a4a4a"/><rect x="31" y="52" width="14" height="12" fill="#2b2b2b"/>
      <path d="M78 86 C64 86 62 70 70 60 C70 68 74 70 76 66 C74 56 80 46 86 40 C84 52 94 58 92 72 C92 80 86 86 78 86Z" fill="#f08c2e"/><path d="M78 86 C72 86 70 78 74 72 C76 76 78 76 79 74 C80 70 82 68 84 66 C86 74 88 78 86 82 C84 85 81 86 78 86Z" fill="#f6d77a"/></svg></body>`);
    await p.screenshot({ path: path.join(__dirname, "..", `icon-${s}.png`), clip: { x: 0, y: 0, width: s, height: s } });
  }
  await b.close();
})();
