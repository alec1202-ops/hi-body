-- Hi Body Database Schema
-- Run this in Supabase SQL Editor

-- Profiles (extends auth.users)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  name TEXT DEFAULT '',
  age INTEGER,
  gender TEXT DEFAULT 'male',
  height DECIMAL,
  weight DECIMAL,
  target_weight DECIMAL,
  activity_level TEXT DEFAULT 'moderate',
  goal TEXT DEFAULT 'lose',
  daily_calorie_target INTEGER DEFAULT 0,
  daily_protein_target INTEGER DEFAULT 0,
  custom_bmr INTEGER,
  strava_access_token TEXT,
  strava_refresh_token TEXT,
  strava_expires_at BIGINT,
  strava_athlete_name TEXT,
  strava_athlete_id BIGINT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Food entries
CREATE TABLE food_entries (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date TEXT NOT NULL,
  meal_type TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'solid',
  calories DECIMAL DEFAULT 0,
  protein DECIMAL DEFAULT 0,
  carbs DECIMAL DEFAULT 0,
  fat DECIMAL DEFAULT 0,
  serving_size TEXT DEFAULT '',
  favorite_meal_id TEXT,
  estimated_by_ai BOOLEAN DEFAULT FALSE,
  timestamp TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Exercise entries
CREATE TABLE exercise_entries (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'other',
  duration INTEGER DEFAULT 0,
  calories_burned INTEGER DEFAULT 0,
  notes TEXT,
  estimated_by_ai BOOLEAN DEFAULT FALSE,
  timestamp TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Weight entries
CREATE TABLE weight_entries (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date TEXT NOT NULL,
  weight DECIMAL NOT NULL,
  body_fat DECIMAL,
  muscle_mass DECIMAL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Favorite meals
CREATE TABLE favorite_meals (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'solid',
  calories DECIMAL DEFAULT 0,
  protein DECIMAL DEFAULT 0,
  carbs DECIMAL DEFAULT 0,
  fat DECIMAL DEFAULT 0,
  serving_size TEXT DEFAULT '',
  aliases TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE food_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE weight_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorite_meals ENABLE ROW LEVEL SECURITY;

-- RLS Policies (each user can only access their own data)
CREATE POLICY "own profile" ON profiles FOR ALL USING (auth.uid() = id);
CREATE POLICY "own food" ON food_entries FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own exercise" ON exercise_entries FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own weight" ON weight_entries FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own favorites" ON favorite_meals FOR ALL USING (auth.uid() = user_id);

-- Auto-create profile row when user signs up
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id) VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE handle_new_user();
