// app/core/config.js - 기본 설정 및 상수 (글로벌 호환)

window.CONFIG = {
  STORAGE_KEY: 'portal_api_items',
  DEFAULT_CATEGORIES: ['AI / LLM', '지도 / 위치', '날씨', '소셜 / 인증', '기타'],
  get INITIAL_APIS() {
    return window.PORTAL_DATA_APIS || [];
  }
};
