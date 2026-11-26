# 아임웹 넣기: 목록 1페이지 + 회원 전용 1페이지 (2026-11-26 확정)

## 결정
- 아임웹에는 계산기마다 페이지를 만들지 않고 **목록 iframe 하나로 모음**.
- 회원 전용(access.md) 잠금은 아임웹 페이지 권한이 하므로 페이지는 2개:
  - `https://eltin.imweb.me/calculators` — 누구나. 64개 목록. 누구나 34개는 이 iframe 안에서 바로 열림
  - `https://eltin.imweb.me/calculators-member` — 로그인한 회원만. 회원 전용 30개가 열리는 곳 (메뉴에서는 숨겨도 됨)
  - 주소는 사용자가 아임웹에서 확정하면 바꿈
- 두 페이지 모두 iframe은 `index.html`을 열고, 회원 페이지는 `&member=1`을 붙임
- 페이지 주소 뒤 `#M05`(계산기 태그) 또는 `#S`(분류)를 아임웹 코드가 `&open=M05` / `&open=S`로 넘김

## 왜 member=1이 필요한가
iframe 안에서는 부모가 eltin.imweb.me라는 것(origin)만 알 수 있고 어느 페이지인지(경로)는 모름.
그래서 지금의 memberFrameOK만으로는 누구나 페이지 iframe 안에서도 회원 전용 계산기가 열림.
회원 페이지에서만 붙는 `member=1`을 함께 확인함. (주소를 알면 우회 가능 — 서버가 없어서 이 수준이 한계이며, access.md와 같은 판단)

## 코드 탭 작업
1. `assets/eltin-calc.js` SITE
   - `memberPage: "https://eltin.imweb.me/calculators-member#{tag}"`
   - `signup: "https://eltin.imweb.me/site_join_type_choice"`
   - 새 값 `listPage: "https://eltin.imweb.me/calculators"`
   - `links`의 "계산기 목록": 임베드 안에서는 지금처럼 index.html(같은 iframe), 임베드 밖에서는 `listPage`
2. 회원 모드 판단
   - `isMemberMode = 임베드 && 주소에 member=1 && memberFrameOK(...)`
   - `memberGate()`는 `memberFrameOK` 대신 `isMemberMode`로 판단
   - `keepEmbed(href)`가 `embed=1`과 함께 `member=1`도 이어 붙임 (회원 페이지 안에서 계산기끼리 이동해도 유지)
3. 회원 전용 계산기로 가는 모든 링크 (index.html 카드, 다음 단계·함께 쓰면 좋은 계산기 버튼)
   - 회원 모드면: 지금처럼 같은 iframe 안에서 이동
   - 아니면: `href = memberHref(tag)`, `target="_top"` (iframe 밖 아임웹 회원 페이지로 이동 → 로그인 안 했으면 아임웹이 로그인/가입 창)
   - 링크 옆 🔒 표시 (access.md 3·4번 그대로)
4. `index.html`
   - `open` 파라미터: 계산기 태그(예 M05)면 해당 파일로 `location.replace` (embed·member 유지, 완료 상태일 때만. 아니면 목록 표시). 분류 글자(예 S)면 기존 #S 필터와 같이 처리
   - 맨 위 안내 한 줄: "🔒 표시는 엘틴 쇼핑몰 회원 전용이에요. 회원가입은 무료예요." (회원 모드에서는 "회원 전용 계산기를 모두 쓸 수 있어요"로)
   - 비회원 모드의 🔒 카드 아래 작게 [무료 회원가입] 링크(`SITE.signup`, `_top`)는 선택
5. 아임웹 iframe에 `allow="clipboard-write"`가 붙으므로 [결과 복사]가 iframe 안에서 되는지 확인
6. 확인 (로컬에서 부모 페이지 흉내 HTML로)
   - 누구나 페이지 흉내: 목록 → S01 열림 / M05 카드 → `_top` 회원 페이지 주소로 이동
   - 회원 페이지 흉내(`member=1`): M05 열림, M05 → M06 다음 단계 이동해도 계산 화면 유지
   - `index.html?embed=1&open=M05&member=1` → M05로 바로 이동, `open=S` → S 분류만
   - GitHub 주소로 M05 직접 열기 → 안내 카드
7. 배포 전: `SITE.devPreview = false`, `SITE.blog`를 엘틴 네이버 블로그 주소로 (사용자에게 받기)

## 아임웹 코드 (두 페이지 모두 코드 위젯 하나, MEMBER만 다름)
```html
<iframe id="eltin-calc" title="엘틴 무료 계산기" allow="clipboard-write"
  style="width:100%;border:0;min-height:720px"></iframe>
<script>
(function(){
  var MEMBER = false;   // 회원 전용 페이지에서는 true
  var BASE = "https://wooseli57.github.io/eltin-calculators/";
  var f = document.getElementById("eltin-calc");
  function load(){
    var h = (location.hash || "").replace("#", "").toUpperCase();
    f.src = BASE + "index.html?embed=1" + (MEMBER ? "&member=1" : "")
          + (/^[A-Z](\d{2})?$/.test(h) ? "&open=" + h : "");
  }
  var first = true;
  f.addEventListener("load", function(){
    if(!first) window.scrollTo({ top: f.getBoundingClientRect().top + window.scrollY - 80 });
    first = false;
  });
  window.addEventListener("message", function(e){
    if(e.origin !== "https://wooseli57.github.io") return;
    if(e.data && e.data.type === "eltin-calc-height") f.style.height = e.data.height + "px";
  });
  window.addEventListener("hashchange", load);
  load();
})();
</script>
```

## 블로그 링크 (채팅 탭이 바꿈)
- 누구나 계산기: `https://eltin.imweb.me/calculators#S01`
- 회원 전용 계산기: `https://eltin.imweb.me/calculators-member#M05`
