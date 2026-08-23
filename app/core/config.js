// app/core/config.js - 기본 설정 및 상수 (글로벌 호환)

window.CONFIG = {
  STORAGE_KEY: 'portal_api_items',
  DEFAULT_CATEGORIES: ['AI / LLM', '지도 / 위치', '날씨', '소셜 / 인증', '기타'],
  
  // Supabase 클라우드 DB 접속 설정 (환경변수 또는 지정된 템플릿 키 활용)
  SUPABASE_URL: window.ENV_SUPABASE_URL || 'https://your-supabase-project.supabase.co',
  SUPABASE_ANON_KEY: window.ENV_SUPABASE_ANON_KEY || 'your-supabase-anon-key',

  get INITIAL_APIS() {
    return window.PORTAL_DATA_APIS || [];
  }
};

/**
 * Supabase DB 클라이언트 생성 유틸리티
 */
window.getSupabaseClient = function() {
  if (window._supabaseInstance) return window._supabaseInstance;

  const url = window.CONFIG.SUPABASE_URL;
  const key = window.CONFIG.SUPABASE_ANON_KEY;

  if (window.supabase && url && key && !url.includes('your-supabase-project')) {
    try {
      window._supabaseInstance = window.supabase.createClient(url, key);
      return window._supabaseInstance;
    } catch (e) {
      console.warn('Supabase 초기화 실패 (로컬 Fallback 모드 작동):', e);
    }
  }
  return null;
};

/**
 * Supabase DB 활성화 여부 확인
 */
window.isSupabaseEnabled = function() {
  return window.getSupabaseClient() !== null;
};

