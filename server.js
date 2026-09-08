process.on('uncaughtException', (err) => {
  console.error('[Uncaught Exception]:', err);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('[Unhandled Rejection]:', reason);
});

const express = require('express');
const path = require('path');
const fs = require('fs');
const telegramBot = require('./app/utils/telegramBotHelper');

const app = express();
const PORT = parseInt(process.env.PORT || '8080', 10);
const dataDir = path.join(__dirname, 'data');
const allowedIpsFile = path.join(dataDir, 'allowed_ips.json');
const blockedIpsFile = path.join(dataDir, 'blocked_ips.json');
const accessLogsFile = path.join(dataDir, 'access_logs.json');

// Ensure data directory and default files exist
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}
if (!fs.existsSync(allowedIpsFile)) {
  fs.writeFileSync(allowedIpsFile, JSON.stringify(["127.0.0.1", "::1", "192.168.219.115", "192.168.219.*"], null, 2), 'utf8');
}
if (!fs.existsSync(blockedIpsFile)) {
  fs.writeFileSync(blockedIpsFile, "[]", 'utf8');
}
if (!fs.existsSync(accessLogsFile)) {
  fs.writeFileSync(accessLogsFile, "[]", 'utf8');
}

/**
 * 외부 유입 IP 접속 로그 기록 함수
 */
function logAccess(clientIp, status, requestPath) {
  if (!clientIp) return;
  if (requestPath && requestPath.match(/\.(css|js|png|jpg|jpeg|gif|svg|ico|woff2?|map|ttf)$/i)) {
    return;
  }

  try {
    let logs = [];
    if (fs.existsSync(accessLogsFile)) {
      try {
        const raw = fs.readFileSync(accessLogsFile, 'utf8').replace(/^\uFEFF/, '').trim();
        if (raw) logs = JSON.parse(raw);
        if (!Array.isArray(logs)) logs = [];
      } catch (e) {
        logs = [];
      }
    }

    const now = new Date();
    const kstNow = new Intl.DateTimeFormat('sv-SE', {
      timeZone: 'Asia/Seoul',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    }).format(now);

    const existingIdx = logs.findIndex(l => l && l.ip === clientIp);
    if (existingIdx >= 0) {
      logs[existingIdx].lastAccess = kstNow;
      logs[existingIdx].count = (parseInt(logs[existingIdx].count, 10) || 0) + 1;
      logs[existingIdx].status = status;
      logs[existingIdx].lastPath = requestPath || '/';
      // 최근 접속 항목을 상단으로 이동
      const updatedItem = logs.splice(existingIdx, 1)[0];
      logs.unshift(updatedItem);
    } else {
      logs.unshift({
        ip: clientIp,
        firstAccess: kstNow,
        lastAccess: kstNow,
        count: 1,
        status: status,
        lastPath: requestPath || '/'
      });
    }

    if (logs.length > 300) {
      logs = logs.slice(0, 300);
    }

    fs.writeFileSync(accessLogsFile, JSON.stringify(logs, null, 2), 'utf8');
  } catch (err) {
    console.error('[Access Log Error]', err.message);
  }
}

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 외부 유입 IP 실시간 감지, 로깅 및 텔레그램 승인/차단 알림 미들웨어
app.use((req, res, next) => {
  const rawIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
  const cleanIp = rawIp.split(',')[0].trim().replace(/^.*:/, '');

  if (cleanIp && !req.path.match(/\.(css|js|png|jpg|jpeg|gif|svg|ico|woff2?|map|ttf)$/i)) {
    try {
      let allowed = [];
      let blocked = [];
      if (fs.existsSync(allowedIpsFile)) {
        try { allowed = JSON.parse(fs.readFileSync(allowedIpsFile, 'utf8')); } catch (e) {}
      }
      if (fs.existsSync(blockedIpsFile)) {
        try { blocked = JSON.parse(fs.readFileSync(blockedIpsFile, 'utf8')); } catch (e) {}
      }

      const isBlocked = Array.isArray(blocked) && blocked.some(p => telegramBot.isIpMatch(cleanIp, p));
      if (isBlocked) {
        logAccess(cleanIp, 'BLOCKED_BLACKLIST', req.path);
        return res.status(403).send(`<html><body><h1>403 Forbidden</h1><p>Access Denied: Your IP (${cleanIp}) is blacklisted.</p></body></html>`);
      }

      const isAllowed = Array.isArray(allowed) && allowed.some(p => telegramBot.isIpMatch(cleanIp, p));
      const isLocal = telegramBot.isPrivateOrLocalIp(cleanIp);

      let status = 'ALLOWED';
      if (!isAllowed) {
        if (isLocal) {
          status = 'ALLOWED_LOCAL';
        } else {
          status = 'MISC';
          telegramBot.sendNewIpAlert(cleanIp, req.path, '미분류 외부 접속');
        }
      }

      logAccess(cleanIp, status, req.path);
    } catch (e) {
      logAccess(cleanIp, 'MISC', req.path);
    }
  }
  next();
});

// Static files serving
app.use(express.static(__dirname));

// Primary routes (Direct to main portal index.html)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/main', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// REST API Endpoints for Data Persistence & Security
app.get('/api/my-ip', (req, res) => {
  const rawIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
  const cleanIp = rawIp.split(',')[0].trim().replace(/^.*:/, '');
  res.json({ ip: cleanIp || rawIp });
});

// IP 화이트리스트 조회/저장
app.get('/api/allowed-ips', (req, res) => {
  if (fs.existsSync(allowedIpsFile)) {
    return res.sendFile(allowedIpsFile);
  }
  res.json(["127.0.0.1", "::1", "192.168.219.115", "192.168.219.*"]);
});

app.post('/api/allowed-ips', (req, res) => {
  try {
    const data = req.body;
    fs.writeFileSync(allowedIpsFile, JSON.stringify(data, null, 2), 'utf8');
    res.json({ success: true, count: Array.isArray(data) ? data.length : 0 });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// IP 블랙리스트 조회/저장
app.get('/api/blocked-ips', (req, res) => {
  if (fs.existsSync(blockedIpsFile)) {
    return res.sendFile(blockedIpsFile);
  }
  res.json([]);
});

app.post('/api/blocked-ips', (req, res) => {
  try {
    const data = req.body;
    fs.writeFileSync(blockedIpsFile, JSON.stringify(data, null, 2), 'utf8');
    res.json({ success: true, count: Array.isArray(data) ? data.length : 0 });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 외부 유입 IP 접속 로그 조회/삭제
app.get('/api/access-logs', (req, res) => {
  if (fs.existsSync(accessLogsFile)) {
    return res.sendFile(accessLogsFile);
  }
  res.json([]);
});

app.delete('/api/access-logs', (req, res) => {
  try {
    fs.writeFileSync(accessLogsFile, '[]', 'utf8');
    res.json({ success: true, status: 'ok' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/apis', (req, res) => {
  const filePath = path.join(__dirname, 'data', 'apis.json');
  if (fs.existsSync(filePath)) {
    return res.sendFile(filePath);
  }
  const fallbackPath = path.join(__dirname, 'data', 'initialApis.js');
  if (fs.existsSync(fallbackPath)) {
    try {
      const code = fs.readFileSync(fallbackPath, 'utf8');
      const jsonText = code.replace(/^window\.PORTAL_DATA_APIS\s*=\s*/, '').replace(/;\s*$/, '');
      return res.type('json').send(jsonText);
    } catch (e) {
      return res.status(500).json({ error: 'Failed to parse initialApis.js' });
    }
  }
  res.json([]);
});

app.post('/api/apis', (req, res) => {
  const filePath = path.join(__dirname, 'data', 'apis.json');
  try {
    const data = req.body;
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    res.json({ success: true, count: Array.isArray(data) ? data.length : 0 });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/menu-config', (req, res) => {
  const filePath = path.join(__dirname, 'data', 'menuConfig.json');
  if (fs.existsSync(filePath)) {
    return res.sendFile(filePath);
  }
  res.json([]);
});

app.post('/api/menu-config', (req, res) => {
  const filePath = path.join(__dirname, 'data', 'menuConfig.json');
  try {
    const data = req.body;
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/workflows', (req, res) => {
  const filePath = path.join(__dirname, 'data', 'workflows.json');
  if (fs.existsSync(filePath)) {
    return res.sendFile(filePath);
  }
  res.json([]);
});

app.post('/api/workflows', (req, res) => {
  const dataDir = path.join(__dirname, 'data');
  const filePath = path.join(dataDir, 'workflows.json');
  try {
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    const data = req.body;
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/stock-temp', (req, res) => {
  const filePath = path.join(__dirname, 'data', 'stockTemp.json');
  if (fs.existsSync(filePath)) {
    return res.sendFile(filePath);
  }
  const fallbackPath = path.join(__dirname, 'data', 'initialStockTemp.js');
  if (fs.existsSync(fallbackPath)) {
    try {
      const code = fs.readFileSync(fallbackPath, 'utf8');
      const jsonText = code.replace(/^window\.PORTAL_DATA_STOCK_TEMP\s*=\s*/, '').replace(/;\s*$/, '');
      return res.type('json').send(jsonText);
    } catch (e) {
      return res.status(500).json({ error: 'Failed to parse initialStockTemp.js' });
    }
  }
  res.json([]);
});

app.post('/api/stock-temp', (req, res) => {
  const dataDir = path.join(__dirname, 'data');
  const filePath = path.join(dataDir, 'stockTemp.json');
  try {
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    const data = req.body;
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    res.json({ success: true, count: Array.isArray(data) ? data.length : 0 });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/stock-council-reports', (req, res) => {
  const filePath = path.join(__dirname, 'data', 'stockCouncilReports.json');
  if (fs.existsSync(filePath)) {
    return res.sendFile(filePath);
  }
  const fallbackPath = path.join(__dirname, 'data', 'initialStockCouncilReports.js');
  if (fs.existsSync(fallbackPath)) {
    try {
      const code = fs.readFileSync(fallbackPath, 'utf8');
      const jsonText = code.replace(/^window\.PORTAL_DATA_STOCK_COUNCIL\s*=\s*/, '').replace(/;\s*$/, '');
      return res.type('json').send(jsonText);
    } catch (e) {
      return res.status(500).json({ error: 'Failed to parse initialStockCouncilReports.js' });
    }
  }
  res.json([]);
});

app.post('/api/stock-council-reports', (req, res) => {
  const dataDir = path.join(__dirname, 'data');
  const filePath = path.join(dataDir, 'stockCouncilReports.json');
  const jsFilePath = path.join(dataDir, 'initialStockCouncilReports.js');
  try {
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    let existing = [];
    if (fs.existsSync(filePath)) {
      try { existing = JSON.parse(fs.readFileSync(filePath, 'utf8')); } catch (e) {}
    }
    const incoming = req.body;
    if (Array.isArray(incoming)) {
      existing = incoming;
    } else if (incoming && incoming.id) {
      const idx = existing.findIndex(r => r.id === incoming.id);
      if (idx >= 0) existing[idx] = incoming;
      else existing.unshift(incoming);
    }
    fs.writeFileSync(filePath, JSON.stringify(existing, null, 2), 'utf8');
    fs.writeFileSync(jsFilePath, `// data/initialStockCouncilReports.js\nwindow.PORTAL_DATA_STOCK_COUNCIL = ${JSON.stringify(existing, null, 2)};\n`, 'utf8');
    res.json({ success: true, count: existing.length });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ==========================================
// 🔥 AI 끝장 토론실 (Debate Arena) API
// ==========================================
app.get('/api/stock-debates', (req, res) => {
  const filePath = path.join(__dirname, 'data', 'stockDebateLogs.json');
  if (fs.existsSync(filePath)) {
    return res.sendFile(filePath);
  }
  const fallbackPath = path.join(__dirname, 'data', 'initialStockDebateLogs.js');
  if (fs.existsSync(fallbackPath)) {
    try {
      const code = fs.readFileSync(fallbackPath, 'utf8');
      const jsonText = code.replace(/^window\.PORTAL_DATA_STOCK_DEBATES\s*=\s*/, '').replace(/;\s*$/, '');
      return res.type('json').send(jsonText);
    } catch (e) {
      return res.status(500).json({ error: 'Failed to parse initialStockDebateLogs.js' });
    }
  }
  res.json([]);
});

app.post('/api/stock-debates', (req, res) => {
  const dataDir = path.join(__dirname, 'data');
  const filePath = path.join(dataDir, 'stockDebateLogs.json');
  const jsFilePath = path.join(dataDir, 'initialStockDebateLogs.js');
  try {
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    let existing = [];
    if (fs.existsSync(filePath)) {
      try { existing = JSON.parse(fs.readFileSync(filePath, 'utf8')); } catch (e) {}
    }
    const incoming = req.body;
    if (Array.isArray(incoming)) {
      existing = incoming;
    } else if (incoming && incoming.id) {
      const idx = existing.findIndex(r => r.id === incoming.id || (r.item_code && r.item_code === incoming.item_code));
      if (idx >= 0) existing[idx] = incoming;
      else existing.unshift(incoming);
    }
    fs.writeFileSync(filePath, JSON.stringify(existing, null, 2), 'utf8');
    fs.writeFileSync(jsFilePath, `// data/initialStockDebateLogs.js\nwindow.PORTAL_DATA_STOCK_DEBATES = ${JSON.stringify(existing, null, 2)};\n`, 'utf8');
    res.json({ success: true, count: existing.length });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 🔥 끝장 토론 전체 비우기 & 개별 삭제 엔드포인트
app.delete('/api/stock-debates', (req, res) => {
  const dataDir = path.join(__dirname, 'data');
  const filePath = path.join(dataDir, 'stockDebateLogs.json');
  const jsFilePath = path.join(dataDir, 'initialStockDebateLogs.js');
  const deleteId = req.query.id || req.body?.id;
  const deleteAll = req.query.all === 'true' || req.body?.all === true;

  try {
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    let existing = [];
    if (fs.existsSync(filePath)) {
      try { existing = JSON.parse(fs.readFileSync(filePath, 'utf8')); } catch (e) {}
    }
    if (!Array.isArray(existing)) existing = [];

    if (deleteAll) {
      existing = [];
      // 전체 비우기 직후 60분간 자동 테마 발굴이 즉각 재실행되어 화면에 다시 나타나지 않도록 쿨다운 설정
      lastAutoDebateTime = Date.now();
      console.log('[Debate Arena] 전체 비우기 완료: 모든 토론 기록 초기화됨.');
    } else if (deleteId) {
      existing = existing.filter(r => r.id !== deleteId && r.item_code !== deleteId);
    }

    fs.writeFileSync(filePath, JSON.stringify(existing, null, 2), 'utf8');
    fs.writeFileSync(jsFilePath, `// data/initialStockDebateLogs.js\nwindow.PORTAL_DATA_STOCK_DEBATES = ${JSON.stringify(existing, null, 2)};\n`, 'utf8');
    res.json({ success: true, message: deleteAll ? '모든 토론 기록이 초기화되었습니다.' : '선택한 토론이 삭제되었습니다.', remaining: existing.length });
  } catch (e) {
    console.error('[Debate Delete Error]', e);
    res.status(500).json({ success: false, error: e.message });
  }
});

// ==========================================
// AI 끝장 토론 (Debate Arena) & 핵심 테마 검증 2.1 엔진
// ==========================================

function saveDebateLog(debateItem) {
  const dataDir = path.join(__dirname, 'data');
  const filePath = path.join(dataDir, 'stockDebateLogs.json');
  const jsFilePath = path.join(dataDir, 'initialStockDebateLogs.js');
  try {
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    let existing = [];
    if (fs.existsSync(filePath)) {
      try { existing = JSON.parse(fs.readFileSync(filePath, 'utf8')); } catch (e) {}
    }
    if (!Array.isArray(existing)) existing = [];
    
    // 동일 종목코드(item_code) 또는 id가 이미 존재하면 해당 항목을 최신으로 교체하고 맨 앞으로 이동
    const idx = existing.findIndex(r => (r.item_code && r.item_code === debateItem.item_code) || r.id === debateItem.id);
    if (idx >= 0) {
      existing.splice(idx, 1);
    }
    existing.unshift(debateItem);

    if (existing.length > 100) existing = existing.slice(0, 100);

    fs.writeFileSync(filePath, JSON.stringify(existing, null, 2), 'utf8');
    fs.writeFileSync(jsFilePath, `// data/initialStockDebateLogs.js\nwindow.PORTAL_DATA_STOCK_DEBATES = ${JSON.stringify(existing, null, 2)};\n`, 'utf8');
    return true;
  } catch (err) {
    console.error('[DebateLog Save Error]', err);
    return false;
  }
}

let lastAutoDebateTime = 0;
let isAutoDebateRunning = false;

const AUTO_THEME_CANDIDATES = [
  { code: '000660', name: 'SK하이닉스', topic: 'HBM4 패키징 및 엔비디아 차세대 GPU 공급' },
  { code: '005380', name: '현대차', topic: '보스턴다이내믹스 로보틱스 협력 및 자율주행 SDV' },
  { code: '196170', name: '알테오젠', topic: '키트루다 SC 독점 로열티 및 피하주사 플랫폼 가치' },
  { code: '034020', name: '두산에너빌리티', topic: 'AI 데이터센터 전력 급증에 따른 SMR 원전 수혜' },
  { code: '042700', name: '한미반도체', topic: '글로벌 OSAT 공급망 및 차세대 듀얼 TC본더 독점력' },
  { code: '068270', name: '셀트리온', topic: '짐펜트라 미국 PBM 등재 및 신약 파이프라인 확장' },
  { code: '328130', name: '루닛', topic: '글로벌 빅파마 AI 바이오마커 설루션 상용화' },
  { code: '058470', name: '리노공업', topic: '온디바이스 AI 반도체 테스트 핀 및 소켓 수요 폭증' },
  { code: '000270', name: '기아', topic: '글로벌 PBV 시장 선점 및 전기차 수익성 방어' },
  { code: '086520', name: '에코프로', topic: '차세대 2차전지 전구체 내재화 및 수직계열화' }
];

let krxStockMap = {};
try {
  const krxPath = path.join(__dirname, 'data', 'krx_stock_map.json');
  if (fs.existsSync(krxPath)) {
    krxStockMap = JSON.parse(fs.readFileSync(krxPath, 'utf8'));
  }
} catch (e) {
  console.warn('[KRX Map Load Error]', e.message);
}

async function generateCloudDebate({ stock = '', stockName = '', customTopic = '', isAutoTheme = false } = {}) {
  const geminiKey = getGeminiApiKey();
  if (!geminiKey) {
    throw new Error('GEMINI_API_KEY가 설정되지 않아 클라우드 토론을 생성할 수 없습니다.');
  }

  // 1. 종목코드 및 명칭 양방향 해석
  const defaultMap = {
    '루닛': '328130', '삼성전자': '005930', 'SK하이닉스': '000660', '현대차': '005380',
    '현대자동차': '005380', '알테오젠': '196170', '두산에너빌리티': '034020', 'NAVER': '035420',
    '네이버': '035420', '카카오': '035720', 'HLB': '028300', '에코프로': '086520',
    '에코프로비엠': '247540', '삼천당제약': '000250', '리노공업': '058470', '하이브': '352820',
    '한미반도체': '042700', '셀트리온': '068270', '기아': '000270', 'POSCO홀딩스': '005490'
  };
  const reverseMap = {
    '005930': '삼성전자', '000660': 'SK하이닉스', '005380': '현대차', '196170': '알테오젠',
    '034020': '두산에너빌리티', '035420': 'NAVER', '035720': '카카오', '028300': 'HLB',
    '086520': '에코프로', '247540': '에코프로비엠', '000250': '삼천당제약', '058470': '리노공업',
    '352820': '하이브', '328130': '루닛', '042700': '한미반도체', '068270': '셀트리온',
    '000270': '기아', '005490': 'POSCO홀딩스'
  };

  let resolvedCode = '';
  let resolvedName = stockName || '';
  let rawStock = String(stock || '').trim();

  // 자동 테마 발굴 모드이거나 종목 미지정 시 핫 테마 대장주 동적 선정
  if (isAutoTheme || (!rawStock && !resolvedName)) {
    if (isAutoTheme) {
      const candidate = AUTO_THEME_CANDIDATES[Math.floor(Math.random() * AUTO_THEME_CANDIDATES.length)];
      resolvedCode = candidate.code;
      resolvedName = candidate.name;
      if (!customTopic) customTopic = candidate.topic;
    } else {
      throw new Error('분석할 주식 종목명이나 종목코드를 입력해주세요.');
    }
  } else {
    if (/^\d{6}$/.test(rawStock)) {
      resolvedCode = rawStock;
      if (!resolvedName) resolvedName = reverseMap[rawStock] || '';
    } else {
      resolvedCode = defaultMap[rawStock] || defaultMap[rawStock.replace(/\s+/g, '')] || krxStockMap[rawStock] || krxStockMap[rawStock.replace(/\s+/g, '')] || '';
      resolvedName = rawStock;
    }
    if (resolvedCode && !resolvedName) {
      resolvedName = reverseMap[resolvedCode] || '';
      if (!resolvedName) {
        for (const [name, code] of Object.entries(krxStockMap)) {
          if (code === resolvedCode) {
            resolvedName = name;
            break;
          }
        }
      }
    }
    if (!resolvedCode && !resolvedName) {
      throw new Error('분석할 주식 종목명이나 종목코드를 올바르게 입력해주세요.');
    }
  }

  // 2. 네이버 증권 실시간 시세 API 선행 호출
  let realPrice = null;
  let realChangePct = null;
  let realMarket = 'KOSPI';
  let realStockName = resolvedName;
  try {
    const qUrl = `https://m.stock.naver.com/api/stock/${resolvedCode}/basic`;
    const qRes = await fetch(qUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (qRes.ok) {
      const qData = await qRes.json();
      if (qData.stockName && qData.stockName.length > 1) realStockName = qData.stockName;
      if (qData.closePrice) realPrice = qData.closePrice;
      if (qData.fluctuationsRatio !== undefined) {
        const ratio = parseFloat(qData.fluctuationsRatio);
        realChangePct = (ratio > 0 ? '+' : '') + qData.fluctuationsRatio + '%';
      }
      if (qData.sosok === '1') realMarket = 'KOSDAQ';
      else if (qData.sosok === '0') realMarket = 'KOSPI';
    }
  } catch (quoteErr) {
    console.warn('[RealtimeQuote Error]', quoteErr.message);
  }

  const systemPrompt = `[역할: 5대 에이전트 주식 끝장 토론실(Debate Arena) 심의위원회 & 전문 애널리스트]
당신은 대한민국 최고 수준의 5대 주식 서브에이전트(메인총괄 CIO, 신중론자, 성장론자, 차티스트/수급, 주린이, 단가)가 한 치의 거짓 없이 치열하게 맞붙는 'AI 끝장 토론실'의 심의위원회 총괄 오케스트레이터입니다.

단순한 공시 단발성 공방이 아닌, 투자자가 실제로 해당 기업을 100% 꿰뚫어 볼 수 있도록 아래 [5대 핵심 검증 단계]를 12턴에 걸쳐 한 단계씩 순차적으로 검증하고 반박하며 치열한 티키타카 공방을 벌이세요.

[5대 핵심 검증 단계 체계]
1단계: [기업 개요 & 주요 사업 및 R&D/매출 구조 (DART 사업보고서 기반)]
   - 어떤 기업이고 어떤 사업을 영위하는지, 핵심 매출 비중은 어디서 나오는지
   - 연구개발(R&D) 투자 규모 및 신성장 파이프라인/특허 현황
2단계: [재무제표 건전성 & 현금흐름 판정 (DART 재무제표 기반)]
   - 최근 매출액, 영업이익, 당기순이익, 부채비율(200% 초과 여부), 단기차입금
   - 현금흐름 4대 유형(우량/성장/재기/몰락형), 유상증자/CB(전환사채) 폭탄 리스크
3단계: [인터넷 시장 테마 & 메가트렌드 모멘텀 (인터넷/뉴스 실시간 팩트체크)]
   - 과거부터 현재까지 인터넷 커뮤니티와 뉴스에서 이 종목을 움직였던 핵심 테마들
   - 실질적인 수혜 연결 고리가 있는 진짜 테마 vs 단순 찌라시/노이즈 가짜 테마 필터링
4단계: [네이버 증권 연간·분기 실적 추이 분석]
   - 연간 및 최근 분기 실적 추이(매출, 영업이익률), 컨센서스 상회/하회 여부
   - 주린이(초보 투자자) 눈높이의 쉬운 일상 비유 해설
5단계: [토스증권 차트 마디가 & 수급 세력/작전주 의혹 검증]
   - 외국인/기관/개인/연기금 최근 수급 주체 및 지분율
   - 세력의 매집, 상승/개미털기, 설거지 흔적이 있는지 작전 리스크 점검
   - 차트 지지/저항 마디가, 20일선 눌림목 타점, 1차 매수가, 목표가, 손절선 제시
6단계: [심의위원회 최종 판정 & 애널리스트 관점 종합 의결]
   - 5대 에이전트 공방을 총괄하여 최종 투자 의견(BUY / HOLD / CAUTION), 적정 목표가, 포트폴리오 비중(%) 선언

[12턴 진행 순서 및 전담 발언 규칙 (총 12턴 필수)]
• Turn 1 (메인총괄 / CIO): 안건 상정, 기업 개요, 주요 사업 부문 및 R&D/핵심 매출 비중 제시 (1단계 검증)
• Turn 2 (신중론자 / Value Auditor): DART 재무제표 건전성 공격 (부채비율, CB/유증, 현금흐름 리스크) (2단계 검증)
• Turn 3 (성장론자 / Growth Maximalist): 기업 본질 및 R&D 투자의 미래 매출 전환 가능성 방어 반격 (2단계 방어)
• Turn 4 (주린이 / Novice Investor): 초보 투자자 현실 공포 질문 ("회사는 좋은데 부채비율 높으면 위험한가요?")
• Turn 5 (성장론자 / Growth Maximalist): 인터넷 시장 테마 및 메가트렌드 모멘텀 팩트 제시 (3단계 검증)
• Turn 6 (신중론자 / Value Auditor): 시장 테마의 허와 실, 가짜 뉴스 및 일회성 테마 거품 지적 (3단계 공격)
• Turn 7 (차티스트 / Technical Analyst): 네이버 증권 연간·분기 실적 추이 및 컨센서스 진단 (4단계 검증)
• Turn 8 (차티스트 / Technical Analyst): 토스증권 차트마디가(지지선, 저항선, 20일선 타점, 손절가) 분석 (5단계 검증)
• Turn 9 (신중론자 / Value Auditor): 수급 주체(외인/기관/개인) 분석 및 세력 장난/작전주 의혹 점검 (5단계 공격)
• Turn 10 (주린이 / Novice Investor): 매매 타이밍 직설 질문 ("그럼 지금 당장 사도 되나요? 언제 팔아요?")
• Turn 11 (단가 / quantitative): PBR/PER 밸류에이션 기반 3단계 분할 매수가 및 안전마진 가이드 제시
• Turn 12 (메인총괄 / CIO): 심의위원회 최종 의결 및 전문 애널리스트 종합 결론 (목표가, 손절가, 포트폴리오 비중 확정)

[문체 및 JSON 출력 규격]
반드시 마크다운 블록(\`\`\`json) 없이 순수한 JSON 객체 하나만 출력하세요.
{
  "stock_name": "${realStockName || resolvedName || '종목명'}",
  "item_code": "${resolvedCode}",
  "market": "${realMarket}",
  "current_price": "${realPrice || 'N/A'}",
  "change_pct": "${realChangePct || '+0.0%'}",
  "per": "최신 PER (예: 12.5배)",
  "pbr": "최신 PBR (예: 1.8배)",
  "shares_outstanding": "발행주식수",
  "topic": "${realStockName || resolvedName} 5대 심층 검증: 사업/R&D·재무·테마·실적·세력수급 12턴 끝장 토론",
  "news_headline": "DART 사업보고서 및 최신 공시/뉴스 핵심 팩트 한 줄 요약",
  "theme_report": {
    "theme_name": "기업 핵심 테마명",
    "news_evidence": "핵심 테마 및 실적 연결 고리 팩트 요약",
    "metrics": {
      "subject": "주체 (글로벌 완성차, 정부 정책 등)",
      "timing": "시점 (예: 2025~2026년 양산)",
      "earnings_link": "실적 연결성 (영업이익 기여도 등)",
      "market_reaction": "시장 반응 (외인 수급, 거래량 등)"
    },
    "investment_horizon": "단기 | 중기 | 장기 중 택1",
    "stock_map": {
      "leader": "대장주 (종목명) - 선정이유 요약",
      "secondary": "2차 수혜 (종목명) - 연결 고리 설명",
      "related": "연관 테마 (종목명) - 확장 가능성"
    },
    "expert_comment": "💡 애널리스트 관점의 종합 투자 코멘트"
  },
  "final_action": "BUY (분할접근) | HOLD (관망) | CAUTION (리스크관리)",
  "action_title": "⚖️ 심의위원회 최종 의결 판정 (목표가/손절가 명시)",
  "verdict_summary": "사업구조, 재무건전성, 시장테마, 네이버실적, 차트수급을 종합한 애널리스트 관점의 최종 결론 (3~4문장)",
  "bull_score": 75,
  "bear_score": 35,
  "turns": [
    {
      "turn": 1,
      "agent_id": "lead_orchestrator",
      "speaker": "메인총괄 (CIO)",
      "role": "🏛️ 메인총괄 (CIO)",
      "avatar": "🏛️",
      "tag": "1단계: 기업개요 및 R&D/사업구조 분석",
      "badge_color": "#38bdf8",
      "message": "...",
      "time": "10:00"
    }
  ]
}`;

  let userPrompt = '';
  if (isAutoTheme) {
    userPrompt = `오늘 한국 주식 시장(KOSPI/KOSDAQ)에서 가장 뜨겁게 화제가 되고 있거나 실질적 모멘텀이 발생한 핵심 테마와 그 대표 대장주를 Google 실시간 검색으로 발굴하세요.
그리고 '5대 핵심 검증 단계(기업개요/R&D → 재무제표 건전성 → 시장테마 팩트체크 → 네이버 연간/분기 실적 → 토스 차트마디가 & 세력수급)'에 따라 5대 에이전트의 치열한 12턴 단계별 끝장 토론과 애널리스트 최종 판정이 담긴 완성된 JSON을 생성하세요.`;
  } else {
    userPrompt = `종목 [${realStockName || resolvedName || stock} (${resolvedCode})]에 대해 Google 실시간 검색으로 최신 DART 전자공시, 사업보고서(주요사업, 매출비중, R&D), 재무제표, 인터넷 관련 테마, 네이버 증권 실적 추이, 토스증권 수급과 차트 흐름을 정밀 조사하세요.
현재 실측 종가는 ${realPrice ? realPrice + '원' : '실시간 시세'} (${realChangePct || ''}) 입니다.
'5대 핵심 검증 단계 체계'에 따라 5대 에이전트(메인총괄, 신중론자, 성장론자, 차티스트, 주린이, 단가)가 1턴부터 12턴까지 단계별로 치열하게 공방을 벌이고, 애널리스트 관점의 최종 투자 판정을 내리는 12턴 끝장 토론 JSON을 완성하세요.`;
  }

  const payload = {
    system_instruction: { parts: [{ text: systemPrompt }] },
    contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
    tools: [{ google_search: {} }],
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 8192
    }
  };

  const models = [
    'gemini-flash-lite-latest',
    'gemini-flash-latest',
    'gemini-2.5-flash',
    'gemini-2.5-flash-lite',
    'gemini-3.1-flash-lite-preview',
    'gemini-2.5-pro'
  ];
  let rawText = '';
  for (const m of models) {
    try {
      const gUrl = `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${geminiKey}`;
      let gRes = await fetch(gUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      let gData = await gRes.json();
      let candidateText = gData.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!candidateText && payload.tools) {
        // tools 제거 후 순수 프롬프트로 재시도
        const noToolPayload = { ...payload };
        delete noToolPayload.tools;
        gRes = await fetch(gUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(noToolPayload)
        });
        gData = await gRes.json();
        candidateText = gData.candidates?.[0]?.content?.parts?.[0]?.text;
      }
      if (candidateText) {
        rawText = candidateText;
        console.log(`[Debate Cloud Engine] Successfully generated via model: ${m}`);
        break;
      } else {
        console.warn(`[Debate Cloud Engine] Model ${m} returned no text. Error:`, gData.error?.message || JSON.stringify(gData));
      }
    } catch (err) {
      console.warn(`[Debate Cloud Engine] Model ${m} error:`, err.message);
    }
  }

  if (!rawText) {
    throw new Error('Gemini 클라우드 엔진으로부터 토론 데이터를 수신하지 못했습니다.');
  }

  let cleaned = rawText.trim().replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/\s*```$/, '').trim();
  let debateData;
  try {
    debateData = JSON.parse(cleaned);
  } catch (e) {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) debateData = JSON.parse(match[0]);
    else throw new Error('AI 토론 JSON 파싱 실패');
  }

  const now = new Date();
  const kstTime = new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false
  }).format(now);

  // 종목코드 및 종목명 최종 확정 (AI 추출 결과 및 역방향 맵 우선)
  let finalItemCode = resolvedCode;
  if (isAutoTheme && debateData.item_code) {
    finalItemCode = String(debateData.item_code).trim();
  } else if (debateData.item_code && /^\d{6}$/.test(debateData.item_code)) {
    finalItemCode = debateData.item_code;
  }

  const stockReverseMap = {
    '005930': '삼성전자', '000660': 'SK하이닉스', '005380': '현대차', '196170': '알테오젠',
    '034020': '두산에너빌리티', '035420': 'NAVER', '035720': '카카오', '028300': 'HLB',
    '086520': '에코프로', '247540': '에코프로비엠', '000250': '삼천당제약', '058470': '리노공업',
    '352820': '하이브', '328130': '루닛', '042700': '한미반도체', '068270': '셀트리온',
    '000270': '기아', '005490': 'POSCO홀딩스'
  };

  let finalStockName = debateData.stock_name || realStockName || resolvedName || stockReverseMap[finalItemCode] || '국내 핵심 종목';
  if (stockReverseMap[finalItemCode]) {
    finalStockName = stockReverseMap[finalItemCode];
  }

  let finalMarket = realMarket;
  let finalPrice = realPrice;
  let finalChangePct = realChangePct;

  if (isAutoTheme && debateData.item_code) {
    try {
      const qUrl = `https://m.stock.naver.com/api/stock/${finalItemCode}/basic`;
      const qRes = await fetch(qUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      if (qRes.ok) {
        const qData = await qRes.json();
        if (qData.closePrice) finalPrice = qData.closePrice;
        if (qData.fluctuationsRatio !== undefined) {
          const ratio = parseFloat(qData.fluctuationsRatio);
          finalChangePct = (ratio > 0 ? '+' : '') + qData.fluctuationsRatio + '%';
        }
        if (qData.sosok === '1') finalMarket = 'KOSDAQ';
        else if (qData.sosok === '0') finalMarket = 'KOSPI';
      }
    } catch (quoteErr) {
      console.warn('[AutoTheme Quote Refresh Error]', quoteErr.message);
    }
  }

  const debateItem = {
    id: `debate_${Date.now()}`,
    item_code: finalItemCode || resolvedCode || '000000',
    stock_name: finalStockName,
    market: finalMarket || 'KOSPI',
    status: 'COMPLETED',
    timestamp: kstTime,
    topic: debateData.topic || `${finalStockName} 5대 심층 검증: 사업/R&D·재무·테마·실적·세력수급 12턴 끝장 토론`,
    current_price: finalPrice || debateData.current_price || 'N/A',
    change_pct: finalChangePct || debateData.change_pct || '+0.0%',
    per: debateData.per || 'N/A',
    pbr: debateData.pbr || 'N/A',
    shares_outstanding: debateData.shares_outstanding || 'N/A',
    news_headline: debateData.news_headline || '',
    theme_report: debateData.theme_report || null,
    final_action: debateData.final_action || 'HOLD (관망)',
    action_title: debateData.action_title || '⚖️ 심의위원회 의결',
    verdict_summary: debateData.verdict_summary || '',
    bull_score: debateData.bull_score || 50,
    bear_score: debateData.bear_score || 50,
    turns: Array.isArray(debateData.turns) && debateData.turns.length > 0 ? debateData.turns : [
      {
        turn: 1,
        agent_id: "danka",
        speaker: "단가",
        role: "메인총괄 (심의위원장)",
        avatar: "⚖️",
        tag: "최종 의결 판정",
        badge_color: "#eab308",
        message: debateData.verdict_summary || "실시간 핵심 테마 검증 2.1이 완료되었습니다.",
        time: kstTime
      }
    ]
  };

  saveDebateLog(debateItem);
  sendDebateTelegramAlert(debateItem).catch(e => console.warn('[Telegram Alert Async Error]', e.message));
  return debateItem;
}

// 🔥 끝장 토론 텔레그램 실시간 알림 브리핑 헬퍼
async function sendDebateTelegramAlert(debateItem) {
  try {
    if (!telegramBot || typeof telegramBot.sendGeneralMessage !== 'function') return;
    const verdict = debateItem.action_title || debateItem.final_action || '심의 의결 완료';
    const turnsCount = Array.isArray(debateItem.turns) ? debateItem.turns.length : 0;
    const tgMsg = `🔥 <b>[AI 5대 에이전트 끝장 토론실 - 의결 선언]</b>

• <b>대상 종목:</b> ${debateItem.stock_name} (${debateItem.item_code}) [${debateItem.market || 'KOSPI'}]
• <b>현재 주가:</b> ${debateItem.current_price || '-'} (${debateItem.change_pct || '+0.0%'})
• <b>의결 판정:</b> <b>${verdict}</b>
• <b>격돌 화두:</b> ${debateItem.topic || '-'}
• <b>토론 공방:</b> 총 ${turnsCount}턴 치열한 5대 에이전트 공방 완료

⚖️ <b>심의위원장 최종 총평:</b>
${debateItem.verdict_summary || '-'}

👉 <a href="https://madang3-264643074286.asia-northeast3.run.app/">AI 끝장 토론실 바로가기</a>`;
    await telegramBot.sendGeneralMessage(tgMsg, 'HTML');
  } catch (err) {
    console.warn('[Debate Telegram Alert Error]', err.message);
  }
}

async function triggerAutoThemeDebate(force = false) {
  const now = Date.now();
  const cooldownMs = 45 * 60 * 1000; // 최소 45분 쿨다운

  if (!force && (now - lastAutoDebateTime < cooldownMs)) {
    return { skipped: true, reason: '쿨다운 진행 중', lastRun: lastAutoDebateTime };
  }

  if (isAutoDebateRunning) {
    return { skipped: true, reason: '이미 자동 검증 토론이 실행 중입니다.' };
  }

  isAutoDebateRunning = true;
  try {
    console.log('[AutoThemeDebate] 1시간 주기 핵심 테마 검증 2.1 자동 토론 생성 시작...');
    const result = await generateCloudDebate({ isAutoTheme: true });
    lastAutoDebateTime = Date.now();
    console.log(`[AutoThemeDebate] 자동 토론 완료: [${result.stock_name}] ${result.topic}`);
    return { success: true, debate: result };
  } catch (err) {
    console.error('[AutoThemeDebate Error]', err.message);
    return { success: false, error: err.message };
  } finally {
    isAutoDebateRunning = false;
  }
}

// 1시간 주기 백그라운드 타이머 기동 (60분)
setInterval(() => {
  triggerAutoThemeDebate(false).catch(() => {});
}, 60 * 60 * 1000);

// 서버 기동 15초 후 초기 상태 점검 (저장된 토론이 없으면 최초 1회 즉시 실행)
setTimeout(() => {
  const logFile = path.join(__dirname, 'data', 'stockDebateLogs.json');
  let hasLogs = false;
  if (fs.existsSync(logFile)) {
    try {
      const logs = JSON.parse(fs.readFileSync(logFile, 'utf8'));
      if (Array.isArray(logs) && logs.length > 0) hasLogs = true;
    } catch (e) {}
  }
  if (!hasLogs) {
    console.log('[AutoThemeDebate] 저장된 토론 데이터가 없어 초기 핵심 테마 검증 토론을 가동합니다.');
    triggerAutoThemeDebate(true).catch(() => {});
  }
}, 15000);

// 엔드포인트 1: 1시간 자동 테마 검증 트리거 (Cloud Scheduler, cron, 클라이언트 연동용)
app.all('/api/stock-debates/auto-theme-debate', async (req, res) => {
  const force = req.query.force === 'true' || req.body?.force === true;
  const result = await triggerAutoThemeDebate(force);
  res.json(result);
});

// 엔드포인트 2: 자동 토론 상태 확인
app.get('/api/stock-debates/last-auto-status', (req, res) => {
  const now = Date.now();
  const elapsedMinutes = Math.floor((now - lastAutoDebateTime) / 60000);
  res.json({
    lastAutoDebateTime,
    elapsedMinutes,
    isRunning: isAutoDebateRunning,
    needsTrigger: lastAutoDebateTime === 0 || elapsedMinutes >= 60
  });
});

// 엔드포인트 3: 즉시 토론 소집 (Debate Summon) - 로컬 파이썬 우선, 부재 시 Gemini Cloud 엔진 즉시 폴백!
app.post('/api/stock-debates/trigger', async (req, res) => {
  const stock = (req.body?.stock || '').trim();
  const stockName = (req.body?.stock_name || req.body?.originalQuery || '').trim();
  const topic = (req.body?.topic || '').trim();

  if (!stock && !stockName) {
    return res.status(400).json({
      success: false,
      message: '분석할 주식 종목명이나 종목코드를 입력해주세요.'
    });
  }
  const pythonPath = 'C:\\Users\\bangt\\Downloads\\madang6\\newsfilter_threads_agent\\.venv\\Scripts\\python.exe';
  const scriptPath = 'C:\\Users\\bangt\\Downloads\\madang6\\debate_arena.py';

  // 1. 로컬 환경에 파이썬 및 스크립트가 온전히 존재하면 로컬 프로세스 실행
  if (fs.existsSync(pythonPath) && fs.existsSync(scriptPath)) {
    try {
      const cp = require('child_process');
      const args = [scriptPath, '--stock', stock, '--sync'];
      if (topic) args.push('--topic', topic);
      
      cp.execFile(pythonPath, args, { cwd: path.dirname(scriptPath), encoding: 'utf8' }, (err, stdout, stderr) => {
        if (err) {
          console.warn('[Debate Local Error, Falling back to Gemini Cloud Engine]', err.message);
          // 로컬 에러 발생 시 클라우드 엔진으로 즉시 폴백
          generateCloudDebate({ stock, stockName, customTopic: topic })
            .then(debateItem => {
              res.json({
                success: true,
                debate: debateItem,
                message: `'${debateItem.stock_name}' 5대 에이전트 끝장 토론이 성공적으로 완료되었습니다!`
              });
            })
            .catch(cloudErr => {
              res.status(500).json({ success: false, error: cloudErr.message });
            });
          return;
        }
        try {
          const lines = stdout.trim().split('\n');
          let resultJson = null;
          for (let i = lines.length - 1; i >= 0; i--) {
            try {
              resultJson = JSON.parse(lines[i]);
              if (resultJson && resultJson.turns) break;
            } catch (e) {}
          }
          if (resultJson) {
            sendDebateTelegramAlert(resultJson).catch(() => {});
          }
          return res.json({ 
            success: true, 
            debate: resultJson, 
            message: `'${resultJson?.stock_name || stockName || stock}' 끝장 토론이 성공적으로 완료 및 기록되었습니다!` 
          });
        } catch (parseErr) {
          return res.json({ success: true, message: `'${stockName || stock}' 끝장 토론이 생성되었습니다.` });
        }
      });
      return;
    } catch (e) {
      console.warn('[Debate Spawn Exception, Falling back to Gemini Cloud]', e.message);
    }
  }

  // 2. GCP Cloud Run 및 파이썬 미설치 환경: Gemini 2.5 Flash 기반 Cloud Debate Engine 즉시 구동!
  try {
    const debateItem = await generateCloudDebate({ stock, stockName, customTopic: topic });
    return res.json({
      success: true,
      debate: debateItem,
      message: `'${debateItem.stock_name}' 5대 에이전트 끝장 토론이 성공적으로 완료되었습니다!`
    });
  } catch (cloudErr) {
    console.error('[Debate Trigger Cloud Engine Error]', cloudErr);
    return res.status(500).json({ success: false, error: cloudErr.message });
  }
});

function getGeminiApiKey() {
  if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here') {
    return process.env.GEMINI_API_KEY;
  }
  const envCandidates = [
    path.join(__dirname, '.env'),
    'C:\\Users\\bangt\\Downloads\\madang3\\.env',
    'C:\\Users\\bangt\\Downloads\\madang6\\agent_supervisor\\.env',
    'C:\\Users\\bangt\\Downloads\\madang6\\newsfilter_threads_agent\\.env'
  ];
  for (const envPath of envCandidates) {
    if (fs.existsSync(envPath)) {
      try {
        const content = fs.readFileSync(envPath, 'utf8');
        for (const line of content.split('\n')) {
          const match = line.match(/^\s*GEMINI_API_KEY\s*=\s*(.+)$/);
          if (match) {
            const val = match[1].trim().replace(/^["']|["']$/g, '');
            if (val && val !== 'your_gemini_api_key_here') return val;
          }
        }
      } catch (e) {}
    }
  }
  return null;
}

app.post('/api/stock-council-analyze', async (req, res) => {
  const stock = (req.body?.stock || '').trim();
  if (!stock) {
    return res.status(400).json({ success: false, message: '분석할 종목코드를 입력해주세요.' });
  }
  const pythonPath = 'C:\\Users\\bangt\\Downloads\\madang6\\newsfilter_threads_agent\\.venv\\Scripts\\python.exe';
  const scriptPath = 'C:\\Users\\bangt\\Downloads\\madang6\\서브주식에이전트_단가\\main.py';
  
  // 1. 로컬 개발 환경: 파이썬 스크립트 실행 환경이 있으면 로컬 데몬 프로세스 스폰
  if (fs.existsSync(pythonPath) && fs.existsSync(scriptPath)) {
    try {
      const cp = require('child_process');
      const child = cp.spawn(pythonPath, [scriptPath, '--stock', stock, '--ondemand-only'], {
        cwd: path.dirname(scriptPath),
        detached: true,
        stdio: 'ignore'
      });
      child.unref();
      return res.json({ 
        success: true, 
        message: `'${stock}' 5대 에이전트 온디맨드 분석이 시작되었습니다. 잠시 후 새로고침 됩니다.` 
      });
    } catch (err) {
      console.warn('[StockCouncil] Local spawn error, falling back to Gemini Cloud Engine:', err.message);
    }
  }

  // 2. GCP Cloud Run 및 클라우드 환경: Gemini 2.5 기반 실시간 클라우드 심의 엔진 가동
  const geminiKey = getGeminiApiKey();
  if (!geminiKey) {
    return res.json({ 
      success: false, 
      message: 'GEMINI_API_KEY가 설정되지 않아 클라우드 분석을 수행할 수 없습니다. .env 환경변수를 확인해주세요.' 
    });
  }

  try {
    const systemPrompt = `당신은 Antigravity AI 주식 투자심의위원회의 메인 총괄 에이전트(Lead Orchestrator)이자 5대 서브에이전트단(단가 분석, 성장론자, 신중론자, 기술적분석가, 주린이 코칭)을 통합 지휘하는 최고 투자책임자(CIO)입니다.
Google 검색을 통해 대상 종목의 가장 최신 현재가, 목표주가, PER, PBR, 부채비율, 거래량 및 최근 실적/수급 동향을 조사한 후, 5대 서브에이전트의 관점별 심층 심의와 메인 총괄의 최종 의결을 도출하세요.

반드시 마크다운 블록(\`\`\`json)이나 인사말 없이 오직 순수한 JSON 문자열 하나만 출력하세요.

반환할 JSON 스키마 규격:
{
  "stockName": "정확한 종목 한글명 (예: 루닛, 삼성전자 등)",
  "itemCode": "6자리 종목코드 (예: 328130, 005930 등)",
  "grade": "적극매수 | 매수 | 중립 | 관망 | 매도 중 택1",
  "summary": "- 판정: ... - 리스크: N/10 - 진입: ...원 ~ ...원 구간 분할 매수 전략",
  "factData": {
    "closePrice": "현재가 (예: 52,300원)",
    "targetPrice": "목표주가 또는 컨센서스 (예: 75,000원)",
    "per": "PER (예: 15.4배 또는 N/A)",
    "pbr": "PBR (예: 2.1배)",
    "debtRatio": "부채비율 (예: 45.2% (최근 결산))",
    "avg20dVolume": "20일 평균거래량 (예: 350,000주)"
  },
  "subagentReports": {
    "growth": "성장론자 관점: 미래 성장 모멘텀, 전방 산업 확장성, 신제품/신시장 매출 기여도 분석 (2~3문장)",
    "cautious": "신중론자 관점: 밸류에이션 부담, 안전마진, 재무 안정성, 다운사이드 리스크 점검 (2~3문장)",
    "technical": "기술적분석가 관점: 차트 추세, 이평선 정배열/역배열, 외인/기관 수급 집중도, 거래량 분석 (2~3문장)",
    "jurini": "주린이 관점: 초보 투자자 눈높이의 쉬운 해설, 추격 매수 주의점 및 안심 가이드 (1~2문장)"
  }
}`;

    const payload = {
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: 'user', parts: [{ text: `종목 '${stock}'에 대해 최신 시장 데이터를 검색하고 5대 심의위원 교차 분석 및 메인 총괄 최종 의결 JSON을 생성하세요.` }] }],
      tools: [{ google_search: {} }],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 4096
      }
    };

    let rawText = '';
    const models = ['gemini-2.5-flash', 'gemini-2.5-flash-lite'];
    for (const m of models) {
      try {
        const gUrl = `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${geminiKey}`;
        const gRes = await fetch(gUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const gData = await gRes.json();
        const candidateText = gData.candidates?.[0]?.content?.parts?.[0]?.text;
        if (candidateText) {
          rawText = candidateText;
          break;
        }
      } catch (err) {
        console.warn(`[StockCouncil] Gemini model ${m} error:`, err.message);
      }
    }

    if (!rawText) {
      return res.status(500).json({ success: false, message: 'Gemini 모델로부터 분석 결과를 수신하지 못했습니다. 잠시 후 다시 시도해주세요.' });
    }

    // JSON 파싱 (코드블록 감싸기 제거)
    let cleaned = rawText.trim().replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/\s*```$/, '').trim();
    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch (e) {
      const match = cleaned.match(/\{[\s\S]*\}/);
      if (match) parsed = JSON.parse(match[0]);
      else throw new Error('AI 분석 결과 JSON 파싱에 실패했습니다.');
    }

    const now = new Date();
    const kstStr = new Intl.DateTimeFormat('sv-SE', {
      timeZone: 'Asia/Seoul',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    }).format(now);
    const [datePart, timePart] = kstStr.split(' ');
    const cleanDate = datePart.replace(/-/g, '');
    const cleanTime = timePart.replace(/:/g, '');
    const reportId = `scr-${cleanDate}_${cleanTime}-${parsed.stockName || stock}-council`;

    const reportItem = {
      id: reportId,
      agentId: "lead_stock_orchestrator",
      persona: "AI 투자심의위원회 (메인총괄)",
      icon: "⚖️",
      role: "메인 주식 총괄 에이전트 / 팩트체크 감시자",
      isCouncilDebate: true,
      stockName: parsed.stockName || stock,
      itemCode: parsed.itemCode || (stock.length === 6 && /^\d+$/.test(stock) ? stock : '000000'),
      title: `[투자심의위원회 최종의결] ${parsed.stockName || stock} (${parsed.itemCode || stock})`,
      grade: parsed.grade || "중립",
      summary: parsed.summary || `- 판정: ${parsed.grade || '중립'} - 5대 에이전트 교차 검증 완료`,
      kStockTemp: {
        temp: 50,
        status: "미지근/중립 (50°C)",
        datetime: ""
      },
      factData: parsed.factData || {
        closePrice: "-", targetPrice: "-", per: "-", pbr: "-", debtRatio: "-", avg20dVolume: "-"
      },
      subagentReports: parsed.subagentReports || {},
      date: datePart,
      time: timePart,
      createdAt: now.toISOString()
    };

    // 3. stockCouncilReports.json 에 영구 저장 (최대 100개 보관)
    const reportsPath = path.join(dataDir, 'stockCouncilReports.json');
    let reportList = [];
    if (fs.existsSync(reportsPath)) {
      try { reportList = JSON.parse(fs.readFileSync(reportsPath, 'utf8')); } catch (e) { reportList = []; }
    }
    reportList.unshift(reportItem);
    if (reportList.length > 100) reportList = reportList.slice(0, 100);
    fs.writeFileSync(reportsPath, JSON.stringify(reportList, null, 2), 'utf8');

    // 4. initialStockCouncilReports.js 동기화
    const jsPath = path.join(dataDir, 'initialStockCouncilReports.js');
    try {
      fs.writeFileSync(jsPath, `// data/initialStockCouncilReports.js\nwindow.PORTAL_DATA_STOCK_COUNCIL_REPORTS = ${JSON.stringify(reportList, null, 2)};\n`, 'utf8');
    } catch (e) {}

    // 5. 텔레그램 리포트 브리핑 발송
    try {
      const tgMsg = `🏛️ <b>[AI 투자심의위원회 - 온디맨드 심의 의결]</b>

• <b>대상 종목:</b> ${reportItem.stockName} (${reportItem.itemCode})
• <b>최종 판정:</b> <b>${reportItem.grade}</b>
• <b>핵심 요약:</b> ${reportItem.summary}
• <b>현재가/목표가:</b> ${reportItem.factData?.closePrice || '-'} / ${reportItem.factData?.targetPrice || '-'}

🚀 <b>성장론자:</b> ${reportItem.subagentReports?.growth || '-'}
🛡️ <b>신중론자:</b> ${reportItem.subagentReports?.cautious || '-'}
📊 <b>기술적분석:</b> ${reportItem.subagentReports?.technical || '-'}
🐣 <b>주린이:</b> ${reportItem.subagentReports?.jurini || '-'}

👉 <a href="https://madang3-264643074286.asia-northeast3.run.app/">심의실 리포트 바로가기</a>`;

      await telegramBot.sendGeneralMessage(tgMsg, 'HTML');
    } catch (tgErr) {
      console.warn('[StockCouncil] Telegram alert error:', tgErr.message);
    }

    return res.json({
      success: true,
      message: `'${reportItem.stockName}' 5대 에이전트 온디맨드 심의 분석이 완료되어 리포트에 등록되었습니다!`,
      report: reportItem
    });
  } catch (err) {
    console.error('[StockCouncil] Cloud analyze error:', err);
    return res.status(500).json({ success: false, message: `클라우드 분석 중 오류가 발생했습니다: ${err.message}` });
  }
});

app.post('/api/analyze-ai-url', async (req, res) => {
  const targetUrl = req.body?.url || '';
  if (!targetUrl) return res.json({ success: false, message: 'URL Missing' });
  try {
    const domain = new URL(targetUrl).hostname.replace(/^www\./, '');
    return res.json({
      success: true,
      title: domain,
      developer: domain.split('.')[0].toUpperCase(),
      category: 'AI System',
      tags: [domain, 'AI Platform'],
      summary: `${domain} 서비스 분석 및 활용 개요`,
      garageIdeas: `1. Integration with ${domain} API\n2. Automated Workflow`,
      quickStart: `Visit official site: ${targetUrl}`,
      pricing: 'Freemium / Pay-as-you-go',
      country: 'US',
      similarModels: 'Zapier, Make.com',
      docsUrl: targetUrl
    });
  } catch (e) {
    return res.json({ success: false, message: e.message });
  }
});

// SAP Integration Suite Endpoints
app.get('/api/sap-news', (req, res) => {
  const filePath = path.join(__dirname, 'data', 'sapNews.json');
  if (fs.existsSync(filePath)) return res.sendFile(filePath);
  const fbPath = path.join(__dirname, 'data', 'initialSapNews.js');
  if (fs.existsSync(fbPath)) {
    try {
      const code = fs.readFileSync(fbPath, 'utf8');
      const jsonText = code.replace(/^window\.PORTAL_DATA_SAP_NEWS\s*=\s*/, '').replace(/;\s*$/, '');
      return res.type('json').send(jsonText);
    } catch (e) {}
  }
  res.json([]);
});

app.post('/api/sap-news', (req, res) => {
  try {
    const filePath = path.join(__dirname, 'data', 'sapNews.json');
    fs.writeFileSync(filePath, JSON.stringify(req.body, null, 2), 'utf8');
    const jsPath = path.join(__dirname, 'data', 'initialSapNews.js');
    fs.writeFileSync(jsPath, `// data/initialSapNews.js\nwindow.PORTAL_DATA_SAP_NEWS = ${JSON.stringify(req.body, null, 2)};\n`, 'utf8');
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/sap-knowledge', (req, res) => {
  const filePath = path.join(__dirname, 'data', 'sapKnowledge.json');
  if (fs.existsSync(filePath)) return res.sendFile(filePath);
  const fbPath = path.join(__dirname, 'data', 'initialSapKnowledge.js');
  if (fs.existsSync(fbPath)) {
    try {
      const code = fs.readFileSync(fbPath, 'utf8');
      const jsonText = code.replace(/^window\.PORTAL_DATA_SAP_KNOWLEDGE\s*=\s*/, '').replace(/;\s*$/, '');
      return res.type('json').send(jsonText);
    } catch (e) {}
  }
  res.json([]);
});

app.post('/api/sap-knowledge', (req, res) => {
  try {
    const filePath = path.join(__dirname, 'data', 'sapKnowledge.json');
    fs.writeFileSync(filePath, JSON.stringify(req.body, null, 2), 'utf8');
    const jsPath = path.join(__dirname, 'data', 'initialSapKnowledge.js');
    fs.writeFileSync(jsPath, `// data/initialSapKnowledge.js\nwindow.PORTAL_DATA_SAP_KNOWLEDGE = ${JSON.stringify(req.body, null, 2)};\n`, 'utf8');
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/sap-consulting', async (req, res) => {
  const { question, topic } = req.body || {};
  const geminiKey = getGeminiApiKey();
  if (!geminiKey) {
    return res.json({ 
      success: false, 
      message: 'GEMINI_API_KEY가 설정되지 않았습니다. .env 파일에 유효한 Google Gemini API 키를 입력해주세요.' 
    });
  }
  try {
    let knowledgeSnippet = '';
    const knowFilePath = path.join(__dirname, 'data', 'sapKnowledge.json');
    const newsFilePath = path.join(__dirname, 'data', 'sapNews.json');
    
    // 1. SAP 메뉴에 등록된 지식베이스(Knowledge Base)에서 연관 항목 검색
    if (fs.existsSync(knowFilePath)) {
      try {
        const list = JSON.parse(fs.readFileSync(knowFilePath, 'utf8'));
        if (Array.isArray(list)) {
          const qWords = (question || '').toLowerCase().split(/\s+/).filter(w => w.length > 1);
          // 연관도 점수 매기기
          const scored = list.map(item => {
            let score = 0;
            const targetText = `${item.title || ''} ${item.topic || ''} ${(item.tags || []).join(' ')} ${item.content || ''}`.toLowerCase();
            for (const word of qWords) {
              if (targetText.includes(word)) score += 2;
            }
            return { item, score };
          });
          scored.sort((a, b) => b.score - a.score);
          const topItems = scored.slice(0, 4).map(s => s.item);
          knowledgeSnippet = topItems.map(k => `[사내 등록 지식: ${k.topic} - ${k.title}]\n${k.content}`).join('\n\n');
        }
      } catch (e) {}
    }

    // 2. SAP 최신 뉴스/업데이트 요약 참조
    let newsSnippet = '';
    if (fs.existsSync(newsFilePath)) {
      try {
        const nList = JSON.parse(fs.readFileSync(newsFilePath, 'utf8'));
        if (Array.isArray(nList) && nList.length > 0) {
          newsSnippet = nList.slice(0, 2).map(n => `[SAP 뉴스/업데이트]: ${n.title} (${n.category || '공지'})`).join('\n');
        }
      } catch (e) {}
    }

    const systemPrompt = `당신은 세계 최고 수준의 SAP Integration Suite (Cloud Integration, API Management, Open Connectors) 수석 솔루션 아키텍트이자 Groovy 스크립트 전문가입니다.

[답변 생성 핵심 원칙]
1. 사용자의 질문에 정확히 맞추어 실무 적용 가능한 완벽한 iFlow 단계별 구성 가이드, 프로토콜 설정(Adapter, Content Modifier, Request-Reply, Exception Subprocess 등) 및 무결한 Groovy 코드를 작성하세요.
2. 아래에 제공된 [사내 SAP Integration Suite 등록 지식베이스]를 적극 반영하여, 최신 SAP BTP 표준과 모범 사례(Best Practices)에 입각하여 답변하세요.
3. 인사말이나 '고객님은 ... 전문가로서' 같은 불필요한 사족을 절대 출력하지 말고 곧바로 본론을 서술하세요.
4. [답변 포맷 구조 규칙 - 반드시 준수]:
   - 먼저 상단에 간결하고 명확한 요약 섹션을 작성하세요:
     ### 📋 핵심 요약 및 추천 iFlow 구성
     (3~5줄 분량의 개요 및 필수 iFlow 스텝 목록)
   - 요약이 끝나면 반드시 아래 구분자 한 줄을 단독으로 출력하세요:
     ---DETAILS---
   - 구분자 아래에는 상세 설정과 코드를 빠짐없이 완벽하게 작성하세요:
     ### 🔍 상세 구현 가이드 & Groovy 코드
     (각 스텝별 세부 설정 파라미터, Adapter 프로토콜 설정, Request-Reply, 무결한 Groovy 스크립트 전문, Exception Subprocess, End Event 및 테스트 검증 절차)
5. Groovy 스크립트 작성 시 processData(Message message) 시그니처와 com.sap.gateway.ip.core.customdev.util.Message 임포트를 정확히 준수하세요.
6. 마지막 End Event 및 테스트/검증 요령까지 생략 없이 100% 완전하게 문장을 끝맺으세요.`;

    const userContentText = `${knowledgeSnippet ? `[사내 SAP Integration Suite 등록 지식베이스]\n${knowledgeSnippet}\n\n` : ''}${newsSnippet ? `[사내 등록 최신 SAP 뉴스/업데이트]\n${newsSnippet}\n\n` : ''}[사용자 질문]: ${question}`;

    const isSearchQuery = /최신|뉴스|공지|업데이트|릴리즈|검색|동향|사이트|url|링크/i.test(question || '');
    const modelList = ['gemini-2.5-flash-lite', 'gemini-2.5-flash'];

    const callGemini = async (withSearch) => {
      const payload = {
        system_instruction: {
          parts: [{ text: systemPrompt }]
        },
        contents: [
          {
            role: 'user',
            parts: [{ text: userContentText }]
          }
        ],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 8192
        }
      };
      if (withSearch) {
        payload.tools = [{ google_search: {} }];
      }

      for (const mName of modelList) {
        try {
          const gUrl = `https://generativelanguage.googleapis.com/v1beta/models/${mName}:generateContent?key=${geminiKey}`;
          const r = await fetch(gUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          const d = await r.json();
          if (d.candidates?.[0]?.content?.parts?.[0]?.text) {
            return d;
          }
        } catch (err) {}
      }
      return null;
    };

    let d = null;
    if (isSearchQuery) {
      d = await callGemini(true);
      if (!d || ((d.candidates?.[0]?.content?.parts?.[0]?.text?.length || 0) < 1500 && /:\s*$/.test(d.candidates?.[0]?.content?.parts?.[0]?.text || ''))) {
        const retryD = await callGemini(false);
        if (retryD) d = retryD;
      }
    } else {
      d = await callGemini(false);
    }

    if (!d || !d.candidates?.[0]?.content?.parts?.[0]?.text) {
      return res.json({ success: false, message: 'Gemini 모델로부터 유효한 답변을 받지 못했습니다. 잠시 후 다시 시도해주세요.' });
    }

    let answer = d.candidates[0].content.parts[0].text;

    // Google Search Grounding 메타데이터 출처가 있는 경우 마크다운 출처 링크 추가
    const groundingChunks = d.candidates[0]?.groundingMetadata?.groundingChunks;
    if (Array.isArray(groundingChunks) && groundingChunks.length > 0) {
      const uniqueUris = [];
      for (const chunk of groundingChunks) {
        if (chunk.web && chunk.web.uri && !uniqueUris.some(u => u.uri === chunk.web.uri)) {
          uniqueUris.push({ uri: chunk.web.uri, title: chunk.web.title || 'SAP 공식 문서/참조' });
        }
      }
      if (uniqueUris.length > 0) {
        answer += '\n\n---\n#### 🌐 실시간 인터넷 검색 및 공식 SAP 참조 자료\n';
        uniqueUris.slice(0, 5).forEach((u, i) => {
          answer += `${i + 1}. [${u.title}](${u.uri})\n`;
        });
      }
    }

    res.json({ success: true, answer, timestamp: new Date().toISOString() });
  } catch (e) {
    res.json({ success: false, message: `서버 처리 오류: ${e.message}` });
  }
});

// REST API Endpoints for Threads AI Agent Proxy & 60-Day Token Expiration Alert

const threadsTokenConfigFile = path.join(__dirname, 'data', 'threadsTokenConfig.json');

app.get('/api/threads-agent/token-config', (req, res) => {
  if (fs.existsSync(threadsTokenConfigFile)) {
    return res.sendFile(threadsTokenConfigFile);
  }
  res.json({
    agentBaseUrl: "http://localhost:8000",
    tokenIssuedDate: "2026-08-31",
    validDays: 60,
    recipientEmail: "admin@example.com",
    smtpHost: "smtp.gmail.com",
    smtpPort: 587,
    smtpUser: "",
    smtpPass: "",
    enableEmailAlert: true,
    alertThresholdDays: [7, 3, 1],
    lastAlertSentDate: ""
  });
});

app.post('/api/threads-agent/token-config', (req, res) => {
  try {
    const dataDir = path.join(__dirname, 'data');
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    fs.writeFileSync(threadsTokenConfigFile, JSON.stringify(req.body, null, 2), 'utf8');
    res.json({ success: true, message: '설정이 저장되었습니다.' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/threads-agent/test-email', async (req, res) => {
  let cfg = { recipientEmail: 'admin@example.com' };
  if (fs.existsSync(threadsTokenConfigFile)) {
    try { cfg = JSON.parse(fs.readFileSync(threadsTokenConfigFile, 'utf8')); } catch(e){}
  }
  res.json({
    success: true,
    message: `테스트 이메일 발송 요청이 등록되었습니다: (${cfg.recipientEmail || 'admin@example.com'})`
  });
});

app.all('/api/threads-agent/*', async (req, res) => {
  let subPath = req.params[0] || '';
  if (!subPath.startsWith('/')) subPath = '/' + subPath;
  if (['/status', '/start', '/stop', '/trigger'].includes(subPath)) {
    subPath = '/api/agent' + subPath;
  } else if (!subPath.startsWith('/api/')) {
    subPath = '/api' + subPath;
  }
  let baseUrl = process.env.THREADS_AGENT_BASE_URL || 'http://127.0.0.1:8000';
  if (fs.existsSync(threadsTokenConfigFile)) {
    try {
      const cfg = JSON.parse(fs.readFileSync(threadsTokenConfigFile, 'utf8'));
      if (cfg.agentBaseUrl) baseUrl = cfg.agentBaseUrl.replace(/\/$/, '');
    } catch(e){}
  }
  if (baseUrl.includes('localhost')) {
    baseUrl = baseUrl.replace('localhost', '127.0.0.1');
  }
  const targetUrl = `${baseUrl}${subPath}`;
  try {
    const controller = new AbortController();
    const timeoutMs = subPath.includes('/trigger') ? 120000 : 15000;
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    const fetchOptions = {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) PortalBangProxy/1.0'
      },
      signal: controller.signal
    };
    if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
      if (req.body && Object.keys(req.body).length > 0) {
        fetchOptions.body = JSON.stringify(req.body);
      } else {
        fetchOptions.body = '{}';
      }
    }
    const agentRes = await fetch(targetUrl, fetchOptions);
    clearTimeout(timeoutId);
    const textData = await agentRes.text();
    let data;
    try {
      data = JSON.parse(textData);
    } catch(parseErr) {
      data = { success: agentRes.ok, message: textData || 'Invalid response from agent' };
    }
    res.status(agentRes.status).json(data);
  } catch(e) {
    const isTimeout = e.name === 'AbortError' || (e.message && e.message.includes('aborted'));
    const errMessage = isTimeout 
      ? `Threads AI 에이전트 작업 시간 초과 (${subPath.includes('trigger') ? '수집·발행 120초' : '15초'} 타임아웃). 백그라운드 작업은 진행 중일 수 있습니다.`
      : `Threads AI 에이전트 서버(${baseUrl})에 연결할 수 없습니다.`;
    res.json({
      is_running: false,
      is_offline: true,
      success: false,
      message: errMessage,
      error: e.message,
      dynamic_schedule: { market_name: "에이전트 오프라인" },
      statistics: { total_articles_crawled: 0, total_posts_generated: 0 },
      sources_health: []
    });
  }
});

// SAP Integration Suite Agent Endpoints
const sapAgentConfigFile = path.join(dataDir, 'sapAgentConfig.json');

app.get('/api/sap-agent/status', (req, res) => {
  const { exec } = require('child_process');
  let newsCount = 0;
  const sapNewsFile = path.join(dataDir, 'sapNews.json');
  if (fs.existsSync(sapNewsFile)) {
    try {
      const arr = JSON.parse(fs.readFileSync(sapNewsFile, 'utf8'));
      if (Array.isArray(arr)) newsCount = arr.length;
    } catch(e) {}
  }
  let baseUrl = 'http://127.0.0.1:8080';
  let intervalMinutes = 720;
  if (fs.existsSync(sapAgentConfigFile)) {
    try {
      const cfg = JSON.parse(fs.readFileSync(sapAgentConfigFile, 'utf8'));
      if (cfg.agentBaseUrl) baseUrl = cfg.agentBaseUrl;
      if (cfg.intervalMinutes) intervalMinutes = parseInt(cfg.intervalMinutes, 10);
    } catch(e) {}
  }

  exec('schtasks /query /tn "SAPIntegrationSuiteAgent" /fo CSV', (err, stdout) => {
    let taskState = 'Unknown';
    let nextRun = '확인 불가';
    let isRunning = false;
    if (!err && stdout) {
      const lines = stdout.trim().split('\n');
      if (lines.length > 1) {
        const parts = lines[1].split('","').map(s => s.replace(/(^"|"$)/g, ''));
        if (parts.length > 2) {
          taskState = parts[2] || 'Ready';
          nextRun = parts[1] || '확인 불가';
          if (taskState.toLowerCase() === 'running') isRunning = true;
        }
      }
    }
    res.json({
      is_running: isRunning,
      task_state: taskState,
      last_run_time: '기록됨',
      next_run_time: nextRun,
      total_news_count: newsCount,
      agent_base_url: baseUrl,
      interval_minutes: intervalMinutes,
      agent_dir: 'C:\\Users\\bangt\\Downloads\\madang6\\sap-integration-agent'
    });
  });
});

app.post('/api/sap-agent/start', (req, res) => {
  const { exec } = require('child_process');
  exec('schtasks /run /tn "SAPIntegrationSuiteAgent"', (err) => {
    if (err) {
      res.json({ success: false, message: `실행 실패: ${err.message}` });
    } else {
      res.json({ success: true, message: 'SAP Integration Suite 에이전트 작업을 시작했습니다.' });
    }
  });
});

app.post('/api/sap-agent/stop', (req, res) => {
  const { exec } = require('child_process');
  exec('schtasks /end /tn "SAPIntegrationSuiteAgent"', () => {
    exec('taskkill /f /fi "IMAGENAME eq powershell.exe" /fi "WINDOWTITLE eq *sap_collector*"', () => {
      res.json({ success: true, message: 'SAP Integration Suite 에이전트 작업을 중지했습니다.' });
    });
  });
});

app.post('/api/sap-agent/trigger', (req, res) => {
  const { exec } = require('child_process');
  const agentScript = 'C:\\Users\\bangt\\Downloads\\madang6\\sap-integration-agent\\sap_collector.ps1';
  exec(`powershell -ExecutionPolicy Bypass -File "${agentScript}" -Once`, { timeout: 20000 }, (err) => {
    let newsCount = 0;
    const sapNewsFile = path.join(dataDir, 'sapNews.json');
    if (fs.existsSync(sapNewsFile)) {
      try {
        const arr = JSON.parse(fs.readFileSync(sapNewsFile, 'utf8'));
        if (Array.isArray(arr)) newsCount = arr.length;
      } catch(e) {}
    }
    if (err) {
      res.json({ success: false, message: `수집 실패: ${err.message}` });
    } else {
      res.json({ success: true, message: 'SAP 최신 소식 즉시 수집을 완료했습니다.', newsCount });
    }
  });
});

app.get('/api/sap-agent/config', (req, res) => {
  if (fs.existsSync(sapAgentConfigFile)) {
    try {
      res.json(JSON.parse(fs.readFileSync(sapAgentConfigFile, 'utf8')));
      return;
    } catch(e) {}
  }
  res.json({ agentBaseUrl: 'http://127.0.0.1:8080', intervalMinutes: 720, taskName: 'SAPIntegrationSuiteAgent' });
});

app.post('/api/sap-agent/config', (req, res) => {
  try {
    fs.writeFileSync(sapAgentConfigFile, JSON.stringify(req.body || {}, null, 2), 'utf8');
    res.json({ success: true, message: 'SAP 에이전트 설정이 저장되었습니다.' });
  } catch(e) {
    res.json({ success: false, message: e.message });
  }
});

// Ping Endpoint
app.post('/api/agent/ping', async (req, res) => {
  const targetUrl = (req.body && req.body.url ? req.body.url : '').replace('localhost', '127.0.0.1');
  if (!targetUrl) return res.json({ success: false, message: '유효한 URL이 지정되지 않았습니다.' });
  const start = Date.now();
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 3000);
    const r = await fetch(targetUrl, { signal: controller.signal });
    clearTimeout(id);
    const latencyMs = Date.now() - start;
    res.json({
      success: true,
      statusCode: r.status,
      latencyMs,
      url: targetUrl,
      message: `연결 성공 (${latencyMs}ms, HTTP ${r.status})`
    });
  } catch(err) {
    const latencyMs = Date.now() - start;
    res.json({
      success: false,
      latencyMs,
      url: targetUrl,
      error: err.message,
      message: '연결 실패: 에이전트 서버가 응답하지 않습니다.'
    });
  }
});

// =========================================================
// madang6 시스템 에이전트 프로세스 라이프사이클 관리 API
// =========================================================
const MADANG6_BASE = process.env.MADANG6_BASE || 'C:\\Users\\bangt\\Downloads\\madang6';
const PYTHON_PATH = path.join(MADANG6_BASE, 'newsfilter_threads_agent', '.venv', 'Scripts', 'python.exe');

const SYSTEM_AGENTS = [
  {
    id: 'threads',
    name: 'Threads AI 뉴스 에이전트',
    category: 'threads',
    icon: '🤖',
    cwd: path.join(MADANG6_BASE, 'newsfilter_threads_agent'),
    script: 'main.py',
    args: [],
    matchPattern: /newsfilter_threads_agent[\\\/]+main\.py|newsfilter_threads_agent.*main/i,
    description: '공시 및 실시간 증시 뉴스 수집 / Threads 자동 포스팅 데몬'
  },
  {
    id: 'sap',
    name: 'SAP Integration Suite 에이전트',
    category: 'sap',
    icon: '⚡',
    cwd: path.join(MADANG6_BASE, 'sap-integration-agent'),
    script: 'main.py',
    args: [],
    matchPattern: /sap-integration-agent[\\\/]+main\.py|sap-integration-agent.*main/i,
    description: 'SCN 및 SAP 커뮤니티 뉴스 수집 & 포털 동기화 데몬'
  },
  {
    id: 'supervisor',
    name: 'AI 통합 감독관 (Supervisor)',
    category: 'core',
    icon: '🛡️',
    cwd: path.join(MADANG6_BASE, 'agent_supervisor'),
    script: 'main.py',
    args: [],
    matchPattern: /agent_supervisor[\\\/]+main\.py|agent_supervisor.*main/i,
    description: '전체 에이전트 리소스 감시, 크래시 자동 복구 및 텔레그램 알림'
  },
  {
    id: 'lead_orchestrator',
    name: '메인 주식 총괄 에이전트 (Lead Orchestrator)',
    category: 'stock_lead',
    icon: '🎯',
    cwd: path.join(MADANG6_BASE, '메인주식총괄에이전트'),
    script: 'main.py',
    args: ['--interval', '60'],
    matchPattern: /메인주식총괄에이전트[\\\/]+main\.py/i,
    description: '5대 서브에이전트 조율, 1차 원천 팩트체크 및 최종 의결'
  },
  {
    id: 'sub_danka',
    name: '단가 (총괄심의)',
    category: 'sub_council',
    icon: '⚖️',
    cwd: path.join(MADANG6_BASE, '서브주식에이전트_단가'),
    script: 'main.py',
    args: ['--stock', '005930'],
    matchPattern: /서브주식에이전트_단가[\\\/]+main\.py/i,
    description: 'daankal.com 화수분 투자철학 기반 5인 심의 및 보물찾기'
  },
  {
    id: 'sub_growth',
    name: '성장론자',
    category: 'sub_council',
    icon: '🚀',
    cwd: path.join(MADANG6_BASE, '서브주식에이전트_성장론자'),
    script: 'main.py',
    args: ['--interval', '60'],
    matchPattern: /서브주식에이전트_성장론자[\\\/]+main\.py/i,
    description: '파괴적 혁신 및 전방 산업 고성장 테크주 발굴'
  },
  {
    id: 'sub_cautious',
    name: '신중론자',
    category: 'sub_council',
    icon: '🛡️',
    cwd: path.join(MADANG6_BASE, '서브주식에이전트_신중론자'),
    script: 'main.py',
    args: ['--interval', '60'],
    matchPattern: /서브주식에이전트_신중론자[\\\/]+main\.py/i,
    description: '단가식 안전마진 및 저평가 화수분 배당주 감사'
  },
  {
    id: 'sub_technical',
    name: '기술적분석가',
    category: 'sub_council',
    icon: '📊',
    cwd: path.join(MADANG6_BASE, '서브주식에이전트_기술적분석가'),
    script: 'main.py',
    args: ['--interval', '60'],
    matchPattern: /서브주식에이전트_기술적분석가[\\\/]+main\.py/i,
    description: '외인/기관 스마트머니 수급 집중 및 거래량 급증 추적'
  },
  {
    id: 'sub_jurini',
    name: '주린이 코칭',
    category: 'sub_council',
    icon: '🐣',
    cwd: path.join(MADANG6_BASE, '서브주식에이전트_주린이'),
    script: 'main.py',
    args: ['--interval', '60'],
    matchPattern: /서브주식에이전트_주린이[\\\/]+main\.py/i,
    description: '초보 투자자 눈높이의 쉬운 해설 및 안심 가이드'
  }
];

// OS 상의 python 프로세스 목록 조회 헬퍼
function getRunningPythonProcesses() {
  return new Promise((resolve) => {
    const { exec } = require('child_process');
    const psCmd = 'powershell -NoProfile -Command "[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; Get-CimInstance Win32_Process -Filter \\"Name = \'python.exe\'\\" | Select-Object ProcessId, CommandLine | ConvertTo-Json"';
    exec(psCmd, { maxBuffer: 10 * 1024 * 1024 }, (err, stdout) => {
      if (err || !stdout || !stdout.trim()) return resolve([]);
      try {
        const parsed = JSON.parse(stdout);
        const list = Array.isArray(parsed) ? parsed : [parsed];
        resolve(list.filter(p => p && p.ProcessId));
      } catch (e) {
        resolve([]);
      }
    });
  });
}

// 전체 에이전트 실시간 상태 조회 API
app.get('/api/system/agents', async (req, res) => {
  try {
    const procs = await getRunningPythonProcesses();
    const result = SYSTEM_AGENTS.map(agent => {
      // Find matching process
      const match = procs.find(p => {
        const cmd = p.CommandLine || '';
        if (agent.matchPattern.test(cmd)) return true;
        if (agent.cwd && cmd.includes(agent.cwd)) return true;
        return false;
      });

      return {
        id: agent.id,
        name: agent.name,
        category: agent.category,
        icon: agent.icon,
        description: agent.description,
        is_running: !!match,
        pid: match ? match.ProcessId : null,
        command: match ? match.CommandLine : null
      };
    });

    res.json({
      success: true,
      agents: result,
      totalCount: result.length,
      runningCount: result.filter(a => a.is_running).length
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 단일 에이전트 시작 API
app.post('/api/system/agents/:id/start', async (req, res) => {
  const agentId = req.params.id;
  const agent = SYSTEM_AGENTS.find(a => a.id === agentId);
  if (!agent) {
    return res.status(404).json({ success: false, message: `존재하지 않는 에이전트: ${agentId}` });
  }

  const procs = await getRunningPythonProcesses();
  const existing = procs.find(p => agent.matchPattern.test(p.CommandLine || ''));
  if (existing) {
    return res.json({ success: true, message: `이미 가동 중입니다. (PID: ${existing.ProcessId})`, pid: existing.ProcessId });
  }

  const { exec } = require('child_process');
  const pyExe = fs.existsSync(PYTHON_PATH) ? PYTHON_PATH : 'python';
  const argsStr = agent.args.length > 0 ? ` ${agent.args.join(' ')}` : '';
  const fullArgs = `${agent.script}${argsStr}`;
  const startCmd = `powershell -NoProfile -Command "Start-Process -FilePath '${pyExe}' -ArgumentList '${fullArgs}' -WorkingDirectory '${agent.cwd}' -WindowStyle Hidden"`;

  exec(startCmd, async (err) => {
    if (err) {
      return res.status(500).json({ success: false, message: `기동 실패: ${err.message}` });
    }
    // 잠시 대기 후 PID 재조회
    setTimeout(async () => {
      const refreshed = await getRunningPythonProcesses();
      const match = refreshed.find(p => agent.matchPattern.test(p.CommandLine || ''));
      res.json({
        success: true,
        message: `[${agent.name}] 기동 완료 (PID: ${match ? match.ProcessId : '확인 중'})`,
        pid: match ? match.ProcessId : null
      });
    }, 1500);
  });
});

// 단일 에이전트 중지 API
app.post('/api/system/agents/:id/stop', async (req, res) => {
  const agentId = req.params.id;
  const agent = SYSTEM_AGENTS.find(a => a.id === agentId);
  if (!agent) {
    return res.status(404).json({ success: false, message: `존재하지 않는 에이전트: ${agentId}` });
  }

  const procs = await getRunningPythonProcesses();
  const match = procs.find(p => agent.matchPattern.test(p.CommandLine || ''));
  if (!match) {
    return res.json({ success: true, message: `이미 정지된 상태입니다.` });
  }

  const { exec } = require('child_process');
  exec(`taskkill /PID ${match.ProcessId} /F`, (err) => {
    if (err) {
      return res.status(500).json({ success: false, message: `프로세스 중지 실패: ${err.message}` });
    }
    res.json({ success: true, message: `[${agent.name}] 정지 완료 (PID: ${match.ProcessId})` });
  });
});

// 5대 주식 서브에이전트 일괄 제어 API
app.post('/api/system/agents/sub_council_all/start', async (req, res) => {
  const subAgents = SYSTEM_AGENTS.filter(a => a.category === 'sub_council');
  const procs = await getRunningPythonProcesses();
  const { exec } = require('child_process');
  const pyExe = fs.existsSync(PYTHON_PATH) ? PYTHON_PATH : 'python';

  let startedCount = 0;
  for (const agent of subAgents) {
    const existing = procs.find(p => agent.matchPattern.test(p.CommandLine || ''));
    if (!existing) {
      const argsStr = agent.args.length > 0 ? ` ${agent.args.join(' ')}` : '';
      const fullArgs = `${agent.script}${argsStr}`;
      const startCmd = `powershell -NoProfile -Command "Start-Process -FilePath '${pyExe}' -ArgumentList '${fullArgs}' -WorkingDirectory '${agent.cwd}' -WindowStyle Hidden"`;
      exec(startCmd);
      startedCount++;
    }
  }

  res.json({
    success: true,
    message: `5대 주식 서브에이전트 일괄 기동 완료 (${startedCount}개 신규 기동)`
  });
});

app.post('/api/system/agents/sub_council_all/stop', async (req, res) => {
  const subAgents = SYSTEM_AGENTS.filter(a => a.category === 'sub_council');
  const procs = await getRunningPythonProcesses();
  const { exec } = require('child_process');

  let stoppedCount = 0;
  for (const agent of subAgents) {
    const match = procs.find(p => agent.matchPattern.test(p.CommandLine || ''));
    if (match) {
      exec(`taskkill /PID ${match.ProcessId} /F`);
      stoppedCount++;
    }
  }

  res.json({
    success: true,
    message: `5대 주식 서브에이전트 일괄 정지 완료 (${stoppedCount}개 프로세스 종료)`
  });
});

// Health check endpoint for GCP Cloud Engine/Run
app.get('/_health', (req, res) => {
  res.status(200).send('OK');
});

// 텔레그램 알림 테스트 엔드포인트
app.post('/api/telegram/test-alert', async (req, res) => {
  const testIp = (req.body && req.body.ip) || '203.0.113.88';
  const sent = await telegramBot.sendNewIpAlert(testIp, '/test', '테스트 유입 시뮬레이션');
  res.json({ success: sent, message: sent ? `텔레그램 알림 발송 완료: ${testIp}` : '알림 발송 실패 (설정 또는 쿨다운 확인)' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 PORTAL BANG Server running on 0.0.0.0:${PORT}`);
  telegramBot.startPolling(3000);
});

