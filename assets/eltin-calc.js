/* =========================================================
   엘틴 소상공인 계산기 공통 기능 (모든 계산기가 이 파일 하나를 함께 씀)
   링크·로고·블로그 주소 같은 공통 설정은 여기만 고치면 전체에 반영됩니다.
   ========================================================= */
(function(){
  const SITE = {
    links: [   // 하단 연결 박스
      { label:"계산기 목록", title:"다른 무료 계산기 보기", href:"https://eltin.imweb.me/calculators" }, // 목록 페이지 생성 후 주소 교체
      { label:"엘틴 쇼핑몰", title:"식용색소·향료 보러가기", href:"https://eltin.imweb.me/shop" }
    ],
    logo: { src:"assets/eltin-logo.svg", href:"https://eltin.imweb.me/" },
    blog: { label:"블로그", href:"https://blog.naver.com/" },             // 엘틴 네이버 블로그 주소로 교체
    devPreview: true    // 디자인 확인용 테마 미리보기 (배포 시 false)
  };

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

  function init(){
    setTag();
    const side = $(".head-side");
    if(side){
      const wordmark = `<span class="wordmark"><b>e</b><b>l</b><b>t</b><b>i</b><b>n</b></span>`;
      side.innerHTML = `<a class="logo" href="${SITE.logo.href}" target="_top" aria-label="엘틴 쇼핑몰"><img src="${SITE.logo.src}" alt="eltin"></a>
        <a class="blog-btn" href="${SITE.blog.href}" target="_top">${SITE.blog.label}</a>`;
      const img = side.querySelector("img"); img.onerror = () => { img.parentNode.innerHTML = wordmark; };
    }
    const cta = $("#cta");
    if(cta) cta.innerHTML = SITE.links.map(l => `<a href="${l.href}" target="_top"><div><span>${l.label}</span>${l.title}</div></a>`).join("");

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

  window.Eltin = { $, $$, won, num, toNum, koreanUnit, toast, copy, postHeight, moneyInput, numInput, pick, rowList, ACTIONS, bindActions, init, CATEGORIES, isEmbed };
})();
