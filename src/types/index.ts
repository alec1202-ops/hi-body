export interface UserProfile {
  name: string;
  age: number;
  gender: 'male' | 'female';
  height: number; // cm
  weight: number; // kg
  targetWeight: number; // kg
}

export interface WeightEntry {
  id: string;
  date: string;
  weight: number;    // kg
  bmi?: number;
  bodyFat?: number;  // %
  muscleMass?: number; // kg
  boneMass?: number; // kg (kept for data compatibility)
  bodyWater?: number; // % (kept for data compatibility)
  visceralFat?: number; // 內臟脂肪程度 1–20
  waistCm?: number;    // 腰圍 cm
  segmentalMuscle?: {  // 區段性肌肉重量 kg
    armR: number;
    armL: number;
    trunk: number;
    legR: number;
    legL: number;
  };
  notes?: string;
}

// ─── Workout ──────────────────────────────────────────────────────────────────

export type WorkoutType = 'swim' | 'run' | 'cycling' | 'gym' | 'stretch' | 'rest' | 'free';

export interface GymSet {
  exercise: string;
  sets: number;
  reps?: number;
  weight?: number; // kg
}

export interface WorkoutEntry {
  id: string;
  date: string; // YYYY-MM-DD
  type: WorkoutType;
  actualType?: WorkoutType; // for 'free' day — what they actually chose
  duration: number; // minutes (0 for rest)
  notes?: string;
  imageUrl?: string;
  estimatedByAI: boolean;
  timestamp: string;
  // Type-specific data
  swimDistance?: number;   // meters
  swimPoolType?: 'pool' | 'open';
  runDistance?: number;    // km
  cyclingDistance?: number; // km
  gymTitle?: string;    // e.g. "腿部訓練", "核心課", "HIIT"
  gymExercises?: GymSet[];
}

// ─── Health Check ─────────────────────────────────────────────────────────────

export interface HealthCheckEntry {
  id: string;
  date: string; // YYYY-MM-DD
  // 糖尿病 / 代謝
  fastingGlucose?: number;  // 飯前血糖 mg/dL
  hba1c?: number;           // HbA1C %
  insulin?: number;         // 胰島素IRI uIU/ml
  homaIr?: number;          // 胰島素阻抗 HOMA-IR
  // 血脂
  triglyceride?: number;    // 三酸甘油脂 mg/dL
  cholesterol?: number;     // 總膽固醇 mg/dL
  hdl?: number;             // HDL mg/dL
  ldl?: number;             // LDL mg/dL
  cholHdlRatio?: number;    // 膽固醇/HDL比
  ldlHdlRatio?: number;     // LDL/HDL比
  // 肝功能
  sgot?: number;            // AST U/L
  sgpt?: number;            // ALT U/L
  ggt?: number;             // r-GT U/L
  alp?: number;             // ALP U/L
  // 腎功能
  bun?: number;             // 尿素氮 mg/dL
  creatinine?: number;      // 肌酸酐 mg/dL
  egfr?: number;            // eGFR
  // 心血管
  homocysteine?: number;    // 同半胱胺酸 umol/L
  hsCrp?: number;           // hs-CRP mg/L
  ldh?: number;             // LDH U/L
  // 其他
  uricAcid?: number;        // 尿酸 mg/dL
  bodyFatPct?: number;      // 體脂肪% (檢查報告)
  psa?: number;             // PSA ng/mL
  // 定性發現（文字）
  notes?: string;
}

// ─── Race Events ──────────────────────────────────────────────────────────────

export type RaceType = 'run' | 'swim' | 'triathlon' | 'cycling' | 'other';

export interface RaceEvent {
  id: string;
  name: string;
  date: string; // YYYY-MM-DD
  type: RaceType;
  distance?: string; // e.g. "10K", "42.195km", "Olympic"
  targetTime?: string; // HH:MM:SS
  actualTime?: string; // HH:MM:SS
  result?: string; // 名次 or 備註
  notes?: string;
}
