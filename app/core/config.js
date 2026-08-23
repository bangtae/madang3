// app/core/config.js - 기본 설정 및 상수 (글로벌 호환)

window.CONFIG = {
  STORAGE_KEY: 'portal_api_items',
  DEFAULT_CATEGORIES: ['AI / LLM', '지도 / 위치', '날씨', '소셜 / 인증', '기타'],
  
  // Supabase 클라우드 DB 접속 설정 (공용 DB 연동)
  SUPABASE_URL: window.ENV_SUPABASE_URL || 'https://vouwdahhvvfxlcpyywij.supabase.co',
  SUPABASE_ANON_KEY: window.ENV_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZvdXdkYWhodnZmeGxjcHl5d2lqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcyMzM4NDEsImV4cCI6MjEwMjgwOTg0MX0.L4Jh3gNS3p21S3skGnP_r2ID6cuaQuuIPNoFSy-IETw',

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

