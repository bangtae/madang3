// app/utils/telegramBotHelper.js - 텔레그램 봇 연동 및 외부 IP 승인/차단 인라인 제어 헬퍼
const fs = require('fs');
const path = require('path');

class TelegramBotHelper {
  constructor() {
    this.config = {
      botToken: '',
      allowedChatIds: '',
      enabled: false
    };
    this.alertCooldown = new Map(); // ip -> timestamp (1시간 쿨다운)
    this.lastUpdateId = 0;
    this.isPolling = false;
    this.pollTimer = null;
    this.loadConfig();
  }

  loadConfig() {
    // 1. madang6 agent_supervisor .env 확인 (로컬 개발 환경 우선 동기화)
    const localEnvPath = 'C:\\Users\\bangt\\Downloads\\madang6\\agent_supervisor\\.env';
    if (fs.existsSync(localEnvPath)) {
      try {
        const envContent = fs.readFileSync(localEnvPath, 'utf8');
        envContent.split('\n').forEach(line => {
          const trimmed = line.trim();
          if (trimmed.startsWith('TELEGRAM_BOT_TOKEN=')) {
            this.config.botToken = trimmed.replace('TELEGRAM_BOT_TOKEN=', '').trim().replace(/^["']|["']$/g, '');
          } else if (trimmed.startsWith('TELEGRAM_ALLOWED_CHAT_IDS=')) {
            this.config.allowedChatIds = trimmed.replace('TELEGRAM_ALLOWED_CHAT_IDS=', '').trim().replace(/^["']|["']$/g, '');
          }
        });
      } catch (e) {
        console.warn('[TelegramBot] Failed to read local .env:', e.message);
      }
    }

    // 2. data/telegramConfig.json 확인
    const cfgPath = path.join(__dirname, '..', '..', 'data', 'telegramConfig.json');
    if (fs.existsSync(cfgPath)) {
      try {
        const fileCfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
        if (!this.config.botToken && fileCfg.botToken) this.config.botToken = fileCfg.botToken;
        if (!this.config.allowedChatIds && fileCfg.allowedChatIds) this.config.allowedChatIds = fileCfg.allowedChatIds;
      } catch (e) {}
    }

    // 3. 환경 변수 확인 (GCP Cloud Run)
    if (!this.config.botToken && process.env.TELEGRAM_BOT_TOKEN) {
      this.config.botToken = process.env.TELEGRAM_BOT_TOKEN;
    }
    if (!this.config.allowedChatIds && process.env.TELEGRAM_ALLOWED_CHAT_IDS) {
      this.config.allowedChatIds = process.env.TELEGRAM_ALLOWED_CHAT_IDS;
    }

    this.config.enabled = Boolean(this.config.botToken && this.config.allowedChatIds);

    // 설정 파일 영구 보존
    try {
      const dataDir = path.join(__dirname, '..', '..', 'data');
      if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
      fs.writeFileSync(cfgPath, JSON.stringify(this.config, null, 2), 'utf8');
    } catch (e) {}
  }

  isPrivateOrLocalIp(ip) {
    if (!ip) return true;
    const clean = ip.replace(/^.*:/, '').trim();
    if (['127.0.0.1', 'localhost', '::1', ''].includes(clean)) return true;
    if (clean.startsWith('192.168.') || clean.startsWith('10.') || clean.startsWith('169.254.')) return true;
    if (/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(clean)) return true;
    return false;
  }

  isIpMatch(ip, pattern) {
    if (!ip || !pattern) return false;
    const p = pattern.trim();
    if (p === '*' || p === ip) return true;
    if (p.endsWith('*')) {
      const prefix = p.slice(0, -1);
      return ip.startsWith(prefix);
    }
    return false;
  }

  normalizeIpList(data) {
    const list = [];
    const extract = (item) => {
      if (!item) return;
      if (typeof item === 'string') {
        const trimmed = item.trim();
        if (trimmed && !trimmed.startsWith('@{') && !trimmed.includes('System.Object')) {
          list.push(trimmed);
        }
      } else if (Array.isArray(item)) {
        item.forEach(extract);
      } else if (typeof item === 'object') {
        if (item.value) extract(item.value);
      }
    };
    extract(data);
    return [...new Set(list)];
  }

  readIpList(filePath) {
    if (!fs.existsSync(filePath)) return [];
    try {
      const raw = fs.readFileSync(filePath, 'utf8');
      if (!raw || !raw.trim()) return [];
      const parsed = JSON.parse(raw);
      return this.normalizeIpList(parsed);
    } catch (e) {
      return [];
    }
  }

  getKstTimeString() {
    return new Intl.DateTimeFormat('sv-SE', {
      timeZone: 'Asia/Seoul',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(new Date());
  }

  async sendNewIpAlert(clientIp, requestPath = '/', currentStatus = '미분류') {
    if (!this.config.enabled || !this.config.botToken) return false;
    if (this.isPrivateOrLocalIp(clientIp)) return false;

    // 1시간 중복 알림 쿨다운 체크
    const now = Date.now();
    const lastAlert = this.alertCooldown.get(clientIp);
    if (lastAlert && (now - lastAlert) < 3600000) {
      return false;
    }
    this.alertCooldown.set(clientIp, now);

    const dataDir = path.join(__dirname, '..', '..', 'data');
    const allowedPath = path.join(dataDir, 'allowed_ips.json');
    const blockedPath = path.join(dataDir, 'blocked_ips.json');

    const allowed = this.readIpList(allowedPath);
    const blocked = this.readIpList(blockedPath);

    const isAllowed = allowed.some(p => this.isIpMatch(clientIp, p));
    const isBlocked = blocked.some(p => this.isIpMatch(clientIp, p));

    const buttons = [];
    let stateDesc = currentStatus;

    if (isAllowed) {
      stateDesc = '🟢 화이트리스트 등록됨 (접속 허용 중)';
      // 이미 화이트리스트에 등록된 IP -> 블랙리스트 차단 버튼만
      buttons.push({ text: "⛔ 블랙리스트로 차단", callback_data: `block:${clientIp}` });
    } else if (isBlocked) {
      stateDesc = '🔴 블랙리스트 등록됨 (접속 차단 중)';
      // 이미 블랙리스트에 등록된 IP -> 화이트리스트 허용 버튼만
      buttons.push({ text: "✅ 화이트리스트로 허용", callback_data: `allow:${clientIp}` });
    } else {
      stateDesc = currentStatus || '⚪ 미분류 (신규 외부 유입)';
      // 미분류 IP -> 허용 및 차단 버튼 둘 다 제공
      buttons.push({ text: "✅ 화이트리스트 허용", callback_data: `allow:${clientIp}` });
      buttons.push({ text: "⛔ 블랙리스트 차단", callback_data: `block:${clientIp}` });
    }

    const timeStr = this.getKstTimeString();
    const messageText = 
`🌐 <b>[외부 IP 유입 모니터링 알림]</b>

• <b>접속 IP:</b> <code>${clientIp}</code>
• <b>접속 일시:</b> ${timeStr} (KST)
• <b>요청 경로:</b> <code>${requestPath}</code>
• <b>현재 상태:</b> ${stateDesc}

아래 버튼을 눌러 권한을 변경할 수 있습니다:`;

    const inlineKeyboard = {
      inline_keyboard: [ buttons ]
    };

    const chatIds = this.config.allowedChatIds.split(',').map(s => s.trim()).filter(Boolean);
    for (const chatId of chatIds) {
      try {
        const url = `https://api.telegram.org/bot${this.config.botToken}/sendMessage`;
        await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: messageText,
            parse_mode: 'HTML',
            reply_markup: inlineKeyboard
          })
        });
      } catch (err) {
        console.error('[TelegramBot] sendMessage error:', err.message);
      }
    }
    return true;
  }

  async handleCallbackQuery(cq) {
    if (!cq || !cq.data) return;
    const [action, targetIp] = cq.data.split(':');
    if (!action || !targetIp) return;

    const dataDir = path.join(__dirname, '..', '..', 'data');
    const allowedPath = path.join(dataDir, 'allowed_ips.json');
    const blockedPath = path.join(dataDir, 'blocked_ips.json');

    let allowed = [];
    let blocked = [];

    try {
      if (fs.existsSync(allowedPath)) allowed = JSON.parse(fs.readFileSync(allowedPath, 'utf8'));
      if (fs.existsSync(blockedPath)) blocked = JSON.parse(fs.readFileSync(blockedPath, 'utf8'));
    } catch (e) {}

    let resultMsg = '';
    let toastText = '';

    if (action === 'allow') {
      if (!allowed.includes(targetIp)) allowed.push(targetIp);
      blocked = blocked.filter(ip => ip !== targetIp);
      resultMsg = '✅ 화이트리스트 허용 완료';
      toastText = `${targetIp} IP가 화이트리스트에 허용되었습니다.`;
    } else if (action === 'block') {
      if (!blocked.includes(targetIp)) blocked.push(targetIp);
      allowed = allowed.filter(ip => ip !== targetIp);
      resultMsg = '⛔ 블랙리스트 차단 완료';
      toastText = `${targetIp} IP가 블랙리스트에 차단되었습니다.`;
    }

    try {
      fs.writeFileSync(allowedPath, JSON.stringify(allowed, null, 2), 'utf8');
      fs.writeFileSync(blockedPath, JSON.stringify(blocked, null, 2), 'utf8');
    } catch (e) {
      console.error('[TelegramBot] Failed to write IP files:', e.message);
    }

    const fromUser = cq.from?.username ? `@${cq.from.username}` : (cq.from?.first_name || '관리자');
    const timeStr = this.getKstTimeString();

    // 텔레그램 메시지 인라인 업데이트 (버튼 제거 및 결과 표기)
    const updatedText = 
`🌐 <b>[외부 IP 유입 처리 완료]</b>

• <b>대상 IP:</b> <code>${targetIp}</code>
• <b>처리 결과:</b> <b>${resultMsg}</b>
• <b>처리 일시:</b> ${timeStr} (KST)
• <b>처리 관리자:</b> ${fromUser}`;

    try {
      const editUrl = `https://api.telegram.org/bot${this.config.botToken}/editMessageText`;
      await fetch(editUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: cq.message.chat.id,
          message_id: cq.message.message_id,
          text: updatedText,
          parse_mode: 'HTML'
        })
      });

      const answerUrl = `https://api.telegram.org/bot${this.config.botToken}/answerCallbackQuery`;
      await fetch(answerUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callback_query_id: cq.id,
          text: toastText,
          show_alert: false
        })
      });
    } catch (err) {
      console.error('[TelegramBot] editMessage error:', err.message);
    }
  }

  startPolling(intervalMs = 3000) {
    if (this.isPolling || !this.config.enabled) return;
    this.isPolling = true;

    const poll = async () => {
      if (!this.isPolling) return;
      try {
        const url = `https://api.telegram.org/bot${this.config.botToken}/getUpdates?offset=${this.lastUpdateId + 1}&timeout=5`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          if (data.ok && Array.isArray(data.result)) {
            for (const upd of data.result) {
              this.lastUpdateId = Math.max(this.lastUpdateId, upd.update_id);
              if (upd.callback_query) {
                await this.handleCallbackQuery(upd.callback_query);
              }
            }
          }
        }
      } catch (err) {
        // network or timeout error ignored
      } finally {
        if (this.isPolling) {
          this.pollTimer = setTimeout(poll, intervalMs);
        }
      }
    };

    poll();
    console.log('🤖 [TelegramBot] Polling listener started for IP Allow/Block actions.');
  }

  stopPolling() {
    this.isPolling = false;
    if (this.pollTimer) clearTimeout(this.pollTimer);
  }
}

module.exports = new TelegramBotHelper();
