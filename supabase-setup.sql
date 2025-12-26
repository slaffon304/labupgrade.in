-- ============================================
-- Supabase Setup SQL для consultation_requests
-- ============================================
-- Скопируйте и выполните этот скрипт в SQL Editor Supabase

-- Создание таблицы consultation_requests
CREATE TABLE IF NOT EXISTS public.consultation_requests (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamptz DEFAULT now() NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    phone text NOT NULL,
    telegram text,
    business_type text NOT NULL,
    page_path text,
    page_lang text,
    utm_source text,
    utm_medium text,
    utm_campaign text,
    user_agent text,
    ip_hash text,
    status text DEFAULT 'new' NOT NULL
);

-- Создание индексов для оптимизации запросов
CREATE INDEX IF NOT EXISTS idx_consultation_requests_created_at ON public.consultation_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_consultation_requests_email ON public.consultation_requests(email);
CREATE INDEX IF NOT EXISTS idx_consultation_requests_phone ON public.consultation_requests(phone);
CREATE INDEX IF NOT EXISTS idx_consultation_requests_status ON public.consultation_requests(status);

-- Включение Row Level Security (RLS)
ALTER TABLE public.consultation_requests ENABLE ROW LEVEL SECURITY;

-- Удаление существующих политик (если есть)
DROP POLICY IF EXISTS "Allow anonymous INSERT" ON public.consultation_requests;
DROP POLICY IF EXISTS "Deny anonymous SELECT" ON public.consultation_requests;
DROP POLICY IF EXISTS "Deny anonymous UPDATE" ON public.consultation_requests;
DROP POLICY IF EXISTS "Deny anonymous DELETE" ON public.consultation_requests;

-- Политика: разрешить INSERT для анонимных пользователей (public)
CREATE POLICY "Allow anonymous INSERT" ON public.consultation_requests
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

-- Политика: запретить SELECT для анонимных пользователей
CREATE POLICY "Deny anonymous SELECT" ON public.consultation_requests
    FOR SELECT
    TO anon
    USING (false);

-- Политика: запретить UPDATE для анонимных пользователей
CREATE POLICY "Deny anonymous UPDATE" ON public.consultation_requests
    FOR UPDATE
    TO anon
    USING (false);

-- Политика: запретить DELETE для анонимных пользователей
CREATE POLICY "Deny anonymous DELETE" ON public.consultation_requests
    FOR DELETE
    TO anon
    USING (false);

-- Примечание: Аутентифицированные пользователи (authenticated) могут иметь свои политики
-- для чтения/обновления данных, если это необходимо для админ-панели

