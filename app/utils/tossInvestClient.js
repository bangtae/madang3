// app/utils/tossInvestClient.js - 토스증권 Open API (REST) 공식 규격 통신 클라이언트
const fs = require('fs');
const path = require('path');
const telegramBot = require('./telegramBotHelper');

class TossInvestClient {
  constructor() {
    this.baseUrl = 'https://openapi.tossinvest.com';
    this.tokenCache = null;
    this.tokenExpiresAt = 0;
    this.accountSeqCache = null;
    this.accountNoCache = null;
    this.lastIpAlertTime = 0;
  }

  async getServerOutboundIp() {
    try {
      const resp = await fetch('https://api.ipify.org?format=json', { signal: AbortSignal.timeout(3000) });
      const data = await resp.json();
      return data.ip || null;
    } catch (e) {
      return null;
    }
  }

  getConfig() {
    let cfg = {
      clientId: process.env.TOSS_INVEST_CLIENT_ID || 'tsck_live_R90egikbBycPNBfxzEOsgG',
      clientSecret: process.env.TOSS_INVEST_CLIENT_SECRET || 'tssk_live_r4QvYdJmMIMgCK9oDEkg6k3sAfk2at5DyovtLmQgT7U',
      accountNo: process.env.TOSS_INVEST_ACCOUNT_NO || '14601015948',
      accountSeq: 1,
      mode: process.env.TOSS_INVEST_MODE || 'real',
      maxStockPrice: 100000,
      budgetPerStock: 100000,
      checkIntervalMs: 300000,
      isAutoTradingEnabled: false
    };

    const cfgPath = path.join(__dirname, '..', '..', 'data', 'tossConfig.json');
    if (fs.existsSync(cfgPath)) {
      try {
        const fileCfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
        cfg = { ...cfg, ...fileCfg };
      } catch (e) {}
    }

    return cfg;
  }

  saveConfig(newCfg) {
    const cfgPath = path.join(__dirname, '..', '..', 'data', 'tossConfig.json');
    const existing = this.getConfig();
    const merged = { ...existing, ...newCfg, updatedAt: new Date().toISOString() };
    fs.writeFileSync(cfgPath, JSON.stringify(merged, null, 2), 'utf8');
    this.tokenCache = null;
    this.accountSeqCache = null;
    return merged;
  }

  isConfigured() {
    const cfg = this.getConfig();
    return Boolean(cfg.clientId && cfg.clientSecret);
  }

  /**
   * OAuth 2.0 Access Token 발급 및 캐싱
   * 엔드포인트: POST /oauth2/token
   */
  async getAccessToken() {
    const now = Date.now();
    if (this.tokenCache && this.tokenExpiresAt - 60000 > now) {
      return this.tokenCache;
    }

    const cfg = this.getConfig();
    if (!cfg.clientId || !cfg.clientSecret) {
      throw new Error('토스증권 Client ID 또는 Client Secret이 설정되지 않았습니다.');
    }

    try {
      const resp = await fetch(`${this.baseUrl}/oauth2/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: cfg.clientId,
          client_secret: cfg.clientSecret
        })
      });

      if (!resp.ok) {
        const errText = await resp.text();
        if (resp.status === 403 && errText.includes('IP address not allowed')) {
          if (now - this.lastIpAlertTime > 600000) { // 10분마다 1회 알림
            this.lastIpAlertTime = now;
            const outboundIp = await this.getServerOutboundIp();
            telegramBot.sendGeneralMessage(
              `🚨 <b>[토스증권 API 연결 실패: IP 미등록]</b><br><br>` +
              `서버 공인 IP가 토스증권 Open API 허용 IP에 등록되지 않았습니다.<br>` +
              `• <b>현재 서버 IP:</b> <code>${outboundIp || '조회 실패'}</code><br>` +
              `• <b>조치 방법:</b> 토스증권 WTS > 설정 > Open API 관리 > [허용 IP 관리]에 위 IP를 추가해 주세요.`
            );
          }
        }
        throw new Error(`토큰 발급 실패 (${resp.status}): ${errText}`);
      }

      const data = await resp.json();
      if (data.access_token) {
        this.tokenCache = data.access_token;
        const expiresIn = data.expires_in || 86400;
        this.tokenExpiresAt = now + (expiresIn * 1000);
        return this.tokenCache;
      } else {
        throw new Error('토큰 발급 응답에 access_token이 누락되었습니다.');
      }
    } catch (e) {
      console.error('[TossInvestClient] getAccessToken Error:', e.message);
      throw e;
    }
  }

  /**
   * 사용자 계좌 목록 조회 및 accountSeq 획득
   * 엔드포인트: GET /api/v1/accounts
   */
  async getAccounts() {
    const token = await this.getAccessToken();
    const resp = await fetch(`${this.baseUrl}/api/v1/accounts`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!resp.ok) {
      const err = await resp.text();
      throw new Error(`계좌 목록 조회 실패 (${resp.status}): ${err}`);
    }

    const data = await resp.json();
    const list = data.result || [];
    if (list.length > 0) {
      this.accountSeqCache = list[0].accountSeq;
      this.accountNoCache = list[0].accountNo;
    }
    return list;
  }

  async getAccountSeq() {
    if (this.accountSeqCache) return this.accountSeqCache;
    const cfg = this.getConfig();
    if (cfg.accountSeq) {
      this.accountSeqCache = cfg.accountSeq;
      return this.accountSeqCache;
    }
    const accounts = await this.getAccounts();
    if (accounts.length > 0) {
      return accounts[0].accountSeq;
    }
    throw new Error('토스증권 계좌를 찾을 수 없습니다.');
  }

  /**
   * 계좌 전용 공통 인증 헤더 생성
   */
  async getAuthHeaders() {
    const token = await this.getAccessToken();
    const accountSeq = await this.getAccountSeq();
    return {
      'Authorization': `Bearer ${token}`,
      'X-Tossinvest-Account': String(accountSeq),
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
  }

  /**
   * 계좌 보유 주식 / 잔고 조회
   * 엔드포인트: GET /api/v1/holdings
   */
  async getHoldings() {
    if (!this.isConfigured()) {
      return { success: false, configured: false, message: 'API 설정 필요' };
    }

    try {
      const headers = await this.getAuthHeaders();
      const resp = await fetch(`${this.baseUrl}/api/v1/holdings`, {
        method: 'GET',
        headers
      });

      if (!resp.ok) {
        const err = await resp.text();
        return { success: false, error: `잔고 조회 실패 (${resp.status}): ${err}` };
      }

      const data = await resp.json();
      return { success: true, data: data.result || data };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  /**
   * 실시간 현재가 / 종가 조회
   * 엔드포인트: GET /api/v1/prices?symbols={symbol}
   */
  async getQuote(symbol) {
    if (!this.isConfigured()) {
      return null;
    }
    try {
      const token = await this.getAccessToken();
      const cleanSymbol = String(symbol).trim();
      const resp = await fetch(`${this.baseUrl}/api/v1/prices?symbols=${encodeURIComponent(cleanSymbol)}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!resp.ok) {
        return null;
      }
      const data = await resp.json();
      const items = data.result || [];
      if (items.length > 0) {
        const item = items[0];
        const lastPrice = parseFloat(item.lastPrice) || 0;
        return {
          symbol: item.symbol,
          lastPrice,
          price: lastPrice,
          currency: item.currency,
          timestamp: item.timestamp
        };
      }
      return null;
    } catch (e) {
      console.warn(`[TossInvestClient] getQuote error for ${symbol}:`, e.message);
      return null;
    }
  }

  /**
   * 주식 주문 접수 (매수 / 매도) - 단 1주 단일 주문
   * 엔드포인트: POST /api/v1/orders
   * @param {Object} params - { symbol, side: 'BUY'|'SELL', orderType: 'MARKET'|'LIMIT', quantity, price, clientOrderId }
   */
  async submitOrder({ symbol, side = 'BUY', orderType = 'LIMIT', quantity = 1, price = 0, clientOrderId = null }) {
    if (!this.isConfigured()) {
      throw new Error('토스증권 API 인증 정보(Client ID, Secret)를 먼저 설정해주세요.');
    }

    const headers = await this.getAuthHeaders();
    const body = {
      symbol: String(symbol).trim(),
      side,   // 'BUY' or 'SELL'
      orderType, // 'LIMIT' or 'MARKET'
      quantity: String(quantity || 1)
    };

    if (orderType === 'LIMIT' && price > 0) {
      body.price = String(Math.round(price));
    }
    if (clientOrderId) {
      body.clientOrderId = String(clientOrderId).slice(0, 36);
    }

    try {
      const resp = await fetch(`${this.baseUrl}/api/v1/orders`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
      });

      const resText = await resp.text();
      let resJson;
      try { resJson = JSON.parse(resText); } catch (e) { resJson = { raw: resText }; }

      if (!resp.ok) {
        let errMsg = '';
        if (resJson && typeof resJson === 'object') {
          if (resJson.error && typeof resJson.error === 'object') {
            errMsg = resJson.error.message || resJson.error.code || JSON.stringify(resJson.error);
            if (resJson.error.code && resJson.error.message) {
              errMsg = `[${resJson.error.code}] ${resJson.error.message}`;
            }
          } else if (resJson.error && typeof resJson.error === 'string') {
            errMsg = resJson.error;
          } else if (resJson.result && resJson.result.message) {
            errMsg = resJson.result.message;
          } else if (resJson.message) {
            errMsg = typeof resJson.message === 'string' ? resJson.message : JSON.stringify(resJson.message);
          } else {
            errMsg = JSON.stringify(resJson);
          }
        } else if (resText) {
          errMsg = resText;
        } else {
          errMsg = `HTTP ${resp.status}`;
        }
        return {
          success: false,
          status: resp.status,
          error: errMsg
        };
      }

      const result = resJson.result || resJson;
      return {
        success: true,
        orderId: result.orderId || `ORD-${Date.now()}`,
        clientOrderId: result.clientOrderId || clientOrderId,
        data: result
      };
    } catch (e) {
      console.error('[TossInvestClient] submitOrder error:', e.message);
      return { success: false, error: e.message };
    }
  }

  /**
   * 주문 상세 내역 및 체결 상태 조회
   * 엔드포인트: GET /api/v1/orders/{orderId}
   */
  async getOrderDetail(orderId) {
    if (!this.isConfigured() || !orderId) return null;
    try {
      const headers = await this.getAuthHeaders();
      const resp = await fetch(`${this.baseUrl}/api/v1/orders/${encodeURIComponent(orderId)}`, {
        method: 'GET',
        headers
      });
      if (!resp.ok) return null;
      const data = await resp.json();
      return data.result || data;
    } catch (e) {
      console.warn(`[TossInvestClient] getOrderDetail error for ${orderId}:`, e.message);
      return null;
    }
  }

  /**
   * 미체결/대기 주문 목록 조회
   * 엔드포인트: GET /api/v1/orders?status=OPEN
   */
  async getOpenOrders() {
    if (!this.isConfigured()) return [];
    try {
      const headers = await this.getAuthHeaders();
      const resp = await fetch(`${this.baseUrl}/api/v1/orders?status=OPEN`, {
        method: 'GET',
        headers
      });
      if (!resp.ok) return [];
      const data = await resp.json();
      return (data.result && data.result.orders) || [];
    } catch (e) {
      console.warn('[TossInvestClient] getOpenOrders error:', e.message);
      return [];
    }
  }

  /**
   * 주문 취소
   * 엔드포인트: POST /api/v1/orders/{orderId}/cancel
   */
  async cancelOrder(orderId) {
    if (!this.isConfigured()) return { success: false, error: 'API 미설정' };
    const headers = await this.getAuthHeaders();
    try {
      const resp = await fetch(`${this.baseUrl}/api/v1/orders/${encodeURIComponent(orderId)}/cancel`, {
        method: 'POST',
        headers,
        body: JSON.stringify({})
      });
      const data = await resp.json().catch(() => ({}));
      return { success: resp.ok, data };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  /**
   * 실시간 USD/KRW 환율 조회 (기본 1,350원)
   */
  async fetchUsdkrwRate() {
    try {
      const fxUrl = 'https://query1.finance.yahoo.com/v8/finance/chart/USDKRW=X?interval=1d';
      const res = await fetch(fxUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      if (res.ok) {
        const data = await res.json();
        const rate = data?.chart?.result?.[0]?.meta?.regularMarketPrice;
        if (rate && rate > 500) return rate;
      }
    } catch (e) {}
    return 1350.0;
  }

  /**
   * 한국 시간(KST, UTC+9) Date 객체 생성
   */
  getKstDate(d = new Date()) {
    const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
    return new Date(utc + (9 * 3600000));
  }

  /**
   * 미국 동부 시간(ET) Date 객체 생성 (서머타임 자동 적용)
   */
  getEtDate(d = new Date()) {
    const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
    const isDst = this.isUsDaylightSaving(d);
    const offsetHours = isDst ? -4 : -5;
    return new Date(utc + (offsetHours * 3600000));
  }

  /**
   * 미국 서머타임(Daylight Saving Time: 3월 둘째 일요일 ~ 11월 첫째 일요일) 판정
   */
  isUsDaylightSaving(d = new Date()) {
    const year = d.getUTCFullYear();
    // 3월 둘째 일요일
    const marchFirst = new Date(Date.UTC(year, 2, 1));
    const firstSunMarch = 1 + ((7 - marchFirst.getUTCDay()) % 7);
    const secondSunMarch = new Date(Date.UTC(year, 2, firstSunMarch + 7, 7, 0, 0)); // 02:00 EST = 07:00 UTC

    // 11월 첫째 일요일
    const novFirst = new Date(Date.UTC(year, 10, 1));
    const firstSunNov = 1 + ((7 - novFirst.getUTCDay()) % 7);
    const firstSunNovDate = new Date(Date.UTC(year, 10, firstSunNov, 6, 0, 0)); // 02:00 EDT = 06:00 UTC

    return d >= secondSunMarch && d < firstSunNovDate;
  }

  /**
   * 대한민국(KRX) 법정 공휴일 및 거래소 휴장일 판정
   */
  isKrHoliday(kstDate) {
    const y = kstDate.getFullYear();
    const m = String(kstDate.getMonth() + 1).padStart(2, '0');
    const d = String(kstDate.getDate()).padStart(2, '0');
    const ymd = `${y}-${m}-${d}`;
    const md = `${m}-${d}`;

    // 1. 매년 고정 공휴일 및 거래소 연말 폐장일(12/31)
    const fixedHolidays = [
      '01-01', // 신정
      '03-01', // 삼일절
      '05-05', // 어린이날
      '06-06', // 현충일
      '08-15', // 광복절
      '10-03', // 개천절
      '10-09', // 한글날
      '12-25', // 성탄절
      '12-31'  // 한국거래소(KRX) 납회일/연말 휴장
    ];
    if (fixedHolidays.includes(md)) return true;

    // 2. 2025~2027 음력 명절 및 대체공휴일
    const krSpecialHolidays = [
      // 2025년
      '2025-01-28', '2025-01-29', '2025-01-30', // 설날
      '2025-03-03', // 삼일절 대체공휴일
      '2025-05-06', // 대체공휴일
      '2025-10-05', '2025-10-06', '2025-10-07', '2025-10-08', // 추석 & 대체
      // 2026년
      '2026-02-16', '2026-02-17', '2026-02-18', // 설날 연휴
      '2026-03-02', // 삼일절 대체공휴일
      '2026-05-25', // 부처님오신날 대체공휴일
      '2026-08-17', // 광복절 대체공휴일
      '2026-09-24', '2026-09-25', '2026-09-26', // 추석 연휴
      '2026-10-05', // 개천절 대체공휴일
      // 2027년
      '2027-02-06', '2027-02-07', '2027-02-08', '2027-02-09', // 설날 & 대체
      '2027-05-13', // 부처님오신날
      '2027-08-16', // 광복절 대체공휴일
      '2027-09-14', '2027-09-15', '2027-09-16', // 추석 연휴
      '2027-10-04', // 개천절 대체공휴일
      '2027-10-11'  // 한글날 대체공휴일
    ];

    return krSpecialHolidays.includes(ymd);
  }

  /**
   * 미국(NYSE/NASDAQ) 법정 공휴일 및 거래소 휴장일 판정
   */
  isUsHoliday(etDate) {
    const y = etDate.getFullYear();
    const m = String(etDate.getMonth() + 1).padStart(2, '0');
    const d = String(etDate.getDate()).padStart(2, '0');
    const ymd = `${y}-${m}-${d}`;

    // 2025~2027 미국 증시 공식 휴장일 리스트
    const usHolidays = [
      // 2025
      '2025-01-01', '2025-01-20', '2025-02-17', '2025-04-18', '2025-05-26',
      '2025-06-19', '2025-07-04', '2025-09-01', '2025-11-27', '2025-12-25',
      // 2026
      '2026-01-01', // New Year's Day
      '2026-01-19', // Martin Luther King Jr. Day
      '2026-02-16', // Washington's Birthday (Presidents' Day)
      '2026-04-03', // Good Friday
      '2026-05-25', // Memorial Day
      '2026-06-19', // Juneteenth
      '2026-07-03', // Independence Day (Observed)
      '2026-09-07', // Labor Day
      '2026-11-26', // Thanksgiving Day
      '2026-12-25', // Christmas Day
      // 2027
      '2027-01-01', '2027-01-18', '2027-02-15', '2027-03-26', '2027-05-31',
      '2027-06-18', '2027-07-05', '2027-09-06', '2027-11-25', '2027-12-24'
    ];

    return usHolidays.includes(ymd);
  }

  /**
   * 정규 주식 시장 운영 여부 판별 (한국 및 미국 거래소 정밀 판정)
   * @param {string} market - 'KR' (KOSPI/KOSDAQ) 또는 'US' (NYSE/NASDAQ)
   */
  isRegularMarketOpen(market = 'KR') {
    const now = new Date();

    if (market === 'US') {
      const etDate = this.getEtDate(now);
      const day = etDate.getDay();
      if (day === 0 || day === 6) return false; // 미국 주말
      if (this.isUsHoliday(etDate)) return false; // 미국 공휴일

      const etMinutes = etDate.getHours() * 60 + etDate.getMinutes();
      // 미국 정규장: 09:30 (570분) ~ 16:00 (960분) ET
      return etMinutes >= 570 && etMinutes <= 960;
    }

    // 기본: 국내 주식 (KR)
    const kstDate = this.getKstDate(now);
    const day = kstDate.getDay();
    if (day === 0 || day === 6) return false; // 한국 주말
    if (this.isKrHoliday(kstDate)) return false; // 한국 공휴일/휴무일

    const totalMinutes = kstDate.getHours() * 60 + kstDate.getMinutes();
    // 한국 정규장: 09:00 (540분) ~ 15:30 (930분) KST
    return totalMinutes >= 540 && totalMinutes <= 930;
  }

  /**
   * 현재 시각 기준 자동매매 타깃 시장 판정
   * - 현재 국장이 열려있으면 -> 'KR'
   * - 현재 미장이 열려있으면 -> 'US'
   * - 둘 다 닫혀있는 장마감/장전 시간:
   *   - 05:00 ~ 15:30 KST (국장 영업일 또는 국장 준비 시간): 다음 개장할 'KR' 타깃
   *   - 15:30 ~ 22:30 KST (국장 종료 후 미장 준비 시간): 다음 개장할 'US' 타깃
   *   - 심야 22:30 ~ 05:00 KST: 미장 운영/대기 시간 -> 'US' 타깃
   */
  getTargetMarketForTrading() {
    const now = new Date();
    const isKrOpen = this.isRegularMarketOpen('KR');
    const isUsOpen = this.isRegularMarketOpen('US');

    if (isKrOpen) return 'KR';
    if (isUsOpen) return 'US';

    const kst = this.getKstDate(now);
    const kstMins = kst.getHours() * 60 + kst.getMinutes();

    // 15:30 이후부터 심야 05:00 이전까지는 다음 개장 시장인 미국장(US) 우선
    if (kstMins >= 930 || kstMins < 300) {
      return 'US';
    }

    // 아침 05:00부터 15:30까지는 한국장(KR) 우선
    return 'KR';
  }
}

module.exports = new TossInvestClient();
