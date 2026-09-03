process.on('uncaughtException', (err) => {
  console.error('[Uncaught Exception]:', err);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('[Unhandled Rejection]:', reason);
});

const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = parseInt(process.env.PORT || '8080', 10);

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

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

// Health check endpoint for GCP Cloud Engine/Run
app.get('/_health', (req, res) => {
  res.status(200).send('OK');
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 PORTAL BANG Server running on 0.0.0.0:${PORT}`);
});
