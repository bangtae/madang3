// app/utils/llmHelper.js - LLM 자동 카테고리 추천 유틸리티

window.LlmHelper = {
  /**
   * 입력된 URL 패턴을 기반으로 적절한 카테고리를 추론/추천
   * @param {string} serviceUrl 
   * @param {string} docsUrl 
   * @returns {Promise<string>}
   */
  async recommendCategory(serviceUrl, docsUrl) {
    const textToAnalyze = `${serviceUrl} ${docsUrl}`.toLowerCase();

    // 1단계: 도메인 및 키워드 기반 스마트 분류 규칙
    if (textToAnalyze.includes('openai') || textToAnalyze.includes('ai') || textToAnalyze.includes('claude') || textToAnalyze.includes('gemini') || textToAnalyze.includes('gpt')) {
      return 'AI / LLM';
    }
    if (textToAnalyze.includes('map') || textToAnalyze.includes('location') || textToAnalyze.includes('gis') || textToAnalyze.includes('kakao.com/v2/maps') || textToAnalyze.includes('naver')) {
      return '지도 / 위치';
    }
    if (textToAnalyze.includes('weather') || textToAnalyze.includes('forecast') || textToAnalyze.includes('climate')) {
      return '날씨 / 기상';
    }
    if (textToAnalyze.includes('auth') || textToAnalyze.includes('oauth') || textToAnalyze.includes('login') || textToAnalyze.includes('social')) {
      return '소셜 / 인증';
    }
    if (textToAnalyze.includes('pay') || textToAnalyze.includes('toss') || textToAnalyze.includes('stripe') || textToAnalyze.includes('billing')) {
      return '결제 / 금융';
    }
    if (textToAnalyze.includes('database') || textToAnalyze.includes('supabase') || textToAnalyze.includes('firebase')) {
      return '백엔드 / DB';
    }

    return '개발 도구';
  }
};
