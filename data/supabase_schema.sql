-- PORTAL BANG - Supabase DB 테이블 및 보안 정책 자동 생성 SQL
-- Supabase Dashboard -> SQL Editor 에서 전체 복사 후 [Run] 버튼을 누르시면 됩니다.

-- 1. apis 테이블
CREATE TABLE IF NOT EXISTS public.apis (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    category TEXT,
    service_url TEXT,
    description TEXT,
    tags JSONB DEFAULT '[]'::jsonb,
    is_notice BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. ai_models 테이블
CREATE TABLE IF NOT EXISTS public.ai_models (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    category TEXT,
    provider TEXT,
    specs JSONB DEFAULT '{}'::jsonb,
    description TEXT,
    tags JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. ai_terms 테이블
CREATE TABLE IF NOT EXISTS public.ai_terms (
    id TEXT PRIMARY KEY,
    term TEXT NOT NULL,
    definition TEXT,
    category TEXT,
    tags JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. sap_terms 테이블
CREATE TABLE IF NOT EXISTS public.sap_terms (
    id TEXT PRIMARY KEY,
    term TEXT NOT NULL,
    definition TEXT,
    category TEXT,
    tags JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. ip_rules 테이블
CREATE TABLE IF NOT EXISTS public.ip_rules (
    id BIGSERIAL PRIMARY KEY,
    ip_address TEXT NOT NULL,
    rule_type TEXT CHECK (rule_type IN ('allowed', 'blocked')),
    memo TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. agent_workflows 테이블
CREATE TABLE IF NOT EXISTS public.agent_workflows (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    workflow_data JSONB DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. stock_temp 테이블 (K증시 온도)
CREATE TABLE IF NOT EXISTS public.stock_temp (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    datetime TEXT,
    title TEXT NOT NULL,
    good_count INT DEFAULT 50,
    bad_count INT DEFAULT 50,
    temp INT DEFAULT 50,
    summary TEXT,
    detail TEXT,
    tags JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. sap_news 테이블 (SAP 최신 소식 및 릴리스 피드)
CREATE TABLE IF NOT EXISTS public.sap_news (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    source TEXT NOT NULL,
    source_url TEXT UNIQUE NOT NULL,
    category TEXT NOT NULL,
    summary TEXT NOT NULL,
    published_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. sap_knowledge 테이블 (SAP Cloud Integration 개발/컨설팅 지식베이스)
CREATE TABLE IF NOT EXISTS public.sap_knowledge (
    id TEXT PRIMARY KEY,
    topic TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    doc_url TEXT,
    tags JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 모든 사용자가 자유롭게 읽기/쓰기/수정/삭제 가능하도록 RLS (Row Level Security) 설정
ALTER TABLE public.apis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sap_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ip_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_temp ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sap_news ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sap_knowledge ENABLE ROW LEVEL SECURITY;

-- 익명/인증 사용자 모두에게 전체 CRUD 허용 정책 생성
CREATE POLICY "Public Read/Write for apis" ON public.apis FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Read/Write for ai_models" ON public.ai_models FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Read/Write for ai_terms" ON public.ai_terms FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Read/Write for sap_terms" ON public.sap_terms FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Read/Write for ip_rules" ON public.ip_rules FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Read/Write for agent_workflows" ON public.agent_workflows FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Read/Write for stock_temp" ON public.stock_temp FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Read/Write for sap_news" ON public.sap_news FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Read/Write for sap_knowledge" ON public.sap_knowledge FOR ALL USING (true) WITH CHECK (true);

-- Realtime 동기화 활성화
ALTER PUBLICATION supabase_realtime ADD TABLE public.apis;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_models;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_terms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sap_terms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ip_rules;
ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_workflows;
ALTER PUBLICATION supabase_realtime ADD TABLE public.stock_temp;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sap_news;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sap_knowledge;

