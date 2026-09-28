// app/utils/trendScraper.js - 실시간 트렌드 및 검색순위 수집/파싱 모듈 (Google Trends, BlackKiwi, Daum Cafe, Detailed.com)
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const vm = require('vm');

const PRESET_DETAILED_CATEGORIES = [
  { slug: 'tech-blogs', name: '💻 테크/IT (Tech)' },
  { slug: 'business-blogs', name: '🗃️ 비즈니스 (Business)' },
  { slug: 'marketing-blogs', name: '🚀 마케팅 (Marketing)' },
  { slug: 'seo-blogs', name: '📈 검색엔진 (SEO)' },
  { slug: 'web-development-blogs', name: '⚡ 웹개발 (Web Dev)' },
  { slug: 'finance-blogs', name: '💰 금융/재테크 (Finance)' },
  { slug: 'design-blogs', name: '🎨 디자인 (Design)' },
  { slug: 'gaming-blogs', name: '🎮 게임 (Gaming)' }
];

const PLAYBOARD_TOPICS = [
  { topicId: 'stocks', name: '주식투자', emoji: '📈' },
  { topicId: 'mukbang', name: '먹방', emoji: '🍜' },
  { topicId: 'cooking', name: '요리', emoji: '🍳' },
  { topicId: 'dog', name: '애견인', emoji: '🐶' },
  { topicId: 'cat', name: '냥집사', emoji: '🐱' },
  { topicId: 'camping', name: '캠핑', emoji: '⛺' },
  { topicId: 'v-tuber', name: 'V-Tuber', emoji: '🎭' },
  { topicId: 'fashion', name: '패션', emoji: '👗' },
  { topicId: 'cover-dance', name: '커버 댄스', emoji: '💃' },
  { topicId: 'home-workout', name: '홈트레이닝', emoji: '🏋️' },
  { topicId: 'lookbook', name: '룩북', emoji: '👠' },
  { topicId: 'makeup', name: '메이크업', emoji: '💄' },
  { topicId: 'cover-song', name: '노래 커버', emoji: '🎤' },
  { topicId: 'body-building', name: '보디빌딩', emoji: '💪' },
  { topicId: 'baking', name: '베이킹', emoji: '🧁' },
  { topicId: 'trucker', name: '트럭커', emoji: '🚚' },
  { topicId: 'sneakers', name: '스니커즈', emoji: '👟' }
];

class TrendScraper {
  constructor() {
    this.cacheFile = path.join(__dirname, '..', '..', 'data', 'trend_cache.json');
    this.cache = {
      google: [],
      blackkiwi: [],
      daum: [],
      detailedCategories: PRESET_DETAILED_CATEGORIES,
      detailedRankings: {}, // { [slug]: [...] }
      kyobo: [], // 📚 교보문고 종합 주간 베스트셀러
      playboard: [], // 🎬 플레이보드 토픽차트 분야별 1순위 채널들
      namu: [], // 🌳 나무위키 실시간 검색어 1~10위
      lastUpdated: null,
      isFetching: false
    };
    this.CACHE_TTL_MS = 15 * 60 * 1000; // 15분
    this.loadCacheFromFile();
  }

  loadCacheFromFile() {
    try {
      if (fs.existsSync(this.cacheFile)) {
        const raw = fs.readFileSync(this.cacheFile, 'utf8');
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          if (Array.isArray(parsed.google)) this.cache.google = parsed.google;
          if (Array.isArray(parsed.blackkiwi)) this.cache.blackkiwi = parsed.blackkiwi;
          if (Array.isArray(parsed.daum)) this.cache.daum = parsed.daum;
          if (Array.isArray(parsed.kyobo)) this.cache.kyobo = parsed.kyobo;
          if (Array.isArray(parsed.playboard)) this.cache.playboard = parsed.playboard;
          if (Array.isArray(parsed.namu)) this.cache.namu = parsed.namu;
          if (Array.isArray(parsed.detailedCategories) && parsed.detailedCategories.length > 0) {
            this.cache.detailedCategories = parsed.detailedCategories;
          }
          if (parsed.detailedRankings && typeof parsed.detailedRankings === 'object') {
            this.cache.detailedRankings = parsed.detailedRankings;
          }
          this.cache.lastUpdated = parsed.lastUpdated || Date.now();
          console.log('[TrendScraper] Loaded cached trends from file.');
        }
      }
    } catch (e) {
      console.warn('[TrendScraper] Failed to load cache from file:', e.message);
    }
  }

  saveCacheToFile() {
    try {
      const dir = path.dirname(this.cacheFile);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(this.cacheFile, JSON.stringify({
        google: this.cache.google,
        blackkiwi: this.cache.blackkiwi,
        daum: this.cache.daum,
        kyobo: this.cache.kyobo,
        playboard: this.cache.playboard,
        namu: this.cache.namu,
        detailedCategories: this.cache.detailedCategories,
        detailedRankings: this.cache.detailedRankings,
        lastUpdated: this.cache.lastUpdated
      }, null, 2), 'utf8');
    } catch (e) {
      console.warn('[TrendScraper] Failed to save cache to file:', e.message);
    }
  }

  /**
   * 1. Google Trends (한국) 실시간 검색어 RSS 수집
   */
  async fetchGoogleTrends() {
    const url = 'https://trends.google.co.kr/trending/rss?geo=KR';
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    if (!res.ok) throw new Error(`Google Trends RSS error: HTTP ${res.status}`);
    const xml = await res.text();

    const items = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
    let match;
    let rank = 1;

    while ((match = itemRegex.exec(xml)) !== null && rank <= 20) {
      const block = match[1];
      const titleMatch = block.match(/<title>([\s\S]*?)<\/title>/i);
      const trafficMatch = block.match(/<ht:approx_traffic>([\s\S]*?)<\/ht:approx_traffic>/i);
      const picMatch = block.match(/<ht:picture>([\s\S]*?)<\/ht:picture>/i);
      const newsTitleMatch = block.match(/<ht:news_item_title>([\s\S]*?)<\/ht:news_item_title>/i);
      const newsUrlMatch = block.match(/<ht:news_item_url>([\s\S]*?)<\/ht:news_item_url>/i);
      const newsSourceMatch = block.match(/<ht:news_item_source>([\s\S]*?)<\/ht:news_item_source>/i);
      const pubDateMatch = block.match(/<pubDate>([\s\S]*?)<\/pubDate>/i);

      const decodeXml = (str) => {
        if (!str) return '';
        return str
          .replace(/&apos;/g, "'")
          .replace(/&quot;/g, '"')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .trim();
      };

      const keyword = titleMatch ? decodeXml(titleMatch[1]) : '';
      if (!keyword) continue;

      items.push({
        rank: rank++,
        keyword: keyword,
        title: keyword,
        traffic: trafficMatch ? trafficMatch[1].trim() : '',
        description: newsTitleMatch ? decodeXml(newsTitleMatch[1]) : `구글 트렌드 급상승 검색어 (${keyword})`,
        sourceName: newsSourceMatch ? decodeXml(newsSourceMatch[1]) : 'Google Trends',
        link: newsUrlMatch ? decodeXml(newsUrlMatch[1]) : `https://trends.google.co.kr/trending?geo=KR`,
        thumbnail: picMatch ? picMatch[1].trim() : '',
        pubDate: pubDateMatch ? pubDateMatch[1].trim() : '',
        portalSearchUrl: `https://search.naver.com/search.naver?query=${encodeURIComponent(keyword)}`
      });
    }

    return items;
  }

  /**
   * 2. BlackKiwi 실시간 이슈 키워드 수집
   */
  async fetchBlackKiwi() {
    const url = 'https://blackkiwi.net/api/service/keyword/issue-keywords';
    const res = await fetch(url, {
      headers: {
        'Referer': 'https://blackkiwi.net/service/trend',
        'Origin': 'https://blackkiwi.net',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
        'Sec-Ch-Ua': '"Chromium";v="130", "Google Chrome";v="130", "Not?A_Brand";v="99"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"Windows"',
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'same-origin'
      }
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`BlackKiwi API error: HTTP ${res.status} (${errText.substring(0, 100)})`);
    }
    const json = await res.json();

    if (!Array.isArray(json)) return [];

    return json.slice(0, 20).map((item, idx) => {
      const kw = item.keyword || '';
      const trafficFormatted = typeof item.traffic === 'number' ? item.traffic.toLocaleString() : (item.traffic || '');
      return {
        rank: item.rank || (idx + 1),
        keyword: kw,
        title: kw,
        traffic: trafficFormatted ? `${trafficFormatted}회` : '',
        isNew: !!item.isNew,
        description: `블랙키위 실시간 급상승 키워드 · 검색 트래픽: ${trafficFormatted || '집계중'}${item.isNew ? ' (🔥 신규 진입)' : ''}`,
        sourceName: '블랙키위(BlackKiwi)',
        link: `https://blackkiwi.net/service/trend`,
        analysisUrl: `https://blackkiwi.net/service/keyword-analysis?keyword=${encodeURIComponent(kw)}`,
        portalSearchUrl: `https://search.naver.com/search.naver?query=${encodeURIComponent(kw)}`
      };
    });
  }

  /**
   * 3. Daum 카페 모바일 실시간 인기글 랭킹 수집
   */
  async fetchDaumCafe() {
    const url = 'https://m.cafe.daum.net/';
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1'
      }
    });
    if (!res.ok) throw new Error(`Daum Cafe error: HTTP ${res.status}`);
    const html = await res.text();

    const items = [];
    const hitRankBlockMatch = html.match(/<div[^>]*id=["']hit_rank["'][^>]*>([\s\S]*?)<\/ul>/i);
    const searchTarget = hitRankBlockMatch ? hitRankBlockMatch[1] : html;

    const liRegex = /<li[^>]*>([\s\S]*?)<\/li>/gi;
    let liMatch;
    let rank = 1;

    while ((liMatch = liRegex.exec(searchTarget)) !== null && rank <= 20) {
      const liContent = liMatch[1];
      if (liContent.includes('nativead-placeholder')) continue;

      const linkMatch = liContent.match(/<a[^>]*href=["']([^"']+)["'][^>]*class=["'][^"']*popular-list__link/i);
      const titleMatch = liContent.match(/<strong[^>]*class=["'][^"']*popular-list__title["'][^>]*>([\s\S]*?)<\/strong>/i);
      const cafeNameMatch = liContent.match(/<span[^>]*class=["'][^"']*popular-list__cafe-name["'][^>]*>([\s\S]*?)<\/span>\s*<\/div>/i) ||
                            liContent.match(/<span[^>]*class=["'][^"']*popular-list__cafe-name["'][^>]*>([\s\S]*?)<\/span>\s*<\/a>/i);
      const imgMatch = liContent.match(/<div[^>]*class=["'][^"']*popular-list__thumb-image["'][^>]*>[\s\S]*?<img[^>]*src=["']([^"']+)["']/i);

      const cleanText = (str) => {
        if (!str) return '';
        return str
          .replace(/<span[^>]*class=["']sr_only[^"']*["'][^>]*>[\s\S]*?<\/span>/gi, '')
          .replace(/<[^>]+>/g, '')
          .replace(/&apos;/g, "'")
          .replace(/&quot;/g, '"')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .trim();
      };

      const title = titleMatch ? cleanText(titleMatch[1]) : '';
      if (!title) continue;

      let href = linkMatch ? linkMatch[1].trim() : '';
      if (href && !href.startsWith('http')) {
        href = `https://m.cafe.daum.net${href.startsWith('/') ? '' : '/'}${href}`;
      }

      let thumb = imgMatch ? imgMatch[1].trim() : '';
      if (thumb && thumb.startsWith('//')) {
        thumb = `https:${thumb}`;
      }

      const cafeName = cafeNameMatch ? cleanText(cafeNameMatch[1]) : '다음 카페';

      items.push({
        rank: rank++,
        keyword: title,
        title: title,
        cafeName: cafeName,
        description: `출처: ${cafeName}`,
        sourceName: 'Daum 카페 인기글',
        link: href || 'https://m.cafe.daum.net/',
        thumbnail: thumb,
        portalSearchUrl: `https://search.daum.net/search?w=tot&q=${encodeURIComponent(title)}`
      });
    }

    return items;
  }

  /**
   * 4. Detailed.com 전체 분야(카테고리) 목록 수집
   */
  async fetchDetailedCategories() {
    try {
      const url = 'https://detailed.com/all/';
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36'
        }
      });
      if (!res.ok) throw new Error(`Detailed.com /all/ HTTP ${res.status}`);
      const html = await res.text();

      const catRegex = /<a href="https:\/\/detailed\.com\/([a-z0-9\-]+)\/"[^>]*class="[^"]*card[^"]*"[^>]*>[\s\S]*?<h5[^>]*>([\s\S]*?)<\/h5>[\s\S]*?<span class="minitxt">([\s\S]*?)<\/span>/gi;
      let m;
      const categories = [];
      const clean = (s) => (s || '').replace(/<[^>]+>/g, '').trim();

      while ((m = catRegex.exec(html)) !== null) {
        const slug = m[1];
        const name = clean(m[2]);
        const mentions = clean(m[3]);
        categories.push({ slug, name, mentions, url: `https://detailed.com/${slug}/` });
      }

      if (categories.length > 0) {
        this.cache.detailedCategories = categories;
        this.saveCacheToFile();
      }
      return this.cache.detailedCategories;
    } catch (e) {
      console.warn('[TrendScraper] fetchDetailedCategories error:', e.message);
      return this.cache.detailedCategories || PRESET_DETAILED_CATEGORIES;
    }
  }

  /**
   * 5. Detailed.com 특정 분야 웹사이트 랭킹 수집
   */
  async fetchDetailedRankings(categorySlug = 'tech-blogs') {
    const slug = (categorySlug || 'tech-blogs').toLowerCase();
    
    // 캐시 확인 (15분 이내)
    if (this.cache.detailedRankings[slug] && this.cache.detailedRankings[slug].length > 0) {
      return this.cache.detailedRankings[slug];
    }

    try {
      const url = `https://detailed.com/${slug}/`;
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36'
        }
      });
      if (!res.ok) throw new Error(`Detailed.com /${slug}/ HTTP ${res.status}`);
      const html = await res.text();

      const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
      let rowMatch;
      const rankings = [];
      const clean = (s) => (s || '').replace(/<[^>]+>/g, '').trim();

      while ((rowMatch = rowRegex.exec(html)) !== null && rankings.length < 20) {
        const row = rowMatch[1];

        // (A) Astro 또는 Legacy 블로그 테이블 (tech-blogs, business-blogs, marketing-blogs 등)
        if (row.includes('ranking-content') || row.includes('blog-content')) {
          const thumb = row.match(/<td[^>]*class="[^"]*(?:ranking-thumb|blog-thumbnail)[^"]*"[^>]*>[\s\S]*?<img[^>]*src="([^"]+)"/i)?.[1]?.trim() || '';
          const name = clean(row.match(/<h3[^>]*>([\s\S]*?)<\/h3>/i)?.[1]);
          const urlMatch = row.match(/<span[^>]*class="[^"]*(?:ranking-url|blog-url)[^"]*"[^>]*>[\s\S]*?<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i);
          const desc = clean(row.match(/<span[^>]*class="[^"]*(?:ranking-desc|blog-description)[^"]*"[^>]*>([\s\S]*?)<\/span>/i)?.[1]);
          
          let rankNum = rankings.length + 1;
          const rankMatch = row.match(/<span[^>]*class="[^"]*ranking-count-num[^"]*"[^>]*>([\s\S]*?)<\/span>/i) ||
                            row.match(/<td[^>]*class="[^"]*blog-rank[^"]*"[^>]*>([\s\S]*?)<\/td>/i);
          if (rankMatch) {
            const numOnly = clean(rankMatch[1]).match(/\d+/);
            if (numOnly) rankNum = parseInt(numOnly[0], 10);
          }

          const deltaMatch = row.match(/<span[^>]*class="[^"]*ranking-delta\s+([^"]+)"[^>]*>([\s\S]*?)<\/span>/i);
          let delta = '';
          let deltaType = 'same';
          if (deltaMatch) {
            delta = clean(deltaMatch[2]);
            if (deltaMatch[1].includes('up')) deltaType = 'up';
            else if (deltaMatch[1].includes('down')) deltaType = 'down';
          }

          const mentionsMatch = row.match(/<div class="ranking-stat"[^>]*>\s*<p class="ranking-count"[^>]*>([^<]+)<\/p>\s*<p class="ranking-stat-label"[^>]*>Mentions/i) ||
                                row.match(/<span class="mentions-number"[^>]*>([\s\S]*?)<\/span>/i) ||
                                row.match(/<span class="mentions"[^>]*>([\s\S]*?)<\/span>/i) ||
                                row.match(/([0-9,]+)\s*(?:weekly\s+)?mentions/i);

          let siteUrl = urlMatch?.[1]?.trim() || '';
          let domain = clean(urlMatch?.[2]);
          if (!domain && siteUrl) {
            try { domain = new URL(siteUrl).hostname; } catch(e) {}
          }

          if (name) {
            rankings.push({
              rank: rankNum,
              delta,
              deltaType,
              name,
              title: name,
              domain,
              siteUrl,
              link: siteUrl || `https://detailed.com/${slug}/`,
              description: desc,
              thumbnail: thumb,
              mentions: clean(mentionsMatch?.[1] || ''),
              categorySlug: slug,
              sourceName: 'Detailed.com'
            });
          }
        }
        // (B) GoliathTable (DataTables 스타일: seo-blogs, gaming-blogs 등)
        else if (row.includes('normalscore') && row.includes('<a') && !row.includes('<th')) {
          const rankNumMatch = row.match(/<span class="normalscore"[^>]*>(\d+)<\/span>/i);
          const linkMatch = row.match(/<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i);
          const trafficMatch = row.match(/<td><span class="normalscore"[^>]*>([0-9KkMm\-\+]+)<\/span><\/td>/i);
          const imgMatch = row.match(/<img[^>]*src="([^"]+)"[^>]*class="faviconcss"/i);

          if (linkMatch && rankNumMatch) {
            const name = clean(linkMatch[2]);
            const siteUrl = linkMatch[1].trim();
            let domain = '';
            try { domain = new URL(siteUrl).hostname; } catch(e) {}
            const traffic = trafficMatch ? trafficMatch[1] : '';

            rankings.push({
              rank: parseInt(rankNumMatch[1], 10),
              delta: '',
              deltaType: 'same',
              name,
              title: name,
              domain,
              siteUrl,
              link: siteUrl || `https://detailed.com/${slug}/`,
              description: `글로벌 상위권 웹사이트 · 월간 트래픽: ${traffic || '집계중'}`,
              thumbnail: imgMatch ? imgMatch[1].trim() : '',
              mentions: traffic ? `${traffic} Visits` : '',
              categorySlug: slug,
              sourceName: 'Detailed.com'
            });
          }
        }
      }

      if (rankings.length > 0) {
        this.cache.detailedRankings[slug] = rankings;
        this.saveCacheToFile();
      }
      return rankings;
    } catch (e) {
      console.warn(`[TrendScraper] fetchDetailedRankings(${slug}) error:`, e.message);
      return this.cache.detailedRankings[slug] || [];
    }
  }

  /**
   * 5. 교보문고 종합 주간 베스트셀러 1~20위 수집
   */
  async fetchKyoboBestseller() {
    try {
      const gwKey = "eyJhbGciOiJkaXIiLCJlbmMiOiJBMjU2R0NNIn0..S0B4X99lGSGM3zhQ.GsAnmM-T1czzytgGS9hJoLJE-yyPheCCgInDjxqV9SeBDXsgd7va9sU9x94rgEnMQd_tK7tWh0RF02y77u4vLgIWvJIxxogJScop2RRimTc7se3yyzcC9o7K407d42k_SZZDApW8.Uhc8D_kPTMQ34cpDlpcsBg";
      const url = 'https://store.kyobobook.co.kr/api/gw/best/best-seller/total?page=1&per=20&period=002&bsslBksClstCode=A';

      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Referer': 'https://store.kyobobook.co.kr/bestseller/total/weekly?period=002',
          'X-Api-Gw-Key': gwKey,
          'Accept': 'application/json, text/plain, */*',
          'Accept-Encoding': 'gzip, deflate'
        }
      });

      if (!res.ok) throw new Error(`Kyobo API HTTP ${res.status}`);

      const parsed = await res.json();
      const rawList = (parsed && parsed.data && Array.isArray(parsed.data.bestSeller)) ? parsed.data.bestSeller : [];

      const books = rawList.map((item, index) => {
        const rank = parseInt(item.prstRnkn, 10) || (index + 1);
        const formerRank = parseInt(item.frmrRnkn, 10) || 0;

        let delta = '';
        let deltaType = 'same';
        if (formerRank === 0) {
          delta = 'NEW';
          deltaType = 'new';
        } else if (rank < formerRank) {
          delta = `▲${formerRank - rank}`;
          deltaType = 'up';
        } else if (rank > formerRank) {
          delta = `▼${rank - formerRank}`;
          deltaType = 'down';
        } else {
          delta = '-';
          deltaType = 'same';
        }

        const price = parseInt(item.price || item.saleCmdtPrce || 0, 10);
        const salePrice = parseInt(item.sapr || item.saleCmdtSapr || price, 10);
        const discountRate = parseInt(item.dscnRate || 0, 10);
        const rating = item.buyRevwRvgr ? parseFloat(item.buyRevwRvgr).toFixed(1) : '9.5';
        const reviewCount = item.buyRevwNumc || 0;

        const thumbnail = item.cmdtCode 
          ? `https://contents.kyobobook.co.kr/sih/fit-in/200x0/pdt/${item.cmdtCode}.jpg`
          : (item.imgPath || '');

        return {
          rank,
          formerRank,
          delta,
          deltaType,
          title: item.cmdtName || '무제',
          author: item.chrcName || '저자 미상',
          publisher: item.pbcmName || '출판사',
          category: item.saleCmdtClstName || '종합 도서',
          price,
          salePrice,
          discountRate,
          rating,
          reviewCount,
          thumbnail,
          link: `https://product.kyobobook.co.kr/detail/${item.saleCmdtid}`,
          description: item.inbukCntt ? item.inbukCntt.trim() : '',
          sourceName: '교보문고 종합 베스트'
        };
      });

      if (books.length > 0) {
        this.cache.kyobo = books;
        this.saveCacheToFile();
      }
      return books;
    } catch (e) {
      console.warn('[TrendScraper] fetchKyoboBestseller error:', e.message);
      return this.cache.kyobo || [];
    }
  }

  /**
   * 6. 플레이보드 토픽차트 분야별 1순위 채널 수집
   */
  async fetchPlayboardTopics() {
    try {
      const results = await Promise.allSettled(PLAYBOARD_TOPICS.map(async (t, idx) => {
        const url = `https://playboard.co/youtube-ranking/most-popular-${t.topicId}-channels-in-south-korea-daily`;
        const res = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
          }
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const html = await res.text();
        const match = html.match(/<script>window\.__NUXT__\s*=\s*([\s\S]*?)<\/script>/);
        if (!match) throw new Error('Nuxt script missing');

        let jsCode = match[1].trim();
        if (jsCode.endsWith(';')) jsCode = jsCode.slice(0, -1);

        const sandbox = {};
        vm.createContext(sandbox);
        const nuxtResult = vm.runInContext(jsCode, sandbox);

        let topChannel = null;
        let latestVideo = null;

        if (nuxtResult && nuxtResult.fetch) {
          for (const key of Object.keys(nuxtResult.fetch)) {
            const f = nuxtResult.fetch[key];
            if (f && Array.isArray(f.list) && f.list.length > 0) {
              const item = f.list[0];
              topChannel = item.channel;
              const videos = item.videos || [];
              if (videos.length > 0) {
                latestVideo = {
                  title: videos[0].title || '',
                  videoId: videos[0].videoId || '',
                  playCount: videos[0].playCount || 0,
                  videoUrl: videos[0].videoId ? `https://www.youtube.com/watch?v=${videos[0].videoId}` : ''
                };
              }

              const rankFluc = (item.index && typeof item.index.rankFluc === 'number') ? item.index.rankFluc : 0;
              let delta = '-';
              let deltaType = 'same';
              if (rankFluc > 0) {
                delta = `▲${rankFluc}`;
                deltaType = 'up';
              } else if (rankFluc < 0) {
                delta = `▼${Math.abs(rankFluc)}`;
                deltaType = 'down';
              }

              return {
                rank: idx + 1,
                topicId: t.topicId,
                topicName: t.name,
                topicEmoji: t.emoji,
                channelId: topChannel ? topChannel.channelId : (item.itemId || ''),
                channelName: topChannel ? topChannel.name : '인기 채널',
                subscriberCount: topChannel ? (topChannel.subscriberCount || 0) : (item.subscriberCount || 0),
                dailyViews: item.pplay || 0,
                score: item.pscore || 0,
                delta,
                deltaType,
                thumbnail: topChannel ? topChannel.profileImagePath : '',
                keywords: (topChannel && Array.isArray(topChannel.keywords)) ? topChannel.keywords.slice(0, 5) : [],
                latestVideo,
                youtubeUrl: topChannel ? `https://www.youtube.com/channel/${topChannel.channelId}` : '',
                playboardUrl: topChannel ? `https://playboard.co/channel/${topChannel.channelId}` : url,
                sourceName: 'Playboard 토픽 1위',
                description: latestVideo ? `대표 영상: ${latestVideo.title}` : `${t.name} 분야 1위 채널`
              };
            }
          }
        }
        throw new Error('No channel list found in fetch');
      }));

      const successful = [];
      results.forEach((r, idx) => {
        if (r.status === 'fulfilled' && r.value) {
          successful.push(r.value);
        } else {
          const t = PLAYBOARD_TOPICS[idx];
          console.warn(`[TrendScraper] Failed to fetch topic ${t.topicId}:`, r.reason && r.reason.message);
        }
      });

      if (successful.length > 0) {
        this.cache.playboard = successful;
        this.saveCacheToFile();
      }
      return successful;
    } catch (e) {
      console.warn('[TrendScraper] fetchPlayboardTopics error:', e.message);
      return this.cache.playboard || [];
    }
  }

  /**
   * 7. 🌳 나무위키 실시간 검색어 (1~10위) 수집
   */
  async fetchNamuWiki() {
    try {
      const url = 'https://search.namu.wiki/api/ranking';
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept': 'application/json, text/plain, */*'
        },
        signal: AbortSignal.timeout(6000)
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const keywords = await res.json();
      if (Array.isArray(keywords) && keywords.length > 0) {
        const rankings = keywords.slice(0, 10).map((kw, idx) => ({
          rank: idx + 1,
          keyword: kw,
          title: kw,
          sourceName: '나무위키 실검',
          link: `https://namu.wiki/w/${encodeURIComponent(kw)}`,
          portalSearchUrl: `https://search.daum.net/search?w=tot&q=${encodeURIComponent(kw)}`,
          description: `나무위키 실시간 인기 검색어 ${idx + 1}위`,
          type: 'namu'
        }));
        this.cache.namu = rankings;
        this.saveCacheToFile();
        return rankings;
      }
    } catch (e) {
      console.warn('[TrendScraper] Failed to fetch NamuWiki rankings:', e.message);
    }
    return this.cache.namu || [];
  }

  /**
   * 전체 동기화 실행 (기존 사이트 + Detailed + 교보문고 + Playboard 토픽 1위 + 나무위키)
   */
  async syncAll(force = false) {
    const now = Date.now();
    if (!force && this.cache.lastUpdated && (now - this.cache.lastUpdated < this.CACHE_TTL_MS)) {
      return this.cache;
    }

    if (this.cache.isFetching) {
      return this.cache;
    }

    this.cache.isFetching = true;

    try {
      const [googleRes, blackkiwiRes, daumRes, kyoboRes, playboardRes, namuRes, detailedCatRes, techRes, bizRes, mktRes] = await Promise.allSettled([
        this.fetchGoogleTrends(),
        this.fetchBlackKiwi(),
        this.fetchDaumCafe(),
        this.fetchKyoboBestseller(),
        this.fetchPlayboardTopics(),
        this.fetchNamuWiki(),
        this.fetchDetailedCategories(),
        this.fetchDetailedRankings('tech-blogs'),
        this.fetchDetailedRankings('business-blogs'),
        this.fetchDetailedRankings('marketing-blogs')
      ]);

      if (googleRes.status === 'fulfilled' && googleRes.value.length > 0) {
        this.cache.google = googleRes.value;
      }
      if (blackkiwiRes.status === 'fulfilled' && blackkiwiRes.value.length > 0) {
        this.cache.blackkiwi = blackkiwiRes.value;
      }
      if (daumRes.status === 'fulfilled' && daumRes.value.length > 0) {
        this.cache.daum = daumRes.value;
      }
      if (kyoboRes.status === 'fulfilled' && kyoboRes.value.length > 0) {
        this.cache.kyobo = kyoboRes.value;
      }
      if (playboardRes.status === 'fulfilled' && playboardRes.value.length > 0) {
        this.cache.playboard = playboardRes.value;
      }
      if (namuRes.status === 'fulfilled' && namuRes.value.length > 0) {
        this.cache.namu = namuRes.value;
      }

      this.cache.lastUpdated = now;
      this.saveCacheToFile();
      console.log(`[TrendScraper] Sync completed at ${new Date().toISOString()} (Google: ${this.cache.google.length}, BlackKiwi: ${this.cache.blackkiwi.length}, Daum: ${this.cache.daum.length}, Kyobo: ${this.cache.kyobo.length}, Playboard: ${this.cache.playboard.length}, Namu: ${this.cache.namu.length}, Detailed: ${Object.keys(this.cache.detailedRankings).length} cats)`);
    } catch (err) {
      console.error('[TrendScraper] Sync error:', err.message);
    } finally {
      this.cache.isFetching = false;
    }

    return this.cache;
  }

  /**
   * 캐시 데이터 가져오기
   */
  async getData() {
    if (!this.cache.lastUpdated) {
      return await this.syncAll(true);
    }
    // 백그라운드 갱신 체크
    if (Date.now() - this.cache.lastUpdated >= this.CACHE_TTL_MS) {
      this.syncAll(true).catch(e => console.warn('[TrendScraper] Background sync error:', e.message));
    }
    return this.cache;
  }
}

module.exports = new TrendScraper();
