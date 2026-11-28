# 아임웹 넣기: 목록 1페이지 + 회원 전용 1페이지 (2026-11-26 확정)

> **2026-11-28 변경 — 무료계산기 메뉴를 대분류 3개 페이지로** (아래 "대분류 3페이지" 절이 최신. 그 아래 내용은 처음 정한 기록)

## 결정
- 아임웹에는 계산기마다 페이지를 만들지 않고 **목록 iframe 하나로 모음**.
- 회원 전용(access.md) 잠금은 아임웹 페이지 권한이 하므로 페이지는 2개:
  - `https://eltin.imweb.me/calculators` — 누구나. 66개 목록. 누구나 31개는 이 iframe 안에서 바로 열림
  - `https://eltin.imweb.me/calculators-member` — 로그인한 회원만. 회원 전용 35개가 열리는 곳 (메뉴에서는 숨겨도 됨)
  - (2026-11-28 대분류 개편으로 34/30 → 31/35. 옛 번호 `#A01`·`#S08`·`#G06`·`#A`는 목록 페이지가 새 번호로 바꿔 엶)
  - 주소는 사용자가 아임웹에서 확정하면 바꿈
- 두 페이지 모두 iframe은 `index.html`을 열고, 회원 페이지는 `&member=1`을 붙임
- 페이지 주소 뒤 `#M05`(계산기 태그) 또는 `#S`(분류)를 아임웹 코드가 `&open=M05` / `&open=S`로 넘김. `#1`·`#2`·`#3`(대분류)도 됨

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
   - `keepEmbed(href)`가 `embed=1`과 함께 `member=1`도 이어 붙임 (회원 페이지 안에서 계산기끼리 이동해도 유지) → 2026-11-27 변경 후 `keepMember(href)`: 회원 모드일 때 `member=1`만
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

> 2026-11-27부터 `embed=1`은 필요 없어요(iframe 안이면 자동으로 아임웹 모드). 이미 `index.html?embed=1…`로 넣어 둔 위젯은 고치지 않아도 그대로 동작해요.
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
    f.src = BASE + "index.html?" + (MEMBER ? "member=1" : "")
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

## 변경: embed=1 없애고 "iframe 안이면 아임웹 모드" + 머리말 보이기 (2026-11-27 대표 결정)
배경: 아임웹 안에서 머리말이 숨겨져 지금 쓰는 계산기가 무엇인지 알기 어려움. 검토해 보니 `?embed=1`은 "아임웹 iframe 안인가"를 주소로 알려 주는 표시인데, 회원 잠금은 이미 iframe·부모 주소를 직접 확인하고 있어 중복.

결정
1. 머리말(분류 태그·단계 표시, 이름, 설명, 로고, 블로그 버튼)은 아임웹 안에서도 보임. 로고가 아임웹 머리글과 겹치는 것은 감수. 하단 작은 문구(`.brand-foot`)는 아임웹 안에서 계속 숨김
2. 주소의 `embed=1` 대신 코드가 자동 판단: `framed = window.top !== window` (예외 시 true) 이고 부모가 `SITE.memberHosts`(memberFrameOK의 부모 확인과 같은 방식)이면 **아임웹 모드**
3. 아임웹 모드에서 유지하는 것: 배경 투명·여백 축소, 회원 모드 판단(아임웹 모드 + member=1), 계산기끼리 이동 시 `member=1` 유지, "계산기 목록" 버튼은 같은 iframe의 index.html, 로고 링크는 `target="_top"`
4. 아임웹 모드가 아닐 때(GitHub 주소 직접 열기 등): 지금의 비임베드 동작 그대로 (목록 버튼은 `SITE.listPage`, 회원 계산기는 안내 카드)
5. 하위 호환: 아임웹 코드 위젯의 `index.html?embed=1`은 고치지 않아도 됨. `embed` 파라미터·`#embed`는 무시
6. 문서: CLAUDE.md 1·2·10장의 "?embed=1" 설명, 이 문서의 아임웹 코드 예시에서 `embed=1` 제거

### 반영 (2026-11-27)
- `assets/eltin-calc.js`: `inImweb`(iframe 안 + 부모가 아임웹) 자동 판단, `imwebFrameOK`, 회원 모드 = `inImweb` + `member=1`, `keepEmbed` → `keepMember`, 로고는 아임웹 안에서 `_top`
- `assets/eltin-calc.css`: 아임웹 모드에서 머리말 숨김 제거 (하단 작은 문구 숨김·투명 배경·여백은 유지)
- R01의 R02·R03·R04 이동 버튼이 `_top`이라 아임웹 밖 GitHub 주소로 나가던 것을 같은 iframe 안 이동으로 (회원 모드 유지)


## 대분류 3페이지 (2026-11-28 대표 결정, 채팅 탭이 아임웹에서 직접 바꿈·게시)

| 메뉴 | 주소 | 접근 권한 | 위젯 MEMBER · GROUP | 비고 |
|---|---|---|---|---|
| 무료계산기 > 사장님계산기(31) | `/calculators` | 누구나 | false · "1" | 옛 "일반무료계산기(34)" 페이지 이름만 바꿈 |
| 무료계산기 > 마진계산기(20) | `/calculators-margin` | 로그인 사용자(로그인창 자동 표시) | true · "2" | 회원 페이지를 복제해 만듦 |
| 무료계산기 > 홈베이킹계산기(15) | `/calculators-home` | 로그인 사용자(로그인창 자동 표시) | true · "3" | 위와 같음 |
| (메뉴 숨김) 회원계산기전체(35) | `/calculators-member` | 로그인 사용자 | true · (옛 코드, 전체) | 블로그 링크 `#M05`와 공통 JS `SITE.memberPage`가 쓰는 곳이라 지우지 않고 메뉴에서만 숨김 |

- 주소 끝 `#S01`(계산기)·`#S`(분류)·`#1`~`#3`(대분류)이 있으면 그것을 먼저 열고, 없으면 그 페이지의 GROUP 대분류만 보여줌
- 메뉴 이름의 숫자는 직접 적은 글자(자동 연동 아님). 계산기 수가 바뀌면 디자인 모드에서 고침
- 아임웹 디자인 모드에서 코드 위젯 편집: 위젯 오른쪽 위 (i) → 코드 설정 → 코드 에디터 열기

### 새 아임웹 코드 (세 페이지 공통, MEMBER·GROUP만 다름)
```html
<iframe id="eltin-calc" title="엘틴 무료 계산기" allow="clipboard-write"
  style="width:100%;border:0;min-height:720px"></iframe>
<script>
(function(){
  var MEMBER = true;   // 회원 전용 페이지: true / 일반 페이지: false
  var GROUP = "2";     // 처음 보여줄 대분류: "1" 사장님 · "2" 마진 · "3" 홈베이킹 · "" 전체
  var BASE = "https://wooseli57.github.io/eltin-calculators/";
  var f = document.getElementById("eltin-calc");
  function load(){
    var h = (location.hash || "").replace("#", "").toUpperCase();
    if(!/^([A-Z](\d{2})?|[1-3])$/.test(h)) h = GROUP;
    f.src = BASE + "index.html?" + (MEMBER ? "member=1" : "") + (h ? "&open=" + h : "");
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

### 블로그 링크 (블로그 작업 때 반영)
- 사장님 계산기(T·L·O·S·P): `https://eltin.imweb.me/calculators#S01` (그대로)
- 마진 계산기(M·E·B): `https://eltin.imweb.me/calculators-margin#M05` 로 바꿀 수 있음 (옛 `calculators-member#M05`도 계속 열림)
- 홈베이킹 계산기(R·G·K): `https://eltin.imweb.me/calculators-home#R01` 로 바꿀 수 있음
- 대분류 목록: `/calculators` · `/calculators-margin` · `/calculators-home`
- 참고: 공통 JS의 `SITE.memberPage`(아임웹 밖에서 회원 계산기를 누를 때 가는 곳)는 지금 `calculators-member#{tag}`. 대분류 페이지로 보내고 싶으면 코드 탭에서 분류별로 바꿀 수 있음 (선택)
