'use client';

import { useState, useMemo } from 'react';
import { format, startOfMonth, startOfQuarter, subMonths, subDays } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { Plus, Trash2, TrendingDown, TrendingUp, Minus } from 'lucide-react';
import { useAppStore, build12MonthProjection } from '@/lib/store';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import type { WeightEntry, WorkoutType } from '@/types';

// ─── Workout metadata ─────────────────────────────────────────────────────────
const WORKOUT_META: Record<WorkoutType, { label: string; emoji: string; color: string }> = {
  swim:    { label: '游泳',       emoji: '🏊', color: '#60a5fa' },
  run:     { label: '跑步',       emoji: '🏃', color: '#fb923c' },
  cycling: { label: '室內自行車', emoji: '🚴', color: '#fbbf24' },
  gym:     { label: '健身',       emoji: '🏋️', color: '#c084fc' },
  stretch: { label: '拉筋',       emoji: '🧘', color: '#34d399' },
  rest:    { label: '休息',       emoji: '😴', color: '#9ca3af' },
  free:    { label: '自由選',     emoji: '⭐', color: '#10b981' },
};
const WORKOUT_TYPES = Object.keys(WORKOUT_META) as WorkoutType[];

// ─── Period definitions ───────────────────────────────────────────────────────
type StatPeriod = '1m' | '3m' | '6m' | '1y';

function getPeriodRange(p: StatPeriod): { from: string; label: string; days: number } {
  const now = new Date();
  const fmt = (d: Date) => format(d, 'yyyy-MM-dd');
  if (p === '1m') return { from: fmt(subDays(now, 30)),  label: '近30天',  days: 30 };
  if (p === '3m') return { from: fmt(subDays(now, 91)),  label: '近3個月', days: 91 };
  if (p === '6m') return { from: fmt(subDays(now, 182)), label: '近6個月', days: 182 };
  return               { from: fmt(subDays(now, 365)), label: '近1年',   days: 365 };
}

// ─── Workout Statistics panel ─────────────────────────────────────────────────
function WorkoutStats({ workoutEntries }: { workoutEntries: import('@/types').WorkoutEntry[] }) {
  const [period, setPeriod] = useState<StatPeriod>('1m');
  const { from, label, days } = getPeriodRange(period);

  const inRange = useMemo(
    () => workoutEntries.filter((e) => e.date >= from),
    [workoutEntries, from]
  );

  // Unique workout days
  const activeDays = new Set(inRange.map((e) => e.date)).size;

  // Total duration (minutes → hours)
  const totalMins = inRange.reduce((s, e) => s + (e.duration || 0), 0);
  const totalHours = (totalMins / 60).toFixed(1);

  // Avg workouts per week
  const avgPerWeek = ((activeDays / days) * 7).toFixed(1);

  // Count by type (use actualType for 'free' days)
  const typeCounts = WORKOUT_TYPES.map((type) => ({
    type,
    count: inRange.filter((e) => (e.actualType ?? e.type) === type).length,
  })).filter((t) => t.count > 0).sort((a, b) => b.count - a.count);

  const maxCount = Math.max(...typeCounts.map((t) => t.count), 1);

  const PERIODS: { key: StatPeriod; label: string }[] = [
    { key: '1m', label: '1個月' },
    { key: '3m', label: '1季' },
    { key: '6m', label: '半年' },
    { key: '1y', label: '全年' },
  ];

  return (
    <div className="bg-gray-800 rounded-2xl p-4 mb-4">
      {/* Period tabs */}
      <div className="flex gap-1 bg-gray-700/60 rounded-xl p-1 mb-4">
        {PERIODS.map(({ key, label: l }) => (
          <button key={key} onClick={() => setPeriod(key)}
            className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors
              ${period === key ? 'bg-gray-600 text-white' : 'text-gray-400'}`}>
            {l}
          </button>
        ))}
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="bg-gray-700/50 rounded-xl p-3 text-center">
          <p className="text-xl font-bold text-white">{activeDays}</p>
          <p className="text-[10px] text-gray-400 mt-0.5">運動天數</p>
        </div>
        <div className="bg-gray-700/50 rounded-xl p-3 text-center">
          <p className="text-xl font-bold text-emerald-400">{totalHours}</p>
          <p className="text-[10px] text-gray-400 mt-0.5">總時數 h</p>
        </div>
        <div className="bg-gray-700/50 rounded-xl p-3 text-center">
          <p className="text-xl font-bold text-blue-400">{avgPerWeek}</p>
          <p className="text-[10px] text-gray-400 mt-0.5">次／週</p>
        </div>
      </div>

      {/* Type breakdown */}
      {typeCounts.length === 0 ? (
        <p className="text-xs text-gray-500 text-center py-3">{label}內尚無運動記錄</p>
      ) : (
        <div className="space-y-2.5">
          {typeCounts.map(({ type, count }) => {
            const meta = WORKOUT_META[type];
            const pct = (count / maxCount) * 100;
            return (
              <div key={type} className="flex items-center gap-2">
                <span className="text-base w-6 text-center flex-shrink-0">{meta.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-xs text-gray-300">{meta.label}</span>
                    <span className="text-xs font-semibold text-white">{count} 次</span>
                  </div>
                  <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, background: meta.color }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Monthly breakdown for longer periods */}
      {(period === '3m' || period === '6m' || period === '1y') && activeDays > 0 && (
        <MonthlyBreakdown workoutEntries={inRange} period={period} />
      )}
    </div>
  );
}

// ─── Monthly breakdown bar chart ──────────────────────────────────────────────
function MonthlyBreakdown({
  workoutEntries,
  period,
}: {
  workoutEntries: import('@/types').WorkoutEntry[];
  period: StatPeriod;
}) {
  const months = period === '3m' ? 3 : period === '6m' ? 6 : 12;

  const data = useMemo(() => {
    return Array.from({ length: months }, (_, i) => {
      const d = subMonths(new Date(), months - 1 - i);
      const ym = format(d, 'yyyy-MM');
      const count = new Set(
        workoutEntries.filter((e) => e.date.startsWith(ym)).map((e) => e.date)
      ).size;
      return { label: format(d, 'M月', { locale: zhTW }), count };
    });
  }, [workoutEntries, months]);

  const maxCount = Math.max(...data.map((d) => d.count), 1);

  return (
    <div className="mt-4 pt-4 border-t border-gray-700/50">
      <p className="text-xs text-gray-400 mb-3">每月運動天數</p>
      <div className="flex items-end gap-1" style={{ height: 72 }}>
        {data.map(({ label, count }, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div className="w-full flex items-end justify-center" style={{ height: 56 }}>
              <div
                className={`w-full rounded-t transition-all duration-500
                  ${count >= 20 ? 'bg-emerald-500' : count >= 12 ? 'bg-emerald-600' : count >= 6 ? 'bg-yellow-500' : count > 0 ? 'bg-gray-500' : 'bg-gray-700'}`}
                style={{ height: `${Math.max(count > 0 ? 6 : 2, (count / maxCount) * 56)}px` }}
              />
            </div>
            {count > 0 && (
              <span className="text-[9px] font-medium text-gray-300">{count}</span>
            )}
            <span className="text-[9px] text-gray-500">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Weight Form ──────────────────────────────────────────────────────────────
function WeightForm({ onSave, onClose }: { onSave: (e: Omit<WeightEntry, 'id'>) => void; onClose: () => void }) {
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [weight, setWeight] = useState('');
  const [bodyFat, setBodyFat] = useState('');
  const [muscleMass, setMuscleMass] = useState('');
  const [visceralFat, setVisceralFat] = useState('');
  const [waistCm, setWaistCm] = useState('');
  const [notes, setNotes] = useState('');

  function handleSave() {
    if (!weight) return;
    onSave({
      date,
      weight: parseFloat(weight),
      bodyFat: bodyFat ? parseFloat(bodyFat) : undefined,
      muscleMass: muscleMass ? parseFloat(muscleMass) : undefined,
      visceralFat: visceralFat ? parseFloat(visceralFat) : undefined,
      waistCm: waistCm ? parseFloat(waistCm) : undefined,
      notes: notes || undefined,
    });
  }

  const field = 'w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-400';

  return (
    <div className="fixed inset-0 z-50 flex flex-col">
      <div className="h-full w-full max-w-[480px] mx-auto flex flex-col bg-gray-800">
        <div className="px-5 pt-12 pb-3 flex-shrink-0 border-b border-gray-700/50">
          <div className="flex items-center justify-between">
            <button onClick={onClose} className="text-sm text-gray-400">取消</button>
            <h2 className="text-base font-bold text-white">記錄體重</h2>
            <button onClick={handleSave} disabled={!weight}
              className="px-4 py-1.5 bg-emerald-500 disabled:opacity-40 text-white text-sm font-semibold rounded-xl">
              ✅ 儲存
            </button>
          </div>
        </div>
        <div className="overflow-y-auto flex-1 px-5 pb-8 pt-5 space-y-4">
          <div>
            <p className="text-xs text-gray-400 mb-1.5">日期</p>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={field} />
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-1.5">體重（kg）</p>
            <input type="text" inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value)}
              placeholder="例：72.5" autoFocus className={field} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-gray-400 mb-1.5">體脂率（%）</p>
              <input type="text" inputMode="decimal" value={bodyFat} onChange={(e) => setBodyFat(e.target.value)}
                placeholder="例：22.2" className={field} />
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1.5">骨骼肌肉量（kg）</p>
              <input type="text" inputMode="decimal" value={muscleMass} onChange={(e) => setMuscleMass(e.target.value)}
                placeholder="例：53.9" className={field} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-gray-400 mb-1.5">內臟脂肪程度（1–20）</p>
              <input type="text" inputMode="numeric" value={visceralFat} onChange={(e) => setVisceralFat(e.target.value)}
                placeholder="例：9" className={field} />
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1.5">腰圍（cm）</p>
              <input type="text" inputMode="decimal" value={waistCm} onChange={(e) => setWaistCm(e.target.value)}
                placeholder="例：90.1" className={field} />
            </div>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-1.5">備註（選填）</p>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
              placeholder="例：早晨空腹量、ACCUNIQ BC380" rows={2}
              className={`${field} resize-none`} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function ProgressPage() {
  const { weightEntries, addWeightEntry, deleteWeightEntry, profile, workoutEntries } = useAppStore();
  const [showForm, setShowForm] = useState(false);
  const [weightPeriod, setWeightPeriod] = useState<30 | 90 | 180>(90);

  const sorted = [...weightEntries].sort((a, b) => a.date.localeCompare(b.date));
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - weightPeriod);
  const cutoffStr = format(cutoff, 'yyyy-MM-dd');
  const displayed = sorted.filter((e) => e.date >= cutoffStr);

  const latest = sorted[sorted.length - 1];
  const prev = sorted[sorted.length - 2];
  const delta = latest && prev ? latest.weight - prev.weight : null;

  const projection = build12MonthProjection(sorted, profile?.targetWeight);

  function handleSave(entry: Omit<WeightEntry, 'id'>) {
    addWeightEntry({ ...entry, id: crypto.randomUUID() });
    setShowForm(false);
  }

  const chartData = displayed.map((e) => ({
    date: format(new Date(e.date + 'T00:00:00'), 'M/d'),
    weight: e.weight,
  }));

  return (
    <div className="page-container px-4 pt-5 pb-24">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold text-white">進度</h1>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 rounded-xl text-sm font-semibold text-white">
          <Plus size={16} /> 量體重
        </button>
      </div>

      {/* ── 運動統計 ── */}
      <p className="text-xs font-semibold text-gray-400 mb-2">運動統計</p>
      <WorkoutStats workoutEntries={workoutEntries} />

      {/* ── 體重 ── */}
      <p className="text-xs font-semibold text-gray-400 mb-2">體重</p>

      {/* Current stats */}
      {latest && (
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-gray-800 rounded-2xl p-4 text-center">
            <p className="text-2xl font-bold text-white">{latest.weight}</p>
            <p className="text-xs text-gray-400">目前 kg</p>
          </div>
          <div className="bg-gray-800 rounded-2xl p-4 text-center">
            <div className="flex items-center justify-center gap-1">
              {delta !== null && (delta < 0 ? <TrendingDown size={16} className="text-emerald-400" /> :
               delta > 0 ? <TrendingUp size={16} className="text-red-400" /> :
               <Minus size={16} className="text-gray-400" />)}
              <p className={`text-2xl font-bold ${delta === null ? 'text-gray-500' : delta < 0 ? 'text-emerald-400' : delta > 0 ? 'text-red-400' : 'text-gray-400'}`}>
                {delta !== null ? `${delta > 0 ? '+' : ''}${delta.toFixed(1)}` : '—'}
              </p>
            </div>
            <p className="text-xs text-gray-400">與上次差</p>
          </div>
          <div className="bg-gray-800 rounded-2xl p-4 text-center">
            <p className="text-2xl font-bold text-blue-400">
              {profile ? (latest.weight / ((profile.height / 100) ** 2)).toFixed(1) : '—'}
            </p>
            <p className="text-xs text-gray-400">BMI</p>
          </div>
        </div>
      )}

      {/* Period tabs */}
      <div className="flex gap-1 bg-gray-700 rounded-xl p-1 mb-4">
        {([30, 90, 180] as const).map((p) => (
          <button key={p} onClick={() => setWeightPeriod(p)}
            className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${weightPeriod === p ? 'bg-gray-600 text-white' : 'text-gray-400'}`}>
            近{p}天
          </button>
        ))}
      </div>

      {/* Weight chart */}
      {chartData.length > 1 ? (
        <div className="bg-gray-800 rounded-2xl p-4 mb-4">
          <p className="text-xs text-gray-400 mb-3">體重趨勢</p>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="wGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 10 }} />
              <YAxis domain={['auto', 'auto']} tick={{ fill: '#6b7280', fontSize: 10 }} width={35} />
              <Tooltip
                contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: 8 }}
                labelStyle={{ color: '#9ca3af', fontSize: 11 }}
                itemStyle={{ color: '#10b981', fontSize: 12 }}
                formatter={(v) => [`${v} kg`, '體重']}
              />
              {profile?.targetWeight && (
                <ReferenceLine y={profile.targetWeight} stroke="#f59e0b" strokeDasharray="4 4"
                  label={{ value: `目標 ${profile.targetWeight}kg`, fill: '#f59e0b', fontSize: 10 }} />
              )}
              <Area type="monotone" dataKey="weight" stroke="#10b981" strokeWidth={2} fill="url(#wGrad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="bg-gray-800 rounded-2xl p-8 text-center mb-4">
          <p className="text-gray-400 text-sm">累積更多體重記錄後顯示趨勢圖</p>
        </div>
      )}

      {/* Projection */}
      {projection && (
        <div className="bg-gray-800 rounded-2xl p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-gray-400">12個月預測</p>
            <span className={`text-xs px-2 py-0.5 rounded-full ${projection.r2 >= 0.7 ? 'bg-emerald-900/50 text-emerald-400' : projection.r2 >= 0.4 ? 'bg-yellow-900/50 text-yellow-400' : 'bg-gray-700 text-gray-400'}`}>
              準確度 {projection.r2 >= 0.7 ? '高' : projection.r2 >= 0.4 ? '中' : '低'}
            </span>
          </div>
          <p className="text-sm text-white mb-1">
            月均變化：
            <span className={projection.monthlyChange < 0 ? 'text-emerald-400' : 'text-red-400'}>
              {projection.monthlyChange > 0 ? '+' : ''}{projection.monthlyChange.toFixed(2)} kg/月
            </span>
          </p>
          {projection.reachTargetMonth && (
            <p className="text-xs text-amber-400">預計 {projection.reachTargetMonth} 達到目標體重</p>
          )}
        </div>
      )}

      {/* Weight log */}
      <div className="bg-gray-800 rounded-2xl overflow-hidden">
        <p className="text-xs text-gray-400 px-4 pt-4 pb-2">體重記錄</p>
        {sorted.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-6">尚無記錄</p>
        ) : (
          <div className="divide-y divide-gray-700/50">
            {[...sorted].reverse().slice(0, 20).map((e) => (
              <div key={e.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm text-white font-medium">{e.weight} kg</p>
                  <p className="text-xs text-gray-500">
                    {format(new Date(e.date + 'T00:00:00'), 'M月d日 EEE', { locale: zhTW })}
                    {e.bodyFat && ` · 體脂 ${e.bodyFat}%`}
                    {e.muscleMass && ` · 肌肉 ${e.muscleMass}kg`}
                    {e.visceralFat && ` · 內臟${e.visceralFat}`}
                    {e.waistCm && ` · 腰${e.waistCm}cm`}
                  </p>
                </div>
                <button onClick={() => deleteWeightEntry(e.id)} className="text-gray-600 hover:text-red-400">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {showForm && <WeightForm onSave={handleSave} onClose={() => setShowForm(false)} />}
    </div>
  );
}
