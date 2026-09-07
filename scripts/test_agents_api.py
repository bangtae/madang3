import urllib.request
import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

try:
    with urllib.request.urlopen("http://127.0.0.1:8080/api/system/agents", timeout=5) as res:
        data = json.loads(res.read().decode('utf-8'))
        print(f"TOTAL: {data['totalCount']}, RUNNING: {data['runningCount']}")
        for a in data.get('agents', []):
            status_mark = "🟢 ON" if a['is_running'] else "🔴 OFF"
            pid_str = f"PID: {a['pid']}" if a.get('pid') else "PID: -"
            print(f"  {a['icon']} [{a['id']}] {a['name']} | {status_mark} | {pid_str}")
except Exception as e:
    print("TEST_ERROR:", e)
    sys.exit(1)
