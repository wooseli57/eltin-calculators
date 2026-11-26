/* =========================================================
   월 마진 연결 계산(B01~B08) 공통 — 사양: docs/specs/B-monthly.md 0절
   - [매장] [온라인] 탭 (주소 ?m=store|online)
   - 앞 단계에서 주소로 받은 값 읽기 (저장하지 않음)
   - "금액 / 매출의 % / 가져온 값" 입력 줄
   - 다음 단계·월 손익 바로 가기 주소에 값 붙이기 (Eltin.setFlow)
   eltin-calc.js 다음에 불러옴
   ========================================================= */
(function(){
  const { $, won, num, toNum, esc } = Eltin;
  const q = new URLSearchParams(location.search);

  /* 비용 키: mat 원가, sell 판매비, ad 광고비(adv=1 변동, adf 고정분), labor 인건비, opex 운영비(dep 그중 감가상각),
     sales 매출, profit 감가상각 전 이익, fixed 고정비, vr 변동비율(%) */
  const KEYS = ["sales", "mat", "sell", "ad", "adv", "adf", "labor", "opex", "dep", "profit", "fixed", "vr"];
  const got = {};
  KEYS.forEach(k => {                                   // 잘못된 값은 무시하고 기본값
    const v = q.get(k);
    if(v !== null && /^\d+(\.\d+)?$/.test(v.trim())) got[k] = Number(v);
  });
  /* M06 → B07: matp 원가 %, sellp 판매비 % (원가·판매비 줄을 매출 % 모드로 채움). E03 → B07: from=E03 */
  ["matp", "sellp"].forEach(k => { const v = q.get(k); if(v !== null && /^\d+(\.\d+)?$/.test(v.trim()) && Number(v) <= 100) got[k] = Number(v); });
  const from = (q.get("from") || "").trim().slice(0, 8);
  let mode = q.get("m") === "online" ? "online" : "store";

  /* [매장] [온라인] 탭: box 안에 seg를 그리고, 바꾸면 onChange(mode) */
  function tabs(box, onChange){
    box.innerHTML = `<div class="seg mf-tabs" role="group" aria-label="매장·온라인">
      <button type="button" data-m="store" aria-pressed="${mode === "store"}">매장</button>
      <button type="button" data-m="online" aria-pressed="${mode === "online"}">온라인</button></div>`;
    box.querySelectorAll("button").forEach(b => b.addEventListener("click", () => {
      if(b.dataset.m === mode) return;
      mode = b.dataset.m;
      box.querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", x === b));
      onChange(mode);
    }));
  }

  /* 입력 줄: [가져온 값]? [금액] [매출의 %]
     opt: { key, label, sub?, link?: {tag, file}, def: {store:{t,v}, online:{t,v}} (t: "amt"|"pct"), imported?: 원 }
     반환: { amount(sales), mode(), setDefault(mode), el } */
  const pctFmt = v => String(Math.round(v * 10) / 10);
  function line(box, opt){
    const el = document.createElement("div");
    el.className = "field mf-line";
    const hasImp = opt.imported != null;
    el.innerHTML = `
      <div class="mf-head"><label>${opt.label}${opt.sub ? ` <small>${opt.sub}</small>` : ""}</label><span class="mf-link"></span></div>
      <div class="mf-row">
        <div class="seg mf-mode" role="group" aria-label="${opt.label} 넣는 방식">
          ${hasImp ? `<button type="button" data-t="imp">가져온 값</button>` : ""}
          <button type="button" data-t="amt">금액</button><button type="button" data-t="pct">매출의 %</button>
        </div>
        <div class="input-wrap mf-in"><input type="text" autocomplete="off"><span class="unit"></span></div>
      </div>
      <div class="hint mf-hint">${hasImp ? FROM : ""}</div>`;
    box.appendChild(el);
    const input = el.querySelector("input"), unit = el.querySelector(".unit"), hint = el.querySelector(".mf-hint");
    let t = "amt", vals = { amt: 0, pct: 0 };
    function show(){
      el.querySelectorAll(".mf-mode button").forEach(b => b.setAttribute("aria-pressed", b.dataset.t === t));
      input.readOnly = t === "imp";
      input.inputMode = t === "pct" ? "decimal" : "numeric";
      unit.textContent = t === "pct" ? "%" : "원";
      input.value = t === "imp" ? won(opt.imported) : t === "pct" ? (vals.pct ? pctFmt(vals.pct) : "") : (vals.amt ? won(vals.amt) : "");
      el.classList.toggle("mf-imp", t === "imp");
    }
    function setT(nt){ t = nt; show(); opt.onChange(); }
    el.querySelectorAll(".mf-mode button").forEach(b => b.addEventListener("click", () => setT(b.dataset.t)));
    input.addEventListener("input", () => {
      if(t === "pct"){ let v = input.value.replace(/[^\d.]/g, "").replace(/(\..*)\./g, "$1"); const m = v.match(/^\d*(\.\d?)?/); v = m ? m[0] : ""; input.value = v; vals.pct = Number(v) || 0; }
      else if(t === "amt"){ const n = toNum(input.value); input.value = n ? won(n) : ""; vals.amt = n; }
      opt.onChange();
    });
    function setDefault(m){
      const d = opt.def[m];
      vals = { amt: d.t === "amt" ? d.v : 0, pct: d.t === "pct" ? d.v : 0 };
      t = hasImp ? "imp" : d.t; show();
    }
    if(opt.link) el.querySelector(".mf-link").dataset.tag = opt.link;
    setDefault(mode);
    return {
      el,
      mode: () => t,
      /* 원 단위 금액 (매출의 %는 sales × %, 원 미만 반올림) */
      amount: sales => t === "imp" ? opt.imported : t === "pct" ? Math.round(sales * vals.pct / 100) : vals.amt,
      pct: () => vals.pct,
      setDefault,
      /* 매출 % 모드로 값 채우기 (받은 원가율 등) */
      setPct(v, h){ vals.pct = v; t = "pct"; show(); if(h != null) hint.innerHTML = h; },
      setHint: h => { hint.innerHTML = h || ""; }
    };
  }

  /* "자세히 계산 →" 링크: data-tag가 있는 .mf-link에 (완료된 계산기만) 주소를 채움 */
  function links(query){
    const d = window.__eltinCalcs;
    document.querySelectorAll(".mf-link[data-tag]").forEach(s => {
      const c = d && d.calculators.find(x => x.tag === s.dataset.tag);
      s.innerHTML = c && c.status === "완료" ? `<a href="${Eltin.keepEmbed(c.file + "?" + query)}" target="_self">자세히 계산 (${c.tag}) →</a>` : "";
    });
  }
  window.addEventListener("eltin:calcs", e => { window.__eltinCalcs = e.detail; links(lastQ); });

  /* 다음 단계로 넘길 값: 받은 값 + 이 단계 결과 (+ m). 원 단위 정수, 비율은 소수 1자리 */
  let lastQ = "";
  function pass(own, shortcut = "B07"){
    const all = { ...got, ...own };
    const p = new URLSearchParams({ m: mode });
    KEYS.forEach(k => {
      const v = all[k];
      if(v == null || !isFinite(v) || v < 0) return;
      p.set(k, k === "vr" ? String(Math.round(v * 10) / 10) : String(Math.round(v)));
    });
    lastQ = p.toString();
    Eltin.setFlow({ query: lastQ, shortcut });
    links(new URLSearchParams({ m: mode, ...(all.sales ? { sales: Math.round(all.sales) } : {}) }).toString());
    return lastQ;
  }

  /* 받은 값이 있을 때 입력칸 아래 표시 */
  const FROM = '<span class="mf-from">앞 단계에서 가져온 값이에요</span>';
  /* 매출 대비 % 문구 */
  const ofSales = (v, sales) => sales > 0 ? `매출의 ${num(v / sales * 100, 1)}%` : "";
  const COMMON_NOTE = "한 달 평균 기준이에요. 매출과 비용은 같은 기준(둘 다 부가세 포함 또는 둘 다 제외)으로 넣어 주세요.";

  window.MF = { got, from, get mode(){ return mode; }, tabs, line, pass, FROM, ofSales, COMMON_NOTE };
})();
