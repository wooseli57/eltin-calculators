/* =========================================================
   인건비 공통 계산 (L01 인건비 계산기·B04 월 인건비 계산기 공용) — 사양: docs/specs/L01.md, docs/specs/B-monthly.md B04
   연도별 최저임금·4대보험 요율은 여기 CONFIG 한 곳에서만 관리 (CLAUDE.md 6항: 공식 출처·확인 날짜 주석)
   eltin-calc.js 다음에 불러옴
   ========================================================= */
(function(){
  const CONFIG = {
    weeksPerMonth: 365 / 7 / 12,
    freelanceRate: 0.033,        // 사업소득세 3% + 지방소득세 0.3%
    rates: {
      2026: {
        minWage: 10320,          // 고용노동부 고시 2026년 적용 최저임금 (확인 2026-11-23)
        pensionEmployer: 0.0475, // 국민연금 9.5%의 1/2 (국민연금법 부칙, 확인 2026-11-23)
        pensionEmployee: 0.0475,
        healthEmployer: 0.03595, // 건강보험 7.19%의 1/2 (확인 2026-11-23)
        healthEmployee: 0.03595,
        ltcRatio: 0.1314,        // 장기요양 = 건강보험료 × 13.14% (확인 2026-11-23)
        empEmployer: 0.0115,     // 실업급여 0.9% + 고용안정·직능개발 0.25%(150인 미만) (고용노동부, 확인 2026-11-23)
        empEmployee: 0.009,
        accidentAvg: 0.0147      // 2026년 평균 산재보험료율 (고용노동부 발표, 확인 2026-11-23)
      },
      2027: {
        minWage: 10700,          // 고용노동부 2027년 적용 최저임금 고시 2026-08-05 (확인 2026-11-23)
        pensionEmployer: 0.05,   // 국민연금 10% (매년 0.5%p 인상 일정, 1월 시행 시 재확인)
        pensionEmployee: 0.05,
        healthEmployer: 0.03595, // 2027년 건강보험료율 7.19% 동결 (보건복지부 2026-09-08)
        healthEmployee: 0.03595
        // ltcRatio, empEmployer, empEmployee, accidentAvg: 2027년 고시 확인 전 → 2026년 값 사용
      }
    }
  };
  const R = Eltin.yearRates(CONFIG.rates), V = R.values;

  /* 시급 근무 한 달 급여 (L01 2026-11-25 개정 기준)
     1~6일째 근무시간 hW, 7일째는 주휴일 근무로 보고 휴일근로 hH. 5인 이상만 가산: 연장 = 주 40시간 넘는 hW × 50%,
     휴일 = 8시간 이내 50% + 넘는 시간 100% (근로기준법 제56조). 주휴: hW ≥ 15이면 min(hW,40)/40×8시간. 월 = 주 × 4.345 */
  function hourly({ wage: w, hoursPerDay: d, days, big5 }){
    const W = CONFIG.weeksPerMonth;
    const hW = d * Math.min(days, 6), hH = days === 7 ? d : 0, h = hW + hH;
    const otH = big5 ? Math.max(hW - 40, 0) : 0;
    const hol8 = big5 ? Math.min(hH, 8) : 0, holOver = big5 ? Math.max(hH - 8, 0) : 0;
    const base = Math.round(w * h * W);
    const ot = Math.round(w * 0.5 * otH * W);
    const holWork = Math.round((w * 0.5 * hol8 + w * holOver) * W);
    const holidayH = hW >= 15 ? Math.min(hW, 40) / 40 * 8 : 0;
    const holiday = Math.round(w * holidayH * W);
    return { w, h, hW, hH, otH, hol8, holOver, base, ot, holWork, holiday, holidayH, pay: base + ot + holWork + holiday };
  }
  /* 월급(세전)에 붙는 사업주 4대보험 (항목마다 원 미만 버림), 근로자 공제, 3.3% 원천징수 */
  function insurance(pay, accPct){
    const f = Math.floor;
    const ins = { pension: f(pay * V.pensionEmployer), health: f(pay * V.healthEmployer), emp: f(pay * V.empEmployer), acc: f(pay * accPct / 100) };
    ins.ltc = f(ins.health * V.ltcRatio);
    const insSum = ins.pension + ins.health + ins.ltc + ins.emp + ins.acc;
    const healthE = f(pay * V.healthEmployee);
    const workerDed = f(pay * V.pensionEmployee) + healthE + f(healthE * V.ltcRatio) + f(pay * V.empEmployee);
    return { ins, insSum, workerDed, withhold: f(pay * CONFIG.freelanceRate) };
  }

  window.LaborRates = { CONFIG, R, V, hourly, insurance };
})();
