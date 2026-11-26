/* =========================================================
   공통 마진 엔진 (E01·E02·A01·A03 공용) — 사양: docs/specs/E01.md 0절
   기존 "최대비용 마진계산기" PWA 앱(wooseli57/margin-calculator, index.html)의
   calcMargin·solve·progressiveTax를 그대로 옮김. 화면 코드는 넣지 않음.
   로켓배송은 마켓수수료가 납품가에 이미 반영되어 있으므로 비용에 다시 넣지 않음.
   ========================================================= */
(function(){
  /* x: { type: 'online'|'rocket', price, buy, fee, pack, ad, etc, tax }  (비율은 % 값) */
  function calcMargin(x){
    const E = +x.price || 0, G = +x.buy || 0, J = (+x.fee || 0) / 100, L = +x.pack || 0;
    const M = (+x.ad || 0) / 100, O = (+x.etc || 0) / 100, T = (+x.tax || 0) / 100;
    const rocket = x.type === "rocket";
    const base = rocket ? E * (1 - J) : E;          // 셀러 관점 판매가 (로켓 = 납품가)
    const feeAmt = E * J;                            // 마켓수수료(원), 로켓은 표시만
    const adAmt = base * M, etcAmt = base * O;
    const pre = base - G - (rocket ? 0 : feeAmt) - L - adAmt - etcAmt;
    const vat = pre > 0 ? pre / 11 : 0;
    const cost = G + (rocket ? 0 : feeAmt) + L + adAmt + etcAmt + vat;   // 로켓은 수수료를 비용에 다시 넣지 않음
    const ebt = base - cost;                         // 세전 순이익
    const tax = ebt > 0 ? ebt * T : 0;
    const net = ebt - tax;                           // 세후 순이익(마진)
    const maxAd = net + adAmt;                       // 최대광고비
    const maxAdTax = pre > 0 ? pre + adAmt : maxAd;  // 세금 효과 반영값 (광고비 증가 시 부가세·소득세 감소 반영)
    return {
      base, feeAmt, adAmt, etcAmt, vat, cost, ebt, tax, net, pre,
      priceMargin: base - G, priceMarginRate: base ? (base - G) / base * 100 : 0,
      netRate: base ? net / base * 100 : 0,
      maxAd,
      maxAdRateSale: E ? maxAd / E * 100 : 0,        // 최대광고비 비율 — 판매가 기준 (쿠팡 광고 화면과 같은 기준)
      maxAdRateBase: base ? maxAd / base * 100 : 0,  // 최대광고비 비율 — 셀러 매출 기준 (온라인은 위와 같음, 로켓은 납품가)
      minRoas: maxAd > 0 ? E / maxAd * 100 : null,   // 최저 목표 광고수익률 (판매가 기준)
      maxAdTax,
      minRoasTax: maxAdTax > 0 ? E / maxAdTax * 100 : null
    };
  }

  /* 목표 세후 순이익률(%)을 만족하는 최고 매입가(field 'buy') / 최저 판매가(field 'price') — 이분법 (PWA 앱 그대로) */
  function solve(x, field, targetRate){
    const f = v => calcMargin({ ...x, [field]: v }).netRate - targetRate;
    let lo = 0, hi = field === "buy" ? (+x.price || 0) : Math.max(1, (+x.buy || 0) * 20 + 100000);
    if(field === "buy"){ if(f(lo) < 0) return null; }
    else { if(f(hi) < 0) return null; }
    for(let i = 0; i < 80; i++){
      const m = (lo + hi) / 2;
      if(field === "buy") (f(m) >= 0 ? lo = m : hi = m);
      else (f(m) >= 0 ? hi = m : lo = m);
    }
    return field === "buy" ? Math.floor(lo + 1e-9) : Math.ceil(hi - 1e-9);   // ± 1e-9: 답이 딱 정수일 때 소수 오차로 1원 어긋나는 것을 막음
  }

  /* 누진 세액: table = [[상한(원), 세율(0~1)], ...] (Eltin.taxTables와 같은 형식, 3번째 칸은 무시) */
  function progressiveTax(baseWon, table){
    let prev = 0, t = 0;
    for(const [top, r] of table){
      if(baseWon > prev) t += (Math.min(baseWon, top) - prev) * r;
      prev = top; if(baseWon <= top) break;
    }
    return t;
  }

  /* 판매처 예시 수수료와 수수료 안내 — 연도별 (PWA 앱 2026년 값 그대로, 2026-11-22 사용자 정리) */
  const MARGIN_DATA = {
    rates: {
      2026: {
        marketPresets: [
          { name: "스마트스토어 · 네이버 유입 · 영세(3억 이하)", type: "online", fee: 4.95 },
          { name: "스마트스토어 · 네이버 유입 · 중소1(3억~5억)", type: "online", fee: 5.56 },
          { name: "스마트스토어 · 네이버 유입 · 중소2(5억~10억)", type: "online", fee: 5.73 },
          { name: "스마트스토어 · 네이버 유입 · 중소3(10억~30억)", type: "online", fee: 6.0 },
          { name: "스마트스토어 · 네이버 유입 · 일반(30억 초과)", type: "online", fee: 6.63 },
          { name: "스마트스토어 · 광고·마케팅링크 유입 · 영세", type: "online", fee: 2.95 },
          { name: "스마트스토어 · 광고·마케팅링크 유입 · 중소1", type: "online", fee: 3.56 },
          { name: "스마트스토어 · 광고·마케팅링크 유입 · 중소2", type: "online", fee: 3.73 },
          { name: "스마트스토어 · 광고·마케팅링크 유입 · 중소3", type: "online", fee: 4.0 },
          { name: "스마트스토어 · 광고·마케팅링크 유입 · 일반", type: "online", fee: 4.63 },
          { name: "쿠팡 윙 · 식품", type: "online", fee: 10.6 },
          { name: "쿠팡 윙 · 최대(10.9%)", type: "online", fee: 10.9 },
          { name: "11번가 · 최대(13%)", type: "online", fee: 13 },
          { name: "G마켓/옥션 · 최대(13%)", type: "online", fee: 13 },
          { name: "자사몰", type: "online", fee: 3.5 },
          { name: "쿠팡 로켓배송", type: "rocket", fee: 35 },
          { name: "직접 입력", type: "any", fee: null }
        ],
        feeRef: [   // [판매처, 수수료 구조, 대략 범위, 참고]
          ["스마트스토어 · 네이버 유입", "판매수수료 3% + Npay 수수료", "4.95 ~ 6.63%", "네이버플러스 스토어·가격비교·재구매·일반 외부 유입"],
          ["스마트스토어 · 광고·마케팅링크", "판매수수료 1% + Npay 수수료", "2.95 ~ 4.63%", "네이버 광고, 스마트스토어센터 마케팅 링크 유입"],
          ["브랜드스토어", "판매수수료 4% / 2% + Npay 수수료", "5.95 ~ 7.63%", "스마트스토어보다 판매수수료 1%p 높음"],
          ["쿠팡 마켓플레이스(윙)", "카테고리별 판매수수료", "4 ~ 10.9%", "식품 10.6%, 별도 결제수수료 없음"],
          ["쿠팡 로켓그로스", "윙과 같은 판매수수료 + 물류비", "4 ~ 10.9% + 물류비", "입출고비 600원~, 배송비 1,125원~ (사이즈별), 보관 30일 무료"],
          ["쿠팡 로켓배송", "직매입 (공급률 협상)", "판매가의 약 35 ~ 40%", "납품가 = 판매가 × (1 − 수수료율), 로켓배송 계산기(E02) 사용"],
          ["11번가", "카테고리별 판매수수료", "약 6 ~ 13%", "할인 전 가격 기준 부과"],
          ["G마켓·옥션", "카테고리별 판매수수료", "약 6.5 ~ 13%", "할인 전 가격 기준 부과"]
        ],
        npay: [["영세", "3억 이하", 1.947], ["중소1", "3억~5억", 2.563], ["중소2", "5억~10억", 2.728], ["중소3", "10억~30억", 3.003], ["일반", "30억 초과", 3.63]]
      }
    }
  };

  window.MarginEngine = { calcMargin, solve, progressiveTax, MARGIN_DATA };
})();
