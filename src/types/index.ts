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
  gymExercises?: GymSet[];
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
