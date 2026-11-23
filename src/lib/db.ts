/**
 * Supabase database helpers — cloud sync for all user data.
 */
import { supabase } from './supabase';
import type { UserProfile, WeightEntry, WorkoutEntry, RaceEvent } from '@/types';
import type { GymPackage } from './store';

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
  };
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
    visceral_fat: entry.visceralFat ?? null,
    waist_cm: entry.waistCm ?? null,
    segmental_muscle: entry.segmentalMuscle ?? null,
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
    visceralFat: r.visceral_fat ?? undefined,
    waistCm: r.waist_cm ?? undefined,
    segmentalMuscle: r.segmental_muscle ?? undefined,
    notes: r.notes ?? undefined,
  }));
}

// ─── Workout Entries ──────────────────────────────────────────────────────────

export async function upsertWorkoutEntry(userId: string, entry: WorkoutEntry) {
  await supabase.from('workout_entries').upsert({
    id: entry.id,
    user_id: userId,
    date: entry.date,
    type: entry.type,
    actual_type: entry.actualType ?? null,
    duration: entry.duration,
    notes: entry.notes ?? null,
    estimated_by_ai: entry.estimatedByAI,
    timestamp: entry.timestamp,
    swim_distance: entry.swimDistance ?? null,
    swim_pool_type: entry.swimPoolType ?? null,
    run_distance: entry.runDistance ?? null,
    cycling_distance: entry.cyclingDistance ?? null,
    gym_title: entry.gymTitle ?? null,
    gym_exercises: entry.gymExercises ?? null,
  });
}

export async function deleteWorkoutEntryDb(id: string) {
  await supabase.from('workout_entries').delete().eq('id', id);
}

export async function fetchWorkoutEntries(userId: string): Promise<WorkoutEntry[]> {
  const { data } = await supabase
    .from('workout_entries')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .limit(500);
  if (!data) return [];
  return data.map((r) => ({
    id: r.id,
    date: r.date,
    type: r.type,
    actualType: r.actual_type ?? undefined,
    duration: r.duration,
    notes: r.notes ?? undefined,
    estimatedByAI: r.estimated_by_ai ?? false,
    timestamp: r.timestamp,
    swimDistance: r.swim_distance ?? undefined,
    swimPoolType: r.swim_pool_type ?? undefined,
    runDistance: r.run_distance ?? undefined,
    cyclingDistance: r.cycling_distance ?? undefined,
    gymTitle: r.gym_title ?? undefined,
    gymExercises: r.gym_exercises ?? undefined,
  }));
}

// ─── Race Events ──────────────────────────────────────────────────────────────

export async function upsertRaceEvent(userId: string, event: RaceEvent) {
  await supabase.from('race_events').upsert({
    id: event.id,
    user_id: userId,
    name: event.name,
    date: event.date,
    type: event.type,
    distance: event.distance ?? null,
    target_time: event.targetTime ?? null,
    actual_time: event.actualTime ?? null,
    result: event.result ?? null,
    notes: event.notes ?? null,
  });
}

export async function deleteRaceEventDb(id: string) {
  await supabase.from('race_events').delete().eq('id', id);
}

export async function fetchRaceEvents(userId: string): Promise<RaceEvent[]> {
  const { data } = await supabase.from('race_events').select('*').eq('user_id', userId);
  if (!data) return [];
  return data.map((r) => ({
    id: r.id,
    name: r.name,
    date: r.date,
    type: r.type,
    distance: r.distance ?? undefined,
    targetTime: r.target_time ?? undefined,
    actualTime: r.actual_time ?? undefined,
    result: r.result ?? undefined,
    notes: r.notes ?? undefined,
  }));
}

// ─── Gym Package ──────────────────────────────────────────────────────────────

export async function upsertGymPackage(userId: string, pkg: GymPackage) {
  await supabase.from('gym_packages').upsert({
    user_id: userId,
    total: pkg.total,
    start_date: pkg.startDate,
    label: pkg.label ?? null,
    updated_at: new Date().toISOString(),
  });
}

export async function deleteGymPackageDb(userId: string) {
  await supabase.from('gym_packages').delete().eq('user_id', userId);
}

export async function fetchGymPackage(userId: string): Promise<GymPackage | null> {
  const { data } = await supabase.from('gym_packages').select('*').eq('user_id', userId).single();
  if (!data) return null;
  return {
    total: data.total,
    startDate: data.start_date,
    label: data.label ?? undefined,
  };
}

// ─── Fetch all ───────────────────────────────────────────────────────────────

export async function fetchAllUserData(userId: string) {
  const [profile, weightEntries, workoutEntries, raceEvents, gymPackage] = await Promise.all([
    fetchProfile(userId),
    fetchWeightEntries(userId),
    fetchWorkoutEntries(userId),
    fetchRaceEvents(userId),
    fetchGymPackage(userId),
  ]);
  return { profile, weightEntries, workoutEntries, raceEvents, gymPackage };
}
