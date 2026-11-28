/* =========================================================
   조색 가이드(G01~G03·K01~K04) 공통 기능 — 사양: docs/specs/G-color.md 3절
   - 측정 컬러칩(data/color-chips.json, tools/build-color-chips.py가 엑셀에서 만듦) 읽기
   - 색차 CIEDE2000, 측정 칩 찾기, 생크림 단색 중간값, 가장 가까운 배합 찾기
   - 색 견본·색 점 버튼 화면 도구
   계산으로 색을 지어내지 않음: 측정된 칩만 쓰고, 생크림 단색 3·5·7·9방울만 양옆 측정값의 중간값(표시함)
   eltin-calc.js 다음에 불러옴
   ========================================================= */
(function(){
  const URL_CHIPS = "data/color-chips.json", URL_PRESETS = "data/color-presets.json";
  let D = null, P = null, loading = null;

  /* ---------- 색 공간: sRGB(D65) → XYZ → CIE Lab ---------- */
  const hexToRgb = h => { const s = String(h).replace("#", ""); return [0, 2, 4].map(i => parseInt(s.slice(i, i + 2), 16)); };
  const rgbToHex = rgb => "#" + rgb.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("");
  const lin = c => { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  const delin = c => 255 * (c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055);
  const WHITE = [0.95047, 1, 1.08883];
  const f = t => t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116;
  const fi = t => t * t * t > 216 / 24389 ? t * t * t : (116 * t - 16) / (24389 / 27);
  function toLab(hex){
    const [r, g, b] = hexToRgb(hex).map(lin);
    const X = (0.4124564 * r + 0.3575761 * g + 0.1804375 * b) / WHITE[0];
    const Y = (0.2126729 * r + 0.7151522 * g + 0.0721750 * b) / WHITE[1];
    const Z = (0.0193339 * r + 0.1191920 * g + 0.9503041 * b) / WHITE[2];
    const fx = f(X), fy = f(Y), fz = f(Z);
    return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
  }
  function labToHex([L, a, b]){
    const fy = (L + 16) / 116, fx = fy + a / 500, fz = fy - b / 200;
    const X = fi(fx) * WHITE[0], Y = fi(fy) * WHITE[1], Z = fi(fz) * WHITE[2];
    const r = 3.2404542 * X - 1.5371385 * Y - 0.4985314 * Z;
    const g = -0.9692660 * X + 1.8760108 * Y + 0.0415560 * Z;
    const bl = 0.0556434 * X - 0.2040259 * Y + 1.0572252 * Z;
    return rgbToHex([r, g, bl].map(delin));
  }

  /* ---------- CIEDE2000 (Sharma, Wu, Dalal 2005) ---------- */
  function deltaELab([L1, a1, b1], [L2, a2, b2]){
    const rad = Math.PI / 180, deg = 180 / Math.PI;
    const C1 = Math.hypot(a1, b1), C2 = Math.hypot(a2, b2), Cm = (C1 + C2) / 2;
    const G = 0.5 * (1 - Math.sqrt(Math.pow(Cm, 7) / (Math.pow(Cm, 7) + Math.pow(25, 7))));
    const a1p = (1 + G) * a1, a2p = (1 + G) * a2;
    const C1p = Math.hypot(a1p, b1), C2p = Math.hypot(a2p, b2);
    const hp = (a, b) => (a === 0 && b === 0) ? 0 : (Math.atan2(b, a) * deg + 360) % 360;
    const h1p = hp(a1p, b1), h2p = hp(a2p, b2);
    const dLp = L2 - L1, dCp = C2p - C1p;
    let dhp = 0;
    if(C1p * C2p !== 0){ dhp = h2p - h1p; if(dhp > 180) dhp -= 360; else if(dhp < -180) dhp += 360; }
    const dHp = 2 * Math.sqrt(C1p * C2p) * Math.sin(dhp / 2 * rad);
    const Lmp = (L1 + L2) / 2, Cmp = (C1p + C2p) / 2;
    let hmp = h1p + h2p;
    if(C1p * C2p !== 0){ hmp = Math.abs(h1p - h2p) <= 180 ? hmp / 2 : (hmp < 360 ? (hmp + 360) / 2 : (hmp - 360) / 2); }
    const T = 1 - 0.17 * Math.cos((hmp - 30) * rad) + 0.24 * Math.cos(2 * hmp * rad) + 0.32 * Math.cos((3 * hmp + 6) * rad) - 0.20 * Math.cos((4 * hmp - 63) * rad);
    const dTheta = 30 * Math.exp(-Math.pow((hmp - 275) / 25, 2));
    const RC = 2 * Math.sqrt(Math.pow(Cmp, 7) / (Math.pow(Cmp, 7) + Math.pow(25, 7)));
    const SL = 1 + 0.015 * Math.pow(Lmp - 50, 2) / Math.sqrt(20 + Math.pow(Lmp - 50, 2));
    const SC = 1 + 0.045 * Cmp, SH = 1 + 0.015 * Cmp * T;
    const RT = -Math.sin(2 * dTheta * rad) * RC;
    return Math.sqrt(Math.pow(dLp / SL, 2) + Math.pow(dCp / SC, 2) + Math.pow(dHp / SH, 2) + RT * (dCp / SC) * (dHp / SH));
  }
  const LABS = new Map();
  const labOf = hex => { const k = hex.toLowerCase(); if(!LABS.has(k)) LABS.set(k, toLab(k)); return LABS.get(k); };
  const deltaE = (h1, h2) => deltaELab(labOf(h1), labOf(h2));

  /* ---------- 데이터 ---------- */
  function load(){
    if(!loading) loading = Promise.all([
      fetch(URL_CHIPS).then(r => { if(!r.ok) throw new Error(r.status); return r.json(); }),
      fetch(URL_PRESETS).then(r => r.ok ? r.json() : { presets: [] }).catch(() => ({ presets: [] }))
    ]).then(([d, p]) => { D = d; P = p.presets || []; index(); return D; });
    return loading;
  }
  const keyOf = mix => Object.keys(mix).filter(k => mix[k] > 0).sort().map(k => k + mix[k]).join("");
  const IDX = {};
  function index(){
    for(const [base, B] of Object.entries(D.bases)){
      const m = IDX[base] = new Map();
      for(const c of B.chips){
        const chip = base === "cream" ? { no: c[0], code: c[1], name: c[2], hex: c[3], mix: c[4] } : { mix: c[0], hex: c[1], note: c[2] || "" };
        chip.measured = true; m.set(keyOf(chip.mix), chip);
      }
    }
  }
  const colorName = ab => (D && D.colors[ab] && D.colors[ab].name) || ab;

  /* 생크림 단색: 1·2·4·6·8·10방울은 측정값, 3·5·7·9는 양옆 측정값을 Lab에서 반씩 섞은 중간값 */
  function creamSingle(ab, drops){
    const B = D.bases.cream, row = B.single[ab]; if(!row) return null;
    const i = B.levels.indexOf(drops);
    if(i >= 0) return { mix: { [ab]: drops }, hex: row[i], measured: true, code: `EL-C-${ab}${drops}`, name: `${colorName(ab)}${drops}` };
    if(drops < 1 || drops > 10 || drops !== Math.round(drops)) return null;
    const lo = B.levels.filter(l => l < drops).pop(), hi = B.levels.find(l => l > drops);
    const A = labOf(row[B.levels.indexOf(lo)]), Z = labOf(row[B.levels.indexOf(hi)]);
    return { mix: { [ab]: drops }, hex: labToHex(A.map((v, k) => (v + Z[k]) / 2)), measured: false, name: `${colorName(ab)}${drops}` };
  }
  /* 측정된 칩 찾기 (생크림 1색은 단색 표에서). 없으면 null */
  function lookup(base, mix){
    const ks = Object.keys(mix).filter(k => mix[k] > 0);
    if(base === "cream" && ks.length === 1){ const s = creamSingle(ks[0], mix[ks[0]]); return s && s.measured ? s : null; }
    return (IDX[base] && IDX[base].get(keyOf(mix))) || null;
  }
  /* 가장 가까운 배합: 그 바탕의 모든 칩(+생크림 단색 1~10방울, 중간값 포함) 중 ΔE 작은 순서.
     opt.colors: 가진 색 약자 목록(이 색들로만 된 배합), opt.maxColors: 1~3, opt.limit */
  function nearest(base, target, opt = {}){
    const T = labOf(target), have = opt.colors ? new Set(opt.colors) : null, maxC = opt.maxColors || 3;
    const list = [...IDX[base].values()];
    if(base === "cream") for(const ab of Object.keys(D.bases.cream.single)) for(let n = 1; n <= 10; n++) list.push(creamSingle(ab, n));
    return list
      .filter(c => { const ks = Object.keys(c.mix); return ks.length <= maxC && (!have || ks.every(k => have.has(k))); })
      .map(c => ({ ...c, dE: deltaELab(T, labOf(c.hex)) }))
      .sort((a, b) => a.dE - b.dE || (a.measured === b.measured ? 0 : a.measured ? -1 : 1))
      .slice(0, opt.limit || 3);
  }
  const deltaWord = dE => dE <= 2 ? "거의 같아요" : dE <= 5 ? "비슷해요" : dE <= 10 ? "조금 달라요" : "가장 가까운 색이에요 (차이가 있어요)";

  /* ---------- 양 계산 ---------- */
  const dropsToG = drops => Math.round(drops * D.dropMl * D.density * 100) / 100;     // 방울 × 0.04ml × 1.05g/ml, 소수 둘째 자리
  /* 바탕 기준량(생크림 10g·클레이 5g)당 배합 → 내 양: 색별 방울(정수 반올림)과 g */
  function scale(base, mix, myAmount){
    const per = D.bases[base].amount, f = myAmount / per;
    return Object.entries(mix).map(([ab, d]) => { const drops = Math.round(d * f); return { ab, name: colorName(ab), drops, g: dropsToG(drops) }; });
  }
  const mixText = (mix, unit = "방울") => Object.entries(mix).map(([ab, d]) => `${colorName(ab)} ${d}${unit}`).join(" + ");
  const ratioText = mix => Object.entries(mix).map(([ab, d]) => `${colorName(ab)} ${d}`).join(" : ");

  /* ---------- 화면 도구 ---------- */
  const esc = s => Eltin.esc(s);
  /* 큰 색 견본 (label: 아래 작은 글자) */
  const swatch = (hex, label = "", sub = "") => `<div class="cg-sw"><div class="cg-chip" style="background:${hex}"></div><div class="cg-cap"><b>${hex.toUpperCase()}</b>${label ? ` · ${esc(label)}` : ""}${sub ? `<small>${esc(sub)}</small>` : ""}</div></div>`;
  /* 원하는 색 | 엘틴 배합 두 칸 비교 */
  const compare = (target, hex) => `<div class="cg-cmp"><div><div class="cg-chip" style="background:${target}"></div><span>원하는 색 ${target.toUpperCase()}</span></div><div><div class="cg-chip" style="background:${hex}"></div><span>엘틴 배합 ${hex.toUpperCase()}</span></div></div>`;
  /* 기본 8색 색 점 버튼. opt: { max(고를 수 있는 개수), value(처음 선택), onChange(list) } */
  function dots(box, opt){
    let sel = [...(opt.value || [])];
    box.classList.add("cg-dots");
    box.innerHTML = D.basic.map(ab => `<button type="button" data-ab="${ab}" aria-pressed="false"><i style="background:${D.colors[ab].hex}"></i>${esc(colorName(ab))}</button>`).join("");
    const sync = () => box.querySelectorAll("button").forEach(b => b.setAttribute("aria-pressed", sel.includes(b.dataset.ab)));
    box.querySelectorAll("button").forEach(b => b.addEventListener("click", () => {
      const ab = b.dataset.ab;
      if(sel.includes(ab)) sel = sel.filter(x => x !== ab);
      else { sel.push(ab); if(sel.length > opt.max) sel.shift(); }
      sync(); opt.onChange(sel.slice());
    }));
    sync();
    return { get value(){ return sel.slice(); }, set(v){ sel = v.slice(0, opt.max); sync(); opt.onChange(sel.slice()); }, setMax(m){ opt.max = m; sel = sel.slice(-m); sync(); } };
  }
  /* 원하는 색 입력: 색 고르기 + HEX 칸 + 인기 색 버튼. 주소 ?hex=F8C8DC 또는 ?c=pastel-pink */
  function targetPicker(box, onChange){
    const q = new URLSearchParams(location.search);
    const fromPreset = P.find(p => p.id === q.get("c"));
    let hex = fromPreset ? fromPreset.hex : /^[0-9A-Fa-f]{6}$/.test(q.get("hex") || "") ? "#" + q.get("hex").toUpperCase() : P[0] ? P[0].hex : "#F8C8DC";
    box.innerHTML = `<div class="cg-target"><input type="color" aria-label="원하는 색 고르기"><div class="input-wrap"><input type="text" maxlength="7" autocomplete="off" aria-label="색 코드 (HEX)" style="text-align:left"></div></div>
      <div class="chips cg-presets">${P.map(p => `<button class="chip" type="button" data-hex="${p.hex}"><i style="background:${p.hex}"></i>${esc(p.name)}</button>`).join("")}</div>`;
    const pick = box.querySelector("input[type=color]"), text = box.querySelector("input[type=text]");
    const set = h => { hex = h.toUpperCase(); pick.value = hex.toLowerCase(); text.value = hex; box.querySelectorAll(".cg-presets .chip").forEach(c => c.setAttribute("aria-pressed", c.dataset.hex.toUpperCase() === hex)); onChange(hex); };
    pick.addEventListener("input", () => set(pick.value));
    text.addEventListener("input", () => { let v = text.value.trim(); if(!v.startsWith("#")) v = "#" + v; if(/^#[0-9A-Fa-f]{6}$/.test(v)) set(v); });
    box.querySelectorAll(".cg-presets .chip").forEach(c => c.addEventListener("click", () => set(c.dataset.hex)));
    setTimeout(() => set(hex), 0);
    return { get value(){ return hex; }, presetName: () => (P.find(p => p.hex.toUpperCase() === hex) || {}).name || "" };
  }
  /* 계산 기준: 바탕별 색 추출 방법만 (G-color.md 1절) */
  const METHOD = {
    cream: "생크림 10g에 엘틴푸드칼라를 방울 수만큼 떨어뜨려 완전히 섞은 뒤, 가장 비슷한 색의 RGB를 기록했어요 (엘틴 컬러칩북).",
    clay: "시판 흰색 클레이 5g에 엘틴푸드칼라(진한1)를 방울 수만큼 섞은 색이에요 (엘틴 자료실).",
    water: "엘틴푸드칼라 진한1을 물로 1/100 묽혀 정한 비율로 섞고, 0.015ml 한 방울을 고광택 인화지에 떨어뜨려 말린 뒤 스캔(600dpi)해 RGB를 추출했어요 (엘틴 자료실)."
  };

  window.EltinColor = { load, get data(){ return D; }, get presets(){ return P; }, toLab, labToHex, deltaE, deltaELab, lookup, creamSingle, nearest, deltaWord,
    dropsToG, scale, mixText, ratioText, colorName, swatch, compare, dots, targetPicker, METHOD, keyOf };
})();
