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
} from '@/types';

interface AppState {
  profile: UserProfile | null;
  favoriteMeals: FavoriteMeal[];
  foodEntries: FoodEntry[];
  exerciseEntries: ExerciseEntry[];
  weightEntries: WeightEntry[];
  stravaTokens: StravaTokens | null;

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

  getDailySummary: (date: string) => DailySummary;
  getMonthlyData: (year: number, month: number) => DailySummary[];
}

function calculateBMR(profile: UserProfile): number {
  if (profile.customBMR && profile.customBMR > 0) return profile.customBMR;
  // Mifflin-St Jeor Equation
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
      stravaTokens: null,

      setProfile: (profile) => set({ profile }),
      setStravaTokens: (stravaTokens) => set({ stravaTokens }),

      addFavoriteMeal: (meal) =>
        set((s) => ({ favoriteMeals: [...s.favoriteMeals, meal] })),
      updateFavoriteMeal: (id, meal) =>
        set((s) => ({
          favoriteMeals: s.favoriteMeals.map((m) =>
            m.id === id ? { ...m, ...meal } : m
          ),
        })),
      deleteFavoriteMeal: (id) =>
        set((s) => ({
          favoriteMeals: s.favoriteMeals.filter((m) => m.id !== id),
        })),

      addFoodEntry: (entry) =>
        set((s) => ({ foodEntries: [...s.foodEntries, entry] })),
      updateFoodEntry: (id, entry) =>
        set((s) => ({
          foodEntries: s.foodEntries.map((e) =>
            e.id === id ? { ...e, ...entry } : e
          ),
        })),
      deleteFoodEntry: (id) =>
        set((s) => ({
          foodEntries: s.foodEntries.filter((e) => e.id !== id),
        })),

      addExerciseEntry: (entry) =>
        set((s) => ({ exerciseEntries: [...s.exerciseEntries, entry] })),
      updateExerciseEntry: (id, entry) =>
        set((s) => ({
          exerciseEntries: s.exerciseEntries.map((e) =>
            e.id === id ? { ...e, ...entry } : e
          ),
        })),
      deleteExerciseEntry: (id) =>
        set((s) => ({
          exerciseEntries: s.exerciseEntries.filter((e) => e.id !== id),
        })),

      addWeightEntry: (entry) =>
        set((s) => ({ weightEntries: [...s.weightEntries, entry] })),
      updateWeightEntry: (id, entry) =>
        set((s) => ({
          weightEntries: s.weightEntries.map((e) =>
            e.id === id ? { ...e, ...entry } : e
          ),
        })),
      deleteWeightEntry: (id) =>
        set((s) => ({
          weightEntries: s.weightEntries.filter((e) => e.id !== id),
        })),

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
        const tdee = profile
          ? bmr * ACTIVITY_MULTIPLIERS[profile.activityLevel]
          : 0;
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

export function estimateWeightChange(
  netCaloriesPerDay: number,
  days: number
): number {
  // 7700 kcal ≈ 1 kg body weight
  return (netCaloriesPerDay * days) / 7700;
}
