// 町の燃え広がりの問題を作る（ブラウザと node の両方で使う）。
// マス目の町（🏠木造の家・蔵・道や空き地）で、火元から火がどこまで広がるかを、決まった規則で数える。
// 規則は遊びのための単純な決まりで、本物の延焼の速さや広がり方ではない（「くわしく」と README に書く）。
// 風と延焼の向きは、消防庁「糸魚川市大規模火災を踏まえた今後の消防のあり方に関する検討会報告書」と内閣府「広報ぼうさい」を、
// 川越大火と蔵造りは川越市のページを 2026-11-27 に読んだ（要点は共有フォルダ games/machi-enshou-research.md）。
// 1問は、町の図と風を見て「燃える家はいくつ？」（正解したら2段目「どの家を蔵に建てかえると、燃える家がいちばん少ない？」）か、
// 燃えたあとの図から「吹いていた風は？」を当てる（2段目は同じ）か、川越大火・糸魚川の火災の決まりの問いに答える。
// 乱数 R は呼ぶ回数が毎回同じになるように使う（sort の比較の中では引かない）。同じ tag なら、どの端末でも同じ問題になる。
// KINDS・言い回し・町の作り方・まちがいの選び肢は、足すだけでも過去の日の問題が変わる。公開したあとは変えず、変えるときは qa/run.mjs の PINS を作り直して PR に理由を書く。
(function (root) {
  "use strict";
  const LV = ["やさしい", "ふつう", "むずかしい"];

  // 出典（画面の「なぜ」に出す）
  const SRC = {
    nenpyo: ["川越市「川越の歴史年表」", "https://www.city.kawagoe.saitama.jp/kanko/k-about/1011706.html"],
    kura: ["川越市「蔵造りの町並み」", "https://www.city.kawagoe.saitama.jp/kanko/k-spots/1011557/1011559.html"],
    denken: ["川越市「伝建地区の概要」", "https://www.city.kawagoe.saitama.jp/_res/projects/default_project/_page_/001/004/111/denkentikugaiyour4.pdf"],
    fdma: ["消防庁「糸魚川市大規模火災を踏まえた今後の消防のあり方に関する検討会報告書」", "https://www.fdma.go.jp/singi_kento/kento/items/kento209_15_houkokusyo.pdf"],
    cao: ["内閣府「広報ぼうさい」（糸魚川市の大規模火災）", "https://www.bousai.go.jp/kohou/kouhoubousai/h28/86/news_01.html"],
  };

  // ---- 町と火の決まり（遊びのための単純な決まり）----
  // マス：h 木造の家（燃える）・k 蔵（燃えない・火を通さない）・r 道や空き地（燃えない・火を通さない）
  // 風：dir は吹いてくる方角（n 北風＝北から南へ吹く）。s は 0 風なし・1 弱い・2 強い
  // 1手ごとに、燃えている家から：風なしは上下左右／弱い風は風下と横（風上へは移らない）／強い風は風下と横、さらに風下へ2マス先へ飛び火（あいだの道・蔵を越える）
  const DIRS = { n: [0, 1], s: [0, -1], e: [-1, 0], w: [1, 0] }; // 風下へ進む向き（x, y。y は下が大きい）
  const WNAME = { n: "北風", s: "南風", e: "東風", w: "西風" };
  const WTO = { n: "南", s: "北", e: "西", w: "東" }; // 風下の方角
  const SNAME = ["風なし", "弱い風", "強い風"];
  const windStr = (wd) => (wd.s === 0 ? "風なし" : `${WNAME[wd.dir]}・${SNAME[wd.s]}`);
  function moves(wd) {
    if (wd.s === 0) return [[1, 0], [-1, 0], [0, 1], [0, -1]];
    const [dx, dy] = DIRS[wd.dir], out = [[dx, dy], [dy, dx], [-dy, -dx]];
    if (wd.s === 2) out.push([dx * 2, dy * 2]);
    return out;
  }
  // 火の広がり：各マスが燃えた手（火元は0。燃えないマスは -1）を返す
  function burn(g, n, f, wd) {
    const t = new Array(n * n).fill(-1), mv = moves(wd);
    if (g[f] !== "h") return t;
    t[f] = 0; let front = [f], step = 0;
    while (front.length) {
      step++; const next = [];
      for (const c of front) {
        const x = c % n, y = (c - x) / n;
        for (const [dx, dy] of mv) {
          const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= n || ny >= n) continue;
          const j = ny * n + nx; if (g[j] !== "h" || t[j] >= 0) continue;
          t[j] = step; next.push(j);
        }
      }
      next.sort((a, b) => a - b); front = next;
    }
    return t;
  }
  const countOf = (t) => t.filter((x) => x >= 0).length;
  const stepsOf = (t) => Math.max(0, ...t);
  const withKura = (g, i) => g.slice(0, i) + "k" + g.slice(i + 1);

  // part:ri:begin（shared-workflows の template/parts/data/ri.js の写し。ここでは直さない。node scripts/sync-template.mjs で写す）
  const ri = (R, a, b) => a + Math.floor(R() * (b - a + 1));
  // part:ri:end
  // part:shuffle:begin（shared-workflows の template/parts/data/shuffle.js の写し。ここでは直さない。node scripts/sync-template.mjs で写す）
  function shuffle(R, a) { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = ri(R, 0, i); [b[i], b[j]] = [b[j], b[i]]; } return b; }
  // part:shuffle:end
  // part:pickN:begin（shared-workflows の template/parts/data/pickN.js の写し。ここでは直さない。node scripts/sync-template.mjs で写す）
  function pickN(R, a, n) { return shuffle(R, a).slice(0, n); }
  // part:pickN:end
  const MEDIA = { kazu: "どこまで燃える？", kaze: "風はどっち？", kawagoe: "川越大火と蔵", itoi: "風と大火" };

  // 町をつくる：家 6割・蔵 1割・空き地 3割ほど。半分ほどの町には、まっすぐな道（行か列）を1本通す
  function town(R, n) {
    const a = [];
    for (let i = 0; i < n * n; i++) { const r = R(); a.push(r < 0.62 ? "h" : r < 0.72 ? "k" : "r"); }
    if (R() < 0.5) { const row = R() < 0.5, at = ri(R, 1, n - 2); for (let i = 0; i < n; i++) a[row ? at * n + i : i * n + at] = "r"; }
    return a.join("");
  }
  // 2段目：燃える家から4つ（ア〜エ）を選び、そこを蔵に建てかえたときの燃える家の数を出す。いちばん少ないものが1つだけで、ほかの家を2けん以上守れる組だけ使う
  const CL = ["ア", "イ", "ウ", "エ"], GK = ["a", "b", "c", "d"];
  function candOf(R, g, n, f, wd, t) {
    const pool = t.map((x, i) => (x > 0 ? i : -1)).filter((i) => i >= 0);
    if (pool.length < 4) return null;
    const base = countOf(t);
    for (let k = 0; k < 12; k++) {
      const cs = pickN(R, pool, 4), cn = cs.map((c) => countOf(burn(withKura(g, c), n, f, wd)));
      const best = Math.min(...cn);
      if (cn.filter((x) => x === best).length !== 1 || base - 1 - best < 2) continue;
      return { cs, cn, best: cn.indexOf(best) };
    }
    return null;
  }
  // 1つの町の場面を作る（火元・風・燃え方・2段目の候補）。条件に合うまで作り直す（R を引く回数は tag ごとに決まる）
  function scene(R, n, ws, minC, maxC) {
    for (let k = 0; k < 400; k++) {
      const g = town(R, n), hs = [...g].map((c, i) => (c === "h" ? i : -1)).filter((i) => i >= 0);
      if (!hs.length) continue;
      const f = hs[ri(R, 0, hs.length - 1)], s = ws[ri(R, 0, ws.length - 1)], dir = ["n", "s", "e", "w"][ri(R, 0, 3)], wd = { dir: s === 0 ? "" : dir, s };
      const t = burn(g, n, f, wd), c = countOf(t);
      if (c < minC || c > maxC) continue;
      const cd = candOf(R, g, n, f, wd, t); if (!cd) continue;
      return { g, n, f, wd, t, c, cd };
    }
    return null;
  }
  const keN = (x) => `${x}けん`;
  const grpWhy = (S) => {
    const i = S.cd.best;
    return `${CL[i]}を蔵にすると、燃える家は${S.c}けん→${S.cd.cn[i]}けん。${S.wd.s === 2 ? "強い風では飛び火があるので、" : ""}火の通り道をふさぐ所が効きます。`;
  };
  const sceneOut = (S) => ({ g: S.g, n: S.n, f: S.f, wd: S.wd, burnT: S.t, cands: S.cd.cs, candN: S.cd.cn, grp: GK[S.cd.best], gwhy: grpWhy(S) });

  // どこまで燃える？：答えは燃える家の数（火元もふくむ）。まちがいの選び肢は、よくある読みちがい（風を見ない・風の向きを逆に読む・飛び火を忘れる/足す・蔵も燃えると思う）から
  const COUNT_Q = [
    (w) => `${w}。火元🔥から、燃える家は全部で何けん？（火元もふくむ）`,
    (w) => `${w}の町で火事。燃え広がる家は、火元もふくめて何けん？`,
    (w) => `${w}。火がもう移らなくなるまでに燃える家は？（火元もふくむ）`,
  ];
  function countMake(n, ws, minC, maxC) {
    return (R, lv) => {
      const S = scene(R, n, ws, minC, maxC), si = ri(R, 0, COUNT_Q.length - 1), wd = S.wd;
      const alts = [
        countOf(burn(S.g, S.n, S.f, { dir: "", s: 0 })),
        wd.s ? countOf(burn(S.g, S.n, S.f, { dir: { n: "s", s: "n", e: "w", w: "e" }[wd.dir], s: wd.s })) : -1,
        wd.s ? countOf(burn(S.g, S.n, S.f, { dir: wd.dir, s: 3 - wd.s })) : -1,
        countOf(burn(S.g.replace(/k/g, "h"), S.n, S.f, wd)),
      ].filter((x, i, a) => x > 0 && x !== S.c && a.indexOf(x) === i);
      const near = [S.c + 1, S.c - 1, S.c + 2, S.c - 2, S.c + 3].filter((x) => x > 0 && !alts.includes(x));
      const ds = [...shuffle(R, alts), ...near].slice(0, lv === 0 ? 2 : 3);
      const opts = shuffle(R, [S.c, ...ds]).map(keN), ans = keN(S.c);
      const why = `${windStr(wd)}${wd.s ? `は${WTO[wd.dir]}（風下）へ` : "は上下左右へ"}広がります。蔵と道・空き地は火を止めます。${stepsOf(S.t)}手で${S.c}けんが燃えました。`;
      return { type: "act", media: MEDIA.kazu, q: COUNT_Q[si](windStr(wd)), opts, ans, ...sceneOut(S), why, v: `${si}:${S.f}:${S.g}:${wd.dir}${wd.s}` };
    };
  }
  // 風はどっち？：燃えたあとの図から、吹いていた風を選ぶ。選び肢の風では、どれも燃え方がちがう組だけ使う
  const KAZE_Q = [
    () => "黒い家が燃えた家です（数字は燃えた手）。吹いていた風は？",
    () => "火元🔥から、黒い家まで燃えました。どの風が吹いていた？",
    () => "この燃え方になった風はどれ？（黒い家が燃えた家）",
  ];
  function kazeMake(n, s, minC, maxC) {
    return (R, lv) => {
      for (let k = 0; k < 400; k++) {
        const S = scene(R, n, [s], minC, maxC), all = ["n", "s", "e", "w"].map((d) => ({ dir: d, s })).concat(s === 1 ? [{ dir: "", s: 0 }] : []);
        const sig = (wd) => burn(S.g, S.n, S.f, wd).map((x) => (x >= 0 ? 1 : 0)).join("");
        const mine = sig(S.wd), others = all.filter((wd) => wd.dir !== S.wd.dir && sig(wd) !== mine);
        const need = lv === 0 ? 2 : 3;
        if (others.length < need) continue;
        const si = ri(R, 0, KAZE_Q.length - 1), ds = pickN(R, others, need);
        const opts = shuffle(R, [S.wd, ...ds]).map(windStr), ans = windStr(S.wd);
        const why = `${windStr(S.wd)}は${WTO[S.wd.dir]}へ吹きます。火は風下の${WTO[S.wd.dir]}と横へ広がり、風上へは広がりません。`;
        return { type: "act", media: MEDIA.kaze, q: KAZE_Q[si](), opts, ans, ...sceneOut(S), show: 1, why, v: `${si}:${S.f}:${S.g}:${S.wd.dir}${S.wd.s}` };
      }
      return null;
    };
  }
  const C = (id, lv, n, ws, minC, maxC, name, look, key) => ({ id, lv, ans: "", col: "kazu", name, look, key, why: "", src: ["fdma", "cao"], make: countMake(n, ws, minC, maxC), n, grid: 1 });
  const K = (id, lv, n, s, minC, maxC, name, look, key) => ({ id, lv, ans: "", col: "kaze", name, look, key, why: "", src: ["fdma", "cao"], make: kazeMake(n, s, minC, maxC), n, grid: 1 });

  // 決まりの問題。ans：答え、ws：まちがいの選び肢の候補（やさしいは2つ、ほかは3つ使う）、sit：問いの言い方
  function fact(col, sit, ans, ws) {
    return (R, lv) => {
      const si = ri(R, 0, sit.length - 1), ds = pickN(R, ws, lv === 0 ? 2 : 3);
      return { type: "fact", media: MEDIA[col], q: sit[si], opts: shuffle(R, [ans, ...ds]), ans, v: `${si}:${ds.map((d) => ws.indexOf(d)).join(".")}` };
    };
  }
  const F = (id, lv, col, src, name, look, key, why, sit, ans, ws) => ({ id, lv, ans, grp: null, gwhy: "", col, name, look, key, why, src: [src], make: fact(col, sit, ans, ws) });

  const KINDS = [
    // ---- やさしい ----
    C("c5calm", 0, 5, [0], 4, 14, "風なし：上下左右へ", "風が無いと、上下左右のとなりの家へ移ります。", "風なしの火は、上下左右のとなりの家へ移ります。蔵と道で止まります。"),
    C("c5weak", 0, 5, [1], 4, 14, "弱い風：風下と横へ", "風下（風が吹いていく先）と横へ移ります。", "弱い風では、風下と横へ移り、風上へは移りません。"),
    K("k5weak", 0, 5, 1, 4, 14, "燃え方から風をあてる", "燃えた家が、火元からどちらへのびているか。", "火は風下へのびます。北風なら南へのびます。"),
    F("kwyear", 0, "kawagoe", "nenpyo", "川越大火は1893年", "明治26年です。", "川越大火は、明治26年（1893年）に起きました。",
      "川越市の年表には、明治26年（1893年）に「川越大火（1,302戸焼失）」とあります。",
      ["川越の町が大火で焼けたのは、何年？", "川越大火が起きた年は？", "蔵造りの町並みのきっかけ、川越大火は何年？"], "1893年（明治26年）", ["1793年（寛政5年）", "1923年（大正12年）", "1945年（昭和20年）", "1993年（平成5年）"]),
    F("kurawhy", 0, "kawagoe", "kura", "蔵造りは燃えにくい建物", "火事に強い建て方です。", "蔵造りは、類焼（となりからの火が移ること）を防ぐ耐火建築です。",
      "川越市は、蔵造りを「類焼を防ぐための巧妙な耐火建築」と説明しています。",
      ["川越の蔵造りは、どんな建物？", "蔵造りの建て方のねらいは？", "川越の商人が建てた蔵造り。何に強い？"], "となりからの火が移るのを防ぐ", ["地震のゆれを止める", "大雨の水を通す", "風を通して涼しくする", "雪の重さにたえる"]),
    F("kazashimo", 0, "itoi", "fdma", "火は風下へ広がりやすい", "風が吹いていく先です。", "強い風のとき、火は風下へ大きく広がります。",
      "糸魚川市の火災では、強い南風で、火が北（風下）の海の方へ広がりました（消防庁・内閣府）。",
      ["北風が吹いているとき、火が広がりやすいのは？", "火事のとき、火が大きく広がりやすい向きは？", "南風の日の火事。火がのびやすいのは？"], "風下（風が吹いていく先）", ["風上（風が吹いてくる元）", "風と関係なく、いつも東", "風と関係なく、いつも北", "火元の真上だけ"]),
    F("itoiwind", 0, "itoi", "cao", "糸魚川の火災は強い南風", "日本海の方へ広がりました。", "2016年の糸魚川市の火災は、強い南風で北へ広がりました。",
      "消防庁の報告書は、フェーン現象に伴う強い南風で広い範囲に燃え広がったとしています。",
      ["2016年の糸魚川市の大きな火災。火を広げた風は？", "糸魚川市の火災のとき、吹いていた風は？", "糸魚川市の大火で、日本海の方へ火を広げた風は？"], "強い南風", ["弱い北風", "風はなかった", "弱い東風", "雨をともなう西風"]),
    // ---- ふつう ----
    C("c6weak", 1, 6, [1], 6, 24, "弱い風の町", "風下はどちら？ 蔵と道はどこ？", "弱い風では、風下と横へ移ります。風上へは移りません。"),
    C("c6strong", 1, 6, [2], 6, 24, "強い風：飛び火", "強い風は、風下の2マス先へ飛び火します。", "強い風では、風下と横に加え、風下の2マス先へ飛び火します。"),
    C("c6mix", 1, 6, [0, 1, 2], 6, 24, "風を読む町", "まず風の向きと強さを見ます。", "風なしは上下左右、弱い風は風下と横、強い風は飛び火もします。"),
    K("k6weak", 1, 6, 1, 6, 24, "燃え方から風をあてる", "火元から、燃えた家がのびる向きは？", "火は風下へのびます。風上へはのびません。"),
    F("kwko", 1, "kawagoe", "nenpyo", "川越大火で1,302戸が焼けた", "千をこえます。", "川越大火では、1,302戸が焼けました。",
      "川越市の年表には「川越大火（1,302戸焼失）」とあります。",
      ["川越大火（1893年）で焼けた家は、およそ何戸？", "明治26年の川越大火。焼けたのは何戸？", "川越の年表にある、大火で焼けた戸数は？"], "1,302戸", ["13戸", "130戸", "13,020戸", "130,200戸"]),
    F("kwbun", 1, "kawagoe", "denken", "町の3分の1以上が焼けた", "とても大きな被害でした。", "川越大火で、町の3分の1以上が焼けました。",
      "川越市の資料は、この大火でまちは3分の1以上を焼失したとしています。",
      ["川越大火で、町のどれくらいが焼けた？", "1893年の大火。川越の町が焼けた広さは？", "川越大火の被害。町のどれだけが焼けた？"], "3分の1以上", ["10分の1ほど", "100分の1ほど", "全部", "1けんだけ"]),
    F("tobihi", 1, "itoi", "fdma", "強い風は火の粉を飛ばす", "はなれた所にも火がつきました。", "強い風で火の粉が飛び、はなれた所でも燃え始めます（飛び火）。",
      "消防庁の報告書は、強風で火の粉や燃えさしが広く飛び、10か所で同時に燃え広がったとしています。",
      ["糸魚川市の火災で、はなれた所にも火がついたわけは？", "強い風の日の火事。はなれた家が燃える理由は？", "糸魚川の火災で、火元からはなれて燃えた理由は？"], "火の粉が風で飛んだ（飛び火）", ["地面の下を火が進んだ", "雨で火が流れた", "電気が止まった", "雪がとけた"]),
    F("itoi147", 1, "itoi", "cao", "糸魚川の火災で147棟が焼けた", "100をこえます。", "糸魚川市の火災では、147棟が焼けました。",
      "内閣府は、147棟（全焼120棟など）をふくむ約40,000㎡が焼けたとしています。",
      ["2016年の糸魚川市の火災で、焼けた建物は何棟？", "糸魚川市の大火で焼けた棟数は？", "糸魚川の火災の被害。焼けた建物は？"], "147棟", ["14棟", "1,470棟", "14,700棟", "4棟"]),
    F("yokostop", 1, "itoi", "fdma", "風の横は道路・空き地で止まった", "燃えないものがあると、火は移りにくい。", "風の横の向きでは、道路・空き地・燃えにくい建物が火を止めました。",
      "消防庁の報告書は、風の横の向きでは道路や空き地の離れ、燃えにくい建物などで延焼を止めたとしています。",
      ["糸魚川の火災で、風の横の向きで火を止めたのは？", "火が移るのを止めたものは？（糸魚川の報告書）", "燃え広がりを止めやすいのは、どれ？"], "道路や空き地・燃えにくい建物", ["木の家が並ぶこと", "せまい路地", "かわいた枯れ草", "強い風"]),
    // ---- むずかしい ----
    C("c7weak", 2, 7, [1], 8, 34, "大きな町：弱い風", "風下と横。道で止まるか。", "弱い風では、風下と横へ移ります。道と蔵で止まります。"),
    C("c7strong", 2, 7, [2], 8, 34, "大きな町：強い風", "飛び火は、道や蔵を越えます。", "強い風の飛び火は、あいだの道や蔵を越えて2マス先へ。"),
    C("c7mix", 2, 7, [0, 1, 2], 8, 34, "大きな町の風を読む", "風の強さで、移り方が変わります。", "風なしは上下左右、弱い風は風下と横、強い風は飛び火もします。"),
    K("k7strong", 2, 7, 2, 8, 34, "強い風の燃え方から風をあてる", "飛び火は風下へ2マス。", "強い風では、風下へ飛び火して大きくのびます。"),
    F("kwmeiji", 2, "kawagoe", "denken", "明治40年代ごろ蔵造りの町並みに", "大火から十数年後です。", "大火のあと、明治40年代ごろまでに蔵造りの町並みができました。",
      "川越市の資料は、大火後の復興で商人が土蔵造りを採り入れ、明治40年代ごろまでに町並みができたとしています。",
      ["川越の蔵造りの町並みは、いつごろまでにできた？", "大火のあと、川越の蔵造りの町並みができたのは？", "川越の商人が土蔵造りで建てなおし、町並みになったのは？"], "明治40年代ごろ", ["江戸時代のはじめ", "昭和の終わりごろ", "平成になってから", "大火の次の月"]),
    F("nokori", 2, "kawagoe", "kura", "大火でも焼け残った店蔵", "大沢家住宅です。", "大火でも焼け残った店蔵が、蔵造りを建てるきっかけの1つになりました。",
      "川越市は、大沢家住宅（1792年）が大火でも焼け残り、商人に蔵造りを建てさせたきっかけの1つとしています。",
      ["川越の商人が蔵造りを建てたきっかけの1つは？", "大火のあと、川越で蔵造りが増えたわけの1つは？", "川越大火のとき、大沢家住宅はどうなった？"], "店蔵が大火でも焼け残った", ["店蔵が最初に燃えた", "大火の前に蔵がこわされた", "川があふれた", "雪で火が消えた"]),
    F("itoi10", 2, "itoi", "fdma", "飛び火で10か所が同時に燃えた", "消防本部が見つけただけで、です。", "糸魚川の火災では、飛び火で10か所が同時に燃え広がりました。",
      "消防庁の報告書は、消防本部が把握しているだけで10か所で同時に燃え広がったとしています。",
      ["糸魚川の火災で、飛び火で同時に燃えたのは何か所？", "糸魚川市の大火。同時に燃え広がった所の数は？", "飛び火で同時多発。糸魚川では何か所？"], "10か所", ["1か所", "2か所", "100か所", "1,000か所"]),
    F("itoi272", 2, "itoi", "cao", "最大瞬間風速は27.2m", "1秒に20mをこえる風です。", "糸魚川の火災の日は、最大瞬間風速27.2mの強い風でした。",
      "内閣府は、当日は最大瞬間風速27.2mの強風で、飛び火で火点が分かれたとしています。",
      ["糸魚川の火災の日の、最大瞬間風速は？", "糸魚川市の大火の日、いちばん強い風は1秒に何m？", "2016年の糸魚川の火災。最大瞬間風速は？"], "27.2m", ["2.7m", "0.27m", "272m", "1m"]),
    F("hadaka", 2, "itoi", "fdma", "火元一帯は木造が密集", "古い木の家が並んでいました。", "火元のあたりは、燃えやすい木造の建物が密集していました。",
      "消防庁の報告書は、火元一帯は防火の作りでない木造（裸木造）が密集していたとしています。",
      ["糸魚川の火災で、火元のあたりはどんな町だった？", "糸魚川市の大火が広がりやすかった町の様子は？", "火元一帯の建物の様子は？（糸魚川の報告書）"], "燃えやすい木造が密集", ["燃えにくい建物だけ", "広い公園だけ", "家が1けんだけ", "川の上の町"]),
  ];
  const BY = Object.fromEntries(KINDS.map((k) => [k.id, k]));
  const kindsOf = (lv) => KINDS.filter((k) => k.lv === lv).map((k) => k.id);

  // 2段目「どの家を蔵に建てかえると、燃える家がいちばん少ない？」の4つ（図のア〜エ）
  const GROUPS = {
    a: { name: "ア", sub: "図のアの家" },
    b: { name: "イ", sub: "図のイの家" },
    c: { name: "ウ", sub: "図のウの家" },
    d: { name: "エ", sub: "図のエの家" },
  };

  // ---- 町の図（SVG）。色だけにせず、蔵は「蔵」の字・火元は🔥・燃えた家は手の数字・候補はア〜エの字 ----
  const CELL = 40, M = 30;
  function gridSvg(P, o = {}) {
    const n = P.n, W = n * CELL + M * 2, g = o.g || P.g, t = o.t || null, out = [];
    out.push(`<rect width="${W}" height="${W}" fill="#e9e2cf"/>`);
    for (let i = 0; i < n * n; i++) {
      const x = M + (i % n) * CELL, y = M + Math.floor(i / n) * CELL, c = g[i], b = t && t[i] >= 0;
      if (c === "r") out.push(`<rect x="${x + 1}" y="${y + 1}" width="${CELL - 2}" height="${CELL - 2}" fill="#d6cfbd"/>`);
      else if (c === "k") out.push(`<rect x="${x + 3}" y="${y + 5}" width="${CELL - 6}" height="${CELL - 8}" fill="#fbfaf5" stroke="#2b2b2b" stroke-width="1.5"/><rect x="${x + 3}" y="${y + CELL - 13}" width="${CELL - 6}" height="10" fill="#4a4a4a"/><path d="M${x + 1} ${y + 7} L${x + CELL / 2} ${y + 1} L${x + CELL - 1} ${y + 7}Z" fill="#2b2b2b"/><text x="${x + CELL / 2}" y="${y + 24}" font-size="13" font-weight="900" text-anchor="middle" fill="#2b2b2b">蔵</text>`);
      else if (b) out.push(`<rect x="${x + 4}" y="${y + 13}" width="${CELL - 8}" height="${CELL - 16}" fill="#2f2a26"/><path d="M${x + 2} ${y + 15} L${x + CELL / 2} ${y + 3} L${x + CELL - 2} ${y + 15}Z" fill="#1c1917"/><text x="${x + CELL / 2}" y="${y + 33}" font-size="14" font-weight="900" text-anchor="middle" fill="#fff">${i === P.f ? "🔥" : t[i]}</text>`);
      else out.push(`<rect x="${x + 4}" y="${y + 13}" width="${CELL - 8}" height="${CELL - 16}" fill="#c98b4f"/><path d="M${x + 2} ${y + 15} L${x + CELL / 2} ${y + 3} L${x + CELL - 2} ${y + 15}Z" fill="#8a4f24"/>${i === P.f ? `<text x="${x + CELL / 2}" y="${y + 33}" font-size="17" text-anchor="middle">🔥</text>` : ""}`);
    }
    if (o.cands) o.cands.forEach((c, j) => { const x = M + (c % n) * CELL + CELL / 2, y = M + Math.floor(c / n) * CELL + CELL / 2 + 4; out.push(`<circle cx="${x}" cy="${y}" r="11" fill="#fff" stroke="#1d2a3f" stroke-width="2"/><text x="${x}" y="${y + 5}" font-size="14" font-weight="900" text-anchor="middle" fill="#1d2a3f">${CL[j]}</text>`); });
    if (o.mark != null) { const x = M + (o.mark % n) * CELL, y = M + Math.floor(o.mark / n) * CELL; out.push(`<rect x="${x + 1}" y="${y + 1}" width="${CELL - 2}" height="${CELL - 2}" fill="none" stroke="#0b6e4f" stroke-width="3" stroke-dasharray="5 3"/>`); }
    // 風の矢印（風上の側から風下へ）と方角
    const wd = o.noWind ? { dir: "", s: 0 } : P.wd; // 風あての問いでは、風の矢印を出さない（答えになる）
    out.push(`<text x="${W / 2}" y="12" font-size="11" font-weight="700" text-anchor="middle" fill="#1d2a3f">北</text><text x="${W / 2}" y="${W - 3}" font-size="11" font-weight="700" text-anchor="middle" fill="#1d2a3f">南</text><text x="7" y="${W / 2 + 4}" font-size="11" font-weight="700" text-anchor="middle" fill="#1d2a3f">西</text><text x="${W - 7}" y="${W / 2 + 4}" font-size="11" font-weight="700" text-anchor="middle" fill="#1d2a3f">東</text>`);
    if (wd.s) {
      const [dx, dy] = DIRS[wd.dir], k = wd.s === 2 ? 3 : 2, len = 14;
      for (let j = 1; j <= k; j++) {
        const p = (W * j) / (k + 1);
        const cx = dx ? (dx > 0 ? 18 : W - 18) : p, cy = dy ? (dy > 0 ? 20 : W - 20) : p;
        const x1 = cx - dx * len / 2, y1 = cy - dy * len / 2, x2 = cx + dx * len / 2, y2 = cy + dy * len / 2;
        out.push(`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#1f5fa8" stroke-width="${wd.s === 2 ? 3.5 : 2.2}" marker-end="url(#wa)"/>`);
      }
    }
    const label = o.label || `町の図。${windStr(wd)}。🔥は火元、蔵は燃えない、灰色は道や空き地`;
    return `<svg viewBox="0 0 ${W} ${W}" role="img" aria-label="${label}"><defs><marker id="wa" markerWidth="7" markerHeight="7" refX="3.5" refY="3.5" orient="auto"><path d="M0 0 L7 3.5 L0 7Z" fill="#1f5fa8"/></marker></defs>${out.join("")}</svg>`;
  }

  // part:seedOf:begin（shared-workflows の template/parts/data/seedOf.js の写し。ここでは直さない。node scripts/sync-template.mjs で写す）
  function seedOf(str) { let h = 2166136261; for (const ch of String(str)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
  // part:seedOf:end
  // part:rng:begin（shared-workflows の template/parts/data/rng.js の写し。ここでは直さない。node scripts/sync-template.mjs で写す）
  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  // part:rng:end

  // 1問を作る。tag は「種類|種」（例 "c5calm|2026-11-27:d0"）。同じ tag ならいつも同じ問題
  function make(tag) {
    const [kind] = String(tag).split("|"), k = Object.prototype.hasOwnProperty.call(BY, kind) ? BY[kind] : null;
    if (!k) return null;
    const p = k.make(rng(seedOf(tag)), k.lv);
    const P = { tag, kind, lv: k.lv, name: k.name, look: k.look, key: k.key, why: k.why, grp: k.grp || null, gwhy: k.gwhy || "", n: 0, ...p, src: (p.src || k.src).map((s) => SRC[s]) };
    P.svg = P.n ? gridSvg(P, P.show ? { t: P.burnT, noWind: 1, label: `燃えたあとの町の図。黒い家が燃えた家（数字は燃えた手）。🔥は火元。風は分からない` } : {}) : "";
    return P;
  }
  const keyOf = (P) => `${P.kind}:${P.q}:${P.g || ""}:${P.f == null ? "" : P.f}:${P.opts.slice().sort().join("/")}`;

  function dailyTags(date) {
    const R = rng(seedOf("day:" + date)), e = pickN(R, kindsOf(0), 2), n = pickN(R, kindsOf(1), 2), h = pickN(R, kindsOf(2), 1);
    return [...e, ...n, ...h].map((id, i) => `${id}|${date}:d${i}`);
  }
  function hardTags(date) {
    const dh = dailyTags(date)[4].split("|")[0], R = rng(seedOf("hard:" + date)), h = pickN(R, kindsOf(2).filter((x) => x !== dh), 3);
    return h.map((id, i) => `${id}|${date}:h${i}`);
  }

  const MCE = { KINDS, BY, GROUPS, LV, SRC, MEDIA, CL, GK, DIRS, WNAME, WTO, SNAME, windStr, moves, burn, countOf, stepsOf, withKura, kindsOf, seedOf, rng, make, keyOf, dailyTags, hardTags, pickN, gridSvg, CELL, M };
  if (typeof module !== "undefined" && module.exports) module.exports = MCE; else root.MCE = MCE;
})(typeof self !== "undefined" ? self : this);
