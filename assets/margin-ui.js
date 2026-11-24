/* =========================================================
   마진 계산기 공통 입력 화면 (M06·M07·A01·A03 공용)
   계산은 assets/margin-engine.js(MarginEngine), 화면 도구는 assets/eltin-calc.js(Eltin)를 씀.
   사양: docs/specs/M06.md 1~3절, M07.md, A01.md, A03.md
   ========================================================= */
(function(){
  const { won, num, koreanUnit, moneyInput, numInput, yearRates, taxTables } = Eltin;
  const ME = MarginEngine;
  const R = yearRates(ME.MARGIN_DATA.rates), D = R.values;
  const DEFAULTS = {
    online: { pack: 200, ad: 5,    etc: 5, tax: 15 },
    rocket: { pack: 200, ad: 7.69, etc: 5, tax: 15 }
  };
  let uid = 0;

  /* 세율표에서 올해(없으면 가장 최근) 표 고르기 */
  const tableFor = obj => { const ys = Object.keys(obj).map(Number).sort((a, b) => a - b), y = new Date().getFullYear();
    const pick = ys.filter(v => v <= y).pop() ?? ys[0]; return { year: pick, table: obj[pick] }; };

  /* 판매처별 수수료 안내 표 (접는 칸) */
  function feeGuide(){
    return `<details class="fold"><summary>판매처별 수수료 안내</summary><div class="fold-body">
      <table class="ref-table"><thead><tr><th>판매처</th><th>수수료 구조</th><th>대략 범위</th></tr></thead><tbody>
      ${D.feeRef.map(([a, b, c, d]) => `<tr><td>${a}</td><td>${b}<br><span style="color:var(--ink-3)">${d}</span></td><td>${c}</td></tr>`).join("")}
      </tbody></table>
      <p class="fold-help">Npay 수수료 (사업자 연매출 등급별): ${D.npay.map(([g, r, p]) => `${g}(${r}) ${p}%`).join(" / ")}</p>
      <p class="fold-help">카테고리·프로모션·판매처 정책에 따라 달라요. 내 상품의 실제 수수료는 판매자센터 수수료표에서 확인해 입력하세요.</p>
    </div></details>`;
  }

  /* 입력 화면 만들기
     opts.mode: 'online' | 'rocket' | 'both'(판매 방식 선택 표시), opts.onChange: 값이 바뀔 때 */
  function form(box, opts){
    const p = `mf${++uid}`, both = opts.mode === "both";
    let type = both ? "online" : opts.mode;
    box.innerHTML = `
      ${both ? `<div class="seg" role="group" aria-label="판매 방식" data-r="typeSeg">
        <button type="button" data-type="online" aria-pressed="true">온라인 쇼핑몰</button>
        <button type="button" data-type="rocket" aria-pressed="false">쿠팡 로켓배송</button></div>` : ""}
      <div class="field">
        <label for="${p}-market">판매처<span class="edited" data-r="edited" hidden>(직접 수정)</span></label>
        <div class="input-wrap sel-wrap"><select id="${p}-market" data-r="market"></select></div>
      </div>
      <div class="field">
        <label for="${p}-price" data-r="priceLabel"></label>
        <div class="input-wrap"><input id="${p}-price" type="text" inputmode="numeric" autocomplete="off" placeholder="0"><span class="unit">원</span></div>
        <div class="hint" data-r="priceHint"></div>
        <p class="help" data-r="baseLine" hidden></p>
      </div>
      <div class="field">
        <label for="${p}-buy">매입가 / 제조원가 <small>부가세 포함</small></label>
        <div class="input-wrap"><input id="${p}-buy" type="text" inputmode="numeric" autocomplete="off" placeholder="0"><span class="unit">원</span></div>
        <div class="hint" data-r="buyHint"></div>
      </div>
      <div class="field">
        <label for="${p}-fee" data-r="feeLabel"></label>
        <div class="input-wrap"><input id="${p}-fee" type="text" inputmode="decimal" autocomplete="off"><span class="unit">%</span></div>
        <p class="help" data-r="feeHelp" hidden>쿠팡과 협상한 공급률에 따라 다르며 보통 판매가의 약 35~40%예요.</p>
        ${feeGuide()}
      </div>
      <div class="field-row">
        <div class="field">
          <label for="${p}-pack">포장비</label>
          <div class="input-wrap sm"><input id="${p}-pack" type="text" inputmode="numeric" autocomplete="off"><span class="unit">원</span></div>
        </div>
        <div class="field">
          <label for="${p}-ad">광고비율 <small data-r="adBase"></small></label>
          <div class="input-wrap sm"><input id="${p}-ad" type="text" inputmode="decimal" autocomplete="off"><span class="unit">%</span></div>
        </div>
      </div>
      <div class="field-row">
        <div class="field">
          <label for="${p}-etc">기타비용 비율 <small data-r="etcBase"></small></label>
          <div class="input-wrap sm"><input id="${p}-etc" type="text" inputmode="decimal" autocomplete="off"><span class="unit">%</span></div>
        </div>
        <div class="field">
          <label for="${p}-tax">소득세율</label>
          <div class="input-wrap sm"><input id="${p}-tax" type="text" inputmode="decimal" autocomplete="off"><span class="unit">%</span></div>
        </div>
      </div>
      <details class="fold"><summary>기타비용 비율 구하기</summary><div class="fold-body">
        <div class="field-row">
          <div class="field"><label for="${p}-fix">월 고정비</label>
            <div class="input-wrap sm"><input id="${p}-fix" type="text" inputmode="numeric" autocomplete="off" placeholder="0"><span class="unit">원</span></div></div>
          <div class="field"><label for="${p}-sales">월 예상 매출</label>
            <div class="input-wrap sm"><input id="${p}-sales" type="text" inputmode="numeric" autocomplete="off" placeholder="0"><span class="unit">원</span></div></div>
        </div>
        <div class="fold-out"><span data-r="etcOut">월 고정비와 예상 매출을 넣어주세요</span><button type="button" class="btn btn-primary" data-r="etcUse" disabled>이 비율 쓰기</button></div>
        <p class="fold-help">기타비용 비율 = 월 고정비(월세·인건비 등) ÷ 월 예상 매출 × 100</p>
      </div></details>
      <details class="fold"><summary>소득세율 구하기</summary><div class="fold-body">
        <div class="seg" role="group" aria-label="사업자 종류" data-r="taxKind">
          <button type="button" data-k="personal" aria-pressed="true">개인</button>
          <button type="button" data-k="corp" aria-pressed="false">법인</button>
        </div>
        <div class="field"><label for="${p}-tbase">예상 연간 과세표준 <small>1년 이익</small></label>
          <div class="input-wrap sm"><input id="${p}-tbase" type="text" inputmode="numeric" autocomplete="off" placeholder="0"><span class="unit">원</span></div>
          <div class="hint" data-r="tbaseHint"></div></div>
        <label class="fold-check"><input type="checkbox" data-r="local" checked> 지방소득세(10%) 포함</label>
        <div class="fold-out"><span data-r="taxOut">예상 과세표준을 넣어주세요</span><button type="button" class="btn btn-primary" data-r="taxUse" disabled>이 세율 쓰기</button></div>
      </div></details>`;

    const r = k => box.querySelector(`[data-r="${k}"]`), $id = k => box.querySelector(`#${p}-${k}`);
    const changed = () => opts.onChange && opts.onChange();
    const price = moneyInput($id("price"), r("priceHint"), () => { syncBase(); changed(); });
    const buy = moneyInput($id("buy"), r("buyHint"), changed);
    const fee = numInput($id("fee"), () => { syncEdited(); syncBase(); changed(); });
    const pack = moneyInput($id("pack"), null, changed);
    const ad = numInput($id("ad"), changed), etc = numInput($id("etc"), changed), tax = numInput($id("tax"), changed);

    /* 판매처 선택 → 수수료율 예시 채우기 (직접 입력은 그대로) */
    const presets = () => D.marketPresets.filter(m => m.type === type || m.type === "any");
    function fillMarkets(){
      r("market").innerHTML = presets().map((m, i) => `<option value="${i}">${m.name}${m.fee != null ? ` (${m.fee}%)` : ""}</option>`).join("");
    }
    const current = () => presets()[r("market").value];
    function syncEdited(){ const m = current(); r("edited").hidden = !(m && m.fee != null && fee.value !== m.fee); }
    function syncBase(){
      const rocket = type === "rocket", line = r("baseLine");
      line.hidden = !(rocket && price.value);
      if(rocket && price.value) line.innerHTML = `납품가 <b>${won(price.value * (1 - fee.value / 100))}원</b> (판매가 × (1 − 수수료율))`;
    }
    function applyType(){
      const rocket = type === "rocket", d = DEFAULTS[type];
      fillMarkets();
      r("priceLabel").innerHTML = rocket ? "쿠팡 판매가 <small>소비자가 쿠팡에서 내는 가격</small>" : "판매가 <small>소비자가 내는 가격, 부가세 포함</small>";
      r("feeLabel").innerHTML = rocket ? "마켓수수료율 <small>공급률 차이</small>" : "마켓수수료율 <small>언제든 직접 바꿀 수 있어요</small>";
      r("feeHelp").hidden = !rocket;
      r("adBase").textContent = rocket ? "납품가 대비" : "판매가 대비";
      r("etcBase").textContent = rocket ? "납품가 대비" : "판매가 대비";
      $id("fee").value = current().fee; $id("ad").value = d.ad;
      syncEdited(); syncBase();
    }
    r("market").addEventListener("change", () => { const m = current(); if(m.fee != null) $id("fee").value = m.fee; syncEdited(); syncBase(); changed(); });
    if(both) box.querySelectorAll('[data-r="typeSeg"] button').forEach(b => b.addEventListener("click", () => {
      type = b.dataset.type;
      box.querySelectorAll('[data-r="typeSeg"] button').forEach(x => x.setAttribute("aria-pressed", x === b));
      applyType(); changed();
    }));

    /* 기타비용 비율 도우미 */
    let etcRate = 0;
    const syncEtc = () => { etcRate = fix.value && sales.value ? Math.round(fix.value / sales.value * 1000) / 10 : 0;
      r("etcOut").innerHTML = etcRate ? `기타비용 비율 <b>${num(etcRate, 1)}%</b>` : "월 고정비와 예상 매출을 넣어주세요"; r("etcUse").disabled = !etcRate; };
    const fix = moneyInput($id("fix"), null, syncEtc), sales = moneyInput($id("sales"), null, syncEtc);
    r("etcUse").addEventListener("click", () => etc.set(etcRate));

    /* 소득세율 도우미: 누진세액(+지방소득세) ÷ 과세표준 = 실효세율 */
    let kind = "personal", taxRate = 0;
    function syncTax(){
      const t = tableFor(taxTables[kind]), b = tbase.value;
      const amt = b ? ME.progressiveTax(b, t.table) * (r("local").checked ? 1 + taxTables.localRate : 1) : 0;
      taxRate = b ? Math.round(amt / b * 1000) / 10 : 0;
      r("taxOut").innerHTML = b ? `실효세율 <b>${num(taxRate, 1)}%</b> <span style="color:var(--ink-3);font-size:12px">(${t.year}년 ${kind === "corp" ? "법인세" : "종합소득세"})</span>` : "예상 과세표준을 넣어주세요";
      r("taxUse").disabled = !b;
    }
    const tbase = moneyInput($id("tbase"), r("tbaseHint"), syncTax);
    r("local").addEventListener("change", syncTax);
    box.querySelectorAll('[data-r="taxKind"] button').forEach(b => b.addEventListener("click", () => {
      kind = b.dataset.k; box.querySelectorAll('[data-r="taxKind"] button').forEach(x => x.setAttribute("aria-pressed", x === b)); syncTax();
    }));
    r("taxUse").addEventListener("click", () => tax.set(taxRate));
    box.querySelectorAll("details").forEach(d => d.addEventListener("toggle", Eltin.postHeight));

    /* 처음 값 */
    const d0 = DEFAULTS[type];
    $id("pack").value = won(d0.pack); $id("etc").value = d0.etc; $id("tax").value = d0.tax;
    applyType();

    return {
      get type(){ return type; },
      values: () => ({ type, price: price.value, buy: buy.value, fee: fee.value, pack: pack.value, ad: ad.value, etc: etc.value, tax: tax.value }),
      market: () => current().name,
      reset(){ price.set(0); buy.set(0); $id("pack").value = won(DEFAULTS[type].pack); $id("etc").value = DEFAULTS[type].etc; $id("tax").value = DEFAULTS[type].tax;
        r("market").value = 0; applyType(); changed(); }
    };
  }

  /* 목표 설계 (접는 칸): 목표 세후 순이익률 → 목표 최고 매입가 / 목표 최저 판매가 (엔진 solve)
     opts.buyFirst: 로켓배송처럼 판매가가 정해진 경우 최고 매입가를 먼저 */
  function target(el, getValues, opts = {}){
    el.innerHTML = `<details class="fold"><summary>목표 설계 · 목표 순이익률로 매입가·판매가 정하기</summary><div class="fold-body">
      <div class="field"><label>목표 세후 순이익률 <small>0% = 손익분기</small></label>
        <div class="input-wrap sm" style="width:140px"><input type="text" inputmode="decimal" autocomplete="off" value="0" data-t="rate"><span class="unit">%</span></div></div>
      <div class="rows" style="margin-top:10px" data-t="out"></div>
      <p class="fold-help">목표 최고 매입가: 판매가가 정해져 있을 때 이 금액 이하로 사거나 만들어야 해요. 목표 최저 판매가: 매입가가 정해져 있을 때 이 금액 이상으로 팔아야 해요.</p>
    </div></details>`;
    const rate = numInput(el.querySelector('[data-t="rate"]'), refresh);
    el.querySelector("details").addEventListener("toggle", Eltin.postHeight);
    function refresh(){
      const x = getValues(), t = rate.value, out = el.querySelector('[data-t="out"]');
      const b = x.price ? ME.solve(x, "buy", t) : null, s = x.buy ? ME.solve(x, "price", t) : null;
      const rows = [
        ["목표 최고 매입가", x.price ? (b == null ? "판매가로는 맞출 수 없어요" : `${won(b)}원`) : "판매가를 넣어주세요"],
        ["목표 최저 판매가", x.buy ? (s == null ? "맞출 수 없어요" : `${won(s)}원`) : "매입가를 넣어주세요"]
      ];
      if(!opts.buyFirst) rows.reverse();
      out.innerHTML = rows.map(([k, v], i) => `<div class="row ${i ? "" : "total"}"><span>${k}</span><b>${v}</b></div>`).join("");
    }
    refresh();
    return { refresh };
  }

  /* 주의 문구 (M06 사양 5절, 로켓은 "판매처 수수료" → "로켓배송 공급률") */
  const caution = rocket => `${R.useYear}년 기준이에요. ${rocket ? "로켓배송 공급률" : "판매처 수수료"}는 카테고리·프로모션·판매처 정책에 따라 바뀌고, 세율은 세법 개정으로 달라질 수 있어요. 기본값은 예시이니 내 상품의 실제 값으로 바꿔 넣으세요. 참고용으로 사용하시고, 정확한 금액은 판매자센터와 세무사에게 확인하세요.`;
  /* 계산 기준 + 주의 문구 넣기 (올해 판매처 데이터가 없으면 결과 위 경고) */
  function notice(rocket){ Eltin.yearNotice(R, "", {}, caution(rocket)); }

  window.MarginUI = { form, target, notice, R };
})();
