// app/models/ipModel.js - IP 화이트리스트, 블랙리스트 및 외부 유입 로그 관리 모듈

window.IpModel = {
  allowedIps: [],
  blockedIps: [],
  accessLogs: [],

  getBaseUrl() {
    if (window.location.protocol.startsWith('http')) {
      return '';
    }
    return 'http://192.168.219.115:8080';
  },

  // -------------------------------------------------------------------------
  // 1. IP 화이트리스트 (Allowed IPs)
  // -------------------------------------------------------------------------
  async fetchAllowedIps() {
    try {
      const url = `${this.getBaseUrl()}/api/allowed-ips`;
      const res = await fetch(url, { cache: 'no-cache' });
      if (res.ok) {
        const text = await res.text();
        const cleanText = text.replace(/^\uFEFF/, '').trim();
        const ips = JSON.parse(cleanText || '[]');
        if (Array.isArray(ips)) {
          this.allowedIps = ips;
          localStorage.setItem('portal_bang_allowed_ips', JSON.stringify(ips));
          return ips;
        }
      }
    } catch (e) {
      console.warn('[IpModel] Allowed IPs fetch offline:', e);
    }
    const local = localStorage.getItem('portal_bang_allowed_ips');
    this.allowedIps = local ? JSON.parse(local) : ["127.0.0.1", "::1", "192.168.219.115", "192.168.219.*"];
    return this.allowedIps;
  },

  getIps() {
    return this.allowedIps || [];
  },

  addIp(ip) {
    const trimmed = ip.trim();
    if (!trimmed) return { success: false, message: '⚠️ IP 주소를 입력해 주세요.' };
    if (this.allowedIps.includes(trimmed)) {
      return { success: false, message: '⚠️ 이미 화이트리스트에 등록되어 있는 IP입니다.' };
    }
    // 블랙리스트에서 제거
    this.blockedIps = this.blockedIps.filter(item => item !== trimmed);
    this.saveBlockedIps(this.blockedIps);

    this.allowedIps.push(trimmed);
    this.saveAllowedIps(this.allowedIps);
    return { success: true, message: `✅ [${trimmed}] IP가 화이트리스트에 추가되었습니다.` };
  },

  deleteIp(ip) {
    this.allowedIps = this.allowedIps.filter(item => item !== ip);
    this.saveAllowedIps(this.allowedIps);
    return this.allowedIps;
  },

  async saveAllowedIps(ips) {
    this.allowedIps = ips;
    localStorage.setItem('portal_bang_allowed_ips', JSON.stringify(ips));
    try {
      await fetch(`${this.getBaseUrl()}/api/allowed-ips`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ips)
      });
      return true;
    } catch (e) {
      return false;
    }
  },

  // -------------------------------------------------------------------------
  // 2. IP 블랙리스트 (Blocked IPs)
  // -------------------------------------------------------------------------
  async fetchBlockedIps() {
    try {
      const url = `${this.getBaseUrl()}/api/blocked-ips`;
      const res = await fetch(url, { cache: 'no-cache' });
      if (res.ok) {
        const text = await res.text();
        const cleanText = text.replace(/^\uFEFF/, '').trim();
        const ips = JSON.parse(cleanText || '[]');
        if (Array.isArray(ips)) {
          this.blockedIps = ips;
          localStorage.setItem('portal_bang_blocked_ips', JSON.stringify(ips));
          return ips;
        }
      }
    } catch (e) {
      console.warn('[IpModel] Blocked IPs fetch offline:', e);
    }
    const local = localStorage.getItem('portal_bang_blocked_ips');
    this.blockedIps = local ? JSON.parse(local) : [];
    return this.blockedIps;
  },

  getBlockedIps() {
    return this.blockedIps || [];
  },

  addBlockedIp(ip) {
    const trimmed = ip.trim();
    if (!trimmed) return { success: false, message: '⚠️ IP 주소를 입력해 주세요.' };
    if (this.blockedIps.includes(trimmed)) {
      return { success: false, message: '⚠️ 이미 블랙리스트에 등록되어 있는 IP입니다.' };
    }
    // 화이트리스트에서 제거
    this.allowedIps = this.allowedIps.filter(item => item !== trimmed);
    this.saveAllowedIps(this.allowedIps);

    this.blockedIps.push(trimmed);
    this.saveBlockedIps(this.blockedIps);
    return { success: true, message: `⛔ [${trimmed}] IP가 블랙리스트에 추가(차단) 되었습니다.` };
  },

  deleteBlockedIp(ip) {
    this.blockedIps = this.blockedIps.filter(item => item !== ip);
    this.saveBlockedIps(this.blockedIps);
    return this.blockedIps;
  },

  async saveBlockedIps(ips) {
    this.blockedIps = ips;
    localStorage.setItem('portal_bang_blocked_ips', JSON.stringify(ips));
    try {
      await fetch(`${this.getBaseUrl()}/api/blocked-ips`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ips)
      });
      return true;
    } catch (e) {
      return false;
    }
  },

  // -------------------------------------------------------------------------
  // 3. 외부 유입 IP 접속 로그 (Access Logs)
  // -------------------------------------------------------------------------
  async fetchAccessLogs() {
    try {
      const url = `${this.getBaseUrl()}/api/access-logs`;
      const res = await fetch(url, { cache: 'no-cache' });
      if (res.ok) {
        const text = await res.text();
        const cleanText = text.replace(/^\uFEFF/, '').trim();
        const logs = JSON.parse(cleanText || '[]');
        if (Array.isArray(logs)) {
          this.accessLogs = logs;
          return logs;
        }
      }
    } catch (e) {
      console.warn('[IpModel] Access Logs fetch offline:', e);
    }
    return this.accessLogs || [];
  },

  async clearAccessLogs() {
    this.accessLogs = [];
    try {
      await fetch(`${this.getBaseUrl()}/api/access-logs`, { method: 'DELETE' });
      return true;
    } catch (e) {
      return false;
    }
  }
};
