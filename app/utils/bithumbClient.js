// app/utils/bithumbClient.js - 빗썸(Bithumb) Open API v1 클라이언트
// JWT(HS256) 인증 및 REST API (계좌, 시세, 주문, 체결) 지원

const crypto = require('crypto');

class BithumbClient {
  constructor(apiKey, secretKey) {
    this.apiKey = apiKey || process.env.BITHUMB_API_KEY || '';
    this.secretKey = secretKey || process.env.BITHUMB_SECRET_KEY || '';
    this.baseUrl = 'https://api.bithumb.com/v1';
  }

  // JWT HS256 생성 헬퍼 (Node.js 내장 crypto 사용)
  generateToken(queryParams = null) {
    if (!this.apiKey || !this.secretKey) {
      throw new Error('빗썸 API Key 및 Secret Key가 설정되지 않았습니다.');
    }

    const payload = {
      access_key: this.apiKey,
      nonce: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
      timestamp: Date.now()
    };

    if (queryParams && Object.keys(queryParams).length > 0) {
      const queryString = new URLSearchParams(queryParams).toString();
      const hash = crypto.createHash('sha512').update(queryString, 'utf8').digest('hex');
      payload.query_hash = hash;
      payload.query_hash_alg = 'SHA512';
    }

    const header = { alg: 'HS256', typ: 'JWT' };

    const b64url = (input) => {
      const str = typeof input === 'string' ? input : JSON.stringify(input);
      return Buffer.from(str, 'utf8')
        .toString('base64')
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');
    };

    const hB64 = b64url(header);
    const pB64 = b64url(payload);
    const signingInput = `${hB64}.${pB64}`;

    const signature = crypto
      .createHmac('sha256', this.secretKey)
      .update(signingInput)
      .digest('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');

    return `${signingInput}.${signature}`;
  }

  // 공통 HTTP 요청 헬퍼
  async request(endpoint, method = 'GET', data = null, isPrivate = true) {
    const url = new URL(`${this.baseUrl}${endpoint}`);
    let token = null;

    if (isPrivate) {
      if (method === 'GET' && data) {
        Object.entries(data).forEach(([k, v]) => {
          if (v !== undefined && v !== null) url.searchParams.append(k, v);
        });
        token = this.generateToken(data);
      } else if (method === 'POST' || method === 'DELETE') {
        token = this.generateToken(data);
      } else {
        token = this.generateToken();
      }
    } else if (method === 'GET' && data) {
      Object.entries(data).forEach(([k, v]) => {
        if (v !== undefined && v !== null) url.searchParams.append(k, v);
      });
    }

    const headers = {
      'Accept': 'application/json'
    };

    if (isPrivate && token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const options = {
      method,
      headers
    };

    if ((method === 'POST' || method === 'DELETE') && data) {
      headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(data);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 9000);
    options.signal = controller.signal;

    try {
      const res = await fetch(url.toString(), options);
      clearTimeout(timeout);
      const text = await res.text();
      let json = null;
      try {
        json = JSON.parse(text);
      } catch (parseErr) {
        throw new Error(`빗썸 응답 파싱 실패 (HTTP ${res.status}): ${text.slice(0, 100)}`);
      }

      if (!res.ok) {
        const errMsg = (json && json.error && (json.error.message || json.error.name)) || text;
        throw new Error(`빗썸 API 오류 (HTTP ${res.status}): ${errMsg}`);
      }

      return json;
    } catch (err) {
      clearTimeout(timeout);
      if (err.name === 'AbortError') {
        throw new Error('빗썸 API 요청 시간 초과 (9초)');
      }
      throw err;
    }
  }

  // 1. 전체 계좌 잔고 조회
  async getAccounts() {
    return await this.request('/accounts', 'GET', null, true);
  }

  // 1-1. 원화(KRW) 잔고 간편 조회
  async getKrwBalance() {
    const accounts = await this.getAccounts();
    if (!Array.isArray(accounts)) return 0;
    const krw = accounts.find(a => a.currency === 'KRW');
    return krw ? parseFloat(krw.balance || '0') : 0;
  }

  // 2. 전체 마켓 목록 조회 (Public)
  async getMarkets(isDetails = false) {
    return await this.request('/market/all', 'GET', { isDetails: isDetails ? 'true' : 'false' }, false);
  }

  // 3. 현재가 시세 정보 조회 (Public)
  // markets: 'KRW-BTC' 또는 'KRW-BTC,KRW-ETH'
  async getTicker(markets) {
    const list = Array.isArray(markets) ? markets.join(',') : markets;
    return await this.request('/ticker', 'GET', { markets: list }, false);
  }

  // 4. 분봉 / 일봉 캔들 조회 (Public)
  // market: 'KRW-BTC', count: 1~200
  async getMinutesCandles(market, unit = 60, count = 24) {
    return await this.request(`/candles/minutes/${unit}`, 'GET', { market, count }, false);
  }

  async getDaysCandles(market, count = 30) {
    return await this.request('/candles/days', 'GET', { market, count }, false);
  }

  // 5. 주문 가능 정보 조회 (Private)
  async getOrderChance(market) {
    return await this.request('/orders/chance', 'GET', { market }, true);
  }

  // 6. 주문 발주 (Private)
  // side: 'bid' (매수), 'ask' (매도)
  // ord_type: 'limit' (지정가), 'price' (시장가 매수), 'market' (시장가 매도)
  // price: 지정가 금액 또는 시장가 매수 총액 (KRW)
  // volume: 수량 (코인 개수)
  async placeOrder({ market, side, volume, price, ord_type = 'limit' }) {
    const payload = {
      market,
      side,
      ord_type
    };

    if (volume !== undefined && volume !== null) payload.volume = String(volume);
    if (price !== undefined && price !== null) payload.price = String(price);

    return await this.request('/orders', 'POST', payload, true);
  }

  // 6-1. 시장가 분할 매수 헬퍼 (원화 금액 기준)
  async buyMarket(market, amountKrw) {
    return await this.placeOrder({
      market,
      side: 'bid',
      ord_type: 'price',
      price: Math.floor(amountKrw)
    });
  }

  // 6-2. 시장가 전량/분할 매도 헬퍼 (코인 수량 기준)
  async sellMarket(market, volume) {
    return await this.placeOrder({
      market,
      side: 'ask',
      ord_type: 'market',
      volume
    });
  }

  // 7. 개별 주문 상세 조회 (Private)
  async getOrder(uuid) {
    return await this.request('/order', 'GET', { uuid }, true);
  }

  // 8. 주문 목록 조회 (Private)
  // state: 'wait' (미체결), 'done' (체결완료), 'cancel' (취소됨)
  async getOrders({ market, state = 'wait', limit = 50 }) {
    const params = { state, limit };
    if (market) params.market = market;
    return await this.request('/orders', 'GET', params, true);
  }

  // 9. 주문 취소 (Private)
  async cancelOrder(uuid) {
    return await this.request('/order', 'DELETE', { uuid }, true);
  }
}

// 싱글톤 인스턴스
const bithumbClient = new BithumbClient();

module.exports = {
  BithumbClient,
  bithumbClient
};
