'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UserProfile, WeightEntry, WorkoutEntry, RaceEvent } from '@/types';
import * as db from './db';

interface AppState {
  profile: UserProfile | null;
  weightEntries: WeightEntry[];
  workoutEntries: WorkoutEntry[];
  raceEvents: RaceEvent[];
  userId: string | null;

  setUserId: (id: string | null) => void;
  loadFromCloud: (userId: string) => Promise<void>;
  clearLocalData: () => void;

  setProfile: (profile: UserProfile) => void;

  addWeightEntry: (entry: WeightEntry) => void;
  updateWeightEntry: (id: string, entry: Partial<WeightEntry>) => void;
  deleteWeightEntry: (id: string) => void;

  addWorkoutEntry: (entry: WorkoutEntry) => void;
  updateWorkoutEntry: (id: string, entry: Partial<WorkoutEntry>) => void;
  deleteWorkoutEntry: (id: string) => void;

  addRaceEvent: (event: RaceEvent) => void;
  updateRaceEvent: (id: string, event: Partial<RaceEvent>) => void;
  deleteRaceEvent: (id: string) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      profile: null,
      weightEntries: [],
      workoutEntries: [],
      raceEvents: [],
      userId: null,

      setUserId: (userId) => set({ userId }),

      loadFromCloud: async (userId) => {
        set({ userId });
        const snapshot = get();
        const data = await db.fetchAllUserData(userId);

        const cloudWeightIds = new Set(data.weightEntries.map((e) => e.id));
        snapshot.weightEntries
          .filter((e) => !cloudWeightIds.has(e.id))
          .forEach((e) => db.upsertWeightEntry(userId, e));
        if (snapshot.profile && !data.profile) db.upsertProfile(userId, snapshot.profile);

        set((current) => {
          const mergedWeight = [
            ...data.weightEntries,
            ...current.weightEntries.filter((e) => !cloudWeightIds.has(e.id)),
          ];
          return {
            profile: data.profile ?? current.profile,
            weightEntries: mergedWeight.length > 0 ? mergedWeight : current.weightEntries,
          };
        });
      },

      clearLocalData: () => set({
        profile: null,
        weightEntries: [],
        workoutEntries: [],
        raceEvents: [],
        userId: null,
      }),

      setProfile: (profile) => {
        set({ profile });
        const { userId } = get();
        if (userId) db.upsertProfile(userId, profile);
      },

      addWeightEntry: (entry) => {
        set((s) => ({ weightEntries: [...s.weightEntries, entry] }));
        const { userId } = get();
        if (userId) db.upsertWeightEntry(userId, entry);
      },
      updateWeightEntry: (id, entry) => {
        set((s) => ({ weightEntries: s.weightEntries.map((e) => e.id === id ? { ...e, ...entry } : e) }));
        const { userId, weightEntries } = get();
        const updated = weightEntries.find((e) => e.id === id);
        if (userId && updated) db.upsertWeightEntry(userId, updated);
      },
      deleteWeightEntry: (id) => {
        set((s) => ({ weightEntries: s.weightEntries.filter((e) => e.id !== id) }));
        db.deleteWeightEntryDb(id);
      },

      addWorkoutEntry: (entry) => set((s) => ({ workoutEntries: [...s.workoutEntries, entry] })),
      updateWorkoutEntry: (id, entry) => set((s) => ({
        workoutEntries: s.workoutEntries.map((e) => e.id === id ? { ...e, ...entry } : e),
      })),
      deleteWorkoutEntry: (id) => set((s) => ({ workoutEntries: s.workoutEntries.filter((e) => e.id !== id) })),

      addRaceEvent: (event) => set((s) => ({ raceEvents: [...s.raceEvents, event] })),
      updateRaceEvent: (id, event) => set((s) => ({
        raceEvents: s.raceEvents.map((e) => e.id === id ? { ...e, ...event } : e),
      })),
      deleteRaceEvent: (id) => set((s) => ({ raceEvents: s.raceEvents.filter((e) => e.id !== id) })),
    }),
    {
      name: 'hi-body-store-v3',
      partialize: (state) => {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - 180);
        const cutoffStr = cutoff.toISOString().slice(0, 10);
        return {
          ...state,
          weightEntries: state.weightEntries.filter((e) => e.date >= cutoffStr),
          workoutEntries: state.workoutEntries
            .filter((e) => e.date >= cutoffStr)
            .map(({ imageUrl: _img, ...e }) => e),
        };
      },
    }
  )
);

// ─── Weight regression helpers (used by progress page) ────────────────────────

export function linearRegressionMonthlyChange(
  weightEntries: WeightEntry[]
): { monthlyChange: number; r2: number; dataPoints: number; spanDays: number } | null {
  const sorted = [...weightEntries].sort((a, b) => a.date.localeCompare(b.date));
  if (sorted.length < 3) return null;
  const t0 = new Date(sorted[0].date + 'T00:00:00').getTime();
  const tN = new Date(sorted[sorted.length - 1].date + 'T00:00:00').getTime();
  const spanDays = (tN - t0) / 86400000;
  if (spanDays < 7) return null;

  const points = sorted.map((e) => ({
    x: (new Date(e.date + 'T00:00:00').getTime() - t0) / 86400000,
    y: e.weight,
  }));
  const n = points.length;
  const meanX = points.reduce((s, p) => s + p.x, 0) / n;
  const meanY = points.reduce((s, p) => s + p.y, 0) / n;
  const ssXY = points.reduce((s, p) => s + (p.x - meanX) * (p.y - meanY), 0);
  const ssXX = points.reduce((s, p) => s + (p.x - meanX) ** 2, 0);
  const ssYY = points.reduce((s, p) => s + (p.y - meanY) ** 2, 0);
  if (ssXX === 0) return null;
  const slope = ssXY / ssXX;
  const r2 = ssYY === 0 ? 1 : (ssXY * ssXY) / (ssXX * ssYY);
  return { monthlyChange: slope * 30, r2, dataPoints: n, spanDays };
}

export function build12MonthProjection(
  weightEntries: WeightEntry[],
  targetWeight?: number
): {
  monthlyChange: number; r2: number; dataPoints: number; spanDays: number;
  projections: { month: string; weight: number }[];
  reachTargetMonth?: string;
} | null {
  const sorted = [...weightEntries].sort((a, b) => a.date.localeCompare(b.date));
  const recent = sorted.slice(-90);
  if (recent.length < 5) return null;

  const t0 = new Date(recent[0].date + 'T00:00:00').getTime();
  const tN = new Date(recent[recent.length - 1].date + 'T00:00:00').getTime();
  const spanDays = (tN - t0) / 86400000;
  if (spanDays < 14) return null;

  // Weekly buckets to reduce daily noise
  const bucketSize = 7;
  const bucketMap = new Map<number, number[]>();
  for (const e of recent) {
    const dayOffset = Math.round((new Date(e.date + 'T00:00:00').getTime() - t0) / 86400000);
    const bucket = Math.floor(dayOffset / bucketSize);
    if (!bucketMap.has(bucket)) bucketMap.set(bucket, []);
    bucketMap.get(bucket)!.push(e.weight);
  }
  const weeklyPoints = Array.from(bucketMap.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([bucket, weights]) => ({
      x: bucket * bucketSize + bucketSize / 2,
      y: weights.reduce((s, w) => s + w, 0) / weights.length,
    }));

  const regrPoints = weeklyPoints.length >= 2 ? weeklyPoints : recent.map((e) => ({
    x: (new Date(e.date + 'T00:00:00').getTime() - t0) / 86400000,
    y: e.weight,
  }));

  const n = regrPoints.length;
  const meanX = regrPoints.reduce((s, p) => s + p.x, 0) / n;
  const meanY = regrPoints.reduce((s, p) => s + p.y, 0) / n;
  const ssXY = regrPoints.reduce((s, p) => s + (p.x - meanX) * (p.y - meanY), 0);
  const ssXX = regrPoints.reduce((s, p) => s + (p.x - meanX) ** 2, 0);
  const ssYY = regrPoints.reduce((s, p) => s + (p.y - meanY) ** 2, 0);
  if (ssXX === 0) return null;

  const slope = ssXY / ssXX;
  const intercept = meanY - slope * meanX;
  const r2 = ssYY === 0 ? 1 : (ssXY * ssXY) / (ssXX * ssYY);
  const latestDayOffset = (new Date(recent[recent.length - 1].date + 'T00:00:00').getTime() - t0) / 86400000;
  const currentWeight = slope * latestDayOffset + intercept;

  const today = new Date();
  const projections: { month: string; weight: number }[] = [];
  let reachTargetMonth: string | undefined;

  for (let m = 1; m <= 12; m++) {
    const projDate = new Date(today);
    projDate.setMonth(projDate.getMonth() + m);
    const dayOffset2 = (projDate.getTime() - new Date(recent[recent.length - 1].date + 'T00:00:00').getTime()) / 86400000;
    const projWeight = Math.max(30, currentWeight + slope * dayOffset2);
    const monthLabel = `${projDate.getMonth() + 1}月`;
    projections.push({ month: monthLabel, weight: Math.round(projWeight * 10) / 10 });

    if (targetWeight && !reachTargetMonth) {
      const reachedTarget = slope < 0 ? projWeight <= targetWeight : projWeight >= targetWeight;
      if (reachedTarget) reachTargetMonth = monthLabel;
    }
  }

  return {
    monthlyChange: slope * 30,
    r2,
    dataPoints: recent.length,
    spanDays,
    projections,
    reachTargetMonth,
  };
}
