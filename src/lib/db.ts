/**
 * Supabase database helpers — cloud sync for profile and weight entries.
 */
import { supabase } from './supabase';
import type { UserProfile, WeightEntry } from '@/types';

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

// ─── Fetch all ───────────────────────────────────────────────────────────────

export async function fetchAllUserData(userId: string) {
  const [profile, weightEntries] = await Promise.all([
    fetchProfile(userId),
    fetchWeightEntries(userId),
  ]);
  return { profile, weightEntries };
}
