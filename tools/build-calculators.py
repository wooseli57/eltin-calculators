# -*- coding: utf-8 -*-
"""
계산기 목록 문서 → 화면용 JSON 변환기 + 검사

  python tools/build-calculators.py          # docs/calculators.md → data/calculators.json

docs/calculators.md가 계산기 이름·설명·상태의 유일한 원본입니다.
data/calculators.json은 이 스크립트가 만드는 파일이라 직접 고치지 않습니다.
(GitHub Actions가 docs/calculators.md가 바뀐 push마다 실행: .github/workflows/build-calculators.yml)

읽는 형식 (2026-11-25 재구조화)
  - 분류 제목 `## M. 메뉴 마진 [연결] (메뉴 1개 기준)` → 분류 cat·name·group("연결"|"1회성")·note
  - `### 가격 정하기` → 그 아래 계산기의 sub
  - 표 열 `단계`(예: 원가 1/6) → step, `함께 보이기`(예: M, L01, O01·O03) → also (목록)
  - 분류가 아닌 `## ` 절(계산기 연결 흐름·번호 변경표·이전 번호 변경 기록)은 무시

검사 (하나라도 걸리면 오류를 출력하고 JSON을 쓰지 않은 채 실패(종료 코드 1)로 끝남)
  - 표의 태그 형식(L01 같은 분류 글자 + 두 자리 번호), 태그 중복, 분류 제목과 태그 글자가 다른 경우
  - 분류 제목에 [연결]·[1회성] 표시가 없거나 다른 글자인 경우
  - `함께 보이기`에 목록에 없는 분류 글자나 태그가 있는 경우
  - 파일명이 태그로 시작하지 않는 경우 (예: R01 → r01-…)
  - 상태가 "완료"인데 HTML 파일이 없거나, 파일의 data-cat·data-no가 목록과 다른 경우
안내 (실패는 아님)
  - HTML에 적힌 이름(h1)·설명(p)이 목록과 다른 경우 — 화면은 목록 값으로 채워지지만 JSON을 못 읽을 때 보이는 글자라서 알려줌
  - 상태가 "완료"가 아닌데 HTML 파일이 있는 경우
"""
import json
import re
import sys
from html import unescape
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "docs" / "calculators.md"
OUT = ROOT / "data" / "calculators.json"
DONE = "완료"


def cells(line):
    return [c.strip() for c in line.strip().strip("|").split("|")]


def parse(text):
    """## L. 인건비 계산기 아래 표들을 읽음. 반환: (categories, calculators, errors)"""
    categories, calcs, errors = [], [], []
    cat, header, sub = None, None, ""
    for n, line in enumerate(text.splitlines(), 1):
        h = re.match(r"^##\s+([A-Z])\.\s+(.+?)\s*$", line)
        if h:
            name = h.group(2)
            note, group = "", ""
            m = re.match(r"^(.*?)\s*\((.*)\)$", name)
            if m:
                name, note = m.group(1).strip(), m.group(2).strip()
            g = re.match(r"^(.*?)\s*\[(.*?)\]$", name)
            if g:
                name, group = g.group(1).strip(), g.group(2).strip()
            if group not in ("연결", "1회성"):
                errors.append(f"{n}행: 분류 제목에 [연결] 또는 [1회성]이 없어요: {line.strip()}")
            cat = {"cat": h.group(1), "name": name, "group": group, "note": note}
            categories.append(cat)
            header, sub = None, ""
            continue
        s3 = re.match(r"^###\s+(.+?)\s*$", line)
        if s3 and cat:
            sub, header = s3.group(1), None
            continue
        if line.startswith("## "):                 # 분류가 아닌 절(예: 계산기 연결 흐름)
            cat, header = None, None
            continue
        if not cat or not line.startswith("|"):
            continue
        row = cells(line)
        if row and row[0] == "태그":
            header = row
            continue
        if header is None or set("".join(row)) <= set("-: "):
            continue
        col = dict(zip(header, row))
        tag = col.get("태그", "")
        tm = re.fullmatch(r"([A-Z])(\d{2})", tag)
        if not tm:
            errors.append(f"{n}행: 태그 형식이 아니에요: {tag!r}")
            continue
        if tm.group(1) != cat["cat"]:
            errors.append(f"{n}행: {tag}가 '{cat['cat']}. {cat['name']}' 분류 아래에 있어요")
        calcs.append({
            "cat": tm.group(1),
            "no": tm.group(2),
            "tag": tag,
            "file": col.get("파일명", ""),
            "name": col.get("이름", ""),
            "desc": col.get("설명", ""),
            "status": col.get("상태", ""),
            "category": cat["name"],
            "sub": sub,
            "step": col.get("단계", ""),
            "also": [x for x in re.split(r"[·,\s]+", col.get("함께 보이기", "")) if x],
            "_line": n,
        })
    return categories, calcs, errors


def check(calcs, categories):
    errors, notes = [], []
    seen = {}
    cats = {g["cat"] for g in categories}
    tags = {c["tag"] for c in calcs}
    for c in calcs:
        where = f"{c['_line']}행 {c['tag']}"
        for a in c["also"]:
            if not (a in cats or a in tags):
                errors.append(f"{where}: 함께 보이기 '{a}'는 목록에 없는 분류 글자·태그예요")
            elif a == c["tag"] or a == c["cat"]:
                errors.append(f"{where}: 함께 보이기에 자기 자신({a})이 있어요")
        if c["tag"] in seen:
            errors.append(f"{where}: 태그가 {seen[c['tag']]}행과 겹쳐요")
        seen[c["tag"]] = c["_line"]
        if not c["file"].startswith(c["tag"].lower() + "-") or not c["file"].endswith(".html"):
            errors.append(f"{where}: 파일명 '{c['file']}'이 '{c['tag'].lower()}-….html' 형식이 아니에요")
        if not c["name"]:
            errors.append(f"{where}: 이름이 비어 있어요")
        path = ROOT / c["file"]
        if c["status"] == DONE:
            if not path.is_file():
                errors.append(f"{where}: 상태가 완료인데 파일이 없어요: {c['file']}")
                continue
            html = path.read_text(encoding="utf-8")
            m = re.search(r"<html[^>]*>", html)
            tag_html = m.group(0) if m else ""
            dc = re.search(r'data-cat="([^"]*)"', tag_html)
            dn = re.search(r'data-no="([^"]*)"', tag_html)
            if not dc or dc.group(1) != c["cat"] or not dn or dn.group(1) != c["no"]:
                got = f"data-cat={dc.group(1) if dc else '없음'} data-no={dn.group(1) if dn else '없음'}"
                errors.append(f"{where}: {c['file']}의 {got} — 목록은 data-cat={c['cat']} data-no={c['no']}")
                continue
            h1 = re.search(r'<header class="calc-head">.*?<h1>(.*?)</h1>\s*<p>(.*?)</p>', html, re.S)
            if h1:
                if unescape(h1.group(1)).strip() != c["name"]:
                    notes.append(f"{where}: HTML 이름 '{unescape(h1.group(1)).strip()}' → 목록 '{c['name']}' (화면은 목록 값으로 채워짐)")
                if unescape(h1.group(2)).strip() != c["desc"]:
                    notes.append(f"{where}: HTML 설명이 목록과 달라요 (화면은 목록 값으로 채워짐)")
        elif path.is_file():
            notes.append(f"{where}: 상태가 '{c['status']}'인데 파일이 있어요: {c['file']}")
    return errors, notes


def main():
    try:
        sys.stdout.reconfigure(encoding="utf-8")   # 윈도우 콘솔에서도 한글이 깨지지 않게
    except Exception:
        pass
    categories, calcs, errors = parse(SRC.read_text(encoding="utf-8"))
    more, notes = check(calcs, categories)
    errors += more
    for x in notes:
        print("안내:", x)
    if errors:
        for e in errors:
            print("오류:", e)
        print(f"오류 {len(errors)}개 — {OUT.relative_to(ROOT)}을(를) 만들지 않았어요.")
        return 1
    data = {
        "_about": "docs/calculators.md에서 tools/build-calculators.py로 만든 파일이에요. 직접 고치지 말고 docs/calculators.md를 고친 뒤 다시 실행하세요.",
        "_source": "docs/calculators.md",
        "categories": categories,
        "calculators": [{k: v for k, v in c.items() if not k.startswith("_")} for c in calcs],
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n")
    done = sum(c["status"] == DONE for c in calcs)
    print(f"계산기 {len(calcs)}개 (완료 {done}개), 분류 {len(categories)}개 → {OUT.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
