# -*- coding: utf-8 -*-
"""
엘틴 레시피 문서 → R04용 JSON 변환기

  python tools/build-recipes.py            # docs/recipes/eltin-recipes.md → data/eltin-recipes.json

원본 문서(docs/recipes/eltin-recipes.md)를 고치면 이 스크립트를 다시 실행해 JSON을 새로 만듭니다.
형식: docs/specs/R04.md "데이터" 절, docs/specs/color-flavor-links.md 4절.
읽을 수 없는 줄이 있으면 경고를 출력하고 그 값은 비워 둡니다 (조용히 틀린 값을 넣지 않음).
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "docs" / "recipes" / "eltin-recipes.md"
OUT = ROOT / "data" / "eltin-recipes.json"

# 바탕 종류 이름 → data/color-bases.json의 id (color-flavor-links.md 2절)
BASES = {"생크림": "whipped-cream", "버터크림": "buttercream", "머랭": "meringue", "반죽": "batter", "아이싱": "icing",
         "쌀가루": "rice", "음료": "drink", "젤리": "jelly", "설탕": "sugar", "초콜릿": "chocolate"}
MODES = {"개수": "count", "틀": "pan", "무게": "weight", "부피": "volume"}
NUM = r"\d+(?:\.\d+)?"
warnings = []


def warn(rid, msg):
    warnings.append(f"레시피 {rid}: {msg}")


def num(s):
    v = float(s)
    return int(v) if v.is_integer() else v


def parse_amount(text):
    """'120g (약 2개)' → {amount: 120, unit: 'g', countUnit: '개', countPer: 60}
       '30~45ml (2~3 Tbsp)' → {amount: [30, 45], unit: 'ml'}, '한 꼬집' → {amount: None, text: '한 꼬집'}"""
    t = text.strip()
    m = re.match(rf"^(?:약\s*)?({NUM})(?:\s*~\s*({NUM}))?\s*([a-zA-Z가-힣]+)?\s*(?:\((.*)\))?$", t)
    if not m:
        return {"amount": None, "unit": "", "text": t}
    a, b, unit, paren = m.groups()
    amount = [num(a), num(b)] if b else num(a)
    out = {"amount": amount, "unit": unit or ""}
    if paren:
        c = re.match(rf"^(?:약\s*)?({NUM})\s*(개|장)$", paren.strip())
        if c and not b and out["unit"] in ("g", "ml"):
            # 개수로 세는 재료: 1개(장)당 무게 = 총무게 ÷ 개수
            out["countUnit"] = c.group(2)
            out["countPer"] = round(num(a) / num(c.group(1)), 3)
        # 그 밖의 괄호(1tsp, 2~3 Tbsp, 30~60ml)는 단위 환산 안내라 배수와 함께 맞지 않아 버림
    return out


def parse_base(rid, qty, mode_text, ingredients):
    """기본 분량·양 조절 → base {mode, amount, unit, pan?, label}"""
    mm = re.match(r"(개수|틀|무게|부피)", mode_text.strip())
    if not mm:
        warn(rid, f"양 조절 방식을 읽지 못함: {mode_text}")
        return None
    mode = MODES[mm.group(1)]
    base = {"mode": mode, "label": qty.strip()}
    if mode == "pan":
        p = re.search(r"(\d)호", qty)
        base.update({"pan": p.group(1) if p else "1", "amount": 1, "unit": "개"})
        if not p:
            warn(rid, f"틀 호수를 읽지 못해 1호로 둠: {qty}")
    elif mode == "count":
        unit = "잔" if "잔" in mode_text else "개"
        c = re.search(rf"({NUM})\s*(개|잔)", qty)
        if c:
            base.update({"amount": num(c.group(1)), "unit": c.group(2)})
        else:
            warn(rid, f"기본 개수를 읽지 못함: {qty}")
            base.update({"amount": None, "unit": unit})
    else:
        unit = "g" if mode == "weight" else "ml"
        w = re.search(rf"({NUM})\s*{unit}", qty)
        if w:
            base.update({"amount": num(w.group(1)), "unit": unit})
        else:
            # 기본 분량에 무게가 없으면(예: 파운드틀 1개) 재료 무게의 합을 기준으로 씀
            total = sum(i["amount"] for i in ingredients if i.get("unit") in ("g", "ml") and isinstance(i.get("amount"), (int, float)))
            base.update({"amount": round(total), "unit": unit, "derived": True})
    return base


def parse_link_line(rid, kind, text):
    """'3단계, 완성된 머랭에 / 바탕: 머랭 / 색 입힐 양: 반죽 전체 약 370g'"""
    parts = [p.strip() for p in text.split("/")]
    step_text = parts[0]
    s = re.search(r"(\d+)단계", step_text)
    out = {"step": int(s.group(1)) if s else None, "where": step_text}
    if not s:
        warn(rid, f"{kind}: 단계 번호를 읽지 못함: {step_text}")
    qty = next((p for p in parts if "입힐 양" in p), "")
    g = re.search(rf"({NUM})\s*(g|ml)", qty)
    if g:
        out["grams"] = num(g.group(1))
        out["unit"] = g.group(2)
        rest = re.sub(r".*?입힐 양:\s*", "", qty)
        paren = re.search(r"\((.*?)\)", rest)
        head = re.sub(r"\(.*?\)", "", rest)
        head = re.sub(rf"(약\s*)?{NUM}\s*(g|ml)", "", head).strip()
        note = " · ".join(x for x in (head, paren.group(1).strip() if paren else "") if x)
        if note:
            out["note"] = note
    else:
        warn(rid, f"{kind}: 입힐 양을 읽지 못함: {qty}")
    if kind == "color":
        b = next((p for p in parts if p.startswith("바탕:")), "")
        name = b.replace("바탕:", "").strip()
        if name in BASES:
            out["base"] = BASES[name]
        else:
            warn(rid, f"색: 바탕 종류를 읽지 못함: {b}")
    else:
        label = next((p for p in parts[1:] if "입힐 양" not in p), "")
        out["label"] = label
    return out


def parse_recipe(block):
    head, *lines = block.strip().split("\n")
    m = re.match(r"(\d+)\.\s*(.+)", head.strip())
    rid, name = m.group(1), m.group(2).strip()
    r = {"id": rid, "name": name, "audience": "", "base": None, "ingredients": [], "steps": [], "tips": [], "cautions": []}
    meta, in_steps, extra = None, False, []
    for raw in lines:
        line = raw.rstrip()
        s = line.strip()
        if not s:
            continue
        if s.startswith("- 대상:"):
            meta = s
        elif s.startswith("- 출처:"):
            r["source"] = s.replace("- 출처:", "").strip()
        elif s.startswith("|"):
            cells = [c.strip() for c in s.strip("|").split("|")]
            if cells[0] in ("재료", "") or set(cells[0]) <= set("-"):
                continue
            ing = {"name": cells[0], **parse_amount(cells[1]), "note": cells[2] if len(cells) > 2 else ""}
            if "바닐라" in ing["name"] and "엘틴" in ing["name"]:
                ing["eltin"] = "vanilla"
            if ing["amount"] is None and ing.get("text") not in ("한 꼬집", "적당량"):
                warn(rid, f"재료 양을 숫자로 읽지 못해 글자 그대로 둠: {ing['name']} {cells[1]}")
            r["ingredients"].append(ing)
        elif s.startswith("- 색을 넣으려면:"):
            r["color"] = parse_link_line(rid, "color", s.split(":", 1)[1])
        elif s.startswith("- 향을 바꾸려면:"):
            r["flavor"] = parse_link_line(rid, "flavor", s.split(":", 1)[1])
        elif s == "만드는 법":
            in_steps = True
        elif re.match(r"^\d+\.\s", s) and in_steps:
            r["steps"].append(re.sub(r"^\d+\.\s*", "", s))
        elif s.startswith("팁:"):
            r["tips"].append(s[3:].strip())
        elif s.startswith("주의:"):
            r["cautions"].append(s[3:].strip())
        else:
            extra.append(s)           # 예: "에센스로 만들 때: …" → 팁으로
    for e in extra:
        r["tips"].append(e.replace("**", ""))
    if meta:
        parts = dict((p.split(":", 1)[0].strip(" -"), p.split(":", 1)[1].strip()) for p in meta.split("/") if ":" in p)
        r["audience"] = parts.get("대상", "")
        r["base"] = parse_base(rid, parts.get("기본 분량", ""), parts.get("양 조절", ""), r["ingredients"])
    else:
        warn(rid, "대상·기본 분량 줄이 없음")
    return r


def main():
    try:
        sys.stdout.reconfigure(encoding="utf-8")   # 윈도우 콘솔에서도 한글이 깨지지 않게
    except Exception:
        pass
    text = SRC.read_text(encoding="utf-8")
    blocks = re.split(r"^## ", text, flags=re.M)[1:]
    recipes = [parse_recipe(b) for b in blocks if re.match(r"\d+\.", b)]
    data = {
        "_about": "docs/recipes/eltin-recipes.md에서 tools/build-recipes.py로 만든 파일이에요. 직접 고치지 말고 원본 문서를 고친 뒤 다시 실행하세요.",
        "_source": "docs/recipes/eltin-recipes.md",
        "_status": "초안 (엘틴 실제 테스트 후 확정)",
        "recipes": recipes,
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"레시피 {len(recipes)}개 → {OUT.relative_to(ROOT)}")
    for w in warnings:
        print("경고:", w)
    return 0


if __name__ == "__main__":
    sys.exit(main())
