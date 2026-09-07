import os
import sys

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

import json
import subprocess
import time

MADANG6_BASE = os.environ.get("MADANG6_BASE", r"C:\Users\bangt\Downloads\madang6")
PYTHON_EXE = os.path.join(MADANG6_BASE, "newsfilter_threads_agent", ".venv", "Scripts", "python.exe")
if not os.path.exists(PYTHON_EXE):
    PYTHON_EXE = sys.executable

AGENTS = [
    {
        "id": "threads",
        "name": "Threads AI 뉴스 에이전트",
        "category": "threads",
        "icon": "🤖",
        "dir": os.path.join(MADANG6_BASE, "newsfilter_threads_agent"),
        "script": "main.py",
        "args": [],
        "pattern": "newsfilter_threads_agent",
        "description": "공시 및 실시간 증시 뉴스 수집 / Threads 자동 포스팅 데몬"
    },
    {
        "id": "sap",
        "name": "SAP Integration Suite 에이전트",
        "category": "sap",
        "icon": "⚡",
        "dir": os.path.join(MADANG6_BASE, "sap-integration-agent"),
        "script": "main.py",
        "args": [],
        "pattern": "sap-integration-agent",
        "description": "SCN 및 SAP 커뮤니티 뉴스 수집 & 포털 동기화 데몬"
    },
    {
        "id": "supervisor",
        "name": "AI 통합 감독관 (Supervisor)",
        "category": "core",
        "icon": "🛡️",
        "dir": os.path.join(MADANG6_BASE, "agent_supervisor"),
        "script": "main.py",
        "args": [],
        "pattern": "agent_supervisor",
        "description": "전체 에이전트 리소스 감시, 크래시 자동 복구 및 텔레그램 알림"
    },
    {
        "id": "lead_orchestrator",
        "name": "메인 주식 총괄 에이전트 (Lead Orchestrator)",
        "category": "stock_lead",
        "icon": "🎯",
        "dir": os.path.join(MADANG6_BASE, "메인주식총괄에이전트"),
        "script": "main.py",
        "args": ["--interval", "60"],
        "pattern": "메인주식총괄에이전트",
        "description": "5대 서브에이전트 조율, 1차 원천 팩트체크 및 최종 의결"
    },
    {
        "id": "sub_danka",
        "name": "단가 (총괄심의)",
        "category": "sub_council",
        "icon": "⚖️",
        "dir": os.path.join(MADANG6_BASE, "서브주식에이전트_단가"),
        "script": "main.py",
        "args": ["--stock", "005930"],
        "pattern": "서브주식에이전트_단가",
        "description": "daankal.com 화수분 투자철학 기반 5인 심의 및 보물찾기"
    },
    {
        "id": "sub_growth",
        "name": "성장론자",
        "category": "sub_council",
        "icon": "🚀",
        "dir": os.path.join(MADANG6_BASE, "서브주식에이전트_성장론자"),
        "script": "main.py",
        "args": ["--interval", "60"],
        "pattern": "서브주식에이전트_성장론자",
        "description": "파괴적 혁신 및 전방 산업 고성장 테크주 발굴"
    },
    {
        "id": "sub_cautious",
        "name": "신중론자",
        "category": "sub_council",
        "icon": "🛡️",
        "dir": os.path.join(MADANG6_BASE, "서브주식에이전트_신중론자"),
        "script": "main.py",
        "args": ["--interval", "60"],
        "pattern": "서브주식에이전트_신중론자",
        "description": "단가식 안전마진 및 저평가 화수분 배당주 감사"
    },
    {
        "id": "sub_technical",
        "name": "기술적분석가",
        "category": "sub_council",
        "icon": "📊",
        "dir": os.path.join(MADANG6_BASE, "서브주식에이전트_기술적분석가"),
        "script": "main.py",
        "args": ["--interval", "60"],
        "pattern": "서브주식에이전트_기술적분석가",
        "description": "외인/기관 스마트머니 수급 집중 및 거래량 급증 추적"
    },
    {
        "id": "sub_jurini",
        "name": "주린이 코칭",
        "category": "sub_council",
        "icon": "🐣",
        "dir": os.path.join(MADANG6_BASE, "서브주식에이전트_주린이"),
        "script": "main.py",
        "args": ["--interval", "60"],
        "pattern": "서브주식에이전트_주린이",
        "description": "초보 투자자 눈높이의 쉬운 해설 및 안심 가이드"
    }
]

def get_running_procs():
    cmd = [
        "powershell", "-NoProfile", "-Command",
        "[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; Get-CimInstance Win32_Process -Filter \"Name = 'python.exe'\" | Select-Object ProcessId, CommandLine | ConvertTo-Json"
    ]
    try:
        out = subprocess.check_output(cmd, encoding="utf-8", stderr=subprocess.DEVNULL)
        parsed = json.loads(out)
        if isinstance(parsed, list):
            return [p for p in parsed if p and "ProcessId" in p]
        elif isinstance(parsed, dict) and "ProcessId" in parsed:
            return [parsed]
        return []
    except Exception:
        return []

def get_status():
    procs = get_running_procs()
    result = []
    for a in AGENTS:
        match = None
        for p in procs:
            cmdline = p.get("CommandLine") or ""
            if a["pattern"] in cmdline:
                match = p
                break
        result.append({
            "id": a["id"],
            "name": a["name"],
            "category": a["category"],
            "icon": a["icon"],
            "description": a["description"],
            "is_running": bool(match),
            "pid": match["ProcessId"] if match else None,
            "command": match.get("CommandLine") if match else None
        })
    return {
        "success": True,
        "agents": result,
        "totalCount": len(result),
        "runningCount": len([r for r in result if r["is_running"]])
    }

def start_agent(agent_id):
    if agent_id == "sub_council_all":
        sub_agents = [a for a in AGENTS if a["category"] == "sub_council"]
        procs = get_running_procs()
        count = 0
        for a in sub_agents:
            if not any(a["pattern"] in (p.get("CommandLine") or "") for p in procs):
                args = [PYTHON_EXE, a["script"]] + a["args"]
                subprocess.Popen(args, cwd=a["dir"], creationflags=subprocess.CREATE_NEW_PROCESS_GROUP if sys.platform == "win32" else 0)
                count += 1
        return {"success": True, "message": f"5대 주식 서브에이전트 일괄 기동 완료 ({count}개 신규 기동)"}

    a = next((x for x in AGENTS if x["id"] == agent_id), None)
    if not a:
        return {"success": False, "message": f"존재하지 않는 에이전트: {agent_id}"}

    procs = get_running_procs()
    match = next((p for p in procs if a["pattern"] in (p.get("CommandLine") or "")), None)
    if match:
        return {"success": True, "message": f"[{a['name']}] 이미 가동 중입니다 (PID: {match['ProcessId']})", "pid": match["ProcessId"]}

    args = [PYTHON_EXE, a["script"]] + a["args"]
    p = subprocess.Popen(args, cwd=a["dir"], creationflags=subprocess.CREATE_NEW_PROCESS_GROUP if sys.platform == "win32" else 0)
    time.sleep(1)
    return {"success": True, "message": f"[{a['name']}] 기동 완료 (PID: {p.pid})", "pid": p.pid}

def stop_agent(agent_id):
    if agent_id == "sub_council_all":
        sub_agents = [a for a in AGENTS if a["category"] == "sub_council"]
        procs = get_running_procs()
        count = 0
        for a in sub_agents:
            for p in procs:
                if a["pattern"] in (p.get("CommandLine") or ""):
                    try:
                        subprocess.run(["taskkill", "/PID", str(p["ProcessId"]), "/F"], capture_output=True)
                        count += 1
                    except Exception:
                        pass
        return {"success": True, "message": f"5대 주식 서브에이전트 일괄 정지 완료 ({count}개 프로세스 종료)"}

    a = next((x for x in AGENTS if x["id"] == agent_id), None)
    if not a:
        return {"success": False, "message": f"존재하지 않는 에이전트: {agent_id}"}

    procs = get_running_procs()
    match = next((p for p in procs if a["pattern"] in (p.get("CommandLine") or "")), None)
    if not match:
        return {"success": True, "message": f"[{a['name']}] 이미 정지 상태입니다."}

    pid = match["ProcessId"]
    subprocess.run(["taskkill", "/PID", str(pid), "/F"], capture_output=True)
    return {"success": True, "message": f"[{a['name']}] 정지 완료 (PID: {pid})"}

if __name__ == "__main__":
    action = sys.argv[1] if len(sys.argv) > 1 else "status"
    target = sys.argv[2] if len(sys.argv) > 2 else ""

    if action == "status":
        res = get_status()
    elif action == "start":
        res = start_agent(target)
    elif action == "stop":
        res = stop_agent(target)
    else:
        res = {"success": False, "message": f"알 수 없는 명령: {action}"}

    print(json.dumps(res, ensure_ascii=False))
