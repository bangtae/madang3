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
   * 다음 국내 정규장(KRX) 개장 영업일(날짜, 요일, 상대문구) 계산 (주말/공휴일/휴장일 제외)
   */
  getNextKrTradingDay(baseDate = new Date()) {
    const kst = this.getKstDate(baseDate);
    const totalMinutes = kst.getHours() * 60 + kst.getMinutes();

    let candidate = new Date(kst.getTime());

    // 당일 09:00 정규장 개장 이후이거나 오늘이 휴장일이면 다음 날부터 탐색
    const isTodayHoliday = candidate.getDay() === 0 || candidate.getDay() === 6 || this.isKrHoliday(candidate);
    if (totalMinutes >= 540 || isTodayHoliday) {
      candidate.setDate(candidate.getDate() + 1);
    }

    // 주말(토=6, 일=0) 및 공휴일 건너뛰기
    while (candidate.getDay() === 0 || candidate.getDay() === 6 || this.isKrHoliday(candidate)) {
      candidate.setDate(candidate.getDate() + 1);
    }

    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
    const m = candidate.getMonth() + 1;
    const d = candidate.getDate();
    const dayName = dayNames[candidate.getDay()];

    const baseDayOnly = new Date(kst.getFullYear(), kst.getMonth(), kst.getDate());
    const candDayOnly = new Date(candidate.getFullYear(), candidate.getMonth(), candidate.getDate());
    const diffDays = Math.round((candDayOnly - baseDayOnly) / (1000 * 60 * 60 * 24));

    let relativeText = '';
    if (diffDays === 0) {
      relativeText = `오늘(${m}/${d} ${dayName})`;
    } else if (diffDays === 1) {
      relativeText = `내일(${m}/${d} ${dayName})`;
    } else {
      relativeText = `다음 개장일인 ${m}월 ${d}일(${dayName})`;
    }

    return {
      date: candidate,
      formattedText: relativeText,
      month: m,
      day: d,
      dayName: dayName,
      diffDays: diffDays
    };
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

  /**
   * 미국 서머타임(Daylight Saving Time) 활성 여부 판정
   * 미국 DST: 3월 둘째 주 일요일 02:00 ~ 11월 첫째 주 일요일 02:00
   */
  isUsDstActive(date = new Date()) {
    const etDate = this.getEtDate(date);
    const year = etDate.getFullYear();
    const marchFirst = new Date(Date.UTC(year, 2, 1));
    const marchSecondSun = 14 - ((marchFirst.getUTCDay() + 6) % 7);
    const dstStart = new Date(Date.UTC(year, 2, marchSecondSun, 7, 0, 0));

    const novFirst = new Date(Date.UTC(year, 10, 1));
    const novFirstSun = 7 - ((novFirst.getUTCDay() + 6) % 7) || 7;
    const dstEnd = new Date(Date.UTC(year, 10, novFirstSun, 6, 0, 0));

    return date >= dstStart && date < dstEnd;
  }

  /**
   * 실시간 시장 세션 및 세부 운영 시간 상세 판별 (NXT, KRX, US)
   */
  getCurrentMarketSession(now = new Date()) {
    const kstDate = this.getKstDate(now);
    const day = kstDate.getDay();
    const isWeekend = day === 0 || day === 6;
    const isHoliday = this.isKrHoliday(kstDate);
    const kstHours = kstDate.getHours();
    const kstMinutes = kstDate.getMinutes();
    const totalMinutes = kstHours * 60 + kstMinutes;
    const isDst = this.isUsDstActive(now);

    const usMarketOpen = this.isRegularMarketOpen('US');

    if (isWeekend) {
      return {
        code: 'WEEKEND',
        name: '주말 휴장',
        badgeColor: '#94a3b8',
        description: '토요일/일요일은 모든 정규 거래소가 휴장합니다.',
        isScalpingGoldenTime: false,
        goldenTimePriority: null,
        activeExchange: null,
        detailTime: '월요일 오전 08:00 NXT 프리마켓 개장 예정'
      };
    }

    if (isHoliday) {
      return {
        code: 'KR_HOLIDAY',
        name: '국내 공휴일 휴장',
        badgeColor: '#94a3b8',
        description: '한국거래소 및 대체거래소(NXT) 공휴일 휴장입니다.',
        isScalpingGoldenTime: false,
        goldenTimePriority: null,
        activeExchange: null,
        detailTime: usMarketOpen ? '미국 정규장은 운영 중' : '휴장'
      };
    }

    // 1. NXT 프리마켓 (08:00 ~ 08:50) - 🥈 골든타임 2순위
    if (totalMinutes >= 480 && totalMinutes < 530) {
      return {
        code: 'NXT_PRE_MARKET',
        name: 'NXT 프리마켓 접속매매',
        badgeColor: '#38bdf8',
        description: '대체거래소(NXT) 프리마켓 실시간 접속매매 중입니다. (08:00~08:50)',
        isScalpingGoldenTime: true,
        goldenTimePriority: 2,
        activeExchange: 'NXT',
        detailTime: '08:00 ~ 08:50 (NXT 접속매매)'
      };
    }

    // 2. NXT 호가 정지 & KRX 동시호가 (08:50 ~ 09:00)
    if (totalMinutes >= 530 && totalMinutes < 540) {
      return {
        code: 'ORDER_SUSPENDED_PRE_OPEN',
        name: '개장 동시호가 (NXT 호가정지)',
        badgeColor: '#fbbf24',
        description: '09:00 개장 전 시가 결정 동시호가 진행 중입니다. (신규 호가 정지, 취소만 가능)',
        isScalpingGoldenTime: false,
        goldenTimePriority: null,
        activeExchange: 'KRX_PRE',
        detailTime: '08:50 ~ 09:00 (시가 동시호가)'
      };
    }

    // 3. KRX 정규장 & NXT 메인마켓 개장 직후 (09:00 ~ 09:30) - 🥇 최강 골든타임 1순위!
    if (totalMinutes >= 540 && totalMinutes < 570) {
      return {
        code: 'KRX_GOLDEN_OPEN',
        name: '★ 국장 개장 골든타임 (09:00~09:30)',
        badgeColor: '#10b981',
        description: '거래대금과 거래량이 폭발하는 하루 중 가장 최적의 초단타 골든타임입니다!',
        isScalpingGoldenTime: true,
        goldenTimePriority: 1,
        activeExchange: 'KRX_NXT',
        detailTime: '09:00 ~ 09:30 (초단타 최고 적기)'
      };
    }

    // 4. KRX 정규장 & NXT 메인마켓 주간 운영 (09:30 ~ 15:20)
    if (totalMinutes >= 570 && totalMinutes < 920) {
      return {
        code: 'KRX_REGULAR_MAIN',
        name: '국장 정규장 & NXT 메인마켓',
        badgeColor: '#10b981',
        description: '한국거래소(KRX) 정규장 및 NXT 메인마켓이 정상 운영 중입니다. (09:00~15:20)',
        isScalpingGoldenTime: true,
        goldenTimePriority: 1,
        activeExchange: 'KRX_NXT',
        detailTime: '09:00 ~ 15:20 (실시간 접속매매)'
      };
    }

    // 5. 장 마감 동시호가 (15:20 ~ 15:30)
    if (totalMinutes >= 920 && totalMinutes < 930) {
      return {
        code: 'CLOSING_AUCTION',
        name: '장마감 동시호가 (NXT 호가정지)',
        badgeColor: '#f59e0b',
        description: '종가 결정 동시호가 시간대입니다. (신규 체결 정지, 취소만 가능)',
        isScalpingGoldenTime: false,
        goldenTimePriority: null,
        activeExchange: 'KRX_AUCTION',
        detailTime: '15:20 ~ 15:30 (종가 동시호가)'
      };
    }

    // 6. 장후 시간외 및 NXT 애프터마켓 (15:30 ~ 20:00)
    if (totalMinutes >= 930 && totalMinutes < 1200) {
      return {
        code: 'NXT_KRX_AFTER_MARKET',
        name: 'NXT 애프터마켓 & 시간외 거래',
        badgeColor: '#818cf8',
        description: 'NXT 애프터마켓(15:40~20:00 실시간 접속매매) 및 KRX 시간외 거래가 진행됩니다.',
        isScalpingGoldenTime: false,
        goldenTimePriority: null,
        activeExchange: 'NXT_AFTER',
        detailTime: '15:30 ~ 20:00 (NXT 실시간 접속매매)'
      };
    }

    // 7. 미국 정규장 (22:30~05:00 KST / 겨울 23:30~06:00 KST) - 🥉 골든타임 3순위
    if (usMarketOpen) {
      const isGoldenUs = isDst ? (totalMinutes >= 1350 || totalMinutes < 60) : (totalMinutes >= 1410 || totalMinutes < 120);
      return {
        code: 'US_REGULAR_OPEN',
        name: isGoldenUs ? '★ 미장 개장 골든타임' : '미국 정규장 운영 중',
        badgeColor: '#a855f7',
        description: isDst ? '미국 정규장(서머타임 22:30~05:00 KST)이 운영 중입니다.' : '미국 정규장(겨울철 23:30~06:00 KST)이 운영 중입니다.',
        isScalpingGoldenTime: isGoldenUs,
        goldenTimePriority: 3,
        activeExchange: 'US',
        detailTime: isDst ? '22:30 ~ 익일 05:00 KST' : '23:30 ~ 익일 06:00 KST'
      };
    }

    // 8. 그 외 야간/새벽 휴장 대기 (20:00~22:30 또는 05:00~08:00)
    return {
      code: 'MARKET_STANDBY',
      name: totalMinutes < 480 ? '아침 개장 대기 (08:00 NXT 프리마켓)' : '야간 휴장 / 미장 대기',
      badgeColor: '#64748b',
      description: totalMinutes < 480 ? '오전 08:00 NXT 프리마켓 개장을 대기 중입니다.' : '국장 마감 완료. 22:30 미국 정규장 개장을 대기 중입니다.',
      isScalpingGoldenTime: false,
      goldenTimePriority: null,
      activeExchange: null,
      detailTime: totalMinutes < 480 ? '08:00 NXT 개장' : '22:30 미장 개장'
    };
  }

  /**
   * 종목 마스터 정보 조회 (종목명, 시장 등)
   * 엔드포인트: GET /api/v1/stocks?symbols={symbol}
   */
  async getStockInfo(symbol) {
    if (!this.isConfigured()) return null;
    try {
      const token = await this.getAccessToken();
      const res = await fetch(`${this.baseUrl}/api/v1/stocks?symbols=${encodeURIComponent(symbol)}`, {
        headers: { 'Authorization': `Bearer ${token}` },
        signal: AbortSignal.timeout(4000)
      });
      if (!res.ok) return null;
      const data = await res.json();
      const list = data.result || [];
      return list.length > 0 ? list[0] : null;
    } catch (e) {
      console.warn(`[TossInvestClient] getStockInfo error for ${symbol}:`, e.message);
      return null;
    }
  }

  /**
   * 토스증권 실시간 차트/랭킹 조회 API
   * 엔드포인트: GET /api/v1/rankings
   */
  async getRankings({
    type = 'MARKET_TRADING_AMOUNT',
    marketCountry = 'KR',
    duration = 'realtime',
    count = 50,
    excludeInvestmentCaution = true
  } = {}) {
    if (!this.isConfigured()) {
      return { success: false, configured: false, message: '토스증권 API가 설정되지 않았습니다.' };
    }

    try {
      const headers = await this.getAuthHeaders();
      const qs = new URLSearchParams({
        type,
        marketCountry,
        duration,
        count: String(count),
        excludeInvestmentCaution: String(excludeInvestmentCaution)
      });

      const url = `${this.baseUrl}/api/v1/rankings?${qs.toString()}`;
      const res = await fetch(url, { headers, signal: AbortSignal.timeout(5000) });
      if (!res.ok) {
        const errText = await res.text();
        return { success: false, error: `HTTP ${res.status}: ${errText}` };
      }

      const data = await res.json();
      return {
        success: true,
        rankings: data.result?.rankings || [],
        rankedAt: data.result?.rankedAt || null
      };
    } catch (e) {
      console.error('[TossInvestClient] getRankings error:', e.message);
      return { success: false, error: e.message };
    }
  }

  /**
   * 다음 미국 정규장(NYSE/NASDAQ) 개장 영업일 계산 (주말/미국공휴일 제외)
   */
  getNextUsTradingDay(baseDate = new Date()) {
    const et = this.getEtDate(baseDate);
    const etMinutes = et.getHours() * 60 + et.getMinutes();

    let candidate = new Date(et.getTime());
    const isTodayHoliday = candidate.getDay() === 0 || candidate.getDay() === 6 || this.isUsHoliday(candidate);

    // 당일 09:30 ET 개장 이후이거나 오늘이 휴장일이면 다음 날부터 탐색
    if (etMinutes >= 570 || isTodayHoliday) {
      candidate.setDate(candidate.getDate() + 1);
    }

    while (candidate.getDay() === 0 || candidate.getDay() === 6 || this.isUsHoliday(candidate)) {
      candidate.setDate(candidate.getDate() + 1);
    }

    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
    const m = candidate.getMonth() + 1;
    const d = candidate.getDate();
    const dayName = dayNames[candidate.getDay()];

    const baseDayOnly = new Date(et.getFullYear(), et.getMonth(), et.getDate());
    const candDayOnly = new Date(candidate.getFullYear(), candidate.getMonth(), candidate.getDate());
    const diffDays = Math.round((candDayOnly - baseDayOnly) / (1000 * 60 * 60 * 24));

    let relativeLabel = '';
    if (diffDays === 0) relativeLabel = '오늘 밤';
    else if (diffDays === 1) relativeLabel = '내일 밤';
    else if (diffDays === 2) relativeLabel = '모레 밤';
    else relativeLabel = `${diffDays}일 뒤`;

    const isDst = this.isUsDaylightSaving(baseDate);
    const openTimeStr = isDst ? '22:30' : '23:30';

    return {
      month: m,
      day: d,
      dayName: `${dayName}요일`,
      diffDays,
      relativeLabel,
      openTime: openTimeStr,
      formattedText: `${relativeLabel}(${m}/${d} ${dayName}) ${openTimeStr}`
    };
  }

  /**
   * 현재 시각 기준 초단타 활성 세션(KR vs US) 및 개장 상태 판정
   */
  getCurrentScalpingSession() {
    const kst = this.getKstDate();
    const totalMinutes = kst.getHours() * 60 + kst.getMinutes();
    const isDst = this.isUsDaylightSaving(kst);
    const usOpenMinutes = isDst ? 22 * 60 + 30 : 23 * 60 + 30; // 서머타임 22:30 / 겨울철 23:30

    // 국장 세션: 07:00 ~ 16:30 (KST 420분 ~ 990분)
    // 미장 세션: 16:30 ~ 익일 07:00 (KST 990분 이후 또는 420분 이전)
    const isUsSession = totalMinutes >= 990 || totalMinutes < 420;
    const market = isUsSession ? 'US' : 'KR';
    const isOpen = this.isRegularMarketOpen(market);

    let nextOpenPrompt = '';
    if (isUsSession) {
      const nextUs = this.getNextUsTradingDay();
      nextOpenPrompt = nextUs.formattedText;
    } else {
      const nextKr = this.getNextKrTradingDay();
      nextOpenPrompt = `${nextKr.formattedText} 09:00`;
    }

    return {
      market, // 'KR' or 'US'
      isUsSession,
      isOpen,
      usOpenMinutes,
      isDst,
      nextOpenPrompt,
      maxPrice: isUsSession ? 100.0 : 100000,
      currency: isUsSession ? 'USD' : 'KRW',
      label: isUsSession ? '미장(나스닥/S&P)' : '국장(KRX)'
    };
  }

  /**
   * 한미 초단타 타깃 종목 발굴 (국장 10만원 이하 / 미장 $100 이하 거래대금 상위 1위)
   * @param {string} market - 'KR' | 'US'
   * @param {number|null} maxPrice - 국장 기본 100,000 KRW / 미장 기본 100.0 USD
   * @param {Array<string>} excludeSymbols - 타 전략 중복 제외 심볼 목록
   */
  async findScalpingTargetStock(market = 'KR', maxPrice = null, excludeSymbols = []) {
    const isUs = String(market).toUpperCase() === 'US';
    const marketCountry = isUs ? 'US' : 'KR';
    const defaultMaxPrice = isUs ? 100.0 : 100000;
    const effectiveMaxPrice = (typeof maxPrice === 'number' && maxPrice > 0) ? maxPrice : defaultMaxPrice;

    let rankRes = await this.getRankings({
      type: 'MARKET_TRADING_AMOUNT',
      marketCountry,
      duration: 'realtime',
      count: 50,
      excludeInvestmentCaution: true
    });

    if (!rankRes.success || !rankRes.rankings || rankRes.rankings.length === 0) {
      // 장 시작 직전 또는 장외 시 1d 랭킹으로 보조 조회
      const backupRes = await this.getRankings({
        type: 'MARKET_TRADING_AMOUNT',
        marketCountry,
        duration: '1d',
        count: 50,
        excludeInvestmentCaution: true
      });
      if (backupRes.success && backupRes.rankings && backupRes.rankings.length > 0) {
        rankRes = backupRes;
      }
    }

    if (!rankRes.rankings || rankRes.rankings.length === 0) {
      return null;
    }

    const excludeSet = new Set((excludeSymbols || []).map(s => String(s || '').trim()).filter(Boolean));

    // 단가 상한 이하 및 중복 방지 제외 종목(집중운용/맞춤전략) 필터링
    const eligible = rankRes.rankings.filter(item => {
      const sym = String(item.symbol || '').trim();
      if (excludeSet.has(sym)) {
        console.log(`[TossClient] Scalping candidate ${sym} excluded (already in other position/strategy)`);
        return false;
      }
      const price = parseFloat(item.price?.lastPrice || item.lastPrice || (typeof item.price === 'number' ? item.price : 0) || 0);
      return price > 0 && price <= effectiveMaxPrice;
    });

    if (eligible.length === 0) return null;

    const topStock = eligible[0];
    const curPrice = parseFloat(topStock.price?.lastPrice || topStock.lastPrice || (typeof topStock.price === 'number' ? topStock.price : 0) || 0);
    const changeRate = parseFloat(topStock.price?.changeRate || topStock.changeRate || 0);

    // 종목명 조회 (토스 종목 마스터 API 연동)
    let stockName = topStock.symbol;
    try {
      const info = await this.getStockInfo(topStock.symbol);
      if (info && info.name) {
        stockName = info.name;
      }
    } catch (e) {}

    return {
      symbol: topStock.symbol,
      stockName: stockName,
      market: marketCountry,
      currency: topStock.currency || (isUs ? 'USD' : 'KRW'),
      currentPrice: curPrice,
      changeRate: changeRate,
      tradingAmount: parseFloat(topStock.tradingAmount || 0),
      tradingVolume: parseFloat(topStock.tradingVolume || 0)
    };
  }
}

module.exports = new TossInvestClient();
