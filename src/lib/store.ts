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
} from '@/types';
import * as db from './db';

interface AppState {
  profile: UserProfile | null;
  favoriteMeals: FavoriteMeal[];
  foodEntries: FoodEntry[];
  exerciseEntries: ExerciseEntry[];
  weightEntries: WeightEntry[];
  healthReports: HealthReport[];
  stravaTokens: StravaTokens | null;
  userId: string | null; // current logged-in user

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
      stravaTokens: null,
      userId: null,

      setUserId: (userId) => set({ userId }),

      loadFromCloud: async (userId) => {
        set({ userId });
        const local = get();
        const data = await db.fetchAllUserData(userId);

        // Build merged state: cloud wins if it has data, otherwise keep local.
        // Also upload any local-only records that never reached the cloud.
        const cloudFoodIds = new Set(data.foodEntries.map((e) => e.id));
        const cloudExerciseIds = new Set(data.exerciseEntries.map((e) => e.id));
        const cloudWeightIds = new Set(data.weightEntries.map((e) => e.id));
        const cloudMealIds = new Set(data.favoriteMeals.map((m) => m.id));
        const cloudReportIds = new Set(data.healthReports.map((r) => r.id));

        // Upload local-only records to cloud
        local.foodEntries.filter((e) => !cloudFoodIds.has(e.id)).forEach((e) => db.upsertFoodEntry(userId, e));
        local.exerciseEntries.filter((e) => !cloudExerciseIds.has(e.id)).forEach((e) => db.upsertExerciseEntry(userId, e));
        local.weightEntries.filter((e) => !cloudWeightIds.has(e.id)).forEach((e) => db.upsertWeightEntry(userId, e));
        local.favoriteMeals.filter((m) => !cloudMealIds.has(m.id)).forEach((m) => db.upsertFavoriteMeal(userId, m));
        local.healthReports.filter((r) => !cloudReportIds.has(r.id)).forEach((r) => db.upsertHealthReport(userId, r));
        if (local.profile && !data.profile) db.upsertProfile(userId, local.profile);

        // Merge: union of cloud + local (cloud wins on conflict)
        const mergedFood = [...data.foodEntries, ...local.foodEntries.filter((e) => !cloudFoodIds.has(e.id))];
        const mergedExercise = [...data.exerciseEntries, ...local.exerciseEntries.filter((e) => !cloudExerciseIds.has(e.id))];
        const mergedWeight = [...data.weightEntries, ...local.weightEntries.filter((e) => !cloudWeightIds.has(e.id))];
        const mergedMeals = [...data.favoriteMeals, ...local.favoriteMeals.filter((m) => !cloudMealIds.has(m.id))];
        const mergedReports = [...data.healthReports, ...local.healthReports.filter((r) => !cloudReportIds.has(r.id))];

        set({
          profile: data.profile ?? local.profile,
          foodEntries: mergedFood.length > 0 ? mergedFood : local.foodEntries,
          exerciseEntries: mergedExercise.length > 0 ? mergedExercise : local.exerciseEntries,
          weightEntries: mergedWeight.length > 0 ? mergedWeight : local.weightEntries,
          favoriteMeals: mergedMeals.length > 0 ? mergedMeals : local.favoriteMeals,
          healthReports: mergedReports.length > 0 ? mergedReports : local.healthReports,
          stravaTokens: data.stravaTokens ?? local.stravaTokens,
        });
      },

      clearLocalData: () => set({
        profile: null,
        favoriteMeals: [],
        foodEntries: [],
        exerciseEntries: [],
        weightEntries: [],
        healthReports: [],
        stravaTokens: null,
        userId: null,
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
    { name: 'hi-body-store' }
  )
);

export function calculateTDEE(profile: UserProfile): number {
  const bmr = calculateBMR(profile);
  return Math.round(bmr * ACTIVITY_MULTIPLIERS[profile.activityLevel]);
}

export function estimateWeightChange(netCaloriesPerDay: number, days: number): number {
  return (netCaloriesPerDay * days) / 7700;
}
