'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  UserProfile,
  FavoriteMeal,
  FoodEntry,
  ExerciseEntry,
  WeightEntry,
  DailySummary,
  StravaTokens,
  HealthReport,
  WaterEntry,
  SupplementEntry,
  SupplementTemplate,
} from '@/types';
import * as db from './db';

interface AppState {
  profile: UserProfile | null;
  favoriteMeals: FavoriteMeal[];
  foodEntries: FoodEntry[];
  exerciseEntries: ExerciseEntry[];
  weightEntries: WeightEntry[];
  healthReports: HealthReport[];
  waterEntries: WaterEntry[];
  stravaTokens: StravaTokens | null;
  supplementEntries: SupplementEntry[];
  supplementTemplates: SupplementTemplate[];
  userId: string | null; // current logged-in user
  tdeeReminderDismissedWeight: number | null; // weight at time of last dismissal

  setUserId: (id: string | null) => void;
  loadFromCloud: (userId: string) => Promise<void>;
  clearLocalData: () => void;

  setProfile: (profile: UserProfile) => void;
  setStravaTokens: (tokens: StravaTokens | null) => void;

  addFavoriteMeal: (meal: FavoriteMeal) => void;
  updateFavoriteMeal: (id: string, meal: Partial<FavoriteMeal>) => void;
  deleteFavoriteMeal: (id: string) => void;

  addFoodEntry: (entry: FoodEntry) => void;
  updateFoodEntry: (id: string, entry: Partial<FoodEntry>) => void;
  deleteFoodEntry: (id: string) => void;

  addExerciseEntry: (entry: ExerciseEntry) => void;
  updateExerciseEntry: (id: string, entry: Partial<ExerciseEntry>) => void;
  deleteExerciseEntry: (id: string) => void;

  addWeightEntry: (entry: WeightEntry) => void;
  updateWeightEntry: (id: string, entry: Partial<WeightEntry>) => void;
  deleteWeightEntry: (id: string) => void;

  addHealthReport: (report: HealthReport) => void;
  updateHealthReport: (id: string, report: Partial<HealthReport>) => void;
  deleteHealthReport: (id: string) => void;

  addWaterEntry: (entry: WaterEntry) => void;
  deleteWaterEntry: (id: string) => void;

  addSupplementEntry: (entry: SupplementEntry) => void;
  deleteSupplementEntry: (id: string) => void;
  addSupplementTemplate: (tpl: SupplementTemplate) => void;
  updateSupplementTemplate: (id: string, tpl: Partial<SupplementTemplate>) => void;
  deleteSupplementTemplate: (id: string) => void;

  dismissTdeeReminder: (atWeight: number) => void;

  getDailySummary: (date: string) => DailySummary;
  getMonthlyData: (year: number, month: number) => DailySummary[];
}

function calculateBMR(profile: UserProfile): number {
  if (profile.customBMR && profile.customBMR > 0) return profile.customBMR;
  const { weight, height, age, gender } = profile;
  const base = 10 * weight + 6.25 * height - 5 * age;
  return gender === 'male' ? base + 5 : base - 161;
}

const ACTIVITY_MULTIPLIERS = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      profile: null,
      favoriteMeals: [],
      foodEntries: [],
      exerciseEntries: [],
      weightEntries: [],
      healthReports: [],
      waterEntries: [],
      stravaTokens: null,
      supplementEntries: [],
      supplementTemplates: [],
      userId: null,
      tdeeReminderDismissedWeight: null,

      setUserId: (userId) => set({ userId }),

      loadFromCloud: async (userId) => {
        set({ userId });
        console.log('[store] loadFromCloud start', userId.slice(-6));

        // Snapshot local state NOW (for uploading local-only records).
        // The actual merge uses a set() callback to read freshest state,
        // so entries added while the cloud fetch is in flight are never lost.
        const snapshot = get();
        const data = await db.fetchAllUserData(userId);

        const cloudFoodIds = new Set(data.foodEntries.map((e) => e.id));
        const cloudExerciseIds = new Set(data.exerciseEntries.map((e) => e.id));
        const cloudWeightIds = new Set(data.weightEntries.map((e) => e.id));
        const cloudMealIds = new Set(data.favoriteMeals.map((m) => m.id));
        const cloudReportIds = new Set(data.healthReports.map((r) => r.id));
        const cloudWaterIds = new Set(data.waterEntries.map((w) => w.id));
        const cloudSupplementIds = new Set(data.supplementEntries.map((e) => e.id));
        const cloudTemplateIds = new Set(data.supplementTemplates.map((t) => t.id));

        // Upload local-only records that never reached the cloud
        snapshot.foodEntries.filter((e) => !cloudFoodIds.has(e.id)).forEach((e) => db.upsertFoodEntry(userId, e));
        snapshot.exerciseEntries.filter((e) => !cloudExerciseIds.has(e.id)).forEach((e) => db.upsertExerciseEntry(userId, e));
        snapshot.weightEntries.filter((e) => !cloudWeightIds.has(e.id)).forEach((e) => db.upsertWeightEntry(userId, e));
        snapshot.favoriteMeals.filter((m) => !cloudMealIds.has(m.id)).forEach((m) => db.upsertFavoriteMeal(userId, m));
        snapshot.healthReports.filter((r) => !cloudReportIds.has(r.id)).forEach((r) => db.upsertHealthReport(userId, r));
        snapshot.waterEntries.filter((w) => !cloudWaterIds.has(w.id)).forEach((w) => db.upsertWaterEntry(userId, w));
        snapshot.supplementEntries.filter((e) => !cloudSupplementIds.has(e.id)).forEach((e) => db.upsertSupplementEntry(userId, e));
        snapshot.supplementTemplates.filter((t) => !cloudTemplateIds.has(t.id)).forEach((t) => db.upsertSupplementTemplate(userId, t));
        if (snapshot.profile && !data.profile) db.upsertProfile(userId, snapshot.profile);

        // Use callback form so we merge against the LATEST local state,
        // not the snapshot — entries added while fetch was in flight are preserved.
        set((current) => {
          const mergedFood = [...data.foodEntries, ...current.foodEntries.filter((e) => !cloudFoodIds.has(e.id))];
          const mergedExercise = [...data.exerciseEntries, ...current.exerciseEntries.filter((e) => !cloudExerciseIds.has(e.id))];
          const mergedWeight = [...data.weightEntries, ...current.weightEntries.filter((e) => !cloudWeightIds.has(e.id))];
          const mergedMeals = [...data.favoriteMeals, ...current.favoriteMeals.filter((m) => !cloudMealIds.has(m.id))];
          const mergedReports = [...data.healthReports, ...current.healthReports.filter((r) => !cloudReportIds.has(r.id))];
          const mergedWater = [...data.waterEntries, ...current.waterEntries.filter((w) => !cloudWaterIds.has(w.id))];
          const mergedSupplements = [...data.supplementEntries, ...current.supplementEntries.filter((e) => !cloudSupplementIds.has(e.id))];
          const mergedTemplates = [...data.supplementTemplates, ...current.supplementTemplates.filter((t) => !cloudTemplateIds.has(t.id))];

          console.log('[store] loadFromCloud merge — cloud:', data.foodEntries.length, 'local:', current.foodEntries.length, 'merged:', mergedFood.length);

          return {
            profile: data.profile ?? current.profile,
            foodEntries: mergedFood.length > 0 ? mergedFood : current.foodEntries,
            exerciseEntries: mergedExercise.length > 0 ? mergedExercise : current.exerciseEntries,
            weightEntries: mergedWeight.length > 0 ? mergedWeight : current.weightEntries,
            favoriteMeals: mergedMeals.length > 0 ? mergedMeals : current.favoriteMeals,
            healthReports: mergedReports.length > 0 ? mergedReports : current.healthReports,
            waterEntries: mergedWater.length > 0 ? mergedWater : current.waterEntries,
            supplementEntries: mergedSupplements.length > 0 ? mergedSupplements : current.supplementEntries,
            supplementTemplates: mergedTemplates.length > 0 ? mergedTemplates : current.supplementTemplates,
            stravaTokens: data.stravaTokens ?? current.stravaTokens,
          };
        });
      },

      clearLocalData: () => set({
        profile: null,
        favoriteMeals: [],
        foodEntries: [],
        exerciseEntries: [],
        weightEntries: [],
        healthReports: [],
        waterEntries: [],
        supplementEntries: [],
        supplementTemplates: [],
        stravaTokens: null,
        userId: null,
        tdeeReminderDismissedWeight: null,
      }),

      setProfile: (profile) => {
        set({ profile });
        const { userId } = get();
        if (userId) db.upsertProfile(userId, profile);
      },

      setStravaTokens: (stravaTokens) => {
        set({ stravaTokens });
        const { userId } = get();
        if (userId) db.upsertStravaTokens(userId, stravaTokens);
      },

      addFavoriteMeal: (meal) => {
        set((s) => ({ favoriteMeals: [...s.favoriteMeals, meal] }));
        const { userId } = get();
        if (userId) db.upsertFavoriteMeal(userId, meal);
      },
      updateFavoriteMeal: (id, meal) => {
        set((s) => ({
          favoriteMeals: s.favoriteMeals.map((m) => m.id === id ? { ...m, ...meal } : m),
        }));
        const { userId, favoriteMeals } = get();
        const updated = favoriteMeals.find((m) => m.id === id);
        if (userId && updated) db.upsertFavoriteMeal(userId, updated);
      },
      deleteFavoriteMeal: (id) => {
        set((s) => ({ favoriteMeals: s.favoriteMeals.filter((m) => m.id !== id) }));
        db.deleteFavoriteMealDb(id);
      },

      addFoodEntry: (entry) => {
        set((s) => ({ foodEntries: [...s.foodEntries, entry] }));
        const { userId } = get();
        if (userId) db.upsertFoodEntry(userId, entry);
      },
      updateFoodEntry: (id, entry) => {
        set((s) => ({
          foodEntries: s.foodEntries.map((e) => e.id === id ? { ...e, ...entry } : e),
        }));
        const { userId, foodEntries } = get();
        const updated = foodEntries.find((e) => e.id === id);
        if (userId && updated) db.upsertFoodEntry(userId, updated);
      },
      deleteFoodEntry: (id) => {
        set((s) => ({ foodEntries: s.foodEntries.filter((e) => e.id !== id) }));
        db.deleteFoodEntryDb(id);
      },

      addExerciseEntry: (entry) => {
        set((s) => ({ exerciseEntries: [...s.exerciseEntries, entry] }));
        const { userId } = get();
        if (userId) db.upsertExerciseEntry(userId, entry);
      },
      updateExerciseEntry: (id, entry) => {
        set((s) => ({
          exerciseEntries: s.exerciseEntries.map((e) => e.id === id ? { ...e, ...entry } : e),
        }));
        const { userId, exerciseEntries } = get();
        const updated = exerciseEntries.find((e) => e.id === id);
        if (userId && updated) db.upsertExerciseEntry(userId, updated);
      },
      deleteExerciseEntry: (id) => {
        set((s) => ({ exerciseEntries: s.exerciseEntries.filter((e) => e.id !== id) }));
        db.deleteExerciseEntryDb(id);
      },

      addWeightEntry: (entry) => {
        set((s) => ({ weightEntries: [...s.weightEntries, entry] }));
        const { userId } = get();
        if (userId) db.upsertWeightEntry(userId, entry);
      },
      updateWeightEntry: (id, entry) => {
        set((s) => ({
          weightEntries: s.weightEntries.map((e) => e.id === id ? { ...e, ...entry } : e),
        }));
        const { userId, weightEntries } = get();
        const updated = weightEntries.find((e) => e.id === id);
        if (userId && updated) db.upsertWeightEntry(userId, updated);
      },
      deleteWeightEntry: (id) => {
        set((s) => ({ weightEntries: s.weightEntries.filter((e) => e.id !== id) }));
        db.deleteWeightEntryDb(id);
      },

      addHealthReport: (report) => {
        set((s) => ({ healthReports: [...s.healthReports, report] }));
        const { userId } = get();
        if (userId) db.upsertHealthReport(userId, report);
      },
      updateHealthReport: (id, report) => {
        set((s) => ({
          healthReports: s.healthReports.map((r) => r.id === id ? { ...r, ...report } : r),
        }));
        const { userId, healthReports } = get();
        const updated = healthReports.find((r) => r.id === id);
        if (userId && updated) db.upsertHealthReport(userId, updated);
      },
      deleteHealthReport: (id) => {
        set((s) => ({ healthReports: s.healthReports.filter((r) => r.id !== id) }));
        db.deleteHealthReportDb(id);
      },

      addWaterEntry: (entry) => {
        set((s) => ({ waterEntries: [...s.waterEntries, entry] }));
        const { userId } = get();
        if (userId) db.upsertWaterEntry(userId, entry);
      },
      deleteWaterEntry: (id) => {
        set((s) => ({ waterEntries: s.waterEntries.filter((w) => w.id !== id) }));
        db.deleteWaterEntryDb(id);
      },

      addSupplementEntry: (entry) => {
        set((s) => ({ supplementEntries: [...s.supplementEntries, entry] }));
        const { userId } = get();
        if (userId) db.upsertSupplementEntry(userId, entry);
      },
      deleteSupplementEntry: (id) => {
        set((s) => ({ supplementEntries: s.supplementEntries.filter((e) => e.id !== id) }));
        db.deleteSupplementEntryDb(id);
      },
      addSupplementTemplate: (tpl) => {
        set((s) => ({ supplementTemplates: [...s.supplementTemplates, tpl] }));
        const { userId } = get();
        if (userId) db.upsertSupplementTemplate(userId, tpl);
      },
      updateSupplementTemplate: (id, tpl) => {
        set((s) => ({ supplementTemplates: s.supplementTemplates.map((t) => t.id === id ? { ...t, ...tpl } : t) }));
        const { userId, supplementTemplates } = get();
        const updated = supplementTemplates.find((t) => t.id === id);
        if (userId && updated) db.upsertSupplementTemplate(userId, updated);
      },
      deleteSupplementTemplate: (id) => {
        set((s) => ({ supplementTemplates: s.supplementTemplates.filter((t) => t.id !== id) }));
        db.deleteSupplementTemplateDb(id);
      },

      dismissTdeeReminder: (atWeight) => set({ tdeeReminderDismissedWeight: atWeight }),

      getDailySummary: (date) => {
        const { profile, foodEntries, exerciseEntries, weightEntries } = get();
        const dayFood = foodEntries.filter((e) => e.date === date);
        const dayExercise = exerciseEntries.filter((e) => e.date === date);
        const dayWeight = weightEntries.find((e) => e.date === date);

        const totalCaloriesIn = dayFood.reduce((s, e) => s + e.nutrition.calories, 0);
        const totalProtein = dayFood.reduce((s, e) => s + e.nutrition.protein, 0);
        const totalCarbs = dayFood.reduce((s, e) => s + e.nutrition.carbs, 0);
        const totalFat = dayFood.reduce((s, e) => s + e.nutrition.fat, 0);
        const exerciseCalories = dayExercise.reduce((s, e) => s + e.caloriesBurned, 0);

        const bmr = profile ? calculateBMR(profile) : 0;
        const tdee = profile ? bmr * ACTIVITY_MULTIPLIERS[profile.activityLevel] : 0;
        const totalCaloriesOut = tdee + exerciseCalories;

        return {
          date,
          totalCaloriesIn,
          totalProtein,
          totalCarbs,
          totalFat,
          totalCaloriesOut: Math.round(totalCaloriesOut),
          bmr: Math.round(bmr),
          netCalories: Math.round(totalCaloriesIn - totalCaloriesOut),
          weight: dayWeight?.weight,
        };
      },

      getMonthlyData: (year, month) => {
        const { getDailySummary } = get();
        const daysInMonth = new Date(year, month, 0).getDate();
        const summaries: DailySummary[] = [];
        for (let d = 1; d <= daysInMonth; d++) {
          const date = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
          summaries.push(getDailySummary(date));
        }
        return summaries;
      },
    }),
    {
      name: 'hi-body-store-v2',
      // Only keep the last 90 days of time-series entries in localStorage.
      // Cloud (Supabase) holds the full history; localStorage is a local cache.
      // Also strips base64 imageUrl previews — each photo is hundreds of KB
      // and was the original cause of QuotaExceededError.
      partialize: (state) => {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - 90);
        const cutoffStr = cutoff.toISOString().slice(0, 10);
        return {
          ...state,
          foodEntries: state.foodEntries
            .filter((e) => e.date >= cutoffStr)
            .map(({ imageUrl: _img, ...e }) => e),
          exerciseEntries: state.exerciseEntries
            .filter((e) => e.date >= cutoffStr)
            .map(({ imageUrl: _img, ...e }) => e),
          weightEntries: state.weightEntries.filter((e) => e.date >= cutoffStr),
          waterEntries: state.waterEntries.filter((e) => e.date >= cutoffStr),
          supplementEntries: state.supplementEntries.filter((e) => e.date >= cutoffStr),
        };
      },
    }
  )
);

export function getStreak(foodEntries: { date: string }[]): { current: number; longest: number; loggedToday: boolean } {
  const logged = new Set(foodEntries.map((e) => e.date));
  const today = new Date();

  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  const todayStr = fmt(today);
  const loggedToday = logged.has(todayStr);

  // Walk backwards from today counting consecutive logged days
  let current = 0;
  const start = new Date(today);
  // If not logged today, start counting from yesterday so streak isn't broken mid-day
  if (!loggedToday) start.setDate(start.getDate() - 1);

  for (let i = 0; i < 3650; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() - i);
    if (logged.has(fmt(d))) {
      current++;
    } else {
      break;
    }
  }

  // Longest streak across all history
  const days = [...logged].sort();
  let longest = 0;
  let run = 0;
  for (let i = 0; i < days.length; i++) {
    if (i === 0) {
      run = 1;
    } else {
      const prev = new Date(days[i - 1] + 'T00:00:00');
      const curr = new Date(days[i] + 'T00:00:00');
      const diff = Math.round((curr.getTime() - prev.getTime()) / 86400000);
      run = diff === 1 ? run + 1 : 1;
    }
    if (run > longest) longest = run;
  }

  return { current, longest, loggedToday };
}

export function calculateTDEE(profile: UserProfile): number {
  const bmr = calculateBMR(profile);
  return Math.round(bmr * ACTIVITY_MULTIPLIERS[profile.activityLevel]);
}

export function estimateWeightChange(netCaloriesPerDay: number, days: number): number {
  return (netCaloriesPerDay * days) / 7700;
}

/**
 * Least-squares linear regression on weight entries.
 * Returns predicted monthly (30-day) weight change in kg, plus R² goodness-of-fit.
 * Returns null when there are fewer than 3 entries or span < 7 days.
 */
export function linearRegressionMonthlyChange(
  weightEntries: WeightEntry[]
): { monthlyChange: number; r2: number; dataPoints: number; spanDays: number } | null {
  const sorted = [...weightEntries].sort((a, b) => a.date.localeCompare(b.date));
  if (sorted.length < 3) return null;
  const t0 = new Date(sorted[0].date + 'T00:00:00').getTime();
  const tN = new Date(sorted[sorted.length - 1].date + 'T00:00:00').getTime();
  const spanDays = (tN - t0) / 86400000;
  if (spanDays < 7) return null;

  const xs = sorted.map((e) => (new Date(e.date + 'T00:00:00').getTime() - t0) / 86400000);
  const ys = sorted.map((e) => e.weight);
  const n = xs.length;
  const sumX = xs.reduce((a, b) => a + b, 0);
  const sumY = ys.reduce((a, b) => a + b, 0);
  const sumXY = xs.reduce((s, x, i) => s + x * ys[i], 0);
  const sumX2 = xs.reduce((s, x) => s + x * x, 0);
  const denom = n * sumX2 - sumX * sumX;
  if (Math.abs(denom) < 1e-10) return null;

  const slope = (n * sumXY - sumX * sumY) / denom; // kg/day
  const intercept = (sumY - slope * sumX) / n;
  const yMean = sumY / n;
  const ssTot = ys.reduce((s, y) => s + (y - yMean) ** 2, 0);
  const ssRes = ys.reduce((s, y, i) => s + (y - (slope * xs[i] + intercept)) ** 2, 0);
  const r2 = ssTot > 0 ? Math.max(0, 1 - ssRes / ssTot) : 0;

  return { monthlyChange: slope * 30, r2, dataPoints: n, spanDays: Math.round(spanDays) };
}

/**
 * Computes the calorie-to-weight factor (kcal/kg) based on protein intake and strength training.
 * High protein (≥1.6g/kg BW) + ≥2 strength days/week → 8500 (muscle gain is denser than fat).
 * Default: 7700 kcal/kg.
 */
export function getProteinCalorieFactor(
  foodEntries: FoodEntry[],
  exerciseEntries: ExerciseEntry[],
  profile: UserProfile | null
): { factor: number; highProtein: boolean; strengthDays: number; avgProteinG: number } {
  if (!profile) return { factor: 7700, highProtein: false, strengthDays: 0, avgProteinG: 0 };

  // Look back 7 days
  const cutoffStr = new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10);
  const recentFood = foodEntries.filter((e) => e.date >= cutoffStr);
  const recentEx = exerciseEntries.filter((e) => e.date >= cutoffStr);

  // Average daily protein
  const proteinByDay: Record<string, number> = {};
  for (const e of recentFood) {
    proteinByDay[e.date] = (proteinByDay[e.date] ?? 0) + e.nutrition.protein;
  }
  const dayCount = Object.keys(proteinByDay).length;
  const avgProteinG = dayCount > 0
    ? Object.values(proteinByDay).reduce((a, b) => a + b, 0) / dayCount
    : 0;
  const highProtein = avgProteinG >= 1.6 * profile.weight;

  // Strength training days (keyword match)
  const STRENGTH_KW = ['重訓', '健身', 'weight', 'strength', 'gym', '肌力', '槓鈴', '啞鈴', 'lift', '深蹲', '硬舉', '臥推', '推舉', 'resistance'];
  const strengthDays = new Set(
    recentEx
      .filter((e) => STRENGTH_KW.some((k) => e.name.toLowerCase().includes(k.toLowerCase())))
      .map((e) => e.date)
  ).size;

  const factor = (highProtein && strengthDays >= 2) ? 8500 : 7700;
  return { factor, highProtein, strengthDays, avgProteinG };
}
