'use client';

import { useAppStore } from '@/lib/store';
import type { GymPackage } from '@/lib/store';
import { format, startOfWeek, differenceInDays } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { WorkoutType } from '@/types';

const WORKOUT_TYPES: { type: WorkoutType; label: string; emoji: string; color: string }[] = [
  { type: 'swim',     label: '游泳',       emoji: '🏊', color: 'text-blue-400' },
  { type: 'run',      label: '跑步',       emoji: '🏃', color: 'text-orange-400' },
  { type: 'cycling',  label: '室內自行車', emoji: '🚴', color: 'text-yellow-400' },
  { type: 'gym',      label: '健身',       emoji: '🏋️', color: 'text-purple-400' },
  { type: 'stretch',  label: '拉筋',       emoji: '🧘', color: 'text-green-400' },
  { type: 'rest',     label: '休息',       emoji: '😴', color: 'text-gray-400' },
  { type: 'free',     label: '自由選',     emoji: '⭐', color: 'text-emerald-400' },
];

function getWeekStart(date: Date) {
  return startOfWeek(date, { weekStartsOn: 1 }); // Monday
}

function GymPackageModal({ pkg, onClose }: { pkg: GymPackage | null; onClose: () => void }) {
  const { setGymPackage } = useAppStore();
  const [total, setTotal] = useState(String(pkg?.total ?? 36));
  const [startDate, setStartDate] = useState(pkg?.startDate ?? format(new Date(), 'yyyy-MM-dd'));
  const [label, setLabel] = useState(pkg?.label ?? '');

  function save() {
    const t = parseInt(total);
    if (isNaN(t) || t <= 0) return;
    setGymPackage({ total: t, startDate, label: label.trim() || undefined });
    onClose();
  }

  function remove() {
    setGymPackage(null);
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center" onClick={onClose}>
      <div className="bg-gray-900 rounded-t-2xl w-full max-w-lg p-6 pb-10" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-base font-bold text-white mb-4">健身課套票設定</h3>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-400 mb-1 block">課程標籤（選填）</label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="例：2026年健身課"
              className="w-full bg-gray-800 rounded-xl px-3 py-2.5 text-sm text-white outline-none"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">總堂數</label>
            <input
              type="text"
              inputMode="numeric"
              value={total}
              onChange={(e) => setTotal(e.target.value)}
              className="w-full bg-gray-800 rounded-xl px-3 py-2.5 text-sm text-white outline-none"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">開始日期</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-gray-800 rounded-xl px-3 py-2.5 text-sm text-white outline-none"
            />
          </div>
        </div>
        <div className="flex gap-2 mt-5">
          {pkg && (
            <button onClick={remove} className="px-4 py-2.5 bg-red-900/40 hover:bg-red-900/60 text-red-400 rounded-xl text-sm font-medium">
              移除
            </button>
          )}
          <button onClick={onClose} className="flex-1 py-2.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-xl text-sm font-medium">
            取消
          </button>
          <button onClick={save} className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-sm font-semibold">
            儲存
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TodayPage() {
  const { workoutEntries, weightEntries, raceEvents, gymPackage } = useAppStore();
  const [showGymModal, setShowGymModal] = useState(false);
  const router = useRouter();

  const today = format(new Date(), 'yyyy-MM-dd');
  const weekStart = getWeekStart(new Date());
  const weekStartStr = format(weekStart, 'yyyy-MM-dd');
  const weekEndStr = format(new Date(weekStart.getTime() + 6 * 86400000), 'yyyy-MM-dd');

  // This week's completed workouts
  const thisWeekEntries = workoutEntries.filter(
    (e) => e.date >= weekStartStr && e.date <= weekEndStr
  );
  const completedTypes = new Set(
    thisWeekEntries.map((e) => e.actualType ?? e.type)
  );

  // Which of the 7 types are still missing this week
  const allTypes: WorkoutType[] = ['swim', 'run', 'cycling', 'gym', 'stretch', 'rest', 'free'];
  const remainingTypes = allTypes.filter((t) => !completedTypes.has(t));

  // Today's entries (may be multiple)
  const todayEntries = workoutEntries.filter((e) => e.date === today);

  // Last weight entry
  const sortedWeights = [...weightEntries].sort((a, b) => b.date.localeCompare(a.date));
  const lastWeight = sortedWeights[0];
  const daysSinceWeight = lastWeight
    ? differenceInDays(new Date(), new Date(lastWeight.date + 'T00:00:00'))
    : null;

  // Next upcoming race
  const upcomingRaces = raceEvents
    .filter((e) => e.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date));
  const nextRace = upcomingRaces[0];
  const daysToRace = nextRace
    ? differenceInDays(new Date(nextRace.date + 'T00:00:00'), new Date())
    : null;

  const dateLabel = format(new Date(), 'M月d日 EEEE', { locale: zhTW });

  // Gym package progress
  const gymSessionsUsed = gymPackage
    ? workoutEntries.filter(
        (e) =>
          (e.type === 'gym' || e.actualType === 'gym') &&
          e.date >= gymPackage.startDate
      ).length
    : 0;
  const gymRemaining = gymPackage ? Math.max(0, gymPackage.total - gymSessionsUsed) : 0;
  const gymPct = gymPackage ? Math.min(1, gymSessionsUsed / gymPackage.total) : 0;

  return (
    <div className="page-container px-4 pt-6 pb-24">

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">今天</h1>
        <p className="text-sm text-gray-400 mt-0.5">{dateLabel}</p>
      </div>

      {/* Today's status */}
      <div className="bg-gray-800 rounded-2xl p-4 mb-4">
        {todayEntries.length > 0 ? (
          <div className="space-y-2">
            {todayEntries.map((entry) => {
              const w = WORKOUT_TYPES.find((x) => x.type === (entry.actualType ?? entry.type));
              return (
                <div key={entry.id} className="flex items-center gap-3">
                  <span className="text-2xl">{w?.emoji ?? '✅'}</span>
                  <div>
                    <p className="text-sm font-semibold text-white">
                      {w?.label}
                      {entry.duration > 0 && <span className="text-gray-400 font-normal"> · {entry.duration} 分鐘</span>}
                    </p>
                  </div>
                </div>
              );
            })}
            <p className="text-xs text-emerald-400 pt-1">繼續保持 💪</p>
          </div>
        ) : (
          <div>
            <p className="text-xs text-gray-400 mb-3">今天還沒記錄運動，建議：</p>
            <div className="flex flex-wrap gap-2">
              {remainingTypes.slice(0, 4).map((type) => {
                const w = WORKOUT_TYPES.find((x) => x.type === type)!;
                return (
                  <button
                    key={type}
                    onClick={() => router.push('/workout')}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-xl text-xs font-medium text-white transition-colors"
                  >
                    <span>{w.emoji}</span>
                    <span>{w.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* This week progress */}
      <div className="bg-gray-800 rounded-2xl p-4 mb-4">
        <h2 className="text-xs font-semibold text-gray-400 mb-3">本週進度</h2>
        <div className="grid grid-cols-7 gap-1">
          {WORKOUT_TYPES.map(({ type, label, emoji, color }) => {
            const done = completedTypes.has(type);
            return (
              <div key={type} className="flex flex-col items-center gap-1">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg
                  ${done ? 'bg-emerald-500/20 ring-1 ring-emerald-500/50' : 'bg-gray-700/50'}`}>
                  {done ? <span>{emoji}</span> : <span className="text-gray-600 text-base">{emoji}</span>}
                </div>
                <span className={`text-[9px] ${done ? color : 'text-gray-600'}`}>
                  {label.length > 2 ? label.slice(0, 2) : label}
                </span>
              </div>
            );
          })}
        </div>
        <div className="mt-3 flex items-center justify-between">
          <span className="text-xs text-gray-500">
            {completedTypes.size} / 7 完成
          </span>
          <div className="flex gap-1">
            {[...Array(7)].map((_, i) => (
              <div
                key={i}
                className={`h-1.5 w-6 rounded-full ${i < completedTypes.size ? 'bg-emerald-500' : 'bg-gray-700'}`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Weight reminder */}
      <div className={`rounded-2xl p-4 mb-4 ${daysSinceWeight === null || daysSinceWeight >= 7 ? 'bg-amber-900/30 border border-amber-700/40' : 'bg-gray-800'}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-300">體重記錄</p>
            {lastWeight ? (
              <p className="text-xs text-gray-400 mt-0.5">
                {daysSinceWeight === 0 ? '今天已量' : `${daysSinceWeight} 天前 · ${lastWeight.weight} kg`}
                {(daysSinceWeight ?? 0) >= 7 && <span className="text-amber-400 ml-1">⚠️ 該量體重了</span>}
              </p>
            ) : (
              <p className="text-xs text-amber-400 mt-0.5">尚未記錄體重</p>
            )}
          </div>
          <button
            onClick={() => router.push('/progress')}
            className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-xl text-xs font-medium text-white"
          >
            記錄
          </button>
        </div>
      </div>

      {/* Next race */}
      {nextRace && (
        <div className="bg-gray-800 rounded-2xl p-4 mb-4">
          <p className="text-xs font-semibold text-gray-400 mb-1">下一場賽事</p>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-white">{nextRace.name}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {nextRace.date} {nextRace.distance && `· ${nextRace.distance}`}
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-emerald-400">{daysToRace}</p>
              <p className="text-[10px] text-gray-500">天後</p>
            </div>
          </div>
        </div>
      )}

      {/* Gym package tracker */}
      {gymPackage ? (
        <div className="bg-gray-800 rounded-2xl p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-xs font-semibold text-gray-300">🏋️ 健身課套票</p>
              {gymPackage.label && <p className="text-[10px] text-gray-500 mt-0.5">{gymPackage.label}</p>}
            </div>
            <button onClick={() => setShowGymModal(true)} className="text-xs text-gray-500 hover:text-gray-300 px-2 py-1">
              編輯
            </button>
          </div>
          <div className="flex items-end gap-2 mb-2">
            <span className="text-2xl font-bold text-purple-400">{gymSessionsUsed}</span>
            <span className="text-sm text-gray-500 pb-0.5">/ {gymPackage.total} 堂</span>
            <span className="text-xs text-gray-500 pb-0.5 ml-auto">剩 {gymRemaining} 堂</span>
          </div>
          <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-purple-500 rounded-full transition-all"
              style={{ width: `${gymPct * 100}%` }}
            />
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowGymModal(true)}
          className="w-full bg-gray-800 hover:bg-gray-700 rounded-2xl p-4 mb-4 text-left transition-colors"
        >
          <p className="text-sm text-gray-400">🏋️ 設定健身課套票追蹤</p>
        </button>
      )}

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => router.push('/workout')}
          className="bg-emerald-500 hover:bg-emerald-600 rounded-2xl p-4 text-left transition-colors"
        >
          <span className="text-2xl">🏃</span>
          <p className="text-sm font-bold text-white mt-2">記錄運動</p>
          <p className="text-xs text-emerald-100 mt-0.5">拍照或手動輸入</p>
        </button>
        <button
          onClick={() => router.push('/events')}
          className="bg-gray-800 hover:bg-gray-700 rounded-2xl p-4 text-left transition-colors"
        >
          <span className="text-2xl">🏆</span>
          <p className="text-sm font-bold text-white mt-2">賽事管理</p>
          <p className="text-xs text-gray-400 mt-0.5">
            {upcomingRaces.length > 0 ? `${upcomingRaces.length} 場即將到來` : '新增賽事'}
          </p>
        </button>
      </div>

      {showGymModal && (
        <GymPackageModal pkg={gymPackage} onClose={() => setShowGymModal(false)} />
      )}
    </div>
  );
}
