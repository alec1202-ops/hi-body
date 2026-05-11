-- Migration 001: patch missing columns and tables
-- Run this in Supabase SQL Editor if you already have the base schema applied.

-- weight_entries: add missing body composition columns
ALTER TABLE weight_entries
  ADD COLUMN IF NOT EXISTS bmi DECIMAL,
  ADD COLUMN IF NOT EXISTS bone_mass DECIMAL,
  ADD COLUMN IF NOT EXISTS body_water DECIMAL;

-- health_reports: full table (was missing from original schema)
CREATE TABLE IF NOT EXISTS health_reports (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date TEXT NOT NULL,
  -- Hormones & metabolism
  testosterone DECIMAL,
  free_testosterone DECIMAL,
  tsh DECIMAL,
  t3 DECIMAL,
  t4 DECIMAL,
  cortisol DECIMAL,
  fasting_insulin DECIMAL,
  fasting_glucose DECIMAL,
  homa_ir DECIMAL,
  -- Nutrients
  vitamin_d DECIMAL,
  ferritin DECIMAL,
  hemoglobin DECIMAL,
  vitamin_b12 DECIMAL,
  zinc DECIMAL,
  rbc_magnesium DECIMAL,
  -- Inflammation & recovery
  hs_crp DECIMAL,
  uric_acid DECIMAL,
  creatine_kinase DECIMAL,
  -- Liver & kidney
  got DECIMAL,
  gpt DECIMAL,
  creatinine DECIMAL,
  egfr DECIMAL,
  -- Lipids
  total_cholesterol DECIMAL,
  ldl DECIMAL,
  hdl DECIMAL,
  triglycerides DECIMAL,
  -- Misc
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE health_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own health_reports" ON health_reports FOR ALL USING (auth.uid() = user_id);

-- food_entries: add ai_feedback column
ALTER TABLE food_entries
  ADD COLUMN IF NOT EXISTS ai_feedback TEXT CHECK (ai_feedback IN ('accurate', 'inaccurate'));

-- profiles: add daily_water_target column
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS daily_water_target INTEGER DEFAULT 2000;

-- water_entries: new table for daily hydration tracking
CREATE TABLE IF NOT EXISTS water_entries (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date TEXT NOT NULL,
  amount INTEGER NOT NULL, -- ml
  timestamp TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE water_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own water_entries" ON water_entries FOR ALL USING (auth.uid() = user_id);
