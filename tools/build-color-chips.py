# -*- coding: utf-8 -*-
"""
엘틴 컬러칩 측정 엑셀 → 조색 가이드(G01~G07)용 JSON 변환기 + 검사

  python tools/build-color-chips.py     # 자료/컬러칩 데이터/*.xlsx → data/color-chips.json, data/color-presets.json

사양: docs/specs/G-color.md 1~3절
- 원본 엑셀은 회사 내부 자료(자료/, 공개 저장소 제외). 엑셀이 없으면 기존 JSON을 그대로 두고 경고만 출력
- data/color-chips.json은 이 스크립트가 만드는 파일이라 직접 고치지 않음

검사 (하나라도 걸리면 오류를 출력하고 JSON을 쓰지 않은 채 실패(종료 코드 1)로 끝남)
- 칩 수: 생크림 단색 48색 × 6단계(288), 2색 140, 3색 56 / 클레이 2색 700, 3색 1,512 / 물 2색 2,268, 3색 1,512 / 기본 8색
- 방울 범위 (클레이 2색 1~5, 3색 1~3 / 물 2색 1~9, 3색 1~3), HEX 형식, 같은 조합 중복 없음
- 생크림 단색: 매트릭스 시트와 A 단색 시트의 HEX가 같은지
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "자료" / "컬러칩 데이터"
CREAM_XLSX = SRC / "식용색소_조색데이터 (생크림).xlsx"
CW_XLSX = SRC / "식용색소_조색데이터 (클레이_물).xlsx"
OUT = ROOT / "data" / "color-chips.json"
PRESETS = ROOT / "data" / "color-presets.json"

DROP_ML, DENSITY = 0.04, 1.05          # 1방울 0.04ml, 색소 밀도 1.05g/ml (docs/specs/color-flavor-links.md)
LEVELS = [1, 2, 4, 6, 8, 10]           # 생크림 단색 측정 방울 수
BASIC8 = ["YE", "OR", "PI", "RE", "GR", "BL", "VI", "BK"]
HEX_RE = re.compile(r"^#[0-9A-Fa-f]{6}$")

# 인기 색 버튼 (G02·G05·G07 공통, G-color.md 3절) — 목표색일 뿐 엘틴 배합이 아님
POPULAR = [
    ("pastel-pink", "파스텔 핑크", "#F8C8DC"), ("coral", "코랄", "#FF7F6E"), ("peach", "피치", "#FFCBA4"),
    ("lemon", "레몬", "#FFF176"), ("mint", "민트", "#A8E6CF"), ("sky", "하늘색", "#A7D8F0"),
    ("lavender", "라벤더", "#C3B1E1"), ("navy", "네이비", "#1F2A5A"), ("chocolate", "초콜릿 브라운", "#6B3E26"),
    ("red-velvet", "레드벨벳", "#A4161A"),
]

errors = []


def err(msg):
    errors.append(msg)


def hexok(h, where):
    if not isinstance(h, str) or not HEX_RE.match(h.strip()):
        err(f"{where}: HEX 형식이 아니에요: {h!r}")
        return None
    return h.strip()


def sheet_rows(wb, name, skip):
    return [r for r in list(wb[name].iter_rows(values_only=True))[skip:] if any(c is not None for c in r)]


def build():
    import openpyxl
    wc = openpyxl.load_workbook(CREAM_XLSX, data_only=True)
    ww = openpyxl.load_workbook(CW_XLSX, data_only=True)

    # ---- 색 이름·약자 (생크림 "안내" 시트의 약자 범례 + 매트릭스) ----
    matrix = sheet_rows(wc, "단색 48색 매트릭스", 4)
    colors, single, name2abbr = {}, {}, {}
    for r in matrix:
        group, name, abbr, *hexes = r[:9]
        if not abbr:
            continue
        hs = [hexok(h, f"생크림 단색 {abbr} {lv}방울") for h, lv in zip(hexes, LEVELS)]
        single[abbr] = hs
        colors[abbr] = {"name": name, "group": group, "hex": hs[-1]}      # 진한1 외에는 생크림 10방울 값
        name2abbr[name] = abbr
    if len(single) != 48:
        err(f"생크림 단색 색 수가 48이 아니에요: {len(single)}")

    # 진한1 8색 대표색 = "기본 8색" 시트
    for r in sheet_rows(ww, "기본 8색", 1):
        if isinstance(r[0], int) and r[1]:
            ab = name2abbr.get(r[1])
            if not ab:
                err(f"기본 8색: 이름을 약자로 못 바꿔요: {r[1]}")
                continue
            colors[ab]["hex"] = hexok(r[2], f"기본 8색 {r[1]}")
    if [a for a in BASIC8 if a not in colors]:
        err("기본 8색 약자가 빠졌어요")

    # A 단색 시트와 매트릭스가 같은지
    a_rows = sheet_rows(wc, "A 단색", 3)
    if len(a_rows) != 288:
        err(f"A 단색 칩 수가 288이 아니에요: {len(a_rows)}")
    for r in a_rows:
        ab = name2abbr.get(r[11]); lv = r[12]
        if ab is None or lv not in LEVELS:
            err(f"A 단색 {r[3]}: 색·방울을 못 읽어요 ({r[11]}, {lv})")
            continue
        if single[ab][LEVELS.index(lv)].lower() != str(r[6]).lower():
            err(f"A 단색 {r[3]}: 매트릭스 {single[ab][LEVELS.index(lv)]} ≠ {r[6]}")

    # ---- 생크림 2·3색 (B·C 시트) ----
    cream_chips, seen = [], set()
    for sheet, n_colors, want in [("B 2색조합", 2, 140), ("C 3색조합", 3, 56)]:
        rows = sheet_rows(wc, sheet, 3)
        if len(rows) != want:
            err(f"생크림 {sheet} 칩 수가 {want}이 아니에요: {len(rows)}")
        for r in rows:
            mix = {}
            for i in range(n_colors):
                nm, dr = r[11 + i * 2], r[12 + i * 2]
                ab = name2abbr.get(nm)
                if ab not in BASIC8 or not isinstance(dr, int) or dr < 1:
                    err(f"생크림 {r[3]}: 배합을 못 읽어요 ({nm} {dr})")
                mix[ab] = dr
            key = ("cream",) + tuple(sorted(mix.items()))
            if key in seen:
                err(f"생크림 {r[3]}: 같은 조합이 또 있어요 {mix}")
            seen.add(key)
            cream_chips.append([r[3], r[4], r[5], hexok(r[6], f"생크림 {r[3]}"), mix])

    # ---- 클레이·물 (2색: 색1 방울1 색2 방울2 결과 미리보기 비고 / 3색: +색3 방울3) ----
    def mixes(sheet, n_colors, max_drop, want, base):
        rows = sheet_rows(ww, sheet, 1)
        if len(rows) != want:
            err(f"{sheet} 칩 수가 {want}이 아니에요: {len(rows)}")
        out = []
        for r in rows:
            mix = {}
            for i in range(n_colors):
                nm, dr = r[1 + i * 2], r[2 + i * 2]
                ab = name2abbr.get(nm)
                if ab not in BASIC8:
                    err(f"{sheet} {r[0]}: 색 이름을 못 읽어요 ({nm})")
                if not isinstance(dr, int) or not 1 <= dr <= max_drop:
                    err(f"{sheet} {r[0]}: 방울 수가 1~{max_drop} 밖이에요 ({dr})")
                mix[ab] = dr
            key = (base,) + tuple(sorted(mix.items()))
            if key in seen:
                err(f"{sheet} {r[0]}: 같은 조합이 또 있어요 {mix}")
            seen.add(key)
            h = hexok(r[1 + n_colors * 2], f"{sheet} {r[0]}")
            note = r[3 + n_colors * 2]
            out.append([mix, h.upper() if h else h] + ([str(note).strip()] if note else []))   # 비고가 있으면 표기 코드를 쓰고 비고를 남김
        return out

    clay = mixes("클레이 2색", 2, 5, 700, "clay") + mixes("클레이 3색", 3, 3, 1512, "clay")
    water = mixes("물 2색", 2, 9, 2268, "water") + mixes("물 3색", 3, 3, 1512, "water")

    return {
        "_about": "엘틴 컬러칩 측정 자료(자료/컬러칩 데이터/*.xlsx)를 tools/build-color-chips.py로 만든 파일이에요. 직접 고치지 마세요. 사양: docs/specs/G-color.md",
        "dropMl": DROP_ML, "density": DENSITY,
        "basic": BASIC8,
        "colors": colors,
        "bases": {
            "cream": {"name": "생크림", "amount": 10, "unit": "g", "levels": LEVELS, "single": single, "chips": cream_chips},
            "clay": {"name": "흰 클레이", "amount": 5, "unit": "g", "range2": 5, "range3": 3, "chips": clay},
            "water": {"name": "물", "amount": None, "dilution": "1/100", "range2": 9, "range3": 3, "chips": water},
        },
    }


def main():
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass
    presets = {
        "_about": "인기 색 버튼 (G02·G05·G07 공통). 사양: docs/specs/G-color.md 3절. 목표색일 뿐 엘틴 배합이 아니에요 — 배합은 계산기가 측정 칩에서 가장 가까운 것을 찾아요",
        "presets": [{"id": i, "name": n, "hex": h} for i, n, h in POPULAR],
    }
    PRESETS.write_text(json.dumps(presets, ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n")
    if not (CREAM_XLSX.exists() and CW_XLSX.exists()):
        print(f"경고: 원본 엑셀이 없어 {OUT.relative_to(ROOT)}을(를) 그대로 둬요 ({SRC.relative_to(ROOT)}는 공개 저장소에 없음)")
        return 0
    data = build()
    if errors:
        for e in errors:
            print("오류:", e)
        print(f"오류 {len(errors)}개 — {OUT.relative_to(ROOT)}을(를) 만들지 않았어요.")
        return 1
    OUT.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8", newline="\n")
    b = data["bases"]
    notes = sum(1 for base in ("clay", "water") for c in b[base]["chips"] if len(c) > 2)
    print(f"생크림 단색 {len(b['cream']['single'])}색×6 + 2·3색 {len(b['cream']['chips'])}, 클레이 {len(b['clay']['chips'])}, 물 {len(b['water']['chips'])} "
          f"(비고 {notes}개) → {OUT.relative_to(ROOT)} {OUT.stat().st_size // 1024}KB, 인기 색 {len(POPULAR)}개 → {PRESETS.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
