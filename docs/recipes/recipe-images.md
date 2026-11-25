# R01 엘틴 레시피 대표 사진 (무료 사진 20장)

상태: 1차 선정 (2026-11-25 채팅). 엘틴이 직접 찍은 사진이 생기면 같은 파일 이름으로 바꿔 넣으면 됩니다.

## 출처와 이용 조건

- 모두 Pexels(https://www.pexels.com) 무료 사진. Pexels 라이선스는 무료로 쓸 수 있고(상업 이용 포함) 출처 표시는 의무가 아니며 자르기·크기 조정 등 수정이 가능. 다만 사진을 그대로 판매하거나, 사진 속 인물·브랜드가 엘틴 제품을 보증하는 것처럼 쓰는 것은 안 됨 (https://www.pexels.com/license/)
- 화면 하단 계산 기준에 "사진: Pexels" 한 줄 표시 (의무는 아니지만 표시)

## 만드는 방법 (코드 탭)

1. 아래 각 사진 페이지에서 원본을 내려받음 (페이지 주소 끝의 숫자가 사진 번호. `https://www.pexels.com/photo/<번호>/download/` 또는 페이지의 Free download)
2. 가로 600px, 정사각형(가운데 기준)으로 잘라 WebP(품질 80)로 저장: `data/recipe-images/<레시피 id>.webp` (예: `data/recipe-images/1.webp`)
3. `data/eltin-recipes.json`의 각 레시피에 `"image": "data/recipe-images/<id>.webp"`와 `"imageCredit": "<사진 페이지 주소>"` 추가
4. R01 화면: 결과 박스 오른쪽 위에 작은 정사각형 사진(약 72~88px, 모서리 둥글게). 기존 배치는 바꾸지 않고 오른쪽 여백에 띄움. `alt`는 레시피 이름 + "예시 사진". 이미지가 없거나 불러오지 못하면 숨김
5. 사진은 "대표 이미지(예시)"이므로 탭해도 확대하지 않음

## 사진 목록

| id | 레시피 | Pexels 사진 페이지 | 비고 |
|---|---|---|---|
| 1 | 마카롱 꼬끄 | https://www.pexels.com/photo/colorful-macarons-on-a-wooden-stand-32609373/ | |
| 2 | 버터크림 | https://www.pexels.com/photo/close-up-of-creamy-vanilla-buttercream-frosting-33775641/ | |
| 3 | 생크림 아이싱 | https://www.pexels.com/photo/close-up-photo-of-sliced-white-cake-4110006/ | |
| 4 | 제누아즈 시트 | https://www.pexels.com/photo/round-baked-pastry-1359319/ | |
| 5 | 아이싱 쿠키 | https://www.pexels.com/photo/cookies-on-gray-tray-5954859/ | |
| 6 | 바닐라 컵케이크 | https://www.pexels.com/photo/close-up-shot-of-cupcakes-on-a-wooden-table-7525116/ | |
| 7 | 백설기 (떡케이크) | https://www.pexels.com/photo/rice-cakes-with-white-chocolate-and-dried-roses-on-top-16764274/ | 백설기 사진이 없어 비슷한 떡 사진. 엘틴 사진으로 우선 교체 권장 |
| 8 | 마들렌 | https://www.pexels.com/photo/selective-focus-of-madeleine-cakes-25067703/ | |
| 9 | 레몬 에이드 시럽 | https://www.pexels.com/photo/lime-lemonade-with-ice-16976656/ | |
| 10 | 휘낭시에 | https://www.pexels.com/photo/gourmet-coffee-and-financier-pastries-on-rustic-table-32320128/ | |
| 11 | 카페 바닐라 시럽 | https://www.pexels.com/photo/plastic-jars-with-syrups-in-cafe-5461614/ | 2026-11-25 교체: 처음 고른 사진(34164443)에 다른 브랜드 시럽 병 로고가 보여서 상표 없는 시럽 용기 사진으로 바꿈 |
| 12 | 바닐라 라떼 | https://www.pexels.com/photo/close-up-shot-of-a-glass-of-cappuccino-5112649/ | |
| 13 | 머랭쿠키 | https://www.pexels.com/photo/crop-chef-with-piping-bag-forming-meringues-on-baking-pan-5908016/ | |
| 14 | 바닐라 파운드케이크 | https://www.pexels.com/photo/close-up-of-slice-of-iced-pound-cake-on-plate-33309797/ | |
| 15 | 바닐라·코코아 2색 쿠키 | https://www.pexels.com/photo/delicious-chocolate-vanilla-swirl-biscuits-35152904/ | |
| 16 | 바닐라 커스터드 크림 | https://www.pexels.com/photo/hand-holding-pastry-bag-over-mixing-bowl-33775616/ | |
| 17 | 바닐라 아이스크림 | https://www.pexels.com/photo/delicious-vanilla-ice-cream-cone-close-up-38987559/ | |
| 18 | 케이크팝 | https://www.pexels.com/photo/pink-lollipops-on-sticks-10171574/ | |
| 19 | 과일 젤리 | https://www.pexels.com/photo/close-up-of-colorful-jellies-8191230/ | |
| 20 | 스콘 | https://www.pexels.com/photo/rustic-teapot-and-scones-on-floral-tablecloth-37790575/ | |
