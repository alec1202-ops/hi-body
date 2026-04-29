/**
 * Supabase database helpers — all CRUD operations for cloud sync.
 * Each function is fire-and-forget safe (silent on error).
 */
import { supabase } from './supabase';
import type { UserProfile, FoodEntry, ExerciseEntry, WeightEntry, FavoriteMeal, StravaTokens } from '@/types';

// ─── Profile ─────────────────────────────────────────────────────────────────

export async function upsertProfile(userId: string, profile: UserProfile) {
  await supabase.from('profiles').upsert({
    id: userId,
    name: profile.name,
    age: profile.age,
    gender: profile.gender,
    height: profile.height,
    weight: profile.weight,
    target_weight: profile.targetWeight,
    activity_level: profile.activityLevel,
    goal: profile.goal,
    daily_calorie_target: profile.dailyCalorieTarget,
    daily_protein_target: profile.dailyProteinTarget,
    custom_bmr: profile.customBMR ?? null,
    updated_at: new Date().toISOString(),
  });
}

export async function fetchProfile(userId: string): Promise<UserProfile | null> {
  const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
  if (!data) return null;
  return {
    name: data.name ?? '',
    age: data.age ?? 25,
    gender: data.gender ?? 'male',
    height: data.height ?? 170,
    weight: data.weight ?? 70,
    targetWeight: data.target_weight ?? 65,
    activityLevel: data.activity_level ?? 'moderate',
    goal: data.goal ?? 'lose',
    dailyCalorieTarget: data.daily_calorie_target ?? 0,
    dailyProteinTarget: data.daily_protein_target ?? 0,
    customBMR: data.custom_bmr ?? undefined,
  };
}

// ─── Strava Tokens ────────────────────────────────────────────────────────────

export async function upsertStravaTokens(userId: string, tokens: StravaTokens | null) {
  await supabase.from('profiles').update({
    strava_access_token: tokens?.accessToken ?? null,
    strava_refresh_token: tokens?.refreshToken ?? null,
    strava_expires_at: tokens?.expiresAt ?? null,
    strava_athlete_name: tokens?.athleteName ?? null,
    strava_athlete_id: tokens?.athleteId ?? null,
  }).eq('id', userId);
}

export async function fetchStravaTokens(userId: string): Promise<StravaTokens | null> {
  const { data } = await supabase
    .from('profiles')
    .select('strava_access_token, strava_refresh_token, strava_expires_at, strava_athlete_name, strava_athlete_id')
    .eq('id', userId)
    .single();
  if (!data?.strava_access_token) return null;
  return {
    accessToken: data.strava_access_token,
    refreshToken: data.strava_refresh_token,
    expiresAt: data.strava_expires_at,
    athleteName: data.strava_athlete_name ?? '',
    athleteId: data.strava_athlete_id ?? 0,
  };
}

// ─── Food Entries ─────────────────────────────────────────────────────────────

export async function upsertFoodEntry(userId: string, entry: FoodEntry) {
  await supabase.from('food_entries').upsert({
    id: entry.id,
    user_id: userId,
    date: entry.date,
    meal_type: entry.mealType,
    name: entry.name,
    category: entry.category,
    calories: entry.nutrition.calories,
    protein: entry.nutrition.protein,
    carbs: entry.nutrition.carbs,
    fat: entry.nutrition.fat,
    serving_size: entry.servingSize,
    favorite_meal_id: entry.favoriteMealId ?? null,
    estimated_by_ai: entry.estimatedByAI,
    timestamp: entry.timestamp,
  });
}

export async function deleteFoodEntryDb(id: string) {
  await supabase.from('food_entries').delete().eq('id', id);
}

export async function fetchFoodEntries(userId: string): Promise<FoodEntry[]> {
  const { data } = await supabase.from('food_entries').select('*').eq('user_id', userId);
  if (!data) return [];
  return data.map((r) => ({
    id: r.id,
    date: r.date,
    mealType: r.meal_type,
    name: r.name,
    category: r.category,
    nutrition: { calories: r.calories, protein: r.protein, carbs: r.carbs, fat: r.fat },
    servingSize: r.serving_size ?? '',
    favoriteMealId: r.favorite_meal_id ?? undefined,
    estimatedByAI: r.estimated_by_ai,
    timestamp: r.timestamp,
  }));
}

// ─── Exercise Entries ─────────────────────────────────────────────────────────

export async function upsertExerciseEntry(userId: string, entry: ExerciseEntry) {
  await supabase.from('exercise_entries').upsert({
    id: entry.id,
    user_id: userId,
    date: entry.date,
    name: entry.name,
    type: entry.type,
    duration: entry.duration,
    calories_burned: entry.caloriesBurned,
    notes: entry.notes ?? null,
    estimated_by_ai: entry.estimatedByAI,
    timestamp: entry.timestamp,
  });
}

export async function deleteExerciseEntryDb(id: string) {
  await supabase.from('exercise_entries').delete().eq('id', id);
}

export async function fetchExerciseEntries(userId: string): Promise<ExerciseEntry[]> {
  const { data } = await supabase.from('exercise_entries').select('*').eq('user_id', userId);
  if (!data) return [];
  return data.map((r) => ({
    id: r.id,
    date: r.date,
    name: r.name,
    type: r.type,
    duration: r.duration,
    caloriesBurned: r.calories_burned,
    notes: r.notes ?? undefined,
    estimatedByAI: r.estimated_by_ai,
    timestamp: r.timestamp,
  }));
}

// ─── Weight Entries ───────────────────────────────────────────────────────────

export async function upsertWeightEntry(userId: string, entry: WeightEntry) {
  await supabase.from('weight_entries').upsert({
    id: entry.id,
    user_id: userId,
    date: entry.date,
    weight: entry.weight,
    bmi: entry.bmi ?? null,
    body_fat: entry.bodyFat ?? null,
    muscle_mass: entry.muscleMass ?? null,
    bone_mass: entry.boneMass ?? null,
    body_water: entry.bodyWater ?? null,
    notes: entry.notes ?? null,
  });
}

export async function deleteWeightEntryDb(id: string) {
  await supabase.from('weight_entries').delete().eq('id', id);
}

export async function fetchWeightEntries(userId: string): Promise<WeightEntry[]> {
  const { data } = await supabase.from('weight_entries').select('*').eq('user_id', userId);
  if (!data) return [];
  return data.map((r) => ({
    id: r.id,
    date: r.date,
    weight: r.weight,
    bmi: r.bmi ?? undefined,
    bodyFat: r.body_fat ?? undefined,
    muscleMass: r.muscle_mass ?? undefined,
    boneMass: r.bone_mass ?? undefined,
    bodyWater: r.body_water ?? undefined,
    notes: r.notes ?? undefined,
  }));
}

// ─── Favorite Meals ───────────────────────────────────────────────────────────

export async function upsertFavoriteMeal(userId: string, meal: FavoriteMeal) {
  await supabase.from('favorite_meals').upsert({
    id: meal.id,
    user_id: userId,
    name: meal.name,
    category: meal.category,
    calories: meal.nutrition.calories,
    protein: meal.nutrition.protein,
    carbs: meal.nutrition.carbs,
    fat: meal.nutrition.fat,
    serving_size: meal.servingSize,
    aliases: meal.aliases,
    created_at: meal.createdAt,
  });
}

export async function deleteFavoriteMealDb(id: string) {
  await supabase.from('favorite_meals').delete().eq('id', id);
}

export async function fetchFavoriteMeals(userId: string): Promise<FavoriteMeal[]> {
  const { data } = await supabase.from('favorite_meals').select('*').eq('user_id', userId);
  if (!data) return [];
  return data.map((r) => ({
    id: r.id,
    name: r.name,
    category: r.category,
    nutrition: { calories: r.calories, protein: r.protein, carbs: r.carbs, fat: r.fat },
    servingSize: r.serving_size ?? '',
    aliases: r.aliases ?? [],
    createdAt: r.created_at,
  }));
}

// ─── Load All Data ────────────────────────────────────────────────────────────

export async function fetchAllUserData(userId: string) {
  const [profile, foodEntries, exerciseEntries, weightEntries, favoriteMeals, stravaTokens] =
    await Promise.all([
      fetchProfile(userId),
      fetchFoodEntries(userId),
      fetchExerciseEntries(userId),
      fetchWeightEntries(userId),
      fetchFavoriteMeals(userId),
      fetchStravaTokens(userId),
    ]);
  return { profile, foodEntries, exerciseEntries, weightEntries, favoriteMeals, stravaTokens };
}
