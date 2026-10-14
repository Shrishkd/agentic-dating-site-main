-- ==============================================================================
-- Supabase PostgreSQL Schema for AgentMatch
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. People table
CREATE TABLE IF NOT EXISTS people (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    linkedin_url TEXT NOT NULL,
    instagram_url TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'scraping', 'scraped', 'analyzing', 'analyzed', 'failed', 'instagram_private'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Raw Scraped Data table
CREATE TABLE IF NOT EXISTS raw_data (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    person_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
    source TEXT NOT NULL, -- 'linkedin' | 'instagram'
    json_data JSONB NOT NULL,
    scraped_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_raw_data_person_id ON raw_data(person_id);

-- 3. Persona Profiles table
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    person_id UUID NOT NULL UNIQUE REFERENCES people(id) ON DELETE CASCADE,
    summary TEXT NOT NULL,
    needs JSONB NOT NULL DEFAULT '[]'::jsonb,
    hobbies JSONB NOT NULL DEFAULT '[]'::jsonb,
    interests JSONB NOT NULL DEFAULT '[]'::jsonb,
    values JSONB NOT NULL DEFAULT '[]'::jsonb,
    personality_traits JSONB NOT NULL DEFAULT '[]'::jsonb,
    communication_style TEXT NOT NULL,
    lifestyle TEXT NOT NULL,
    looking_for TEXT NOT NULL,
    deal_breakers JSONB NOT NULL DEFAULT '[]'::jsonb,
    evidence JSONB NOT NULL DEFAULT '[]'::jsonb,
    confidence_scores JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Date Sessions table
CREATE TABLE IF NOT EXISTS dates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    person_a_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
    person_b_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
    venue TEXT,
    transcript JSONB,
    score_a_to_b NUMERIC(5, 2),
    score_b_to_a NUMERIC(5, 2),
    reason_a TEXT,
    reason_b TEXT,
    highlights JSONB DEFAULT '[]'::jsonb,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'failed'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_dates_person_a ON dates(person_a_id);
CREATE INDEX IF NOT EXISTS idx_dates_person_b ON dates(person_b_id);

-- 5. Rankings table
CREATE TABLE IF NOT EXISTS rankings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    person_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
    ranked_person_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
    rank INTEGER NOT NULL,
    final_score NUMERIC(5, 2) NOT NULL,
    explanation TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_rankings_person ON rankings(person_id);
CREATE INDEX IF NOT EXISTS idx_rankings_ranked_person ON rankings(ranked_person_id);

-- 6. LLM Hash Cache table
CREATE TABLE IF NOT EXISTS llm_cache (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    input_hash TEXT NOT NULL UNIQUE,
    output TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_llm_cache_hash ON llm_cache(input_hash);
