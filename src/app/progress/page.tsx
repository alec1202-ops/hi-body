'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { Plus, Trash2, TrendingDown, TrendingUp, Minus } from 'lucide-react';
import { useAppStore, build12MonthProjection } from '@/lib/store';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import type { WeightEntry } from '@/types';

// ─── Weight Form ──────────────────────────────────────────────────────────────
function WeightForm({ onSave, onClose }: { onSave: (e: Omit<WeightEntry, 'id'>) => void; onClose: () => void }) {
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [weight, setWeight] = useState('');
  const [bodyFat, setBodyFat] = useState('');
  const [muscleMass, setMuscleMass] = useState('');
  const [notes, setNotes] = useState('');

  function handleSave() {
    if (!weight) return;
    onSave({
      date,
      weight: parseFloat(weight),
      bodyFat: bodyFat ? parseFloat(bodyFat) : undefined,
      muscleMass: muscleMass ? parseFloat(muscleMass) : undefined,
      notes: notes || undefined,
    });
  }

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
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-400" />
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-1.5">體重（kg）</p>
            <input type="number" step="0.1" value={weight} onChange={(e) => setWeight(e.target.value)}
              placeholder="例：72.5" autoFocus
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-400" />
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-1.5">體脂率（%，選填）</p>
            <input type="number" step="0.1" value={bodyFat} onChange={(e) => setBodyFat(e.target.value)}
              placeholder="例：18.5"
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-400" />
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-1.5">骨骼肌肉量（kg，選填）</p>
            <input type="number" step="0.1" value={muscleMass} onChange={(e) => setMuscleMass(e.target.value)}
              placeholder="例：35.2"
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-400" />
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-1.5">備註（選填）</p>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
              placeholder="例：早晨空腹量" rows={2}
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-400 resize-none" />
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
  const [period, setPeriod] = useState<30 | 90 | 180>(90);

  const sorted = [...weightEntries].sort((a, b) => a.date.localeCompare(b.date));
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - period);
  const cutoffStr = format(cutoff, 'yyyy-MM-dd');
  const displayed = sorted.filter((e) => e.date >= cutoffStr);

  const latest = sorted[sorted.length - 1];
  const prev = sorted[sorted.length - 2];
  const delta = latest && prev ? latest.weight - prev.weight : null;

  // Weekly workout completion for the last 8 weeks
  const now = new Date();
  const weekStats = Array.from({ length: 8 }, (_, i) => {
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay() + 1 - i * 7); // Monday
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    const ws = format(weekStart, 'yyyy-MM-dd');
    const we = format(weekEnd, 'yyyy-MM-dd');
    const count = new Set(
      workoutEntries
        .filter((e) => e.date >= ws && e.date <= we)
        .map((e) => e.actualType ?? e.type)
    ).size;
    return { label: format(weekStart, 'M/d'), count };
  }).reverse();

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

      {/* Current stats */}
      {latest && (
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-gray-800 rounded-2xl p-4 text-center">
            <p className="text-2xl font-bold text-white">{latest.weight}</p>
            <p className="text-xs text-gray-400">目前體重 kg</p>
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
            <p className="text-xs text-gray-400">與上次差 kg</p>
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
          <button key={p} onClick={() => setPeriod(p)}
            className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${period === p ? 'bg-gray-600 text-white' : 'text-gray-400'}`}>
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
              <YAxis
                domain={['auto', 'auto']}
                tick={{ fill: '#6b7280', fontSize: 10 }}
                width={35}
              />
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

      {/* Weekly workout stats */}
      <div className="bg-gray-800 rounded-2xl p-4 mb-4">
        <p className="text-xs text-gray-400 mb-3">每週運動完成數（近8週）</p>
        <div className="flex items-end gap-1 h-16">
          {weekStats.map(({ label, count }, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full flex items-end justify-center" style={{ height: 48 }}>
                <div
                  className={`w-full rounded-sm transition-all ${count >= 5 ? 'bg-emerald-500' : count >= 3 ? 'bg-yellow-500' : count > 0 ? 'bg-gray-500' : 'bg-gray-700'}`}
                  style={{ height: `${Math.max(4, (count / 7) * 48)}px` }}
                />
              </div>
              <span className="text-[9px] text-gray-500">{label}</span>
            </div>
          ))}
        </div>
      </div>

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
