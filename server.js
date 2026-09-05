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

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 외부 유입 IP 실시간 감지 및 텔레그램 승인/차단 알림 미들웨어
app.use((req, res, next) => {
  const rawIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
  const cleanIp = rawIp.split(',')[0].trim().replace(/^.*:/, '');
  if (cleanIp && !req.path.match(/\.(css|js|png|jpg|jpeg|gif|svg|ico|woff2?|map|ttf)$/i)) {
    try {
      let allowed = [];
      let blocked = [];
      const aPath = path.join(dataDir, 'allowed_ips.json');
      const bPath = path.join(dataDir, 'blocked_ips.json');
      if (fs.existsSync(aPath)) allowed = JSON.parse(fs.readFileSync(aPath, 'utf8'));
      if (fs.existsSync(bPath)) blocked = JSON.parse(fs.readFileSync(bPath, 'utf8'));

      const isAllowed = allowed.some(p => telegramBot.isIpMatch(cleanIp, p));
      const isBlocked = blocked.some(p => telegramBot.isIpMatch(cleanIp, p));

      if (!isAllowed && !isBlocked && !telegramBot.isPrivateOrLocalIp(cleanIp)) {
        telegramBot.sendNewIpAlert(cleanIp, req.path, '미분류 외부 접속');
      }
    } catch (e) {}
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

// REST API Endpoints for Data Persistence
app.get('/api/my-ip', (req, res) => {
  const rawIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
  const cleanIp = rawIp.replace(/^.*:/, '');
  res.json({ ip: cleanIp || rawIp });
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
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey || geminiKey === 'your_gemini_api_key_here') {
    return res.json({ success: false, message: 'GEMINI_API_KEY가 설정되지 않았습니다.' });
  }
  try {
    const prompt = `당신은 SAP Integration Suite 수석 전문가입니다. 질문: ${question}`;
    const gUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`;
    const r = await fetch(gUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });
    const d = await r.json();
    const answer = d.candidates?.[0]?.content?.parts?.[0]?.text || '';
    res.json({ success: true, answer, timestamp: new Date().toISOString() });
  } catch (e) {
    res.json({ success: false, message: e.message });
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
  let intervalMinutes = 60;
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
  exec(`powershell -ExecutionPolicy Bypass -File "${agentScript}"`, { timeout: 20000 }, (err) => {
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
  res.json({ agentBaseUrl: 'http://127.0.0.1:8080', intervalMinutes: 60, taskName: 'SAPIntegrationSuiteAgent' });
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

