# 아임웹에 계산기 목록 넣기

아임웹 페이지에 "HTML 코드" 위젯을 넣고 아래 코드를 그대로 붙여 넣습니다.
목록에서 계산기를 누르면 같은 칸 안에서 계산기가 열리고, 계산기 아래 "계산기 목록" 상자로 다시 돌아옵니다.

```html
<iframe id="eltin-calc" src="https://wooseli57.github.io/eltin-calculators/index.html?embed=1"
  title="엘틴 소상공인 무료 계산기" style="width:100%;border:0;min-height:900px"></iframe>
<script>
(function(){
  var f = document.getElementById("eltin-calc"), first = true;
  // 계산기 높이에 맞춰 칸 높이 자동 조절
  window.addEventListener("message", function(e){
    if(e.origin !== "https://wooseli57.github.io") return;
    if(e.data && e.data.type === "eltin-calc-height"){ f.style.height = e.data.height + "px"; }
  });
  // 칸 안에서 다른 계산기로 넘어가면 칸 맨 위로 화면 이동
  f.addEventListener("load", function(){
    if(first){ first = false; return; }
    var top = f.getBoundingClientRect().top + window.pageYOffset - 80;
    window.scrollTo({ top: top, behavior: "smooth" });
  });
})();
</script>
```

- 특정 분류만 보이게 하려면 주소 끝에 `#분류글자`를 붙입니다. 예: 판매 계산기만 `index.html?embed=1#S`, 레시피 계산기만 `index.html?embed=1#R`
- 계산기 하나만 넣을 때는 `src`를 그 계산기 주소로 바꿉니다. 예: `t01-vat.html?embed=1`
- 준비 중인 계산기(R02, G01~G05)는 목록에 회색 "준비 중"으로 보이고, 완성되어 `docs/calculators.md` 상태가 "완료"로 바뀌면 자동으로 링크가 걸립니다.
- 아임웹 목록 페이지 주소가 정해지면 `assets/eltin-calc.js`의 `SITE.links` 첫 번째 주소를 그 주소로 바꿀 수 있습니다. 바꾸지 않아도 iframe 안에서 목록으로 돌아오는 데는 문제없습니다.
