export interface UserProfile {
  name: string;
  age: number;
  gender: 'male' | 'female';
  height: number; // cm
  weight: number; // kg
  targetWeight: number; // kg
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
  goal: 'lose' | 'maintain' | 'gain';
  dailyCalorieTarget: number;
  dailyProteinTarget: number; // g
  customBMR?: number; // manual override for BMR
}

export interface NutritionInfo {
  calories: number;
  protein: number; // g
  carbs: number; // g
  fat: number; // g
}

export type FoodCategory = 'solid' | 'liquid' | 'supplement';

export interface FavoriteMeal {
  id: string;
  name: string;
  category: FoodCategory;
  nutrition: NutritionInfo;
  servingSize: string;
  imageUrl?: string;
  aliases: string[]; // alternative names for matching
  createdAt: string;
}

export interface FoodEntry {
  id: string;
  date: string; // YYYY-MM-DD
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  name: string;
  category: FoodCategory;
  nutrition: NutritionInfo;
  servingSize: string;
  imageUrl?: string;
  favoriteMealId?: string; // if matched from favorites
  estimatedByAI: boolean;
  timestamp: string;
}

export interface ExerciseEntry {
  id: string;
  date: string;
  name: string;
  duration: number; // minutes
  caloriesBurned: number;
  type: 'cardio' | 'strength' | 'flexibility' | 'sports' | 'other';
  notes?: string;
  imageUrl?: string;
  estimatedByAI: boolean;
  timestamp: string;
}

export interface WeightEntry {
  id: string;
  date: string;
  weight: number; // kg
  bodyFat?: number; // %
  muscleMass?: number; // kg
  notes?: string;
}

export interface DailySummary {
  date: string;
  totalCaloriesIn: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  totalCaloriesOut: number; // exercise + BMR
  bmr: number;
  netCalories: number;
  weight?: number;
}

export interface StravaTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // Unix timestamp (seconds)
  athleteName: string;
  athleteId: number;
}
