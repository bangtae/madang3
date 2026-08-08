// app/core/config.js - 기본 설정 및 상수 (글로벌 호환)

window.CONFIG = {
  STORAGE_KEY: 'portal_api_items',
  DEFAULT_CATEGORIES: ['AI / LLM', '지도 / 위치', '날씨', '소셜 / 인증', '기타'],
  INITIAL_APIS: [
    {
      id: 'api_demo_1',
      title: 'Kakao Maps API',
      serviceUrl: 'https://dapi.kakao.com/v2/maps/sdk.js',
      docsUrl: 'https://apis.map.kakao.com/web/documentation/',
      category: '지도 / 위치',
      createdAt: '2026-08-05T00:00:00.000Z'
    },
    {
      id: 'api_demo_2',
      title: 'OpenAI API',
      serviceUrl: 'https://api.openai.com/v1',
      docsUrl: 'https://platform.openai.com/docs/api-reference',
      category: 'AI / LLM',
      createdAt: '2026-08-05T01:00:00.000Z'
    }
  ]
};
