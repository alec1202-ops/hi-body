'use client';

import { useState } from 'react';
import { useAppStore } from '@/lib/store';
import { useRouter } from 'next/navigation';

// ACCUNIQ BC380 — 2026-11-19
const ENTRY = {
  date: '2026-11-19',
  weight: 81.2,
  bmi: 25.6,
  bodyFat: 22.2,
  muscleMass: 53.87, // 右臂3.40+左臂3.29+軀幹26.61+右腿10.30+左腿10.27
  visceralFat: 9,
  waistCm: 90.1,
  notes: 'ACCUNIQ BC380，健康評分78分，基礎代謝率1733kcal，目標體重76.5kg',
};

const PROFILE_UPDATE = {
  height: 176,
  age: 47,
  gender: 'male' as const,
  targetWeight: 76.5,
};

export default function ImportInBodyPage() {
  const { addWeightEntry, setProfile, profile } = useAppStore();
  const router = useRouter();
  const [done, setDone] = useState(false);

  function handleImport() {
    // Add weight entry
    addWeightEntry({ ...ENTRY, estimatedByAI: false, id: crypto.randomUUID() } as Parameters<typeof addWeightEntry>[0]);

    // Update profile keeping existing name/weight, updating the rest
    if (profile) {
      setProfile({
        ...profile,
        height: PROFILE_UPDATE.height,
        age: PROFILE_UPDATE.age,
        gender: PROFILE_UPDATE.gender,
        targetWeight: PROFILE_UPDATE.targetWeight,
        weight: ENTRY.weight,
      });
    }

    setDone(true);
    setTimeout(() => router.push('/progress'), 1500);
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
      <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-sm">
        <h1 className="text-lg font-bold text-white mb-1">匯入 InBody 資料</h1>
        <p className="text-xs text-gray-400 mb-5">ACCUNIQ BC380 · 2026-11-19</p>

        <div className="space-y-2 mb-6">
          {[
            ['體重', `${ENTRY.weight} kg`],
            ['BMI', String(ENTRY.bmi)],
            ['體脂率', `${ENTRY.bodyFat}%`],
            ['骨骼肌肉量', `${ENTRY.muscleMass} kg`],
            ['內臟脂肪程度', String(ENTRY.visceralFat)],
            ['腰圍', `${ENTRY.waistCm} cm`],
            ['目標體重（個人資料）', `${PROFILE_UPDATE.targetWeight} kg`],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between text-sm">
              <span className="text-gray-400">{label}</span>
              <span className="text-white font-medium">{value}</span>
            </div>
          ))}
        </div>

        {done ? (
          <div className="text-center py-3">
            <p className="text-emerald-400 font-semibold">✅ 匯入成功，跳轉中…</p>
          </div>
        ) : (
          <button
            onClick={handleImport}
            className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl transition-colors"
          >
            確認匯入
          </button>
        )}
      </div>
    </div>
  );
}
