/* =========================================================
   엘틴 소상공인 계산기 공통 기능 (모든 계산기가 이 파일 하나를 함께 씀)
   링크·로고·블로그 주소 같은 공통 설정은 여기만 고치면 전체에 반영됩니다.
   ========================================================= */
(function(){
  const SITE = {
    links: [   // 하단 연결 박스
      // 계산기 목록: 지금은 이 저장소의 index.html (internal: 같은 창에서 열고 ?embed=1을 이어 붙임).
      // 아임웹 계산기 목록 페이지 주소가 정해지면 href를 그 주소(예: "https://eltin.imweb.me/calculators")로 바꾸고 internal 줄을 지우세요.
      { label:"계산기 목록", title:"다른 무료 계산기 보기", href:"index.html", internal:true },
      { label:"엘틴 쇼핑몰", title:"식용색소·향료 보러가기", href:"https://eltin.imweb.me/shop" }
    ],
    logo: { src:"assets/eltin-logo.svg", href:"https://eltin.imweb.me/" },
    blog: { label:"블로그", href:"https://blog.naver.com/" },             // 엘틴 네이버 블로그 주소로 교체
    devPreview: true    // 디자인 확인용 테마 미리보기 (배포 시 false)
  };

  /* ---------- 계산기 목록 data/calculators.json (원본 docs/calculators.md → tools/build-calculators.py) ----------
     머리말 이름·설명·제목과 "준비 중" 판단을 이 파일에서 가져옴.
     못 읽으면(파일로 직접 열 때 등) HTML에 적힌 글자를 그대로 두고, 연결 버튼은 "준비 중"으로 둠 */
  const CALC_URL = "data/calculators.json";
  let CALCS = null, calcsPromise = null;
  function loadCalcs(){
    if(!calcsPromise) calcsPromise = fetch(CALC_URL)
      .then(r => { if(!r.ok) throw new Error(r.status); return r.json(); })
      .then(d => { CALCS = d; window.dispatchEvent(new CustomEvent("eltin:calcs", { detail: d })); return d; })
      .catch(() => null);
    return calcsPromise;
  }
  /* 다른 계산기로 넘어가는 버튼: 받는 계산기가 목록에서 "완료"일 때만 true, 아니면 회색 "준비 중"
     (docs/specs/color-flavor-links.md 4절). 목록을 다 읽기 전에는 false이고, 다 읽으면 window에
     "eltin:calcs" 이벤트가 오니 버튼이 있는 계산기는 그때 다시 그림 */
  const ready = tags => !!CALCS && [].concat(tags).every(t => CALCS.calculators.some(c => c.tag === t && c.status === "완료"));

  const CATEGORIES = {
    L:{name:"인건비 계산기",color:"#4B5BD4"}, C:{name:"원가 계산기",color:"#E0682B"},
    O:{name:"운영비 계산기",color:"#E2A800"}, S:{name:"판매 계산기",color:"#2A9758"},
    M:{name:"마진 계산기",color:"#1F84D0"},   A:{name:"광고 계산기",color:"#D2416F"},
    R:{name:"레시피 계산기",color:"#A9680F"}, G:{name:"조색 가이드",color:"#8E44C9"},
    T:{name:"기본 도구",color:"#5F6B7A"}
  };

  /* ---------- 도구 ---------- */
  const $ = s => document.querySelector(s);
  const $$ = s => document.querySelectorAll(s);
  const won = n => Math.round(n).toLocaleString("ko-KR");
  const toNum = s => Number(String(s).replace(/[^\d.]/g, "")) || 0;
  function koreanUnit(n){                       // 12345678 → 1,234만 5,678원
    n = Math.round(n); if(!n) return "";
    const eok = Math.floor(n/1e8), man = Math.floor(n%1e8/1e4), rest = n%1e4;
    return [eok?won(eok)+"억":"", man?won(man)+"만":"", rest?won(rest):""].filter(Boolean).join(" ")+"원";
  }
  function toast(msg){ const t=$("#toast"); if(!t) return; t.textContent=msg; t.classList.add("show"); setTimeout(()=>t.classList.remove("show"),1600); }
  function postHeight(){                        // 아임웹 iframe 높이 자동 맞춤
    try{ parent.postMessage({ type:"eltin-calc-height", height: document.documentElement.scrollHeight }, "*"); }catch(e){}
  }
  async function copy(text){
    try{ await navigator.clipboard.writeText(text); toast("결과를 복사했어요"); }
    catch(e){ toast("복사가 안 되는 환경이에요"); }
  }
  /* 금액 입력칸: 쉼표 자동, 억·만 읽기 표시, 빠른 입력 버튼 연결 */
  function moneyInput(input, hint, onChange){
    const sync = () => { const n = toNum(input.value); input.value = n ? won(n) : ""; if(hint) hint.textContent = koreanUnit(n); onChange(); };
    input.addEventListener("input", sync);
    return { get value(){ return toNum(input.value); }, set(n){ input.value = n ? won(n) : ""; sync(); } };
  }
  /* 버튼 묶음 중 하나 선택 (seg, chip 공용) */
  function pick(buttons, onPick){
    buttons.forEach(b => b.addEventListener("click", () => {
      buttons.forEach(x => x.setAttribute("aria-pressed", x === b)); onPick(b);
    }));
  }
  /* 조사 붙이기: ro("오븐") → "오븐으로", ro("우유") → "우유로" (받침 ㄹ은 "로") */
  function ro(word){
    const c = String(word).trim().slice(-1).charCodeAt(0) - 0xAC00;
    if(c < 0 || c > 11171) return word + "(으)로";
    const jong = c % 28;
    return word + (jong === 0 || jong === 8 ? "로" : "으로");
  }
  const eun = w => { const c = String(w).slice(-1).charCodeAt(0) - 0xAC00; return w + (c >= 0 && c <= 11171 && c % 28 ? "은" : "는"); };

  /* ---------- 연도별 값 (CLAUDE.md 6항) ----------
     rates: { 2026:{...}, 2027:{...} } → 올해 연도 값을 고르고, 올해에 없는 항목은 가장 최근 연도 값을 씀
     디자인 확인 모드에서는 주소 뒤 ?year=2028 로 연도를 바꿔 볼 수 있음 */
  function yearRates(rates){
    const qYear = SITE.devPreview && Number(new URLSearchParams(location.search).get("year"));
    const year = qYear || new Date().getFullYear();
    const years = Object.keys(rates).map(Number).sort((a, b) => a - b);
    const past = years.filter(y => y <= year);
    const useYear = past.length ? past[past.length - 1] : years[0];
    const values = {}, from = {};
    years.filter(y => y <= useYear).forEach(y => Object.entries(rates[y]).forEach(([k, v]) => { values[k] = v; from[k] = y; }));
    return { year, useYear, values, from, missing: !rates[year] };
  }
  const WHO = {
    labor: "고용노동부·4대보험 공단이나 노무사에게",
    tax: "국세청이나 세무사에게",
    fee: "카드사·배달앱에",
    power: "한국전력에"
  };
  /* 계산 기준 끝에 공통 주의 문구, 이전 연도 값을 쓰는 항목 표시, 올해 값이 없으면 결과 위에 경고
     labels: { 키: "화면 이름" } — 이름을 준 항목만 "이전 연도 값" 안내에 나옴
     custom: 사양에 따로 정한 주의 문구가 있으면 기본 문구 대신 사용 */
  function yearNotice(R, field, labels = {}, custom){
    const year = R ? R.useYear : new Date().getFullYear();
    const parts = [];
    if(R){
      const byYear = {};
      Object.entries(R.from).forEach(([k, y]) => { if(y !== R.useYear && labels[k]) (byYear[y] = byYear[y] || []).push(labels[k]); });
      Object.entries(byYear).forEach(([y, ks]) => parts.push(`${eun(ks.join("·"))} ${y}년 값이에요 (${R.useYear}년 고시 확인 전)`));
      if(R.missing && R.year > R.useYear){
        const res = $("#result");
        if(res && !$("#yearWarn")) res.insertAdjacentHTML("beforebegin",
          `<p class="tip warn" id="yearWarn">아직 ${R.year}년 요율이 반영되지 않았어요. ${R.useYear}년 값으로 계산해요.</p>`);
      }
    }
    parts.push(custom || `${year}년 기준이에요. 최저임금·세율·보험요율 등은 매년 바뀌고 법령 개정으로 달라질 수 있어요. 참고용으로 사용하시고, 정확한 금액은 ${WHO[field] || field} 확인하세요.`);
    const note = $("#note");
    if(note) note.innerHTML += `<br>${parts.join("<br>")}`;
  }

  /* ---------- 카드 우대수수료 구간표 (O02·M04 공통, 여기서만 관리) ----------
     요율은 % 숫자. credit·check가 null이면 일반가맹점 → 계산기에서 입력한 요율 사용 */
  const cardTiers = {
    generalRateExample: 2.2,   // 예시: 금융위원회 보도자료의 일반가맹점 수수료율 예시 (확인 2026-11-23)
    rates: {
      2026: {                  // 금융위원회 2026.2.12 보도자료 "2026년 상반기 영세·중소가맹점 선정결과", 2026.2.14부터 적용 (확인 2026-11-23)
        period: "2026년 상반기",
        tiers: [
          { max: 300000000,  name: "영세 가맹점 (3억 원 이하)",  credit: 0.40, check: 0.15 },
          { max: 500000000,  name: "중소 가맹점 (3억~5억 원)",   credit: 1.00, check: 0.75 },
          { max: 1000000000, name: "중소 가맹점 (5억~10억 원)",  credit: 1.15, check: 0.90 },
          { max: 3000000000, name: "중소 가맹점 (10억~30억 원)", credit: 1.45, check: 1.15 },
          { max: Infinity,   name: "일반 가맹점 (30억 원 초과)", credit: null, check: null }
        ]
      }
    },
    /* 연매출 → 구간 */
    tierFor(tiers, sales){ return tiers.find(t => sales <= t.max); },
    /* 월 카드수수료 = 신용 매출 × 신용 요율 + 체크 매출 × 체크 요율, 원 미만 버림 */
    fee(amount, checkShare, tier, generalRate){
      const cr = tier.credit ?? generalRate, ch = tier.check ?? generalRate;
      const credit = amount * (1 - checkShare), check = amount * checkShare;
      return { credit, check, creditRate: cr, checkRate: ch,
        creditFee: credit * cr / 100, checkFee: check * ch / 100,
        total: Math.floor(credit * cr / 100 + check * ch / 100 + 1e-6) };
    }
  };

  /* ---------- 케이크 틀 크기표 (R04·R01·R07·S08 공통, 여기서만 관리) — 사양: docs/specs/R07.md 0절 ---------- */
  const pans = [
    { id: "mini", name: "미니", diameter: 12, serves: "2~4인", editable: true },  // 가게마다 10~12cm → 고르면 지름 칸 표시(수정 가능)
    { id: "1",    name: "1호",  diameter: 15, serves: "4~6인" },
    { id: "2",    name: "2호",  diameter: 18, serves: "6~8인" },
    { id: "3",    name: "3호",  diameter: 21, serves: "8~10인" },
    { id: "4",    name: "4호",  diameter: 24, serves: "10~12인" }
  ];
  // 지름: 국내 판매 원형틀 1호 150ø, 2호 180ø, 3호 210ø 기준, 호수당 3cm (확인 2026-11-23)
  // 인분: 지름별 일반적인 인분 안내 참고 (확인 2026-11-23), 화면에는 "대략"으로 표시

  /* ---------- 세율표 (M03 세금 계산기·마진 엔진 공통, 여기서만 관리) ---------- */
  const taxTables = {
    personal: {                // 종합소득세 [상한, 세율, 누진공제] — 구간 경계에서 누진 계산값과 일치 확인 (2026-11-23)
      2026: [                  // 소득세법 제55조, 2023년 개정 세율표 유지 (확인 2026-11-23)
        [14000000, 0.06, 0],
        [50000000, 0.15, 1260000],
        [88000000, 0.24, 5760000],
        [150000000, 0.35, 15440000],
        [300000000, 0.38, 19940000],
        [500000000, 0.40, 25940000],
        [1000000000, 0.42, 35940000],
        [Infinity, 0.45, 65940000]
      ]
    },
    corp: {                    // 법인세 [상한, 세율] — 사업연도 개시일 기준
      2025: [[200000000, 0.09], [20000000000, 0.19], [300000000000, 0.21], [Infinity, 0.24]], // 2023~2025 개시 사업연도
      2026: [[200000000, 0.10], [20000000000, 0.20], [300000000000, 0.22], [Infinity, 0.25]]  // 법인세법 제55조, 2026.1.1 이후 개시 사업연도 (확인 2026-11-23)
    },
    localRate: 0.10            // 지방소득세 = 세액의 10%
  };

  /* ---------- 결과 그림 (CLAUDE.md 4항 "결과 그림") ----------
     외부 라이브러리 없이 SVG로 그림. 결과 카드의 실제 폭(px)에 맞춰 그려 글자가 12px 아래로 줄지 않게 함.
     창 크기가 바뀌면 마지막 그림을 다시 그림. */
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const shortWon = n => { const a = Math.abs(n), s = n < 0 ? "−" : "";
    return a >= 1e8 ? `${s}${num(a / 1e8, 1)}억` : a >= 1e4 ? `${s}${num(a / 1e4, a >= 1e6 ? 0 : 1)}만` : `${s}${won(a)}`; };
  /* 그림 폭 = 그림을 담은 부모(결과 카드)의 안쪽 폭. 빈 칸은 :empty로 숨겨져 있어 부모 기준으로 잼 */
  const widthOf = el => { const p = el.parentNode; if(!p) return 320; const cs = getComputedStyle(p);
    const w = p.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    return Math.max(240, Math.min(480, Math.floor(w || 320))); };
  /* 글자 폭 어림 (12px 기준: 한글 12px, 숫자·기호 7.5px) — 넘치면 "…"로 줄임 */
  const textW = s => [...String(s)].reduce((w, ch) => w + (/[ㄱ-힝]/.test(ch) ? 12.5 : 7.5), 0);
  const fitText = (s, max) => { s = String(s); if(textW(s) <= max) return s; let o = ""; for(const ch of s){ if(textW(o + ch + "…") > max) break; o += ch; } return o + "…"; };
  function keep(el, fn, args){ el.dataset.chart = "1"; el._redraw = () => fn(el, ...args); }
  let resizeT;
  window.addEventListener("resize", () => { clearTimeout(resizeT); resizeT = setTimeout(() => { $$("[data-chart]").forEach(el => el._redraw && el._redraw()); postHeight(); }, 150); });

  /* 원형(도넛): items [{label, value}] 금액(0 이하 제외), center {big, small}
     opt.profitLast: 마지막 항목이 남는 돈·여유면 --brand (기본 true)
     opt.loss: 문구가 있으면 차트 대신 안내 한 줄, opt.unit: 범례 단위 (기본 "원")
     6개를 넘으면 작은 비용 항목을 "기타"로 묶음 */
  function donut(el, items, center = {}, opt = {}){
    if(!el) return;
    keep(el, donut, [items, center, opt]);
    el.classList.add("donut");
    if(opt.loss){ el.innerHTML = `<p class="chart-loss">${opt.loss}</p>`; return; }
    const profitLast = opt.profitLast !== false, unit = opt.unit ?? "원";
    let costs = items.slice(0, profitLast ? -1 : undefined).filter(i => i.value > 0);
    const profit = profitLast && items[items.length - 1].value > 0 ? items[items.length - 1] : null;
    const room = 6 - (profit ? 1 : 0);
    if(costs.length > room){
      const keepSet = new Set([...costs].sort((a, b) => b.value - a.value).slice(0, room - 1));
      const rest = costs.filter(c => !keepSet.has(c));
      costs = costs.filter(c => keepSet.has(c)).concat({ label: "기타", value: rest.reduce((s, c) => s + c.value, 0) });
    }
    const list = profit ? costs.concat({ ...profit, profit: true }) : costs;
    const total = list.reduce((s, i) => s + i.value, 0);
    if(!total){ el.innerHTML = ""; return; }
    const color = (it, i) => it.profit ? "var(--brand)" : `var(--chart-${(i % 7) + 1})`;
    const R = 60, C = 2 * Math.PI * R;
    let off = 0;
    const arcs = list.map((it, i) => {
      const len = it.value / total * C;
      const s = `<circle r="${R}" cx="80" cy="80" fill="none" stroke="${color(it, i)}" stroke-width="24" stroke-dasharray="${len} ${C - len}" stroke-dashoffset="${-off}"/>`;
      off += len; return s;
    }).join("");
    el.innerHTML = `
      <div class="donut-chart">
        <svg viewBox="0 0 160 160" width="160" height="160" role="img" aria-label="${esc(list.map(i => `${i.label} ${num(i.value / total * 100, 1)}%`).join(", "))}">
          <g transform="rotate(-90 80 80)">${arcs}</g>
        </svg>
        <div class="donut-center"><b>${center.big ?? ""}</b><small>${center.small ?? ""}</small></div>
      </div>
      <ul class="chart-legend">${list.map((it, i) => `<li><i style="background:${color(it, i)}"></i><span>${esc(it.label)}</span><b>${unit === "원" ? won(it.value) : num(it.value, 1)}${unit}</b><em>${num(it.value / total * 100, 1)}%</em></li>`).join("")}</ul>`;
  }

  /* 가로 막대: items [{label, value, highlight?}]
     opts.sort: 큰 값부터 정렬, opts.highlight: 강조할 항목 순번(정렬 후) 또는 함수, opts.fmt: 값 라벨 함수
     강조 --brand, 나머지 --chart-2, 음수는 0선 왼쪽으로 */
  function bars(el, items, opts = {}){
    if(!el) return;
    keep(el, bars, [items, opts]);
    el.classList.add("chart");
    let list = items.filter(i => Number.isFinite(i.value));
    if(opts.sort) list = [...list].sort((a, b) => b.value - a.value);
    if(!list.length){ el.innerHTML = ""; return; }
    const fmt = opts.fmt || (v => `${v < 0 ? "−" : ""}${won(Math.abs(v))}원`);
    const hl = (it, i) => it.highlight || (typeof opts.highlight === "function" ? opts.highlight(it, i) : opts.highlight === i);
    const W = widthOf(el), rowH = 30, barH = 18, top = 4;
    const labelW = Math.min(112, Math.round(W * 0.3)), valW = 78;
    const min = Math.min(0, ...list.map(i => i.value)), max = Math.max(0, ...list.map(i => i.value));
    const left = labelW + 8 + (min < 0 ? valW : 0), right = W - (max > 0 ? valW : 6);
    const span = (max - min) || 1, x = v => left + (v - min) / span * (right - left);
    const H = top * 2 + list.length * rowH;
    const rows = list.map((it, i) => {
      const y = top + i * rowH, x0 = x(0), x1 = x(it.value), bx = Math.min(x0, x1), bw = Math.max(Math.abs(x1 - x0), it.value ? 2 : 0);
      const fill = it.value < 0 ? "var(--chart-1)" : hl(it, i) ? "var(--brand)" : "var(--chart-2)";
      const tx = it.value < 0 ? x1 - 6 : x1 + 6, anchor = it.value < 0 ? "end" : "start";
      return `<text x="${labelW}" y="${y + rowH / 2 + 4}" text-anchor="end" class="ct-label${hl(it, i) ? " ct-strong" : ""}"><title>${esc(it.label)}</title>${esc(fitText(it.label, labelW - 2))}</text>
        <rect x="${bx}" y="${y + (rowH - barH) / 2}" width="${bw}" height="${barH}" rx="4" fill="${fill}"/>
        <text x="${tx}" y="${y + rowH / 2 + 4}" text-anchor="${anchor}" class="ct-val${hl(it, i) ? " ct-strong" : ""}">${esc(fmt(it.value))}</text>`;
    }).join("");
    const zero = min < 0 ? `<line x1="${x(0)}" x2="${x(0)}" y1="0" y2="${H}" class="ct-axis"/>` : "";
    el.innerHTML = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(list.map(i => `${i.label} ${fmt(i.value)}`).join(", "))}">${zero}${rows}</svg>`;
  }

  /* 선 그래프: series [{label, points:[[x,y],…]}] (2개까지, 첫째 --brand, 둘째 --chart-1 점선)
     opts: xLabel, yLabel, xFmt, yFmt, marks [{x, y, label}] 점+라벨, hlines [{y, label}] 기준선 */
  function line(el, series, opts = {}){
    if(!el) return;
    keep(el, line, [series, opts]);
    el.classList.add("chart");
    series = series.slice(0, 2).filter(s => s.points.length > 1);
    if(!series.length){ el.innerHTML = ""; return; }
    const xFmt = opts.xFmt || (v => num(v, 0)), yFmt = opts.yFmt || shortWon;
    const W = widthOf(el), H = 226, padL = 50, padR = 14, padT = 32, padB = 40;
    const pts = series.flatMap(s => s.points);
    const ys = pts.map(p => p[1]).concat((opts.hlines || []).map(h => h.y), [0]);
    const xMin = Math.min(...pts.map(p => p[0])), xMax = Math.max(...pts.map(p => p[0]));
    let yMax = Math.max(...ys), yMin = Math.min(...ys);
    const niceStep = r => { const p = Math.pow(10, Math.floor(Math.log10(r || 1))), n = r / p; return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p; };
    const step = niceStep((yMax - yMin) / 4);
    yMax = Math.ceil(yMax / step) * step; yMin = Math.floor(yMin / step) * step;
    const X = v => padL + (v - xMin) / ((xMax - xMin) || 1) * (W - padL - padR);
    const Y = v => padT + (yMax - v) / ((yMax - yMin) || 1) * (H - padT - padB);
    let grid = "";
    for(let v = yMin; v <= yMax + step / 2; v += step)
      grid += `<line x1="${padL}" x2="${W - padR}" y1="${Y(v)}" y2="${Y(v)}" class="ct-grid"/><text x="${padL - 6}" y="${Y(v) + 4}" text-anchor="end" class="ct-tick">${esc(yFmt(v))}</text>`;
    const xs = 4; let xt = "";
    for(let i = 0; i <= xs; i++){ const v = xMin + (xMax - xMin) * i / xs;
      xt += `<text x="${X(v)}" y="${H - padB + 16}" text-anchor="middle" class="ct-tick">${esc(xFmt(v))}</text>`; }
    const colors = ["var(--brand)", "var(--chart-1)"];
    const paths = series.map((s, i) => {
      const d = s.points.map((p, j) => `${j ? "L" : "M"}${X(p[0]).toFixed(1)},${Y(p[1]).toFixed(1)}`).join("");
      const last = s.points[s.points.length - 1];
      return `<path d="${d}" fill="none" stroke="${colors[i]}" stroke-width="2.5" ${i ? 'stroke-dasharray="6 4"' : ""}/>
        <text x="${Math.min(X(last[0]), W - padR)}" y="${Y(last[1]) - 7}" text-anchor="end" class="ct-series" fill="${colors[i]}">${esc(s.label)}</text>`;
    }).join("");
    const hl = (opts.hlines || []).map(h => `<line x1="${padL}" x2="${W - padR}" y1="${Y(h.y)}" y2="${Y(h.y)}" class="ct-ref"/>
      <text x="${W - padR}" y="${Y(h.y) + 15}" text-anchor="end" class="ct-reflabel">${esc(h.label)}</text>`).join("");
    const marks = (opts.marks || []).filter(m => m.x >= xMin && m.x <= xMax).map(m => {
      const mx = X(m.x), my = Y(m.y), anchor = mx > W * 0.65 ? "end" : mx < W * 0.35 ? "start" : "middle";
      return `<line x1="${mx}" x2="${mx}" y1="${my}" y2="${H - padB}" class="ct-ref"/>
        <circle cx="${mx}" cy="${my}" r="5" fill="#fff" stroke="var(--brand-dark)" stroke-width="2.5"/>
        <text x="${mx}" y="${my - 10}" text-anchor="${anchor}" class="ct-mark">${esc(m.label)}</text>`;
    }).join("");
    el.innerHTML = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(series.map(s => s.label).join(", "))}${(opts.marks || []).map(m => `, ${esc(m.label)}`).join("")}">
      ${grid}<line x1="${padL}" x2="${W - padR}" y1="${Y(yMin)}" y2="${Y(yMin)}" class="ct-axis"/>${xt}${hl}${paths}${marks}
      <text x="${W - padR}" y="${H - 4}" text-anchor="end" class="ct-tick">${esc(opts.xLabel || "")}</text>
      <text x="4" y="14" class="ct-tick">${esc(opts.yLabel || "")}</text></svg>`;
  }

  /* 깔때기: steps [{label, value}], 단계 사이에 전환율(%) 표시. 폭은 첫 단계 대비 (최소 14%) */
  function funnel(el, steps){
    if(!el) return;
    keep(el, funnel, [steps]);
    el.classList.add("chart");
    steps = steps.filter(s => s.value > 0);
    if(!steps.length){ el.innerHTML = ""; return; }
    const W = widthOf(el), barH = 34, gap = 22, first = steps[0].value;
    const H = steps.length * barH + (steps.length - 1) * gap;
    const parts = steps.map((s, i) => {
      const w = Math.max(0.14, s.value / first) * W, x = (W - w) / 2, y = i * (barH + gap);
      const fill = i === steps.length - 1 ? "var(--brand)" : `var(--chart-${i + 1})`;
      const conv = i ? `<text x="${W / 2}" y="${y - 7}" text-anchor="middle" class="ct-tick">↓ ${num(s.value / steps[i - 1].value * 100, 1)}%</text>` : "";
      return `${conv}<rect x="${x}" y="${y}" width="${w}" height="${barH}" rx="6" fill="${fill}"/>
        ${(() => { const t = `${s.label} ${num(s.value, s.value < 100 ? 1 : 0)}`;
          return textW(t) + 16 <= w ? `<text x="${W / 2}" y="${y + barH / 2 + 5}" text-anchor="middle" class="ct-funnel">${esc(t)}</text>`
            : `<text x="${x + w + 8}" y="${y + barH / 2 + 5}" class="ct-val">${esc(t)}</text>`; })()}`;
    }).join("");
    el.innerHTML = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(steps.map(s => `${s.label} ${num(s.value, 1)}`).join(" → "))}">${parts}</svg>`;
  }

  /* 소수 표시: num(12.345, 1) → "12.3" */
  const num = (n, d = 1) => (Number.isFinite(n) ? n : 0).toLocaleString("ko-KR", { maximumFractionDigits: d });
  const cleanNum = s => String(s).replace(/[^\d.]/g, "").replace(/(\..*)\./g, "$1");
  /* 숫자 입력칸(%, g, 시간 등): 숫자·소수점만 남김 */
  function numInput(input, onChange){
    input.addEventListener("input", () => { const v = cleanNum(input.value); if(v !== input.value) input.value = v; onChange(); });
    return { get value(){ return toNum(input.value); }, set(n){ input.value = n === "" || n == null ? "" : String(n); onChange(); } };
  }
  /* 결과 아래 [결과 복사] [다시 계산] 버튼 */
  const ACTIONS = `<div class="actions"><button class="btn btn-primary" type="button" id="copy">결과 복사</button><button class="btn btn-ghost" type="button" id="reset">다시 계산</button></div>`;
  function bindActions(text, onReset){
    const c = document.getElementById("copy"), r = document.getElementById("reset");
    if(c) c.onclick = () => copy(text);
    if(r) r.onclick = onReset;
  }
  /* 여러 줄 입력 (재료·항목 목록)
     fields: [{key, label, type:"text"|"money"|"num"|"select", unit, ph, options:[[값,표시]]}]
     text 칸은 줄 맨 위 이름칸, 나머지는 아래 칸으로 나란히 놓임 */
  function rowList(box, opt){
    const fields = opt.fields, nameF = fields.find(f => f.type === "text"), others = fields.filter(f => f.type !== "text");
    const min = opt.min ?? 1;
    box.classList.add("items");
    box.innerHTML = `<div class="items-body"></div><button type="button" class="add-row">+ ${opt.addLabel || "줄 추가"}</button>`;
    const body = box.querySelector(".items-body");
    const fieldHtml = f => f.type === "select"
      ? `<label><span>${f.label}</span><div class="mini-wrap"><select data-k="${f.key}">${f.options.map(([v, t]) => `<option value="${v}">${t}</option>`).join("")}</select></div></label>`
      : `<label><span>${f.label}</span><div class="mini-wrap"><input data-k="${f.key}" data-t="${f.type}" type="text" inputmode="${f.type === "money" ? "numeric" : "decimal"}" autocomplete="off" placeholder="${f.ph ?? 0}">${f.unit ? `<em>${f.unit}</em>` : ""}</div></label>`;
    function read(el){
      const o = {};
      el.querySelectorAll("[data-k]").forEach(i => { o[i.dataset.k] = (i.dataset.t === "money" || i.dataset.t === "num") ? toNum(i.value) : i.value; });
      return o;
    }
    function changed(){
      if(opt.note) body.querySelectorAll(".item").forEach(el => { el.querySelector(".item-note").innerHTML = opt.note(read(el)) || ""; });
      opt.onChange();
    }
    function add(vals = {}, silent){
      const el = document.createElement("div"); el.className = "item";
      el.innerHTML = `<div class="item-top">${nameF ? `<input class="item-name" data-k="${nameF.key}" type="text" autocomplete="off" placeholder="${nameF.ph || nameF.label}" aria-label="${nameF.label}">` : `<span class="item-no"></span>`}
          <button type="button" class="item-del" aria-label="이 줄 지우기">×</button></div>
        <div class="item-grid" style="grid-template-columns:${opt.cols || `repeat(${others.length},minmax(0,1fr))`}">${others.map(fieldHtml).join("")}</div>
        <div class="item-note"></div>`;
      el.querySelectorAll("[data-k]").forEach(i => {
        const v = vals[i.dataset.k];
        if(v != null && v !== "") i.value = i.dataset.t === "money" ? won(v) : v;
        i.addEventListener(i.tagName === "SELECT" ? "change" : "input", () => {
          if(i.dataset.t === "money"){ const n = toNum(i.value); i.value = n ? won(n) : ""; }
          else if(i.dataset.t === "num"){ const c = cleanNum(i.value); if(c !== i.value) i.value = c; }
          changed();
        });
      });
      el.querySelector(".item-del").addEventListener("click", () => {
        if(body.children.length > min) el.remove();
        else el.querySelectorAll("input").forEach(i => i.value = "");
        changed();
      });
      body.appendChild(el);
      if(!silent) changed();
      return el;
    }
    box.querySelector(".add-row").addEventListener("click", () => { add(opt.blank ? opt.blank() : {}).querySelector("input")?.focus(); });
    function set(rows){ body.innerHTML = ""; (rows.length ? rows : [{}]).forEach(r => add(r, true)); changed(); }
    (opt.rows || [{}]).forEach(r => add(r, true));
    if(opt.note) body.querySelectorAll(".item").forEach(el => { el.querySelector(".item-note").innerHTML = opt.note(read(el)) || ""; });
    return { rows: () => [...body.querySelectorAll(".item")].map(read), add, set };
  }

  /* ---------- 공통 화면 구성 ---------- */
  const isEmbed = new URLSearchParams(location.search).get("embed") === "1" || location.hash === "#embed";
  if(isEmbed) document.documentElement.classList.add("embed");

  function setTag(){
    const cat = document.documentElement.dataset.cat, no = document.documentElement.dataset.no || "01";
    const tag = $(".tag"); if(tag && CATEGORIES[cat]) tag.textContent = `${cat}${no} · ${CATEGORIES[cat].name}`;
  }

  /* 머리말을 목록 값으로: 태그·이름(h1)·설명(p)·<title> */
  function fillHead(d){
    const cat = document.documentElement.dataset.cat, no = document.documentElement.dataset.no;
    const c = d && cat && no && d.calculators.find(x => x.cat === cat && x.no === no);
    if(!c) return;
    const h1 = $(".calc-head h1"), p = $(".calc-head p"), tag = $(".tag");
    if(h1) h1.textContent = c.name;
    if(p) p.textContent = c.desc;
    if(tag) tag.textContent = `${c.tag} · ${c.category}`;
    document.title = `${c.tag} ${c.name} | 엘틴 소상공인 계산기`;
    postHeight();
  }
  /* 같은 사이트 안 링크(목록 페이지 등): 임베드 모드면 ?embed=1을 이어 붙임 */
  const keepEmbed = href => isEmbed ? href + (href.includes("?") ? "&" : "?") + "embed=1" : href;

  function init(){
    setTag();
    loadCalcs().then(fillHead);
    const side = $(".head-side");
    if(side){
      const wordmark = `<span class="wordmark"><b>e</b><b>l</b><b>t</b><b>i</b><b>n</b></span>`;
      side.innerHTML = `<a class="logo" href="${SITE.logo.href}" target="_top" aria-label="엘틴 쇼핑몰"><img src="${SITE.logo.src}" alt="eltin"></a>
        <a class="blog-btn" href="${SITE.blog.href}" target="_top">${SITE.blog.label}</a>`;
      const img = side.querySelector("img"); img.onerror = () => { img.parentNode.innerHTML = wordmark; };
    }
    const cta = $("#cta");
    const here = location.pathname.split("/").pop() || "index.html";
    if(cta) cta.innerHTML = SITE.links
      .filter(l => !(l.internal && l.href === here))                 // 목록 페이지에서는 자기 자신 링크를 빼요
      .map(l => `<a href="${l.internal ? keepEmbed(l.href) : l.href}" target="${l.internal ? "_self" : "_top"}"><div><span>${l.label}</span>${l.title}</div></a>`).join("");

    if(SITE.devPreview && !isEmbed && $("#dev")){
      const dev = $("#dev"); dev.hidden = false;
      dev.innerHTML = `<p>디자인 확인용 · 분류별 테마색 미리보기 (배포 시 삭제)</p><div class="sw">${
        Object.entries(CATEGORIES).map(([k,c]) => `<button type="button" data-c="${k}" style="background:${c.color};color:${c.color}"><span style="color:#fff">${k} ${c.name}</span></button>`).join("")}</div>`;
      const btns = dev.querySelectorAll("button");
      const sync = () => btns.forEach(b => b.setAttribute("aria-pressed", b.dataset.c === document.documentElement.dataset.cat));
      btns.forEach(b => b.addEventListener("click", () => { document.documentElement.dataset.cat = b.dataset.c; setTag(); sync(); }));
      sync();
    }
    window.addEventListener("load", postHeight);
    window.addEventListener("resize", postHeight);
    postHeight();
  }

  window.Eltin = { ready, loadCalcs, keepEmbed, $, $$, won, num, ro, eun, yearRates, yearNotice, cardTiers, taxTables, pans, donut, bars, line, funnel, shortWon, toNum, koreanUnit, toast, copy, postHeight, moneyInput, numInput, pick, rowList, ACTIONS, bindActions, init, CATEGORIES, isEmbed };
})();
