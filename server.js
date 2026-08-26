const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 8080;

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
app.get('/api/workflows', (req, res) => {
  const filePath = path.join(__dirname, 'data', 'workflows.json');
  if (fs.existsSync(filePath)) {
    return res.sendFile(filePath);
  }
  res.json([]);
});

app.post('/api/workflows', (req, res) => {
  const filePath = path.join(__dirname, 'data', 'workflows.json');
  try {
    const data = req.body;
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    res.json({ success: true });
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

// Health check endpoint for GCP Cloud Engine/Run
app.get('/_health', (req, res) => {
  res.status(200).send('OK');
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 PORTAL BANG Server running on 0.0.0.0:${PORT}`);
});
