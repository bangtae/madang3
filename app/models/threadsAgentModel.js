// app/models/threadsAgentModel.js - Threads AI 에이전트 데이터 모델

window.ThreadsAgentModel = {
  tokenConfig: {
    agentBaseUrl: "http://localhost:8000",
    tokenIssuedDate: new Date().toISOString().split('T')[0],
    validDays: 60,
    recipientEmail: "admin@example.com",
    smtpHost: "smtp.gmail.com",
    smtpPort: 587,
    smtpUser: "",
    smtpPass: "",
    enableEmailAlert: true
  },
  agentStatus: {
    is_running: false,
    is_offline: true,
    fetch_interval_seconds: 3600,
    dynamic_schedule: { market_name: "미확인" },
    sources_health: [],
    statistics: { total_articles_crawled: 0, total_posts_generated: 0 }
  },
  sourcesList: [],
  publishedPosts: [],
  runtimeConfig: {},
  sapAgentConfig: {
    agentBaseUrl: "http://127.0.0.1:8080",
    intervalMinutes: 60,
    taskName: "SAPIntegrationSuiteAgent"
  },
  sapAgentStatus: {
    is_running: false,
    task_state: "Unknown",
    last_run_time: "확인 불가",
    next_run_time: "확인 불가",
    total_news_count: 0,
    agent_base_url: "http://127.0.0.1:8080",
    interval_minutes: 60
  },

  async loadTokenConfig() {
    try {
      const res = await fetch('/api/threads-agent/token-config');
      if (res.ok) {
        const data = await res.json();
        if (data) {
          this.tokenConfig = Object.assign({}, this.tokenConfig, data);
        }
      }
    } catch (e) {
      console.warn('[ThreadsAgentModel] Token config load error:', e);
    }
    return this.tokenConfig;
  },

  async saveTokenConfig(newConfig) {
    try {
      this.tokenConfig = Object.assign({}, this.tokenConfig, newConfig);
      const res = await fetch('/api/threads-agent/token-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(this.tokenConfig)
      });
      return await res.json();
    } catch (e) {
      console.error('[ThreadsAgentModel] Save token config error:', e);
      return { success: false, error: e.message };
    }
  },

  async sendTestEmail() {
    try {
      const res = await fetch('/api/threads-agent/test-email', { method: 'POST' });
      const text = await res.text();
      try {
        return JSON.parse(text);
      } catch (parseErr) {
        return { success: true, message: text.replace(/^["'\s]+|["'\s]+$/g, '') || '테스트 메일 요청이 처리되었습니다.' };
      }
    } catch (e) {
      return { success: false, message: e.message };
    }
  },

  async fetchStatus() {
    try {
      const res = await fetch('/api/threads-agent/status');
      if (res.ok) {
        const data = await res.json();
        if (data && !data.is_offline) {
          this.agentStatus = data;
          if (Array.isArray(data.sources_health)) {
            this.sourcesList = data.sources_health;
          }
          return this.agentStatus;
        }
      }
    } catch (e) {}

    // Fallback: direct fetch from external agent URL
    try {
      const baseUrl = (this.tokenConfig.agentBaseUrl || 'http://127.0.0.1:8000').replace('localhost', '127.0.0.1').replace(/\/$/, '');
      const directRes = await fetch(`${baseUrl}/api/agent/status`);
      if (directRes.ok) {
        const data = await directRes.json();
        this.agentStatus = data;
        if (Array.isArray(data.sources_health)) {
          this.sourcesList = data.sources_health;
        }
        return this.agentStatus;
      }
    } catch (err2) {}

    this.agentStatus.is_running = false;
    this.agentStatus.is_offline = true;
    return this.agentStatus;
  },

  async startAgent() {
    try {
      const res = await fetch('/api/threads-agent/start', { method: 'POST' });
      const data = await res.json();
      await this.fetchStatus();
      return data;
    } catch (e) {
      return { success: false, message: e.message };
    }
  },

  async stopAgent() {
    try {
      const res = await fetch('/api/threads-agent/stop', { method: 'POST' });
      const data = await res.json();
      await this.fetchStatus();
      return data;
    } catch (e) {
      return { success: false, message: e.message };
    }
  },

  async triggerOnce() {
    try {
      const res = await fetch('/api/threads-agent/trigger', { method: 'POST' });
      const data = await res.json();
      await this.fetchStatus();
      return data;
    } catch (e) {
      return { success: false, message: e.message };
    }
  },

  async fetchSources() {
    try {
      const res = await fetch('/api/threads-agent/sources');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          this.sourcesList = data;
        }
      }
    } catch (e) {
      console.warn('[ThreadsAgentModel] Fetch sources error:', e);
    }
    return this.sourcesList;
  },

  async toggleSource(sourceName) {
    try {
      const res = await fetch(`/api/threads-agent/sources/${encodeURIComponent(sourceName)}/toggle`, {
        method: 'POST'
      });
      const data = await res.json();
      await this.fetchSources();
      return data;
    } catch (e) {
      return { success: false, message: e.message };
    }
  },

  async fetchPosts(limit = 20) {
    try {
      const res = await fetch(`/api/threads-agent/posts?limit=${limit}&status=PUBLISHED`);
      if (res.ok) {
        const data = await res.json();
        this.publishedPosts = data.items || (Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.warn('[ThreadsAgentModel] Fetch posts error:', e);
    }
    return this.publishedPosts;
  },

  async fetchRuntimeConfig() {
    try {
      const res = await fetch('/api/threads-agent/config');
      if (res.ok) {
        this.runtimeConfig = await res.json();
      }
    } catch (e) {
      console.warn('[ThreadsAgentModel] Fetch runtime config error:', e);
    }
    return this.runtimeConfig;
  },

  async saveRuntimeConfig(newConfig) {
    try {
      const res = await fetch('/api/threads-agent/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newConfig)
      });
      const data = await res.json();
      this.runtimeConfig = Object.assign({}, this.runtimeConfig, newConfig);
      return data;
    } catch (e) {
      return { success: false, message: e.message };
    }
  },

  getTokenDDay() {
    if (!this.tokenConfig || !this.tokenConfig.tokenIssuedDate) {
      return { dDay: 60, expiryDateStr: '-', isExpired: false, isWarning: false };
    }
    const issued = new Date(this.tokenConfig.tokenIssuedDate);
    const validDays = parseInt(this.tokenConfig.validDays || 60, 10);
    const expiry = new Date(issued.getTime() + validDays * 24 * 60 * 60 * 1000);
    const now = new Date();
    
    const diffTime = expiry.getTime() - now.getTime();
    const dDay = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    const expiryDateStr = expiry.toISOString().split('T')[0];
    const isExpired = dDay <= 0;
    const isWarning = dDay <= 7;

    return { dDay, expiryDateStr, isExpired, isWarning };
  },

  /**
   * SAP Integration Suite 에이전트 상태 조회
   */
  async fetchSapStatus() {
    try {
      const res = await fetch('/api/sap-agent/status');
      if (res.ok) {
        const data = await res.json();
        if (data) {
          this.sapAgentStatus = data;
          return this.sapAgentStatus;
        }
      }
    } catch (e) {
      console.warn('[ThreadsAgentModel] Failed to fetch SAP agent status:', e);
    }
    return this.sapAgentStatus;
  },

  /**
   * SAP Integration Suite 에이전트 시작
   */
  async startSapAgent() {
    try {
      const res = await fetch('/api/sap-agent/start', { method: 'POST' });
      const data = await res.json();
      await this.fetchSapStatus();
      return data;
    } catch (e) {
      return { success: false, message: e.message };
    }
  },

  /**
   * SAP Integration Suite 에이전트 중지
   */
  async stopSapAgent() {
    try {
      const res = await fetch('/api/sap-agent/stop', { method: 'POST' });
      const data = await res.json();
      await this.fetchSapStatus();
      return data;
    } catch (e) {
      return { success: false, message: e.message };
    }
  },

  /**
   * SAP Integration Suite 에이전트 1회 즉시 수집 트리거
   */
  async triggerSapAgent() {
    try {
      const res = await fetch('/api/sap-agent/trigger', { method: 'POST' });
      const data = await res.json();
      await this.fetchSapStatus();
      return data;
    } catch (e) {
      return { success: false, message: e.message };
    }
  },

  /**
   * SAP Integration Suite 에이전트 설정 로드
   */
  async loadSapConfig() {
    try {
      const res = await fetch('/api/sap-agent/config');
      if (res.ok) {
        const data = await res.json();
        if (data) {
          this.sapAgentConfig = Object.assign({}, this.sapAgentConfig, data);
        }
      }
    } catch (e) {
      console.warn('[ThreadsAgentModel] Failed to load SAP config:', e);
    }
    return this.sapAgentConfig;
  },

  /**
   * SAP Integration Suite 에이전트 설정 저장
   */
  async saveSapConfig(newConfig) {
    try {
      this.sapAgentConfig = Object.assign({}, this.sapAgentConfig, newConfig);
      const res = await fetch('/api/sap-agent/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(this.sapAgentConfig)
      });
      const data = await res.json();
      await this.fetchSapStatus();
      return data;
    } catch (e) {
      return { success: false, message: e.message };
    }
  },

  /**
   * 범용 에이전트 Base URL Ping 연결 진단
   */
  async pingUrl(url) {
    if (!url || !url.trim()) {
      return { success: false, message: 'URL을 입력해주세요.' };
    }
    try {
      const res = await fetch('/api/agent/ping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() })
      });
      return await res.json();
    } catch (e) {
      return { success: false, message: `연결 테스트 실패: ${e.message}` };
    }
  }
};
