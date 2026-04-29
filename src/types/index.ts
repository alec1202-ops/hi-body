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
  weight: number;    // kg
  bmi?: number;      // auto-calculated or manual
  bodyFat?: number;  // %
  muscleMass?: number; // kg (skeletal muscle mass)
  boneMass?: number; // kg
  bodyWater?: number; // %
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

// ─── Health Report (Annual Checkup) ──────────────────────────────────────────
export interface HealthReport {
  id: string;
  date: string; // YYYY-MM-DD
  // Hormones & Metabolism
  testosterone?: number;       // 睪固酮 ng/dL
  freeTestosterone?: number;   // 游離睪固酮 pg/mL
  tsh?: number;                // TSH mIU/L
  t3?: number;                 // 游離T3 pg/mL
  t4?: number;                 // 游離T4 ng/dL
  cortisol?: number;           // 皮質醇 μg/dL
  fastingInsulin?: number;     // 空腹胰島素 μIU/mL
  fastingGlucose?: number;     // 空腹血糖 mg/dL
  homaIR?: number;             // HOMA-IR
  // Nutrients
  vitaminD?: number;           // 維生素D 25-OH ng/mL
  ferritin?: number;           // 鐵蛋白 ng/mL
  hemoglobin?: number;         // 血紅素 g/dL
  vitaminB12?: number;         // 維生素B12 pg/mL
  zinc?: number;               // 鋅 μg/dL
  rbcMagnesium?: number;       // RBC鎂 mg/dL
  // Inflammation & Recovery
  hsCRP?: number;              // 高敏感性CRP mg/L
  uricAcid?: number;           // 尿酸 mg/dL
  creatineKinase?: number;     // 肌酸激酶 U/L
  // Liver & Kidney
  got?: number;                // AST U/L
  gpt?: number;                // ALT U/L
  creatinine?: number;         // 肌酸酐 mg/dL
  egfr?: number;               // eGFR mL/min/1.73m²
  // Lipids
  totalCholesterol?: number;   // 總膽固醇 mg/dL
  ldl?: number;                // LDL mg/dL
  hdl?: number;                // HDL mg/dL
  triglycerides?: number;      // 三酸甘油酯 mg/dL
  notes?: string;
}

export interface StravaTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // Unix timestamp (seconds)
  athleteName: string;
  athleteId: number;
}
