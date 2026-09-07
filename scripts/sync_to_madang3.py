# scripts/sync_to_madang3.py
"""
sync_to_madang3.py - madang6 주식 에이전트 리포트 -> madang3 포털 자동 동기화 헬퍼
- 로컬 파일(stockCouncilReports.json) 직접 동기화
- REST API (POST /api/stock-council-reports) HTTP 동기화
"""

import os
import json
import logging
import urllib.request
import urllib.error

logger = logging.getLogger("SyncToMadang3")

MADANG3_DATA_PATH = os.environ.get("MADANG3_DATA_PATH", r"C:\Users\bangt\Downloads\madang3\data")
MADANG3_API_URL = os.environ.get("MADANG3_API_URL", "http://localhost:8080/api/stock-council-reports")

def sync_report(report_data: dict) -> bool:
    """단일 리포트 객체를 madang3에 동기화"""
    success = False

    # 1. 파일 직접 동기화 (로컬 환경)
    if os.path.exists(MADANG3_DATA_PATH):
        try:
            json_file = os.path.join(MADANG3_DATA_PATH, "stockCouncilReports.json")
            js_file = os.path.join(MADANG3_DATA_PATH, "initialStockCouncilReports.js")

            existing = []
            if os.path.exists(json_file):
                try:
                    with open(json_file, "r", encoding="utf-8") as f:
                        data = json.load(f)
                        existing = data if isinstance(data, list) else [data]
                except Exception:
                    existing = []

            # Upsert
            r_id = report_data.get("id")
            idx = -1
            for i, r in enumerate(existing):
                if r.get("id") == r_id:
                    idx = i
                    break

            if idx >= 0:
                existing[idx] = report_data
            else:
                existing.insert(0, report_data)

            # Keep latest 100
            existing = existing[:100]

            with open(json_file, "w", encoding="utf-8") as f:
                json.dump(existing, f, ensure_ascii=False, indent=2)

            with open(js_file, "w", encoding="utf-8") as f:
                f.write("// data/initialStockCouncilReports.js - Auto-synced\n")
                f.write("window.PORTAL_DATA_STOCK_COUNCIL = ")
                json.dump(existing, f, ensure_ascii=False, indent=2)
                f.write(";\n")

            logger.info(f"madang3 로컬 데이터 파일 동기화 성공: {r_id}")
            success = True
        except Exception as e:
            logger.error(f"madang3 로컬 파일 동기화 실패: {e}")

    # 2. HTTP POST API 동기화 (원격 또는 실시간 알림)
    try:
        payload = json.dumps(report_data).encode("utf-8")
        req = urllib.request.Request(
            MADANG3_API_URL,
            data=payload,
            headers={"Content-Type": "application/json; charset=utf-8"},
            method="POST"
        )
        with urllib.request.urlopen(req, timeout=3) as resp:
            if resp.status == 200:
                logger.info("madang3 HTTP API 동기화 성공")
                success = True
    except Exception as e:
        logger.debug(f"madang3 HTTP API 동기화 스킵/오류: {e}")

    return success
