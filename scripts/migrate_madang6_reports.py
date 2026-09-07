# scripts/migrate_madang6_reports.py
import os
import re
import json
import glob
from datetime import datetime

MADANG6_BASE = r"C:\Users\bangt\Downloads\madang6"
MADANG3_BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(MADANG3_BASE, "data")
os.makedirs(DATA_DIR, exist_ok=True)

AGENTS_CONFIG = [
    {
        "dir": os.path.join(MADANG6_BASE, "서브주식에이전트_단가", "reports"),
        "agentId": "sub_stock_dankal",
        "persona": "단가 (총괄심의)",
        "icon": "⚖️",
        "role": "총괄 CIO / 5인 교차 토론",
        "isCouncilDebate": True
    },
    {
        "dir": os.path.join(MADANG6_BASE, "서브주식에이전트_성장론자", "reports"),
        "agentId": "sub_stock_growth",
        "persona": "성장론자",
        "icon": "🚀",
        "role": "파괴적 혁신 및 전방 산업 고성장주 발굴",
        "isCouncilDebate": False
    },
    {
        "dir": os.path.join(MADANG6_BASE, "서브주식에이전트_신중론자", "reports"),
        "agentId": "sub_stock_cautious",
        "persona": "신중론자",
        "icon": "🛡️",
        "role": "단가식 안전마진 및 저평가 화수분 배당주 감사",
        "isCouncilDebate": False
    },
    {
        "dir": os.path.join(MADANG6_BASE, "서브주식에이전트_기술적분석가", "reports"),
        "agentId": "sub_stock_technical",
        "persona": "기술적분석가",
        "icon": "📊",
        "role": "스마트머니 수급 집중 및 거래량 급증 추적",
        "isCouncilDebate": False
    },
    {
        "dir": os.path.join(MADANG6_BASE, "서브주식에이전트_주린이", "reports"),
        "agentId": "sub_stock_jurini",
        "persona": "주린이 코칭",
        "icon": "🐣",
        "role": "초보 투자자 눈높이의 쉬운 해설 및 안심 가이드",
        "isCouncilDebate": False
    }
]

def parse_report_file(filepath, agent_cfg):
    filename = os.path.basename(filepath)
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    # Match filename pattern: YYYYMMDD_HHMMSS_{stock_name}_{suffix}.md
    m = re.match(r"^(\d{8})_(\d{6})_([^_]+)_", filename)
    if m:
        d_str, t_str, stock_name = m.group(1), m.group(2), m.group(3)
        created_at_str = f"{d_str[:4]}-{d_str[4:6]}-{d_str[6:8]} {t_str[:2]}:{t_str[2:4]}:{t_str[4:6]}"
        date_str = f"{d_str[:4]}-{d_str[4:6]}-{d_str[6:8]}"
        time_str = f"{t_str[:2]}:{t_str[2:4]}:{t_str[4:6]}"
        iso_str = f"{d_str[:4]}-{d_str[4:6]}-{d_str[6:8]}T{t_str[:2]}:{t_str[2:4]}:{t_str[4:6]}+09:00"
    else:
        stat = os.stat(filepath)
        dt = datetime.fromtimestamp(stat.st_mtime)
        stock_name = "종목"
        date_str = dt.strftime("%Y-%m-%d")
        time_str = dt.strftime("%H:%M:%S")
        created_at_str = dt.strftime("%Y-%m-%d %H:%M:%S")
        iso_str = dt.isoformat()

    # Extract title
    title_match = re.search(r"^#\s+(.*)$", content, re.MULTILINE)
    title = title_match.group(1).strip() if title_match else f"{stock_name} 리포트"

    # Extract item code
    code_match = re.search(r"\(([0-9A-Za-z]{6})\)", title)
    item_code = code_match.group(1) if code_match else ""

    # Extract grade / badge
    grade = "일반 분석"
    grade_match = re.search(r"(?:등급|상태|진단|안심 등급)[:\s*]+([^\n\r*]+)", content)
    if grade_match:
        grade = grade_match.group(1).strip().replace("**", "")

    # Extract summary or bullet points
    summary_match = re.search(r"## 1\.[^\n]+\n([\s\S]*?)(?=\n##|$)", content)
    if summary_match:
        summary_lines = [l.strip() for l in summary_match.group(1).strip().split("\n") if l.strip()]
        summary = " ".join(summary_lines[:3])
    else:
        summary = content[:200].replace("\n", " ")

    # Extract facts if available
    facts = {}
    price_match = re.search(r"현재가[:* ]+([0-9,]+원?)", content)
    if price_match:
        facts["closePrice"] = price_match.group(1)
    
    per_match = re.search(r"PER[:* ]+([0-9.,]+배?)", content)
    if per_match:
        facts["per"] = per_match.group(1)

    pbr_match = re.search(r"PBR[:* ]+([0-9.,]+배?)", content)
    if pbr_match:
        facts["pbr"] = pbr_match.group(1)

    organ_match = re.search(r"기관 순매수[:* ]+([^\n\r,]+)", content)
    if organ_match:
        facts["organBuy"] = organ_match.group(1).strip()

    foreign_match = re.search(r"외국인 순매수[:* ]+([^\n\r]+)", content)
    if foreign_match:
        facts["foreignBuy"] = foreign_match.group(1).strip()

    report_id = f"scr-{filename.replace('.md', '').replace('_', '-')}"

    return {
        "id": report_id,
        "agentId": agent_cfg["agentId"],
        "persona": agent_cfg["persona"],
        "icon": agent_cfg["icon"],
        "role": agent_cfg["role"],
        "isCouncilDebate": agent_cfg["isCouncilDebate"],
        "stockName": stock_name,
        "itemCode": item_code,
        "title": title,
        "grade": grade,
        "summary": summary,
        "factData": facts,
        "date": date_str,
        "time": time_str,
        "createdAt": iso_str,
        "markdown": content
    }

def main():
    all_reports = []
    for agent_cfg in AGENTS_CONFIG:
        if os.path.isdir(agent_cfg["dir"]):
            md_files = glob.glob(os.path.join(agent_cfg["dir"], "*.md"))
            for fpath in md_files:
                try:
                    rep = parse_report_file(fpath, agent_cfg)
                    all_reports.append(rep)
                except Exception as e:
                    print(f"Error parsing {fpath}: {e}")

    # Sort descending by createdAt
    all_reports.sort(key=lambda x: x["createdAt"], reverse=True)

    json_path = os.path.join(DATA_DIR, "stockCouncilReports.json")
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(all_reports, f, ensure_ascii=False, indent=2)
    print(f"Saved {len(all_reports)} reports to {json_path}")

    js_path = os.path.join(DATA_DIR, "initialStockCouncilReports.js")
    with open(js_path, "w", encoding="utf-8") as f:
        f.write("// data/initialStockCouncilReports.js - Auto-generated / static fallback\n")
        f.write("window.PORTAL_DATA_STOCK_COUNCIL = ")
        json.dump(all_reports, f, ensure_ascii=False, indent=2)
        f.write(";\n")
    print(f"Saved initial JS data to {js_path}")

if __name__ == "__main__":
    main()
